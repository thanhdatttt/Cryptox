import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { PostgresPool } from "./postgres";
import { PostgresSearchRunRepository } from "./postgres";
import type { SearchRunStatus } from "../api/contracts";

const ownerA = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const ownerB = "00000000-0000-4000-8000-000000000002" as AuthenticatedUserId;
const runId = "00000000-0000-4000-8000-000000000011";
const scopeId = "00000000-0000-4000-8000-000000000021";

const run: SearchRunStatus = {
  searchRunId: runId,
  ownerUserId: ownerA,
  generatorType: "RANDOM",
  randomSeed: "real-port-seed",
  searchSpace: {
    availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
    componentCount: { minimum: 2, maximum: 2 },
    requireDistinctComponents: true,
  },
  stopCondition: { maxCandidates: 2 },
  leaderboardScopeId: scopeId,
  candidateTemplate: {
    marketInput: {
      pair: "BTCUSDT",
      timeframe: "1h",
      range: { from: "2026-01-01T00:00:00.000Z", to: "2026-02-01T00:00:00.000Z" },
    },
    configuration: {
      executionProfileId: "BACKTEST_EXECUTION_V1",
      initialCapital: 10_000,
      feeRatePercent: 0.1,
      slippageBps: 0,
    },
  },
  maxInFlight: 1,
  state: "RUNNING",
  activeCandidateIds: ["candidate-1"],
  submittedCandidateCount: 1,
  completedCandidateCount: 0,
  failedCandidateCount: 0,
  averageBacktestDurationMs: 12.5,
  createdAt: "2026-08-29T00:00:00.000Z",
  startedAt: "2026-08-29T00:00:00.000Z",
  updatedAt: "2026-08-29T00:00:01.000Z",
};

function rowFromRun(value: SearchRunStatus): Record<string, unknown> {
  return {
    id: value.searchRunId,
    owner_user_id: value.ownerUserId,
    generator_type: value.generatorType,
    random_seed: value.randomSeed,
    search_space: JSON.stringify({
      ...value.searchSpace,
      __cryptoxSearchRun: {
        version: 1,
        candidateTemplate: value.candidateTemplate,
        activeCandidateIds: value.activeCandidateIds,
        averageBacktestDurationMs: value.averageBacktestDurationMs,
      },
    }),
    stop_condition: JSON.stringify(value.stopCondition),
    leaderboard_scope_id: value.leaderboardScopeId,
    max_in_flight: value.maxInFlight,
    state: value.state,
    submitted_candidate_count: value.submittedCandidateCount,
    completed_candidate_count: value.completedCandidateCount,
    failed_candidate_count: value.failedCandidateCount,
    created_at: value.createdAt,
    started_at: value.startedAt,
    updated_at: value.updatedAt,
    ended_at: null,
    stop_reason: null,
    last_error: null,
  };
}

describe("PostgresSearchRunRepository", () => {
  it("persists the owner-bound run and protects lifecycle updates from owner mismatch", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    let ended = false;
    const pool: PostgresPool = {
      query: async <Row extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
        calls.push({ text, values });
        return { rows: [] as Row[], rowCount: 1 };
      },
      end: async () => {
        ended = true;
      },
    };
    const repository = new PostgresSearchRunRepository(pool);

    await expect(repository.save(ownerB, run)).rejects.toThrow("OWNER_MISMATCH");
    await expect(repository.save(ownerA, run)).resolves.toEqual(run);

    const saveCall = calls[0]!;
    expect(saveCall.text).toContain("INSERT INTO search_runs");
    expect(saveCall.text).toContain("WHERE search_runs.owner_user_id = EXCLUDED.owner_user_id");
    expect(saveCall.values[1]).toBe(ownerA);
    const storedSearchSpace = JSON.parse(String(saveCall.values[4])) as Record<string, unknown>;
    expect(storedSearchSpace.availableStrategyDefinitionIds).toEqual(
      run.searchSpace.availableStrategyDefinitionIds,
    );
    expect(storedSearchSpace.__cryptoxSearchRun).toMatchObject({
      version: 1,
      activeCandidateIds: ["candidate-1"],
      averageBacktestDurationMs: 12.5,
    });

    await repository.close();
    expect(ended).toBe(true);
  });

  it("hydrates the full lifecycle projection and scopes reads by owner", async () => {
    const calls: Array<{ text: string; values: unknown[] }> = [];
    const row = rowFromRun(run);
    const pool: PostgresPool = {
      query: async <Row extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
        calls.push({ text, values });
        if (text.includes("FROM search_runs") && values[0] === ownerA) return { rows: [row as Row] };
        return { rows: [] as Row[], rowCount: 1 };
      },
      end: async () => undefined,
    };
    const repository = new PostgresSearchRunRepository(pool);

    const loaded = await repository.getByOwnerAndId(ownerA, runId);
    expect(loaded).toEqual(run);
    expect(calls[0]?.values).toEqual([ownerA, runId]);
    expect(calls[0]?.text).toContain("WHERE owner_user_id = $1::uuid AND id = $2::uuid");

    const otherOwner = await repository.getByOwnerAndId(ownerB, runId);
    expect(otherOwner).toBeUndefined();
    expect(calls[1]?.values).toEqual([ownerB, runId]);
  });

  it("applies stable owner-filtered cursor pagination before returning SearchRuns", async () => {
    const second: SearchRunStatus = {
      ...run,
      searchRunId: "00000000-0000-4000-8000-000000000012",
      createdAt: "2026-08-29T00:00:02.000Z",
      updatedAt: "2026-08-29T00:00:02.000Z",
    };
    const rows = [rowFromRun(run), rowFromRun(second)];
    const pool: PostgresPool = {
      query: async <Row extends Record<string, unknown>>(text: string) => {
        if (text.includes("ORDER BY created_at ASC, id ASC")) return { rows: rows as Row[] };
        return { rows: [] as Row[], rowCount: 1 };
      },
      end: async () => undefined,
    };
    const repository = new PostgresSearchRunRepository(pool);

    const page = await repository.listByOwner(ownerA, { limit: 1 });
    expect(page.items.map((item) => item.searchRunId)).toEqual([runId]);
    expect(page.nextCursor).toBe(runId);
  });
});
