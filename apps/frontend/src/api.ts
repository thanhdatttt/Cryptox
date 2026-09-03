import { io, type Socket } from "socket.io-client";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type Signal = "BUY" | "SELL" | "HOLD";
export type CombinationMethod = "MAJORITY_VOTE" | "WEIGHTED_SCORE";
export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";
export type StrategyCategory = "TREND" | "MOMENTUM" | "VOLATILITY" | "STRUCTURE" | "INFORMATION";
export type ApiCandle = { pair: string; timeframe: Timeframe; timestamp: string; open: number; high: number; low: number; close: number; volume: number; isClosed: boolean; source?: string };
export type MarketTick = { pair: string; price: number; quantity: number; timestamp: string; side: "BUY" | "SELL" };
export type MarketConnectionStatus = { provider: string; status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED"; lastEventAt?: string; errorCode?: string };
export type MarketCapabilities = { provider: string; pairs: string[]; timeframes: Timeframe[]; policyDefaults?: { slippageBps?: number; feeRatePercent?: number; initialCapital?: number; maxAttempts?: number } };
export type MarketSignal = { pair: string; timeframe: Timeframe; strategyDefinitionId: string; strategyName: string; signal: Signal; asOf: string; candleCount: number; implementationVersion: string; implementationSha256: string };

export type StrategyParameterDescriptor = { key: string; label: string; type: "INTEGER" | "NUMBER" | "ENUM"; required: boolean; defaultValue: number | string; minimum?: number; maximum?: number; step?: number; options?: string[] };
export type StrategyDescriptor = { name: string; displayName: string; description: string; category: string; implementationVersion: string; implementationSha256: string; minimumHistoryCandles: number; parameters: StrategyParameterDescriptor[] };
export type StrategyDefinition = { id: string; userId: string; logicalFamilyKey: string; strategyName: string; parameters: Record<string, number | string>; version: number; createdAt: string; familyName?: string; implementationVersion: string; implementationSha256: string };
export type Composite = { id: string; userId: string; logicalFamilyKey: string; method: CombinationMethod; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number }; version: number; createdAt: string };

export type StrategyVisualizationOverlay =
  | { id: string; strategyDefinitionId: string; kind: "LINE"; label: string; points: Array<{ time: string; value: number }> }
  | { id: string; strategyDefinitionId: string; kind: "ZONE"; label: string; points: Array<{ time: string; low: number; high: number }> }
  | { id: string; strategyDefinitionId: string; kind: "SIGNAL"; label: string; points: Array<{ time: string; value: number; signal: Signal }> };
export type StrategyGenerationResult = { generationId: string; kind: "SINGLE" | "COMPOSITE"; strategyDefinition?: StrategyDefinition; compositeStrategyDefinition?: Composite; modelName?: string; modelVersion?: string; promptVersion?: string };

export type SentimentDatasetSnapshotRef = { id: string; relatedCoin: string; range: { from: string; to: string }; aggregationWindowSeconds: number; modelName: string; modelVersion: string; modelSha256: string; pointCount: number; sha256: string; createdAt: string };
export type DatasetSnapshotRef = { id: string; pair?: string; timeframe?: Timeframe; range?: { from: string; to: string }; candleCount?: number; sha256?: string; createdAt?: string; pairMetadata?: { pair: string; baseAsset: string; quoteAsset: string; settlementAsset: string } };
export type ExecutionPolicySnapshot = { policyId: string; positionPolicyId: string; sizingPolicyId: string; fillPolicyId: string; oppositeSignalPolicyId: string; stopLossPercent?: number; takeProfitPercent?: number; warmupCandles: number; sha256: string };
export type Scope = { id: string; name: string; version?: number; pair: string; timeframe: Timeframe; datasetRange: { from: string; to: string }; datasetSnapshotId: string; datasetSnapshot?: DatasetSnapshotRef; sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef; initialCapital: number; feeRatePercent: number; slippageBps: number; scoreFormulaId: string; createdAt: string; workerRuntimeVersion?: string; workerRuntimeSha256?: string; evaluationRuntimeVersion?: string; evaluationRuntimeSha256?: string; simulatorVersion?: string; simulatorSha256?: string; decimalPolicyId?: string; evaluationPolicyId?: string; riskPolicy?: { stopLossPercent?: number; takeProfitPercent?: number } };
export type AttemptProgress = { attemptId: string; attemptNumber: number; status: string; startedAt?: string; completedAt?: string; failureCode?: string; errorMessage?: string };
export type CandidateLineage = { parentFingerprints: string[]; crossoverPoint: number; mutatedParameterKeys: string[]; selectionMutation?: { replacedStrategyId?: string; replacementStrategyId?: string } };
export type Candidate = { candidateId: string; origin?: "MANUAL" | "SEARCH"; selectionMode?: "SINGLE" | "COMPOSITE"; searchRunId?: string; iterationNumber?: number; generatedBy?: GeneratorType; fingerprint?: string; lineage?: CandidateLineage; leaderboardScopeId?: string; status: string; attempts?: AttemptProgress[]; maxAttempts?: number; experimentResultId?: string; failureKind?: string; failureCode?: string; lastError?: string; updatedAt?: string; createdAt?: string };
export type Trade = { id: string; sequence: number; pair: string; settlementAsset?: string; backtestAttemptId?: string; signal: "LONG" | "SHORT"; entryTime: string; marketEntryPrice?: number; entryPrice: number; stopLoss?: number | null; takeProfit?: number | null; exitTime: string; marketExitPrice?: number; exitPrice: number; exitReason?: "STOP_LOSS" | "TAKE_PROFIT" | "STRATEGY_CLOSE" | "RANGE_END" | string; quantity?: number; notionalEntryValue?: number; equityBeforeTrade?: number; equityAfterTrade?: number; grossProfit?: number; feeAmount?: number; slippageBps?: number; slippageAmount?: number; profit?: number; resultPercent: number; result: "WIN" | "LOSS" | "BREAKEVEN" };
export type TradePage = { items: Trade[]; nextCursor?: string; totalCount?: number; total?: number };
export type ExperimentMetrics = { candidateId?: string; totalReturnPercent?: number; winRatePercent?: number; numberOfTrades?: number; maxDrawdownPercent?: number; profitFactor?: number | null; profitFactorStatus?: "FINITE" | "NO_TRADES" | "NO_LOSSES" | "NO_GROSS_MOVEMENT"; sharpeRatio?: number; sharpeRatioStatus?: string };
export type ExperimentSummary = { id: string; candidateId?: string; searchRunId?: string; backtestAttemptId?: string; leaderboardScopeId: string; scoreFormulaId?: string; compositeDefinitionId?: string; compositeDefinition?: Composite; strategyDefinitions?: StrategyDefinition[]; datasetSnapshot?: DatasetSnapshotRef; sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef; benchmark?: { datasetSnapshot?: DatasetSnapshotRef; sentimentDatasetSnapshot?: SentimentDatasetSnapshotRef; pairMetadata?: DatasetSnapshotRef["pairMetadata"]; pair?: string; timeframe?: Timeframe; snapshotRange?: { from: string; to: string }; tradeRange?: { from: string; to: string }; warmupCapacityCandles?: number; datasetSnapshotId?: string; datasetSnapshotSha256?: string; initialCapital?: number; feeRatePercent?: number; slippageBps?: number; decimalPolicyId?: string; evaluationPolicyId?: string; sentimentSnapshotSha256?: string }; executionPolicy?: ExecutionPolicySnapshot; simulatorVersion?: string; simulatorSha256?: string; benchmarkTimezone?: string; fillPolicyId?: string; oppositeSignalPolicyId?: string; sameCandleOrderingPolicyId?: string; deterministicGuarantee?: string; workerRuntimeVersion?: string; workerRuntimeSha256?: string; evaluationRuntimeVersion?: string; evaluationRuntimeSha256?: string; metrics: ExperimentMetrics; initialCapital?: number; totalProfitAmount?: number; endingEquity?: number; wins?: number; losses?: number; breakevens?: number; maxDrawdownAmount?: number; overallScore?: number; rankEligible?: boolean; rankEligibilityReason?: string; createdAt?: string };
export type VisualizationMarker = { id: string; tradeId: string; sequence: number; kind: "ENTRY" | "STOP_LOSS" | "TAKE_PROFIT" | "EXIT"; time: string; price: number; highlighted: boolean };
export type ExperimentVisualization = { experimentId: string; datasetSnapshot?: DatasetSnapshotRef; candles: ApiCandle[]; overlays: StrategyVisualizationOverlay[]; markers: VisualizationMarker[]; nextCursor?: string };

export type StopCondition = { maxCandidates?: number; maxDurationSeconds?: number; noImprovementAfterIterations?: number };
export type LoopStatus = { searchRunId: string; state: "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED"; activeCandidates: Candidate[]; queuedCount: number; runningCount: number; candidatesTested: number; failedCandidateCount: number; retryExhaustedCandidateCount?: number; infrastructureFailureCandidateCount?: number; completionProcessingFailureCandidateCount?: number; failedAttemptCount?: number; averageBacktestDurationMs?: number | null; currentTopEntry?: SearchRankingEntry; createdAt: string; startedAt?: string; updatedAt: string; endedAt?: string; stopReason?: "MAX_CANDIDATES" | "MAX_DURATION" | "NO_IMPROVEMENT" | "USER_CANCELLED" | "ERROR"; stopCondition: StopCondition; lastError?: string };
export type SearchRankingEntry = { id?: string; rank: number; searchRunId: string; leaderboardScopeId: string; candidateId: string; experimentResultId: string; scoreFormulaId: string; score: number };
export type LeaderboardEntry = { id: string; rank: number; experimentResultId: string; leaderboardScopeId: string; scoreFormulaId: string; score: number; addedAt: string };
export type DomainRules = { requiredCategories?: StrategyCategory[]; allowedCategories?: StrategyCategory[]; forbiddenCategories?: StrategyCategory[] };
export type StartSearchRequest = { leaderboardScopeId: string; strategyDefinitionIds: string[]; generatorType: GeneratorType; maxInFlight: number; maxComponents?: number; stopCondition: StopCondition; domainRules?: DomainRules };
export type CandidatePage = { items: Candidate[]; nextCursor?: string; totalCount?: number };
export type VisualizationRequest = { limit?: number; cursor?: string; from?: string; to?: string; highlightTradeId?: string };
export type ReadCandlesQuery = { pair: string; timeframe: Timeframe; limit?: number; cursor?: string; from?: string; to?: string; includeForming?: boolean; completeness?: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE" };
export type ReadCandlesResult = { pair: string; timeframe: Timeframe; candles: ApiCandle[]; range: { from: string; to: string }; complete: boolean; missingRanges?: Array<{ from: string; to: string }>; formingIncluded?: boolean; asOf: string; nextCursor?: string };
export type ReplayVerificationAccepted = { replayJobId: string; experimentId: string; status: "QUEUED" };
export type ReplayVerificationResult = { replayJobId: string; experimentId: string; sourceAttemptId: string } & ({ status: "QUEUED" | "RUNNING" } | { status: "MATCH" | "MISMATCH"; comparedTradeCount: number; totalMismatchCount: number; truncated: boolean; mismatches: Array<{ fieldPath: string; expected: string; actual: string }> } | { status: "NON_REPLAYABLE"; failureCode: "MISSING_SNAPSHOT" | "IMPLEMENTATION_ARTIFACT_UNAVAILABLE" | "REPLAY_ARTIFACT_EXPIRED" });

export type MarketSubscription = { pair: string; timeframe: Timeframe };
type MarketWireBase = { schemaVersion?: 1; sentAt?: string; requestId?: string };
export type MarketWireMessage =
  | (MarketWireBase & { type: "MARKET_TICK"; payload: MarketTick })
  | (MarketWireBase & { type: "CANDLE"; payload: ApiCandle })
  | (MarketWireBase & { type: "CONNECTION_STATUS"; payload: MarketConnectionStatus })
  | (MarketWireBase & { type: "SUBSCRIPTION_ACK"; payload: { action: "SUBSCRIBE" | "UNSUBSCRIBE"; accepted: unknown[]; rejected: unknown[] } })
  | (MarketWireBase & { type: "ERROR"; payload: { code?: string; message?: string; retryable?: boolean } });

export type AuthUser = { userId: string; email?: string };
export type GenerationErrorKind = "SOURCE" | "MODEL" | "SCHEMA" | "VALIDATION" | "UNKNOWN";

const runtimeEnv = (import.meta as ImportMeta & { env?: { VITE_BACKEND_URL?: string } }).env;
const base = runtimeEnv?.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
const storage = typeof localStorage === "undefined" ? undefined : localStorage;
let token = storage?.getItem("cryptox.token") ?? null;
type SessionListener = (token: string | null) => void;
const sessionListeners = new Set<SessionListener>();
export const session = {
  get token() { return token; },
  set(value: string | null) { token = value; if (value) storage?.setItem("cryptox.token", value); else storage?.removeItem("cryptox.token"); sessionListeners.forEach((listener) => listener(value)); },
  subscribe(listener: SessionListener) { sessionListeners.add(listener); return () => { sessionListeners.delete(listener); }; },
};

export class ApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly code?: string, public readonly details?: Record<string, unknown>) { super(message); this.name = "ApiError"; }
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const validTimeframe = (value: unknown): value is Timeframe => value === "1m" || value === "5m" || value === "15m" || value === "1h" || value === "4h" || value === "1d";
const textField = (value: unknown, label: string): string => typeof value === "string" && value.trim() ? value : (() => { throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); })();
const finiteField = (value: unknown, label: string): number => typeof value === "number" && Number.isFinite(value) ? value : (() => { throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); })();
const isoField = (value: unknown, label: string): string => { const result = textField(value, label); if (!Number.isFinite(Date.parse(result))) throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); return result; };
const dto = <T>(value: unknown, label: string): T => { if (!isRecord(value)) throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); return value as T; };
const arrayDto = <T>(value: unknown, label: string): T[] => { if (!Array.isArray(value)) throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); return value as T[]; };
const normalizeCandle = (value: unknown): ApiCandle => { const raw = dto<Record<string, unknown>>(value, "candle"); const timeframe = raw.timeframe; if (!validTimeframe(timeframe) || typeof raw.isClosed !== "boolean") throw new ApiError(502, "Backend returned an invalid candle response.", "INVALID_DTO"); return { pair: textField(raw.pair, "candle"), timeframe, timestamp: isoField(raw.timestamp, "candle"), open: finiteField(raw.open, "candle"), high: finiteField(raw.high, "candle"), low: finiteField(raw.low, "candle"), close: finiteField(raw.close, "candle"), volume: finiteField(raw.volume, "candle"), isClosed: raw.isClosed, ...(raw.source === undefined ? {} : { source: textField(raw.source, "candle") }) } };
const normalizeMarketSignal = (value: unknown): MarketSignal => { const raw = dto<Record<string, unknown>>(value, "market signal"); if (!validTimeframe(raw.timeframe) || (raw.signal !== "BUY" && raw.signal !== "SELL" && raw.signal !== "HOLD")) throw new ApiError(502, "Backend returned an invalid market signal response.", "INVALID_DTO"); return { pair: textField(raw.pair, "market signal"), timeframe: raw.timeframe, strategyDefinitionId: textField(raw.strategyDefinitionId, "market signal"), strategyName: textField(raw.strategyName, "market signal"), signal: raw.signal, asOf: isoField(raw.asOf, "market signal"), candleCount: finiteField(raw.candleCount, "market signal"), implementationVersion: textField(raw.implementationVersion, "market signal"), implementationSha256: textField(raw.implementationSha256, "market signal") }; };
const normalizeDefinition = (value: unknown): StrategyDefinition => { const raw = dto<Record<string, unknown>>(value, "strategy definition"); const parameters = raw.parameters; if (!isRecord(parameters) || !Number.isInteger(raw.version) || Number(raw.version) < 1) throw new ApiError(502, "Backend returned an invalid strategy definition response.", "INVALID_DTO"); return { ...raw, id: textField(raw.id, "strategy definition"), userId: textField(raw.userId, "strategy definition"), logicalFamilyKey: textField(raw.logicalFamilyKey, "strategy definition"), strategyName: textField(raw.strategyName, "strategy definition"), parameters: parameters as Record<string, number | string>, version: raw.version, createdAt: isoField(raw.createdAt, "strategy definition"), implementationVersion: textField(raw.implementationVersion, "strategy definition"), implementationSha256: textField(raw.implementationSha256, "strategy definition") } as StrategyDefinition; };
const normalizeComposite = (value: unknown): Composite => { const raw = dto<Record<string, unknown>>(value, "composite strategy"); if ((raw.method !== "MAJORITY_VOTE" && raw.method !== "WEIGHTED_SCORE") || !Array.isArray(raw.components) || raw.components.length < 1 || !Number.isInteger(raw.version) || Number(raw.version) < 1) throw new ApiError(502, "Backend returned an invalid composite strategy response.", "INVALID_DTO"); return { ...raw, id: textField(raw.id, "composite strategy"), userId: textField(raw.userId, "composite strategy"), logicalFamilyKey: textField(raw.logicalFamilyKey, "composite strategy"), method: raw.method, components: raw.components.map((component) => { const item = dto<Record<string, unknown>>(component, "composite strategy"); return { strategyDefinitionId: textField(item.strategyDefinitionId, "composite strategy"), weight: finiteField(item.weight, "composite strategy") }; }), version: raw.version, createdAt: isoField(raw.createdAt, "composite strategy") } as Composite; };
const normalizeDescriptor = (value: unknown): StrategyDescriptor => { const raw = dto<Record<string, unknown>>(value, "strategy descriptor"); if (!Array.isArray(raw.parameters) || !Number.isInteger(raw.minimumHistoryCandles) || Number(raw.minimumHistoryCandles) < 0) throw new ApiError(502, "Backend returned an invalid strategy descriptor response.", "INVALID_DTO"); return { ...raw, name: textField(raw.name, "strategy descriptor"), displayName: textField(raw.displayName ?? raw.name, "strategy descriptor"), description: textField(raw.description, "strategy descriptor"), category: textField(raw.category, "strategy descriptor"), implementationVersion: textField(raw.implementationVersion, "strategy descriptor"), implementationSha256: textField(raw.implementationSha256, "strategy descriptor"), minimumHistoryCandles: raw.minimumHistoryCandles, parameters: raw.parameters as StrategyParameterDescriptor[] } as StrategyDescriptor; };
const normalizeCapabilities = (value: unknown): MarketCapabilities => { const raw = dto<Record<string, unknown>>(value, "market capabilities"); if (!Array.isArray(raw.pairs) || !Array.isArray(raw.timeframes) || raw.pairs.some((pair) => typeof pair !== "string" || !pair.trim()) || raw.timeframes.some((timeframe) => !validTimeframe(timeframe))) throw new ApiError(502, "Backend returned an invalid market capabilities response.", "INVALID_DTO"); const policyDefaults = isRecord(raw.policyDefaults) ? { ...(raw.policyDefaults.initialCapital === undefined ? {} : { initialCapital: finiteField(raw.policyDefaults.initialCapital, "market capabilities") }), ...(raw.policyDefaults.feeRatePercent === undefined ? {} : { feeRatePercent: finiteField(raw.policyDefaults.feeRatePercent, "market capabilities") }), ...(raw.policyDefaults.slippageBps === undefined ? {} : { slippageBps: finiteField(raw.policyDefaults.slippageBps, "market capabilities") }), ...(raw.policyDefaults.maxAttempts === undefined ? {} : { maxAttempts: finiteField(raw.policyDefaults.maxAttempts, "market capabilities") }) } : undefined; return { provider: textField(raw.provider, "market capabilities"), pairs: raw.pairs as string[], timeframes: raw.timeframes as Timeframe[], ...(policyDefaults ? { policyDefaults } : {}) }; };
const normalizeReadCandles = (value: unknown): ReadCandlesResult => { const raw = dto<Record<string, unknown>>(value, "candle history"); if (!Array.isArray(raw.candles) || typeof raw.complete !== "boolean") throw new ApiError(502, "Backend returned an invalid candle history response.", "INVALID_DTO"); const timeframe = raw.timeframe; if (!validTimeframe(timeframe)) throw new ApiError(502, "Backend returned an invalid candle history response.", "INVALID_DTO"); return { pair: textField(raw.pair, "candle history"), timeframe, candles: raw.candles.map(normalizeCandle), range: (() => { const range = dto<Record<string, unknown>>(raw.range, "candle history"); return { from: isoField(range.from, "candle history"), to: isoField(range.to, "candle history") }; })(), complete: raw.complete, ...(Array.isArray(raw.missingRanges) ? { missingRanges: raw.missingRanges.map((item) => { const range = dto<Record<string, unknown>>(item, "candle history"); return { from: isoField(range.from, "candle history"), to: isoField(range.to, "candle history") }; }) } : {}), ...(raw.formingIncluded === undefined ? {} : { formingIncluded: raw.formingIncluded === true }), asOf: isoField(raw.asOf, "candle history"), ...(raw.nextCursor === undefined ? {} : { nextCursor: textField(raw.nextCursor, "candle history") }) }; };
const normalizeScope = (value: unknown): Scope => { const raw = dto<Record<string, unknown>>(value, "benchmark scope"); const timeframe = raw.timeframe; const range = dto<Record<string, unknown>>(raw.datasetRange, "benchmark scope"); if (!validTimeframe(timeframe)) throw new ApiError(502, "Backend returned an invalid benchmark scope response.", "INVALID_DTO"); return { ...raw, id: textField(raw.id, "benchmark scope"), name: textField(raw.name, "benchmark scope"), version: raw.version === undefined ? undefined : finiteField(raw.version, "benchmark scope"), pair: textField(raw.pair, "benchmark scope"), timeframe, datasetRange: { from: isoField(range.from, "benchmark scope"), to: isoField(range.to, "benchmark scope") }, datasetSnapshotId: textField(raw.datasetSnapshotId, "benchmark scope"), initialCapital: finiteField(raw.initialCapital, "benchmark scope"), feeRatePercent: finiteField(raw.feeRatePercent, "benchmark scope"), slippageBps: finiteField(raw.slippageBps, "benchmark scope"), scoreFormulaId: textField(raw.scoreFormulaId, "benchmark scope"), createdAt: isoField(raw.createdAt, "benchmark scope") } as Scope; };
const normalizeCandidate = (value: unknown): Candidate => { const raw = dto<Record<string, unknown>>(value, "candidate progress"); return { ...raw, candidateId: textField(raw.candidateId, "candidate progress"), status: textField(raw.status, "candidate progress"), ...(raw.origin === undefined ? {} : { origin: raw.origin as Candidate["origin"] }), ...(Array.isArray(raw.attempts) ? { attempts: raw.attempts as AttemptProgress[] } : {}) } as Candidate; };
const normalizeTrade = (value: unknown): Trade => { const raw = dto<Record<string, unknown>>(value, "trade"); if ((raw.signal !== "LONG" && raw.signal !== "SHORT") || (raw.result !== "WIN" && raw.result !== "LOSS" && raw.result !== "BREAKEVEN")) throw new ApiError(502, "Backend returned an invalid trade response.", "INVALID_DTO"); return { ...raw, id: textField(raw.id, "trade"), sequence: finiteField(raw.sequence, "trade"), pair: textField(raw.pair, "trade"), signal: raw.signal, entryTime: isoField(raw.entryTime, "trade"), entryPrice: finiteField(raw.entryPrice, "trade"), exitTime: isoField(raw.exitTime, "trade"), exitPrice: finiteField(raw.exitPrice, "trade"), resultPercent: finiteField(raw.resultPercent, "trade"), result: raw.result } as Trade; };
const normalizeTradePage = (value: unknown): TradePage => { const raw = dto<Record<string, unknown>>(value, "trade page"); if (!Array.isArray(raw.items)) throw new ApiError(502, "Backend returned an invalid trade page response.", "INVALID_DTO"); return { items: raw.items.map(normalizeTrade), ...(raw.nextCursor === undefined ? {} : { nextCursor: textField(raw.nextCursor, "trade page") }), ...(raw.totalCount === undefined ? {} : { totalCount: finiteField(raw.totalCount, "trade page") }), ...(raw.total === undefined ? {} : { total: finiteField(raw.total, "trade page") }) }; };
const normalizeExperiment = (value: unknown): ExperimentSummary => { const raw = dto<Record<string, unknown>>(value, "experiment"); const metrics = dto<Record<string, unknown>>(raw.metrics, "experiment"); return { ...raw, id: textField(raw.id, "experiment"), leaderboardScopeId: textField(raw.leaderboardScopeId, "experiment"), metrics: { ...metrics, ...(metrics.totalReturnPercent === undefined ? {} : { totalReturnPercent: finiteField(metrics.totalReturnPercent, "experiment") }), ...(metrics.winRatePercent === undefined ? {} : { winRatePercent: finiteField(metrics.winRatePercent, "experiment") }), ...(metrics.numberOfTrades === undefined ? {} : { numberOfTrades: finiteField(metrics.numberOfTrades, "experiment") }), ...(metrics.maxDrawdownPercent === undefined ? {} : { maxDrawdownPercent: finiteField(metrics.maxDrawdownPercent, "experiment") }), ...(metrics.profitFactor !== undefined && metrics.profitFactor !== null ? { profitFactor: finiteField(metrics.profitFactor, "experiment") } : {}) } as ExperimentMetrics }; };
const normalizeVisualization = (value: unknown, id: string): ExperimentVisualization => { const raw = dto<Record<string, unknown>>(value, "experiment visualization"); if (!Array.isArray(raw.candles) || !Array.isArray(raw.overlays) || !Array.isArray(raw.markers)) throw new ApiError(502, "Backend returned an invalid experiment visualization response.", "INVALID_DTO"); return { experimentId: textField(raw.experimentId ?? id, "experiment visualization"), datasetSnapshot: raw.datasetSnapshot as DatasetSnapshotRef | undefined, candles: raw.candles.map(normalizeCandle), overlays: raw.overlays as StrategyVisualizationOverlay[], markers: raw.markers as VisualizationMarker[], ...(raw.nextCursor === undefined ? {} : { nextCursor: textField(raw.nextCursor, "experiment visualization") }) }; };
const normalizeReplayAccepted = (value: unknown): ReplayVerificationAccepted => { const raw = dto<Record<string, unknown>>(value, "replay"); if (raw.status !== "QUEUED") throw new ApiError(502, "Backend returned an invalid replay response.", "INVALID_DTO"); return { replayJobId: textField(raw.replayJobId, "replay"), experimentId: textField(raw.experimentId, "replay"), status: "QUEUED" }; };
const normalizeReplayResult = (value: unknown): ReplayVerificationResult => { const raw = dto<Record<string, unknown>>(value, "replay verification"); const status = raw.status; if (status !== "QUEUED" && status !== "RUNNING" && status !== "MATCH" && status !== "MISMATCH" && status !== "NON_REPLAYABLE") throw new ApiError(502, "Backend returned an invalid replay verification response.", "INVALID_DTO"); return { ...raw, replayJobId: textField(raw.replayJobId, "replay verification"), experimentId: textField(raw.experimentId, "replay verification"), sourceAttemptId: textField(raw.sourceAttemptId, "replay verification"), status } as ReplayVerificationResult; };
const normalizeSearchRanking = (value: unknown): SearchRankingEntry => { const raw = dto<Record<string, unknown>>(value, "search ranking"); return { ...(raw.id === undefined ? {} : { id: textField(raw.id, "search ranking") }), rank: finiteField(raw.rank, "search ranking"), searchRunId: textField(raw.searchRunId, "search ranking"), leaderboardScopeId: textField(raw.leaderboardScopeId, "search ranking"), candidateId: textField(raw.candidateId, "search ranking"), experimentResultId: textField(raw.experimentResultId, "search ranking"), scoreFormulaId: textField(raw.scoreFormulaId, "search ranking"), score: finiteField(raw.score, "search ranking") }; };
const normalizeLeaderboardEntry = (value: unknown): LeaderboardEntry => { const raw = dto<Record<string, unknown>>(value, "leaderboard"); return { id: textField(raw.id, "leaderboard"), rank: finiteField(raw.rank, "leaderboard"), experimentResultId: textField(raw.experimentResultId, "leaderboard"), leaderboardScopeId: textField(raw.leaderboardScopeId, "leaderboard"), scoreFormulaId: textField(raw.scoreFormulaId, "leaderboard"), score: finiteField(raw.score, "leaderboard"), addedAt: isoField(raw.addedAt, "leaderboard") }; };
const query = (values: Record<string, string | number | boolean | undefined>): string => { const params = new URLSearchParams(); Object.entries(values).forEach(([key, value]) => { if (value !== undefined) params.set(key, String(value)); }); const result = params.toString(); return result ? `?${result}` : ""; };
const json = (body: unknown, extra?: HeadersInit): RequestInit => ({ method: "POST", body: JSON.stringify(body), headers: extra });
const idempotencyKey = (): string => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `frontend-${Date.now()}-${Math.random().toString(16).slice(2)}`;

async function request<T>(path: string, init: RequestInit = {}, decode: (value: unknown) => T = (value) => value as T): Promise<T> {
  const headers = new Headers(init.headers); headers.set("content-type", "application/json"); if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) {
    let message = `Request failed (${response.status})`; let code: string | undefined; let details: Record<string, unknown> | undefined;
    try { const body = await response.json(); if (isRecord(body)) { message = typeof body.message === "string" ? body.message : typeof body.error === "string" ? body.error : message; code = typeof body.code === "string" ? body.code : undefined; details = isRecord(body.details) ? body.details : undefined; } } catch { /* non-json error */ }
    if (response.status === 401) session.set(null);
    throw new ApiError(response.status, message, code, details);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return decode(text ? JSON.parse(text) : undefined);
}

export const api = {
  register: (email: string, password: string) => request<void>("/auth/register", json({ email, password })),
  login: async (email: string, password: string): Promise<AuthUser> => { const result = await request<{ token: string }>("/auth/login", json({ email, password }), (value) => dto<{ token: string }>(value, "login")); session.set(result.token); return request<AuthUser>("/auth/me", {}, (value) => dto<AuthUser>(value, "current user")); },
  me: () => request<AuthUser>("/auth/me", {}, (value) => dto<AuthUser>(value, "current user")),
  strategies: () => request<StrategyDescriptor[]>("/strategies", {}, (value) => arrayDto<unknown>(value, "strategy descriptor").map(normalizeDescriptor)),
  definitions: () => request<StrategyDefinition[]>("/strategies/definitions", {}, (value) => arrayDto<unknown>(value, "strategy definitions").map(normalizeDefinition)),
  define: (strategyName: string, parameters: Record<string, number | string>) => request<StrategyDefinition>("/strategies", json({ strategyName, parameters }), normalizeDefinition),
  composites: () => request<Composite[]>("/strategies/composites", {}, (value) => arrayDto<unknown>(value, "composite definitions").map(normalizeComposite)),
  defineComposite: (method: CombinationMethod, components: Array<{ strategyDefinitionId: string; weight: number }>, thresholds?: { buy: number; sell: number }) => request<Composite>("/strategies/composites", json({ method, components, ...(thresholds ? { thresholds } : {}) }), normalizeComposite),
  generateStrategy: (body: { sourceType: "TEXT"; text: string } | { sourceType: "URL"; url: string }) => request<StrategyGenerationResult>("/strategy-generations", json(body), (value) => { const raw = dto<Record<string, unknown>>(value, "strategy generation"); return { ...raw, generationId: String(raw.generationId ?? ""), kind: raw.kind as StrategyGenerationResult["kind"], strategyDefinition: raw.strategyDefinition ? normalizeDefinition(raw.strategyDefinition) : undefined, compositeStrategyDefinition: raw.compositeStrategyDefinition ? normalizeComposite(raw.compositeStrategyDefinition) : undefined } as StrategyGenerationResult; }),
  marketCapabilities: () => request<MarketCapabilities>("/market/pairs", {}, normalizeCapabilities),
  marketSignal: (pair: string, timeframe: Timeframe, strategyDefinitionId: string) => request<MarketSignal>(`/market/signal${query({ pair, timeframe, strategyDefinitionId })}`, {}, normalizeMarketSignal),
  readCandles: (input: ReadCandlesQuery) => request<ReadCandlesResult>(`/market/candles${query(input)}`, {}, normalizeReadCandles),
  candles: (pair: string, timeframe: Timeframe, limit?: number) => api.readCandles({ pair, timeframe, ...(limit === undefined ? {} : { limit }) }),
  snapshot: (body: { pair: string; timeframe: Timeframe; from: string; to: string }) => request<{ id: string }>("/market/snapshots", json(body), (value) => dto<{ id: string }>(value, "snapshot")),
  scopes: () => request<Scope[]>("/leaderboard-scopes", {}, (value) => arrayDto<unknown>(value, "benchmark scopes").map(normalizeScope)),
  createScope: (body: unknown) => request<Scope>("/leaderboard-scopes", json(body), normalizeScope),
  deleteScope: (id: string) => request<{ id: string; deleted: boolean }>(`/leaderboard-scopes/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteStrategyDefinition: (id: string) => request<{ id: string; deleted: boolean }>(`/strategies/definitions/${encodeURIComponent(id)}`, { method: "DELETE" }),
  deleteComposite: (id: string) => request<{ id: string; deleted: boolean }>(`/strategies/composites/${encodeURIComponent(id)}`, { method: "DELETE" }),
  startBacktest: (body: { leaderboardScopeId: string; strategyDefinitionIds: string[]; selectionMode?: "SINGLE" | "COMPOSITE"; compositeDefinitionId?: string; maxAttempts?: number }) => request<Candidate>("/backtests", json(body, { "idempotency-key": idempotencyKey() }), normalizeCandidate),
  backtest: (body: { leaderboardScopeId: string; strategyDefinitionIds: string[]; selectionMode?: "SINGLE" | "COMPOSITE"; compositeDefinitionId?: string; maxAttempts?: number }) => api.startBacktest(body),
  candidate: (id: string) => request<Candidate>(`/backtests/${encodeURIComponent(id)}`, {}, normalizeCandidate),
  attempt: (id: string) => request<AttemptProgress>(`/backtest-attempts/${encodeURIComponent(id)}`, {}, (value) => dto<AttemptProgress>(value, "attempt")),
  attemptTrades: (id: string, page: { limit?: number; cursor?: string } = {}) => request<TradePage>(`/backtest-attempts/${encodeURIComponent(id)}/trades${query({ limit: page.limit ?? 25, cursor: page.cursor })}`, {}, normalizeTradePage),
  cancelBacktest: (id: string) => request<void>(`/backtests/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  cancel: (id: string) => api.cancelBacktest(id),
  experiment: (id: string) => request<ExperimentSummary>(`/experiments/${encodeURIComponent(id)}`, {}, normalizeExperiment),
  experimentTrades: (id: string, page: { limit?: number; cursor?: string } = {}) => request<TradePage>(`/experiments/${encodeURIComponent(id)}/trades${query({ limit: page.limit ?? 25, cursor: page.cursor })}`, {}, normalizeTradePage),
  visualization: (id: string, options: VisualizationRequest = {}) => request<ExperimentVisualization>(`/experiments/${encodeURIComponent(id)}/visualization${query(options)}`, {}, (value) => normalizeVisualization(value, id)),
  replay: (id: string) => request<ReplayVerificationAccepted>(`/experiments/${encodeURIComponent(id)}/replay-verifications`, { method: "POST" }, normalizeReplayAccepted),
  replayStatus: (id: string) => request<ReplayVerificationResult>(`/replay-verifications/${encodeURIComponent(id)}`, {}, normalizeReplayResult),
  startSearch: (body: StartSearchRequest) => request<{ searchRunId: string }>("/search-runs", json({ leaderboardScopeId: body.leaderboardScopeId, strategyDefinitionIds: body.strategyDefinitionIds, generatorType: body.generatorType, maxInFlight: body.maxInFlight, maxComponents: body.maxComponents, ...(body.domainRules === undefined ? {} : { domainRules: body.domainRules }), ...body.stopCondition }), (value) => dto<{ searchRunId: string }>(value, "search submission")),
  search: (body: StartSearchRequest) => api.startSearch(body),
  searchStatus: (id: string) => request<LoopStatus>(`/search-runs/${encodeURIComponent(id)}`, {}, (value) => dto<LoopStatus>(value, "search status")),
  searchLeaderboard: (id: string) => request<SearchRankingEntry[]>(`/search-runs/${encodeURIComponent(id)}/leaderboard`, {}, (value) => arrayDto<unknown>(value, "search ranking").map(normalizeSearchRanking)),
  searchCandidates: (id: string, page: { limit?: number; cursor?: string } = {}) => request<CandidatePage>(`/search-runs/${encodeURIComponent(id)}/candidates${query({ limit: page.limit ?? 25, cursor: page.cursor })}`, {}, (value) => { const raw = dto<Record<string, unknown>>(value, "search candidates"); if (!Array.isArray(raw.items)) throw new ApiError(502, "Backend returned an invalid search candidates response.", "INVALID_DTO"); return { items: raw.items.map(normalizeCandidate), ...(raw.nextCursor === undefined ? {} : { nextCursor: textField(raw.nextCursor, "search candidates") }), ...(raw.totalCount === undefined ? {} : { totalCount: finiteField(raw.totalCount, "search candidates") }) }; }),
  controlSearch: (id: string, action: "pause" | "resume" | "cancel") => request<void>(`/search-runs/${encodeURIComponent(id)}/${action}`, { method: "POST" }),
  pauseSearch: (id: string) => api.controlSearch(id, "pause"),
  resumeSearch: (id: string) => api.controlSearch(id, "resume"),
  cancelSearch: (id: string) => api.controlSearch(id, "cancel"),
  leaderboard: (scopeId: string) => request<LeaderboardEntry[]>(`/leaderboard${query({ scopeId })}`, {}, (value) => arrayDto<unknown>(value, "leaderboard").map(normalizeLeaderboardEntry)),
  news: () => request<NewsItem[]>("/news", {}, (value) => arrayDto<NewsItem>(value, "news")),
  newsTemplates: () => request<ExtractionTemplate[]>("/news/templates", {}, (value) => arrayDto<ExtractionTemplate>(value, "news extraction templates")),
  applyNewsTemplate: (domain: string, version: string) => request<ExtractionTemplate>("/news/templates/apply", json({ domain, version })),
  healNewsTemplate: (domain: string, html?: string, autoApply?: boolean) => request<ExtractionTemplate>("/news/templates/heal", json({ domain, html, autoApply })),
  collectNews: (payload?: { sourceType?: string; sources?: Array<{ name: string; url: string; type: string }>; html?: string; coin?: string; autoHealing?: boolean }) => request<void>("/news/collect", payload ? json(payload) : { method: "POST" }),
};

export type NewsItem = { id: string; title: string; content: string; source: string; publishedAt: string; crawledAt: string; relatedCoins: string[]; url: string; sentiment?: { newsId: string; label: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; score: number; modelName: string; modelVersion: string; analyzedAt: string } };

export type ExtractionTemplate = {
  id: string;
  domain: string;
  version: string;
  selectors: {
    container: string;
    title: string;
    summary: string;
    link: string;
    time: string;
    tags?: string;
  };
  sampleHtmlSnippet?: string;
  confidence: number;
  defectRate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export function mapGenerationError(error: unknown): { kind: GenerationErrorKind; message: string } {
  const apiError = error instanceof ApiError ? error : undefined;
  const record = isRecord(error) ? error : undefined;
  const code = apiError?.code ?? (typeof record?.code === "string" ? record.code : undefined);
  const message = apiError?.message ?? (typeof record?.message === "string" ? record.message : error instanceof Error ? error.message : "Strategy generation failed.");
  const value = `${code ?? ""} ${message}`.toUpperCase();
  if (/SOURCE|URL|FETCH|SSRF|UNSAFE|REDIRECT|TIMEOUT_SOURCE/.test(value)) return { kind: "SOURCE", message };
  if (/SCHEMA|MALFORMED|OUTPUT/.test(value)) return { kind: "SCHEMA", message };
  if (/MODEL|LLM|PROVIDER|TIMEOUT_MODEL|UNAVAILABLE/.test(value)) return { kind: "MODEL", message };
  if (/VALIDATION|STRATEGY|PARAMETER|WEIGHT|THRESHOLD/.test(value)) return { kind: "VALIDATION", message };
  return { kind: "UNKNOWN", message };
}

type MarketSubscriber = { onMessage: (message: MarketWireMessage) => void; onState: (state: string) => void; subscriptions: MarketSubscription[]; reconcile?: () => Promise<void> | void };
type SharedMarketSocket = { socket: Socket; subscribers: Set<MarketSubscriber>; subscriptions: Map<string, MarketSubscription>; queued: MarketWireMessage[]; reconnecting: boolean; reconciling: boolean; reconciliationFailed: boolean };
let sharedMarket: SharedMarketSocket | undefined;
const subscriptionKey = (subscription: MarketSubscription): string => `${subscription.pair}|${subscription.timeframe}`;
const uniqueSubscriptions = (subscribers: Set<MarketSubscriber>): Map<string, MarketSubscription> => new Map([...subscribers].flatMap((subscriber) => subscriber.subscriptions.map((subscription) => [subscriptionKey(subscription), subscription] as const)));
const notifyMarketState = (state: string): void => sharedMarket?.subscribers.forEach((subscriber) => subscriber.onState(state));
const emitSubscriptions = (action: "SUBSCRIBE" | "UNSUBSCRIBE", subscriptions: MarketSubscription[]): void => { if (!sharedMarket || !subscriptions.length) return; sharedMarket.socket.emit("market", { schemaVersion: 1, action, requestId: idempotencyKey(), subscriptions }); };
const reconcileMarket = async (): Promise<void> => {
  const current = sharedMarket; if (!current || current.reconciling) return;
  current.reconciling = true;
  try {
    await Promise.all([...current.subscribers].map((subscriber) => subscriber.reconcile ? Promise.resolve(subscriber.reconcile()) : Promise.resolve()));
    current.reconciliationFailed = false;
    current.queued.splice(0).forEach((message) => current.subscribers.forEach((subscriber) => subscriber.onMessage(message)));
    if (sharedMarket === current) notifyMarketState("CONNECTED");
  } catch {
    current.reconciliationFailed = true;
    if (sharedMarket === current) notifyMarketState("ERROR");
  } finally { current.reconciling = false; }
};
const createSharedMarketSocket = (): SharedMarketSocket => {
  const shared: SharedMarketSocket = { socket: io(`${base}/market`, { transports: ["websocket"], auth: { token: session.token }, reconnection: true, reconnectionAttempts: 6, reconnectionDelay: 500, reconnectionDelayMax: 8_000, randomizationFactor: 0 }), subscribers: new Set(), subscriptions: new Map(), queued: [], reconnecting: false, reconciling: false, reconciliationFailed: false };
  shared.socket.on("connect", () => { const wasReconnect = shared.reconnecting; shared.reconnecting = false; shared.subscriptions = uniqueSubscriptions(shared.subscribers); emitSubscriptions("SUBSCRIBE", [...shared.subscriptions.values()]); if (wasReconnect) { shared.reconciliationFailed = false; notifyMarketState("RECONNECTING"); void reconcileMarket(); } else notifyMarketState("CONNECTED"); });
  shared.socket.on("market", (message: MarketWireMessage) => { if (shared.reconciling || shared.reconciliationFailed) shared.queued.push(message); else shared.subscribers.forEach((subscriber) => subscriber.onMessage(message)); });
  shared.socket.on("connect_error", () => { shared.reconnecting = true; notifyMarketState("RECONNECTING"); });
  shared.socket.on("disconnect", (reason) => { if (reason !== "io client disconnect") { shared.reconnecting = true; notifyMarketState("RECONNECTING"); } });
  shared.socket.io.on("reconnect_attempt", () => { shared.reconnecting = true; notifyMarketState("RECONNECTING"); });
  shared.socket.io.on("reconnect_failed", () => { shared.reconnecting = false; notifyMarketState("ERROR"); });
  return shared;
};

export function marketSocket(onMessage: (message: MarketWireMessage) => void, onState: (state: string) => void, subscriptions: MarketSubscription[], options: { reconcile?: () => Promise<void> | void } = {}): () => void {
  onState("CONNECTING");
  if (!sharedMarket) sharedMarket = createSharedMarketSocket();
  const subscriber: MarketSubscriber = { onMessage, onState, subscriptions, reconcile: options.reconcile };
  const previous = sharedMarket.subscriptions;
  sharedMarket.subscribers.add(subscriber); sharedMarket.subscriptions = uniqueSubscriptions(sharedMarket.subscribers);
  if (sharedMarket.socket.connected) emitSubscriptions("SUBSCRIBE", [...sharedMarket.subscriptions].filter(([key]) => !previous.has(key)).map(([, value]) => value));
  return () => {
    const current = sharedMarket; if (!current || !current.subscribers.delete(subscriber)) return;
    const next = uniqueSubscriptions(current.subscribers); const removed = [...current.subscriptions].filter(([key]) => !next.has(key)).map(([, value]) => value); current.subscriptions = next; emitSubscriptions("UNSUBSCRIBE", removed);
    onState("DISCONNECTED");
    if (!current.subscribers.size) { current.socket.disconnect(); sharedMarket = undefined; }
  };
}

export function disconnectMarketSocket(): void { const current = sharedMarket; if (!current) return; current.subscribers.forEach((subscriber) => subscriber.onState("DISCONNECTED")); current.subscribers.clear(); current.socket.disconnect(); sharedMarket = undefined; }
