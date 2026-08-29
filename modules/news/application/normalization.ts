import { createHash } from "node:crypto";
import type { NewsExtractionProvenance } from "../api/contracts";
import type { NormalizedNewsItemRecord } from "./ports";

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function canonicalProviderId(value: unknown): string {
  if (typeof value !== "string") throw new Error("provider id must be a string");
  const providerId = value.trim().toLowerCase();
  if (!PROVIDER_ID_PATTERN.test(providerId)) throw new Error("provider id is invalid");
  return providerId;
}

export function requiredNewsText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be non-empty`);
  return value.trim();
}

export function canonicalTimestamp(value: unknown, field: string): string {
  const timestamp = requiredNewsText(value, field);
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

export function canonicalizeNewsUrl(value: unknown): string {
  const url = requiredNewsText(value, "url");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported URL scheme");
    if (parsed.username || parsed.password) throw new Error("URL credentials are not allowed");
    parsed.hash = "";
    parsed.hostname = parsed.hostname.toLowerCase();
    if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
      parsed.port = "";
    }
    return parsed.toString();
  } catch {
    throw new Error("url must be an absolute HTTP(S) URL");
  }
}

function canonicalRelatedCoins(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("relatedCoins must be an array");
  const coins = value.map((coin, index) => requiredNewsText(coin, `relatedCoins[${index}]`).toUpperCase());
  return [...new Set(coins)].sort((left, right) => left.localeCompare(right));
}

export function normalizeNewsContent(value: unknown): string {
  return requiredNewsText(value, "content")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

export function normalizedNewsContentHash(value: unknown): string {
  return createHash("sha256").update(normalizeNewsContent(value), "utf8").digest("hex");
}

function addDays(timestamp: string, days: number): string {
  return new Date(Date.parse(timestamp) + days * 24 * 60 * 60 * 1_000).toISOString();
}

function templateRef(value: unknown): NewsExtractionProvenance["template"] {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") throw new Error("extraction template is invalid");
  const input = value as Record<string, unknown>;
  const id = requiredNewsText(input.id, "extraction.template.id");
  const sourceId = requiredNewsText(input.sourceId, "extraction.template.sourceId");
  const version = input.version;
  if (!Number.isSafeInteger(version) || (version as number) < 1) throw new Error("extraction template version is invalid");
  const status = input.status;
  if (status !== "DRAFT" && status !== "APPROVED" && status !== "RETIRED") {
    throw new Error("extraction template status is invalid");
  }
  return { id, sourceId, version: version as number, status };
}

export function normalizeExtractionProvenance(
  value: unknown,
  fallback: { canonicalUrl: string; normalizedContentHash: string; extractedAt: string },
): NewsExtractionProvenance {
  if (!value || typeof value !== "object") throw new Error("extraction provenance is invalid");
  const input = value as Record<string, unknown>;
  const extractedAt = canonicalTimestamp(input.extractedAt ?? fallback.extractedAt, "extraction.extractedAt");
  const normalizedHash = requiredNewsText(
    input.normalizedContentHash ?? fallback.normalizedContentHash,
    "extraction.normalizedContentHash",
  ).toLowerCase();
  if (!/^[0-9a-f]{64}$/u.test(normalizedHash)) throw new Error("extraction normalized content hash is invalid");
  const canonicalUrl = canonicalizeNewsUrl(input.canonicalUrl ?? fallback.canonicalUrl);
  if (new URL(canonicalUrl).protocol !== "https:") {
    throw new Error("extraction provenance URL must use HTTPS");
  }
  const normalizedRetainUntil = canonicalTimestamp(
    input.normalizedRetainUntil ?? addDays(extractedAt, 90),
    "extraction.normalizedRetainUntil",
  );
  if (Date.parse(normalizedRetainUntil) !== Date.parse(addDays(extractedAt, 90))) {
    throw new Error("extraction retention must be 90 days");
  }
  return {
    sourceKind: input.sourceKind === "CONFIGURED_WEBSITE"
      || input.sourceKind === "RSS"
      || input.sourceKind === "HTML"
      || input.sourceKind === "ALLOWLISTED_URL_IMPORT"
      ? input.sourceKind
      : (() => { throw new Error("extraction source kind is invalid"); })(),
    canonicalUrl,
    normalizedContentHash: normalizedHash,
    ...(input.template === undefined ? {} : { template: templateRef(input.template) }),
    extractedAt,
    normalizedRetainUntil,
  };
}

function stableUuid(providerId: string, providerItemId: string): string {
  const digest = createHash("sha256").update(`${providerId}\0${providerItemId}`).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export function newsItemIdForProviderIdentity(providerId: string, providerItemId: string): string {
  return stableUuid(canonicalProviderId(providerId), requiredNewsText(providerItemId, "providerItemId"));
}

export function normalizeNewsItem(value: unknown, providerIdValue: string): NormalizedNewsItemRecord {
  if (!value || typeof value !== "object") throw new Error("provider item must be an object");
  const input = value as Record<string, unknown>;
  const providerId = canonicalProviderId(providerIdValue);
  if (input.providerId !== undefined && canonicalProviderId(input.providerId) !== providerId) {
    throw new Error("provider item has the wrong provider id");
  }
  const providerItemId = requiredNewsText(input.providerItemId, "providerItemId");
  const providedId = input.id === undefined ? undefined : requiredNewsText(input.id, "id");
  const title = requiredNewsText(input.title, "title");
  const content = requiredNewsText(input.content, "content");
  const publishedAt = canonicalTimestamp(input.publishedAt, "publishedAt");
  const crawledAt = canonicalTimestamp(input.crawledAt, "crawledAt");
  const canonicalUrl = canonicalizeNewsUrl(input.url);
  const normalizedContentHash = normalizedNewsContentHash(content);
  if (input.normalizedContentHash !== undefined
    && (typeof input.normalizedContentHash !== "string" || input.normalizedContentHash.toLowerCase() !== normalizedContentHash)) {
    throw new Error("normalized content hash does not match content");
  }
  const normalizedRetainUntil = addDays(crawledAt, 90);
  const extraction = input.extraction === undefined
    ? undefined
    : normalizeExtractionProvenance(input.extraction, {
      canonicalUrl,
      normalizedContentHash,
      extractedAt: crawledAt,
    });
  if (extraction && extraction.normalizedContentHash !== normalizedContentHash) {
    throw new Error("extraction hash does not match content");
  }
  return {
    id: providedId ?? newsItemIdForProviderIdentity(providerId, providerItemId),
    providerId,
    providerItemId,
    title,
    content,
    source: requiredNewsText(input.source, "source"),
    publishedAt,
    crawledAt,
    relatedCoins: canonicalRelatedCoins(input.relatedCoins),
    url: canonicalUrl,
    canonicalUrl,
    normalizedContentHash,
    normalizedRetainUntil,
    ...(extraction === undefined ? {} : { extraction }),
  };
}

export function assertNormalizedNewsItem(value: unknown): NormalizedNewsItemRecord {
  if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>).providerId !== "string") {
    throw new Error("persistence returned a malformed news item");
  }
  return normalizeNewsItem(value, (value as Record<string, unknown>).providerId as string);
}
