import type { CompositeStrategyDefinition, StrategyDefinition, StrategyPluginDescriptor } from "../domain/contracts";
export interface StrategyDefinitionRepository {
  insert(ownerUserId: string, definition: StrategyDefinition): Promise<StrategyDefinition>;
  list(ownerUserId: string): Promise<StrategyDefinition[]>;
  listByIds(ownerUserId: string, ids: string[]): Promise<StrategyDefinition[]>;
  listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<StrategyDefinition[]>;
  exists?(id: string): Promise<boolean>;
  delete?(ownerUserId: string, id: string): Promise<boolean>;
}
export interface CompositeDefinitionRepository {
  insert(ownerUserId: string, definition: CompositeStrategyDefinition): Promise<CompositeStrategyDefinition>;
  list(ownerUserId: string): Promise<CompositeStrategyDefinition[]>;
  get(ownerUserId: string, id: string): Promise<CompositeStrategyDefinition | undefined>;
  listByLogicalFamily(ownerUserId: string, logicalFamilyKey: string): Promise<CompositeStrategyDefinition[]>;
  delete?(ownerUserId: string, id: string): Promise<boolean>;
}

export type StrategyGenerationSource =
  | { sourceType: "TEXT"; text: string }
  | { sourceType: "URL"; url: string };

export type GeneratedStrategyProposal =
  | {
      kind: "SINGLE";
      strategyName: string;
      parameters: Record<string, number | string>;
    }
  | {
      kind: "COMPOSITE";
      components: Array<{
        strategyName: string;
        parameters: Record<string, number | string>;
        weight: number;
      }>;
      method: import("../domain/contracts").CombinationMethod;
      thresholds: { buy: number; sell: number };
    };

export interface StrategyGenerationAdapter {
  readonly modelName?: string;
  readonly modelVersion?: string;
  generate(input: {
    sourceText: string;
    strategies: readonly StrategyPluginDescriptor[];
    promptVersion: string;
  }): Promise<GeneratedStrategyProposal>;
}

export interface StrategySourceLoader {
  load(url: string): Promise<{ sourceText: string; canonicalUrl: string }>;
}

export interface StrategyGenerationRequest {
  id: string;
  ownerUserId: string;
  sourceType: "TEXT" | "URL";
  sourceText?: string;
  sourceUrl?: string;
  modelName: string;
  modelVersion: string;
  promptVersion: string;
  outputKind: "SINGLE" | "COMPOSITE";
  strategyDefinitionId?: string;
  compositeDefinitionId?: string;
  createdAt: string;
}

export interface StrategyGenerationRepository {
  insert(request: StrategyGenerationRequest): Promise<StrategyGenerationRequest>;
}

export interface StrategyGenerationUnitOfWork {
  commit(input: {
    ownerUserId: string;
    definitions: StrategyDefinition[];
    composite?: CompositeStrategyDefinition;
    audit: StrategyGenerationRequest;
  }): Promise<void>;
}
