import {
  REST_SCHEMA_VERSION,
  type CandleDto,
  type MarketHistoryRequestDto,
  type RestMarketTimeframe,
} from "@cryptox/contracts/rest";
import type { ChartState, MarketDataSource, MarketRealtimeEvent, Unsubscribe } from "./types";

type StateListener = () => void;

function mergeCandles(
  current: readonly CandleDto[],
  incoming: readonly CandleDto[],
): readonly CandleDto[] {
  const byTimestamp = new Map(current.map((candle) => [candle.timestamp, candle]));
  for (const candle of incoming) byTimestamp.set(candle.timestamp, candle);
  return [...byTimestamp.values()].sort(
    (left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp),
  );
}

export class ChartController {
  private state: ChartState;
  private readonly listeners = new Set<StateListener>();
  private unsubscribeMarket?: Unsubscribe;
  private generation = 0;
  private recovery?: Promise<void>;
  private recoveryToken = 0;
  private bufferedCandles: CandleDto[] = [];

  public constructor(
    id: string,
    pair: string,
    timeframe: RestMarketTimeframe,
    private readonly source: MarketDataSource,
    private readonly historyLimit = 120,
  ) {
    this.state = {
      id,
      pair,
      timeframe,
      candles: [],
      connection: "LOADING_HISTORY",
      stale: true,
    };
  }

  public snapshot = (): ChartState => this.state;

  public subscribe = (listener: StateListener): Unsubscribe => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public async start(): Promise<void> {
    const generation = ++this.generation;
    this.unsubscribeMarket?.();
    this.unsubscribeMarket = undefined;
    this.publish({ ...this.state, candles: [], connection: "LOADING_HISTORY", stale: true });
    try {
      const history = await this.source.readHistory(this.historyRequest());
      if (generation !== this.generation) return;
      this.publish({
        ...this.state,
        candles: history.candles,
        connection: "CONNECTING",
        stale: true,
        error: undefined,
      });
      this.unsubscribeMarket = this.source.subscribe(
        { pair: this.state.pair, timeframe: this.state.timeframe },
        (event) => this.onRealtime(event, generation),
      );
    } catch (error) {
      if (generation !== this.generation) return;
      this.publish({
        ...this.state,
        connection: "ERROR",
        stale: true,
        error: error instanceof Error ? error.message : "Unable to load market history",
      });
    }
  }

  public async changeTimeframe(timeframe: RestMarketTimeframe): Promise<void> {
    if (timeframe === this.state.timeframe) return;
    this.stop();
    this.state = { ...this.state, timeframe, candles: [], error: undefined };
    await this.start();
  }

  public stop(): void {
    this.generation += 1;
    this.unsubscribeMarket?.();
    this.unsubscribeMarket = undefined;
    this.recoveryToken += 1;
    this.recovery = undefined;
    this.bufferedCandles = [];
  }

  private onRealtime(event: MarketRealtimeEvent, generation: number): void {
    if (generation !== this.generation) return;
    if (event.type === "CANDLE") {
      if (this.recovery) {
        this.bufferedCandles.push(event.candle);
      } else {
        this.publish({ ...this.state, candles: mergeCandles(this.state.candles, [event.candle]) });
      }
      return;
    }

    if (event.status.status === "CONNECTED") {
      if (
        this.state.connection === "DISCONNECTED" ||
        this.state.connection === "RECONNECTING"
      ) {
        const recoveryToken = ++this.recoveryToken;
        this.recovery = this.recoverHistory(generation, recoveryToken);
      } else {
        this.publish({ ...this.state, connection: "LIVE", stale: false, error: undefined });
      }
    } else {
      this.publish({
        ...this.state,
        connection: event.status.status,
        stale: true,
      });
    }
  }

  private async recoverHistory(generation: number, recoveryToken: number): Promise<void> {
    this.publish({ ...this.state, connection: "RECOVERING", stale: true });
    this.bufferedCandles = [];
    try {
      const history = await this.source.readHistory(this.historyRequest());
      if (generation !== this.generation || recoveryToken !== this.recoveryToken) return;
      const reconciled = mergeCandles(history.candles, this.bufferedCandles);
      this.bufferedCandles = [];
      this.publish({
        ...this.state,
        candles: reconciled,
        connection: "LIVE",
        stale: false,
        error: undefined,
      });
    } catch (error) {
      if (generation !== this.generation || recoveryToken !== this.recoveryToken) return;
      this.publish({
        ...this.state,
        connection: "DISCONNECTED",
        stale: true,
        error: error instanceof Error ? error.message : "Market recovery failed",
      });
    } finally {
      if (recoveryToken === this.recoveryToken) this.recovery = undefined;
    }
  }

  private historyRequest(): MarketHistoryRequestDto {
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      pair: this.state.pair,
      timeframe: this.state.timeframe,
      range: {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      limit: this.historyLimit,
      includeForming: true,
      completeness: "ALLOW_PARTIAL",
    };
  }

  private publish(state: ChartState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}

export class MarketDashboardController {
  public readonly charts: readonly ChartController[];

  public constructor(
    source: MarketDataSource,
    configurations: readonly {
      id: string;
      pair: string;
      timeframe: RestMarketTimeframe;
    }[],
  ) {
    if (configurations.length < 1 || configurations.length > 4) {
      throw new Error("The market dashboard supports between one and four charts");
    }
    this.charts = configurations.map(
      ({ id, pair, timeframe }) => new ChartController(id, pair, timeframe, source),
    );
  }

  public async start(): Promise<void> {
    await Promise.all(this.charts.map((chart) => chart.start()));
  }

  public stop(): void {
    for (const chart of this.charts) chart.stop();
  }
}
