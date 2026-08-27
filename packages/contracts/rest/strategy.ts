import { REST_SCHEMA_VERSION, RestContractValidationError } from "./common";
import { finiteNumber, recordValue, stringValue } from "./internal-validation";

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
  logicalFamilyKey: string;
  strategyName: string;
  implementationVersion: string;
  behaviorProfileId: string;
  version: number;
  parameters: Readonly<Record<string, StrategyParameterValueDto>>;
  createdAt: string;
}

export interface CompositeComponentDefinitionDto {
  strategyDefinitionId: string;
  strategyDefinitionVersion: number;
}

export interface CompositeStrategyDefinitionDto {
  id: string;
  logicalFamilyKey: string;
  version: number;
  method: "MAJORITY_VOTE";
  combinationProfileId: "MAJORITY_VOTE_V1";
  components: readonly CompositeComponentDefinitionDto[];
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

export function parseDefineStrategyRequest(value: unknown): DefineStrategyRequestDto {
  const input = recordValue(value, "define strategy request");
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
