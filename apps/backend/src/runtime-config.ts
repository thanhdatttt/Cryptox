export type RuntimeProfile = "TEST" | "DEMO" | "DEVELOPMENT" | "PRODUCTION";

export interface BackendRuntimeConfig {
  profile: RuntimeProfile;
  durable: boolean;
  databaseUrl?: string;
  redisUrl?: string;
  jwtSecret?: string;
  marketDataProvider: "BINANCE" | "DEMO";
  newsProvider: string;
  strategyModelEndpoint?: string;
  strategyModelName?: string;
  strategyLlmApiKey?: string;
  strategyPromptVersion: string;
  strategyModelVersion?: string;
  strategyModelTimeoutMs: number;
  backtestRecoveryIntervalMs: number;
  backtestWorkerConcurrency: number;
  backtestPolicyDefaults: { initialCapital: number; feeRatePercent: number; slippageBps: number; maxAttempts: number };
}

const value = (env: NodeJS.ProcessEnv, key: string): string | undefined => {
  const candidate = env[key]?.trim();
  return candidate || undefined;
};

const positiveInteger = (env: NodeJS.ProcessEnv, key: string, fallback: number, minimum: number, maximum: number): number => {
  const raw = value(env, key);
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) throw new Error(`INVALID_CONFIGURATION:${key}`);
  return parsed;
};

const boundedNumber = (env: NodeJS.ProcessEnv, key: string, fallback: number, minimum: number, maximum: number): number => {
  const raw = value(env, key);
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) throw new Error(`INVALID_CONFIGURATION:${key}`);
  return parsed;
};

const profileFor = (env: NodeJS.ProcessEnv): RuntimeProfile => {
  const configured = value(env, "RUNTIME_PROFILE")?.toUpperCase();
  if (configured && ["TEST", "DEMO", "DEVELOPMENT", "PRODUCTION"].includes(configured)) return configured as RuntimeProfile;
  if (configured) throw new Error("INVALID_CONFIGURATION:RUNTIME_PROFILE");
  return env.NODE_ENV?.toLowerCase() === "test" ? "TEST" : "DEVELOPMENT";
};

const required = (env: NodeJS.ProcessEnv, key: string): string => {
  const result = value(env, key);
  if (!result) throw new Error(`MISSING_CONFIGURATION:${key}`);
  return result;
};

export function loadBackendRuntimeConfig(env: NodeJS.ProcessEnv = process.env, requestedProfile?: RuntimeProfile): BackendRuntimeConfig {
  const profile = requestedProfile ?? profileFor(env);
  const durable = profile === "DEVELOPMENT" || profile === "PRODUCTION";
  const databaseUrl = durable ? required(env, "DATABASE_URL") : value(env, "DATABASE_URL");
  const redisUrl = durable ? required(env, "REDIS_URL") : value(env, "REDIS_URL");
  const jwtSecret = durable ? required(env, "JWT_SECRET") : value(env, "JWT_SECRET");
  if (durable && jwtSecret!.length < 32) throw new Error("INVALID_CONFIGURATION:JWT_SECRET");

  const marketDataProvider = (value(env, "MARKET_DATA_PROVIDER") ?? (profile === "DEMO" ? "DEMO" : "BINANCE")).toUpperCase();
  if (marketDataProvider !== "BINANCE" && marketDataProvider !== "DEMO") throw new Error("INVALID_CONFIGURATION:MARKET_DATA_PROVIDER");
  if (profile === "PRODUCTION" && marketDataProvider === "DEMO") throw new Error("INVALID_CONFIGURATION:MARKET_DATA_PROVIDER");

  const strategyModelEndpoint = value(env, "STRATEGY_MODEL_ENDPOINT");
  const strategyModelName = value(env, "STRATEGY_MODEL_NAME");
  const strategyLlmApiKey = value(env, "STRATEGY_LLM_API_KEY");
  if (durable) {
    if (!strategyModelEndpoint) throw new Error("MISSING_CONFIGURATION:STRATEGY_MODEL_ENDPOINT");
    if (!strategyModelName) throw new Error("MISSING_CONFIGURATION:STRATEGY_MODEL_NAME");
    if (!strategyLlmApiKey) throw new Error("MISSING_CONFIGURATION:STRATEGY_LLM_API_KEY");
  }

  return {
    profile,
    durable,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(redisUrl ? { redisUrl } : {}),
    ...(jwtSecret ? { jwtSecret } : {}),
    marketDataProvider: marketDataProvider as "BINANCE" | "DEMO",
    newsProvider: value(env, "NEWS_PROVIDER") ?? "COINDESK_RSS",
    ...(strategyModelEndpoint ? { strategyModelEndpoint } : {}),
    ...(strategyModelName ? { strategyModelName } : {}),
    ...(strategyLlmApiKey ? { strategyLlmApiKey } : {}),
    strategyPromptVersion: value(env, "STRATEGY_PROMPT_VERSION") ?? "1",
    ...(strategyModelName ? { strategyModelVersion: value(env, "STRATEGY_MODEL_VERSION") ?? strategyModelName } : {}),
    strategyModelTimeoutMs: positiveInteger(env, "STRATEGY_MODEL_TIMEOUT_MS", 15_000, 100, 120_000),
    backtestRecoveryIntervalMs: positiveInteger(env, "BACKTEST_RECOVERY_INTERVAL_MS", 30_000, 5_000, 300_000),
    backtestWorkerConcurrency: positiveInteger(env, "BACKTEST_WORKER_CONCURRENCY", 1, 1, 100),
    backtestPolicyDefaults: {
      initialCapital: boundedNumber(env, "BACKTEST_DEFAULT_INITIAL_CAPITAL", 1_000, Number.MIN_VALUE, 1_000_000_000_000),
      feeRatePercent: boundedNumber(env, "BACKTEST_DEFAULT_FEE_RATE_PERCENT", 0, 0, 100),
      slippageBps: positiveInteger(env, "BACKTEST_DEFAULT_SLIPPAGE_BPS", 5, 0, 500),
      maxAttempts: positiveInteger(env, "BACKTEST_DEFAULT_MAX_ATTEMPTS", 1, 1, 10),
    },
  };
}
