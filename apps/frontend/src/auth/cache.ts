export interface PrivateCache {
  clear(): void;
}

/**
 * A small cache seam for private API clients. It deliberately has no owner
 * identity field: the server session, not a cache key supplied by the client,
 * is the authority for private resources.
 */
export class InMemoryPrivateCache implements PrivateCache {
  private readonly entries = new Map<string, unknown>();
  private revisionNumber = 0;

  public set(key: string, value: unknown): void {
    this.entries.set(key, value);
  }

  public get<T>(key: string): T | undefined {
    return this.entries.get(key) as T | undefined;
  }

  public has(key: string): boolean {
    return this.entries.has(key);
  }

  public get size(): number {
    return this.entries.size;
  }

  public get revision(): number {
    return this.revisionNumber;
  }

  public clear(): void {
    this.entries.clear();
    this.revisionNumber += 1;
  }
}
