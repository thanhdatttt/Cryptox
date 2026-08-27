export const ACTIVE_MVP_MODULES = [
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
        name: "market-data-provider",
        available: false,
        detail: "No provider adapter is implemented in Stage 4A.",
      },
      {
        name: "backtest-runner",
        available: false,
        detail: "The real backtest simulator is intentionally not implemented.",
      },
      {
        name: "persistence-adapters",
        available: false,
        detail: "MVP repositories and schema await approved capability implementation.",
      },
    ],
    optionalDependencies: [
      {
        name: "news-provider",
        available: false,
        detail: "News is optional and no provider adapter is implemented.",
      },
      {
        name: "sentiment-provider",
        available: false,
        detail: "Sentiment is optional and no model provider is implemented.",
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
