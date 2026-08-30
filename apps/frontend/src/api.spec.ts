import { beforeEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import { api, mapGenerationError, marketSocket, session } from "./api";

vi.mock("socket.io-client", () => ({ io: vi.fn() }));

const response = (body: unknown, status = 200) => new Response(body === undefined ? undefined : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("frontend backend transport", () => {
  beforeEach(() => { session.set(null); vi.clearAllMocks(); });

  it("persists the token returned by login and sends it to /me", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ token: "jwt-test" }))
      .mockResolvedValueOnce(response({ userId: "user-test" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.login("student@example.com", "password123")).resolves.toEqual({ userId: "user-test" });
    expect(session.token).toBe("jwt-test");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: expect.any(Headers) });
    expect(new Headers((fetchMock.mock.calls[1][1] as RequestInit).headers).get("authorization")).toBe("Bearer jwt-test");
  });

  it("accepts successful empty register/collection responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response(undefined, 201));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.register("student@example.com", "password123")).resolves.toBeUndefined();
    await expect(api.collectNews()).resolves.toBeUndefined();
  });

  it("sends prompt generation through the authenticated backend contract and preserves provenance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ generationId: "generation-1", kind: "SINGLE", strategyDefinition: { id: "definition-1", userId: "user-test", logicalFamilyKey: "rsi", strategyName: "RSI", implementationVersion: "1.0.0", implementationSha256: "a".repeat(64), parameters: { period: 14 }, version: 1, createdAt: "2025-01-01T00:00:00.000Z" }, modelName: "LOCAL_DETERMINISTIC", modelVersion: "1.0.0", promptVersion: "1" }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await api.generateStrategy({ sourceType: "TEXT", text: "RSI below 30" });
    expect(result.modelName).toBe("LOCAL_DETERMINISTIC");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/strategy-generations$/), expect.objectContaining({ method: "POST", body: JSON.stringify({ sourceType: "TEXT", text: "RSI below 30" }) }));
  });

  it("surfaces backend error messages and clears an invalid session", async () => {
    session.set("expired-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ message: "Bearer token is invalid." }, 401)));
    await expect(api.me()).rejects.toMatchObject({ status: 401, message: "Bearer token is invalid." });
    expect(session.token).toBeNull();
  });

  it("uses the authenticated Socket.IO namespace subscription and forwards market events", () => {
    const handlers = new Map<string, (value?: unknown) => void>(); const ioHandlers = new Map<string, () => void>();
    const socket = { on: (event: string, handler: (value?: unknown) => void) => { handlers.set(event, handler); return socket; }, emit: vi.fn(), disconnect: vi.fn(), io: { on: (event: string, handler: () => void) => { ioHandlers.set(event, handler); return socket.io; } } };
    vi.mocked(io).mockReturnValue(socket as never);
    vi.stubGlobal("crypto", { randomUUID: () => "request-1" });
    const messages: unknown[] = []; const states: string[] = [];
    const stop = marketSocket(message => messages.push(message), state => states.push(state), [{ pair: "BTCUSDT", timeframe: "1h" }]);
    handlers.get("connect")?.();
    handlers.get("market")?.({ type: "CANDLE", payload: { pair: "BTCUSDT" } });
    stop();
    expect(io).toHaveBeenCalledWith(expect.stringMatching(/\/market$/), expect.objectContaining({ auth: { token: null }, transports: ["websocket"] }));
    expect(socket.emit).toHaveBeenCalledWith("market", expect.objectContaining({ action: "SUBSCRIBE", subscriptions: [{ pair: "BTCUSDT", timeframe: "1h" }] }));
    expect(messages).toEqual([{ type: "CANDLE", payload: { pair: "BTCUSDT" } }]);
    expect(states).toEqual(["CONNECTING", "CONNECTED", "DISCONNECTED"]);
    expect(socket.disconnect).toHaveBeenCalledOnce();
  });

  it("loads supported market pairs and timeframes from the backend contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ provider: "BINANCE", pairs: ["BTCUSDT", "ETHUSDT"], timeframes: ["1m", "5m"] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.marketCapabilities()).resolves.toEqual({ provider: "BINANCE", pairs: ["BTCUSDT", "ETHUSDT"], timeframes: ["1m", "5m"] });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/market\/pairs$/), expect.objectContaining({ headers: expect.any(Headers) }));
  });

  it("leaves candle limit omitted so the backend default is exercised", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ pair: "BTCUSDT", timeframe: "1h", candles: [], range: { from: "2025-01-01T00:00:00.000Z", to: "2025-01-01T01:00:00.000Z" }, complete: true, asOf: "2025-01-01T01:00:00.000Z" }));
    vi.stubGlobal("fetch", fetchMock);
    await api.candles("BTCUSDT", "1h");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("http://localhost:3000/market/candles?pair=BTCUSDT&timeframe=1h");
  });

  it("uses the asynchronous replay-verification endpoints", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ replayJobId: "replay-1", experimentId: "experiment-1", status: "QUEUED" }, 202))
      .mockResolvedValueOnce(response({ replayJobId: "replay-1", experimentId: "experiment-1", sourceAttemptId: "attempt-1", status: "MATCH", comparedTradeCount: 3, mismatches: [], totalMismatchCount: 0, truncated: false }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.replay("experiment-1")).resolves.toMatchObject({ replayJobId: "replay-1", status: "QUEUED" });
    await expect(api.replayStatus("replay-1")).resolves.toMatchObject({ status: "MATCH", comparedTradeCount: 3 });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("/experiments/experiment-1/replay-verifications");
    expect(fetchMock.mock.calls[1]?.[0]).toContain("/replay-verifications/replay-1");
  });

  it("maps generation source, model, schema, and validation failures distinctly", () => {
    expect(mapGenerationError({ code: "SOURCE_LOAD_FAILED", message: "source" }).kind).toBe("SOURCE");
    expect(mapGenerationError({ code: "MODEL_UNAVAILABLE", message: "model" }).kind).toBe("MODEL");
    expect(mapGenerationError({ code: "MALFORMED_OUTPUT", message: "schema" }).kind).toBe("SCHEMA");
    expect(mapGenerationError({ code: "STRATEGY_VALIDATION_FAILED", message: "validation" }).kind).toBe("VALIDATION");
  });

  it("uses one shared socket for the union of active chart subscriptions", () => {
    const handlers = new Map<string, (value?: unknown) => void>(); const ioHandlers = new Map<string, () => void>();
    const socket = { on: (event: string, handler: (value?: unknown) => void) => { handlers.set(event, handler); return socket; }, emit: vi.fn(), disconnect: vi.fn(), io: { on: (event: string, handler: () => void) => { ioHandlers.set(event, handler); return socket.io; } } };
    vi.mocked(io).mockReturnValue(socket as never);
    const first = marketSocket(() => undefined, () => undefined, [{ pair: "BTCUSDT", timeframe: "1h" }]);
    const second = marketSocket(() => undefined, () => undefined, [{ pair: "ETHUSDT", timeframe: "5m" }]);
    handlers.get("connect")?.();
    expect(io).toHaveBeenCalledOnce();
    expect(socket.emit).toHaveBeenCalledWith("market", expect.objectContaining({ action: "SUBSCRIBE", subscriptions: [{ pair: "BTCUSDT", timeframe: "1h" }, { pair: "ETHUSDT", timeframe: "5m" }] }));
    first(); second();
  });

  it("reconciles REST history before releasing queued reconnect messages", async () => {
    const handlers = new Map<string, (value?: unknown) => void>(); const ioHandlers = new Map<string, () => void>();
    const socket = { on: (event: string, handler: (value?: unknown) => void) => { handlers.set(event, handler); return socket; }, emit: vi.fn(), disconnect: vi.fn(), io: { on: (event: string, handler: () => void) => { ioHandlers.set(event, handler); return socket.io; } } };
    vi.mocked(io).mockReturnValue(socket as never);
    const reconcile = vi.fn().mockResolvedValue(undefined); const messages: unknown[] = [];
    const stop = marketSocket((message) => messages.push(message), () => undefined, [{ pair: "BTCUSDT", timeframe: "1h" }], { reconcile });
    handlers.get("connect")?.(); handlers.get("disconnect")?.("transport close"); handlers.get("connect")?.();
    handlers.get("market")?.({ type: "CANDLE", payload: { pair: "BTCUSDT" } });
    await Promise.resolve(); await Promise.resolve();
    expect(reconcile).toHaveBeenCalledOnce(); expect(messages).toHaveLength(1);
    stop();
  });

  it("reports reconciliation failure and withholds queued live messages", async () => {
    const handlers = new Map<string, (value?: unknown) => void>();
    const socket = { on: (event: string, handler: (value?: unknown) => void) => { handlers.set(event, handler); return socket; }, emit: vi.fn(), disconnect: vi.fn(), io: { on: (event: string, handler: () => void) => { return socket.io; } } };
    vi.mocked(io).mockReturnValue(socket as never);
    const reconcile = vi.fn().mockRejectedValue(new Error("history unavailable")); const messages: unknown[] = []; const states: string[] = [];
    const stop = marketSocket((message) => messages.push(message), (state) => states.push(state), [{ pair: "BTCUSDT", timeframe: "1h" }], { reconcile });
    handlers.get("connect")?.(); handlers.get("disconnect")?.("transport close"); handlers.get("connect")?.();
    handlers.get("market")?.({ type: "CANDLE", payload: { pair: "BTCUSDT" } });
    await Promise.resolve(); await Promise.resolve();
    expect(reconcile).toHaveBeenCalledOnce(); expect(states).toContain("ERROR"); expect(messages).toHaveLength(0);
    stop();
  });
});
