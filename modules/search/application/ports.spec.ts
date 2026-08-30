import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { GeneratedCandidate } from "../api/contracts";
import type { SearchRunRepository, StrategyGeneratorRegistry } from "./ports";

type OwnedRun = { id: string; ownerUserId: AuthenticatedUserId };

describe("Search owner-scoped repository port", () => {
  it("filters reads and collections by owner before returning results", async () => {
    const runs: readonly OwnedRun[] = [
      { id: "run-a", ownerUserId: "user-a" as AuthenticatedUserId },
      { id: "run-b", ownerUserId: "user-b" as AuthenticatedUserId },
    ];
    const repository = {
      getByOwnerAndId: async (ownerUserId, id) =>
        runs.find((run) => run.ownerUserId === ownerUserId && run.id === id),
      save: async (ownerUserId, run) =>
        run.ownerUserId === ownerUserId ? run : Promise.reject(new Error("NOT_FOUND")),
      listByOwner: async (ownerUserId) => ({
        items: runs.filter((run) => run.ownerUserId === ownerUserId),
      }),
    } satisfies SearchRunRepository<OwnedRun>;

    expect(await repository.getByOwnerAndId("user-a" as AuthenticatedUserId, "run-b"))
      .toBeUndefined();
    expect((await repository.listByOwner("user-a" as AuthenticatedUserId)).items).toEqual([
      runs[0],
    ]);
    await expect(repository.save("user-a" as AuthenticatedUserId, runs[1]!)).rejects.toThrow(
      "NOT_FOUND",
    );
  });
});

describe("Search generator registry port", () => {
  it("exposes typed slots for all approved modes without requiring future implementations", () => {
    const candidate: GeneratedCandidate = {
      candidateKey: "candidate",
      compositeLogicalFamilyKey: "candidate",
      strategyDefinitionIds: ["strategy-1", "strategy-2"],
      combinationProfileId: "MAJORITY_VOTE_V1",
      generatedBy: "RANDOM",
    };
    const registry = {
      RANDOM: { generate: () => candidate },
      DOMAIN_GUIDED: {
        profileId: "DOMAIN_GUIDED_V1",
        generate: () => ({ ...candidate, generatedBy: "DOMAIN_GUIDED" as const }),
      },
      GENETIC: {
        profileId: "GENETIC_V1",
        generate: () => ({ ...candidate, generatedBy: "GENETIC" as const }),
      },
    } satisfies StrategyGeneratorRegistry<unknown, GeneratedCandidate>;

    expect(Object.keys(registry)).toEqual(["RANDOM", "DOMAIN_GUIDED", "GENETIC"]);
    expect(registry.DOMAIN_GUIDED?.profileId).toBe("DOMAIN_GUIDED_V1");
    expect(registry.GENETIC?.profileId).toBe("GENETIC_V1");
  });
});
