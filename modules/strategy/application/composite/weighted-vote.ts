import {
  createWeightedVoteComposite,
  type WeightedVoteComposite,
  type WeightedVoteProvenance,
  type WeightedVoteResult,
  type WeightedVoteSignal,
  type WeightedVoteSignalInput,
  type WeightedVoteThresholds,
  WEIGHTED_VOTE_NORMALIZATION,
  WEIGHTED_VOTE_V1_ID,
} from "../../domain/composite";

export interface WeightedVoteStrategyDefinitionVersion {
  readonly id: string;
  readonly ownerUserId: string;
  readonly version: number;
}

export interface WeightedVoteComponentRecord {
  readonly strategyDefinitionId: string;
  readonly strategyDefinitionVersion: number;
  /** Optional in the shared Majority/Weighted record; required by this adapter. */
  readonly enabled?: boolean;
  /** Optional in the shared Majority/Weighted record; required by this adapter. */
  readonly weight?: number;
}

export interface WeightedVoteDefinitionRecord {
  readonly ownerUserId: string;
  readonly method: "MAJORITY_VOTE" | "WEIGHTED_VOTE";
  readonly combinationProfileId: "MAJORITY_VOTE_V1" | typeof WEIGHTED_VOTE_V1_ID;
  readonly components: readonly WeightedVoteComponentRecord[];
  readonly weightedVote?: {
    readonly profileId: typeof WEIGHTED_VOTE_V1_ID;
    readonly buyThreshold: number;
    readonly sellThreshold: number;
    readonly normalization: typeof WEIGHTED_VOTE_NORMALIZATION;
  };
}

export interface WeightedVoteCompositeApplicationAdapter {
  readonly provenance: WeightedVoteProvenance;
  evaluate(signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteResult;
  combine(signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteResult;
  combineSignals(signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteSignal;
}

export interface WeightedVoteCompositeFactory {
  create(
    definition: WeightedVoteDefinitionRecord,
    componentDefinitions: readonly WeightedVoteStrategyDefinitionVersion[],
  ): WeightedVoteCompositeApplicationAdapter;
}

export type WeightedVoteApplicationValidationCode =
  | "INVALID_WEIGHTED_VOTE_APPLICATION_DEFINITION"
  | "INVALID_WEIGHTED_VOTE_PROFILE"
  | "INVALID_WEIGHTED_VOTE_APPLICATION_COMPONENT"
  | "DUPLICATE_WEIGHTED_VOTE_COMPONENT_REFERENCE"
  | "MISSING_COMPONENT_DEFINITION"
  | "COMPONENT_VERSION_MISMATCH"
  | "CROSS_OWNER_COMPONENT_DEFINITION"
  | "DUPLICATE_COMPONENT_DEFINITION";

export class WeightedVoteApplicationValidationError extends Error {
  constructor(readonly code: WeightedVoteApplicationValidationCode) {
    super(code);
    this.name = "WeightedVoteApplicationValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function positiveVersion(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function invalid(code: WeightedVoteApplicationValidationCode): never {
  throw new WeightedVoteApplicationValidationError(code);
}

function referenceKey(id: string, version: number): string {
  return `${id}\u0000${version}`;
}

interface ValidatedWeightedVoteComponentRecord {
  readonly strategyDefinitionId: string;
  readonly strategyDefinitionVersion: number;
  readonly enabled: boolean;
  readonly weight: number;
}

function validateDefinition(
  definition: WeightedVoteDefinitionRecord,
): {
  ownerUserId: string;
  components: readonly ValidatedWeightedVoteComponentRecord[];
  thresholds?: WeightedVoteThresholds;
} {
  if (!isRecord(definition) || !nonEmptyString(definition.ownerUserId)) {
    return invalid("INVALID_WEIGHTED_VOTE_APPLICATION_DEFINITION");
  }
  if (
    definition.method !== "WEIGHTED_VOTE" ||
    definition.combinationProfileId !== WEIGHTED_VOTE_V1_ID ||
    !Array.isArray(definition.components) ||
    definition.components.length === 0
  ) {
    return invalid("INVALID_WEIGHTED_VOTE_PROFILE");
  }

  const seen = new Set<string>();
  const components: ValidatedWeightedVoteComponentRecord[] = [];
  for (const rawComponent of definition.components) {
    if (!isRecord(rawComponent)) return invalid("INVALID_WEIGHTED_VOTE_APPLICATION_COMPONENT");
    const strategyDefinitionId = rawComponent.strategyDefinitionId;
    const strategyDefinitionVersion = rawComponent.strategyDefinitionVersion;
    const enabled = rawComponent.enabled;
    const weight = rawComponent.weight;
    if (
      !nonEmptyString(strategyDefinitionId) ||
      !positiveVersion(strategyDefinitionVersion) ||
      typeof enabled !== "boolean" ||
      typeof weight !== "number" ||
      !Number.isFinite(weight) ||
      weight < 0
    ) {
      return invalid("INVALID_WEIGHTED_VOTE_APPLICATION_COMPONENT");
    }
    if (seen.has(strategyDefinitionId)) {
      return invalid("DUPLICATE_WEIGHTED_VOTE_COMPONENT_REFERENCE");
    }
    seen.add(strategyDefinitionId);
    components.push({ strategyDefinitionId, strategyDefinitionVersion, enabled, weight });
  }

  if (definition.weightedVote === undefined) {
    return { ownerUserId: definition.ownerUserId, components: Object.freeze(components) };
  }
  if (!isRecord(definition.weightedVote)) {
    return invalid("INVALID_WEIGHTED_VOTE_APPLICATION_DEFINITION");
  }
  if (
    definition.weightedVote.profileId !== WEIGHTED_VOTE_V1_ID ||
    definition.weightedVote.normalization !== WEIGHTED_VOTE_NORMALIZATION ||
    typeof definition.weightedVote.buyThreshold !== "number" ||
    typeof definition.weightedVote.sellThreshold !== "number"
  ) {
    return invalid("INVALID_WEIGHTED_VOTE_APPLICATION_DEFINITION");
  }
  return {
    ownerUserId: definition.ownerUserId,
    components: Object.freeze(components),
    thresholds: Object.freeze({
      buy: definition.weightedVote.buyThreshold,
      sell: definition.weightedVote.sellThreshold,
    }),
  };
}

function resolveComponentDefinitions(
  ownerUserId: string,
  components: readonly ValidatedWeightedVoteComponentRecord[],
  componentDefinitions: readonly WeightedVoteStrategyDefinitionVersion[],
  thresholds: WeightedVoteThresholds | undefined,
): WeightedVoteComposite {
  if (!Array.isArray(componentDefinitions)) return invalid("MISSING_COMPONENT_DEFINITION");

  const resolved = new Map<string, WeightedVoteStrategyDefinitionVersion>();
  for (const rawDefinition of componentDefinitions) {
    if (
      !isRecord(rawDefinition) ||
      !nonEmptyString(rawDefinition.id) ||
      !nonEmptyString(rawDefinition.ownerUserId) ||
      !positiveVersion(rawDefinition.version)
    ) {
      return invalid("MISSING_COMPONENT_DEFINITION");
    }
    const id = rawDefinition.id;
    const version = rawDefinition.version;
    const key = referenceKey(id, version);
    if (resolved.has(key)) return invalid("DUPLICATE_COMPONENT_DEFINITION");
    resolved.set(key, {
      id,
      ownerUserId: rawDefinition.ownerUserId,
      version,
    });
  }

  const inputs = components.map((component) => {
    const exact = resolved.get(
      referenceKey(component.strategyDefinitionId, component.strategyDefinitionVersion),
    );
    if (!exact) {
      const sameId = [...resolved.values()].some(
        (candidate) => candidate.id === component.strategyDefinitionId,
      );
      return invalid(sameId ? "COMPONENT_VERSION_MISMATCH" : "MISSING_COMPONENT_DEFINITION");
    }
    if (exact.ownerUserId !== ownerUserId) {
      return invalid("CROSS_OWNER_COMPONENT_DEFINITION");
    }
    return {
      strategyDefinitionId: component.strategyDefinitionId,
      strategyDefinitionVersion: component.strategyDefinitionVersion,
      ownerUserId: exact.ownerUserId,
      enabled: component.enabled,
      weight: component.weight,
    };
  });

  return createWeightedVoteComposite({
    ownerUserId,
    components: inputs,
    thresholds,
  });
}

export function createWeightedVoteCompositeAdapter(
  definition: WeightedVoteDefinitionRecord,
  componentDefinitions: readonly WeightedVoteStrategyDefinitionVersion[],
): WeightedVoteCompositeApplicationAdapter {
  const validated = validateDefinition(definition);
  // Resolve references after structural validation as a separate application
  // concern. The result is intentionally rebuilt through the domain factory so
  // no caller-owned record can remain in the executable closure.
  const resolvedComposite = resolveComponentDefinitions(
    validated.ownerUserId,
    validated.components,
    componentDefinitions,
    validated.thresholds,
  );
  const adapter: WeightedVoteCompositeApplicationAdapter = {
    provenance: resolvedComposite.provenance,
    evaluate: (signals) => resolvedComposite.combine(signals),
    combine: (signals) => resolvedComposite.combine(signals),
    combineSignals: (signals) => resolvedComposite.combine(signals).signal,
  };
  return Object.freeze(adapter);
}

export const weightedVoteCompositeFactory: WeightedVoteCompositeFactory = Object.freeze({
  create: createWeightedVoteCompositeAdapter,
});

export const WEIGHTED_VOTE_COMPOSITE_FACTORY = weightedVoteCompositeFactory;

export function createWeightedVoteCompositeFactory(): WeightedVoteCompositeFactory {
  return weightedVoteCompositeFactory;
}
