export const ACTIVE_MVP_MODULES = [
  "auth",
  "marketData",
  "strategy",
  "search",
  "backtesting",
  "evaluation",
  "leaderboard",
  "news",
  "sentiment",
] as const;

export type ActiveMvpModule = (typeof ACTIVE_MVP_MODULES)[number];

export interface DependencyAvailability {
  name: string;
  available: boolean;
  detail: string;
}

export interface RuntimeCompositionState {
  activeModules: readonly ActiveMvpModule[];
  requiredDependencies: readonly DependencyAvailability[];
  optionalDependencies: readonly DependencyAvailability[];
}

export interface RuntimeReadiness {
  status: "ready" | "not-ready";
  unavailableRequired: readonly DependencyAvailability[];
  degradedOptional: readonly DependencyAvailability[];
}

export function composeRuntimeState(): RuntimeCompositionState {
  return {
    activeModules: ACTIVE_MVP_MODULES,
    requiredDependencies: [
      {
        name: "auth-persistence",
        available: false,
        detail: "DATABASE_URL is not configured.",
      },
      {
        name: "persistence-adapters",
        available: false,
        detail: "PostgreSQL application adapters are not configured.",
      },
      {
        name: "market-data-provider",
        available: false,
        detail: "The real Binance market provider is not configured.",
      },
      {
        name: "backtest-runner",
        available: false,
        detail: "The bounded local executor is available through the public Backtesting bootstrap but is not configured without runtime persistence.",
      },
      {
        name: "leaderboard-persistence",
        available: false,
        detail: "The PostgreSQL Leaderboard adapter is not configured.",
      },
      {
        name: "strategy-persistence",
        available: false,
        detail: "The public Strategy PostgreSQL adapter is not configured.",
      },
      {
        name: "search-composition",
        available: false,
        detail: "The public Search generator registry and persistence adapter are not configured.",
      },
    ],
    optionalDependencies: [
      {
        name: "news-provider",
        available: false,
        detail: "No explicitly configured real News provider is available.",
      },
      {
        name: "sentiment-provider",
        available: true,
        detail: "LEXICON_V1 is provided by the public local Sentiment facade.",
      },
      {
        name: "sentiment-persistence",
        available: false,
        detail: "The public Sentiment PostgreSQL adapter is not configured.",
      },
    ],
  };
}

export function readinessOf(composition: RuntimeCompositionState): RuntimeReadiness {
  const unavailableRequired = composition.requiredDependencies.filter(
    (dependency) => !dependency.available,
  );
  return {
    status: unavailableRequired.length === 0 ? "ready" : "not-ready",
    unavailableRequired,
    degradedOptional: composition.optionalDependencies.filter(
      (dependency) => !dependency.available,
    ),
  };
}

export const runtimeComposition = composeRuntimeState();
export const runtimeReadiness = readinessOf(runtimeComposition);
