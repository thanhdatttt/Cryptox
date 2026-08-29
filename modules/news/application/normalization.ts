import { createHash } from "node:crypto";
import type { NormalizedNewsItemRecord } from "./ports";

const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export function canonicalProviderId(value: unknown): string {
  if (typeof value !== "string") throw new Error("provider id must be a string");
  const providerId = value.trim().toLowerCase();
  if (!PROVIDER_ID_PATTERN.test(providerId)) throw new Error("provider id is invalid");
  return providerId;
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${field} must be non-empty`);
  return value.trim();
}

export function canonicalTimestamp(value: unknown, field: string): string {
  const timestamp = requiredText(value, field);
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be an ISO timestamp`);
  return new Date(parsed).toISOString();
}

function canonicalUrl(value: unknown): string {
  const url = requiredText(value, "url");
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("unsupported URL scheme");
  } catch {
    throw new Error("url must be an absolute HTTP(S) URL");
  }
  return url;
}

function canonicalRelatedCoins(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error("relatedCoins must be an array");
  const coins = value.map((coin, index) => requiredText(coin, `relatedCoins[${index}]`).toUpperCase());
  return [...new Set(coins)].sort((left, right) => left.localeCompare(right));
}

function stableUuid(providerId: string, providerItemId: string): string {
  const digest = createHash("sha256").update(`${providerId}\0${providerItemId}`).digest("hex");
  return `${digest.slice(0, 8)}-${digest.slice(8, 12)}-5${digest.slice(13, 16)}-8${digest.slice(17, 20)}-${digest.slice(20, 32)}`;
}

export function newsItemIdForProviderIdentity(providerId: string, providerItemId: string): string {
  return stableUuid(canonicalProviderId(providerId), requiredText(providerItemId, "providerItemId"));
}

export function normalizeNewsItem(value: unknown, providerIdValue: string): NormalizedNewsItemRecord {
  if (!value || typeof value !== "object") throw new Error("provider item must be an object");
  const input = value as Record<string, unknown>;
  const providerId = canonicalProviderId(providerIdValue);
  if (input.providerId !== undefined && canonicalProviderId(input.providerId) !== providerId) {
    throw new Error("provider item has the wrong provider id");
  }
  const providerItemId = requiredText(input.providerItemId, "providerItemId");
  const providedId = input.id === undefined ? undefined : requiredText(input.id, "id");
  return {
    id: providedId ?? newsItemIdForProviderIdentity(providerId, providerItemId),
    providerId,
    providerItemId,
    title: requiredText(input.title, "title"),
    content: requiredText(input.content, "content"),
    source: requiredText(input.source, "source"),
    publishedAt: canonicalTimestamp(input.publishedAt, "publishedAt"),
    crawledAt: canonicalTimestamp(input.crawledAt, "crawledAt"),
    relatedCoins: canonicalRelatedCoins(input.relatedCoins),
    url: canonicalUrl(input.url),
  };
}

export function assertNormalizedNewsItem(value: unknown): NormalizedNewsItemRecord {
  if (!value || typeof value !== "object" || typeof (value as Record<string, unknown>).providerId !== "string") {
    throw new Error("persistence returned a malformed news item");
  }
  return normalizeNewsItem(value, (value as Record<string, unknown>).providerId as string);
}
