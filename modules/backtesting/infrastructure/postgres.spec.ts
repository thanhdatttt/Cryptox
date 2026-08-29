import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { Experiment } from "../api/contracts";
import type { InternalPersistedExperiment } from "../application/service";
import { createPostgresBacktestingDependencies } from "./postgres";

const owner = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;

const candidateRow = {
  id: "00000000-0000-4000-8000-000000000010",
  owner_user_id: owner,
  leaderboard_scope_id: "00000000-0000-4000-8000-000000000020",
  search_run_id: null,
  iteration_number: null,
  origin: "MANUAL",
  strategy_selection_kind: "STRATEGY",
  strategy_definition_id: "00000000-0000-4000-8000-000000000030",
  composite_definition_id: null,
  pair: "BTCUSDT",
  timeframe: "5m",
  range_from: "2026-01-01T00:00:00.000Z",
  range_to: "2026-01-01T00:15:00.000Z",
  dataset_id: null,
  dataset_version: null,
  execution_profile_id: "BACKTEST_EXECUTION_V1",
  initial_capital: "10000",
  fee_rate_percent: "0.1",
  slippage_bps: 0,
  status: "ACCEPTED",
  started_at: null,
  completed_at: null,
  duration_ms: null,
  failure_code: null,
  failure_message: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("Postgres backtesting adapter", () => {
  it("keeps candidate writes owner-aware and uses a valid RETURNING projection", async () => {
    const queries: string[] = [];
    const pool = {
      query: async <Row extends Record<string, unknown>>(text: string, values?: unknown[]) => {
        queries.push(text);
        if (text.includes("INSERT INTO candidates")) return { rows: [candidateRow] } as { rows: Row[] };
        if (text.includes("WHERE owner_user_id = $1::uuid") && values?.[0] === owner) return { rows: [candidateRow] } as { rows: Row[] };
        return { rows: [] } as { rows: Row[] };
      },
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    const candidate = await dependencies.candidateRepository.insert(owner, {
      leaderboardScopeId: "00000000-0000-4000-8000-000000000020",
      strategySelection: { kind: "STRATEGY", strategyDefinitionId: "00000000-0000-4000-8000-000000000030" },
      marketInput: { pair: "BTCUSDT", timeframe: "5m", range: { from: candidateRow.range_from, to: candidateRow.range_to } },
      configuration: { executionProfileId: "BACKTEST_EXECUTION_V1", initialCapital: 10000, feeRatePercent: 0.1, slippageBps: 0 },
    });
    expect(candidate.ownerUserId).toBe(owner);
    expect(queries[0]).toMatch(/RETURNING\s+id::text, owner_user_id::text/);
    expect(queries[0]).not.toMatch(/RETURNING[\s\S]*FROM candidates/);
    await expect(dependencies.candidateRepository.getByOwnerAndId("00000000-0000-4000-8000-000000000002" as AuthenticatedUserId, candidate.candidateId)).resolves.toBeUndefined();
    await dependencies.close();
  });

  it("derives the persisted experimentId on candidate status reads without changing RETURNING", async () => {
    const experimentId = "00000000-0000-4000-8000-000000000099";
    const queries: string[] = [];
    const pool = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        queries.push(text);
        if (text.includes("INSERT INTO candidates")) return { rows: [candidateRow] } as { rows: Row[] };
        if (text.includes("UPDATE candidates")) return { rows: [candidateRow] } as { rows: Row[] };
        if (text.includes("SELECT c.id::text")) return { rows: [{ ...candidateRow, experiment_id: experimentId, status: "SUCCEEDED" }] } as { rows: Row[] };
        return { rows: [] } as { rows: Row[] };
      },
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    const candidate = await dependencies.candidateRepository.insert(owner, {
      leaderboardScopeId: candidateRow.leaderboard_scope_id,
      strategySelection: { kind: "STRATEGY", strategyDefinitionId: candidateRow.strategy_definition_id! },
      marketInput: { pair: "BTCUSDT", timeframe: "5m", range: { from: candidateRow.range_from, to: candidateRow.range_to } },
      configuration: { executionProfileId: "BACKTEST_EXECUTION_V1", initialCapital: 10000, feeRatePercent: 0.1, slippageBps: 0 },
    });
    const saved = await dependencies.candidateRepository.save(owner, {
      ...candidate,
      status: "SUCCEEDED",
      completedAt: candidateRow.updated_at,
      updatedAt: candidateRow.updated_at,
    });
    expect(saved.experimentId).toBe(experimentId);
    expect(queries.find((query) => query.includes("INSERT INTO candidates"))).not.toMatch(/experiment_id/);
    expect(queries.some((query) => query.includes("FROM experiments e WHERE e.candidate_id = c.id"))).toBe(true);
    await dependencies.close();
  });

  it("reconstructs persisted replay provenance without inferring exact replay from a snapshot id", async () => {
    const experimentRow = {
      id: "00000000-0000-4000-8000-000000000040",
      candidate_id: candidateRow.id,
      search_run_id: null,
      strategy_selection_kind: "STRATEGY",
      strategy_definition_id: candidateRow.strategy_definition_id,
      composite_definition_id: null,
      market_dataset_snapshot_id: "00000000-0000-4000-8000-000000000041",
      pair: "BTCUSDT",
      timeframe: "5m",
      range_from: candidateRow.range_from,
      range_to: candidateRow.range_to,
      execution_profile_id: "BACKTEST_EXECUTION_V1",
      initial_capital: "10000",
      ending_capital: "10100",
      equity_curve: [],
      ranking_configuration_id: "ranking-v1",
      code_provenance: { applicationVersion: "test" },
      replay_guarantee: "TRACEABLE",
      replay_limitation: "stored as traceable",
      created_at: candidateRow.created_at,
      fee_rate_percent: "0.1",
      slippage_bps: 0,
      dataset_provider: "binance",
      dataset_version: "snapshot-v1",
    };
    const pool = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        if (text.includes("e.candidate_id::text")) return { rows: [experimentRow] } as { rows: Row[] };
        if (text.includes("FROM trades WHERE")) return { rows: [] } as { rows: Row[] };
        if (text.includes("FROM evaluation_results")) return { rows: [{ total_return_percent: 1, win_rate_percent: 100, number_of_trades: 0, max_drawdown_magnitude_percent: 0, evaluation_profile_id: "EVALUATION_V1" }] } as { rows: Row[] };
        if (text.includes("FROM strategy_definitions")) return { rows: [{
          id: candidateRow.strategy_definition_id,
          owner_user_id: owner,
          logical_family_key: "fixture",
          strategy_name: "FIXTURE",
          implementation_version: "1",
          behavior_profile_id: "FIXTURE_V1",
          version: 1,
          parameters: {},
          created_at: candidateRow.created_at,
        }] } as { rows: Row[] };
        return { rows: [] } as { rows: Row[] };
      },
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    const experiment = await dependencies.experimentRepository.getByCandidateOwnerAndId(owner, experimentRow.id);
    expect(experiment?.marketData).toMatchObject({
      provider: "binance",
      datasetId: experimentRow.market_dataset_snapshot_id,
      datasetVersion: "snapshot-v1",
      replayGuarantee: "TRACEABLE",
    });
    expect(experiment?.replay.guarantee).toBe("TRACEABLE");
    await dependencies.close();
  });

  it("returns the same-owner Experiment when candidate completion races the frozen candidate uniqueness", async () => {
    const experimentId = "00000000-0000-4000-8000-000000000040";
    let candidateLookupCount = 0;
    const experimentRow = {
      id: experimentId,
      candidate_id: candidateRow.id,
      search_run_id: null,
      strategy_selection_kind: "STRATEGY",
      strategy_definition_id: candidateRow.strategy_definition_id,
      composite_definition_id: null,
      market_dataset_snapshot_id: null,
      pair: "BTCUSDT",
      timeframe: "5m",
      range_from: candidateRow.range_from,
      range_to: candidateRow.range_to,
      execution_profile_id: "BACKTEST_EXECUTION_V1",
      initial_capital: "10000",
      ending_capital: "10100",
      equity_curve: [],
      ranking_configuration_id: "ranking-v1",
      code_provenance: { applicationVersion: "test" },
      replay_guarantee: "TRACEABLE",
      replay_limitation: "stored as traceable",
      created_at: candidateRow.created_at,
      fee_rate_percent: "0.1",
      slippage_bps: 0,
      dataset_provider: null,
      dataset_version: null,
    };
    const pool = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        if (text.includes("SELECT e.id::text FROM experiments")) {
          candidateLookupCount += 1;
          return { rows: candidateLookupCount === 1 ? [] : [{ id: experimentId }] } as { rows: Row[] };
        }
        if (text.includes("ON CONFLICT (candidate_id) DO NOTHING")) return { rows: [] } as { rows: Row[] };
        if (text.includes("e.candidate_id::text")) return { rows: [experimentRow] } as { rows: Row[] };
        if (text.includes("FROM trades WHERE")) return { rows: [] } as { rows: Row[] };
        if (text.includes("FROM evaluation_results")) return { rows: [{ total_return_percent: 1, win_rate_percent: 100, number_of_trades: 0, max_drawdown_magnitude_percent: 0, evaluation_profile_id: "EVALUATION_V1" }] } as { rows: Row[] };
        if (text.includes("FROM strategy_definitions")) return { rows: [{
          id: candidateRow.strategy_definition_id,
          owner_user_id: owner,
          logical_family_key: "fixture",
          strategy_name: "FIXTURE",
          implementation_version: "1",
          behavior_profile_id: "FIXTURE_V1",
          version: 1,
          parameters: {},
          created_at: candidateRow.created_at,
        }] } as { rows: Row[] };
        return { rows: [] } as { rows: Row[] };
      },
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    const experiment = {
      id: "00000000-0000-4000-8000-000000000042",
      candidateId: candidateRow.id,
      strategy: {
        kind: "STRATEGY",
        definition: {
          id: candidateRow.strategy_definition_id!, ownerUserId: owner, logicalFamilyKey: "fixture", strategyName: "FIXTURE",
          implementationVersion: "1", behaviorProfileId: "FIXTURE_V1", version: 1, parameters: {}, createdAt: candidateRow.created_at,
        },
      },
      marketData: { provider: "fixture", pair: "BTCUSDT", timeframe: "5m", range: { from: candidateRow.range_from, to: candidateRow.range_to }, replayGuarantee: "TRACEABLE", replayLimitation: "fixture" },
      configuration: { executionProfileId: "BACKTEST_EXECUTION_V1", initialCapital: 10000, feeRatePercent: 0.1, slippageBps: 0 },
      metrics: { candidateId: candidateRow.id, totalReturnPercent: 1, winRatePercent: 100, numberOfTrades: 0, maxDrawdownMagnitudePercent: 0, evaluationProfileId: "EVALUATION_V1" },
      rankingConfigurationId: "ranking-v1",
      code: { applicationVersion: "test" },
      replay: { guarantee: "TRACEABLE", unavailableInputs: ["HISTORICAL_DATA"], limitation: "fixture" },
      visualization: { signals: [], overlays: [], tradeMarkers: [] },
      createdAt: candidateRow.created_at,
      endingCapital: 10100,
      equityCurve: [{ timestamp: candidateRow.created_at, value: 10000 }, { timestamp: candidateRow.range_to, value: 10100 }],
    } as Experiment;
    const result = await dependencies.experimentRepository.insertForCandidateOwner(owner, experiment, []);
    expect(result.id).toBe(experimentId);
    expect(result.candidateId).toBe(candidateRow.id);
    await dependencies.close();
  });

  it("rolls back the completion transaction when leaderboard admission fails", async () => {
    const transactionQueries: string[] = [];
    const client = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        transactionQueries.push(text);
        return { rows: [] } as { rows: Row[] };
      },
      release: () => undefined,
    };
    const pool = {
      query: async <Row extends Record<string, unknown>>() => ({ rows: [] } as { rows: Row[] }),
      connect: async () => client,
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    await expect(dependencies.completionUnitOfWork.commit(
      {
        ownerUserId: owner,
        experiment: {} as Experiment,
        trades: [],
        leaderboardSubmission: {} as never,
      },
      {
        insertExperiment: async () => ({}) as Experiment,
        submitLeaderboard: async () => { throw new Error("leaderboard unavailable"); },
      },
    )).rejects.toThrow("leaderboard unavailable");
    expect(transactionQueries).toEqual(["BEGIN", "ROLLBACK"]);
    await dependencies.close();
  });

  it("persists the simulator equity curve and ending capital without widening the read contract", async () => {
    const experimentId = "00000000-0000-4000-8000-000000000050";
    const equityCurve = [
      { timestamp: candidateRow.created_at, value: 10000 },
      { timestamp: candidateRow.range_to, value: 10125.5 },
    ] as const;
    const queries: Array<{ text: string; values?: unknown[] }> = [];
    const pool = {
      query: async <Row extends Record<string, unknown>>(text: string, values?: unknown[]) => {
        queries.push({ text, values });
        if (text.includes("SELECT e.id::text FROM experiments")) return { rows: [] } as { rows: Row[] };
        if (text.includes("INSERT INTO experiments")) return { rows: [{ id: experimentId }] } as { rows: Row[] };
        return { rows: [] } as { rows: Row[] };
      },
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    const experiment = {
      id: experimentId,
      candidateId: candidateRow.id,
      strategy: {
        kind: "STRATEGY",
        definition: {
          id: candidateRow.strategy_definition_id!, ownerUserId: owner, logicalFamilyKey: "fixture", strategyName: "FIXTURE",
          implementationVersion: "1", behaviorProfileId: "FIXTURE_V1", version: 1, parameters: {}, createdAt: candidateRow.created_at,
        },
      },
      marketData: { provider: "fixture", pair: "BTCUSDT", timeframe: "5m", range: { from: candidateRow.range_from, to: candidateRow.range_to }, replayGuarantee: "TRACEABLE", replayLimitation: "fixture" },
      configuration: { executionProfileId: "BACKTEST_EXECUTION_V1", initialCapital: 10000, feeRatePercent: 0.1, slippageBps: 0 },
      metrics: { candidateId: candidateRow.id, totalReturnPercent: 1.255, winRatePercent: 100, numberOfTrades: 1, maxDrawdownMagnitudePercent: 0, evaluationProfileId: "EVALUATION_V1" },
      rankingConfigurationId: "ranking-v1",
      code: { applicationVersion: "test" },
      replay: { guarantee: "TRACEABLE", unavailableInputs: ["HISTORICAL_DATA"], limitation: "fixture" },
      visualization: { signals: [], overlays: [], tradeMarkers: [] },
      createdAt: candidateRow.created_at,
      endingCapital: 10125.5,
      equityCurve,
    } satisfies InternalPersistedExperiment;
    await dependencies.experimentRepository.insertForCandidateOwner(owner, experiment, []);
    const insert = queries.find(({ text }) => text.includes("INSERT INTO experiments"));
    expect(insert?.values?.[13]).toBe(10125.5);
    expect(insert?.values?.[14]).toBe(JSON.stringify(equityCurve));
    await dependencies.close();
  });

  it("paginates trades by sequence with id tie-break and an order-compatible cursor", async () => {
    const firstId = "00000000-0000-4000-8000-000000000061";
    const secondId = "00000000-0000-4000-8000-000000000062";
    const tradeRow = (id: string, sequence: number) => ({
      id,
      experiment_id: "00000000-0000-4000-8000-000000000040",
      sequence,
      pair: "BTCUSDT",
      entry_signal_at: candidateRow.created_at,
      entry_time: candidateRow.created_at,
      entry_price: "100",
      exit_signal_at: null,
      exit_time: candidateRow.range_to,
      exit_price: "101",
      exit_reason: "RANGE_END",
      quantity: "1",
      notional_entry_value: "100",
      gross_profit: "1",
      fee_amount: "0",
      slippage_bps: 0,
      profit: "1",
      result_percent: "1",
      result: "WIN",
    });
    const queries: string[] = [];
    const pool = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        queries.push(text);
        if (text.includes("ORDER BY t.sequence ASC")) {
          return { rows: [tradeRow(firstId, 1), tradeRow(secondId, 1)] } as { rows: Row[] };
        }
        return { rows: [] } as { rows: Row[] };
      },
      end: async () => undefined,
    };
    const dependencies = createPostgresBacktestingDependencies({ connectionString: "", pool });
    const first = await dependencies.experimentRepository.listTradesByCandidateOwner(owner, "00000000-0000-4000-8000-000000000040", { limit: 1 });
    expect(first.items.map((trade) => trade.id)).toEqual([firstId]);
    expect(first.nextCursor).toBe(firstId);
    await dependencies.experimentRepository.listTradesByCandidateOwner(owner, "00000000-0000-4000-8000-000000000040", { limit: 1, cursor: first.nextCursor });
    const paginatedQuery = queries.at(-1)!;
    expect(paginatedQuery).toContain("(t.sequence, t.id) >");
    expect(paginatedQuery).toContain("anchor.sequence, anchor.id");
    expect(paginatedQuery).toContain("ORDER BY t.sequence ASC, t.id ASC");
    await dependencies.close();
  });
});
