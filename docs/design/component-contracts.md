# Cryptox - Component Contracts

## 0. Conventions

- All timestamps are ISO-8601 strings in UTC (`"2026-08-12T09:10:03.000Z"`), never epoch millis on the wire, to avoid unit-mismatch bugs between services written at different times.
- All money/price/percentage values are `number` (float), except where noted; the brief does not require fixed-point precision (this is an architecture exercise, not a real trading system — see brief §47).
- Every contract that can be **generated multiple times with different behavior** (`StrategyDefinition`, `CompositeStrategyDefinition`) carries a `version` field. This is not optional — brief §36 makes versioning + reproducibility a hard requirement: *"Experiment #122 must always know exactly which strategy version it used."*
- **Identity rule (resolves an ambiguity in brief §36's own example):** `id` on any versioned contract (`StrategyDefinition`, `CompositeStrategyDefinition`) is **unique per version, not per logical strategy**. Editing parameters never updates a row in place — it always inserts a new row with a new `id` and `version = previous + 1`. A separate, optional `familyName` groups versions together for display purposes only (e.g. showing "MA-RSI Strategy v1, v2, v3" as a history in the UI); it is never used as a foreign key. Anything that references a `strategyDefinitionId` or `compositeDefinitionId` is therefore automatically version-pinned — this is what makes brief §40.8 ("how do we check which strategy version produced a given Leaderboard row?") answerable by a single join, with no risk of the referenced row having silently changed underneath it.
- Enums are written as TypeScript string union types so they serialize identically over REST, WebSocket, and the Event Bus without a mapping layer.

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

// Emitted on every tick, independent of candle close — this is the raw
// realtime stream described in brief §4 ("09:10:01 BTC = 118,021 ...").
export interface MarketTick {
  pair: Pair;
  price: number;
  timestamp: string;
}

// Connection health, needed to satisfy brief §32.4 (Reliability) and
// question §40.7 ("If the Binance WebSocket disconnects, how does the
// system recover?"). Pushed to the Frontend so it can show a warning
// instead of silently freezing.
export interface MarketDataConnectionStatus {
  provider: "BINANCE" | "OKX" | "BYBIT" | "COINBASE"; // extensible per brief §6
  status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  lastEventAt: string;
}
```

**Boundary rule (from `01-technical-design.md` §1.3 and brief §6):** `Candle` and `MarketTick` are the *only* shapes that leave `market-data`. The raw Binance payload never crosses this boundary — `BinanceAdapter` (and any future `OKXAdapter`) is responsible for producing exactly these two shapes internally, so `strategy-engine` and the Frontend are never aware which exchange the data came from.

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
  get(name: string): StrategyFactory | undefined;
  list(): StrategyFactory[];
}

export interface StrategyFactory {
  name: string;
  category: StrategyCategory;
  create(parameters: Record<string, number | string>): Strategy;
}
```

Adding `MACDStrategy` means: implement `Strategy`, implement a `StrategyFactory` for it, call `register()` once at bootstrap. Nothing else in this document changes — this is what makes brief §41's grading scenario pass.

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

// The one shape every downstream component (Job Queue, Backtester,
// Evaluator, Leaderboard) consumes — brief §42: "components downstream
// only receive a CandidateStrategy and don't need to know how it was generated."
export interface CandidateStrategy {
  id: string;
  compositeDefinition: CompositeStrategyDefinition;
  generatedBy: GeneratorType;
  generatedAt: string;
  iterationNumber: number;   // this candidate's position in the continuous loop, for observability (brief §32.7)
}

export interface StrategyGenerator {
  readonly type: GeneratorType;
  generate(searchSpace: SearchSpaceConfig): CandidateStrategy;
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
export interface StopCondition {
  maxCandidates?: number;
  maxDurationSeconds?: number;
  noImprovementAfterIterations?: number; // stop if the Top-1 score hasn't improved in N iterations
}
```

### 5.1 Search Loop Orchestrator — Observability Contract

Owned by `services/continuous-loop`. This is the direct formalization of brief §32.7 (Observability driver) and §24, which list exactly these five facts as things "the system should know" about the running loop. Without this contract, "observability" stays a slogan with nothing for the Frontend's progress panel (brief §46 demo step 4: *"Candidates tested: 125, Current: MA20 + RSI14 + SR, Backtesting..."*) to actually poll or subscribe to.

```typescript
// packages/contracts/src/continuous-loop.ts

export interface LoopStatus {
  state: "RUNNING" | "PAUSED" | "STOPPED";
  candidatesTested: number;
  currentCandidate?: CandidateStrategy;        // what's in flight right now, for the demo's "Current: ..." display
  failedJobCount: number;
  averageBacktestDurationMs: number;
  currentTopEntry?: LeaderboardEntry;           // "which strategy is currently #1" — brief §32.7's last bullet
  startedAt: string;
  stopCondition: StopCondition;
}

export interface ContinuousLoopOrchestrator {
  start(config: { searchSpace: SearchSpaceConfig; stopCondition: StopCondition; generatorType: GeneratorType }): void;
  pause(): void;
  resume(): void;
  status(): LoopStatus;
}
```

**Boundary rule:** `LoopStatus` is read-only, derived state — the orchestrator computes it from events it has already consumed (`StrategyGenerated`, `BacktestCompleted`, `StrategyEvaluated`, `LeaderboardUpdated`); it is not a separate source of truth that could drift from what actually happened. The Frontend polls or subscribes to this via WebSocket to drive the progress panel.

## 6. Backtesting Contracts

Owned by `services/backtesting` (and composed into `apps/backtest-worker`, per `05-project-structure.md` §4). Corresponds to brief §19-20.

**Note on the Job Queue:** the architecture doc lists "Job Queue" as its own component, but it has no separate business contract here — `BacktestRequest` below *is* the job payload. Retry count, attempt number, and backoff are transport metadata owned by `packages/queue-client` (BullMQ), not business data; wrapping `BacktestRequest` in a second "Job" DTO would just duplicate what the queue library already tracks.

```typescript
// packages/contracts/src/backtesting.ts

export interface BacktestRequest {
  candidateId: string;               // references CandidateStrategy.id
  pair: Pair;
  timeframe: Timeframe;
  dataset: { from: string; to: string }; // historical range, e.g. "01/01" -> "01/07" per brief §19
}

export interface Trade {
  id: string;
  candidateId: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  resultPercent: number;   // e.g. +1.85, -0.90 — matches the Trade Detail table in brief §26
  signal: "LONG" | "SHORT"; // MVP only needs LONG; SHORT is listed here for the
                              // brief §38 extension ("Long/Short, Stop Loss, Take Profit")
}

export interface BacktestResult {
  candidateId: string;
  trades: Trade[];
  startedAt: string;
  completedAt: string;
  status: "COMPLETED" | "FAILED";
  errorMessage?: string; // populated when status === "FAILED", so the Job Queue can retry with context
}
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
  maxDrawdownPercent: number;
  profitFactor: number;
  sharpeRatio: number;
}

export interface Evaluator {
  evaluate(result: BacktestResult): EvaluationMetrics;
}
```

**Boundary rule:** `Evaluator.evaluate` takes only a `BacktestResult` (a `Trade[]`) — it never receives the `Strategy` or `CompositeStrategyDefinition` that produced those trades. This is what brief §20 means by evaluation being decoupled from implementation: swapping how a strategy decides to trade never requires touching how performance is measured.

### 7.1 Experiment Result — the Persisted Aggregate

Brief §35 lists **Experiment** as its own top-level data group — *Combination, Dataset, Timeframe, Parameters, Result* — distinct from `Strategy` and separate from whatever the Leaderboard stores. `CandidateStrategy`, `BacktestRequest`, `BacktestResult`, and `EvaluationMetrics` above are the pipeline's working data; `ExperimentResult` is the single row that gets persisted once the pipeline finishes, and it is what brief §36/§40.8 actually mean by *"Experiment #122"*.

```typescript
// packages/contracts/src/experiment.ts

export interface ExperimentResult {
  id: string;                              // this is "Experiment #122"
  candidateId: string;                     // -> CandidateStrategy.id
  compositeDefinitionId: string;           // -> CompositeStrategyDefinition.id (version-pinned, see §0 Identity rule)
  pair: Pair;
  timeframe: Timeframe;
  dataset: { from: string; to: string };
  trades: Trade[];
  metrics: EvaluationMetrics;
  createdAt: string;
}
```

Owned by `services/evaluation` (it is the natural place to assemble this once metrics are computed, right before publishing `StrategyEvaluated`). This is the row `LeaderboardEntry` below actually references, and the row a report answers brief §40.8 from: *"experiment.compositeDefinitionId → CompositeStrategyDefinition.version → each component's strategyDefinitionId → StrategyDefinition.version"* — a fixed, immutable chain, never a mutable pointer.

## 8. Leaderboard Contracts

Owned by `services/leaderboard`. Corresponds to brief §21-22.

```typescript
// packages/contracts/src/leaderboard.ts

export interface LeaderboardEntry {
  rank: number;
  experimentResultId: string;      \
  score: number;                    // computed by the ScoreFormula below
  addedAt: string;
}

// Brief §21 gives an explicit example: Score = 0.5*Return + 0.2*WinRate + 0.3*RiskScore.
// This is kept configurable rather than hard-coded, since the brief requires
// the group to "clearly present how the score is calculated" — implying it's
// a documented, swappable formula, not a fixed constant in the codebase.
export interface ScoreFormula {
  weights: {
    return: number;
    winRate: number;
    riskScore: number; // derived from maxDrawdown + sharpeRatio, formula documented in docs/design
  };
}

export interface LeaderboardService {
  topK(k: number): LeaderboardEntry[];   // brief §22: leaderboard always shows Top-K, not everything
  submit(entry: Omit<LeaderboardEntry, "rank" | "addedAt">): void;
  // submit() only inserts if the score beats the current #K entry — brief §22's example (82.1 > 78.4 → inserted)
}
```

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
  analyzedAt: string;
}

export interface SentimentAnalysisService {
  analyze(item: NewsItem): Promise<SentimentResult>;
}
```

**Why `NewsSentimentStrategy` still fits the `Strategy` interface (brief §30):** it is just another `Strategy` implementation whose `analyze()` reads `context.sentiment` (see §3 above) instead of `context.indicators`. No change to `Strategy`, `StrategyRegistry`, or the Combination Engine is required to add it — this is the concrete answer to brief §40.6 ("if the sentiment model changes, is the Strategy Engine affected?": no).

## 10. Event Catalog

Owned by `services/event-bus`, but the payload shapes are contracts too — every service that publishes or subscribes must use these exact shapes. This directly implements the event list in brief §34.

```typescript
// packages/contracts/src/events.ts

export interface EventEnvelope<T> {
  eventId: string;
  eventType: string;      // matches one of the keys below
  occurredAt: string;
  payload: T;
}

export interface EventPayloads {
  "MarketPriceUpdated": MarketTick;
  "CandleClosed": Candle;
  "StrategyGenerated": CandidateStrategy;
  "BacktestStarted": BacktestRequest;
  "BacktestCompleted": BacktestResult;
  "StrategyEvaluated": EvaluationMetrics;
  "LeaderboardUpdated": { entries: LeaderboardEntry[] };
  "NewsCollected": NewsItem;
  "SentimentAnalyzed": SentimentResult;
}
```

Publishers and subscribers are typed against `EventPayloads[K]` for a given event name `K`, so an agent adding a new subscriber gets a compile error rather than a silent runtime mismatch if it reads the wrong field.

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
| Events | `packages/contracts/src/events.ts` |

All exported from a single `packages/contracts/src/index.ts` barrel, so every service imports from one place: `import { Strategy, Candle, CandidateStrategy } from "@cryptox/contracts"`.