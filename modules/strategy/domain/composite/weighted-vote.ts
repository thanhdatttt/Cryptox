export const WEIGHTED_VOTE_V1_ID = "WEIGHTED_VOTE_V1" as const;

export type WeightedVoteSignal = "BUY" | "HOLD" | "SELL";

export const WEIGHTED_VOTE_NORMALIZATION =
  "ENABLED_FINITE_NON_NEGATIVE_WEIGHTS_SUM_TO_ONE" as const;

export const WEIGHTED_VOTE_SIGNAL_SCORES: Readonly<Record<WeightedVoteSignal, number>> =
  Object.freeze({
    BUY: 1,
    HOLD: 0,
    SELL: -1,
  });

export const WEIGHTED_VOTE_DEFAULT_THRESHOLDS = Object.freeze({
  buy: 0.3,
  sell: -0.3,
});

/**
 * The domain copy of the approved profile is intentionally independent from
 * the transport contract. It is a pure policy description, not registration.
 */
export const WEIGHTED_VOTE_V1 = Object.freeze({
  id: WEIGHTED_VOTE_V1_ID,
  method: "WEIGHTED_VOTE" as const,
  signalMapping: WEIGHTED_VOTE_SIGNAL_SCORES,
  thresholds: WEIGHTED_VOTE_DEFAULT_THRESHOLDS,
  normalization: WEIGHTED_VOTE_NORMALIZATION,
  immutableFields: Object.freeze([
    "COMPONENT_VERSION",
    "ENABLED",
    "WEIGHT",
    "THRESHOLDS",
  ] as const),
});

export interface WeightedVoteThresholds {
  readonly buy: number;
  readonly sell: number;
}

/**
 * A resolved component supplied to the pure domain policy. The owner is kept
 * at this boundary so a composite cannot be built from another user's
 * definition, while the public provenance below records one composite owner.
 */
export interface WeightedVoteComponentInput {
  readonly strategyDefinitionId: string;
  readonly strategyDefinitionVersion: number;
  readonly ownerUserId: string;
  readonly enabled: boolean;
  readonly weight: number;
}

export interface WeightedVoteCompositeInput {
  readonly ownerUserId: string;
  readonly components: readonly WeightedVoteComponentInput[];
  readonly thresholds?: WeightedVoteThresholds;
}

export interface WeightedVoteComponentProvenance {
  readonly strategyDefinitionId: string;
  readonly strategyDefinitionVersion: number;
  readonly enabled: boolean;
  /** Normalized over enabled components; disabled components are always zero. */
  readonly weight: number;
}

export interface WeightedVoteProvenance {
  readonly profileId: typeof WEIGHTED_VOTE_V1_ID;
  readonly method: "WEIGHTED_VOTE";
  readonly ownerUserId: string;
  readonly components: readonly WeightedVoteComponentProvenance[];
  readonly thresholds: Readonly<WeightedVoteThresholds>;
  readonly normalization: typeof WEIGHTED_VOTE_NORMALIZATION;
}

export interface WeightedVoteSignalInput {
  readonly strategyDefinitionId: string;
  readonly signal: WeightedVoteSignal;
}

export interface WeightedVoteResult {
  readonly signal: WeightedVoteSignal;
  readonly score: number;
}

export interface WeightedVoteComposite {
  readonly provenance: WeightedVoteProvenance;
  combine(signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteResult;
  signalFor(signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteSignal;
}

export type WeightedVoteValidationCode =
  | "INVALID_WEIGHTED_VOTE_DEFINITION"
  | "INVALID_WEIGHTED_VOTE_COMPONENTS"
  | "DUPLICATE_WEIGHTED_VOTE_COMPONENT"
  | "CROSS_OWNER_COMPONENT_DEFINITION"
  | "INVALID_WEIGHTED_VOTE_WEIGHTS"
  | "NO_ENABLED_WEIGHTED_VOTE_COMPONENTS"
  | "ZERO_ENABLED_WEIGHT_TOTAL"
  | "INVALID_WEIGHTED_VOTE_THRESHOLDS"
  | "INVALID_WEIGHTED_VOTE_SIGNALS"
  | "NON_FINITE_WEIGHTED_VOTE_SCORE";

export class WeightedVoteValidationError extends Error {
  constructor(readonly code: WeightedVoteValidationCode) {
    super(code);
    this.name = "WeightedVoteValidationError";
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

function invalid(code: WeightedVoteValidationCode): never {
  throw new WeightedVoteValidationError(code);
}

function readThresholds(input: Record<string, unknown>): Readonly<WeightedVoteThresholds> {
  const rawThresholds = input.thresholds;
  if (rawThresholds === undefined) return WEIGHTED_VOTE_DEFAULT_THRESHOLDS;
  if (!isRecord(rawThresholds)) return invalid("INVALID_WEIGHTED_VOTE_THRESHOLDS");

  const buy = rawThresholds.buy;
  const sell = rawThresholds.sell;
  if (
    typeof buy !== "number" ||
    typeof sell !== "number" ||
    !Number.isFinite(buy) ||
    !Number.isFinite(sell) ||
    buy < 0 ||
    sell > 0 ||
    sell >= buy
  ) {
    return invalid("INVALID_WEIGHTED_VOTE_THRESHOLDS");
  }

  return Object.freeze({ buy, sell });
}

function normalizeWeights(
  components: readonly WeightedVoteComponentInput[],
): readonly number[] {
  const enabledIndexes = components.flatMap((component, index) =>
    component.enabled ? [index] : [],
  );
  if (enabledIndexes.length === 0) return invalid("NO_ENABLED_WEIGHTED_VOTE_COMPONENTS");

  let maximum = 0;
  let rawTotal = 0;
  for (const index of enabledIndexes) {
    const weight = components[index]!.weight;
    maximum = Math.max(maximum, weight);
    rawTotal += weight;
  }
  if (!Number.isFinite(maximum) || maximum <= 0) {
    return invalid("ZERO_ENABLED_WEIGHT_TOTAL");
  }

  if (Number.isFinite(rawTotal) && rawTotal > 0) {
    return Object.freeze(
      components.map((component) => (component.enabled ? component.weight / rawTotal : 0)),
    );
  }

  // Scaling before summation keeps finite, very large input weights
  // normalizable without allowing an intermediate sum to overflow.
  const scaledWeights = components.map((component) =>
    component.enabled ? component.weight / maximum : 0,
  );
  const scaledTotal = enabledIndexes.reduce(
    (total, index) => total + scaledWeights[index]!,
    0,
  );
  if (!Number.isFinite(scaledTotal) || scaledTotal <= 0) {
    return invalid("ZERO_ENABLED_WEIGHT_TOTAL");
  }

  const normalized = scaledWeights.map((weight) => (weight === 0 ? 0 : weight / scaledTotal));
  return Object.freeze(normalized);
}

function validateInput(input: WeightedVoteCompositeInput): {
  ownerUserId: string;
  components: readonly WeightedVoteComponentInput[];
  thresholds: Readonly<WeightedVoteThresholds>;
} {
  if (!isRecord(input) || !nonEmptyString(input.ownerUserId) || !Array.isArray(input.components)) {
    return invalid("INVALID_WEIGHTED_VOTE_DEFINITION");
  }
  if (input.components.length === 0) return invalid("INVALID_WEIGHTED_VOTE_COMPONENTS");

  const seen = new Set<string>();
  const components: WeightedVoteComponentInput[] = [];
  for (const rawComponent of input.components) {
    if (!isRecord(rawComponent)) return invalid("INVALID_WEIGHTED_VOTE_COMPONENTS");

    const strategyDefinitionId = rawComponent.strategyDefinitionId;
    const strategyDefinitionVersion = rawComponent.strategyDefinitionVersion;
    const ownerUserId = rawComponent.ownerUserId;
    const enabled = rawComponent.enabled;
    const weight = rawComponent.weight;
    if (
      !nonEmptyString(strategyDefinitionId) ||
      !positiveVersion(strategyDefinitionVersion) ||
      !nonEmptyString(ownerUserId) ||
      typeof enabled !== "boolean"
    ) {
      return invalid("INVALID_WEIGHTED_VOTE_COMPONENTS");
    }
    if (seen.has(strategyDefinitionId)) {
      return invalid("DUPLICATE_WEIGHTED_VOTE_COMPONENT");
    }
    seen.add(strategyDefinitionId);
    if (ownerUserId !== input.ownerUserId) {
      return invalid("CROSS_OWNER_COMPONENT_DEFINITION");
    }
    if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 0) {
      return invalid("INVALID_WEIGHTED_VOTE_WEIGHTS");
    }

    components.push({
      strategyDefinitionId,
      strategyDefinitionVersion,
      ownerUserId,
      enabled,
      weight,
    });
  }

  return {
    ownerUserId: input.ownerUserId,
    components: Object.freeze(components),
    thresholds: readThresholds(input),
  };
}

export function createWeightedVoteComposite(
  input: WeightedVoteCompositeInput,
): WeightedVoteComposite {
  const validated = validateInput(input);
  const normalizedWeights = normalizeWeights(validated.components);
  const components = Object.freeze(
    validated.components.map((component, index) =>
      Object.freeze({
        strategyDefinitionId: component.strategyDefinitionId,
        strategyDefinitionVersion: component.strategyDefinitionVersion,
        enabled: component.enabled,
        weight: normalizedWeights[index]!,
      }),
    ),
  );
  const provenance: WeightedVoteProvenance = Object.freeze({
    profileId: WEIGHTED_VOTE_V1_ID,
    method: "WEIGHTED_VOTE",
    ownerUserId: validated.ownerUserId,
    components,
    thresholds: validated.thresholds,
    normalization: WEIGHTED_VOTE_NORMALIZATION,
  });

  const knownComponents = new Map(
    provenance.components.map((component) => [component.strategyDefinitionId, component]),
  );
  const enabledComponentIds = provenance.components
    .filter((component) => component.enabled)
    .map((component) => component.strategyDefinitionId);

  const combine = (signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteResult => {
    if (!Array.isArray(signals)) return invalid("INVALID_WEIGHTED_VOTE_SIGNALS");

    const received = new Map<string, WeightedVoteSignal>();
    for (const rawEntry of signals) {
      if (!isRecord(rawEntry)) return invalid("INVALID_WEIGHTED_VOTE_SIGNALS");
      const strategyDefinitionId = rawEntry.strategyDefinitionId;
      const signal = rawEntry.signal;
      if (
        !nonEmptyString(strategyDefinitionId) ||
        (signal !== "BUY" && signal !== "HOLD" && signal !== "SELL") ||
        !knownComponents.has(strategyDefinitionId) ||
        received.has(strategyDefinitionId)
      ) {
        return invalid("INVALID_WEIGHTED_VOTE_SIGNALS");
      }
      received.set(strategyDefinitionId, signal);
    }
    if (enabledComponentIds.some((id) => !received.has(id))) {
      return invalid("INVALID_WEIGHTED_VOTE_SIGNALS");
    }

    let score = 0;
    for (const component of provenance.components) {
      if (!component.enabled) continue;
      const signal = received.get(component.strategyDefinitionId);
      if (signal === undefined) return invalid("INVALID_WEIGHTED_VOTE_SIGNALS");
      score += component.weight * WEIGHTED_VOTE_SIGNAL_SCORES[signal];
    }
    if (!Number.isFinite(score)) return invalid("NON_FINITE_WEIGHTED_VOTE_SCORE");
    if (score === 0) score = 0;

    const signal: WeightedVoteSignal =
      score >= provenance.thresholds.buy
        ? "BUY"
        : score <= provenance.thresholds.sell
          ? "SELL"
          : "HOLD";
    return Object.freeze({ signal, score });
  };

  return Object.freeze({
    provenance,
    combine,
    signalFor: (signals: ReadonlyArray<WeightedVoteSignalInput>): WeightedVoteSignal =>
      combine(signals).signal,
  });
}

export function combineWeightedVoteSignals(
  composite: WeightedVoteComposite,
  signals: ReadonlyArray<WeightedVoteSignalInput>,
): WeightedVoteResult {
  return composite.combine(signals);
}
