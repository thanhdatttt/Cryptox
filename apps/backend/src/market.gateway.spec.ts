import { EventEmitter } from "node:events";
import type { IncomingMessage, Server } from "node:http";
import { Duplex } from "node:stream";
import { describe, expect, it } from "vitest";
import type { AuthModulePublicApi, AuthenticatedSessionIdentity, AuthenticatedUserId } from "@cryptox/auth";
import type { MarketDataModuleRuntime } from "@cryptox/market-data/bootstrap";
import { createBackendRuntime } from "./runtime";

const USER_ID = "00000000-0000-4000-8000-000000000001" as AuthenticatedUserId;
const EXPIRES_AT = "2026-09-01T00:00:00.000Z";

class TestSocket extends Duplex {
  public readonly writes: Buffer[] = [];

  public _read(): void {}

  public _write(
    chunk: Buffer | string,
    encoding: BufferEncoding,
    callback: (error?: Error) => void,
  ): void {
    this.writes.push(Buffer.isBuffer(chunk) ? Buffer.from(chunk) : Buffer.from(chunk, encoding));
    callback();
  }
}

function clientTextFrame(text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const mask = Buffer.from([0x11, 0x22, 0x33, 0x44]);
  const masked = Buffer.from(payload);
  for (let index = 0; index < masked.length; index += 1) masked[index] = masked[index]! ^ mask[index % 4]!;
  if (payload.length < 126) {
    return Buffer.concat([Buffer.from([0x81, 0x80 | payload.length]), mask, masked]);
  }
  if (payload.length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, mask, masked]);
  }
  throw new Error("test frame is too large");
}

function serverTextFrames(socket: TestSocket): string[] {
  const bytes = Buffer.concat(socket.writes);
  const handshakeEnd = bytes.indexOf(Buffer.from("\r\n\r\n", "utf8"));
  if (handshakeEnd < 0) return [];
  const frames: string[] = [];
  let offset = handshakeEnd + 4;
  while (offset + 2 <= bytes.length) {
    const first = bytes[offset]!;
    const second = bytes[offset + 1]!;
    if ((first & 0x0f) !== 0x1 || (second & 0x80) !== 0) break;
    let length = second & 0x7f;
    let headerLength = 2;
    if (length === 126) {
      if (offset + 4 > bytes.length) break;
      length = bytes.readUInt16BE(offset + 2);
      headerLength = 4;
    } else if (length === 127) {
      if (offset + 10 > bytes.length) break;
      const longLength = bytes.readBigUInt64BE(offset + 2);
      if (longLength > BigInt(Number.MAX_SAFE_INTEGER)) break;
      length = Number(longLength);
      headerLength = 10;
    }
    const end = offset + headerLength + length;
    if (end > bytes.length) break;
    frames.push(bytes.subarray(offset + headerLength, end).toString("utf8"));
    offset = end;
  }
  return frames;
}

function request(cookie?: string): IncomingMessage {
  return {
    url: "/market-data/ws?ignored=1",
    headers: {
      host: "localhost",
      upgrade: "websocket",
      "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
      ...(cookie === undefined ? {} : { cookie }),
    },
  } as IncomingMessage;
}

function auth(): AuthModulePublicApi {
  return {
    register: async () => { throw new Error("unused"); },
    login: async () => { throw new Error("unused"); },
    resolveSession: async (token): Promise<AuthenticatedSessionIdentity | undefined> =>
      token === "token-a"
        ? { sessionId: "session-a", expiresAt: EXPIRES_AT, authenticatedUserId: USER_ID }
        : undefined,
    currentUser: async () => { throw new Error("unused"); },
    logout: async () => undefined,
  };
}

function marketData(sinkRef: { sink?: (update: Parameters<NonNullable<typeof sinkRef.sink>>[0]) => void; subscriptions?: readonly { pair: string; timeframe: string }[] }): MarketDataModuleRuntime {
  const observability = {
    profileId: "MARKET_OBSERVABILITY_V1" as const,
    pair: "BTCUSDT",
    connection: { provider: "binance", status: "CONNECTED" as const, lastEventAt: EXPIRES_AT },
    lastLatencyMs: 12,
    latestTicks: [],
    persistence: "EPHEMERAL_IN_MEMORY_ONLY" as const,
  };
  return {
    readCandles: async () => { throw new Error("unused"); },
    createDatasetSnapshot: async () => { throw new Error("unused"); },
    readDatasetSnapshot: async () => { throw new Error("unused"); },
    subscribeMarketData: async (subscriptions, sink) => {
      sinkRef.subscriptions = subscriptions;
      sinkRef.sink = sink;
      return async () => undefined;
    },
    readObservability: async () => observability,
    shutdown: async () => undefined,
  };
}

async function flush(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe("market-only WebSocket gateway", () => {
  it("authenticates the opaque cookie, maps normalized delivery, and emits observability only", async () => {
    const sinkRef: { sink?: (update: { kind: "TICK"; payload: { pair: string; price: number; timestamp: string } }) => void; subscriptions?: readonly { pair: string; timeframe: string }[] } = {};
    const runtime = createBackendRuntime({
      auth: auth(),
      marketData: marketData(sinkRef),
      databaseReady: true,
    });
    const server = new EventEmitter() as unknown as Server;
    runtime.marketWebSocket.attach(server);

    const unauthenticated = new TestSocket();
    server.emit("upgrade", request("other=value"), unauthenticated, Buffer.alloc(0));
    await flush();
    expect(Buffer.concat(unauthenticated.writes).toString("utf8")).toContain("HTTP/1.1 401 Unauthorized");

    const socket = new TestSocket();
    server.emit("upgrade", request("cryptox_session=token-a"), socket, Buffer.alloc(0));
    await flush();
    expect(Buffer.concat(socket.writes).toString("utf8")).toContain("HTTP/1.1 101 Switching Protocols");
    expect(serverTextFrames(socket).map((value) => JSON.parse(value).type)).toContain("CONNECTION_STATUS");

    socket.push(clientTextFrame(JSON.stringify({
      schemaVersion: 1,
      type: "SUBSCRIBE",
      requestId: "request-1",
      payload: { subscriptions: [{ pair: "btcusdt", timeframe: "5m" }] },
    })));
    await flush();
    expect(sinkRef.subscriptions).toEqual([{ pair: "BTCUSDT", timeframe: "5m" }]);
    const subscribedMessages = serverTextFrames(socket).map((value) => JSON.parse(value) as { type: string; payload: Record<string, unknown> });
    expect(subscribedMessages.map((value) => value.type)).toEqual(expect.arrayContaining(["SUBSCRIPTION_ACK", "MARKET_OBSERVABILITY"]));
    expect(subscribedMessages.find((value) => value.type === "SUBSCRIPTION_ACK")?.payload).toMatchObject({
      action: "SUBSCRIBE",
      accepted: [{ subscription: { pair: "BTCUSDT", timeframe: "5m" }, state: "ACTIVE" }],
    });

    sinkRef.sink?.({ kind: "TICK", payload: { pair: "BTCUSDT", price: 101, timestamp: EXPIRES_AT } });
    await flush();
    const delivered = serverTextFrames(socket).map((value) => JSON.parse(value) as { type: string; payload: Record<string, unknown> });
    expect(delivered.find((value) => value.type === "MARKET_TICK")?.payload).toMatchObject({ pair: "BTCUSDT", price: 101 });
    expect(delivered.some((value) => value.type === "LEADERBOARD_UPDATED")).toBe(false);

    socket.push(clientTextFrame("not-json"));
    await flush();
    const malformed = serverTextFrames(socket).map((value) => JSON.parse(value) as { type: string; payload: Record<string, unknown> });
    expect(malformed.find((value) => value.type === "ERROR")?.payload).toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(JSON.stringify(malformed)).not.toContain("secret");

    await runtime.close();
  });

  it("rejects unknown upgrade paths instead of exposing a general event channel", async () => {
    const runtime = createBackendRuntime({ auth: auth(), databaseReady: true });
    const server = new EventEmitter() as unknown as Server;
    runtime.marketWebSocket.attach(server);
    const socket = new TestSocket();
    server.emit("upgrade", { ...request("cryptox_session=token-a"), url: "/events" } as IncomingMessage, socket, Buffer.alloc(0));
    await flush();
    expect(Buffer.concat(socket.writes).toString("utf8")).toContain("HTTP/1.1 404 Not Found");
    await runtime.close();
  });
});
