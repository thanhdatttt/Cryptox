import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, marketSocket, session } from "./api";

const response = (body: unknown, status = 200) => new Response(body === undefined ? undefined : JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("frontend backend transport", () => {
  beforeEach(() => { session.set(null); vi.restoreAllMocks(); });

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

  it("surfaces backend error messages and clears an invalid session", async () => {
    session.set("expired-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ message: "Bearer token is invalid." }, 401)));
    await expect(api.me()).rejects.toMatchObject({ status: 401, message: "Bearer token is invalid." });
    expect(session.token).toBeNull();
  });

  it("sends the authenticated Socket.IO Engine.IO namespace subscription and parses market events", async () => {
    class FakeSocket {
      static last: FakeSocket | undefined;
      onopen?: () => void; onmessage?: (event: { data: string }) => void; onerror?: () => void; onclose?: () => void;
      sent: string[] = []; closed = false;
      constructor(public readonly url: string) { FakeSocket.last = this; }
      send(value: string) { this.sent.push(value); }
      close() { this.closed = true; this.onclose?.(); }
    }
    vi.stubGlobal("WebSocket", FakeSocket);
    vi.stubGlobal("crypto", { randomUUID: () => "request-1" });
    const messages: unknown[] = []; const states: string[] = [];
    const stop = marketSocket(message => messages.push(message), state => states.push(state), [{ pair: "BTCUSDT", timeframe: "1h" }]);
    const socket = FakeSocket.last as FakeSocket;
    socket.onopen?.();
    socket.onmessage?.({ data: '42["market",{"type":"CANDLE","payload":{"pair":"BTCUSDT"}}]' });
    stop();
    expect(socket.sent[0]).toBe("40/market,");
    expect(socket.sent[1]).toContain('"action":"SUBSCRIBE"');
    expect(messages).toEqual([{ type: "CANDLE", payload: { pair: "BTCUSDT" } }]);
    expect(states).toEqual(["CONNECTING", "CONNECTED", "DISCONNECTED"]);
    expect(socket.closed).toBe(true);
  });
});
