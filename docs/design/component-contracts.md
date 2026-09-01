# Cryptox - Component Contracts

## 0. Conventions

- All timestamps are ISO-8601 strings in UTC (`"2026-08-12T09:10:03.000Z"`), never epoch millis on the wire, to avoid unit-mismatch bugs between services written at different times.
- All money/price/percentage values are `number` (float), except where noted; the brief does not require fixed-point precision (this is an architecture exercise, not a real trading system — see brief §47).
- Every contract that can be **generated multiple times with different behavior** (`StrategyDefinition`, `CompositeStrategyDefinition`) carries a `version` field. This is not optional — brief §36 makes versioning + reproducibility a hard requirement: *"Experiment #122 must always know exactly which strategy version it used."*
- **Identity rule (resolves an ambiguity in brief §36's own example):** `id` on any versioned contract (`StrategyDefinition`, `CompositeStrategyDefinition`) is **unique per version, not per logical strategy**. Each definition has a required stable `logicalFamilyKey`; editing parameters, implementation provenance, components, weights, thresholds, or combination method never updates a row in place — it inserts a new row with `version = previous + 1`. A separate optional `familyName` is display-only and never a foreign key. Anything that references a `strategyDefinitionId` or `compositeDefinitionId` is therefore automatically version-pinned and replayable without silently changing underneath it.
- Enums are written as TypeScript string union types so they serialize identically in REST responses, market WebSocket messages, and backtest queue payloads without a mapping layer.
- A contract is owned by the module that defines its business meaning. The code examples below show the intended public API location; they are not instructions to put every domain type in one global package.
- `packages/contracts` is reserved for transport/shared protocol shapes that must cross REST, the market WebSocket, or the BullMQ boundary. Module-owned domain entities and use-case contracts remain inside `modules/<name>/api` or `modules/<name>/domain`.

## 1. Core Enums

```typescript
// Owned by the defining module; transport projections may be re-exported from packages/contracts.

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

Owned by `modules/market-data`. Corresponds to brief §4 (Realtime Market Data) and §35 (Database → Market Data group).

```typescript
// modules/market-data/api/contracts.ts

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
// `modules/market-data` passes this normalized DTO directly to the WebSocket Gateway.
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

**Boundary rule (from `architecture.md` §1.3 and brief §6):** `Candle`, `DatasetSnapshotRef`, `MarketTick`, and `MarketDataConnectionStatus` are the only shapes that leave `market-data`. The raw Binance payload never crosses this boundary — `BinanceAdapter` (and any future `OKXAdapter`) produces the normalized contracts, so `modules/strategy` and the Frontend never depend on an exchange-specific format. Backtest Workers load immutable snapshot candles, never the mutable latest-candle table directly.

## 3. Strategy Engine Contracts

Owned by `modules/strategy`. Corresponds to brief §6-12 (Strategy Engine, MA/RSI/Bollinger/SR examples, Plugin requirement).

```typescript
// modules/strategy/api/contracts.ts

// Neutral strategy input. Market Data and Backtesting adapters map their
// normalized/snapshotted candles into this shape before calling Strategy.
export interface StrategyCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// This is exactly the `context` object referenced in brief §6 ("context can
// contain: price, volume, candles, timeframe, indicators, market state,
// sentiment..."). It is the ONLY input a Strategy implementation may read from.
export interface StrategyContext {
  pair: Pair;
  timeframe: Timeframe;
  candles: StrategyCandle[];    // most recent N candles, N decided by the caller, not by the strategy
  currentPrice: number;
  indicators: Record<string, number | number[]>;
  // pre-computed values, e.g. { "MA20": 118023.4, "RSI14": 42.1 }.
  // Computed once per context by an Indicator layer inside modules/strategy
  // (not by each strategy individually) so that two strategies sharing an
  // indicator (e.g. two MA-based strategies) don't recompute it twice.
  sentiment?: {
    label: SentimentLabel;
    averageScore: number;       // deterministic projection over aligned SentimentResult.score values
  };
}

// The interface every strategy plugin implements — brief §6, verbatim shape.
export interface Strategy {
  readonly name: string;              // e.g. "MA", "RSI", "MACD"
  readonly category: StrategyCategory;
  analyze(context: StrategyContext): Signal;
  // Optional pure projection capability consumed through the public
  // StrategyModule API; it never participates in the trading decision.
  buildVisualization?(contexts: readonly StrategyContext[]): StrategyVisualizationOverlayDraft[];
}

// A concrete, versioned configuration of a Strategy — what actually gets
// stored, referenced by an ExperimentResult, and never overwritten (brief §36).
export interface StrategyDefinition {
  id: string;                    // unique per version — see the Identity rule in §0
  userId: string;                 // owner derived from AuthContext; never trusted from a request body
  logicalFamilyKey: string;      // required stable identity used for version allocation
  familyName?: string;           // display-only label, never a foreign key
  strategyName: string;         // matches Strategy.name, resolved via the Registry
  implementationVersion: string; // plugin code version, independent of parameter/config version
  implementationSha256: string;  // exact retained build artifact used to replay this definition
  version: number;               // incremented on any parameter or implementation provenance change — never mutate in place
  parameters: Record<string, number | string>;
  // e.g. MA: { fastPeriod: 20, slowPeriod: 50 }
  //      RSI: { period: 14, buyThreshold: 30, sellThreshold: 70 }
  createdAt: string;
}
```

**Plugin registration contract** (brief §12, §41 — the scenario this design is intended to support):

```typescript
// modules/strategy/api/strategy-registry.ts

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
  minimumHistoryCandles: number; // integer >= 0; immutable artifact capability
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

export type StrategyVisualizationOverlayDraft =
  | { id: string; kind: "LINE"; label: string; points: Array<{ time: string; value: number }> }
  | { id: string; kind: "ZONE"; label: string; points: Array<{ time: string; low: number; high: number }> }
  | { id: string; kind: "SIGNAL"; label: string; points: Array<{ time: string; value: number; signal: Signal }> };

export type StrategyVisualizationOverlay =
  | (StrategyVisualizationOverlayDraft & { strategyDefinitionId: string });

export interface StrategyModulePublicApi {
  listStrategies(): StrategyPluginDescriptor[];
  readDefinitions(userId: string, ids: string[]): Promise<StrategyDefinition[]>;
  readComposite(userId: string, id: string): Promise<CompositeStrategyDefinition>;
  resolveStrategy(definition: StrategyDefinition): Promise<Strategy>;
  combineSignals(definition: CompositeStrategyDefinition, signals: Array<{ strategyDefinitionId: string; signal: Signal }>): Signal;
  buildVisualization(definition: StrategyDefinition, contexts: StrategyContext[]): StrategyVisualizationOverlay[];
}
```

Adding `MACDStrategy` means: implement `Strategy`, provide a factory plus serializable descriptor/parameter schema and immutable implementation version/hash, and call `register()` once at bootstrap. `GET /strategies` returns descriptors, so the Frontend renders configuration fields without a MACD-specific branch. Creating a `StrategyDefinition` copies the descriptor's implementation provenance. The Registry/Artifact Resolver resolves `(strategyName, implementationSha256)` from retained build artifacts; if one is unavailable, replay returns `IMPLEMENTATION_ARTIFACT_UNAVAILABLE` instead of substituting the latest plugin. Nothing else in this document changes — plugin registration remains independent from the rest of the platform.

### 3.1 AI-assisted Strategy generation

Generation is a direct authenticated Strategy command, not Search candidate
generation. It accepts exactly one source, constrains the model to the live
plugin descriptor catalog, and routes the proposal through the normal
same-owner definition/composite validation before persistence.

```typescript
export type StrategyGenerationSource =
  | { sourceType: "TEXT"; text: string }
  | { sourceType: "URL"; url: string };

export type GeneratedStrategyProposal =
  | { kind: "SINGLE"; strategyName: string; parameters: Record<string, number | string> }
  | { kind: "COMPOSITE"; method: CombinationMethod; components: Array<{ strategyName: string; parameters: Record<string, number | string>; weight: number }>; thresholds?: { buy: number; sell: number } };

export interface StrategyGenerationAdapter {
  generate(input: {
    sourceText: string;
    strategies: readonly StrategyPluginDescriptor[];
    promptVersion: string;
  }): Promise<GeneratedStrategyProposal>;
}

export interface StrategySourceLoader {
  load(url: string): Promise<{ sourceText: string; canonicalUrl: string }>;
}

export interface StrategyGenerationResult {
  generationId: string;
  kind: "SINGLE" | "COMPOSITE";
  strategyDefinition?: StrategyDefinition;
  compositeStrategyDefinition?: CompositeStrategyDefinition;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
}
```

`StrategyGenerationAdapter` is tool-free and provider-neutral. A URL loader
allows only public HTTP(S), bounded redirects, response bytes, extracted text,
and timeout; it must reject private destinations and unsafe content. Model
output is untrusted data and is never executed. The Strategy generation unit
of work commits newly-created definitions/components and the successful audit
row together; failed source/model/schema/plugin/parameter validation leaves no
partial rows.

## 4. Composite Strategy Contracts

Owned by `modules/strategy`. Corresponds to brief §13-14 (Composite Strategy, Weighted Combination).

```typescript
// modules/strategy/api/composite.ts

export interface CompositeStrategyDefinition {
  id: string;
  userId: string;                 // must match every component StrategyDefinition
  logicalFamilyKey: string;       // required stable identity used for version allocation
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

## 5. Search Module Contracts

Owned by `modules/search`. Search owns Search Runs, generators, stop conditions, and slot orchestration. Candidate lifecycle, Candidate persistence, and Candidate projections are owned by `modules/backtesting` and are consumed through its public API. This section covers the Search-owned part of the boundary.

```typescript
// modules/search/api/contracts.ts

export interface SearchStrategyDefinition extends StrategyDefinition {
  category?: StrategyCategory;
  parameterDescriptors?: readonly StrategyParameterDescriptor[];
}

export interface CandidateLineage {
  parentFingerprints: string[];
  crossoverPoint: number;
  mutatedParameterKeys: string[];
  selectionMutation?: { replacedStrategyId?: string; replacementStrategyId?: string };
}

export interface GeneratedCandidate {
  strategyDefinitions: SearchStrategyDefinition[]; // complete immutable versions referenced below
  compositeDefinition: CompositeStrategyDefinition;
  executionPolicyIntent: {
    mode: "TWO_SIDED_ONE_X_V1";
    stopLossPercent?: number;
    takeProfitPercent?: number;
  };
  generatedBy: GeneratorType;
  fingerprint: string;
  lineage?: CandidateLineage;
}

export interface GeneratorContext {
  searchRunId: string;
  iterationNumber: number;
}

export interface StrategyGenerator {
  readonly type: GeneratorType;
  generate(searchSpace: SearchSpaceConfig, context?: GeneratorContext): GeneratedCandidate;
}

// What the generator is allowed to pick from — the pool of available
// StrategyDefinitions grouped by category, used directly by the
// Domain-guided Generator's rule ("1 Trend + 1 Momentum + 1 Structure", brief §17).
export interface SearchSpaceConfig {
  availableStrategies: SearchStrategyDefinition[];
  domainRules?: {
    requiredCategories?: StrategyCategory[];
    allowedCategories?: StrategyCategory[];
    forbiddenCategories?: StrategyCategory[];
  };
  maxComponents?: number;
  generatedFingerprints?: string[];
}

// Brief §23: "The group must design a Stop Condition. Do not run
// while(true) uncontrolled." This is that contract, owned by modules/search.
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

`GeneratedCandidate` is a Search-owned immutable generation result, not permission for Search or Backtesting to import Strategy domain internals. Search maps it into the Backtesting-owned `SubmitSearchCandidateCommand`; the Strategy module supplies/validates the definitions through its public API, and the Backtesting Coordinator persists and verifies the neutral command before creating a Candidate.

`noImprovementAfterIterations` means no **strict increase** in the current best rank-eligible score after the configured number of completed non-cancelled Search candidates; ties are not improvements. Before the first rank-eligible score exists, the baseline is `none`; the first rank-eligible score establishes the baseline and resets the no-improvement count. Stop conditions are evaluated at every serialized `fillAvailableSlots` boundary. At one boundary, normal conditions use the deterministic order `MAX_DURATION`, then `MAX_CANDIDATES`, then `NO_IMPROVEMENT`; an accepted user cancellation wins over those normal conditions. `maxCandidates` counts every committed candidate reservation and cancellation does not restore budget. `maxDurationSeconds` counts active `RUNNING` wall-clock time and excludes `CREATED` and `PAUSED` time.

### 5.1 Search Loop Orchestrator — Observability Contract

Owned by `modules/search`. This formalizes brief §32.7 (Observability) and §24. The Backend owns the long-running loop; the Frontend polls a REST read model and may disconnect without stopping the run.

```typescript
// modules/search/api/loop.ts

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
  lastError?: string;
}

export interface ContinuousLoopOrchestrator {
  start(auth: AuthContext, config: {
    searchSpace: SearchSpaceConfig;
    stopCondition: StopCondition;
    generatorType: GeneratorType;
    leaderboardScopeId: string;
    maxInFlight: number;
  }): Promise<{ searchRunId: string }>;
  pause(auth: AuthContext, searchRunId: string): Promise<void>;
  resume(auth: AuthContext, searchRunId: string): Promise<void>;
  cancel(auth: AuthContext, searchRunId: string): Promise<void>;
  status(auth: AuthContext, searchRunId: string): Promise<LoopStatus>;
  onCandidateFinished(searchRunId: string): Promise<void>; // internal callback; delegates to reconcile/fill
  fillAvailableSlots(searchRunId: string): Promise<void>;  // serialized, idempotent recovery use case
}
```

**Persistence rule:** Strategy's owner-aware public API persists/verifies every generated `StrategyDefinition`, `CompositeStrategyDefinition`, and component row first. The Backtesting Coordinator then reloads the committed same-owner IDs and atomically persists only its Candidate plus immutable references/execution snapshot. Each owner API is idempotent and rejects conflicting content. Therefore no Candidate can reference an in-memory-only definition.

`FAILED` with `stopReason = ERROR` is reserved for an unrecoverable Search orchestration/configuration failure. It stops new candidate generation and records the error, but does not silently rewrite already committed Candidate lifecycles; those Candidates continue through Backtesting reconciliation and may finish for audit/Experiment purposes. `CANCELLED` remains the explicit user-stop path.

**Boundary rule:** `LoopStatus` is a read-only projection from `search_runs`, `candidate_strategies`, `backtest_attempts`, and Experiment ranking data. `GET /search-runs/{id}` returns it. `candidatesTested` means non-cancelled Candidates whose pipeline reached terminal `COMPLETED` or `FAILED` (an attempted candidate, not necessarily a successful simulation). `failedCandidateCount` counts every terminal `FAILED` Candidate; the retry-exhausted, infrastructure-failure, and completion-processing counters partition it. `failedAttemptCount` counts all failed Attempt rows, including a synthetic failure audit row. Average duration uses completed Attempts only. Pause stops generation/enqueue of new candidates but lets claimed jobs finish.

`currentTopEntry` is a read-only ranking DTO supplied by the Leaderboard public API; Search does not import Leaderboard domain or persistence internals.

`activeCandidates` contains every non-terminal Candidate. `queuedCount` counts `CREATED | QUEUED`; `runningCount` counts `BACKTESTING | RETRY_WAIT | PROCESSING_RESULT | TERMINAL_FAILURE_PENDING`. All six states occupy an in-flight slot until a Candidate becomes `COMPLETED | FAILED | CANCELLED`.

`fillAvailableSlots` locks the Search Run row (or holds an equivalent per-run lease), obtains Candidate counts/projections through the Backtesting public API, checks every stop condition, and submits at most the missing number of iterations through `BacktestCoordinator.submitSearchCandidate`. Search never queries Candidate tables or repositories directly. Once a normal stop condition is met it creates no more candidates; after the last in-flight Candidate becomes terminal it marks the run `COMPLETED`, sets `stopReason`/`endedAt`, and returns. It is invoked after `start`, `resume`, every completion callback, and at backend startup/periodically for every `RUNNING` run. This makes the callback an optimization rather than a single point of progress and prevents concurrent completions from exceeding `maxInFlight` or `maxCandidates`.

`cancel(searchRunId)` locks the Search Run and, through the Backtesting public API, asks Backtesting to cancel all non-terminal Candidates for that run and clear their active-attempt/completion-retry fields. The Search Run transition and Candidate cancellation participate in one process-level application unit of work; the unit of work is an opaque transaction port, never a database handle exposed across the boundary. Search never queries or writes Candidate tables and never imports `modules/backtesting/infrastructure/queue`. After commit, Search Loop calls `BacktestCoordinator.removePendingJobs(candidateIds)`; the Coordinator best-effort removes waiting/delayed jobs only. Running workers may finish their current simulation. A late worker may finish its own Attempt as `COMPLETED` and persist Trades for audit, but fenced/conditional state writes and the Completion Processor never change the Candidate back or create an Experiment/rank. Manual cancellation verifies `origin = MANUAL` and owns one short Candidate transaction; it does not use the Search cancellation UoW.

An unrecoverable Search orchestration/configuration error transitions a `RUNNING` or `PAUSED` Search Run immediately to terminal `FAILED` with `stopReason = ERROR`, `lastError`, and `endedAt`. It stops generation but does not rewrite committed Candidates; their Backtesting lifecycles may still finish for audit/Experiment purposes. Completion callbacks may update counters and projections for a failed run, but can never change `FAILED` to `COMPLETED`; `resume` rejects a failed run and `cancel` is an idempotent no-op after the error is recorded. User cancellation wins only when its transaction acquires the Search Run lock before the error transition.

## 6. Backtesting Contracts

Owned by `modules/backtesting` and composed into `apps/backtest-worker`, per `project-structure.md`. Corresponds to brief §19-20.

### 6.1 Candidate lifecycle and progress projection

`modules/backtesting` owns the Candidate aggregate, lifecycle state, persistence, and the public `CandidateProgress` projection. Search creates Search-owned metadata and submits it through `BacktestCoordinator`; it does not define or persist a second Candidate model. `LoopStatus.activeCandidates` embeds the Backtesting projection for Search observability.

```typescript
// modules/backtesting/api/candidate.ts

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

export type BacktestFailureCode =
  | "INVALID_REQUEST" | "INVALID_CURSOR" | "NOT_FOUND" | "WRONG_ORIGIN"
  | "SCOPE_SNAPSHOT_CONTENT_CHANGED" | "MISSING_SNAPSHOT" | "SNAPSHOT_INCOMPLETE"
  | "IMPLEMENTATION_ARTIFACT_UNAVAILABLE" | "WORKER_RUNTIME_MISMATCH"
  | "WORKER_CRASH" | "QUEUE_ANOMALY" | "STRATEGY_TIMEOUT"
  | "STRATEGY_EXECUTION_ERROR" | "RETRY_EXHAUSTED" | "EVALUATOR_EXCEPTION"
  | "INVALID_EVALUATOR_OUTPUT" | "CANCELLED_AUDIT_INTERRUPTED" | "SUPERSEDED";

interface CandidateBase {
  id: string;
  leaderboardScopeId: string;          // immutable benchmark used for fair scoring/ranking
  compositeDefinitionId: string;
  selectionMode: "SINGLE" | "COMPOSITE";
  executionPolicy: ExecutionPolicySnapshot;
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
  fingerprint: string;
  lineage?: CandidateLineage;
}

export type CandidateStrategy = ManualCandidateStrategy | SearchCandidateStrategy;

export interface BacktestAttemptProgress {
  attemptId: string;
  attemptNumber: number;
  status: "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: string;
  completedAt?: string;
  failureCategory?: "RETRYABLE" | "INFRASTRUCTURE" | "CANCELLED_AUDIT";
  failureCode?: BacktestFailureCode;
  errorMessage?: string;
}

// REST projection used by GET /backtests/{candidateId} and inside LoopStatus.
// It intentionally omits the large Composite definition and Trade list.
export interface CandidateProgress {
  candidateId: string;
  origin: "MANUAL" | "SEARCH";
  selectionMode: "SINGLE" | "COMPOSITE";
  searchRunId?: string;
  iterationNumber?: number;
  generatedBy?: GeneratorType;
  fingerprint?: string;
  lineage?: CandidateLineage;
  leaderboardScopeId: string;
  executionPolicy: ExecutionPolicySnapshot;
  status: CandidateStatus;
  attempts: BacktestAttemptProgress[];
  maxAttempts: number;
  activeAttemptNumber?: number;
  completionAttemptCount: number;
  completionMaxAttempts: number;
  completionNextRetryAt?: string;
  experimentResultId?: string;
  failureKind?: "RETRY_EXHAUSTED" | "INFRASTRUCTURE" | "COMPLETION_PROCESSING";
  failureCode?: BacktestFailureCode;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}
```

Composite definitions are immutable versioned snapshots. A new version is required when the component set, component order, weight, combination method, threshold, or any referenced Strategy Definition changes. Application validation requires at least one component; `WEIGHTED_SCORE` requires finite weights whose sum is `1` and finite thresholds with `buy > sell`; `MAJORITY_VOTE` ignores weights and thresholds after normalizing them to documented defaults.

**Queue rule:** BullMQ is a competing-consumer work queue, not broadcast pub/sub. One worker normally claims a job, but stalled-job recovery can briefly overlap deliveries; `activeAttemptNumber` therefore fences every final write. On a normal return/throw path, the worker atomically persists the Attempt outcome, Trades if any, and conditional Candidate pending state first. A crash/lock-loss path that bypasses this write is repaired by the Coordinator-owned terminal watchdog. The terminal queue signal is small and never carries Trades. Retry/backoff are BullMQ transport metadata, while attempt history remains queryable in PostgreSQL.

The canonical serialized queue schema is under `packages/contracts/queue`. The Backtesting `api` layer exposes in-process commands/facades; `modules/backtesting/infrastructure/queue` maps those commands to BullMQ and maps native queue observations back to the canonical wire types. The two shapes must not be maintained as unrelated competing schemas.

Queue payloads use an explicit `schemaVersion` discriminator. Version `1` is the current MVP schema; additive changes require a compatible version policy and a runtime validator in the adapter, while breaking changes require a new version and an overlap period in which the worker and producer support both versions. Unknown or malformed versions are rejected and left for reconciliation; they are never guessed or silently coerced.

```typescript
// modules/backtesting/api/contracts.ts

export interface BacktestRequest {
  candidateId: string;               // references CandidateStrategy.id
  leaderboardScopeId: string;        // worker reloads immutable pair/timeframe/dataset/cost settings from this scope
}

// packages/contracts/queue/backtesting.ts — canonical cross-process wire schema
export interface BacktestQueueJob {
  schemaVersion: 1;
  candidateId: string;
  leaderboardScopeId: string;
  jobId: string;       // deterministic: jobId === candidateId
  maxAttempts: number; // same immutable value is configured in BullMQ attempts and persisted on Candidate
  simulatorVersion: string; // copied from immutable scope; worker resolves this retained artifact
  simulatorSha256: string;
  enqueuedAt: string;
}

export interface StartManualBacktestCommand {
  leaderboardScopeId: string;
  strategyDefinitionIds: string[];
  compositeDefinitionId: string;
  executionPolicy: ExecutionPolicyInput;
  maxAttempts: number;
}

export interface CreateSentimentSnapshotCommand {
  relatedCoin: string;
  range: { from: string; to: string };
  aggregationWindowSeconds: number;
  modelName: string;
  modelVersion: string;
  modelSha256: string;
}

export interface CreateBenchmarkScopeRequest {
  name: string;
  pair: Pair;
  timeframe: Timeframe;
  tradeRange: { from: string; to: string };
  warmupCapacityCandles?: number;
  initialCapital: number;
  feeRatePercent: number;
  slippageBps?: number;
  scoreFormulaId: string;
  sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
  sentimentCreate?: CreateSentimentSnapshotCommand;
}

export type BenchmarkScopeSummary = Omit<LeaderboardScope, "userId"> & {
  pair: Pair;
  timeframe: Timeframe;
  snapshotRange: { from: string; to: string };
  datasetSnapshotId: string;
  datasetSnapshotSha256: string;
};

export interface ExecutionPolicyInput {
  policyId?: "TWO_SIDED_ONE_X_V1";
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

export interface ExecutionPolicySnapshot {
  policyId: "TWO_SIDED_ONE_X_V1";
  positionPolicyId: "TWO_SIDED_ONE_X_V1";
  sizingPolicyId: "FULL_CURRENT_EQUITY_FEE_AWARE_V1";
  fillPolicyId: "NEXT_OPEN_OHLC_STOP_FIRST_V2";
  oppositeSignalPolicyId: "CLOSE_AND_REVERSE_NEXT_OPEN_V1";
  stopLossPercent?: number;
  takeProfitPercent?: number;
  warmupCandles: number;
  sha256: string;
}

// Backtesting-owned neutral submission command. Search maps its
// `GeneratedCandidate` into this DTO; Backtesting does not import Search API.
export interface SubmitSearchCandidateCommand {
  searchRunId: string;
  leaderboardScopeId: string;
  iterationNumber: number;
  maxAttempts: number;
  strategyDefinitionIds: string[];
  compositeDefinitionId: string;
  executionPolicy: ExecutionPolicySnapshot;
  generatedBy: GeneratorType;
  fingerprint: string;
  lineage?: CandidateLineage;
}

export interface BacktestSubmissionAccepted {
  candidateId: string;
  jobId: string;
  status: "CREATED" | "QUEUED";
}

// Opaque process-level unit of work used when Search coordinates its own
// SearchRun transition with Backtesting Candidate cancellation. It is not a
// database client and cannot be used to open a second transaction.
export interface CancellationUnitOfWork {
  readonly kind: "SEARCH_CANCELLATION";
  readonly id: string;
  query<Row>(text: string, values: unknown[]): Promise<{ rows: Row[] }>;
  run<T>(operation: () => Promise<T>): Promise<T>;
  onRollback(operation: () => Promise<void>): void;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

export interface AuthContext { userId: string }

// The protected application gateway into the asynchronous backtest boundary.
export interface BacktestCoordinator {
  createBenchmarkScope(auth: AuthContext, request: CreateBenchmarkScopeRequest, options: { scopeIdempotencyKey: string }): Promise<BenchmarkScopeSummary>;
  startManual(auth: AuthContext, command: StartManualBacktestCommand, options?: { submissionIdempotencyKey?: string }): Promise<BacktestSubmissionAccepted>;
  submitSearchCandidate(auth: AuthContext, command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
  status(auth: AuthContext, candidateId: string): Promise<CandidateProgress>;
  summarizeSearchCandidates(auth: AuthContext, searchRunId: string): Promise<{
    active: CandidateProgress[];
    queuedCount: number;
    runningCount: number;
    candidatesTested: number;
  }>;
  cancelSearchCandidates(auth: AuthContext, searchRunId: string, unitOfWork: CancellationUnitOfWork): Promise<{ candidateIds: string[] }>;
  cancelManualCandidate(auth: AuthContext, candidateId: string): Promise<void>; // short Candidate transaction; cross-owner is concealed 404
}

export interface BacktestInternalApi {
  removePendingJobs(candidateIds: string[]): Promise<void>;  // internal, best-effort; waiting/delayed jobs only
}

export interface BacktestCompletionProcessor {
  process(signal: BacktestQueueTerminalSignal): Promise<void>;
  reconcileCandidate(candidateId: string): Promise<void>;
  reconcileDueCandidates(limit: number): Promise<number>;
}

export interface Trade {
  id: string;
  sequence: number;
  pair: Pair;
  settlementAsset: string;
  backtestAttemptId: string;
  signal: "LONG" | "SHORT";
  entryTime: string;
  marketEntryPrice: number;
  entryPrice: number;
  stopLoss: number | null;        // entry-time trigger price; null for legacy/no-risk trades
  takeProfit: number | null;      // entry-time trigger price; null for legacy/no-risk trades
  exitTime: string;
  marketExitPrice: number;
  exitPrice: number;
  exitReason: "STOP_LOSS" | "TAKE_PROFIT" | "STRATEGY_CLOSE" | "RANGE_END";
  quantity: number;
  notionalEntryValue: number;
  equityBeforeTrade: number;
  equityAfterTrade: number;
  grossProfit: number;
  feeAmount: number;
  slippageBps: number;
  slippageAmount: number;
  profit: number;
  resultPercent: number;
  result: "WIN" | "LOSS" | "BREAKEVEN";
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

// Independent serialized return shape. The Backtesting adapter maps this
// wire type to its in-process `BacktestWorkerReturn`.
export type BacktestQueueReturn =
  | {
      status: "COMPLETED";
      candidateId: string;
      attemptId: string;
      completedAt: string;
    }
  | {
      status: "IGNORED";
      candidateId: string;
      reason: "CANCELLED" | "SUPERSEDED" | "ALREADY_TERMINAL" | "PENDING_COMPLETION";
    };

// packages/contracts/queue/backtesting.ts — canonical terminal wire schema
// What the thin queue adapter receives/forwards from native BullMQ QueueEvents.
// It performs no domain database lookup; even an IGNORED return is forwarded
// and becomes a PostgreSQL-backed no-op in the Completion Processor.
export type BacktestQueueTerminalSignal =
  | {
      schemaVersion: 1;
      jobId: string;
      status: "COMPLETED";
      returnValue: BacktestQueueReturn;
  }
  | {
      schemaVersion: 1;
      jobId: string;
      status: "RETRIES_EXHAUSTED";
      attemptsMade: number;
  }
  | {
      schemaVersion: 1;
      jobId: string;
      status: "VERIFIED_TERMINAL_FAILED"; // backtesting queue adapter confirmed current BullMQ state=failed and no retry can run
      failedReason: string;
    };

```

The Completion Processor consumes `BacktestQueueTerminalSignal` directly, derives `candidateId = jobId`, reloads the authoritative Attempt/Candidate state, and performs its own internal normalization. There is intentionally no second exported `BacktestCompletionNotification` contract that could diverge from the canonical queue signal.

## 7. Evaluation Contracts

Owned by `modules/evaluation`. Corresponds to brief §20-21 — the explicit requirement that *"Strategy Evaluation must be separate from Strategy Implementation."*

```typescript
// modules/evaluation/api/contracts.ts

export interface EvaluationMetrics {
  candidateId: string;
  evaluationPolicyId: "MVP_EVALUATION_V1";
  evaluationRuntimeVersion: string;
  evaluationRuntimeSha256: string;
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
// modules/backtesting/api/experiment.ts

interface ExperimentResultBase {
  id: string;                              // this is "Experiment #122"
  candidateId: string;                     // -> CandidateStrategy.id
  backtestAttemptId: string;               // exact successful attempt that produced the trades
  compositeDefinitionId: string;           // -> CompositeStrategyDefinition.id (version-pinned, see §0 Identity rule)
  leaderboardScopeId: string;              // exact immutable benchmark used by this run
  scoreFormulaId: string;                  // exact immutable formula version used for scoring
  workerRuntimeVersion: string;            // operational worker deployment audit
  workerRuntimeSha256: string;
  simulatorVersion: string;                // pure execution semantics, pinned by scope
  simulatorSha256: string;
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

Owned by `modules/backtesting` for the MVP aggregate. The Completion Processor loads immutable Trades, calls pure Evaluation and pure Leaderboard scoring outside the final write transaction, then opens one short fenced transaction to ensure the Experiment, apply Top-10 admission/Search terminal facts, and terminalize the Candidate. The `experiment_results` row is the persistence record; internal aggregate hydration may include child Trades, but the public REST summary is bounded and Trade Detail is paginated separately. This is the row `LeaderboardEntry` references and the fixed chain used to answer brief §40.8: *experiment → composite version → component strategy versions*.

## 8. Leaderboard Contracts

Owned by `modules/leaderboard`. Corresponds to brief §21-22.

```typescript
// modules/leaderboard/api/contracts.ts

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
// simulator/Evaluation hash creates another version/scope instead of rewriting history.
export interface LeaderboardScope {
  id: string;
  userId: string;
  name: string;
  version: number;
  datasetSnapshot: DatasetSnapshotRef;
  pairMetadata: MarketPairMetadata;
  tradeRange: { from: string; to: string };
  warmupCapacityCandles: number;
  sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef;
  simulatorVersion: string;
  simulatorSha256: string;
  evaluationRuntimeVersion: string;
  evaluationRuntimeSha256: string;
  evaluationPolicyId: string;
  decimalPolicyId: string;
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

// Opaque process-level transaction supplied by the Backtesting Completion
// Processor. It is not a database client and cannot be used to open another
// transaction.
export interface CompletionUnitOfWork {
  readonly kind: "BACKTEST_COMPLETION";
}

export interface LeaderboardService {
  score(leaderboardScopeId: string, metrics: EvaluationMetrics): ScoredEvaluation;
  topK(userId: string, leaderboardScopeId: string): Promise<LeaderboardEntry[]>;
  rankSearchRun(userId: string, searchRunId: string): Promise<SearchRunRankingEntry[]>;
  submit(experiment: ExperimentResult, unitOfWork: CompletionUnitOfWork): LeaderboardSubmissionResult;
}

export interface LeaderboardSubmissionResult {
  admitted: boolean;
  entry?: LeaderboardEntry;
  evictedExperimentResultId?: string;
}
```

`score()` is a pure policy call. `submit()` is a persistence policy invoked inside the Completion Processor's existing PostgreSQL transaction; it must use the caller's unit of work and must not open a separate transaction. The Completion Processor inserts/verifies the Experiment before calling `submit()`, and `submit()` reloads/verifies the immutable scope/formula and finite score rather than trusting a caller payload. This keeps Experiment insertion, Candidate completion, Search counters, and Top-10 admission atomic.

The assignment defines Top-K scoring but does not prescribe leaderboard lifetime. This design therefore makes that choice explicit:

- Every non-cancelled Candidate whose backtest/evaluation pipeline succeeds creates one permanent `ExperimentResult`, including its computed score. A zero-trade success is retained with `overallScore = 0` and `rankEligible = false` for audit.
- `GET /search-runs/{id}/leaderboard` is a **run-scoped ranking** of every rank-eligible successful Experiment from that Search Run. It remains queryable after the run ends, but it is not the canonical cross-run leaderboard.
- `GET /leaderboard?scopeId=...` is a **persistent Top-10 per immutable benchmark scope**, shared across Manual and Search runs. `K = 10` is a fixed MVP application constant, not user-configurable. `submit()` creates an entry only when there is an empty slot or the Experiment beats current #10. A displaced entry is retained as inactive history; an Experiment that never qualified remains queryable but has no `leaderboard_entries` row.
- The default MVP formula is `riskScore = clamp(50 + 10 × sharpeRatio − maxDrawdownPercent, 0, 100)` followed by `score = wReturn × totalReturnPercent + wWinRate × winRatePercent + wRisk × riskScore`. `maxDrawdownPercent` is a non-negative loss magnitude (for example `18`, not `-18`); the UI may display it as `−18%`. Formula rows are versioned and the three weights must sum to `1`.
- `score()` overrides the formula with `overallScore = 0`, `rankEligible = false`, and `rankExclusionReason = NO_TRADES` when `numberOfTrades = 0`. `submit()` and both ranking queries exclude such an Experiment, while Experiment History still shows it. All scored values must be finite.

## 9. News & Sentiment Contracts

Owned by `modules/news` and `modules/sentiment` respectively — kept in two files intentionally, since brief §28/§44 requires these to never depend on each other's internals.

```typescript
// modules/news/api/contracts.ts

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
// modules/sentiment/api/contracts.ts

export interface SentimentResult {
  newsId: string;         // -> NewsItem.id
  label: SentimentLabel;
  score: number;           // e.g. 0.82, per brief §29's example
  modelName: string;
  modelVersion: string;
  analyzedAt: string;
}

// Neutral input owned by Sentiment's public API. It avoids importing the
// News module's NewsItem domain type while preserving the provenance needed
// for persistence and reproducible replay.
export interface SentimentInput {
  newsId: string;
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedCoins: string[];
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

export interface SentimentSnapshotPoint {
  timestamp: string;             // end of an aggregation window
  label: SentimentLabel;
  averageScore: number;          // normalized to [-1, 1]
}

export interface SentimentSnapshotReader {
  readAt(snapshotId: string, candleCloseTime: string): SentimentSnapshotPoint | undefined;
}

export interface SentimentAnalysisService {
  // Rejects/throws on timeout or inference failure. The News workflow catches
  // it and emits logs/metrics; Sentiment persists no result for that attempt.
  analyze(input: SentimentInput): Promise<SentimentResult>;
}
```

Snapshot alignment is deterministic: `dataset_from` is inclusive and `dataset_to` is exclusive; each point timestamp is the inclusive end of its aggregation window. `readAt(candleCloseTime)` selects the point whose window contains that candle close, never a future point. There is no carry-forward across a missing window: a missing point yields `undefined`, and an `INFORMATION` Candidate is rejected unless its pinned snapshot provides a point for every required candle window. Snapshot `relatedCoin` uses the canonical base asset symbol (`BTC` for `BTCUSDT`), and all provider scores are normalized to `[-1, 1]` before aggregation. `StrategyContext.sentiment.averageScore` is the caller-owned projection of the aligned point(s); `SentimentResult.score` remains the per-news-item inference score.

**Boundary rule:** News owns `NewsItem` and its persistence; Sentiment owns `SentimentInput`, `SentimentResult`, result persistence, and sealed sentiment snapshots. News may orchestrate the call and compose a response, but Sentiment never imports the News domain model. A timeout or inference failure leaves the News item readable with missing sentiment.

**Why `NewsSentimentStrategy` still fits the `Strategy` interface (brief §30):** it is just another `Strategy` implementation whose `analyze()` reads `context.sentiment` (see §3 above) instead of `context.indicators`. Live analysis receives the current aggregate; a backtest receives the time-aligned value from the scope's sealed `SentimentDatasetSnapshotRef`. A Candidate containing any `INFORMATION` plugin is rejected unless its scope pins a sentiment snapshot covering the candle range. No change to `Strategy`, `StrategyRegistry`, or the Combination Engine is required when the model changes; a new model creates new results/snapshot IDs rather than changing old Experiments.

## 10. Transport Boundaries

There is no generic `EventEnvelope`, `EventPayloads`, or Event Bus contract. The assignment's event list is optional; this architecture chooses simpler direct collaboration except for the backtest workload.

All rows in the REST surface that represent user-created data are protected by
Bearer authentication. Backend verifies the JWT once and creates
`AuthContext { userId }`; it passes that context as the first argument to
Strategy, Backtesting, Search, and Leaderboard APIs. Body/query owner fields are
ignored or rejected. Foreign aggregate and derived-resource IDs resolve to
404, while same-owner composition violations resolve to validation errors.

`POST /strategy-generations` accepts either
`{ sourceType: "TEXT", text }` or `{ sourceType: "URL", url }`, never both.
The endpoint is synchronous and returns `generationId`, `SINGLE`/`COMPOSITE`,
the persisted definition, and model/prompt provenance. Invalid input, unsafe
URL loading, model/schema errors, unknown plugins, and Strategy validation
failures produce no partial definition or audit writes.

| Boundary | Contract | Rule |
|---|---|---|
| Frontend commands/queries | REST DTOs composed from the contracts above | Starting asynchronous work returns `202 Accepted` plus `candidateId`/`jobId` or `searchRunId` |
| Market realtime | `MarketTick`, `Candle`, `MarketDataConnectionStatus` | WebSocket only; messages are normalized before leaving Market Data |
| Backtest dispatch | `BacktestQueueJob` | Durable BullMQ work queue; one worker per job |
| Backtest terminal signal | `BacktestQueueTerminalSignal` | `completed`, `retries-exhausted`, or verified terminal `failed` wake-up; Completion Processor reloads state and is idempotent |

**Terminal-event mapping:** the thin adapter forwards every native `completed(jobId, returnvalue)`, including typed `IGNORED` outcomes, and native `retries-exhausted(jobId, attemptsMade)`. At its transport edge it JSON-parses/schema-validates BullMQ's string `returnvalue` and parses/validates the string `attemptsMade` as a positive integer; malformed fields are logged and left for PostgreSQL/BullMQ reconciliation instead of guessed. Every native `failed` is only an untrusted observation: `VERIFIED_TERMINAL_FAILED` is emitted only after the Backtesting queue adapter confirms that the job's current BullMQ state is `failed` and no retry can run. `retries-exhausted` and a verified `failed` observation may both wake the processor for one job; idempotency makes the duplicate harmless. Failure detail in PostgreSQL is authoritative; transport fields are hints/wake-ups. `IGNORED` never drives a state transition from its payload: the processor reloads PostgreSQL and either processes a durable pending state or no-ops.

**Worker fencing:** under the Candidate lock, each runnable delivery closes any abandoned `RUNNING` Attempt, checks `maxAttempts`, allocates the next attempt number, and sets it as `activeAttemptNumber`. Attempt completion succeeds only when both the Attempt is still `RUNNING` and the Candidate still has that active number in `BACKTESTING`; otherwise a superseded worker is fenced out and returns `IGNORED/SUPERSEDED` (a lost BullMQ lock may discard that return; reconciliation remains sufficient). `CANCELLED` is a special audit-only branch: a worker may finish its own still-running Attempt as `COMPLETED` and store Trades under the lock, but never changes Candidate state, then returns `IGNORED/CANCELLED`. Those audit Trades are excluded from Experiment/ranking. A last normal processor failure atomically sets `TERMINAL_FAILURE_PENDING` with `failureKind = RETRY_EXHAUSTED`; if stalled/redelivery handling finds the attempt budget already spent, it allocates no Attempt, sets the pending state with `failureKind = INFRASTRUCTURE`, and returns `IGNORED/PENDING_COMPLETION` rather than requesting another retry. Both pending writes include `lastError` and make completion immediately due. Already terminal Candidates return `IGNORED/ALREADY_TERMINAL`; existing pending Candidates return `IGNORED/PENDING_COMPLETION`.

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
| `POST /strategy-generations` | Authenticated synchronous generation from exactly one text or public URL source; returns a validated single/composite definition and provenance |
| `GET /leaderboard-scopes` | List immutable comparable benchmark scopes available to Manual/Search runs |
| `POST /leaderboard-scopes` | Create a new scope/version when benchmark inputs or score formula change |
| `POST /search-runs` | Start a bounded background Search Run under one `leaderboardScopeId`; return `202` plus `searchRunId` |
| `GET /search-runs/{searchRunId}` | Poll `LoopStatus` |
| `GET /search-runs/{searchRunId}/candidates` | Read candidate progress/history for a run |
| `GET /search-runs/{searchRunId}/leaderboard` | Rank all rank-eligible successful Experiments produced by the current run |
| `POST /search-runs/{searchRunId}/pause`, `/resume`, `/cancel` | Control generation of work |
| `GET /leaderboard?scopeId=...` | Read persistent Top-10 for one comparable benchmark scope |
| `GET /experiments/{experimentId}` | Read bounded reproducible summary/metrics/provenance |
| `GET /experiments/{experimentId}/trades` | Read owner-scoped paginated Trade Detail with total count |
| `GET /experiments/{experimentId}/visualization` | Read exact sealed OHLCV, generic overlays, and Trade-linked markers |
| `GET /news` | Read normalized news and available sentiment |

## 11. Contract Ownership and Transport Mapping

Business contracts belong to the module that owns the behavior. Only shapes that cross a process or public transport boundary are candidates for `packages/contracts`.

| Contract group | Business owner | Transport/shared location when needed |
|---|---|---|
| Market data normalization and snapshot references | `modules/market-data` | `packages/contracts/websocket/market-data.ts` for market WebSocket messages |
| Strategy, Registry, Composite | `modules/strategy` | Public module API; REST DTO projections may be shared under `packages/contracts/rest/` |
| Search, Generator, Loop status | `modules/search` | REST DTO projections under `packages/contracts/rest/` |
| Candidates, Attempts, Trades, Experiment Result | `modules/backtesting` | Queue messages under `packages/contracts/queue/backtesting.ts`; REST DTO projections under `packages/contracts/rest/` |
| Evaluation metrics | `modules/evaluation` | REST DTO projection only when exposed externally |
| Score formulas and Leaderboard entries | `modules/leaderboard` | REST DTO projection only when exposed externally |
| News items and provider ports | `modules/news` | REST DTO projection only when exposed externally |
| Sentiment results and snapshots | `modules/sentiment` | REST DTO projection only when exposed externally |
| Cross-boundary primitives/enums | Owning module where the meaning is defined | Re-export only the minimal serialized form needed by REST, WebSocket, or queue protocols |

There is no single global barrel for all domain contracts. Consumers import a module's public entrypoint, for example `import { BacktestCoordinator } from "@cryptox/backtesting"` or `import { Strategy } from "@cryptox/strategy"`; deployable processes import transport contracts only where a process boundary requires them.
