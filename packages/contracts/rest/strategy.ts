import { REST_SCHEMA_VERSION, RestContractValidationError } from "./common";
import {
  finiteNumber,
  recordValue,
  rejectClientIdentityFields,
  stringValue,
} from "./internal-validation";

export type StrategySignalDto = "BUY" | "SELL" | "HOLD";
export type StrategyParameterValueDto = number | string;

export interface VisualizationSeriesDescriptorDto {
  key: string;
  label: string;
}

export interface StrategyVisualizationDescriptorDto {
  id: string;
  label: string;
  kind: "LINE" | "BAND" | "ZONE";
  pane: "PRICE" | "INDICATOR";
  series: readonly VisualizationSeriesDescriptorDto[];
}

export interface StrategyVisualizationPointDto {
  descriptorId: string;
  timestamp: string;
  values: Readonly<Record<string, number>>;
}

export interface StrategyParameterDescriptorDto {
  key: string;
  label: string;
  type: "INTEGER" | "NUMBER" | "ENUM";
  required: boolean;
  defaultValue: StrategyParameterValueDto;
  minimum?: number;
  maximum?: number;
  step?: number;
  options?: readonly string[];
}

export interface StrategyPluginDescriptorDto {
  name: string;
  displayName: string;
  description: string;
  category: "TREND" | "MOMENTUM" | "VOLATILITY" | "STRUCTURE" | "INFORMATION";
  implementationVersion: string;
  behaviorProfileId: string;
  parameters: readonly StrategyParameterDescriptorDto[];
  visualization: readonly StrategyVisualizationDescriptorDto[];
}

export interface StrategyDefinitionDto {
  id: string;
  ownerUserId: string;
  logicalFamilyKey: string;
  strategyName: string;
  implementationVersion: string;
  behaviorProfileId: string;
  version: number;
  parameters: Readonly<Record<string, StrategyParameterValueDto>>;
  authoringOrigin?: StrategyAuthoringOriginDto;
  createdAt: string;
}

export type StrategyAuthoringOriginDto =
  | { kind: "MANUAL" }
  | { kind: "LLM_DRAFT"; draftId: string; providerId: string; modelId: string }
  | { kind: "APPROVED_NEWS_ITEM"; newsItemId: string; extractionTemplateVersion?: number };

export type StrategyAuthoringSourceDto =
  | { kind: "PROMPT" }
  | { kind: "APPROVED_NEWS_ITEM"; newsItemId: string };

export type StrategyAuthoringDraftStatusDto = "DRAFT" | "VALIDATED" | "REJECTED" | "APPROVED";

export interface StrategyAuthoringDraftDto {
  id: string;
  ownerUserId: string;
  profileId: "LLM_AUTHORING_V1";
  source: StrategyAuthoringSourceDto;
  provider: { id: string; modelId: string; configured: boolean };
  status: StrategyAuthoringDraftStatusDto;
  structuredDraft?: Readonly<Record<string, StrategyParameterValueDto>>;
  validation?: { valid: boolean; reasons: readonly string[]; validatedAt: string };
  approvedDefinitionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompositeComponentDefinitionDto {
  strategyDefinitionId: string;
  strategyDefinitionVersion: number;
  enabled?: boolean;
  weight?: number;
}

export interface CompositeStrategyDefinitionDto {
  id: string;
  ownerUserId: string;
  logicalFamilyKey: string;
  version: number;
  method: "MAJORITY_VOTE" | "WEIGHTED_VOTE";
  combinationProfileId: string;
  components: readonly CompositeComponentDefinitionDto[];
  weightedVote?: {
    profileId: string;
    buyThreshold: number;
    sellThreshold: number;
    normalization: "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE";
  };
  createdAt: string;
}

export type StrategySelectionDto =
  | { kind: "STRATEGY"; strategyDefinitionId: string }
  | { kind: "COMPOSITE"; compositeDefinitionId: string };

export type StrategySelectionProvenanceDto =
  | { kind: "STRATEGY"; definition: StrategyDefinitionDto }
  | {
      kind: "COMPOSITE";
      definition: CompositeStrategyDefinitionDto;
      componentDefinitions: readonly StrategyDefinitionDto[];
    };

export interface StrategyCatalogResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  items: readonly StrategyPluginDescriptorDto[];
}

export interface DefineStrategyRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  logicalFamilyKey: string;
  strategyName: string;
  parameters: Readonly<Record<string, StrategyParameterValueDto>>;
}

export interface DefineStrategyResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  definition: StrategyDefinitionDto;
}

export interface DefineCompositeRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  logicalFamilyKey: string;
  combinationProfileId: "MAJORITY_VOTE_V1";
  strategyDefinitionIds: readonly string[];
}

export interface DefineCompositeResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  definition: CompositeStrategyDefinitionDto;
}

export interface CreateStrategyAuthoringDraftRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  source: StrategyAuthoringSourceDto;
  /** User-authored input is accepted only for the PROMPT source and is never returned or persisted. */
  prompt?: string;
}

export interface StrategyAuthoringDraftActionRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
}

export interface StrategyAuthoringDraftResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  draft: StrategyAuthoringDraftDto;
}

export interface ApproveStrategyAuthoringDraftResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  definition: StrategyDefinitionDto;
}

const AUTHORING_UNSAFE_REQUEST_FIELDS = new Set([
  "apikey",
  "secret",
  "credential",
  "credentials",
  "token",
  "password",
  "completion",
  "rawcompletion",
  "provider",
  "endpoint",
  "authorization",
  "cookie",
  "headers",
  "url",
  "uri",
  "structureddraft",
]);

function authoringKey(value: string): string {
  return value.replaceAll("_", "").replaceAll("-", "").toLowerCase();
}

function rejectUnsafeAuthoringRequestFields(
  input: Record<string, unknown>,
  label: string,
  allowPrompt: boolean,
): void {
  for (const key of Object.keys(input)) {
    if ((allowPrompt && key === "prompt") || key === "schemaVersion" || key === "source") continue;
    if (AUTHORING_UNSAFE_REQUEST_FIELDS.has(authoringKey(key))) {
      throw new RestContractValidationError(
        `${label} must not include provider credentials, raw completion, or persistence fields`,
      );
    }
  }
}

function exactAuthoringKeys(
  input: Record<string, unknown>,
  allowed: readonly string[],
  label: string,
): void {
  const allowedKeys = new Set(allowed);
  const unknown = Object.keys(input).find((key) => !allowedKeys.has(key));
  if (unknown) {
    throw new RestContractValidationError(`${label} contains unsupported field ${unknown}`);
  }
}

function parseStrategyAuthoringSource(value: unknown): StrategyAuthoringSourceDto {
  const source = recordValue(value, "source");
  rejectClientIdentityFields(source, "source");
  if (source.kind === "PROMPT") {
    exactAuthoringKeys(source, ["kind"], "source");
    return { kind: "PROMPT" };
  }
  if (source.kind === "APPROVED_NEWS_ITEM") {
    exactAuthoringKeys(source, ["kind", "newsItemId"], "source");
    const newsItemId = stringValue(source.newsItemId, "source.newsItemId").trim();
    if (!newsItemId) {
      throw new RestContractValidationError("source.newsItemId must be a non-empty string");
    }
    return {
      kind: "APPROVED_NEWS_ITEM",
      newsItemId,
    };
  }
  throw new RestContractValidationError("source.kind is not supported");
}

export function parseCreateStrategyAuthoringDraftRequest(
  value: unknown,
): CreateStrategyAuthoringDraftRequestDto {
  const input = recordValue(value, "create strategy authoring draft request");
  rejectClientIdentityFields(input, "create strategy authoring draft request");
  rejectUnsafeAuthoringRequestFields(input, "create strategy authoring draft request", true);
  exactAuthoringKeys(input, ["schemaVersion", "source", "prompt"], "create strategy authoring draft request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  const source = parseStrategyAuthoringSource(input.source);
  const hasPrompt = Object.prototype.hasOwnProperty.call(input, "prompt");
  if (source.kind === "PROMPT") {
    if (!hasPrompt) {
      throw new RestContractValidationError("prompt is required for a prompt authoring source");
    }
    const prompt = stringValue(input.prompt, "prompt").trim();
    if (!prompt) {
      throw new RestContractValidationError("prompt must be a non-empty string");
    }
    return {
      schemaVersion: REST_SCHEMA_VERSION,
      source,
      prompt,
    };
  }
  if (hasPrompt) {
    throw new RestContractValidationError("prompt is not accepted for approved News authoring");
  }
  return { schemaVersion: REST_SCHEMA_VERSION, source };
}

export function parseStrategyAuthoringDraftActionRequest(
  value: unknown,
): StrategyAuthoringDraftActionRequestDto {
  const input = recordValue(value, "strategy authoring draft action request");
  rejectClientIdentityFields(input, "strategy authoring draft action request");
  rejectUnsafeAuthoringRequestFields(input, "strategy authoring draft action request", false);
  exactAuthoringKeys(input, ["schemaVersion"], "strategy authoring draft action request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  return { schemaVersion: REST_SCHEMA_VERSION };
}

export function parseStrategyAuthoringDraftId(value: unknown): string {
  const draftId = stringValue(value, "draftId").trim();
  if (!draftId || draftId.length > 128 || /\s/u.test(draftId)) {
    throw new RestContractValidationError("draftId must be a bounded opaque identifier");
  }
  return draftId;
}


export function parseDefineStrategyRequest(value: unknown): DefineStrategyRequestDto {
  const input = recordValue(value, "define strategy request");
  rejectClientIdentityFields(input, "define strategy request");
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  const parameters = recordValue(input.parameters, "parameters");
  const normalizedParameters: Record<string, StrategyParameterValueDto> = {};
  for (const key of Object.keys(parameters).sort()) {
    stringValue(key, "parameter key");
    const parameter = parameters[key];
    normalizedParameters[key] =
      typeof parameter === "number"
        ? finiteNumber(parameter, `parameters.${key}`)
        : stringValue(parameter, `parameters.${key}`);
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    logicalFamilyKey: stringValue(input.logicalFamilyKey, "logicalFamilyKey"),
    strategyName: stringValue(input.strategyName, "strategyName"),
    parameters: normalizedParameters,
  };
}

export function parseDefineCompositeRequest(value: unknown): DefineCompositeRequestDto {
  const input = recordValue(value, "define composite request");
  rejectClientIdentityFields(input, "define composite request");
  if (
    input.schemaVersion !== REST_SCHEMA_VERSION ||
    input.combinationProfileId !== "MAJORITY_VOTE_V1"
  ) {
    throw new RestContractValidationError("Unsupported composite schema or profile");
  }
  if (!Array.isArray(input.strategyDefinitionIds)) {
    throw new RestContractValidationError("strategyDefinitionIds must be an array");
  }
  const strategyDefinitionIds = input.strategyDefinitionIds
    .map((id, index) => stringValue(id, `strategyDefinitionIds[${index}]`))
    .sort();
  if (strategyDefinitionIds.length < 2 || new Set(strategyDefinitionIds).size !== strategyDefinitionIds.length) {
    throw new RestContractValidationError("A composite requires at least two distinct definitions");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    logicalFamilyKey: stringValue(input.logicalFamilyKey, "logicalFamilyKey"),
    combinationProfileId: "MAJORITY_VOTE_V1",
    strategyDefinitionIds,
  };
}
