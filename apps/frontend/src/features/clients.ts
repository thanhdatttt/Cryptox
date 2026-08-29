import { REST_SCHEMA_VERSION, type NewsQueryDto } from "@cryptox/contracts/rest";
import type {
  CompositeDefinitionsResponseDto,
  ExperimentsResponseDto,
  FeatureClient,
  SearchRunsResponseDto,
  StrategyDefinitionsResponseDto,
} from "./types";
import type {
  BacktestSubmissionResponseDto,
  CandidateProgressResponseDto,
  CompositeStrategyDefinitionDto,
  DefineCompositeRequestDto,
  DefineCompositeResponseDto,
  DefineStrategyRequestDto,
  DefineStrategyResponseDto,
  ExperimentResponseDto,
  LeaderboardTopKResponseDto,
  NewsPageResponseDto,
  SearchRunStatusResponseDto,
  StartManualBacktestRequestDto,
  StartSearchRequestDto,
  StartSearchResponseDto,
  StrategyCatalogResponseDto,
  StrategyDefinitionDto,
  TradePageResponseDto,
} from "@cryptox/contracts/rest";

export interface FeatureFetchLike {
  (
    input: string,
    init?: RequestInit,
  ): Promise<Pick<Response, "ok" | "status" | "json">>;
}

export const browserFeatureFetch: FeatureFetchLike = (input, init) => fetch(input, init);

export class FeatureClientError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "FeatureClientError";
  }
}

function endpoint(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function objectValue(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FeatureClientError(502, `Feature API returned an invalid ${label}.`);
  }
  return value as Record<string, unknown>;
}

function schemaResponse(value: unknown, label: string): Record<string, unknown> {
  const response = objectValue(value, label);
  if (response.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new FeatureClientError(502, `Feature API returned an unsupported ${label} schema.`);
  }
  return response;
}

function arrayEnvelope<T>(value: unknown, key: string, label: string): { schemaVersion: 1; items: readonly T[] } {
  const response = schemaResponse(value, label);
  if (!Array.isArray(response[key])) {
    throw new FeatureClientError(502, `Feature API returned an invalid ${label} item list.`);
  }
  return { schemaVersion: REST_SCHEMA_VERSION, items: response[key] as readonly T[] };
}

function keyedResponse<T>(value: unknown, key: string, label: string): T {
  const response = schemaResponse(value, label);
  if (!(key in response)) {
    throw new FeatureClientError(502, `Feature API returned an invalid ${label}.`);
  }
  return response[key] as T;
}

function directResponse<T>(value: unknown, label: string): T {
  schemaResponse(value, label);
  return value as T;
}

function readQuery(query: NewsQueryDto): string {
  const params = new URLSearchParams({
    schemaVersion: String(query.schemaVersion),
    limit: String(query.limit),
    order: query.order,
  });
  if (query.cursor) params.set("cursor", query.cursor);
  if (query.publishedFrom) params.set("publishedFrom", query.publishedFrom);
  if (query.publishedTo) params.set("publishedTo", query.publishedTo);
  if (query.relatedCoins) params.set("relatedCoins", query.relatedCoins.join(","));
  return `/news?${params.toString()}`;
}

export class RestFeatureClient implements FeatureClient {
  public constructor(
    private readonly baseUrl: string,
    private readonly fetcher: FeatureFetchLike = browserFeatureFetch,
    private readonly onUnauthorized: () => void = () => undefined,
  ) {}

  public strategyCatalog(): Promise<StrategyCatalogResponseDto> {
    return this.get("/strategy/catalog", (value) => directResponse<StrategyCatalogResponseDto>(value, "strategy catalog"));
  }

  public strategyDefinitions(): Promise<StrategyDefinitionsResponseDto> {
    return this.get("/strategy/definitions", (value) => arrayEnvelope<StrategyDefinitionDto>(value, "items", "strategy definitions"));
  }

  public compositeDefinitions(): Promise<CompositeDefinitionsResponseDto> {
    return this.get("/strategy/composites", (value) => arrayEnvelope<CompositeStrategyDefinitionDto>(value, "items", "composite definitions"));
  }

  public defineStrategy(request: DefineStrategyRequestDto): Promise<DefineStrategyResponseDto> {
    return this.post("/strategy/definitions", request, (value) => keyedResponse<DefineStrategyResponseDto["definition"]>(value, "definition", "strategy definition")).then((definition) => ({ schemaVersion: REST_SCHEMA_VERSION, definition }));
  }

  public defineComposite(request: DefineCompositeRequestDto): Promise<DefineCompositeResponseDto> {
    return this.post("/strategy/composites", request, (value) => keyedResponse<DefineCompositeResponseDto["definition"]>(value, "definition", "composite definition")).then((definition) => ({ schemaVersion: REST_SCHEMA_VERSION, definition }));
  }

  public searchRuns(): Promise<SearchRunsResponseDto> {
    return this.get("/search/runs", (value) => arrayEnvelope(value, "items", "search runs"));
  }

  public startSearch(request: StartSearchRequestDto): Promise<StartSearchResponseDto> {
    return this.post("/search/runs", request, (value) => directResponse<StartSearchResponseDto>(value, "search start response"));
  }

  public searchStatus(searchRunId: string): Promise<SearchRunStatusResponseDto> {
    return this.get(`/search/runs/${encodeURIComponent(searchRunId)}`, (value) => directResponse<SearchRunStatusResponseDto>(value, "search status"));
  }

  public cancelSearch(searchRunId: string): Promise<void> {
    return this.post(`/search/runs/${encodeURIComponent(searchRunId)}/cancel`, undefined, () => undefined);
  }

  public startManualBacktest(request: StartManualBacktestRequestDto): Promise<BacktestSubmissionResponseDto> {
    return this.post("/backtesting", request, (value) => directResponse<BacktestSubmissionResponseDto>(value, "backtest submission"));
  }

  public candidateStatus(candidateId: string): Promise<CandidateProgressResponseDto> {
    return this.get(`/backtesting/candidates/${encodeURIComponent(candidateId)}`, (value) => directResponse<CandidateProgressResponseDto>(value, "candidate status"));
  }

  public experiments(): Promise<ExperimentsResponseDto> {
    return this.get("/backtesting/experiments", (value) => arrayEnvelope(value, "items", "experiments"));
  }

  public experiment(experimentId: string): Promise<ExperimentResponseDto> {
    return this.get(`/backtesting/experiments/${encodeURIComponent(experimentId)}`, (value) => directResponse<ExperimentResponseDto>(value, "experiment"));
  }

  public trades(experimentId: string): Promise<TradePageResponseDto> {
    return this.get(`/backtesting/experiments/${encodeURIComponent(experimentId)}/trades`, (value) => directResponse<TradePageResponseDto>(value, "trades"));
  }

  public leaderboard(): Promise<LeaderboardTopKResponseDto> {
    return this.get("/leaderboard", (value) => directResponse<LeaderboardTopKResponseDto>(value, "leaderboard"));
  }

  public news(query: NewsQueryDto): Promise<NewsPageResponseDto> {
    return this.get(readQuery(query), (value) => directResponse<NewsPageResponseDto>(value, "news"));
  }

  private async get<T>(path: string, parse: (value: unknown) => T): Promise<T> {
    return this.request(path, { method: "GET", headers: { accept: "application/json" } }, parse);
  }

  private async post<T>(path: string, body: unknown, parse: (value: unknown) => T): Promise<T> {
    return this.request(
      path,
      {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
      parse,
    );
  }

  private async request<T>(path: string, init: RequestInit, parse: (value: unknown) => T): Promise<T> {
    let response: Pick<Response, "ok" | "status" | "json">;
    try {
      response = await this.fetcher(endpoint(this.baseUrl, path), { ...init, credentials: "include" });
    } catch {
      throw new FeatureClientError(503, "Feature API is unavailable.");
    }
    if (response.status === 401) {
      this.onUnauthorized();
      throw new FeatureClientError(401, "Your session is no longer valid.", "UNAUTHENTICATED");
    }
    if (!response.ok) {
      throw new FeatureClientError(response.status, response.status === 404 ? "That private resource was not found." : "Feature API request failed.");
    }
    if (response.status === 204) return parse(undefined);
    try {
      return parse(await response.json());
    } catch (error) {
      if (error instanceof FeatureClientError) throw error;
      throw new FeatureClientError(502, "Feature API returned an invalid response.");
    }
  }
}
