import type { Candle, MarketTick } from "../domain/contracts";
import type {
  MarketDataHistoryRequest,
  MarketDataHistoryResult,
  MarketDataObservability,
  MarketDataProvider,
  MarketDataProviderSubscription,
  MarketDataProviderUpdate,
} from "../application/ports";
import { createBinanceHistoricalProvider, type BinanceHistoricalProviderOptions } from "./binance";

const DEFAULT_WEBSOCKET_URL = "wss://stream.binance.com:9443/ws";
const DEFAULT_RECONNECT_ATTEMPTS = 5;
const DEFAULT_RECONNECT_BASE_DELAY_MS = 250;
const DEFAULT_RECONNECT_MAX_DELAY_MS = 10_000;
const DEFAULT_MAX_GAP_CANDLES = 100_000;

const TIMEFRAME_MS: Record<MarketDataProviderSubscription["timeframe"], number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

interface BinanceWebSocket {
  readonly readyState: number;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: (() => void) | null;
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

export type BinanceWebSocketFactory = (url: string) => BinanceWebSocket;
export type BinanceSleep = (delayMs: number) => Promise<void>;

export interface BinanceRealtimeProviderOptions extends BinanceHistoricalProviderOptions {
  readonly websocketUrl?: string;
  readonly webSocket?: BinanceWebSocketFactory;
  readonly maxReconnectAttempts?: number;
  readonly reconnectBaseDelayMs?: number;
  readonly reconnectMaxDelayMs?: number;
  readonly maxGapCandles?: number;
  readonly sleep?: BinanceSleep;
  readonly clock?: () => string;
  readonly observability?: Pick<MarketDataObservability, "record">;
}

interface RealtimeSession {
  readonly subscriptions: readonly MarketDataProviderSubscription[];
  readonly sink: (update: MarketDataProviderUpdate) => void;
  stopped: boolean;
  socket?: BinanceWebSocket;
  reconnectAttempts: number;
  reconnectPending: boolean;
  reconnectTimer?: ReturnType<typeof setTimeout>;
  continuation: Promise<void>;
  ready: Promise<void>;
  resolveReady: () => void;
  rejectReady: (error: Error) => void;
  readySettled: boolean;
  latestClosedAt: Map<string, number>;
  lastCandleByTimestamp: Map<string, string>;
  closedCandleKeys: Set<string>;
}

function defaultWebSocket(url: string): BinanceWebSocket {
  const runtime = globalThis as unknown as {
    WebSocket?: new (address: string) => BinanceWebSocket;
  };
  if (!runtime.WebSocket) throw new Error("WebSocket is unavailable in this runtime");
  return new runtime.WebSocket(url);
}

function timestamp(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(`Binance returned an invalid ${field}`);
  return parsed;
}

function finiteNumber(value: unknown, field: string): number {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) throw new Error(`Binance returned an invalid ${field}`);
  return parsed;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Binance returned a malformed realtime message");
  return value as Record<string, unknown>;
}

function canonicalSubscription(subscription: MarketDataProviderSubscription): MarketDataProviderSubscription {
  if (!subscription || typeof subscription.pair !== "string" || !subscription.pair.trim()) {
    throw new Error("realtime subscription pair is required");
  }
  if (!(subscription.timeframe in TIMEFRAME_MS)) throw new Error("realtime subscription timeframe is unsupported");
  return { pair: subscription.pair.trim().toUpperCase(), timeframe: subscription.timeframe };
}

function scopeKey(subscription: { pair: string; timeframe: string }): string {
  return `${subscription.pair}|${subscription.timeframe}`;
}

function candleSignature(candle: Candle): string {
  return [candle.open, candle.high, candle.low, candle.close, candle.volume, candle.isClosed].join("|");
}

function parseRealtimeCandle(value: unknown): Candle | undefined {
  const envelope = objectValue(value);
  const payload = envelope.data === undefined ? envelope : objectValue(envelope.data);
  if (payload.e !== "kline") return undefined;
  const kline = objectValue(payload.k);
  const pair = typeof payload.s === "string" ? payload.s : typeof kline.s === "string" ? kline.s : "";
  if (!pair || typeof kline.x !== "boolean") throw new Error("Binance returned a malformed realtime kline");
  const open = finiteNumber(kline.o, "open price");
  const high = finiteNumber(kline.h, "high price");
  const low = finiteNumber(kline.l, "low price");
  const close = finiteNumber(kline.c, "close price");
  const volume = finiteNumber(kline.v, "volume");
  if (volume < 0 || high < Math.max(open, close, low) || low > Math.min(open, close, high)) {
    throw new Error("Binance returned invalid realtime OHLCV values");
  }
  const interval = kline.i;
  if (typeof interval !== "string" || !(interval in TIMEFRAME_MS)) throw new Error("Binance returned an unsupported realtime interval");
  return {
    pair: pair.toUpperCase(),
    timeframe: interval as MarketDataProviderSubscription["timeframe"],
    timestamp: new Date(timestamp(kline.t, "open time")).toISOString(),
    open,
    high,
    low,
    close,
    volume,
    isClosed: kline.x,
  };
}

function parseRealtimeTick(value: unknown): MarketTick | undefined {
  const envelope = objectValue(value);
  const payload = envelope.data === undefined ? envelope : objectValue(envelope.data);
  if (payload.e !== "trade" && payload.e !== "aggTrade") return undefined;
  const pair = typeof payload.s === "string" ? payload.s : "";
  if (!pair) throw new Error("Binance returned a malformed realtime trade");
  return {
    pair: pair.toUpperCase(),
    price: finiteNumber(payload.p, "trade price"),
    timestamp: new Date(timestamp(payload.E, "event time")).toISOString(),
  };
}

function nowIso(clock: () => string): string {
  const value = clock();
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error("market data clock returned an invalid timestamp");
  return new Date(parsed).toISOString();
}

function subscriptionMessage(subscriptions: readonly MarketDataProviderSubscription[], id: number): string {
  const params = new Set<string>();
  for (const { pair, timeframe } of subscriptions) {
    params.add(`${pair.toLowerCase()}@kline_${timeframe}`);
    params.add(`${pair.toLowerCase()}@trade`);
  }
  return JSON.stringify({
    method: "SUBSCRIBE",
    params: [...params],
    id,
  });
}

function report(
  observability: Pick<MarketDataObservability, "record"> | undefined,
  type: "PROVIDER_FAILURE" | "PROVIDER_RECONNECT" | "HISTORY_GAP",
  detail: string,
): void {
  try {
    observability?.record({ type, providerId: "binance", detail });
  } catch {
    // Provider diagnostics must not break the delivery/reconnect state machine.
  }
}

export function createBinanceRealtimeProvider(options: BinanceRealtimeProviderOptions = {}): MarketDataProvider {
  const history = createBinanceHistoricalProvider(options);
  const socketFactory = options.webSocket ?? defaultWebSocket;
  const websocketUrl = options.websocketUrl ?? DEFAULT_WEBSOCKET_URL;
  const maxReconnectAttempts = options.maxReconnectAttempts ?? DEFAULT_RECONNECT_ATTEMPTS;
  const reconnectBaseDelayMs = options.reconnectBaseDelayMs ?? DEFAULT_RECONNECT_BASE_DELAY_MS;
  const reconnectMaxDelayMs = options.reconnectMaxDelayMs ?? DEFAULT_RECONNECT_MAX_DELAY_MS;
  const maxGapCandles = options.maxGapCandles ?? DEFAULT_MAX_GAP_CANDLES;
  const sleep = options.sleep;
  const clock = options.clock ?? (() => new Date().toISOString());
  if (!Number.isSafeInteger(maxReconnectAttempts) || maxReconnectAttempts < 0) throw new Error("max reconnect attempts must be non-negative");
  if (!Number.isSafeInteger(reconnectBaseDelayMs) || reconnectBaseDelayMs < 0) throw new Error("reconnect base delay must be non-negative");
  if (!Number.isSafeInteger(reconnectMaxDelayMs) || reconnectMaxDelayMs < reconnectBaseDelayMs) throw new Error("reconnect max delay is invalid");
  if (!Number.isSafeInteger(maxGapCandles) || maxGapCandles < 1) throw new Error("maximum gap candles must be positive");

  const sessions = new Set<RealtimeSession>();
  let stopped = false;
  let nextRequestId = 1;

  const emitStatus = (session: RealtimeSession, status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED"): void => {
    session.sink({ kind: "CONNECTION_STATUS", payload: { provider: "binance", status, lastEventAt: nowIso(clock) } });
  };

  const settleReady = (session: RealtimeSession, error?: Error): void => {
    if (session.readySettled) return;
    session.readySettled = true;
    if (error) session.rejectReady(error);
    else session.resolveReady();
  };

  const acceptCandle = (session: RealtimeSession, candle: Candle): void => {
    const scope = scopeKey(candle);
    if (!session.subscriptions.some((subscription) => scopeKey(subscription) === scope)) return;
    const time = Date.parse(candle.timestamp);
    if (!Number.isFinite(time)) throw new Error("Binance returned an invalid realtime candle timestamp");
    const timestampKey = `${scope}|${candle.timestamp}`;
    const signature = candleSignature(candle);
    if (session.lastCandleByTimestamp.get(timestampKey) === signature) return;
    if (!candle.isClosed && session.closedCandleKeys.has(timestampKey)) return;
    const latest = session.latestClosedAt.get(scope);
    const wasPreviouslyObserved = session.lastCandleByTimestamp.has(timestampKey);
    if (latest !== undefined && time < latest && (!candle.isClosed || !wasPreviouslyObserved)) return;
    if (candle.isClosed) {
      session.latestClosedAt.set(scope, Math.max(latest ?? time, time));
      session.closedCandleKeys.add(timestampKey);
    }
    session.lastCandleByTimestamp.set(timestampKey, signature);
    session.sink({ kind: "CANDLE", payload: candle });
  };

  const reconcile = async (session: RealtimeSession): Promise<void> => {
    const requests = session.subscriptions.flatMap((subscription) => {
      const last = session.latestClosedAt.get(scopeKey(subscription));
      if (last === undefined) return [];
      const from = last + TIMEFRAME_MS[subscription.timeframe];
      const now = Date.parse(nowIso(clock));
      const to = Math.floor(now / TIMEFRAME_MS[subscription.timeframe]) * TIMEFRAME_MS[subscription.timeframe];
      if (from >= to) return [];
      return [{ subscription, range: { from: new Date(from).toISOString(), to: new Date(to).toISOString() } }];
    });
    for (const request of requests) {
      const expectedFrom = Date.parse(request.range.from);
      const expectedTo = Date.parse(request.range.to);
      const missingTimestamps: number[] = [];
      const interval = TIMEFRAME_MS[request.subscription.timeframe];
      for (let expected = expectedFrom; expected < expectedTo; expected += interval) {
        missingTimestamps.push(expected);
      }
      if (missingTimestamps.length > maxGapCandles) {
        report(options.observability, "HISTORY_GAP", `${scopeKey(request.subscription)} exceeds the reconciliation bound`);
        throw new Error("Binance realtime gap exceeds the configured bound");
      }
      const candles: Candle[] = [];
      let cursor: string | undefined;
      let complete = false;
      let pages = 0;
      do {
        pages += 1;
        if (pages > maxGapCandles) {
          report(options.observability, "HISTORY_GAP", `${scopeKey(request.subscription)} reconciliation exceeded the request bound`);
          throw new Error("Binance realtime gap reconciliation exceeded the request bound");
        }
        const result = await history.readCandles({
          pair: request.subscription.pair,
          timeframe: request.subscription.timeframe,
          range: request.range,
          limit: options.pageSize,
          ...(cursor ? { cursor } : {}),
          includeForming: false,
        });
        candles.push(
          ...result.candles.filter((candle) => {
            const timestamp = Date.parse(candle.timestamp);
            return (
              candle.isClosed &&
              candle.pair === request.subscription.pair &&
              candle.timeframe === request.subscription.timeframe &&
              timestamp >= expectedFrom &&
              timestamp < expectedTo
            );
          }),
        );
        if (candles.length > maxGapCandles) {
          report(options.observability, "HISTORY_GAP", `${scopeKey(request.subscription)} exceeds the reconciliation bound`);
          throw new Error("Binance realtime gap exceeds the configured bound");
        }
        complete = result.complete;
        cursor = result.nextCursor;
        if (result.missingRanges.length > 0) {
          report(options.observability, "HISTORY_GAP", `${scopeKey(request.subscription)} returned a partial reconciliation page`);
          throw new Error("Binance realtime gap reconciliation was incomplete");
        }
      } while (cursor);
      const returnedTimestamps = new Set(candles.map((candle) => Date.parse(candle.timestamp)));
      const unresolved = missingTimestamps.filter((expected) => !returnedTimestamps.has(expected));
      if (!complete || unresolved.length > 0) {
        report(options.observability, "HISTORY_GAP", `${scopeKey(request.subscription)} could not be fully reconciled`);
        throw new Error("Binance realtime gap reconciliation was incomplete");
      }
      const uniqueCandles = new Map<string, Candle>();
      for (const candle of candles) {
        const key = `${candle.pair}|${candle.timeframe}|${candle.timestamp}`;
        const previous = uniqueCandles.get(key);
        if (!previous || candleSignature(candle) > candleSignature(previous)) uniqueCandles.set(key, candle);
      }
      [...uniqueCandles.values()]
        .sort((left, right) => left.timestamp.localeCompare(right.timestamp))
        .forEach((candle) => acceptCandle(session, candle));
    }
  };

  const scheduleReconnect = (session: RealtimeSession): void => {
    if (session.stopped || stopped || session.reconnectPending) return;
    session.reconnectAttempts += 1;
    if (session.reconnectAttempts > maxReconnectAttempts) {
      emitStatus(session, "DISCONNECTED");
      settleReady(session, new Error("Binance realtime reconnect limit was reached"));
      return;
    }
    report(options.observability, "PROVIDER_RECONNECT", `reconnect attempt ${session.reconnectAttempts}`);
    const delay = Math.min(reconnectMaxDelayMs, reconnectBaseDelayMs * 2 ** (session.reconnectAttempts - 1));
    const reconnect = (): void => {
      session.reconnectPending = false;
      session.reconnectTimer = undefined;
      if (session.stopped || stopped) return;
      void connect(session);
    };
    session.reconnectPending = true;
    if (sleep) {
      try {
        void sleep(delay).then(reconnect).catch(() => {
          session.reconnectPending = false;
          report(options.observability, "PROVIDER_FAILURE", "Binance realtime reconnect wait failed");
          if (!session.stopped && !stopped) scheduleReconnect(session);
        });
      } catch {
        session.reconnectPending = false;
        report(options.observability, "PROVIDER_FAILURE", "Binance realtime reconnect wait failed");
        if (!session.stopped && !stopped) scheduleReconnect(session);
      }
    } else {
      session.reconnectTimer = setTimeout(reconnect, delay);
    }
  };

  const handleClosed = (session: RealtimeSession, socket: BinanceWebSocket): void => {
    if (session.socket !== socket) return;
    session.socket = undefined;
    if (session.stopped || stopped) return;
    emitStatus(session, "RECONNECTING");
    scheduleReconnect(session);
  };

  const connect = async (session: RealtimeSession): Promise<void> => {
    if (session.stopped || stopped) return;
    let socket: BinanceWebSocket;
    try {
      socket = socketFactory(websocketUrl);
    } catch {
      report(options.observability, "PROVIDER_FAILURE", "Binance realtime socket creation failed");
      emitStatus(session, "RECONNECTING");
      scheduleReconnect(session);
      return;
    }
    session.socket = socket;
    socket.onopen = () => {
      void (async () => {
        if (session.stopped || session.socket !== socket) return;
        try {
          socket.send(subscriptionMessage(session.subscriptions, nextRequestId++));
          // A new socket starts a fresh continuation queue. Messages received
          // after onopen are chained behind this REST reconciliation promise.
          session.continuation = Promise.resolve().then(() => reconcile(session));
          await session.continuation;
          if (session.stopped || session.socket !== socket) return;
          session.reconnectAttempts = 0;
          emitStatus(session, "CONNECTED");
          settleReady(session);
        } catch {
          report(options.observability, "PROVIDER_FAILURE", "Binance realtime connection recovery failed");
          if (session.socket === socket) {
            session.socket = undefined;
            socket.close();
          }
          if (!session.stopped && !stopped) {
            emitStatus(session, "RECONNECTING");
            scheduleReconnect(session);
          }
        }
      })();
    };
    socket.onmessage = (event) => {
      if (session.stopped || session.socket !== socket) return;
      session.continuation = session.continuation
        .then(async () => {
          const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
          const tick = parseRealtimeTick(payload);
          if (tick) {
            session.sink({ kind: "TICK", payload: tick });
            return;
          }
          const candle = parseRealtimeCandle(payload);
          if (candle) acceptCandle(session, candle);
        })
        .catch(() => {
          report(options.observability, "PROVIDER_FAILURE", "Binance realtime payload was malformed");
        });
    };
    socket.onerror = () => {
      report(options.observability, "PROVIDER_FAILURE", "Binance realtime socket failed");
      if (session.socket !== socket) return;
      handleClosed(session, socket);
      socket.close();
    };
    socket.onclose = () => handleClosed(session, socket);
  };

  const stopSession = async (session: RealtimeSession, notify: boolean): Promise<void> => {
    if (session.stopped) return;
    session.stopped = true;
    session.reconnectPending = false;
    if (session.reconnectTimer) clearTimeout(session.reconnectTimer);
    session.reconnectTimer = undefined;
    const socket = session.socket;
    session.socket = undefined;
    if (notify) emitStatus(session, "DISCONNECTED");
    socket?.close();
    settleReady(session, new Error("Binance realtime subscription was stopped"));
    sessions.delete(session);
  };

  const provider: MarketDataProvider = {
    id: "binance",
    readCandles(request: MarketDataHistoryRequest): Promise<MarketDataHistoryResult> {
      return history.readCandles(request);
    },
    async subscribe(subscriptions, sink): Promise<() => Promise<void>> {
      if (stopped) throw new Error("Binance provider is shut down");
      if (!Array.isArray(subscriptions) || subscriptions.length === 0 || typeof sink !== "function") {
        throw new Error("Binance realtime subscriptions are required");
      }
      const normalized = [...new Map(subscriptions.map((item) => {
        const subscription = canonicalSubscription(item);
        return [scopeKey(subscription), subscription] as const;
      })).values()];
      let resolveReady!: () => void;
      let rejectReady!: (error: Error) => void;
      const ready = new Promise<void>((resolve, reject) => {
        resolveReady = resolve;
        rejectReady = reject;
      });
      const session: RealtimeSession = {
        subscriptions: normalized,
        sink,
        stopped: false,
        reconnectAttempts: 0,
        reconnectPending: false,
        continuation: Promise.resolve(),
        ready,
        resolveReady,
        rejectReady,
        readySettled: false,
      latestClosedAt: new Map(),
      lastCandleByTimestamp: new Map(),
        closedCandleKeys: new Set(),
      };
      sessions.add(session);
      void connect(session);
      await ready;
      return async () => stopSession(session, true);
    },
    async shutdown(): Promise<void> {
      if (stopped) return;
      stopped = true;
      await Promise.all([...sessions].map((session) => stopSession(session, true)));
      await history.shutdown();
    },
  };
  return provider;
}
