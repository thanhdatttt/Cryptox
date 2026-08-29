import type {
  NewsReadRecordQuery,
  NewsRecordPage,
  NewsRepository,
  NormalizedNewsItemRecord,
} from "./ports";

interface NewsCursor {
  publishedAt: string;
  providerId: string;
  providerItemId: string;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function identityKey(item: Pick<NormalizedNewsItemRecord, "providerId" | "providerItemId">): string {
  return `${item.providerId}\0${item.providerItemId}`;
}

function compare(left: NormalizedNewsItemRecord | NewsCursor, right: NormalizedNewsItemRecord | NewsCursor): number {
  return right.publishedAt.localeCompare(left.publishedAt)
    || left.providerId.localeCompare(right.providerId)
    || left.providerItemId.localeCompare(right.providerItemId);
}

function encodeCursor(item: NormalizedNewsItemRecord): string {
  return Buffer.from(JSON.stringify({
    publishedAt: item.publishedAt,
    providerId: item.providerId,
    providerItemId: item.providerItemId,
  }), "utf8").toString("base64url");
}

function decodeCursor(value: string | undefined): NewsCursor | undefined {
  if (value === undefined) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<NewsCursor>;
    if (typeof parsed.publishedAt !== "string" || !Number.isFinite(Date.parse(parsed.publishedAt))) throw new Error("invalid timestamp");
    if (typeof parsed.providerId !== "string" || !parsed.providerId || typeof parsed.providerItemId !== "string" || !parsed.providerItemId) {
      throw new Error("invalid identity");
    }
    return {
      publishedAt: new Date(Date.parse(parsed.publishedAt)).toISOString(),
      providerId: parsed.providerId,
      providerItemId: parsed.providerItemId,
    };
  } catch {
    throw new Error("invalid News cursor");
  }
}

function relatedCoinMatches(item: NormalizedNewsItemRecord, relatedCoins: readonly string[] | undefined): boolean {
  return relatedCoins === undefined || relatedCoins.length === 0 || relatedCoins.some((coin) => item.relatedCoins.includes(coin));
}

export class InMemoryNewsRepository implements NewsRepository {
  private readonly items = new Map<string, NormalizedNewsItemRecord>();

  public async upsertByProviderIdentity(
    item: NormalizedNewsItemRecord,
  ): Promise<{ item: NormalizedNewsItemRecord; inserted: boolean }> {
    const key = identityKey(item);
    const existing = this.items.get(key);
    if (existing) return { item: copy(existing), inserted: false };
    const stored = copy(item);
    this.items.set(key, stored);
    return { item: copy(stored), inserted: true };
  }

  public async read(query: NewsReadRecordQuery): Promise<NewsRecordPage> {
    const cursor = decodeCursor(query.cursor);
    const from = query.publishedFrom === undefined ? undefined : Date.parse(query.publishedFrom);
    const to = query.publishedTo === undefined ? undefined : Date.parse(query.publishedTo);
    const filtered = [...this.items.values()]
      .filter((item) => relatedCoinMatches(item, query.relatedCoins))
      .filter((item) => {
        const publishedAt = Date.parse(item.publishedAt);
        return (from === undefined || publishedAt >= from) && (to === undefined || publishedAt < to);
      })
      .sort(compare)
      .filter((item) => cursor === undefined || compare(item, cursor) > 0);
    const items = filtered.slice(0, query.limit).map(copy);
    return {
      items,
      ...(filtered.length > items.length && items.length > 0 ? { nextCursor: encodeCursor(items.at(-1)!) } : {}),
    };
  }

  public size(): number {
    return this.items.size;
  }
}

export function createInMemoryNewsRepository(): InMemoryNewsRepository {
  return new InMemoryNewsRepository();
}
