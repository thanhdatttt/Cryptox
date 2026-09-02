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
  sentimentModelEndpoint?: string;
  sentimentModelName?: string;
  sentimentLlmApiKey?: string;
  sentimentModelVersion?: string;
  sentimentModelTimeoutMs: number;
  templateModelEndpoint?: string;
  templateModelName?: string;
  templateLlmApiKey?: string;
  crawlerSourceUrls: readonly string[];
  crawlerModelEndpoint?: string;
  crawlerModelName?: string;
  crawlerLlmApiKey?: string;
  crawlerPromptVersion: string;
  crawlerRequestTimeoutMs: number;
  crawlerMaxHtmlBytes: number;
  crawlerMaxInterpreterHtmlBytes: number;
  crawlerMaxOutputBytes: number;
  crawlerMaxCandidates: number;
  crawlerMaxFieldLength: number;
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

const parseUrlList = (env: NodeJS.ProcessEnv, key: string): string[] => {
  const raw = required(env, key);
  const urls = raw.split(/[,\r\n]+/).map((candidate) => candidate.trim()).filter(Boolean);
  if (!urls.length) throw new Error(`MISSING_CONFIGURATION:${key}`);
  for (const candidate of urls) {
    let url: URL;
    try { url = new URL(candidate); } catch { throw new Error(`INVALID_CONFIGURATION:${key}`); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || !url.hostname) throw new Error(`INVALID_CONFIGURATION:${key}`);
  }
  return [...new Set(urls)];
};

const validateEndpoint = (env: NodeJS.ProcessEnv, key: string, configured: string | undefined): string | undefined => {
  if (!configured) return undefined;
  let endpoint: URL;
  try { endpoint = new URL(configured); } catch { throw new Error(`INVALID_CONFIGURATION:${key}`); }
  if (!["http:", "https:"].includes(endpoint.protocol) || endpoint.username || endpoint.password) throw new Error(`INVALID_CONFIGURATION:${key}`);
  return endpoint.href;
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

  const newsProvider = (value(env, "NEWS_PROVIDER") ?? "COINDESK_RSS").toUpperCase();
  if (!["COINDESK_RSS", "CRAWLER_LLM", "CRAWLER", "LLM_CRAWLER"].includes(newsProvider)) {
    throw new Error(`INVALID_CONFIGURATION:NEWS_PROVIDER:${newsProvider}`);
  }
  const crawlerSourceUrls = newsProvider === "COINDESK_RSS" ? [] : parseUrlList(env, "CRAWLER_SOURCE_URLS");
  const crawlerModelEndpoint = validateEndpoint(env, "CRAWLER_MODEL_ENDPOINT", value(env, "CRAWLER_MODEL_ENDPOINT"));
  const crawlerModelName = value(env, "CRAWLER_MODEL_NAME");
  const crawlerLlmApiKey = value(env, "CRAWLER_LLM_API_KEY");
  const crawlerPromptVersion = value(env, "CRAWLER_PROMPT_VERSION") ?? "1";
  if (newsProvider !== "COINDESK_RSS") {
    if (!crawlerModelEndpoint) throw new Error("MISSING_CONFIGURATION:CRAWLER_MODEL_ENDPOINT");
    if (!crawlerModelName) throw new Error("MISSING_CONFIGURATION:CRAWLER_MODEL_NAME");
    if (!crawlerLlmApiKey) throw new Error("MISSING_CONFIGURATION:CRAWLER_LLM_API_KEY");
  }

  return {
    profile,
    durable,
    ...(databaseUrl ? { databaseUrl } : {}),
    ...(redisUrl ? { redisUrl } : {}),
    ...(jwtSecret ? { jwtSecret } : {}),
    marketDataProvider: marketDataProvider as "BINANCE" | "DEMO",
    newsProvider,
    ...(strategyModelEndpoint ? { strategyModelEndpoint } : {}),
    ...(strategyModelName ? { strategyModelName } : {}),
    ...(strategyLlmApiKey ? { strategyLlmApiKey } : {}),
    strategyPromptVersion: value(env, "STRATEGY_PROMPT_VERSION") ?? "1",
    ...(strategyModelName ? { strategyModelVersion: value(env, "STRATEGY_MODEL_VERSION") ?? strategyModelName } : {}),
    strategyModelTimeoutMs: positiveInteger(env, "STRATEGY_MODEL_TIMEOUT_MS", 15_000, 100, 120_000),
    ...(validateEndpoint(env, "SENTIMENT_MODEL_ENDPOINT", value(env, "SENTIMENT_MODEL_ENDPOINT")) ?? strategyModelEndpoint
      ? { sentimentModelEndpoint: validateEndpoint(env, "SENTIMENT_MODEL_ENDPOINT", value(env, "SENTIMENT_MODEL_ENDPOINT")) ?? strategyModelEndpoint } : {}),
    ...(value(env, "SENTIMENT_MODEL_NAME") ?? strategyModelName
      ? { sentimentModelName: value(env, "SENTIMENT_MODEL_NAME") ?? strategyModelName } : {}),
    ...(value(env, "SENTIMENT_LLM_API_KEY") ?? strategyLlmApiKey
      ? { sentimentLlmApiKey: value(env, "SENTIMENT_LLM_API_KEY") ?? strategyLlmApiKey } : {}),
    sentimentModelVersion: value(env, "SENTIMENT_MODEL_VERSION") ?? value(env, "SENTIMENT_MODEL_NAME") ?? strategyModelName,
    sentimentModelTimeoutMs: positiveInteger(env, "SENTIMENT_MODEL_TIMEOUT_MS", 15_000, 100, 120_000),
    ...(validateEndpoint(env, "TEMPLATE_MODEL_ENDPOINT", value(env, "TEMPLATE_MODEL_ENDPOINT")) ?? crawlerModelEndpoint ?? strategyModelEndpoint
      ? { templateModelEndpoint: validateEndpoint(env, "TEMPLATE_MODEL_ENDPOINT", value(env, "TEMPLATE_MODEL_ENDPOINT")) ?? crawlerModelEndpoint ?? strategyModelEndpoint } : {}),
    ...(value(env, "TEMPLATE_MODEL_NAME") ?? crawlerModelName ?? strategyModelName
      ? { templateModelName: value(env, "TEMPLATE_MODEL_NAME") ?? crawlerModelName ?? strategyModelName } : {}),
    ...(value(env, "TEMPLATE_LLM_API_KEY") ?? crawlerLlmApiKey ?? strategyLlmApiKey
      ? { templateLlmApiKey: value(env, "TEMPLATE_LLM_API_KEY") ?? crawlerLlmApiKey ?? strategyLlmApiKey } : {}),
    crawlerSourceUrls,
    ...(crawlerModelEndpoint ? { crawlerModelEndpoint } : {}),
    ...(crawlerModelName ? { crawlerModelName } : {}),
    ...(crawlerLlmApiKey ? { crawlerLlmApiKey } : {}),
    crawlerPromptVersion,
    crawlerRequestTimeoutMs: positiveInteger(env, "CRAWLER_REQUEST_TIMEOUT_MS", 10_000, 100, 120_000),
    crawlerMaxHtmlBytes: positiveInteger(env, "CRAWLER_MAX_HTML_BYTES", 1_000_000, 1_024, 10_000_000),
    crawlerMaxInterpreterHtmlBytes: positiveInteger(env, "CRAWLER_MAX_INTERPRETER_HTML_BYTES", 64_000, 1_024, 10_000_000),
    crawlerMaxOutputBytes: positiveInteger(env, "CRAWLER_MAX_OUTPUT_BYTES", 256_000, 1_024, 10_000_000),
    crawlerMaxCandidates: positiveInteger(env, "CRAWLER_MAX_CANDIDATES", 8, 1, 64),
    crawlerMaxFieldLength: positiveInteger(env, "CRAWLER_MAX_FIELD_LENGTH", 50_000, 128, 500_000),
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
