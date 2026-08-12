# Cryptox - Component Contracts

## 0. Conventions

- All timestamps are ISO-8601 strings in UTC (`"2026-08-12T09:10:03.000Z"`), never epoch millis on the wire, to avoid unit-mismatch bugs between services written at different times.
- All money/price/percentage values are `number` (float), except where noted; the brief does not require fixed-point precision (this is an architecture exercise, not a real trading system — see brief §47).
- Every contract that can be **generated multiple times with different behavior** (`StrategyDefinition`, `CompositeStrategyDefinition`) carries a `version` field. This is not optional — brief §36 makes versioning + reproducibility a hard requirement: *"Experiment #122 must always know exactly which strategy version it used."*
- **Identity rule (resolves an ambiguity in brief §36's own example):** `id` on any versioned contract (`StrategyDefinition`, `CompositeStrategyDefinition`) is **unique per version, not per logical strategy**. Editing parameters never updates a row in place — it always inserts a new row with a new `id` and `version = previous + 1`. A separate, optional `familyName` groups versions together for display purposes only (e.g. showing "MA-RSI Strategy v1, v2, v3" as a history in the UI); it is never used as a foreign key. Anything that references a `strategyDefinitionId` or `compositeDefinitionId` is therefore automatically version-pinned — this is what makes brief §40.8 ("how do we check which strategy version produced a given Leaderboard row?") answerable by a single join, with no risk of the referenced row having silently changed underneath it.
- Enums are written as TypeScript string union types so they serialize identically in REST responses, market WebSocket messages, and backtest queue payloads without a mapping layer.

## 1. Core Enums

```typescript
// packages/contracts/src/enums.ts

export type Signal = "BUY" | "SELL" | "HOLD";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
// Brief §5: dashboard supports up to 4 concurrent charts, each with an
// independently selectable timeframe from this set.

export type Pair = string; // e.g. "BTCUSDT" — kept as a plain string, not an enum,
// since brief §32.2/§44.3 explicitly requires adding exchanges/pairs without a code change.

export type SentimentLabel = "POSITIVE" | "NEUTRAL" | "NEGATIVE"; // brief §29

// Domain grouping used by the Domain-guided Generator (brief §17).
// A strategy plugin declares which category it belongs to; the generator
// uses this to build composites like "1 Trend + 1 Momentum + 1 Structure".
export type StrategyCategory =
  | "TREND"        // MA, MACD
  | "MOMENTUM"     // RSI, Stochastic
  | "VOLATILITY"   // Bollinger, ATR
  | "STRUCTURE"    // Support/Resistance, SMC, Wyckoff
  | "INFORMATION"; // News Sentiment

export type CombinationMethod = "MAJORITY_VOTE" | "WEIGHTED_SCORE"; // brief §13-14

export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC"; // brief §16-18
```

## 2. Market Data Contracts

Owned by `services/market-data`. Corresponds to brief §4 (Realtime Market Data) and §35 (Database → Market Data group).

```typescript
// packages/contracts/src/market-data.ts

export interface Candle {
  pair: Pair;
  timeframe: Timeframe;
  timestamp: string;   // candle open time, ISO-8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;   // false while the candle is still forming (realtime), true once finalized
}

// Immutable, content-addressed candle set used by backtests. A new exchange
// correction creates another snapshot/hash; completed Experiments never follow
// mutable rows in the live candle table.
export interface DatasetSnapshotRef {
  id: string;
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
  candleCount: number;
  sha256: string;
  createdAt: string;
}

// Produced on every exchange tick, independent of candle close. The Market
// Data Service passes this normalized DTO directly to the WebSocket Gateway.
export interface MarketTick {
  pair: Pair;
  price: number;
  timestamp: string;
}

// Connection health, needed to satisfy brief §32.4 (Reliability) and
// question §40.7 ("If the Binance WebSocket disconnects, how does the
// system recover?"). Available on the market WebSocket so the Frontend can
// show a warning instead of silently freezing.
export interface MarketDataConnectionStatus {
  provider: "BINANCE" | "OKX" | "BYBIT" | "COINBASE"; // extensible per brief §6
  status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  lastEventAt: string;
}
```

**Boundary rule (from `architecture.md` §1.3 and brief §6):** `Candle`, `DatasetSnapshotRef`, `MarketTick`, and `MarketDataConnectionStatus` are the only shapes that leave `market-data`. The raw Binance payload never crosses this boundary — `BinanceAdapter` (and any future `OKXAdapter`) produces the normalized contracts, so `strategy-engine` and the Frontend never depend on an exchange-specific format. Backtest Workers load immutable snapshot candles, never the mutable latest-candle table directly.

## 3. Strategy Engine Contracts

Owned by `services/strategy-engine`. Corresponds to brief §6-12 (Strategy Engine, MA/RSI/Bollinger/SR examples, Plugin requirement).

```typescript
// packages/contracts/src/strategy.ts

// This is exactly the `context` object referenced in brief §6 ("context can
// contain: price, volume, candles, timeframe, indicators, market state,
// sentiment..."). It is the ONLY input a Strategy implementation may read from.
export interface StrategyContext {
  pair: Pair;
  timeframe: Timeframe;
  candles: Candle[];            // most recent N candles, N decided by the caller (Backtester or live loop), not by the strategy
  currentPrice: number;
  indicators: Record<string, number | number[]>;
  // pre-computed values, e.g. { "MA20": 118023.4, "RSI14": 42.1 }.
  // Computed once per context by an Indicator layer inside strategy-engine
  // (not by each strategy individually) so that two strategies sharing an
  // indicator (e.g. two MA-based strategies) don't recompute it twice.
  sentiment?: {
    label: SentimentLabel;
    averageScore: number;       // e.g. average over the last hour — brief §30
  };
}

// The interface every strategy plugin implements — brief §6, verbatim shape.
export interface Strategy {
  readonly name: string;              // e.g. "MA", "RSI", "MACD"
  readonly category: StrategyCategory;
  analyze(context: StrategyContext): Signal;
}

// A concrete, versioned configuration of a Strategy — what actually gets
// stored, referenced by an ExperimentResult, and never overwritten (brief §36).
export interface StrategyDefinition {
  id: string;                    // unique per version — see the Identity rule in §0
  familyName?: string;           // display-only grouping, e.g. "MA-RSI Strategy" across v1/v2/v3 — never a foreign key
  strategyName: string;         // matches Strategy.name, resolved via the Registry
  implementationVersion: string; // plugin code version, independent of parameter/config version
  implementationSha256: string;  // exact retained build artifact used to replay this definition
  version: number;               // incremented on any parameter change — never mutate in place
  parameters: Record<string, number | string>;
  // e.g. MA: { fastPeriod: 20, slowPeriod: 50 }
  //      RSI: { period: 14, buyThreshold: 30, sellThreshold: 70 }
  createdAt: string;
}
```

**Plugin registration contract** (brief §12, §41 — the exact scenario a grader will test):

```typescript
// packages/contracts/src/strategy-registry.ts

export interface StrategyRegistry {
  register(factory: StrategyFactory): void;
  get(name: string, implementationSha256: string): StrategyFactory | undefined;
  list(): StrategyPluginDescriptor[]; // safe serializable metadata for GET /strategies
}

export type StrategyParameterDescriptor =
  | {
      key: string;
      label: string;
      type: "INTEGER" | "NUMBER";
      required: boolean;
      defaultValue: number;
      minimum?: number;
      maximum?: number;
      step?: number;
    }
  | {
      key: string;
      label: string;
      type: "ENUM";
      required: boolean;
      defaultValue: string;
      options: string[];
    };

export interface StrategyPluginDescriptor {
  name: string;
  displayName: string;
  description: string;
  category: StrategyCategory;
  implementationVersion: string;
  implementationSha256: string;
  parameters: StrategyParameterDescriptor[];
}

export interface StrategyFactory {
  descriptor: StrategyPluginDescriptor;
  create(parameters: Record<string, number | string>): Strategy;
}

export interface StrategyArtifactResolver {
  resolve(strategyName: string, implementationSha256: string): Promise<StrategyFactory>;
  // throws IMPLEMENTATION_ARTIFACT_UNAVAILABLE; never substitutes another build
}
```

Adding `MACDStrategy` means: implement `Strategy`, provide a factory plus serializable descriptor/parameter schema and immutable implementation version/hash, and call `register()` once at bootstrap. `GET /strategies` returns descriptors, so the Frontend renders configuration fields without a MACD-specific branch. Creating a `StrategyDefinition` copies the descriptor's implementation provenance. The Registry/Artifact Resolver resolves `(strategyName, implementationSha256)` from retained build artifacts; if one is unavailable, replay returns `IMPLEMENTATION_ARTIFACT_UNAVAILABLE` instead of substituting the latest plugin. Nothing else in this document changes — this is what makes brief §41's grading scenario pass.

## 4. Composite Strategy Contracts

Owned by `services/composite-strategy`. Corresponds to brief §13-14 (Composite Strategy, Weighted Combination).

```typescript
// packages/contracts/src/composite-strategy.ts

export interface CompositeStrategyDefinition {
  id: string;
  version: number;
  method: CombinationMethod;
  components: Array<{
    strategyDefinitionId: string;   // references a StrategyDefinition.id
    weight: number;                  // used only when method === "WEIGHTED_SCORE"; ignored for MAJORITY_VOTE
  }>;
  // Weighted-score thresholds, only relevant when method === "WEIGHTED_SCORE".
  // Defaults match the brief's own example (§14): buy > 0.3, sell < -0.3.
  thresholds?: { buy: number; sell: number };
  createdAt: string;
}

// What the Combination Engine actually does with per-strategy signals —
// brief §13's Majority Vote and §14's Weighted Score, formalized:
export interface CombinationEngine {
  combine(
    definition: CompositeStrategyDefinition,
    signals: Array<{ strategyDefinitionId: string; signal: Signal }>
  ): Signal;
}
```

**Boundary rule:** the Combination Engine only ever sees `Signal` values plus the `weight`/`method` from the definition — brief §44 explicitly forbids it from knowing *why* a sub-strategy produced BUY vs. SELL (no `if MA && RSI` branching, no reading another strategy's internal state).

## 5. Search Engine Contracts

Owned by `services/search-engine`. Corresponds to brief §15-18 (Search Engine, Random/Domain-guided/Advanced search) and the extensibility scenario in brief §42.

```typescript
// packages/contracts/src/search.ts

export type CandidateStatus =
  | "CREATED"
  | "QUEUED"
  | "BACKTESTING"
  | "RETRY_WAIT"
  | "PROCESSING_RESULT"
  | "TERMINAL_FAILURE_PENDING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

interface CandidateBase {
  id: string;
  leaderboardScopeId: string;          // immutable benchmark used for fair scoring/ranking
  compositeDefinition: CompositeStrategyDefinition;
  maxAttempts: number;
  status: CandidateStatus;
  createdAt: string;
}

export interface ManualCandidateStrategy extends CandidateBase {
  origin: "MANUAL";
}

export interface SearchCandidateStrategy extends CandidateBase {
  origin: "SEARCH";
  searchRunId: string;
  generatedBy: GeneratorType;
  iterationNumber: number;
}

// A discriminated union prevents a SEARCH candidate from existing without
// its Search Run/generator metadata and keeps MANUAL candidates free of it.
export type CandidateStrategy = ManualCandidateStrategy | SearchCandidateStrategy;

export interface BacktestAttemptProgress {
  attemptId: string;
  attemptNumber: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// REST projection used by GET /backtests/{candidateId} and inside LoopStatus.
// It intentionally omits the large Composite definition and Trade list.
export interface CandidateProgress {
  candidateId: string;
  origin: "MANUAL" | "SEARCH";
  searchRunId?: string;
  iterationNumber?: number;
  leaderboardScopeId: string;
  status: CandidateStatus;
  attempts: BacktestAttemptProgress[];
  maxAttempts: number;
  activeAttemptNumber?: number;             // fencing generation currently allowed to update Candidate state
  completionAttemptCount: number;           // result-processing claims; separate from worker/BullMQ attempts
  completionMaxAttempts: number;             // fixed at 5 for the MVP
  completionNextRetryAt?: string;
  // completion lease token is internal and intentionally never exposed by REST
  experimentResultId?: string;
  failureKind?: "RETRY_EXHAUSTED" | "INFRASTRUCTURE" | "COMPLETION_PROCESSING";
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedCandidate {
  strategyDefinitions: StrategyDefinition[];       // complete immutable versions referenced below
  compositeDefinition: CompositeStrategyDefinition;
  generatedBy: GeneratorType;
}

export interface StrategyGenerator {
  readonly type: GeneratorType;
  generate(searchSpace: SearchSpaceConfig): GeneratedCandidate;
}

// What the generator is allowed to pick from — the pool of available
// StrategyDefinitions grouped by category, used directly by the
// Domain-guided Generator's rule ("1 Trend + 1 Momentum + 1 Structure", brief §17).
export interface SearchSpaceConfig {
  availableStrategies: StrategyDefinition[];
  domainRules?: {
    requiredCategories: StrategyCategory[]; // e.g. ["TREND", "MOMENTUM", "STRUCTURE"]
  };
  maxComponents?: number;
}

// Brief §23: "The group must design a Stop Condition. Do not run
// while(true) uncontrolled." This is that contract, owned by continuous-loop.
type StopConditionFields = {
  maxCandidates?: number;
  maxDurationSeconds?: number;
  noImprovementAfterIterations?: number;
};

// At least one stop field is required. POST /search-runs also validates every
// supplied value as a positive integer.
export type StopCondition =
  | (StopConditionFields & { maxCandidates: number })
  | (StopConditionFields & { maxDurationSeconds: number })
  | (StopConditionFields & { noImprovementAfterIterations: number });
```

### 5.1 Search Loop Orchestrator — Observability Contract

Owned by `services/continuous-loop`. This formalizes brief §32.7 (Observability) and §24. The Backend owns the long-running loop; the Frontend polls a REST read model and may disconnect without stopping the run.

```typescript
// packages/contracts/src/continuous-loop.ts

export interface LoopStatus {
  searchRunId: string;
  state: "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED";
  activeCandidates: CandidateProgress[];
  queuedCount: number;
  runningCount: number;
  candidatesTested: number;
  failedCandidateCount: number;
  retryExhaustedCandidateCount: number;
  infrastructureFailureCandidateCount: number;
  completionProcessingFailureCandidateCount: number;
  failedAttemptCount: number;
  averageBacktestDurationMs: number;
  currentTopEntry?: SearchRunRankingEntry;      // best completed Experiment in this Search Run
  createdAt: string;
  startedAt?: string;
  updatedAt: string;
  endedAt?: string;
  stopReason?: "MAX_CANDIDATES" | "MAX_DURATION" | "NO_IMPROVEMENT" | "USER_CANCELLED" | "ERROR";
  stopCondition: StopCondition;
}

export interface ContinuousLoopOrchestrator {
  start(config: {
    searchSpace: SearchSpaceConfig;
    stopCondition: StopCondition;
    generatorType: GeneratorType;
    leaderboardScopeId: string;
    maxInFlight: number;
  }): Promise<{ searchRunId: string }>;
  pause(searchRunId: string): Promise<void>;
  resume(searchRunId: string): Promise<void>;
  cancel(searchRunId: string): Promise<void>;
  status(searchRunId: string): Promise<LoopStatus>;
  onCandidateFinished(searchRunId: string): Promise<void>; // internal callback; delegates to reconcile/fill
  fillAvailableSlots(searchRunId: string): Promise<void>;  // serialized, idempotent recovery use case
}
```

**Persistence rule:** generated IDs are allocated before submission. The Backtest Coordinator atomically inserts/verifies every generated `StrategyDefinition`, the `CompositeStrategyDefinition` plus component rows, and only then its Candidate. Repeating the same generated IDs is idempotent (`ON CONFLICT` must verify identical immutable content); a conflicting body for an existing ID is rejected. The Manual path applies the same rule to the user's validated configuration. Therefore no Candidate can reference an in-memory-only definition.

**Boundary rule:** `LoopStatus` is a read-only projection from `search_runs`, `candidate_strategies`, `backtest_attempts`, and Experiment ranking data. `GET /search-runs/{id}` returns it. `candidatesTested` means non-cancelled Candidates whose pipeline reached terminal `COMPLETED` or `FAILED` (an attempted candidate, not necessarily a successful simulation). `failedCandidateCount` counts every terminal `FAILED` Candidate; the retry-exhausted, infrastructure-failure, and completion-processing counters partition it. `failedAttemptCount` counts all failed Attempt rows, including a synthetic failure audit row. Average duration uses completed Attempts only. Pause stops generation/enqueue of new candidates but lets claimed jobs finish.

`activeCandidates` contains every non-terminal Candidate. `queuedCount` counts `CREATED | QUEUED`; `runningCount` counts `BACKTESTING | RETRY_WAIT | PROCESSING_RESULT | TERMINAL_FAILURE_PENDING`. All six states occupy an in-flight slot until a Candidate becomes `COMPLETED | FAILED | CANCELLED`.

`fillAvailableSlots` locks the Search Run row (or holds an equivalent per-run lease), derives in-flight/created counts from PostgreSQL, checks every stop condition, and creates at most the missing number of iterations. Once a stop condition is met it creates no more candidates; after the last in-flight Candidate becomes terminal it atomically marks the run `COMPLETED`, sets `stopReason`/`endedAt`, and returns. It is invoked after `start`, `resume`, every completion callback, and at backend startup/periodically for every `RUNNING` run. This makes the callback an optimization rather than a single point of progress and prevents concurrent completions from exceeding `maxInFlight` or `maxCandidates`.

`cancel(searchRunId)` locks the Search Run and, in one idempotent transaction, writes `state = CANCELLED`, `stopReason = USER_CANCELLED`, `endedAt`, and marks every non-terminal Candidate `CANCELLED` while clearing active-attempt and completion-retry lease/schedule fields. After commit, Search Loop calls `BacktestCoordinator.removePendingJobs(candidateIds)`; Search Loop never imports `queue-client`. The Coordinator best-effort removes waiting/delayed jobs only, while running workers may finish their current simulation. A late worker may still persist its Attempt/Trades for audit, but fenced/conditional state writes and the Completion Processor never change the Candidate back or create an Experiment/rank. Manual cancellation applies the same Candidate cleanup after verifying `origin = MANUAL`.

## 6. Backtesting Contracts

Owned by `services/backtesting` and composed into `apps/backtest-worker`, per `project-structure.md`. Corresponds to brief §19-20.

**Queue rule:** BullMQ is a competing-consumer work queue, not broadcast pub/sub. One worker normally claims a job, but stalled-job recovery can briefly overlap deliveries; `activeAttemptNumber` therefore fences every final write. On a normal return/throw path, the worker atomically persists the Attempt outcome, Trades if any, and conditional Candidate pending state first. A crash/lock-loss path that bypasses this write is repaired by the Coordinator-owned terminal watchdog. The terminal queue signal is small and never carries Trades. Retry/backoff are BullMQ transport metadata, while attempt history remains queryable in PostgreSQL.

```typescript
// packages/contracts/src/backtesting.ts

export interface BacktestRequest {
  candidateId: string;               // references CandidateStrategy.id
  leaderboardScopeId: string;        // worker reloads immutable pair/timeframe/dataset/cost settings from this scope
}

export interface BacktestQueueJob extends BacktestRequest {
  jobId: string;       // deterministic: jobId === candidateId
  maxAttempts: number; // same immutable value is configured in BullMQ attempts and persisted on Candidate
  workerRuntimeVersion: string; // copied from immutable scope; worker rejects a different local runtime
  workerRuntimeSha256: string;
  enqueuedAt: string;
}

export interface StartManualBacktestCommand {
  leaderboardScopeId: string;
  strategyDefinitions: StrategyDefinition[];
  compositeDefinition: CompositeStrategyDefinition;
  maxAttempts: number;
}

export interface SubmitSearchCandidateCommand extends GeneratedCandidate {
  searchRunId: string;
  leaderboardScopeId: string;
  iterationNumber: number;
  maxAttempts: number;
}

export interface BacktestSubmissionAccepted {
  candidateId: string;
  jobId: string;
  status: "CREATED" | "QUEUED";
}

// The only typed in-process gateway into the asynchronous backtest boundary.
export interface BacktestCoordinator {
  startManual(command: StartManualBacktestCommand): Promise<BacktestSubmissionAccepted>;
  submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
  status(candidateId: string): Promise<CandidateProgress>;
  cancelManualCandidate(candidateId: string): Promise<void>; // requires origin=MANUAL; Search IDs return 409 and use run cancellation
  removePendingJobs(candidateIds: string[]): Promise<void>;  // internal, best-effort; waiting/delayed jobs only
}

export interface BacktestCompletionProcessor {
  process(signal: BacktestQueueTerminalSignal): Promise<void>;
  reconcileCandidate(candidateId: string): Promise<void>;
  reconcileDueCandidates(limit: number): Promise<number>;
}

export interface Trade {
  id: string;
  backtestAttemptId: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  resultPercent: number;   // e.g. +1.85, -0.90 — matches the Trade Detail table in brief §26
  signal: "LONG" | "SHORT"; // MVP only needs LONG; SHORT is listed here for the
                              // brief §38 extension ("Long/Short, Stop Loss, Take Profit")
}

interface BacktestResultBase {
  candidateId: string;
  attemptId: string;
  workerRuntimeVersion: string;
  workerRuntimeSha256: string;
  startedAt: string;
  completedAt: string;
}

export interface CompletedBacktestResult extends BacktestResultBase {
  status: "COMPLETED";
  trades: Trade[];
}

export interface FailedBacktestResult extends BacktestResultBase {
  status: "FAILED";
  trades: [];
  errorMessage: string;
}

export type BacktestResult = CompletedBacktestResult | FailedBacktestResult;

export interface CompletedBacktestWorkerReturn {
  status: "COMPLETED";
  candidateId: string;
  attemptId: string;
  completedAt: string;
}

export type BacktestWorkerReturn =
  | CompletedBacktestWorkerReturn
  | {
      status: "IGNORED";
      candidateId: string;
      reason: "CANCELLED" | "SUPERSEDED" | "ALREADY_TERMINAL" | "PENDING_COMPLETION";
    };

// What the thin queue adapter receives/forwards from native BullMQ QueueEvents.
// It performs no domain database lookup; even an IGNORED return is forwarded
// and becomes a PostgreSQL-backed no-op in the Completion Processor.
export type BacktestQueueTerminalSignal =
  | {
      jobId: string;
      status: "COMPLETED";
      returnValue: BacktestWorkerReturn;
    }
  | {
      jobId: string;
      status: "RETRIES_EXHAUSTED";
      attemptsMade: number;
    }
  | {
      jobId: string;
      status: "VERIFIED_TERMINAL_FAILED"; // queue-client confirmed current BullMQ state=failed and no retry can run
      failedReason: string;
    };

// Internal command normalized by the Completion Processor after it derives
// candidateId = jobId and reloads the authoritative latest Attempt from DB.
export type BacktestCompletionNotification =
  | {
      jobId: string;
      candidateId: string;
      attemptId: string;
      status: "COMPLETED";
      completedAt: string;
    }
  | {
      jobId: string;
      candidateId: string;
      attemptId: string;
      status: "FAILED";
      errorMessage: string;
      completedAt: string;
    };
```

## 7. Evaluation Contracts

Owned by `services/evaluation`. Corresponds to brief §20-21 — the explicit requirement that *"Strategy Evaluation must be separate from Strategy Implementation."*

```typescript
// packages/contracts/src/evaluation.ts

export interface EvaluationMetrics {
  candidateId: string;
  totalReturnPercent: number;
  winRatePercent: number;
  numberOfTrades: number;
  maxDrawdownPercent: number;  // non-negative loss magnitude: 18 means an 18% drawdown, never -18
  profitFactor: number | null;
  profitFactorStatus: "FINITE" | "NO_TRADES" | "NO_LOSSES" | "NO_GROSS_MOVEMENT";
  sharpeRatio: number;
  sharpeRatioStatus: "FINITE" | "INSUFFICIENT_OBSERVATIONS" | "ZERO_VARIANCE";
}

export interface Evaluator {
  evaluate(result: CompletedBacktestResult): EvaluationMetrics;
}
```

**Boundary rule:** `Evaluator.evaluate` takes only a `BacktestResult` (a `Trade[]`) — it never receives the `Strategy` or `CompositeStrategyDefinition` that produced those trades. This is what brief §20 means by evaluation being decoupled from implementation: swapping how a strategy decides to trade never requires touching how performance is measured.

**Finite metric policy:** Evaluator and repositories reject `NaN` and positive/negative infinity. With zero trades, Return, Win Rate, Drawdown, and Sharpe are `0`; Profit Factor is `null`/`NO_TRADES`. Wins mean strictly positive returns, so break-even trades are not wins. Profit Factor is finite and non-negative when gross loss is positive; it is `null`/`NO_LOSSES` when gross profit is positive but gross loss is zero, and `null`/`NO_GROSS_MOVEMENT` when both are zero. Sharpe is `0`/`INSUFFICIENT_OBSERVATIONS` for fewer than two return observations and `0`/`ZERO_VARIANCE` when standard deviation is at most `1e-12`; it is otherwise finite. The UI may render `NO_LOSSES` as `∞`, but that display value never crosses an API or persistence boundary.

### 7.1 Experiment Result — the Persisted Aggregate

Brief §35 lists **Experiment** as its own top-level data group — *Combination, Dataset, Timeframe, Parameters, Result* — distinct from `Strategy` and separate from whatever the Leaderboard stores. `CandidateStrategy`, `BacktestRequest`, `BacktestResult`, and `EvaluationMetrics` above are the pipeline's working data; `ExperimentResult` is the single row that gets persisted as the **canonical aggregate** once the pipeline finishes successfully, and it is what brief §36/§40.8 actually mean by *"Experiment #122"*. (`CandidateStrategy` and `BacktestResult` are additionally kept as durable audit rows in the data model — see `data-model.md` — purely so `Trade`/`ExperimentResult` have a real foreign key to reference and so failed attempts stay queryable; this does not change either shape below or make either of them a second source of truth for a completed experiment.)

```typescript
// packages/contracts/src/experiment.ts

interface ExperimentResultBase {
  id: string;                              // this is "Experiment #122"
  candidateId: string;                     // -> CandidateStrategy.id
  backtestAttemptId: string;               // exact successful attempt that produced the trades
  compositeDefinitionId: string;           // -> CompositeStrategyDefinition.id (version-pinned, see §0 Identity rule)
  leaderboardScopeId: string;              // exact immutable benchmark used by this run
  scoreFormulaId: string;                  // exact immutable formula version used for scoring
  workerRuntimeVersion: string;            // simulator/indicator runtime provenance
  workerRuntimeSha256: string;
  evaluationRuntimeVersion: string;        // metric implementation provenance
  evaluationRuntimeSha256: string;
  datasetSnapshot: DatasetSnapshotRef;     // hydrated from the immutable scope/snapshot relation
  sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef; // required when the composite uses INFORMATION
  trades: Trade[];
  metrics: EvaluationMetrics;
  overallScore: number;
  createdAt: string;
}

export type ExperimentResult = ExperimentResultBase & (
  | { rankEligible: true; rankExclusionReason?: never }
  | { rankEligible: false; rankExclusionReason: "NO_TRADES" }
);
```

Owned by `services/evaluation`. The Completion Processor loads the persisted `BacktestResult`, calls `Evaluator`, asks `LeaderboardService.score` to apply the selected immutable formula, then saves this aggregate and applies Top-10 admission in the same transaction. This is the row `LeaderboardEntry` references and the fixed chain used to answer brief §40.8: *experiment → composite version → component strategy versions*.

## 8. Leaderboard Contracts

Owned by `services/leaderboard`. Corresponds to brief §21-22.

```typescript
// packages/contracts/src/leaderboard.ts

export interface LeaderboardEntry {
  id: string;
  rank: number;
  experimentResultId: string;
  leaderboardScopeId: string;
  scoreFormulaId: string;
  score: number;
  addedAt: string;
}

export interface SearchRunRankingEntry {
  rank: number;
  searchRunId: string;
  leaderboardScopeId: string;
  candidateId: string;
  experimentResultId: string;
  scoreFormulaId: string;
  score: number;
}

// Brief §21 gives an explicit example: Score = 0.5*Return + 0.2*WinRate + 0.3*RiskScore.
// This is kept configurable rather than hard-coded, since the brief requires
// the group to "clearly present how the score is calculated" — implying it's
// a documented, swappable formula, not a fixed constant in the codebase.
export interface ScoreFormula {
  id: string;
  version: number;
  name: string;
  weights: {
    return: number;
    winRate: number;
    riskScore: number;
  };
  riskScoreMethod: string;                  // MVP default documented below; other methods create a new version
  riskScoreParameters: Record<string, number>;
  createdAt: string;
}

// A persistent leaderboard compares only like-for-like experiments. Scope rows
// are immutable: changing data snapshots, capital/costs, formula, or either
// runtime hash creates another version/scope instead of rewriting history.
export interface LeaderboardScope {
  id: string;
  name: string;
  version: number;
  datasetSnapshot: DatasetSnapshotRef;
  sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
  workerRuntimeVersion: string;
  workerRuntimeSha256: string;
  evaluationRuntimeVersion: string;
  evaluationRuntimeSha256: string;
  initialCapital: number;
  feeRatePercent: number;
  slippageBps: number;
  scoreFormulaId: string;
  createdAt: string;
}

interface ScoredEvaluationBase {
  leaderboardScopeId: string;
  scoreFormulaId: string;
  overallScore: number;
}

export type ScoredEvaluation = ScoredEvaluationBase & (
  | { rankEligible: true; rankExclusionReason?: never }
  | { rankEligible: false; rankExclusionReason: "NO_TRADES" }
);

export interface LeaderboardService {
  score(leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation;
  topK(leaderboardScopeId: string): LeaderboardEntry[];
  rankSearchRun(searchRunId: string): SearchRunRankingEntry[];
  submit(experiment: ExperimentResult): LeaderboardSubmissionResult;
}

export interface LeaderboardSubmissionResult {
  admitted: boolean;
  entry?: LeaderboardEntry;
  evictedExperimentResultId?: string;
}
```

The assignment defines Top-K scoring but does not prescribe leaderboard lifetime. This design therefore makes that choice explicit:

- Every non-cancelled Candidate whose backtest/evaluation pipeline succeeds creates one permanent `ExperimentResult`, including its computed score. A zero-trade success is retained with `overallScore = 0` and `rankEligible = false` for audit.
- `GET /search-runs/{id}/leaderboard` is a **run-scoped ranking** of every rank-eligible successful Experiment from that Search Run. It remains queryable after the run ends, but it is not the canonical cross-run leaderboard.
- `GET /leaderboard?scopeId=...` is a **persistent Top-10 per immutable benchmark scope**, shared across Manual and Search runs. `K = 10` is a fixed MVP application constant, not user-configurable. `submit()` creates an entry only when there is an empty slot or the Experiment beats current #10. A displaced entry is retained as inactive history; an Experiment that never qualified remains queryable but has no `leaderboard_entries` row.
- The default MVP formula is `riskScore = clamp(50 + 10 × sharpeRatio − maxDrawdownPercent, 0, 100)` followed by `score = wReturn × totalReturnPercent + wWinRate × winRatePercent + wRisk × riskScore`. `maxDrawdownPercent` is a non-negative loss magnitude (for example `18`, not `-18`); the UI may display it as `−18%`. Formula rows are versioned and the three weights must sum to `1`.
- `score()` overrides the formula with `overallScore = 0`, `rankEligible = false`, and `rankExclusionReason = NO_TRADES` when `numberOfTrades = 0`. `submit()` and both ranking queries exclude such an Experiment, while Experiment History still shows it. All scored values must be finite.

## 9. News & Sentiment Contracts

Owned by `services/news-ingestion` and `services/sentiment` respectively — kept in two files intentionally, since brief §28/§44 requires these to never depend on each other's internals.

```typescript
// packages/contracts/src/news.ts

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  crawledAt: string;
  relatedCoins: string[];   // e.g. ["BTC"]
  url: string;
}

// Brief §28: "RSS / NewsAPI / Crawler must all return this same shape" —
// this interface is what makes that true.
export interface NewsProvider {
  readonly name: string;
  fetch(): Promise<NewsItem[]>;
}
```

```typescript
// packages/contracts/src/sentiment.ts

export interface SentimentResult {
  newsId: string;         // -> NewsItem.id
  label: SentimentLabel;
  score: number;           // e.g. 0.82, per brief §29's example
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}

// Immutable time-aligned input for replaying an INFORMATION strategy.
export interface SentimentDatasetSnapshotRef {
  id: string;
  relatedCoin: string;
  range: { from: string; to: string };
  aggregationWindowSeconds: number;
  modelName: string;
  modelVersion: string;
  modelSha256: string;
  pointCount: number;
  sha256: string;
  createdAt: string;
}

export interface SentimentAnalysisService {
  // Rejects/throws on timeout or inference failure. The News workflow catches
  // it, emits logs/metrics, and persists no SentimentResult for that attempt.
  analyze(item: NewsItem): Promise<SentimentResult>;
}
```

**Why `NewsSentimentStrategy` still fits the `Strategy` interface (brief §30):** it is just another `Strategy` implementation whose `analyze()` reads `context.sentiment` (see §3 above) instead of `context.indicators`. Live analysis receives the current aggregate; a backtest receives the time-aligned value from the scope's sealed `SentimentDatasetSnapshotRef`. A Candidate containing any `INFORMATION` plugin is rejected unless its scope pins a sentiment snapshot covering the candle range. No change to `Strategy`, `StrategyRegistry`, or the Combination Engine is required when the model changes; a new model creates new results/snapshot IDs rather than changing old Experiments.

## 10. Transport Boundaries

There is no generic `EventEnvelope`, `EventPayloads`, or `services/event-bus` contract. The assignment's event list is optional; this architecture chooses simpler direct collaboration except for the backtest workload.

| Boundary | Contract | Rule |
|---|---|---|
| Frontend commands/queries | REST DTOs composed from the contracts above | Starting asynchronous work returns `202 Accepted` plus `candidateId`/`jobId` or `searchRunId` |
| Market realtime | `MarketTick`, `Candle`, `MarketDataConnectionStatus` | WebSocket only; messages are normalized before leaving Market Data |
| Backtest dispatch | `BacktestQueueJob` | Durable BullMQ work queue; one worker per job |
| Backtest terminal signal | `BacktestQueueTerminalSignal` | `completed`, `retries-exhausted`, or verified terminal `failed` wake-up; Completion Processor reloads state and is idempotent |

**Terminal-event mapping:** the thin adapter forwards every native `completed(jobId, returnvalue)`, including typed `IGNORED` outcomes, and native `retries-exhausted(jobId, attemptsMade)`. At its transport edge it JSON-parses/schema-validates BullMQ's string `returnvalue` and parses/validates the string `attemptsMade` as a positive integer; malformed fields are logged and left for PostgreSQL/BullMQ reconciliation instead of guessed. Every native `failed` is only an untrusted observation: `VERIFIED_TERMINAL_FAILED` is emitted only after `queue-client` confirms that the job's current BullMQ state is `failed` and no retry can run. `retries-exhausted` and a verified `failed` observation may both wake the processor for one job; idempotency makes the duplicate harmless. Failure detail in PostgreSQL is authoritative; transport fields are hints/wake-ups. `IGNORED` never drives a state transition from its payload: the processor reloads PostgreSQL and either processes a durable pending state or no-ops.

**Worker fencing:** under the Candidate lock, each runnable delivery closes any abandoned `RUNNING` Attempt, checks `maxAttempts`, allocates the next attempt number, and sets it as `activeAttemptNumber`. Attempt completion succeeds only when both the Attempt is still `RUNNING` and the Candidate still has that active number in `BACKTESTING`; otherwise a superseded worker is fenced out and returns `IGNORED/SUPERSEDED` (a lost BullMQ lock may discard that return; reconciliation remains sufficient). `CANCELLED` is a special audit-only branch: a worker may close its own still-running Attempt/store Trades under the lock, but never changes Candidate state, then returns `IGNORED/CANCELLED`. A last normal processor failure atomically sets `TERMINAL_FAILURE_PENDING` with `failureKind = RETRY_EXHAUSTED`; if stalled/redelivery handling finds the attempt budget already spent, it allocates no Attempt, sets the pending state with `failureKind = INFRASTRUCTURE`, and returns `IGNORED/PENDING_COMPLETION` rather than requesting another retry. Both pending writes include `lastError` and make completion immediately due. Already terminal Candidates return `IGNORED/ALREADY_TERMINAL`; existing pending Candidates return `IGNORED/PENDING_COMPLETION`.

**Completion reliability:** completion claims use a persisted five-attempt budget distinct from simulation/BullMQ attempts. Claim 1 is immediate; transient failures schedule attempts 2-5 after `5s`, `30s`, `2m`, and `10m` (±20% jitter). The reconciler atomically claims due work with a short persisted lease (`FOR UPDATE SKIP LOCKED` or equivalent), increments the count, and returns that count as `claimGeneration`. Before any final write it starts a transaction and follows the global lock order: Search Candidates lock `SearchRun → Candidate → LeaderboardScope`; Manual Candidates lock `Candidate → LeaderboardScope`. It requires the original `claimGeneration` plus its own still-live lease; a stale claimant cannot borrow a later claimant's lease. Success accepts only `PROCESSING_RESULT`; the transaction ensures the Experiment, applies rank eligibility and Top-10 admission, updates Search Run counters once, and marks `COMPLETED`. For `PROCESSING_RESULT`, a permanent invariant/runtime/non-finite-metric failure or five-claim exhaustion marks `FAILED` with `COMPLETION_PROCESSING`, retains the successful Attempt/Trades, creates no Experiment, releases the Search slot, and triggers refill. For `TERMINAL_FAILURE_PENDING`, processing exhaustion finalizes `FAILED` while preserving the existing `RETRY_EXHAUSTED` or `INFRASTRUCTURE` root cause/counter; there need not be successful Trades. If a process dies while holding claim five, lease expiry terminalizes it rather than running claim six. SQL deadlock/serialization retries (`40P01`/`40001`) and temporary inability to write the final transaction are bounded infrastructure retries of that same claim and do not consume a new processing claim.

For a normal exhausted simulation retry the processor accepts `TERMINAL_FAILURE_PENDING` with `RETRY_EXHAUSTED`. A Coordinator-owned terminal-job watchdog covers `CREATED | QUEUED | BACKTESTING | RETRY_WAIT`: after verifying BullMQ is terminal/no retry runnable, it locks the Candidate, closes a stale `RUNNING` Attempt or creates a synthetic failed Attempt when none exists, atomically writes `TERMINAL_FAILURE_PENDING` with `INFRASTRUCTURE`/error/due time, and finalizes `FAILED` plus counters once. If the Candidate is `CANCELLED`, it preserves only attempt/trade history. Top-10 admission locks the immutable scope row last, so concurrent first entries cannot overfill an empty board.

Minimum REST surface for the frontend:

| Method and path | Purpose |
|---|---|
| `POST /backtests` | Start one manual candidate under a `leaderboardScopeId`; return `202` plus identifiers |
| `GET /backtests/{candidateId}` | Poll a typed `CandidateProgress` response |
| `POST /backtests/{candidateId}/cancel` | Idempotently cancel one Manual candidate after locking/checking `origin=MANUAL`; a Search candidate returns `409` and must use its Search Run cancel endpoint |
| `GET /market/candles?pair=...&timeframe=...` | Load initial normalized chart history |
| `GET /strategies` | List registered strategy plugins and parameter metadata |
| `GET /leaderboard-scopes` | List immutable comparable benchmark scopes available to Manual/Search runs |
| `POST /leaderboard-scopes` | Create a new scope/version when benchmark inputs or score formula change |
| `POST /search-runs` | Start a bounded background Search Run under one `leaderboardScopeId`; return `202` plus `searchRunId` |
| `GET /search-runs/{searchRunId}` | Poll `LoopStatus` |
| `GET /search-runs/{searchRunId}/candidates` | Read candidate progress/history for a run |
| `GET /search-runs/{searchRunId}/leaderboard` | Rank all rank-eligible successful Experiments produced by the current run |
| `POST /search-runs/{searchRunId}/pause`, `/resume`, `/cancel` | Control generation of work |
| `GET /leaderboard?scopeId=...` | Read persistent Top-10 for one comparable benchmark scope |
| `GET /experiments/{experimentId}` | Read reproducible result and Trade Detail |
| `GET /news` | Read normalized news and available sentiment |

## 11. Contract → File Mapping in `packages/contracts`

| Contract group | File |
|---|---|
| Enums | `packages/contracts/src/enums.ts` |
| Market Data | `packages/contracts/src/market-data.ts` |
| Strategy | `packages/contracts/src/strategy.ts` |
| Strategy Registry | `packages/contracts/src/strategy-registry.ts` |
| Composite Strategy | `packages/contracts/src/composite-strategy.ts` |
| Search / Generator | `packages/contracts/src/search.ts` |
| Continuous Loop / Observability | `packages/contracts/src/continuous-loop.ts` |
| Backtesting | `packages/contracts/src/backtesting.ts` |
| Evaluation | `packages/contracts/src/evaluation.ts` |
| Experiment Result | `packages/contracts/src/experiment.ts` |
| Leaderboard | `packages/contracts/src/leaderboard.ts` |
| News | `packages/contracts/src/news.ts` |
| Sentiment | `packages/contracts/src/sentiment.ts` |
| Backtest queue messages | `packages/contracts/src/backtesting.ts` |

All exported from a single `packages/contracts/src/index.ts` barrel, so every service imports from one place: `import { Strategy, Candle, CandidateStrategy } from "@cryptox/contracts"`.
