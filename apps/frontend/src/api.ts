import { io, type Socket } from "socket.io-client";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type Signal = "BUY" | "SELL" | "HOLD";
export type CombinationMethod = "MAJORITY_VOTE" | "WEIGHTED_SCORE";
export type GeneratorType = "RANDOM" | "DOMAIN_GUIDED" | "GENETIC";
export type ApiCandle = { pair: string; timeframe: Timeframe; timestamp: string; open: number; high: number; low: number; close: number; volume: number; isClosed: boolean; source?: string };
export type MarketTick = { pair: string; price: number; quantity: number; timestamp: string; side: "BUY" | "SELL" };
export type MarketConnectionStatus = { provider: string; status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED"; lastEventAt?: string; errorCode?: string };
export type MarketCapabilities = { provider: string; pairs: string[]; timeframes: Timeframe[] };

export type StrategyParameterDescriptor = { key: string; label: string; type: "INTEGER" | "NUMBER" | "ENUM"; required: boolean; defaultValue: number | string; minimum?: number; maximum?: number; step?: number; options?: string[] };
export type StrategyDescriptor = { name: string; displayName: string; description: string; category: string; implementationVersion: string; implementationSha256: string; minimumHistoryCandles: number; parameters: StrategyParameterDescriptor[] };
export type StrategyDefinition = { id: string; userId: string; logicalFamilyKey: string; strategyName: string; parameters: Record<string, number | string>; version: number; createdAt: string; familyName?: string; implementationVersion: string; implementationSha256: string };
export type Composite = { id: string; userId: string; logicalFamilyKey: string; method: CombinationMethod; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number }; version: number; createdAt: string };

export type StrategyVisualizationOverlay =
  | { id: string; strategyDefinitionId: string; kind: "LINE"; label: string; points: Array<{ time: string; value: number }> }
  | { id: string; strategyDefinitionId: string; kind: "ZONE"; label: string; points: Array<{ time: string; low: number; high: number }> }
  | { id: string; strategyDefinitionId: string; kind: "SIGNAL"; label: string; points: Array<{ time: string; value: number; signal: Signal }> };
export type StrategyGenerationResult = { generationId: string; kind: "SINGLE" | "COMPOSITE"; strategyDefinition?: StrategyDefinition; compositeStrategyDefinition?: Composite; modelName?: string; modelVersion?: string; promptVersion?: string };

export type DatasetSnapshotRef = { id: string; pair?: string; timeframe?: Timeframe; range?: { from: string; to: string }; candleCount?: number; sha256?: string; createdAt?: string };
export type Scope = { id: string; name: string; version?: number; pair: string; timeframe: Timeframe; datasetRange: { from: string; to: string }; datasetSnapshotId: string; datasetSnapshot?: DatasetSnapshotRef; initialCapital: number; feeRatePercent: number; slippageBps: number; scoreFormulaId: string; createdAt: string; riskPolicy?: { stopLossPercent?: number; takeProfitPercent?: number } };
export type AttemptProgress = { attemptId: string; attemptNumber: number; status: string; startedAt?: string; completedAt?: string; failureCode?: string; errorMessage?: string };
export type Candidate = { candidateId: string; origin?: "MANUAL" | "SEARCH"; selectionMode?: "SINGLE" | "COMPOSITE"; searchRunId?: string; iterationNumber?: number; leaderboardScopeId?: string; status: string; attempts?: AttemptProgress[]; maxAttempts?: number; experimentResultId?: string; failureKind?: string; failureCode?: string; lastError?: string; updatedAt?: string; createdAt?: string };
export type Trade = { id: string; sequence: number; pair: string; settlementAsset?: string; backtestAttemptId?: string; signal: "LONG" | "SHORT"; entryTime: string; marketEntryPrice?: number; entryPrice: number; stopLoss?: number | null; takeProfit?: number | null; exitTime: string; marketExitPrice?: number; exitPrice: number; exitReason?: string; quantity?: number; notionalEntryValue?: number; equityBeforeTrade?: number; equityAfterTrade?: number; grossProfit?: number; feeAmount?: number; slippageBps?: number; slippageAmount?: number; profit?: number; resultPercent: number; result: "WIN" | "LOSS" | "BREAKEVEN" };
export type TradePage = { items: Trade[]; nextCursor?: string; totalCount?: number; total?: number };
export type ExperimentMetrics = { candidateId?: string; totalReturnPercent?: number; winRatePercent?: number; numberOfTrades?: number; maxDrawdownPercent?: number; profitFactor?: number | null; profitFactorStatus?: "FINITE" | "NO_TRADES" | "NO_LOSSES" | "NO_GROSS_MOVEMENT"; sharpeRatio?: number; sharpeRatioStatus?: string };
export type ExperimentSummary = { id: string; candidateId?: string; searchRunId?: string; leaderboardScopeId: string; compositeDefinitionId?: string; compositeDefinition?: Composite; strategyDefinitions?: StrategyDefinition[]; datasetSnapshot?: DatasetSnapshotRef; metrics: ExperimentMetrics; overallScore?: number; rankEligible?: boolean; rankEligibilityReason?: string; createdAt?: string };
export type VisualizationMarker = { id: string; tradeId: string; sequence: number; kind: "ENTRY" | "STOP_LOSS" | "TAKE_PROFIT" | "EXIT"; time: string; price: number; highlighted: boolean };
export type ExperimentVisualization = { experimentId: string; datasetSnapshot?: DatasetSnapshotRef; candles: ApiCandle[]; overlays: StrategyVisualizationOverlay[]; markers: VisualizationMarker[]; nextCursor?: string };

export type StopCondition = { maxCandidates?: number; maxDurationSeconds?: number; noImprovementAfterIterations?: number };
export type LoopStatus = { searchRunId: string; state: "CREATED" | "RUNNING" | "PAUSED" | "COMPLETED" | "CANCELLED" | "FAILED"; activeCandidates: Candidate[]; queuedCount: number; runningCount: number; candidatesTested: number; failedCandidateCount: number; retryExhaustedCandidateCount?: number; infrastructureFailureCandidateCount?: number; completionProcessingFailureCandidateCount?: number; failedAttemptCount?: number; averageBacktestDurationMs?: number | null; currentTopEntry?: SearchRankingEntry; createdAt: string; startedAt?: string; updatedAt: string; endedAt?: string; stopReason?: "MAX_CANDIDATES" | "MAX_DURATION" | "NO_IMPROVEMENT" | "USER_CANCELLED" | "ERROR"; stopCondition: StopCondition; lastError?: string };
export type SearchRankingEntry = { id?: string; rank: number; searchRunId: string; leaderboardScopeId: string; candidateId: string; experimentResultId: string; scoreFormulaId: string; score: number };
export type LeaderboardEntry = SearchRankingEntry & { overallScore?: number; status?: string };
export type StartSearchRequest = { leaderboardScopeId: string; strategyDefinitionIds: string[]; generatorType: GeneratorType; maxInFlight: number; maxComponents?: number; stopCondition: StopCondition };
export type CandidatePage = { items: Candidate[]; nextCursor?: string; totalCount?: number };
export type VisualizationRequest = { limit?: number; cursor?: string; from?: string; to?: string; highlightTradeId?: string };
export type ReadCandlesQuery = { pair: string; timeframe: Timeframe; limit?: number; cursor?: string; from?: string; to?: string; includeForming?: boolean; completeness?: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE" };
export type ReadCandlesResult = { pair: string; timeframe: Timeframe; candles: ApiCandle[]; range: { from: string; to: string }; complete: boolean; missingRanges?: Array<{ from: string; to: string }>; formingIncluded?: boolean; asOf: string; nextCursor?: string };

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

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object";
const dto = <T>(value: unknown, label: string): T => { if (!isRecord(value)) throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); return value as T; };
const arrayDto = <T>(value: unknown, label: string): T[] => { if (!Array.isArray(value)) throw new ApiError(502, `Backend returned an invalid ${label} response.`, "INVALID_DTO"); return value as T[]; };
const normalizeDefinition = (value: unknown): StrategyDefinition => { const raw = dto<Record<string, unknown>>(value, "strategy definition"); return { ...raw, id: String(raw.id ?? ""), userId: String(raw.userId ?? ""), logicalFamilyKey: String(raw.logicalFamilyKey ?? ""), strategyName: String(raw.strategyName ?? ""), parameters: isRecord(raw.parameters) ? raw.parameters as Record<string, number | string> : {}, version: Number(raw.version ?? 0), createdAt: String(raw.createdAt ?? ""), implementationVersion: String(raw.implementationVersion ?? ""), implementationSha256: String(raw.implementationSha256 ?? "") } as StrategyDefinition; };
const normalizeComposite = (value: unknown): Composite => { const raw = dto<Record<string, unknown>>(value, "composite strategy"); return { ...raw, id: String(raw.id ?? ""), userId: String(raw.userId ?? ""), logicalFamilyKey: String(raw.logicalFamilyKey ?? ""), method: raw.method as CombinationMethod, components: Array.isArray(raw.components) ? raw.components as Composite["components"] : [], version: Number(raw.version ?? 0), createdAt: String(raw.createdAt ?? "") } as Composite; };
const normalizeDescriptor = (value: unknown): StrategyDescriptor => { const raw = dto<Record<string, unknown>>(value, "strategy descriptor"); return { ...raw, name: String(raw.name ?? ""), displayName: String(raw.displayName ?? raw.name ?? ""), description: String(raw.description ?? ""), category: String(raw.category ?? ""), implementationVersion: String(raw.implementationVersion ?? ""), implementationSha256: String(raw.implementationSha256 ?? ""), minimumHistoryCandles: Number(raw.minimumHistoryCandles ?? 0), parameters: Array.isArray(raw.parameters) ? raw.parameters as StrategyParameterDescriptor[] : [] } as StrategyDescriptor; };
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
  marketCapabilities: () => request<MarketCapabilities>("/market/pairs", {}, (value) => dto<MarketCapabilities>(value, "market capabilities")),
  readCandles: (input: ReadCandlesQuery) => request<ReadCandlesResult>(`/market/candles${query(input)}`, {}, (value) => dto<ReadCandlesResult>(value, "candle history")),
  candles: (pair: string, timeframe: Timeframe, limit?: number) => api.readCandles({ pair, timeframe, ...(limit === undefined ? {} : { limit }) }),
  snapshot: (body: { pair: string; timeframe: Timeframe; from: string; to: string }) => request<{ id: string }>("/market/snapshots", json(body), (value) => dto<{ id: string }>(value, "snapshot")),
  scopes: () => request<Scope[]>("/leaderboard-scopes", {}, (value) => arrayDto<unknown>(value, "benchmark scopes") as Scope[]),
  createScope: (body: unknown) => request<Scope>("/leaderboard-scopes", json(body), (value) => dto<Scope>(value, "benchmark scope")),
  startBacktest: (body: { leaderboardScopeId: string; strategyDefinitionIds: string[]; selectionMode?: "SINGLE" | "COMPOSITE"; compositeDefinitionId?: string; maxAttempts?: number }) => request<Candidate>("/backtests", json(body, { "idempotency-key": idempotencyKey() }), (value) => dto<Candidate>(value, "backtest submission")),
  backtest: (body: { leaderboardScopeId: string; strategyDefinitionIds: string[]; selectionMode?: "SINGLE" | "COMPOSITE"; compositeDefinitionId?: string; maxAttempts?: number }) => api.startBacktest(body),
  candidate: (id: string) => request<Candidate>(`/backtests/${encodeURIComponent(id)}`, {}, (value) => dto<Candidate>(value, "candidate progress")),
  attempt: (id: string) => request<AttemptProgress>(`/backtest-attempts/${encodeURIComponent(id)}`, {}, (value) => dto<AttemptProgress>(value, "attempt")),
  attemptTrades: (id: string, page: { limit?: number; cursor?: string } = {}) => request<TradePage>(`/backtest-attempts/${encodeURIComponent(id)}/trades${query({ limit: page.limit ?? 25, cursor: page.cursor })}`, {}, (value) => dto<TradePage>(value, "attempt trades")),
  cancelBacktest: (id: string) => request<void>(`/backtests/${encodeURIComponent(id)}/cancel`, { method: "POST" }),
  cancel: (id: string) => api.cancelBacktest(id),
  experiment: (id: string) => request<ExperimentSummary>(`/experiments/${encodeURIComponent(id)}`, {}, (value) => dto<ExperimentSummary>(value, "experiment")),
  experimentTrades: (id: string, page: { limit?: number; cursor?: string } = {}) => request<TradePage>(`/experiments/${encodeURIComponent(id)}/trades${query({ limit: page.limit ?? 25, cursor: page.cursor })}`, {}, (value) => dto<TradePage>(value, "experiment trades")),
  visualization: (id: string, options: VisualizationRequest = {}) => request<ExperimentVisualization>(`/experiments/${encodeURIComponent(id)}/visualization${query(options)}`, {}, (value) => { const raw = dto<Record<string, unknown>>(value, "experiment visualization"); return { ...raw, experimentId: String(raw.experimentId ?? id), candles: Array.isArray(raw.candles) ? raw.candles as ApiCandle[] : [], overlays: Array.isArray(raw.overlays) ? raw.overlays as StrategyVisualizationOverlay[] : [], markers: Array.isArray(raw.markers) ? raw.markers as VisualizationMarker[] : [] } as ExperimentVisualization; }),
  replay: (id: string) => request<{ status: string; comparedTradeCount: number }>(`/experiments/${encodeURIComponent(id)}/replay`, { method: "POST" }, (value) => dto<{ status: string; comparedTradeCount: number }>(value, "replay")),
  startSearch: (body: StartSearchRequest) => request<{ searchRunId: string }>("/search-runs", json({ leaderboardScopeId: body.leaderboardScopeId, strategyDefinitionIds: body.strategyDefinitionIds, generatorType: body.generatorType, maxInFlight: body.maxInFlight, maxComponents: body.maxComponents, ...body.stopCondition }), (value) => dto<{ searchRunId: string }>(value, "search submission")),
  search: (body: StartSearchRequest) => api.startSearch(body),
  searchStatus: (id: string) => request<LoopStatus>(`/search-runs/${encodeURIComponent(id)}`, {}, (value) => dto<LoopStatus>(value, "search status")),
  searchLeaderboard: (id: string) => request<SearchRankingEntry[]>(`/search-runs/${encodeURIComponent(id)}/leaderboard`, {}, (value) => arrayDto<SearchRankingEntry>(value, "search ranking")),
  searchCandidates: (id: string, page: { limit?: number; cursor?: string } = {}) => request<CandidatePage>(`/search-runs/${encodeURIComponent(id)}/candidates${query({ limit: page.limit ?? 25, cursor: page.cursor })}`, {}, (value) => dto<CandidatePage>(value, "search candidates")),
  controlSearch: (id: string, action: "pause" | "resume" | "cancel") => request<void>(`/search-runs/${encodeURIComponent(id)}/${action}`, { method: "POST" }),
  pauseSearch: (id: string) => api.controlSearch(id, "pause"),
  resumeSearch: (id: string) => api.controlSearch(id, "resume"),
  cancelSearch: (id: string) => api.controlSearch(id, "cancel"),
  leaderboard: (scopeId: string) => request<LeaderboardEntry[]>(`/leaderboard${query({ scopeId })}`, {}, (value) => arrayDto<LeaderboardEntry>(value, "leaderboard")),
  news: () => request<NewsItem[]>("/news", {}, (value) => arrayDto<NewsItem>(value, "news")),
  sentiment: (newsId: string) => request<unknown>(`/sentiment/news/${encodeURIComponent(newsId)}`),
  collectNews: () => request<void>("/news/collect", { method: "POST" }),
};

export type NewsItem = { id: string; title: string; content: string; source: string; publishedAt: string; crawledAt: string; relatedCoins: string[]; url: string; sentiment?: { newsId: string; label: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; score: number; modelName: string; modelVersion: string; analyzedAt: string } };

export function mapGenerationError(error: unknown): { kind: GenerationErrorKind; message: string } {
  const apiError = error instanceof ApiError ? error : undefined;
  const record = isRecord(error) ? error : undefined;
  const code = apiError?.code ?? (typeof record?.code === "string" ? record.code : undefined);
  const message = apiError?.message ?? (typeof record?.message === "string" ? record.message : error instanceof Error ? error.message : "Strategy generation failed.");
  const value = `${code ?? ""} ${message}`.toUpperCase();
  if (/SOURCE|URL|FETCH|SSRF|UNSAFE|REDIRECT|TIMEOUT_SOURCE/.test(value)) return { kind: "SOURCE", message };
  if (/MODEL|LLM|PROVIDER|TIMEOUT_MODEL|UNAVAILABLE/.test(value)) return { kind: "MODEL", message };
  if (/SCHEMA|MALFORMED|OUTPUT/.test(value)) return { kind: "SCHEMA", message };
  if (/VALIDATION|STRATEGY|PARAMETER|WEIGHT|THRESHOLD/.test(value)) return { kind: "VALIDATION", message };
  return { kind: "UNKNOWN", message };
}

type MarketSubscriber = { onMessage: (message: MarketWireMessage) => void; onState: (state: string) => void; subscriptions: MarketSubscription[]; reconcile?: () => Promise<void> | void };
type SharedMarketSocket = { socket: Socket; subscribers: Set<MarketSubscriber>; subscriptions: Map<string, MarketSubscription>; queued: MarketWireMessage[]; reconnecting: boolean; reconciling: boolean };
let sharedMarket: SharedMarketSocket | undefined;
const subscriptionKey = (subscription: MarketSubscription): string => `${subscription.pair}|${subscription.timeframe}`;
const uniqueSubscriptions = (subscribers: Set<MarketSubscriber>): Map<string, MarketSubscription> => new Map([...subscribers].flatMap((subscriber) => subscriber.subscriptions.map((subscription) => [subscriptionKey(subscription), subscription] as const)));
const notifyMarketState = (state: string): void => sharedMarket?.subscribers.forEach((subscriber) => subscriber.onState(state));
const emitSubscriptions = (action: "SUBSCRIBE" | "UNSUBSCRIBE", subscriptions: MarketSubscription[]): void => { if (!sharedMarket || !subscriptions.length) return; sharedMarket.socket.emit("market", { schemaVersion: 1, action, requestId: idempotencyKey(), subscriptions }); };
const reconcileMarket = async (): Promise<void> => {
  const current = sharedMarket; if (!current || current.reconciling) return;
  current.reconciling = true;
  try { await Promise.all([...current.subscribers].map((subscriber) => subscriber.reconcile ? Promise.resolve(subscriber.reconcile()) : Promise.resolve())); current.queued.splice(0).forEach((message) => current.subscribers.forEach((subscriber) => subscriber.onMessage(message))); }
  finally { current.reconciling = false; if (sharedMarket === current) notifyMarketState("CONNECTED"); }
};
const createSharedMarketSocket = (): SharedMarketSocket => {
  const shared: SharedMarketSocket = { socket: io(`${base}/market`, { transports: ["websocket"], auth: { token: session.token }, reconnection: true, reconnectionAttempts: 6, reconnectionDelay: 500, reconnectionDelayMax: 8_000, randomizationFactor: 0 }), subscribers: new Set(), subscriptions: new Map(), queued: [], reconnecting: false, reconciling: false };
  shared.socket.on("connect", () => { const wasReconnect = shared.reconnecting; shared.reconnecting = false; shared.subscriptions = uniqueSubscriptions(shared.subscribers); emitSubscriptions("SUBSCRIBE", [...shared.subscriptions.values()]); if (wasReconnect) { notifyMarketState("RECONNECTING"); void reconcileMarket(); } else notifyMarketState("CONNECTED"); });
  shared.socket.on("market", (message: MarketWireMessage) => { if (shared.reconciling) shared.queued.push(message); else shared.subscribers.forEach((subscriber) => subscriber.onMessage(message)); });
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
