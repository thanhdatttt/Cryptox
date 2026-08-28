import { describe, expect, it } from "vitest";
import type { CandidateGenerationRequest, SearchSpaceConfig } from "../api/contracts";
import { SeededRandomStrategyGenerator } from "./random-generator";

const searchSpace: SearchSpaceConfig = {
  availableStrategyDefinitionIds: ["strategy-c", "strategy-a", "strategy-b"],
  componentCount: { minimum: 2, maximum: 3 },
  requireDistinctComponents: true,
};

function request(
  iterationNumber: number,
  previouslyGeneratedCandidateKeys: readonly string[] = [],
): CandidateGenerationRequest {
  return {
    searchSpace,
    randomSeed: "seed-for-q-01",
    iterationNumber,
    previouslyGeneratedCandidateKeys,
  };
}

describe("SeededRandomStrategyGenerator", () => {
  it("produces the same deterministic sequence for the same seed and history", () => {
    const first = new SeededRandomStrategyGenerator();
    const second = new SeededRandomStrategyGenerator();
    const firstKeys: string[] = [];
    const secondKeys: string[] = [];

    for (let iteration = 1; iteration <= 4; iteration += 1) {
      const firstCandidate = first.generate(request(iteration, firstKeys));
      const secondCandidate = second.generate(request(iteration, secondKeys));
      expect(secondCandidate).toEqual(firstCandidate);
      firstKeys.push(firstCandidate.candidateKey);
      secondKeys.push(secondCandidate.candidateKey);
    }
  });

  it("emits valid unique canonical candidates and reports finite space exhaustion", () => {
    const generator = new SeededRandomStrategyGenerator();
    const generated: string[] = [];

    for (let iteration = 1; iteration <= 4; iteration += 1) {
      const candidate = generator.generate(request(iteration, generated));
      const ids = candidate.strategyDefinitionIds;
      expect(ids).toEqual([...ids].sort((left, right) => left.localeCompare(right)));
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.every((id) => searchSpace.availableStrategyDefinitionIds.includes(id))).toBe(true);
      expect(candidate.candidateKey).toBe(JSON.stringify([candidate.combinationProfileId, ...ids]));
      expect(candidate.compositeLogicalFamilyKey).toBe(candidate.candidateKey);
      expect(candidate.generatedBy).toBe("RANDOM");
      generated.push(candidate.candidateKey);
    }

    expect(new Set(generated).size).toBe(generated.length);
    expect(generated).toHaveLength(4);
    expect(() => generator.generate(request(5, generated))).toThrowError(
      expect.objectContaining({ code: "SEARCH_SPACE_EXHAUSTED" }),
    );
    expect(() => generator.generate(request(6, generated))).toThrowError(
      expect.objectContaining({ code: "SEARCH_SPACE_EXHAUSTED" }),
    );
  });
});
