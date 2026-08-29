import { randomUUID } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { CompositeStrategyDefinition, StrategyDefinition } from "@cryptox/strategy";
import type {
  BacktestConfiguration,
  CandidateProgress,
  Experiment,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  Trade,
} from "../api/contracts";
import type {
  BacktestingApplicationDependencies,
  BacktestingCompletionUnitOfWork,
  BacktestingUnitOfWork,
} from "../application/ports";
import type {
  BacktestingCandidate,
  InternalPersistedExperiment,
} from "../application/service";

export interface PostgresQueryResult<Row extends Record<string, unknown> = Record<string, unknown>> {
  readonly rows: Row[];
  readonly rowCount?: number | null;
}

export interface PostgresClient {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PostgresQueryResult<Row>>;
  release(): void;
}

export interface PostgresPool {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]): Promise<PostgresQueryResult<Row>>;
  connect?(): Promise<PostgresClient>;
  end(): Promise<void>;
}

export interface PostgresBacktestingOptions {
  readonly connectionString: string;
  readonly pool?: PostgresPool;
  readonly maxConnections?: number;
}

export interface PostgresBacktestingDependencies extends Pick<
  BacktestingApplicationDependencies<BacktestingCandidate, StartManualBacktestCommand | SubmitSearchCandidateCommand, Experiment, Trade>,
  "candidateRepository" | "experimentRepository" | "unitOfWork" | "completionUnitOfWork" | "clock"
> {
  readonly pool: PostgresPool;
  close(): Promise<void>;
}

interface CandidateRow extends Record<string, unknown> {
  id: string;
  owner_user_id: string;
  leaderboard_scope_id: string;
  search_run_id: string | null;
  iteration_number: number | string | null;
  origin: "MANUAL" | "SEARCH";
  strategy_selection_kind: "STRATEGY" | "COMPOSITE";
  strategy_definition_id: string | null;
  composite_definition_id: string | null;
  pair: string;
  timeframe: string;
  range_from: string;
  range_to: string;
  dataset_id: string | null;
  dataset_version: string | null;
  execution_profile_id: BacktestConfiguration["executionProfileId"];
  initial_capital: string | number;
  fee_rate_percent: string | number;
  slippage_bps: string | number;
  paper_execution_provenance: unknown | null;
  status: CandidateProgress["status"];
  started_at: string | null;
  completed_at: string | null;
  duration_ms: string | number | null;
  failure_code: CandidateProgress["failure"] extends infer T ? T extends { code: infer C } ? C : string : string | null;
  failure_message: string | null;
  created_at: string;
  updated_at: string;
  experiment_id?: string | null;
}

interface ExperimentRow extends Record<string, unknown> {
  id: string;
  candidate_id: string;
  search_run_id: string | null;
  strategy_selection_kind: "STRATEGY" | "COMPOSITE";
  strategy_definition_id: string | null;
  composite_definition_id: string | null;
  market_dataset_snapshot_id: string | null;
  pair: string;
  timeframe: string;
  range_from: string;
  range_to: string;
  execution_profile_id: BacktestConfiguration["executionProfileId"];
  initial_capital: string | number;
  ending_capital: string | number;
  equity_curve: ReadonlyArray<{ timestamp: string; value: number }>;
  ranking_configuration_id: string;
  code_provenance: Experiment["code"];
  replay_guarantee: "EXACT_REPLAY_AVAILABLE" | "TRACEABLE";
  replay_limitation: string | null;
  dataset_provider: string | null;
  dataset_version: string | null;
  paper_execution_provenance: unknown | null;
  created_at: string;
  fee_rate_percent: string | number;
  slippage_bps: string | number;
}

interface TradeRow extends Record<string, unknown> {
  id: string;
  experiment_id: string;
  sequence: number | string;
  pair: string;
  entry_signal_at: string;
  entry_time: string;
  entry_price: string | number;
  exit_signal_at: string | null;
  exit_time: string;
  exit_price: string | number;
  exit_reason: Trade["exitReason"];
  position_mode?: "LONG" | "SYNTHETIC_SHORT" | null;
  quantity: string | number;
  notional_entry_value: string | number;
  gross_profit: string | number;
  fee_amount: string | number;
  slippage_bps: string | number;
  profit: string | number;
  result_percent: string | number;
  result: Trade["result"];
}

function numberColumn(value: unknown, field: string): number {
  const result = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(result)) throw new Error(`invalid backtesting ${field} in persistence`);
  return result;
}

function integerColumn(value: unknown, field: string): number {
  const result = numberColumn(value, field);
  if (!Number.isInteger(result)) throw new Error(`invalid backtesting ${field} in persistence`);
  return result;
}

function timestampColumn(value: unknown, field: string): string {
  const parsed = Date.parse(String(value));
  if (!Number.isFinite(parsed)) throw new Error(`invalid backtesting ${field} in persistence`);
  return new Date(parsed).toISOString();
}

function paperExecutionFromPersistence(value: unknown): BacktestConfiguration["paperExecution"] {
  if (value === undefined || value === null) return undefined;
  let candidate: unknown = value;
  if (typeof candidate === "string") {
    try {
      candidate = JSON.parse(candidate) as unknown;
    } catch {
      throw new Error("invalid backtesting paper execution provenance in persistence");
    }
  }
  if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
    throw new Error("invalid backtesting paper execution provenance in persistence");
  }
  const provenance = candidate as Record<string, unknown>;
  if (
    provenance.executionProfileId !== "SYNTHETIC_SHORT_PAPER_V1" ||
    (provenance.positionMode !== "LONG" && provenance.positionMode !== "SYNTHETIC_SHORT") ||
    provenance.exitPolicyId !== "STOP_LOSS_WINS_V1" ||
    provenance.feeRatePercent !== 0.08 ||
    provenance.adverseSlippageBps !== 5 ||
    provenance.decimalScale !== 8 ||
    provenance.roundingMode !== "HALF_UP"
  ) {
    throw new Error("invalid backtesting paper execution provenance in persistence");
  }
  const stopLoss = provenance.stopLoss;
  const takeProfit = provenance.takeProfit;
  if ((stopLoss !== undefined && typeof stopLoss !== "string") || (takeProfit !== undefined && typeof takeProfit !== "string")) {
    throw new Error("invalid backtesting paper execution provenance in persistence");
  }
  return {
    executionProfileId: "SYNTHETIC_SHORT_PAPER_V1",
    positionMode: provenance.positionMode as "LONG" | "SYNTHETIC_SHORT",
    exitPolicyId: "STOP_LOSS_WINS_V1",
    feeRatePercent: 0.08,
    adverseSlippageBps: 5,
    decimalScale: 8,
    roundingMode: "HALF_UP",
    ...(stopLoss === undefined ? {} : { stopLoss }),
    ...(takeProfit === undefined ? {} : { takeProfit }),
  };
}

function poolFromOptions(options: PostgresBacktestingOptions): PostgresPool {
  if (options.pool) return options.pool;
  const { Pool } = require("pg") as {
    Pool: new (config: { connectionString: string; max: number; application_name: string }) => PostgresPool;
  };
  return new Pool({
    connectionString: options.connectionString,
    max: options.maxConnections ?? 5,
    application_name: "cryptox-backtesting",
  });
}

function candidateFromRow(row: CandidateRow): BacktestingCandidate {
  const strategySelection = row.strategy_selection_kind === "STRATEGY"
    ? { kind: "STRATEGY" as const, strategyDefinitionId: row.strategy_definition_id! }
    : { kind: "COMPOSITE" as const, compositeDefinitionId: row.composite_definition_id! };
  const marketInput = {
    pair: row.pair,
    timeframe: row.timeframe,
    range: { from: timestampColumn(row.range_from, "range_from"), to: timestampColumn(row.range_to, "range_to") },
    ...(row.dataset_id === null ? {} : { datasetId: row.dataset_id, ...(row.dataset_version ? { datasetVersion: row.dataset_version } : {}) }),
  } as BacktestingCandidate["marketInput"];
  const paperExecution = paperExecutionFromPersistence(row.paper_execution_provenance);
  return {
    candidateId: row.id,
    ownerUserId: row.owner_user_id as AuthenticatedUserId,
    origin: row.origin === "MANUAL"
      ? { kind: "MANUAL", leaderboardScopeId: row.leaderboard_scope_id }
      : { kind: "SEARCH", searchRunId: row.search_run_id!, leaderboardScopeId: row.leaderboard_scope_id, iterationNumber: integerColumn(row.iteration_number, "iteration_number") },
    strategySelection,
    marketInput,
    configuration: {
      executionProfileId: row.execution_profile_id,
      initialCapital: numberColumn(row.initial_capital, "initial_capital"),
      feeRatePercent: numberColumn(row.fee_rate_percent, "fee_rate_percent"),
      slippageBps: numberColumn(row.slippage_bps, "slippage_bps"),
      ...(paperExecution === undefined ? {} : { paperExecution }),
    },
    status: row.status,
    ...(row.started_at === null ? {} : { startedAt: timestampColumn(row.started_at, "started_at") }),
    ...(row.completed_at === null ? {} : { completedAt: timestampColumn(row.completed_at, "completed_at") }),
    ...(row.duration_ms === null ? {} : { durationMs: integerColumn(row.duration_ms, "duration_ms") }),
    ...(row.failure_code && row.failure_message ? { failure: { code: row.failure_code as NonNullable<CandidateProgress["failure"]>["code"], message: row.failure_message } } : {}),
    ...(row.experiment_id === undefined || row.experiment_id === null ? {} : { experimentId: row.experiment_id }),
    createdAt: timestampColumn(row.created_at, "created_at"),
    updatedAt: timestampColumn(row.updated_at, "updated_at"),
  };
}

function tradeFromRow(row: TradeRow): Trade {
  return {
    id: row.id,
    experimentId: row.experiment_id,
    sequence: integerColumn(row.sequence, "sequence"),
    pair: row.pair,
    entrySignalAt: timestampColumn(row.entry_signal_at, "entry_signal_at"),
    entryTime: timestampColumn(row.entry_time, "entry_time"),
    entryPrice: numberColumn(row.entry_price, "entry_price"),
    ...(row.exit_signal_at === null ? {} : { exitSignalAt: timestampColumn(row.exit_signal_at, "exit_signal_at") }),
    exitTime: timestampColumn(row.exit_time, "exit_time"),
    exitPrice: numberColumn(row.exit_price, "exit_price"),
    ...(row.position_mode === null || row.position_mode === undefined ? {} : { positionMode: row.position_mode }),
    exitReason: row.exit_reason,
    quantity: numberColumn(row.quantity, "quantity"),
    notionalEntryValue: numberColumn(row.notional_entry_value, "notional_entry_value"),
    grossProfit: numberColumn(row.gross_profit, "gross_profit"),
    feeAmount: numberColumn(row.fee_amount, "fee_amount"),
    slippageBps: integerColumn(row.slippage_bps, "slippage_bps"),
    profit: numberColumn(row.profit, "profit"),
    resultPercent: numberColumn(row.result_percent, "result_percent"),
    result: row.result,
  };
}

function isUnique(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505";
}

function persistedExperimentFields(experiment: Experiment): Pick<InternalPersistedExperiment, "endingCapital" | "equityCurve"> {
  const persisted = experiment as Partial<InternalPersistedExperiment>;
  if (typeof persisted.endingCapital !== "number" || !Number.isFinite(persisted.endingCapital)) {
    throw new Error("backtesting experiment is missing the simulator ending capital");
  }
  if (!Array.isArray(persisted.equityCurve)) {
    throw new Error("backtesting experiment is missing the simulator equity curve");
  }
  for (const point of persisted.equityCurve) {
    if (
      typeof point !== "object" ||
      point === null ||
      typeof point.timestamp !== "string" ||
      !point.timestamp.trim() ||
      typeof point.value !== "number" ||
      !Number.isFinite(point.value)
    ) {
      throw new Error("backtesting experiment contains an invalid simulator equity curve");
    }
  }
  return { endingCapital: persisted.endingCapital, equityCurve: persisted.equityCurve };
}

export function createPostgresBacktestingDependencies(
  options: PostgresBacktestingOptions,
): PostgresBacktestingDependencies {
  if (!options.pool && !options.connectionString.trim()) throw new Error("Backtesting PostgreSQL connection string is required");
  const pool = poolFromOptions(options);
  const transactionStorage = new AsyncLocalStorage<PostgresClient>();
  const query = <Row extends Record<string, unknown> = Record<string, unknown>>(text: string, values?: unknown[]) => {
    const client = transactionStorage.getStore();
    return client ? client.query<Row>(text, values) : pool.query<Row>(text, values);
  };
  const clock = { now: () => new Date().toISOString() };

  const candidateColumns = `
      id::text, owner_user_id::text, leaderboard_scope_id::text,
      search_run_id::text, iteration_number, origin, strategy_selection_kind,
      strategy_definition_id::text, composite_definition_id::text, pair, timeframe,
      range_from::text, range_to::text, dataset_id::text, dataset_version,
      execution_profile_id, initial_capital, fee_rate_percent, slippage_bps,
      paper_execution_provenance,
      status, started_at::text, completed_at::text, duration_ms,
      failure_code, failure_message, created_at::text, updated_at::text`;
  const candidateSelect = `
    SELECT c.id::text, c.owner_user_id::text, c.leaderboard_scope_id::text,
      c.search_run_id::text, c.iteration_number, c.origin, c.strategy_selection_kind,
      c.strategy_definition_id::text, c.composite_definition_id::text, c.pair, c.timeframe,
      c.range_from::text, c.range_to::text, c.dataset_id::text, c.dataset_version,
      c.execution_profile_id, c.initial_capital, c.fee_rate_percent, c.slippage_bps,
      c.paper_execution_provenance,
      c.status, c.started_at::text, c.completed_at::text, c.duration_ms,
      c.failure_code, c.failure_message, c.created_at::text, c.updated_at::text,
      (SELECT e.id::text FROM experiments e WHERE e.candidate_id = c.id) AS experiment_id
    FROM candidates c`;
  const candidateRepository = {
    insert: async (ownerUserId: AuthenticatedUserId, command: StartManualBacktestCommand | SubmitSearchCandidateCommand) => {
      const isSearch = "searchRunId" in command;
      const candidateId = randomUUID();
      const now = clock.now();
      const selection = command.strategySelection;
      const result = await query<CandidateRow>(
        `
          INSERT INTO candidates
            (id, owner_user_id, leaderboard_scope_id, search_run_id, iteration_number,
             origin, strategy_selection_kind, strategy_definition_id, composite_definition_id,
             pair, timeframe, range_from, range_to, dataset_id, dataset_version,
             execution_profile_id, initial_capital, fee_rate_percent, slippage_bps,
             paper_execution_provenance,
             status, created_at, updated_at)
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6, $7, $8::uuid, $9::uuid,
                  $10, $11, $12::timestamptz, $13::timestamptz, $14::uuid, $15,
                  $16, $17, $18, $19, $20::jsonb, 'ACCEPTED', $21::timestamptz, $21::timestamptz)
          RETURNING ${candidateColumns}
        `,
        [candidateId, ownerUserId, command.leaderboardScopeId, isSearch ? command.searchRunId : null, isSearch ? command.iterationNumber : null,
          isSearch ? "SEARCH" : "MANUAL", selection.kind,
          selection.kind === "STRATEGY" ? selection.strategyDefinitionId : null,
          selection.kind === "COMPOSITE" ? selection.compositeDefinitionId : null,
          command.marketInput.pair, command.marketInput.timeframe, command.marketInput.range.from, command.marketInput.range.to,
          command.marketInput.datasetId ?? null, command.marketInput.datasetVersion ?? null,
          command.configuration.executionProfileId, command.configuration.initialCapital, command.configuration.feeRatePercent,
          command.configuration.slippageBps,
          command.configuration.paperExecution === undefined ? null : JSON.stringify(command.configuration.paperExecution),
          now],
      );
      const row = result.rows[0];
      if (!row) throw new Error("candidate insert returned no row");
      return candidateFromRow(row);
    },
    getByOwnerAndId: async (ownerUserId: AuthenticatedUserId, candidateId: string) => {
      const result = await query<CandidateRow>(`${candidateSelect} WHERE owner_user_id = $1::uuid AND id = $2::uuid`, [ownerUserId, candidateId]);
      return result.rows[0] ? candidateFromRow(result.rows[0]) : undefined;
    },
    save: async (ownerUserId: AuthenticatedUserId, candidate: BacktestingCandidate) => {
      const result = await query<CandidateRow>(
        `
          UPDATE candidates SET status = $3, started_at = $4::timestamptz,
            completed_at = $5::timestamptz, duration_ms = $6,
            failure_code = $7, failure_message = $8, updated_at = $9::timestamptz
          WHERE owner_user_id = $1::uuid AND id = $2::uuid
          RETURNING ${candidateColumns}
        `,
        [ownerUserId, candidate.candidateId, candidate.status, candidate.startedAt ?? null, candidate.completedAt ?? null,
          candidate.durationMs ?? null, candidate.failure?.code ?? null, candidate.failure?.message ?? null, candidate.updatedAt],
      );
      const row = result.rows[0];
      if (!row) throw new Error("NOT_FOUND");
      const refreshed = await candidateRepository.getByOwnerAndId(ownerUserId, candidate.candidateId);
      return refreshed ?? candidateFromRow(row);
    },
    listByOwnerAndSearchRun: async (ownerUserId: AuthenticatedUserId, searchRunId: string) => {
      const result = await query<CandidateRow>(`${candidateSelect} WHERE owner_user_id = $1::uuid AND search_run_id = $2::uuid ORDER BY created_at ASC, id ASC`, [ownerUserId, searchRunId]);
      return result.rows.map(candidateFromRow);
    },
  };

  const experimentColumns = `
    e.id::text, e.candidate_id::text, e.search_run_id::text,
    e.strategy_selection_kind, e.strategy_definition_id::text,
    e.composite_definition_id::text, e.market_dataset_snapshot_id::text,
    e.pair, e.timeframe, e.range_from::text, e.range_to::text,
    e.execution_profile_id, e.initial_capital, e.ending_capital,
    e.equity_curve, e.ranking_configuration_id, e.code_provenance,
    e.replay_guarantee, e.replay_limitation, e.paper_execution_provenance,
    e.created_at::text,
    c.fee_rate_percent, c.slippage_bps,
    d.provider_id AS dataset_provider, d.dataset_version AS dataset_version`;

  const experimentRepository = {
    insertForCandidateOwner: async (ownerUserId: AuthenticatedUserId, experiment: Experiment, trades: readonly Trade[]) => {
      const selection = experiment.strategy;
      const existingResult = await query<{ id: string }>(
        `SELECT e.id::text FROM experiments e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.owner_user_id = $1::uuid AND e.candidate_id = $2::uuid`,
        [ownerUserId, experiment.candidateId],
      );
      if (existingResult.rows[0]) {
        const existing = await experimentRepository.getByCandidateOwnerAndId(ownerUserId, existingResult.rows[0].id);
        if (existing) return existing;
        throw new Error("existing experiment is unavailable");
      }
      const { endingCapital, equityCurve } = persistedExperimentFields(experiment);
      const result = await query<ExperimentRow>(
        `
          INSERT INTO experiments
            (id, candidate_id, search_run_id, strategy_selection_kind,
             strategy_definition_id, composite_definition_id, market_dataset_snapshot_id,
             pair, timeframe, range_from, range_to, execution_profile_id,
             initial_capital, ending_capital, equity_curve, ranking_configuration_id,
             code_provenance, replay_guarantee, replay_limitation, created_at,
             paper_execution_provenance)
          SELECT $1::uuid, c.id, $3::uuid, $4, $5::uuid, $6::uuid, $7::uuid,
            $8, $9, $10::timestamptz, $11::timestamptz, $12, $13, $14, $15::jsonb,
            $16, $17::jsonb, $18, $19, $20::timestamptz, $21::jsonb
          FROM candidates c WHERE c.id = $2::uuid AND c.owner_user_id = $22::uuid
          ON CONFLICT (candidate_id) DO NOTHING
          RETURNING id
        `,
        [experiment.id, experiment.candidateId, experiment.searchRunId ?? null, selection.kind,
          selection.kind === "STRATEGY" ? selection.definition.id : null,
          selection.kind === "COMPOSITE" ? selection.definition.id : null,
           experiment.marketData.datasetId ?? null, experiment.marketData.pair, experiment.marketData.timeframe,
           experiment.marketData.range.from, experiment.marketData.range.to, experiment.configuration.executionProfileId,
          experiment.configuration.initialCapital, endingCapital,
          JSON.stringify(equityCurve), experiment.rankingConfigurationId, JSON.stringify(experiment.code),
          experiment.replay.guarantee, experiment.replay.guarantee === "TRACEABLE" ? experiment.replay.limitation : null,
          experiment.createdAt,
          experiment.paperExecutionProvenance === undefined ? null : JSON.stringify(experiment.paperExecutionProvenance),
          ownerUserId],
      );
      if (!result.rows[0]) {
        const concurrent = await query<{ id: string }>(
          `SELECT e.id::text FROM experiments e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.owner_user_id = $1::uuid AND e.candidate_id = $2::uuid`,
          [ownerUserId, experiment.candidateId],
        );
        if (concurrent.rows[0]) {
          const existing = await experimentRepository.getByCandidateOwnerAndId(ownerUserId, concurrent.rows[0].id);
          if (existing) return existing;
        }
        throw new Error("NOT_FOUND");
      }
      try {
        await query(`INSERT INTO evaluation_results (id, experiment_id, total_return_percent, win_rate_percent, number_of_trades, max_drawdown_magnitude_percent, evaluation_profile_id) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)`, [randomUUID(), experiment.id, experiment.metrics.totalReturnPercent, experiment.metrics.winRatePercent, experiment.metrics.numberOfTrades, experiment.metrics.maxDrawdownMagnitudePercent, experiment.metrics.evaluationProfileId]);
        for (const trade of trades) {
          await query(`INSERT INTO trades (id, experiment_id, sequence, pair, entry_signal_at, entry_time, entry_price, exit_signal_at, exit_time, exit_price, exit_reason, position_mode, quantity, notional_entry_value, gross_profit, fee_amount, slippage_bps, profit, result_percent, result) VALUES ($1::uuid, $2::uuid, $3, $4, $5::timestamptz, $6::timestamptz, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)`, [trade.id, experiment.id, trade.sequence, trade.pair, trade.entrySignalAt, trade.entryTime, trade.entryPrice, trade.exitSignalAt ?? null, trade.exitTime, trade.exitPrice, trade.exitReason, trade.positionMode ?? null, trade.quantity, trade.notionalEntryValue, trade.grossProfit, trade.feeAmount, trade.slippageBps, trade.profit, trade.resultPercent, trade.result]);
        }
      } catch (error) {
        if (!isUnique(error)) throw error;
        const existing = await experimentRepository.getByCandidateOwnerAndId(ownerUserId, experiment.id);
        if (existing) return existing;
        throw error;
      }
      return experiment;
    },
    getByCandidateOwnerAndId: async (ownerUserId: AuthenticatedUserId, experimentId: string) => {
      const result = await query<ExperimentRow>(`SELECT ${experimentColumns} FROM experiments e INNER JOIN candidates c ON c.id = e.candidate_id LEFT JOIN market_dataset_snapshots d ON d.id = e.market_dataset_snapshot_id WHERE c.owner_user_id = $1::uuid AND e.id = $2::uuid`, [ownerUserId, experimentId]);
      const row = result.rows[0];
      if (!row) return undefined;
      return experimentFromRow(row, await tradesForExperiment(row.id), await strategyProvenance(row, ownerUserId), await metricsForExperiment(row.id));
    },
    listByCandidateOwnerAndSearchRun: async (ownerUserId: AuthenticatedUserId, searchRunId: string) => {
      const result = await query<ExperimentRow>(`SELECT ${experimentColumns} FROM experiments e INNER JOIN candidates c ON c.id = e.candidate_id LEFT JOIN market_dataset_snapshots d ON d.id = e.market_dataset_snapshot_id WHERE c.owner_user_id = $1::uuid AND e.search_run_id = $2::uuid ORDER BY e.created_at ASC, e.id ASC`, [ownerUserId, searchRunId]);
      return Promise.all(result.rows.map(async (row) => experimentFromRow(row, await tradesForExperiment(row.id), await strategyProvenance(row, ownerUserId), await metricsForExperiment(row.id))));
    },
    listTradesByCandidateOwner: async (ownerUserId: AuthenticatedUserId, experimentId: string, page: { limit: number; cursor?: string }) => {
      const values: unknown[] = [ownerUserId, experimentId];
      // The public cursor remains an opaque Trade id, while its anchor is
      // resolved to the ordered (sequence, id) tuple inside this experiment.
      const cursor = page.cursor
        ? "AND (t.sequence, t.id) > (SELECT anchor.sequence, anchor.id FROM trades anchor WHERE anchor.experiment_id = $2::uuid AND anchor.id = $3::uuid)"
        : "";
      if (page.cursor) values.push(page.cursor);
      values.push(page.limit + 1);
      const result = await query<TradeRow>(`SELECT t.id::text, t.experiment_id::text, t.sequence, t.pair, t.entry_signal_at::text, t.entry_time::text, t.entry_price, t.exit_signal_at::text, t.exit_time::text, t.exit_price, t.exit_reason, t.position_mode, t.quantity, t.notional_entry_value, t.gross_profit, t.fee_amount, t.slippage_bps, t.profit, t.result_percent, t.result FROM trades t INNER JOIN experiments e ON e.id = t.experiment_id INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.owner_user_id = $1::uuid AND t.experiment_id = $2::uuid ${cursor} ORDER BY t.sequence ASC, t.id ASC LIMIT $${values.length}`, values);
      const rows = result.rows.slice(0, page.limit);
      if (!result.rows[0]) {
        const exists = await query(`SELECT 1 FROM experiments e INNER JOIN candidates c ON c.id = e.candidate_id WHERE c.owner_user_id = $1::uuid AND e.id = $2::uuid`, [ownerUserId, experimentId]);
        if (!exists.rows[0]) throw new Error("NOT_FOUND");
      }
      return { items: rows.map(tradeFromRow), ...(result.rows.length > page.limit && rows.at(-1) ? { nextCursor: rows.at(-1)!.id } : {}) };
    },
  };

  async function tradesForExperiment(experimentId: string): Promise<readonly Trade[]> {
    const result = await query<TradeRow>(`SELECT id::text, experiment_id::text, sequence, pair, entry_signal_at::text, entry_time::text, entry_price, exit_signal_at::text, exit_time::text, exit_price, exit_reason, position_mode, quantity, notional_entry_value, gross_profit, fee_amount, slippage_bps, profit, result_percent, result FROM trades WHERE experiment_id = $1::uuid ORDER BY sequence ASC, id ASC`, [experimentId]);
    return result.rows.map(tradeFromRow);
  }

  async function metricsForExperiment(experimentId: string): Promise<Experiment["metrics"]> {
    const result = await query<Record<string, unknown>>(`SELECT total_return_percent, win_rate_percent, number_of_trades, max_drawdown_magnitude_percent, evaluation_profile_id FROM evaluation_results WHERE experiment_id = $1::uuid`, [experimentId]);
    const row = result.rows[0];
    if (!row) throw new Error("evaluation result is unavailable");
    return {
      candidateId: "unknown",
      totalReturnPercent: numberColumn(row.total_return_percent, "total_return_percent"),
      winRatePercent: numberColumn(row.win_rate_percent, "win_rate_percent"),
      numberOfTrades: integerColumn(row.number_of_trades, "number_of_trades"),
      maxDrawdownMagnitudePercent: numberColumn(row.max_drawdown_magnitude_percent, "max_drawdown_magnitude_percent"),
      evaluationProfileId: String(row.evaluation_profile_id) as Experiment["metrics"]["evaluationProfileId"],
    };
  }

  async function strategyProvenance(row: ExperimentRow, ownerUserId: AuthenticatedUserId): Promise<Experiment["strategy"]> {
    if (row.strategy_selection_kind === "STRATEGY") {
      const result = await query<Record<string, unknown>>(`SELECT id::text, owner_user_id::text, logical_family_key, strategy_name, implementation_version, behavior_profile_id, version, parameters, created_at::text FROM strategy_definitions WHERE owner_user_id = $1::uuid AND id = $2::uuid`, [ownerUserId, row.strategy_definition_id]);
      const value = result.rows[0];
      if (!value) throw new Error("strategy definition is unavailable");
      return { kind: "STRATEGY", definition: {
        id: String(value.id), ownerUserId: String(value.owner_user_id) as AuthenticatedUserId, logicalFamilyKey: String(value.logical_family_key), strategyName: String(value.strategy_name), implementationVersion: String(value.implementation_version), behaviorProfileId: String(value.behavior_profile_id), version: integerColumn(value.version, "version"), parameters: value.parameters as Record<string, number | string>, createdAt: timestampColumn(value.created_at, "created_at"),
      } };
    }
    const compositeResult = await query<Record<string, unknown>>(`SELECT id::text, owner_user_id::text, logical_family_key, version, method, combination_profile_id, created_at::text FROM composite_strategy_definitions WHERE owner_user_id = $1::uuid AND id = $2::uuid`, [ownerUserId, row.composite_definition_id]);
    const composite = compositeResult.rows[0];
    if (!composite) throw new Error("composite strategy definition is unavailable");
    const componentResult = await query<Record<string, unknown>>(`SELECT sd.id::text, sd.owner_user_id::text, sd.logical_family_key, sd.strategy_name, sd.implementation_version, sd.behavior_profile_id, sd.version, sd.parameters, sd.created_at::text FROM composite_components cc INNER JOIN strategy_definitions sd ON sd.id = cc.strategy_definition_id AND sd.version = cc.strategy_definition_version WHERE cc.composite_definition_id = $1::uuid AND sd.owner_user_id = $2::uuid ORDER BY cc.component_position ASC`, [row.composite_definition_id, ownerUserId]);
    const componentDefinitions = componentResult.rows.map((value): StrategyDefinition => ({
      id: String(value.id),
      ownerUserId: String(value.owner_user_id) as AuthenticatedUserId,
      logicalFamilyKey: String(value.logical_family_key),
      strategyName: String(value.strategy_name),
      implementationVersion: String(value.implementation_version),
      behaviorProfileId: String(value.behavior_profile_id),
      version: integerColumn(value.version, "version"),
      parameters: value.parameters as Record<string, number | string>,
      createdAt: timestampColumn(value.created_at, "created_at"),
    }));
    const definition: CompositeStrategyDefinition = {
      id: String(composite.id),
      ownerUserId: String(composite.owner_user_id) as AuthenticatedUserId,
      logicalFamilyKey: String(composite.logical_family_key),
      version: integerColumn(composite.version, "version"),
      method: String(composite.method) as CompositeStrategyDefinition["method"],
      combinationProfileId: String(composite.combination_profile_id) as CompositeStrategyDefinition["combinationProfileId"],
      components: componentDefinitions.map((component) => ({ strategyDefinitionId: component.id, strategyDefinitionVersion: component.version })),
      createdAt: timestampColumn(composite.created_at, "created_at"),
    };
    return { kind: "COMPOSITE", definition, componentDefinitions };
  }

  function experimentFromRow(row: ExperimentRow, trades: readonly Trade[], strategy: Experiment["strategy"], metrics: Experiment["metrics"]): Experiment {
    const hasReplayableDataset = Boolean(row.market_dataset_snapshot_id && row.dataset_version);
    const exactDatasetReplay = row.replay_guarantee === "EXACT_REPLAY_AVAILABLE" && hasReplayableDataset;
    const code = typeof row.code_provenance === "object" && row.code_provenance !== null
      ? row.code_provenance as Experiment["code"]
      : {};
    const hasCodeCommit = typeof code.gitCommit === "string" && code.gitCommit.trim().length > 0;
    const exactReplay = exactDatasetReplay && hasCodeCommit;
    const provider = row.dataset_provider ?? "unknown";
    const paperExecution = paperExecutionFromPersistence(row.paper_execution_provenance);
    return {
      id: row.id,
      candidateId: row.candidate_id,
      ...(row.search_run_id === null ? {} : { searchRunId: row.search_run_id }),
      strategy,
      marketData: (exactDatasetReplay
        ? {
        provider,
        pair: row.pair,
        timeframe: row.timeframe as Experiment["marketData"]["timeframe"],
        range: { from: timestampColumn(row.range_from, "range_from"), to: timestampColumn(row.range_to, "range_to") },
        replayGuarantee: "EXACT_REPLAY_AVAILABLE" as const,
        datasetId: row.market_dataset_snapshot_id!,
        datasetVersion: row.dataset_version!,
      }
        : {
            provider,
            pair: row.pair,
            timeframe: row.timeframe as Experiment["marketData"]["timeframe"],
            range: { from: timestampColumn(row.range_from, "range_from"), to: timestampColumn(row.range_to, "range_to") },
            replayGuarantee: "TRACEABLE" as const,
            ...(row.market_dataset_snapshot_id ? { datasetId: row.market_dataset_snapshot_id } : {}),
            ...(row.dataset_version ? { datasetVersion: row.dataset_version } : {}),
            replayLimitation: row.replay_limitation ?? "persisted replay guarantee is TRACEABLE",
          }),
      configuration: {
        executionProfileId: row.execution_profile_id,
        initialCapital: numberColumn(row.initial_capital, "initial_capital"),
        feeRatePercent: numberColumn(row.fee_rate_percent, "fee_rate_percent"),
        slippageBps: integerColumn(row.slippage_bps, "slippage_bps"),
        ...(paperExecution === undefined ? {} : { paperExecution }),
      },
      ...(paperExecution === undefined ? {} : { paperExecutionProvenance: structuredClone(paperExecution) }),
      metrics: { ...metrics, candidateId: row.candidate_id },
      rankingConfigurationId: row.ranking_configuration_id,
      code,
      replay: exactReplay
        ? { guarantee: "EXACT_REPLAY_AVAILABLE", unavailableInputs: [] }
        : {
            guarantee: "TRACEABLE",
            unavailableInputs: (exactDatasetReplay
              ? ["EXECUTABLE_CODE"]
              : ["HISTORICAL_DATA", "EXECUTABLE_CODE"]) as [
                "HISTORICAL_DATA" | "EXECUTABLE_CODE",
                ...("HISTORICAL_DATA" | "EXECUTABLE_CODE")[],
              ],
            limitation: row.replay_limitation ?? "persisted replay guarantee is TRACEABLE",
          },
      // The frozen public Experiment contract has no equityCurve field. Keep
      // the persisted simulator curve internal and omit it from read results
      // rather than fabricating or widening the public contract here.
      visualization: { signals: [], overlays: [], tradeMarkers: trades.flatMap((trade) => [{ tradeId: trade.id, kind: "ENTRY" as const, timestamp: trade.entryTime, price: trade.entryPrice }, { tradeId: trade.id, kind: "EXIT" as const, timestamp: trade.exitTime, price: trade.exitPrice }]) },
      createdAt: timestampColumn(row.created_at, "created_at"),
    };
  }

  const unitOfWork: BacktestingUnitOfWork = {
    run: async <T>(operation: () => Promise<T>): Promise<T> => {
      if (!pool.connect) {
        await query("BEGIN");
        try { const result = await operation(); await query("COMMIT"); return result; } catch (error) { await query("ROLLBACK"); throw error; }
      }
      const client = await pool.connect();
      await client.query("BEGIN");
      try { const result = await transactionStorage.run(client, operation); await client.query("COMMIT"); return result; } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
    },
  };
  const completionUnitOfWork: BacktestingCompletionUnitOfWork<Experiment, Trade> = {
    // UNVERIFIED across module adapters: this transaction is atomic only when
    // the leaderboard participant uses the same transaction-aware pool.
    commit: (input, participants) => unitOfWork.run(async () => ({
      experiment: await participants.insertExperiment(input.ownerUserId, input.experiment, input.trades),
      leaderboard: await participants.submitLeaderboard(input.ownerUserId, input.leaderboardSubmission),
    })),
  };

  let closed = false;
  return { pool, candidateRepository, experimentRepository, unitOfWork, completionUnitOfWork, clock, close: async () => { if (!closed) { closed = true; await pool.end(); } } };
}
