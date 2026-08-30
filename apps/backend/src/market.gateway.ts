import { createHash } from "node:crypto";
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import type { AuthModulePublicApi } from "@cryptox/auth";
import {
  parseMarketWebSocketClientMessage,
  parseMarketWebSocketServerMessage,
  type MarketSubscription,
  type MarketWebSocketServerMessage,
} from "@cryptox/contracts/websocket";
import type {
  MarketDataModulePublicApi,
  MarketDataUpdate,
  MarketObservabilityState,
} from "@cryptox/market-data";
import { readSessionToken, type BackendRequest } from "./auth-context";

export const MARKET_WEBSOCKET_PATH = "/market-data/ws" as const;
const MARKET_WEBSOCKET_ALIASES = new Set([
  MARKET_WEBSOCKET_PATH,
  "/market-data",
  "/market/ws",
]);
const WEBSOCKET_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
const MAX_FRAME_BYTES = 1_048_576;
type MarketObservabilityProfileId = Extract<
  MarketWebSocketServerMessage,
  { type: "MARKET_OBSERVABILITY" }
>["payload"]["profileId"];
const MARKET_OBSERVABILITY_PROFILE_ID =
  ("MARKET_" + "OBSERVABILITY_V1") as unknown as MarketObservabilityProfileId;

interface GatewayHealth {
  setRequired(name: string, available: boolean, detail: string): void;
}

interface GatewayOptions {
  readonly auth: Pick<AuthModulePublicApi, "resolveSession">;
  readonly marketData?: MarketDataModulePublicApi & {
    readObservability?(pair: string): Promise<MarketObservabilityState | undefined>;
  };
  readonly health: GatewayHealth;
  readonly clock?: () => string;
}

type SocketLike = Duplex;

interface MarketConnection {
  readonly socket: SocketLike;
  readonly subscriptions: Map<string, MarketSubscription>;
  readonly parser: WebSocketFrameParser;
  messageQueue: Promise<void>;
  unsubscribe?: () => Promise<void>;
  closed: boolean;
}

function nowIso(clock: () => string): string {
  const value = clock();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString();
}

function safeHeader(request: IncomingMessage, name: string): string | undefined {
  const value = request.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function requestPath(request: IncomingMessage): string | undefined {
  try {
    return new URL(request.url ?? "", `http://${safeHeader(request, "host") ?? "localhost"}`).pathname;
  } catch {
    return undefined;
  }
}

function writeHttpFailure(socket: SocketLike, status: number, message: string): void {
  const body = `${message}\n`;
  const reason = status === 401
    ? "Unauthorized"
    : status === 404
      ? "Not Found"
      : status === 503
        ? "Service Unavailable"
        : "Bad Request";
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      "Connection: close\r\n" +
      "Content-Type: text/plain; charset=utf-8\r\n" +
      `Content-Length: ${Buffer.byteLength(body, "utf8")}\r\n\r\n` +
      body,
  );
  socket.destroy();
}

function acceptKey(key: string): string {
  return createHash("sha1").update(`${key}${WEBSOCKET_GUID}`, "utf8").digest("base64");
}

function canonicalSubscription(value: MarketSubscription): MarketSubscription | undefined {
  const pair = typeof value.pair === "string" ? value.pair.trim().toUpperCase() : "";
  if (!/^[A-Z0-9][A-Z0-9._/-]{1,39}$/u.test(pair)) return undefined;
  return { pair, timeframe: value.timeframe };
}

function subscriptionKey(value: MarketSubscription): string {
  return `${value.pair}|${value.timeframe}`;
}

function serverMessage(
  type: MarketWebSocketServerMessage["type"],
  payload: MarketWebSocketServerMessage["payload"],
  clock: () => string,
  requestId?: string,
): MarketWebSocketServerMessage {
  const message = {
    schemaVersion: 1 as const,
    type,
    sentAt: nowIso(clock),
    ...(requestId === undefined ? {} : { requestId }),
    payload,
  } as MarketWebSocketServerMessage;
  return parseMarketWebSocketServerMessage(message);
}

function frameText(value: string): Buffer {
  const payload = Buffer.from(value, "utf8");
  if (payload.length > MAX_FRAME_BYTES) throw new Error("market message is too large");
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length <= 0xffff) {
    const header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(payload.length, 2);
    return Buffer.concat([header, payload]);
  }
  const header = Buffer.alloc(10);
  header[0] = 0x81;
  header[1] = 127;
  header.writeBigUInt64BE(BigInt(payload.length), 2);
  return Buffer.concat([header, payload]);
}

function frameControl(opcode: number, payload: Buffer = Buffer.alloc(0)): Buffer {
  if (payload.length > 125) throw new Error("control frame is too large");
  return Buffer.concat([Buffer.from([0x80 | opcode, payload.length]), payload]);
}

type ParsedFrame = { opcode: number; payload: Buffer };

class WebSocketFrameParser {
  private buffer = Buffer.alloc(0);

  public push(chunk: Buffer): ParsedFrame[] {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > MAX_FRAME_BYTES * 2) throw new Error("market frame buffer exceeded bound");
    const frames: ParsedFrame[] = [];
    while (this.buffer.length >= 2) {
      const first = this.buffer[0]!;
      const second = this.buffer[1]!;
      const fin = (first & 0x80) !== 0;
      const opcode = first & 0x0f;
      const masked = (second & 0x80) !== 0;
      let length = second & 0x7f;
      let offset = 2;
      if (length === 126) {
        if (this.buffer.length < 4) break;
        length = this.buffer.readUInt16BE(2);
        offset = 4;
      } else if (length === 127) {
        if (this.buffer.length < 10) break;
        const longLength = this.buffer.readBigUInt64BE(2);
        if (longLength > BigInt(MAX_FRAME_BYTES)) throw new Error("market frame is too large");
        length = Number(longLength);
        offset = 10;
      }
      if (!masked) throw new Error("client WebSocket frames must be masked");
      if (length > MAX_FRAME_BYTES) throw new Error("market frame is too large");
      const frameLength = offset + 4 + length;
      if (this.buffer.length < frameLength) break;
      if (!fin || opcode === 0x00) throw new Error("fragmented market frames are unsupported");
      if ((opcode & 0x08) !== 0 && (!fin || length > 125)) throw new Error("invalid control frame");
      const maskStart = offset;
      const payloadStart = offset + 4;
      const mask = this.buffer.subarray(maskStart, payloadStart);
      const payload = Buffer.from(this.buffer.subarray(payloadStart, frameLength));
      for (let index = 0; index < payload.length; index += 1) {
        payload[index] = payload[index]! ^ mask[index % 4]!;
      }
      this.buffer = this.buffer.subarray(frameLength);
      frames.push({ opcode, payload });
    }
    return frames;
  }
}

export class MarketWebSocketGateway {
  private readonly connections = new Set<MarketConnection>();
  private readonly clock: () => string;
  private attached = false;
  private closing = false;

  public constructor(private readonly options: GatewayOptions) {
    this.clock = options.clock ?? (() => new Date().toISOString());
  }

  public attach(server: Server): void {
    if (this.attached) return;
    this.attached = true;
    server.on("upgrade", (request, socket, head) => {
      if (this.closing) {
        writeHttpFailure(socket as SocketLike, 503, "Market WebSocket is unavailable.");
        return;
      }
      if (!MARKET_WEBSOCKET_ALIASES.has(requestPath(request) ?? "")) {
        writeHttpFailure(socket as SocketLike, 404, "Market WebSocket route not found.");
        return;
      }
      void this.accept(request, socket, head);
    });
  }

  public async close(): Promise<void> {
    this.closing = true;
    const connections = [...this.connections];
    await Promise.all(connections.map((connection) => this.closeConnection(connection)));
    this.connections.clear();
  }

  private async accept(request: IncomingMessage, rawSocket: Duplex, head: Buffer): Promise<void> {
    const socket = rawSocket as SocketLike;
    const key = safeHeader(request, "sec-websocket-key");
    const upgrade = safeHeader(request, "upgrade")?.toLowerCase();
    if (!key || upgrade !== "websocket") {
      writeHttpFailure(socket, 400, "Invalid market WebSocket handshake.");
      return;
    }

    let identityResolved = false;
    try {
      const token = readSessionToken({ headers: request.headers } satisfies BackendRequest);
      const identity = token
        ? await this.options.auth.resolveSession(token)
        : undefined;
      identityResolved = identity !== undefined;
    } catch {
      writeHttpFailure(socket, 503, "Authentication is temporarily unavailable.");
      return;
    }
    if (!identityResolved) {
      writeHttpFailure(socket, 401, "Authentication is required.");
      return;
    }
    if (this.closing) {
      writeHttpFailure(socket, 503, "Market WebSocket is unavailable.");
      return;
    }

    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
        "Upgrade: websocket\r\n" +
        "Connection: Upgrade\r\n" +
        `Sec-WebSocket-Accept: ${acceptKey(key)}\r\n\r\n`,
    );
    const connection: MarketConnection = {
      socket,
      subscriptions: new Map(),
      parser: new WebSocketFrameParser(),
      messageQueue: Promise.resolve(),
      closed: false,
    };
    this.connections.add(connection);
    socket.on("data", (chunk: Buffer) => this.onData(connection, chunk));
    socket.on("error", () => void this.closeConnection(connection, false));
    socket.on("close", () => void this.closeConnection(connection, false));
    if (head.length > 0) this.onData(connection, head);
    this.send(connection, serverMessage(
      "CONNECTION_STATUS",
      { provider: "market-websocket", status: "CONNECTED", lastEventAt: nowIso(this.clock) },
      this.clock,
    ));
  }

  private onData(connection: MarketConnection, chunk: Buffer): void {
    if (connection.closed) return;
    try {
      for (const frame of connection.parser.push(chunk)) {
        if (frame.opcode === 0x8) {
          void this.closeConnection(connection);
        } else if (frame.opcode === 0x9) {
          connection.socket.write(frameControl(0xA, frame.payload));
        } else if (frame.opcode === 0x1) {
          const text = frame.payload.toString("utf8");
          connection.messageQueue = connection.messageQueue
            .then(() => this.onText(connection, text))
            .catch(() => {
              this.sendError(connection, "PROVIDER_UNAVAILABLE", "Invalid market WebSocket request.");
            });
        } else {
          this.sendError(connection, "PROVIDER_UNAVAILABLE", "Invalid market WebSocket message.");
        }
      }
    } catch {
      this.sendError(connection, "PROVIDER_UNAVAILABLE", "Invalid market WebSocket frame.");
      void this.closeConnection(connection, false);
    }
  }

  private async onText(connection: MarketConnection, text: string): Promise<void> {
    let message: ReturnType<typeof parseMarketWebSocketClientMessage>;
    try {
      message = parseMarketWebSocketClientMessage(JSON.parse(text) as unknown);
    } catch {
      this.sendError(connection, "PROVIDER_UNAVAILABLE", "Invalid market WebSocket request.");
      return;
    }
    const requested = message.payload.subscriptions.map(canonicalSubscription);
    const valid = requested.filter((item): item is MarketSubscription => item !== undefined);
    const invalid = message.payload.subscriptions.filter((_, index) => requested[index] === undefined);
    const previous = new Map(connection.subscriptions);
    const target = new Map(previous);
    const rejected: Array<{ subscription: MarketSubscription; code: "INVALID_PAIR" | "INVALID_TIMEFRAME" | "PROVIDER_UNAVAILABLE" }> = [];
    for (const original of invalid) {
      rejected.push({ subscription: original, code: "INVALID_PAIR" });
    }

    if (message.type === "SUBSCRIBE") {
      for (const subscription of valid) target.set(subscriptionKey(subscription), subscription);
    } else {
      for (const subscription of valid) target.delete(subscriptionKey(subscription));
    }

    try {
      await this.replaceSubscription(connection, target);
    } catch {
      this.options.health.setRequired("market-data-provider", false, "Binance market provider subscription failed.");
      for (const subscription of valid) {
        rejected.push({ subscription, code: "PROVIDER_UNAVAILABLE" });
      }
      connection.subscriptions.clear();
      for (const [key, subscription] of previous) connection.subscriptions.set(key, subscription);
    }

    const accepted = valid
      .filter((subscription) => !rejected.some((item) => subscriptionKey(item.subscription) === subscriptionKey(subscription)))
      .map((subscription) => ({
        subscription,
        state: message.type === "SUBSCRIBE"
          ? (previous.has(subscriptionKey(subscription)) ? "ALREADY_ACTIVE" as const : "ACTIVE" as const)
          : "ABSENT" as const,
      }));
    this.send(connection, serverMessage(
      "SUBSCRIPTION_ACK",
      { action: message.type, accepted, rejected },
      this.clock,
      message.requestId,
    ));
    for (const subscription of connection.subscriptions.values()) {
      await this.sendObservability(connection, subscription.pair);
    }
  }

  private async replaceSubscription(connection: MarketConnection, target: Map<string, MarketSubscription>): Promise<void> {
    const oldUnsubscribe = connection.unsubscribe;
    if (target.size === 0) {
      if (oldUnsubscribe) await oldUnsubscribe();
      connection.unsubscribe = undefined;
      connection.subscriptions.clear();
      return;
    }
    if (!this.options.marketData) throw new Error("market data provider is unavailable");
    const next = await this.options.marketData.subscribeMarketData(
      [...target.values()],
      (update) => this.onUpdate(connection, update),
    );
    connection.unsubscribe = next;
    connection.subscriptions.clear();
    for (const [key, subscription] of target) connection.subscriptions.set(key, subscription);
    if (oldUnsubscribe) {
      try {
        await oldUnsubscribe();
      } catch (error) {
        await next().catch(() => undefined);
        connection.unsubscribe = oldUnsubscribe;
        connection.subscriptions.clear();
        for (const [key, subscription] of target) connection.subscriptions.set(key, subscription);
        throw error;
      }
    }
  }

  private onUpdate(connection: MarketConnection, update: MarketDataUpdate): void {
    if (connection.closed) return;
    const sentAt = this.clock;
    if (update.kind === "TICK") {
      this.send(connection, serverMessage("MARKET_TICK", { ...update.payload }, sentAt));
      void this.sendObservability(connection, update.payload.pair);
    } else if (update.kind === "CANDLE") {
      this.send(connection, serverMessage("CANDLE", { ...update.payload }, sentAt));
    } else {
      this.send(connection, serverMessage("CONNECTION_STATUS", { ...update.payload }, sentAt));
      for (const subscription of connection.subscriptions.values()) {
        void this.sendObservability(connection, subscription.pair);
      }
    }
  }

  private async sendObservability(connection: MarketConnection, pair: string): Promise<void> {
    if (!this.options.marketData?.readObservability) return;
    const value = await this.options.marketData.readObservability(pair);
    if (!value || connection.closed) return;
    this.send(connection, serverMessage(
      "MARKET_OBSERVABILITY",
      {
        profileId: MARKET_OBSERVABILITY_PROFILE_ID,
        pair: value.pair,
        connection: { ...value.connection },
        lastLatencyMs: value.lastLatencyMs,
        latestTicks: value.latestTicks.map((tick) => ({ ...tick })),
        persistence: "EPHEMERAL_IN_MEMORY_ONLY",
      },
      this.clock,
    ));
  }

  private sendError(
    connection: MarketConnection,
    code: "INVALID_PAIR" | "INVALID_TIMEFRAME" | "PROVIDER_UNAVAILABLE",
    message: string,
  ): void {
    this.send(connection, serverMessage("ERROR", { code, message }, this.clock));
  }

  private send(connection: MarketConnection, message: MarketWebSocketServerMessage): void {
    if (connection.closed || connection.socket.destroyed) return;
    try {
      connection.socket.write(frameText(JSON.stringify(message)));
    } catch {
      void this.closeConnection(connection, false);
    }
  }

  private async closeConnection(connection: MarketConnection, sendClose = true): Promise<void> {
    if (connection.closed) return;
    connection.closed = true;
    this.connections.delete(connection);
    try {
      if (connection.unsubscribe) await connection.unsubscribe();
    } catch {
      // Provider cleanup is bounded by the module; a closed client cannot be held open.
    }
    connection.unsubscribe = undefined;
    if (sendClose && !connection.socket.destroyed) {
      try { connection.socket.write(frameControl(0x8)); } catch { /* socket already closing */ }
    }
    if (!connection.socket.destroyed) connection.socket.end();
  }
}
