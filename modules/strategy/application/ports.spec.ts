import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type {
  CompositeDefinitionRepository,
  StrategyDefinitionRepository,
} from "./ports";

type OwnedDefinition = { id: string; ownerUserId: AuthenticatedUserId };

describe("Strategy owner-scoped repository ports", () => {
  it("requires owner identity for version allocation, reads, and lists", async () => {
    const records: readonly OwnedDefinition[] = [
      { id: "strategy-a", ownerUserId: "user-a" as AuthenticatedUserId },
      { id: "strategy-b", ownerUserId: "user-b" as AuthenticatedUserId },
    ];
    const repository = {
      allocateNextVersion: async () => 1,
      insert: async (ownerUserId, definition) =>
        definition.ownerUserId === ownerUserId ? definition : Promise.reject(new Error("NOT_FOUND")),
      getByOwnerAndId: async (ownerUserId, id) =>
        records.find((record) => record.ownerUserId === ownerUserId && record.id === id),
      listByOwner: async (ownerUserId) => ({
        items: records.filter((record) => record.ownerUserId === ownerUserId),
      }),
    } satisfies StrategyDefinitionRepository<OwnedDefinition> &
      CompositeDefinitionRepository<OwnedDefinition>;

    expect(await repository.getByOwnerAndId("user-a" as AuthenticatedUserId, "strategy-b"))
      .toBeUndefined();
    expect((await repository.listByOwner("user-a" as AuthenticatedUserId)).items).toHaveLength(1);
    await expect(
      repository.insert("user-a" as AuthenticatedUserId, records[1]!),
    ).rejects.toThrow("NOT_FOUND");
  });
});
