import {
  REST_SCHEMA_VERSION,
  type ApproveStrategyAuthoringDraftResponseDto,
  type CreateStrategyAuthoringDraftRequestDto,
  type NewsQueryDto,
  type StrategyAuthoringDraftActionRequestDto,
  type StrategyAuthoringDraftDto,
  type StrategyAuthoringDraftResponseDto,
  type StrategyAuthoringOriginDto,
  type StrategyAuthoringSourceDto,
  type StrategyDefinitionDto,
  type StrategyParameterValueDto,
} from "@cryptox/contracts/rest";
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
  TradePageResponseDto,
} from "@cryptox/contracts/rest";

export const FEATURE_ENDPOINTS = {
  strategyCatalog: "/strategy/catalog",
  strategyDefinitions: "/strategy/definitions",
  strategyComposites: "/strategy/composites",
  authoringDrafts: "/strategy/authoring/drafts",
  searchRuns: "/search/runs",
  backtesting: "/backtesting",
  experiments: "/backtesting/experiments",
  leaderboard: "/leaderboard",
} as const;

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

function sameOriginBaseUrl(baseUrl: string): string | undefined {
  if (typeof baseUrl !== "string") return undefined;
  const normalized = baseUrl.trim();
  if (normalized === "") return "";
  if (!normalized.startsWith("/") || normalized.startsWith("//") || /[?#]/u.test(normalized)) {
    return undefined;
  }
  return normalized.replace(/\/+$/u, "");
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

function stringField(input: Record<string, unknown>, key: string, label: string): string {
  if (typeof input[key] !== "string" || input[key].length === 0) {
    throw new FeatureClientError(502, `Feature API returned an invalid ${label}.`);
  }
  return input[key] as string;
}

function numberField(input: Record<string, unknown>, key: string, label: string): number {
  if (typeof input[key] !== "number" || !Number.isFinite(input[key])) {
    throw new FeatureClientError(502, `Feature API returned an invalid ${label}.`);
  }
  return input[key] as number;
}

function opaqueDraftId(value: string): string {
  if (typeof value !== "string") {
    throw new FeatureClientError(400, "The authoring draft id is invalid.", "INVALID_DRAFT_ID");
  }
  const draftId = value.trim();
  if (!draftId || draftId.length > 128 || /\s/u.test(draftId)) {
    throw new FeatureClientError(400, "The authoring draft id is invalid.", "INVALID_DRAFT_ID");
  }
  return draftId;
}

function createAuthoringRequest(
  request: CreateStrategyAuthoringDraftRequestDto,
): CreateStrategyAuthoringDraftRequestDto {
  const source = request?.source as unknown;
  if (typeof source !== "object" || source === null || Array.isArray(source)) {
    throw new FeatureClientError(400, "The authoring source is invalid.", "INVALID_REQUEST");
  }
  const sourceRecord = source as Record<string, unknown>;
  if (sourceRecord.kind === "PROMPT") {
    if (typeof request.prompt !== "string" || !request.prompt.trim()) {
      throw new FeatureClientError(400, "The authoring prompt is required.", "INVALID_REQUEST");
    }
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      source: { kind: "PROMPT" },
      prompt: request.prompt.trim(),
    };
  }
  if (sourceRecord.kind === "APPROVED_NEWS_ITEM") {
    if (typeof sourceRecord.newsItemId !== "string" || !sourceRecord.newsItemId.trim()) {
      throw new FeatureClientError(400, "The approved News item id is required.", "INVALID_REQUEST");
    }
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      source: { kind: "APPROVED_NEWS_ITEM", newsItemId: sourceRecord.newsItemId.trim() },
    };
  }
  throw new FeatureClientError(400, "The authoring source is invalid.", "INVALID_REQUEST");
}

function authoringActionRequest(
  _request: StrategyAuthoringDraftActionRequestDto,
): StrategyAuthoringDraftActionRequestDto {
  return { schemaVersion: REST_SCHEMA_VERSION };
}

function safeParameterRecord(value: unknown, label: string): Readonly<Record<string, StrategyParameterValueDto>> {
  const input = objectValue(value, label);
  const result: Record<string, StrategyParameterValueDto> = {};
  for (const [key, parameter] of Object.entries(input)) {
    if (
      (typeof parameter !== "number" || !Number.isFinite(parameter)) &&
      typeof parameter !== "string"
    ) {
      throw new FeatureClientError(502, `Feature API returned an invalid ${label}.`);
    }
    result[key] = parameter as StrategyParameterValueDto;
  }
  return result;
}

function safeAuthoringSource(value: unknown): StrategyAuthoringSourceDto {
  const input = objectValue(value, "authoring source");
  if (input.kind === "PROMPT") return { kind: "PROMPT" };
  if (input.kind === "APPROVED_NEWS_ITEM") {
    return {
      kind: "APPROVED_NEWS_ITEM",
      newsItemId: stringField(input, "newsItemId", "authoring News item id"),
    };
  }
  throw new FeatureClientError(502, "Feature API returned an invalid authoring source.");
}

function safeAuthoringOrigin(value: unknown): StrategyAuthoringOriginDto {
  const input = objectValue(value, "authoring origin");
  if (input.kind === "MANUAL") return { kind: "MANUAL" };
  if (input.kind === "LLM_DRAFT") {
    return {
      kind: "LLM_DRAFT",
      draftId: stringField(input, "draftId", "authoring draft id"),
      providerId: stringField(input, "providerId", "authoring provider id"),
      modelId: stringField(input, "modelId", "authoring model id"),
    };
  }
  if (input.kind === "APPROVED_NEWS_ITEM") {
    const extractionTemplateVersion = input.extractionTemplateVersion;
    return {
      kind: "APPROVED_NEWS_ITEM",
      newsItemId: stringField(input, "newsItemId", "authoring News item id"),
      ...(extractionTemplateVersion === undefined
        ? {}
        : { extractionTemplateVersion: numberField(input, "extractionTemplateVersion", "extraction template version") }),
    };
  }
  throw new FeatureClientError(502, "Feature API returned an invalid authoring origin.");
}

function safeAuthoringDraft(value: unknown): StrategyAuthoringDraftDto {
  const input = objectValue(value, "authoring draft");
  const provider = objectValue(input.provider, "authoring provider");
  const status = input.status;
  if (status !== "DRAFT" && status !== "VALIDATED" && status !== "REJECTED" && status !== "APPROVED") {
    throw new FeatureClientError(502, "Feature API returned an invalid authoring draft status.");
  }
  if (typeof provider.configured !== "boolean") {
    throw new FeatureClientError(502, "Feature API returned an invalid authoring provider state.");
  }
  const result: StrategyAuthoringDraftDto = {
    id: stringField(input, "id", "authoring draft id"),
    ownerUserId: stringField(input, "ownerUserId", "authoring draft owner"),
    profileId: "LLM_AUTHORING_V1",
    source: safeAuthoringSource(input.source),
    provider: {
      id: stringField(provider, "id", "authoring provider id"),
      modelId: stringField(provider, "modelId", "authoring model id"),
      configured: provider.configured === true,
    },
    status,
    createdAt: stringField(input, "createdAt", "authoring draft creation time"),
    updatedAt: stringField(input, "updatedAt", "authoring draft update time"),
  };
  if (input.structuredDraft !== undefined) {
    result.structuredDraft = safeParameterRecord(input.structuredDraft, "structured draft");
  }
  if (input.validation !== undefined) {
    const validation = objectValue(input.validation, "authoring validation");
    if (typeof validation.valid !== "boolean" || !Array.isArray(validation.reasons)) {
      throw new FeatureClientError(502, "Feature API returned an invalid authoring validation.");
    }
    result.validation = {
      valid: validation.valid,
      reasons: validation.reasons.every((reason): reason is string => typeof reason === "string")
        ? validation.reasons
        : (() => { throw new FeatureClientError(502, "Feature API returned invalid authoring validation reasons."); })(),
      validatedAt: stringField(validation, "validatedAt", "authoring validation time"),
    };
  }
  if (input.approvedDefinitionId !== undefined) {
    result.approvedDefinitionId = stringField(input, "approvedDefinitionId", "approved definition id");
  }
  return result;
}

function safeStrategyDefinition(value: unknown): StrategyDefinitionDto {
  const input = objectValue(value, "strategy definition");
  const result: StrategyDefinitionDto = {
    id: stringField(input, "id", "strategy definition id"),
    ownerUserId: stringField(input, "ownerUserId", "strategy definition owner"),
    logicalFamilyKey: stringField(input, "logicalFamilyKey", "strategy logical family"),
    strategyName: stringField(input, "strategyName", "strategy name"),
    implementationVersion: stringField(input, "implementationVersion", "strategy implementation version"),
    behaviorProfileId: stringField(input, "behaviorProfileId", "strategy behavior profile"),
    version: numberField(input, "version", "strategy definition version"),
    parameters: safeParameterRecord(input.parameters, "strategy parameters"),
    createdAt: stringField(input, "createdAt", "strategy definition creation time"),
  };
  if (input.authoringOrigin !== undefined) result.authoringOrigin = safeAuthoringOrigin(input.authoringOrigin);
  return result;
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
  private readonly baseUrl: string | undefined;
  public readonly authoringTransportAvailable: boolean;

  public constructor(
    baseUrl: string,
    private readonly fetcher: FeatureFetchLike = browserFeatureFetch,
    private readonly onUnauthorized: () => void = () => undefined,
  ) {
    this.baseUrl = sameOriginBaseUrl(baseUrl);
    this.authoringTransportAvailable = this.baseUrl !== undefined;
  }

  public strategyCatalog(): Promise<StrategyCatalogResponseDto> {
    return this.get(FEATURE_ENDPOINTS.strategyCatalog, (value) => directResponse<StrategyCatalogResponseDto>(value, "strategy catalog"));
  }

  public strategyDefinitions(): Promise<StrategyDefinitionsResponseDto> {
    return this.get(FEATURE_ENDPOINTS.strategyDefinitions, (value) => arrayEnvelope<StrategyDefinitionDto>(value, "items", "strategy definitions"));
  }

  public compositeDefinitions(): Promise<CompositeDefinitionsResponseDto> {
    return this.get(FEATURE_ENDPOINTS.strategyComposites, (value) => arrayEnvelope<CompositeStrategyDefinitionDto>(value, "items", "composite definitions"));
  }

  public defineStrategy(request: DefineStrategyRequestDto): Promise<DefineStrategyResponseDto> {
    return this.post("/strategy/definitions", request, (value) => keyedResponse<DefineStrategyResponseDto["definition"]>(value, "definition", "strategy definition")).then((definition) => ({ schemaVersion: REST_SCHEMA_VERSION, definition }));
  }

  public defineComposite(request: DefineCompositeRequestDto): Promise<DefineCompositeResponseDto> {
    return this.post("/strategy/composites", request, (value) => keyedResponse<DefineCompositeResponseDto["definition"]>(value, "definition", "composite definition")).then((definition) => ({ schemaVersion: REST_SCHEMA_VERSION, definition }));
  }

  public createStrategyAuthoringDraft(
    request: CreateStrategyAuthoringDraftRequestDto,
  ): Promise<StrategyAuthoringDraftResponseDto> {
    return this.post(
      FEATURE_ENDPOINTS.authoringDrafts,
      createAuthoringRequest(request),
      (value) => ({
        schemaVersion: REST_SCHEMA_VERSION,
        draft: safeAuthoringDraft(keyedResponse(value, "draft", "strategy authoring draft")),
      }),
    );
  }

  public validateStrategyAuthoringDraft(
    draftId: string,
    request: StrategyAuthoringDraftActionRequestDto,
  ): Promise<StrategyAuthoringDraftResponseDto> {
    return this.post(
      `${FEATURE_ENDPOINTS.authoringDrafts}/${encodeURIComponent(opaqueDraftId(draftId))}/validate`,
      authoringActionRequest(request),
      (value) => ({
        schemaVersion: REST_SCHEMA_VERSION,
        draft: safeAuthoringDraft(keyedResponse(value, "draft", "strategy authoring draft")),
      }),
    );
  }

  public approveStrategyAuthoringDraft(
    draftId: string,
    request: StrategyAuthoringDraftActionRequestDto,
  ): Promise<ApproveStrategyAuthoringDraftResponseDto> {
    return this.post(
      `${FEATURE_ENDPOINTS.authoringDrafts}/${encodeURIComponent(opaqueDraftId(draftId))}/approve`,
      authoringActionRequest(request),
      (value) => ({
        schemaVersion: REST_SCHEMA_VERSION,
        definition: safeStrategyDefinition(keyedResponse(value, "definition", "approved strategy definition")),
      }),
    );
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
    if (this.baseUrl === undefined) {
      throw new FeatureClientError(503, "Feature API requires a same-origin transport.", "TRANSPORT_UNAVAILABLE");
    }
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
