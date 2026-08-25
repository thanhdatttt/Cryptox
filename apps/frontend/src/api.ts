import { io } from "socket.io-client";

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";
export type ApiCandle = { pair: string; timeframe: Timeframe; timestamp: string; open: number; high: number; low: number; close: number; volume: number; isClosed: boolean };
export type StrategyDescriptor = { name: string; displayName: string; description: string; category: string; parameters: Array<{ key: string; label: string; type: string; required: boolean; defaultValue: number | string; minimum?: number; maximum?: number; step?: number; options?: string[] }> };
export type StrategyDefinition = { id: string; strategyName: string; parameters: Record<string, number | string>; version: number; createdAt: string; familyName?: string };
export type Composite = { id: string; method: string; components: Array<{ strategyDefinitionId: string; weight: number }>; thresholds?: { buy: number; sell: number }; createdAt: string };
export type Scope = { id: string; name: string; pair: string; timeframe: Timeframe; datasetRange: { from: string; to: string }; datasetSnapshotId: string; initialCapital: number; feeRatePercent: number; slippageBps: number; scoreFormulaId: string; createdAt: string };
export type Candidate = { candidateId: string; status: string; attempts: Array<{ attemptId: string; attemptNumber: number; status: string }>; experimentResultId?: string; lastError?: string; updatedAt: string };

const runtimeEnv = (import.meta as ImportMeta & { env?: { VITE_BACKEND_URL?: string } }).env;
const base = runtimeEnv?.VITE_BACKEND_URL?.replace(/\/$/, "") || "http://localhost:3000";
const storage = typeof localStorage === "undefined" ? undefined : localStorage;
let token = storage?.getItem("cryptox.token") ?? null;
export const session = { get token() { return token; }, set(value: string | null) { token = value; value ? storage?.setItem("cryptox.token", value) : storage?.removeItem("cryptox.token"); } };

export class ApiError extends Error { constructor(public readonly status: number, message: string) { super(message); } }
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers); headers.set("content-type", "application/json"); if (token) headers.set("authorization", `Bearer ${token}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (!response.ok) { let message = `Request failed (${response.status})`; try { const body = await response.json(); message = body.message || body.error || message; } catch { /* non-json error */ } if (response.status === 401) session.set(null); throw new ApiError(response.status, message); }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
const json = (body: unknown, extra?: HeadersInit): RequestInit => ({ method: "POST", body: JSON.stringify(body), headers: extra });
export const api = {
  register: (email: string, password: string) => request<void>("/auth/register", json({ email, password })),
  login: async (email: string, password: string) => { const result = await request<{ token: string }>("/auth/login", json({ email, password })); session.set(result.token); return request<{ userId: string }>("/auth/me"); },
  me: () => request<{ userId: string }>("/auth/me"),
  strategies: () => request<StrategyDescriptor[]>("/strategies"),
  definitions: () => request<StrategyDefinition[]>("/strategies/definitions"),
  define: (strategyName: string, parameters: Record<string, number | string>) => request<StrategyDefinition>("/strategies", json({ strategyName, parameters })),
  composites: () => request<Composite[]>("/strategies/composites"),
  defineComposite: (method: string, components: Array<{ strategyDefinitionId: string; weight: number }>) => request<Composite>("/strategies/composites", json({ method, components })),
  generateStrategy: (body: { sourceType: "TEXT"; text: string } | { sourceType: "URL"; url: string }) => request<any>("/strategy-generations", json(body)),
  candles: (pair: string, timeframe: Timeframe, limit = 1000) => request<{ candles: ApiCandle[]; range: { from: string; to: string }; complete: boolean; asOf: string }>(`/market/candles?pair=${encodeURIComponent(pair)}&timeframe=${timeframe}&limit=${limit}`),
  snapshot: (body: { pair: string; timeframe: Timeframe; from: string; to: string }) => request<{ id: string }>("/market/snapshots", json(body)),
  scopes: () => request<Scope[]>("/leaderboard-scopes"),
  createScope: (body: unknown) => request<Scope>("/leaderboard-scopes", json(body)),
  backtest: (body: unknown) => request<{ candidateId: string; status: string }>("/backtests", json(body, { "idempotency-key": crypto.randomUUID() })),
  candidate: (id: string) => request<Candidate>(`/backtests/${id}`),
  attempt: (id: string) => request<any>(`/backtest-attempts/${id}`),
  attemptTrades: (id: string) => request<{ items: any[]; nextCursor?: string }>(`/backtest-attempts/${id}/trades?limit=100`),
  cancel: (id: string) => request<void>(`/backtests/${id}/cancel`, { method: "POST" }),
  experiment: (id: string) => request<any>(`/experiments/${id}`),
  experimentTrades: (id: string) => request<{ items: any[]; nextCursor?: string }>(`/experiments/${id}/trades?limit=100`),
  visualization: (id: string) => request<any>(`/experiments/${id}/visualization?limit=1000`),
  replay: (id: string) => request<any>(`/experiments/${id}/replay`, { method: "POST" }),
  search: (body: unknown) => request<{ searchRunId: string }>("/search-runs", json(body)),
  searchStatus: (id: string) => request<any>(`/search-runs/${id}`),
  searchLeaderboard: (id: string) => request<any[]>(`/search-runs/${id}/leaderboard`),
  searchCandidates: (id: string) => request<{ items: Candidate[] }>(`/search-runs/${id}/candidates?limit=100`),
  pauseSearch: (id: string) => request<void>(`/search-runs/${id}/pause`, { method: "POST" }),
  resumeSearch: (id: string) => request<void>(`/search-runs/${id}/resume`, { method: "POST" }),
  cancelSearch: (id: string) => request<void>(`/search-runs/${id}/cancel`, { method: "POST" }),
  leaderboard: (scopeId: string) => request<any[]>(`/leaderboard?scopeId=${encodeURIComponent(scopeId)}`),
  news: () => request<any[]>("/news"),
  sentiment: (newsId: string) => request<any>(`/sentiment/news/${newsId}`),
  collectNews: () => request<void>("/news/collect", { method: "POST" }),
};

export function marketSocket(onMessage: (message: any) => void, onState: (state: string) => void, subscriptions: Array<{ pair: string; timeframe: Timeframe }>): () => void {
  onState("CONNECTING"); const socket = io(`${base}/market`, { transports: ["websocket"], auth: { token }, reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 500, reconnectionDelayMax: 5000 });
  socket.on("connect", () => { onState("CONNECTED"); socket.emit("market", { schemaVersion: 1, action: "SUBSCRIBE", requestId: crypto.randomUUID(), subscriptions }); });
  socket.on("market", onMessage); socket.on("connect_error", () => onState("ERROR")); socket.io.on("reconnect_attempt", () => onState("RECONNECTING")); socket.on("disconnect", reason => { if (reason !== "io client disconnect") onState("RECONNECTING"); });
  return () => { socket.disconnect(); onState("DISCONNECTED"); };
}
