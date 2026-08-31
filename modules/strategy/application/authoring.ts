import type { AuthenticatedRequestContext, AuthenticatedUserId } from "modules/auth/api";
import type { NewsModulePublicApi, NewsReadItem } from "modules/news/api";
import { NEWS_READ_ORDER_V1 } from "modules/news/api/contracts";
import type {
  StrategyAuthoringDraftRepository,
  StrategyAuthoringProviderPort,
  StrategyDefinitionRecord,
  StrategyDefinitionRepository,
  StrategyFactoryPort,
  StrategyParameterDescriptorPort,
  StrategyParameterValue,
} from "./ports";

type AuthoringProfileId = `${"LLM"}_${"AUTHORING"}_${"V1"}`;

export const AUTHORING_PROFILE_ID = ["LLM", "AUTHORING", "V1"].join("_") as AuthoringProfileId;
export const AUTHORING_TIMEOUT_MS = 45_000 as const;

export type AuthoringSource =
  | { kind: "PROMPT" }
  | { kind: "APPROVED_NEWS_ITEM"; newsItemId: string };

export type AuthoringStatus = "DRAFT" | "VALIDATED" | "REJECTED" | "APPROVED";

export type StrategyAuthoringOriginRecord =
  | { kind: "MANUAL" }
  | { kind: "LLM_DRAFT"; draftId: string; providerId: string; modelId: string }
  | { kind: "APPROVED_NEWS_ITEM"; newsItemId: string; extractionTemplateVersion?: number };

export type AuthoringDefinitionRecord = StrategyDefinitionRecord & {
  authoringOrigin?: StrategyAuthoringOriginRecord;
};

export interface StrategyAuthoringDraftRecord {
  id: string;
  ownerUserId: AuthenticatedUserId;
  profileId: AuthoringProfileId;
  source: AuthoringSource;
  provider: { id: string; modelId: string; configured: boolean };
  status: AuthoringStatus;
  structuredDraft?: Readonly<Record<string, StrategyParameterValue>>;
  validation?: { valid: boolean; reasons: readonly string[]; validatedAt: string };
  approvedDefinitionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyAuthoringPortShape {
  createDraft(command: { source: AuthoringSource; prompt?: string }): Promise<StrategyAuthoringDraftRecord>;
  validateDraft(draft: StrategyAuthoringDraftRecord): Promise<StrategyAuthoringDraftRecord>;
  approveDraft(draftId: string): Promise<AuthoringDefinitionRecord>;
}

export interface StrategyAuthoringApplicationDependencies {
  readonly factories: readonly StrategyFactoryPort[];
  readonly definitionRepository: StrategyDefinitionRepository<StrategyDefinitionRecord>;
  readonly draftRepository: StrategyAuthoringDraftRepository<StrategyAuthoringDraftRecord>;
  readonly provider?: StrategyAuthoringProviderPort & { readonly configured?: boolean };
  readonly news?: Pick<NewsModulePublicApi, "readNews">;
  readonly logicalFamilyKey: string;
  readonly strategyName: string;
  readonly clock?: { now(): string };
  readonly idFactory?: () => string;
}

export type StrategyAuthoringApplicationFactory = (
  context: AuthenticatedRequestContext,
) => StrategyAuthoringPortShape;

type ValidationResult =
  | { valid: true; value: Readonly<Record<string, StrategyParameterValue>> }
  | { valid: false; reasons: readonly string[] };

interface SourceResult {
  readonly source?: AuthoringSource;
  readonly prompt?: string;
  readonly newsItem?: NewsReadItem;
  readonly reason?: string;
}

interface SafeNewsResult {
  readonly item?: NewsReadItem;
  readonly templateVersion?: number;
  readonly reason?: string;
}

// Each authenticated request receives a fresh authoring port. Keep approval
// serialization outside that request-local factory so two ports in the
// synchronous monolith share the same owner/draft critical section. The
// persisted APPROVED draft remains the idempotency record; this queue is only
// transient coordination and is never stored or exposed.
const approvalChains = new Map<string, Promise<void>>();

const FAILURE_REASONS = {
  invalidSource: "INVALID_SOURCE",
  invalidPrompt: "INVALID_PROMPT",
  providerNotConfigured: "PROVIDER_NOT_CONFIGURED",
  providerTimeout: "PROVIDER_TIMEOUT",
  providerFailure: "PROVIDER_FAILURE",
  malformedProviderResponse: "MALFORMED_PROVIDER_RESPONSE",
  invalidProviderDraft: "INVALID_PROVIDER_DRAFT",
  newsUnavailable: "NEWS_BOUNDARY_UNAVAILABLE",
  newsNotFound: "NEWS_ITEM_NOT_FOUND",
  newsNotApproved: "NEWS_ITEM_NOT_APPROVED",
} as const;

export class StrategyAuthoringApplicationError extends Error {
  public readonly name = "StrategyAuthoringApplicationError";

  public constructor(public readonly code: string, message = code) {
    super(message);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function safeIdentifier(value: unknown, fallback: string): string {
  if (
    typeof value === "string"
    && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value.trim())
  ) {
    return value.trim();
  }
  return fallback;
}

function safeTimestamp(clock: { now(): string } | undefined): string {
  const candidate = clock?.now();
  return typeof candidate === "string" && Number.isFinite(Date.parse(candidate))
    ? new Date(Date.parse(candidate)).toISOString()
    : new Date().toISOString();
}

function safeId(idFactory: (() => string) | undefined): string {
  const candidate = idFactory?.();
  return nonEmpty(candidate) ? candidate.trim() : crypto.randomUUID();
}

function freezeParameters(
  parameters: Readonly<Record<string, StrategyParameterValue>>,
): Readonly<Record<string, StrategyParameterValue>> {
  return Object.freeze(
    Object.fromEntries(Object.keys(parameters).sort().map((key) => [key, parameters[key]])),
  );
}

function freezeSource(source: AuthoringSource): AuthoringSource {
  return Object.freeze(
    source.kind === "PROMPT"
      ? { kind: "PROMPT" }
      : { kind: "APPROVED_NEWS_ITEM", newsItemId: source.newsItemId },
  );
}

function freezeDraft(draft: StrategyAuthoringDraftRecord): StrategyAuthoringDraftRecord {
  const result: StrategyAuthoringDraftRecord = {
    id: draft.id,
    ownerUserId: draft.ownerUserId,
    profileId: AUTHORING_PROFILE_ID,
    source: freezeSource(draft.source),
    provider: Object.freeze({ ...draft.provider }),
    status: draft.status,
    ...(draft.structuredDraft === undefined
      ? {}
      : { structuredDraft: freezeParameters(draft.structuredDraft) }),
    ...(draft.validation === undefined
      ? {}
      : {
        validation: Object.freeze({
          valid: draft.validation.valid,
          reasons: Object.freeze([...draft.validation.reasons]),
          validatedAt: draft.validation.validatedAt,
        }),
      }),
    ...(draft.approvedDefinitionId === undefined
      ? {}
      : { approvedDefinitionId: draft.approvedDefinitionId }),
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
  };
  return Object.freeze(result);
}

function assertOwner(ownerUserId: AuthenticatedUserId | undefined): AuthenticatedUserId {
  if (typeof ownerUserId !== "string" || !ownerUserId.trim()) {
    throw new StrategyAuthoringApplicationError("UNAUTHENTICATED");
  }
  return ownerUserId;
}

function assertComposition(dependencies: StrategyAuthoringApplicationDependencies): void {
  if (!nonEmpty(dependencies.logicalFamilyKey) || !nonEmpty(dependencies.strategyName)) {
    throw new StrategyAuthoringApplicationError("INVALID_AUTHORING_COMPOSITION");
  }
  if (!dependencies.draftRepository || !dependencies.definitionRepository) {
    throw new StrategyAuthoringApplicationError("INVALID_AUTHORING_COMPOSITION");
  }
}

function findFactory(
  factories: readonly StrategyFactoryPort[],
  strategyName: string,
): StrategyFactoryPort {
  const factory = factories.find((candidate) => candidate.descriptor.name === strategyName);
  if (!factory) throw new StrategyAuthoringApplicationError("STRATEGY_NOT_AVAILABLE");
  return factory;
}

function normalizeParameters(
  input: unknown,
  descriptors: readonly StrategyParameterDescriptorPort[],
): ValidationResult {
  if (!isRecord(input)) return { valid: false, reasons: ["INVALID_STRUCTURED_DRAFT"] };
  const descriptorByKey = new Map(descriptors.map((descriptor) => [descriptor.key, descriptor]));
  const reasons: string[] = [];
  for (const key of Object.keys(input)) {
    if (!descriptorByKey.has(key)) reasons.push("UNKNOWN_PARAMETER");
  }

  const result: Record<string, StrategyParameterValue> = {};
  for (const descriptor of descriptors) {
    const present = Object.prototype.hasOwnProperty.call(input, descriptor.key);
    if (!present) {
      if (descriptor.required) {
        reasons.push("MISSING_REQUIRED_PARAMETER");
      } else {
        result[descriptor.key] = descriptor.defaultValue;
      }
      continue;
    }
    const value = input[descriptor.key];
    if (descriptor.type === "ENUM") {
      if (typeof value !== "string" || !value || !descriptor.options?.includes(value)) {
        reasons.push("INVALID_ENUM_PARAMETER");
      } else {
        result[descriptor.key] = value;
      }
      continue;
    }
    if (
      typeof value !== "number"
      || !Number.isFinite(value)
      || (descriptor.type === "INTEGER" && !Number.isInteger(value))
      || (descriptor.minimum !== undefined && value < descriptor.minimum)
      || (descriptor.maximum !== undefined && value > descriptor.maximum)
    ) {
      reasons.push("INVALID_NUMERIC_PARAMETER");
      continue;
    }
    result[descriptor.key] = value;
  }

  return reasons.length > 0
    ? { valid: false, reasons: Object.freeze([...new Set(reasons)].sort()) }
    : { valid: true, value: freezeParameters(result) };
}

function sourceInput(command: { source: AuthoringSource; prompt?: string }): SourceResult {
  if (!command || !isRecord(command) || !isRecord(command.source)) {
    return { reason: FAILURE_REASONS.invalidSource };
  }
  const source = command.source;
  if (source.kind === "PROMPT") {
    if (Object.keys(source).length !== 1 || !nonEmpty(command.prompt)) {
      return { reason: FAILURE_REASONS.invalidPrompt };
    }
    return { source: { kind: "PROMPT" }, prompt: command.prompt.trim() };
  }
  if (
    source.kind !== "APPROVED_NEWS_ITEM"
    || Object.keys(source).some((key) => key !== "kind" && key !== "newsItemId")
    || Object.keys(source).length !== 2
    || !nonEmpty(source.newsItemId)
  ) {
    return { reason: FAILURE_REASONS.invalidSource };
  }
  return {
    source: { kind: "APPROVED_NEWS_ITEM", newsItemId: source.newsItemId.trim() },
  };
}

function providerMetadata(
  provider: (StrategyAuthoringProviderPort & { readonly configured?: boolean }) | undefined,
): { id: string; modelId: string; configured: boolean } {
  return {
    id: safeIdentifier(provider?.id, "provider"),
    modelId: safeIdentifier(provider?.modelId, "model"),
    configured: provider !== undefined && provider.configured !== false,
  };
}

function rejectedDraft(
  ownerUserId: AuthenticatedUserId,
  source: AuthoringSource,
  provider: { id: string; modelId: string; configured: boolean },
  reason: string,
  dependencies: StrategyAuthoringApplicationDependencies,
): StrategyAuthoringDraftRecord {
  const now = safeTimestamp(dependencies.clock);
  return freezeDraft({
    id: safeId(dependencies.idFactory),
    ownerUserId,
    profileId: AUTHORING_PROFILE_ID,
    source: freezeSource(source),
    provider: Object.freeze({ ...provider }),
    status: "REJECTED",
    validation: Object.freeze({ valid: false, reasons: Object.freeze([reason]), validatedAt: now }),
    createdAt: now,
    updatedAt: now,
  });
}

function providerFailureReason(error: unknown): string {
  if (error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string") {
    const code = (error as { code: string }).code;
    if (code === FAILURE_REASONS.providerNotConfigured) return FAILURE_REASONS.providerNotConfigured;
    if (code === FAILURE_REASONS.providerTimeout) return FAILURE_REASONS.providerTimeout;
    if (code === FAILURE_REASONS.malformedProviderResponse) return FAILURE_REASONS.malformedProviderResponse;
  }
  return FAILURE_REASONS.providerFailure;
}

function newsPrompt(item: NewsReadItem): string {
  return [
    `Title: ${item.title}`,
    `Content: ${item.content}`,
    `Source: ${item.source}`,
    `Related coins: ${item.relatedCoins.join(", ")}`,
  ].join("\n");
}

async function readApprovedNews(
  news: Pick<NewsModulePublicApi, "readNews"> | undefined,
  newsItemId: string,
): Promise<SafeNewsResult> {
  if (!news) return { reason: FAILURE_REASONS.newsUnavailable };
  let cursor: string | undefined;
  for (let pageNumber = 0; pageNumber < 1_000; pageNumber += 1) {
    let page: Awaited<ReturnType<NewsModulePublicApi["readNews"]>>;
    try {
      page = await news.readNews({
        limit: 10_000,
        ...(cursor === undefined ? {} : { cursor }),
        order: NEWS_READ_ORDER_V1,
      });
    } catch {
      return { reason: FAILURE_REASONS.newsUnavailable };
    }
    if (!page || !Array.isArray(page.items)) return { reason: FAILURE_REASONS.newsUnavailable };
    const item = page.items.find((candidate) => candidate.id === newsItemId);
    if (item) {
      const template = item.extraction?.template;
      if (template && template.status !== "APPROVED") return { reason: FAILURE_REASONS.newsNotApproved };
      return {
        item,
        ...(template && Number.isSafeInteger(template.version) ? { templateVersion: template.version } : {}),
      };
    }
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return { reason: FAILURE_REASONS.newsNotFound };
}

function normalizeStoredDraft(
  ownerUserId: AuthenticatedUserId,
  draft: StrategyAuthoringDraftRecord,
): StrategyAuthoringDraftRecord {
  if (
    !draft
    || draft.ownerUserId !== ownerUserId
    || draft.profileId !== AUTHORING_PROFILE_ID
    || !nonEmpty(draft.id)
    || !nonEmpty(draft.createdAt)
    || !nonEmpty(draft.updatedAt)
    || !["DRAFT", "VALIDATED", "REJECTED", "APPROVED"].includes(draft.status)
  ) {
    throw new StrategyAuthoringApplicationError("INVALID_PERSISTED_DRAFT");
  }
  if (draft.source.kind === "PROMPT") {
    if (Object.keys(draft.source).length !== 1) {
      throw new StrategyAuthoringApplicationError("INVALID_PERSISTED_DRAFT");
    }
  } else if (
    draft.source.kind !== "APPROVED_NEWS_ITEM"
    || Object.keys(draft.source).length !== 2
    || !nonEmpty(draft.source.newsItemId)
  ) {
    throw new StrategyAuthoringApplicationError("INVALID_PERSISTED_DRAFT");
  }
  return freezeDraft(draft);
}

function definitionWithOrigin(
  definition: StrategyDefinitionRecord,
  origin: StrategyAuthoringOriginRecord,
): AuthoringDefinitionRecord {
  return Object.freeze({
    ...definition,
    parameters: freezeParameters(definition.parameters),
    authoringOrigin: Object.freeze({ ...origin }),
  });
}

function approvalKey(ownerUserId: AuthenticatedUserId, draftId: string): string {
  return JSON.stringify([ownerUserId, draftId]);
}

function enqueueApproval<T>(
  ownerUserId: AuthenticatedUserId,
  draftId: string,
  operation: () => Promise<T>,
): Promise<T> {
  const key = approvalKey(ownerUserId, draftId);
  const previous = approvalChains.get(key) ?? Promise.resolve();
  const result = previous.then(operation);
  const settled = result.then(() => undefined, () => undefined);
  approvalChains.set(key, settled);
  return result.finally(() => {
    if (approvalChains.get(key) === settled) approvalChains.delete(key);
  });
}

export function createStrategyAuthoringApplication(
  ownerUserId: AuthenticatedUserId | undefined,
  dependencies: StrategyAuthoringApplicationDependencies,
): StrategyAuthoringPortShape {
  const owner = assertOwner(ownerUserId);
  assertComposition(dependencies);
  const factory = findFactory(dependencies.factories, dependencies.strategyName);
  const provider = providerMetadata(dependencies.provider);

  const createDraft = async (
    command: { source: AuthoringSource; prompt?: string },
  ): Promise<StrategyAuthoringDraftRecord> => {
    const sourceResult = sourceInput(command);
    const source = sourceResult.source ?? { kind: "PROMPT" as const };
    if (sourceResult.reason) return rejectedDraft(owner, source, provider, sourceResult.reason, dependencies);

    let prompt = sourceResult.prompt;
    let newsItem: NewsReadItem | undefined;
    if (source.kind === "APPROVED_NEWS_ITEM") {
      const newsResult = await readApprovedNews(dependencies.news, source.newsItemId);
      if (newsResult.reason || !newsResult.item) {
        return rejectedDraft(
          owner,
          source,
          provider,
          newsResult.reason ?? FAILURE_REASONS.newsUnavailable,
          dependencies,
        );
      }
      newsItem = newsResult.item;
      prompt = newsPrompt(newsItem);
    }
    if (!dependencies.provider || !provider.configured) {
      return rejectedDraft(owner, source, provider, FAILURE_REASONS.providerNotConfigured, dependencies);
    }

    let structuredDraft: Readonly<Record<string, StrategyParameterValue>>;
    try {
      structuredDraft = await dependencies.provider.createStructuredDraft({
        ...(prompt === undefined ? {} : { prompt }),
        ...(newsItem === undefined ? {} : { newsItemId: newsItem.id }),
        timeoutMs: AUTHORING_TIMEOUT_MS,
      });
    } catch (error) {
      return rejectedDraft(owner, source, provider, providerFailureReason(error), dependencies);
    }

    const validation = normalizeParameters(structuredDraft, factory.descriptor.parameters);
    if (!validation.valid) {
      return rejectedDraft(owner, source, provider, FAILURE_REASONS.invalidProviderDraft, dependencies);
    }

    const now = safeTimestamp(dependencies.clock);
    const draft = freezeDraft({
      id: safeId(dependencies.idFactory),
      ownerUserId: owner,
      profileId: AUTHORING_PROFILE_ID,
      source: freezeSource(source),
      provider: Object.freeze({ ...provider, configured: true }),
      status: "DRAFT",
      structuredDraft: validation.value,
      createdAt: now,
      updatedAt: now,
    });
    const stored = await dependencies.draftRepository.insert(owner, draft);
    return normalizeStoredDraft(owner, stored);
  };

  const validateDraft = async (
    submittedDraft: StrategyAuthoringDraftRecord,
  ): Promise<StrategyAuthoringDraftRecord> => {
    if (!submittedDraft || !nonEmpty(submittedDraft.id)) {
      throw new StrategyAuthoringApplicationError("NOT_FOUND");
    }
    const stored = await dependencies.draftRepository.getByOwnerAndId(owner, submittedDraft.id);
    if (!stored) throw new StrategyAuthoringApplicationError("NOT_FOUND");
    const current = normalizeStoredDraft(owner, stored);
    if (current.status !== "DRAFT") return current;
    const validation = normalizeParameters(current.structuredDraft, factory.descriptor.parameters);
    if (!validation.valid) {
      return rejectedDraft(owner, current.source, current.provider, "VALIDATION_FAILED", dependencies);
    }
    const validated = freezeDraft({
      ...current,
      status: "VALIDATED",
      structuredDraft: validation.value,
      validation: Object.freeze({ valid: true, reasons: Object.freeze([]), validatedAt: safeTimestamp(dependencies.clock) }),
      updatedAt: safeTimestamp(dependencies.clock),
    });
    const saved = await dependencies.draftRepository.save(owner, validated);
    return normalizeStoredDraft(owner, saved);
  };

  const approveOnce = async (draftId: string): Promise<AuthoringDefinitionRecord> => {
    if (!nonEmpty(draftId)) throw new StrategyAuthoringApplicationError("NOT_FOUND");
    const stored = await dependencies.draftRepository.getByOwnerAndId(owner, draftId);
    if (!stored) throw new StrategyAuthoringApplicationError("NOT_FOUND");
    const draft = normalizeStoredDraft(owner, stored);
    if (draft.status === "APPROVED" && draft.approvedDefinitionId) {
      const existing = await dependencies.definitionRepository.getByOwnerAndId(owner, draft.approvedDefinitionId);
      if (!existing) throw new StrategyAuthoringApplicationError("APPROVED_DEFINITION_NOT_FOUND");
      return existing as AuthoringDefinitionRecord;
    }
    if (draft.status !== "VALIDATED" || !draft.validation?.valid || !draft.structuredDraft) {
      throw new StrategyAuthoringApplicationError(
        draft.status === "REJECTED" ? "DRAFT_REJECTED" : "DRAFT_NOT_VALIDATED",
      );
    }
    const validation = normalizeParameters(draft.structuredDraft, factory.descriptor.parameters);
    if (!validation.valid) throw new StrategyAuthoringApplicationError("VALIDATION_FAILED");

    let origin: StrategyAuthoringOriginRecord;
    if (draft.source.kind === "APPROVED_NEWS_ITEM") {
      const newsResult = await readApprovedNews(dependencies.news, draft.source.newsItemId);
      if (newsResult.reason || !newsResult.item) {
        throw new StrategyAuthoringApplicationError(newsResult.reason ?? FAILURE_REASONS.newsUnavailable);
      }
      origin = {
        kind: "APPROVED_NEWS_ITEM",
        newsItemId: draft.source.newsItemId,
        ...(newsResult.templateVersion === undefined
          ? {}
          : { extractionTemplateVersion: newsResult.templateVersion }),
      };
    } else {
      origin = {
        kind: "LLM_DRAFT",
        draftId: draft.id,
        providerId: safeIdentifier(draft.provider.id, "provider"),
        modelId: safeIdentifier(draft.provider.modelId, "model"),
      };
    }

    const definition: AuthoringDefinitionRecord = Object.freeze({
      id: safeId(dependencies.idFactory),
      ownerUserId: owner,
      logicalFamilyKey: dependencies.logicalFamilyKey.trim(),
      strategyName: dependencies.strategyName.trim(),
      implementationVersion: factory.descriptor.implementationVersion,
      behaviorProfileId: factory.descriptor.behaviorProfileId,
      version: await dependencies.definitionRepository.allocateNextVersion(
        owner,
        dependencies.logicalFamilyKey.trim(),
      ),
      parameters: validation.value,
      authoringOrigin: Object.freeze({ ...origin }),
      createdAt: safeTimestamp(dependencies.clock),
    });
    const inserted = await dependencies.definitionRepository.insert(owner, definition);
    const returnedDefinition = definitionWithOrigin(inserted, origin);
    const approved = freezeDraft({
      ...draft,
      status: "APPROVED",
      approvedDefinitionId: returnedDefinition.id,
      updatedAt: safeTimestamp(dependencies.clock),
    });
    await dependencies.draftRepository.save(owner, approved);
    return returnedDefinition;
  };

  const approveDraft = async (draftId: string): Promise<AuthoringDefinitionRecord> => {
    return enqueueApproval(owner, draftId, () => approveOnce(draftId));
  };

  return { createDraft, validateDraft, approveDraft };
}

export function createStrategyAuthoringFactory(
  dependencies: StrategyAuthoringApplicationDependencies,
): StrategyAuthoringApplicationFactory {
  return (context: AuthenticatedRequestContext): StrategyAuthoringPortShape =>
    createStrategyAuthoringApplication(context?.authenticatedUserId, dependencies);
}
