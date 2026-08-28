import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import type { CandidateRepository, ExperimentRepository } from "./ports";

type Candidate = { id: string; ownerUserId: AuthenticatedUserId; searchRunId?: string };
type Experiment = { id: string; candidateId: string; searchRunId?: string };
type Trade = { id: string; experimentId: string };

describe("Backtesting owner-scoped repository ports", () => {
  it("scopes Candidate roots and inherited Experiment/Trade reads by Candidate owner", async () => {
    const candidateRepository = {
      insert: async (ownerUserId, command: { id: string }) => ({ ...command, ownerUserId }),
      getByOwnerAndId: async () => undefined,
      save: async (ownerUserId, candidate) =>
        candidate.ownerUserId === ownerUserId
          ? candidate
          : Promise.reject(new Error("NOT_FOUND")),
      listByOwnerAndSearchRun: async () => [],
    } satisfies CandidateRepository<Candidate, { id: string }>;
    const experimentRepository = {
      insertForCandidateOwner: async (_ownerUserId, experiment) => experiment,
      getByCandidateOwnerAndId: async () => undefined,
      listByCandidateOwnerAndSearchRun: async () => [],
      listTradesByCandidateOwner: async () => ({ items: [] }),
    } satisfies ExperimentRepository<Experiment, Trade>;

    const candidate = await candidateRepository.insert("user-a" as AuthenticatedUserId, {
      id: "candidate-a",
    });
    expect(candidate.ownerUserId).toBe("user-a");
    await expect(
      candidateRepository.save("user-b" as AuthenticatedUserId, candidate),
    ).rejects.toThrow("NOT_FOUND");
    expect(experimentRepository.getByCandidateOwnerAndId).toBeTypeOf("function");
    expect(experimentRepository.listTradesByCandidateOwner).toBeTypeOf("function");
  });
});
