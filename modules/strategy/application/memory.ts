import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  CompositeDefinitionRecord,
  CompositeDefinitionRepository,
  StrategyDefinitionRecord,
  StrategyDefinitionRepository,
  StrategyFactoryPort,
  StrategyPluginDescriptorPort,
  StrategyParameterValue,
  StrategyRuntimePort,
} from "./ports";
import { InMemoryStrategyAuthoringDraftRepository } from "./authoring-memory";

function pageItems<T extends { id: string; createdAt: string }>(
  items: readonly T[],
  page: { limit: number; cursor?: string },
): { items: readonly T[]; nextCursor?: string } {
  const sorted = [...items].sort(
    (left, right) => left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id),
  );
  const start = page.cursor ? Math.max(0, sorted.findIndex((item) => item.id === page.cursor) + 1) : 0;
  const selected = sorted.slice(start, start + page.limit);
  return {
    items: selected,
    ...(start + selected.length < sorted.length && selected.length > 0
      ? { nextCursor: selected[selected.length - 1].id }
      : {}),
  };
}

export class InMemoryStrategyRepositories {
  readonly definitions = new Map<string, StrategyDefinitionRecord>();
  readonly composites = new Map<string, CompositeDefinitionRecord>();
  readonly authoringDraftRepository = new InMemoryStrategyAuthoringDraftRepository();

  readonly definitionRepository: StrategyDefinitionRepository<StrategyDefinitionRecord> = {
    allocateNextVersion: async (ownerUserId, logicalFamilyKey) =>
      this.nextVersion(this.definitions.values(), ownerUserId, logicalFamilyKey),
    insert: async (ownerUserId, definition) => {
      if (definition.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
      this.definitions.set(definition.id, definition);
      return definition;
    },
    getByOwnerAndId: async (ownerUserId, id) => {
      const definition = this.definitions.get(id);
      return definition?.ownerUserId === ownerUserId ? definition : undefined;
    },
    listByOwner: async (ownerUserId, page) =>
      pageItems(
        [...this.definitions.values()].filter((definition) => definition.ownerUserId === ownerUserId),
        page,
      ),
  };

  readonly compositeRepository: CompositeDefinitionRepository<CompositeDefinitionRecord> = {
    allocateNextVersion: async (ownerUserId, logicalFamilyKey) =>
      this.nextVersion(this.composites.values(), ownerUserId, logicalFamilyKey),
    insert: async (ownerUserId, definition) => {
      if (definition.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
      this.composites.set(definition.id, definition);
      return definition;
    },
    getByOwnerAndId: async (ownerUserId, id) => {
      const definition = this.composites.get(id);
      return definition?.ownerUserId === ownerUserId ? definition : undefined;
    },
    listByOwner: async (ownerUserId, page) =>
      pageItems(
        [...this.composites.values()].filter((definition) => definition.ownerUserId === ownerUserId),
        page,
      ),
  };

  private nextVersion<T extends { ownerUserId: AuthenticatedUserId; logicalFamilyKey: string; version: number }>(
    values: IterableIterator<T>,
    ownerUserId: AuthenticatedUserId,
    logicalFamilyKey: string,
  ): number {
    let maximum = 0;
    for (const value of values) {
      if (value.ownerUserId === ownerUserId && value.logicalFamilyKey === logicalFamilyKey) {
        maximum = Math.max(maximum, value.version);
      }
    }
    return maximum + 1;
  }
}

export function createInMemoryStrategyDependencies(factories: readonly StrategyFactoryPort[] = []) {
  const repositories = new InMemoryStrategyRepositories();
  return {
    factories,
    definitionRepository: repositories.definitionRepository,
    compositeRepository: repositories.compositeRepository,
    draftRepository: repositories.authoringDraftRepository,
    repositories,
  };
}

export type { StrategyFactoryPort, StrategyPluginDescriptorPort, StrategyParameterValue, StrategyRuntimePort };
