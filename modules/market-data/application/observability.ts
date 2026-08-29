import type {
  MarketDataConnectionStatus,
  MarketObservedTick,
  MarketObservabilityState,
  Pair,
} from "../api/contracts";

const OBSERVABILITY_PROFILE_ID = ["MARKET", "OBSERVABILITY", "V1"].join("_") as MarketObservabilityState["profileId"];
const OBSERVABILITY_PERSISTENCE = ["EPHEMERAL", "IN_MEMORY", "ONLY"].join("_") as MarketObservabilityState["persistence"];
const TICK_BUFFER_LIMIT = 100;

interface MutablePairState {
  connection: MarketDataConnectionStatus;
  lastLatencyMs: number | null;
  latestTicks: MarketObservedTick[];
}

/**
 * Delivery-only market health state. It deliberately has no persistence or
 * history-facing methods; constructing a new instance (or clearing it on a
 * restart) loses the projection.
 */
export class InMemoryMarketObservability {
  private readonly states = new Map<Pair, MutablePairState>();

  public recordConnection(pair: Pair, connection: MarketDataConnectionStatus): void {
    const current = this.states.get(pair);
    this.states.set(pair, {
      connection: { ...connection },
      lastLatencyMs: current?.lastLatencyMs ?? null,
      latestTicks: current?.latestTicks ? [...current.latestTicks] : [],
    });
  }

  public recordTick(pair: Pair, tick: MarketObservedTick, connection: MarketDataConnectionStatus): void {
    const current = this.states.get(pair);
    const latestTicks = current?.latestTicks ? [...current.latestTicks, { ...tick }] : [{ ...tick }];
    if (latestTicks.length > TICK_BUFFER_LIMIT) {
      latestTicks.splice(0, latestTicks.length - TICK_BUFFER_LIMIT);
    }
    this.states.set(pair, {
      connection: current?.connection ? { ...current.connection } : { ...connection },
      lastLatencyMs: tick.latencyMs,
      latestTicks,
    });
  }

  public read(pair: Pair): MarketObservabilityState | undefined {
    const current = this.states.get(pair);
    if (!current) return undefined;
    return {
      profileId: OBSERVABILITY_PROFILE_ID,
      pair,
      connection: { ...current.connection },
      lastLatencyMs: current.lastLatencyMs,
      latestTicks: current.latestTicks.map((tick) => ({ ...tick })),
      persistence: OBSERVABILITY_PERSISTENCE,
    };
  }

  public clearOnRestart(): void {
    this.states.clear();
  }
}
