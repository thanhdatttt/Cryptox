import type { AuthenticatedUserId } from "modules/auth/api";
import type { SearchRunStatus } from "../api/contracts";
import type { SearchRunRepository } from "./ports";

function pageItems(
  items: readonly SearchRunStatus[],
  page: { limit: number; cursor?: string },
): { items: readonly SearchRunStatus[]; nextCursor?: string } {
  const sorted = [...items].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) ||
      left.searchRunId.localeCompare(right.searchRunId),
  );
  const cursorIndex = page.cursor
    ? sorted.findIndex((item) => item.searchRunId === page.cursor)
    : -1;
  const start = cursorIndex < 0 ? 0 : cursorIndex + 1;
  const selected = sorted.slice(start, start + page.limit);
  return {
    items: selected,
    ...(start + selected.length < sorted.length && selected.length > 0
      ? { nextCursor: selected[selected.length - 1]!.searchRunId }
      : {}),
  };
}

function cloneStatus(status: SearchRunStatus): SearchRunStatus {
  return {
    ...status,
    searchSpace: {
      ...status.searchSpace,
      availableStrategyDefinitionIds: [...status.searchSpace.availableStrategyDefinitionIds],
      componentCount: { ...status.searchSpace.componentCount },
    },
    stopCondition: { ...status.stopCondition },
    candidateTemplate: {
      marketInput: {
        ...status.candidateTemplate.marketInput,
        range: { ...status.candidateTemplate.marketInput.range },
      },
      configuration: { ...status.candidateTemplate.configuration },
    },
    activeCandidateIds: [...status.activeCandidateIds],
  };
}

/** A deterministic fake persistence adapter for Search application tests/dev. */
export class InMemorySearchRunRepository implements SearchRunRepository<SearchRunStatus> {
  readonly runs = new Map<string, SearchRunStatus>();

  async getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<SearchRunStatus | undefined> {
    const run = this.runs.get(id);
    return run?.ownerUserId === ownerUserId ? cloneStatus(run) : undefined;
  }

  async save(ownerUserId: AuthenticatedUserId, searchRun: SearchRunStatus): Promise<SearchRunStatus> {
    if (searchRun.ownerUserId !== ownerUserId) throw new Error("OWNER_MISMATCH");
    const stored = cloneStatus(searchRun);
    this.runs.set(searchRun.searchRunId, stored);
    return cloneStatus(stored);
  }

  async listByOwner(
    ownerUserId: AuthenticatedUserId,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly SearchRunStatus[]; nextCursor?: string }> {
    const result = pageItems(
      [...this.runs.values()].filter((run) => run.ownerUserId === ownerUserId),
      page,
    );
    return { ...result, items: result.items.map(cloneStatus) };
  }
}
