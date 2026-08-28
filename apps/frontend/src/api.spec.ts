import { beforeEach, describe, expect, it, vi } from "vitest";
import { io } from "socket.io-client";
import { api, marketSocket, session } from "./api";

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
    const fetchMock = vi.fn().mockResolvedValue(response({ generationId: "generation-1", kind: "SINGLE", strategyDefinition: { id: "definition-1", strategyName: "RSI", parameters: { period: 14 }, version: 1, createdAt: "2025-01-01T00:00:00.000Z" }, modelName: "LOCAL_DETERMINISTIC", modelVersion: "1.0.0", promptVersion: "1" }));
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

  it("submits a saved single strategy without inventing a composite id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ candidateId: "candidate-1", status: "QUEUED" }, 202));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.backtest({ leaderboardScopeId: "scope-1", strategyDefinitionIds: ["definition-1"], maxAttempts: 1 })).resolves.toMatchObject({ candidateId: "candidate-1", status: "QUEUED" });
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({ leaderboardScopeId: "scope-1", strategyDefinitionIds: ["definition-1"], maxAttempts: 1 });
  });
  it("loads supported market pairs and timeframes from the backend contract", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ provider: "BINANCE", pairs: ["BTCUSDT", "ETHUSDT"], timeframes: ["1m", "5m"] }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.marketCapabilities()).resolves.toEqual({ provider: "BINANCE", pairs: ["BTCUSDT", "ETHUSDT"], timeframes: ["1m", "5m"] });
    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/market\/pairs$/), expect.objectContaining({ headers: expect.any(Headers) }));
  });
  it("notifies subscribers when an invalid session is cleared", () => {
    const listener = vi.fn();
    const unsubscribe = session.subscribe(listener);
    session.set("expired-token");
    session.set(null);
    unsubscribe();
    expect(listener).toHaveBeenLastCalledWith(null);
  });

  it("requests a cursor for the next experiment trade page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ items: [], nextCursor: "cursor-next" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(api.experimentTrades("experiment-1", "cursor-2")).resolves.toEqual({ items: [], nextCursor: "cursor-next" });
    expect(fetchMock.mock.calls[0][0]).toContain("/experiments/experiment-1/trades?limit=100&cursor=cursor-2");
  });

});
