import { describe, expect, it } from "vitest";
import type { CandidateGenerationRequest, SearchSpaceConfig } from "../../../api/contracts";
import {
  GeneticGeneratorError,
  GeneticStrategyGenerator,
} from "./genetic-generator";

const searchSpace: SearchSpaceConfig = {
  availableStrategyDefinitionIds: ["strategy-d", "strategy-a", "strategy-c", "strategy-b"],
  componentCount: { minimum: 2, maximum: 3 },
  requireDistinctComponents: true,
};

function request(
  iterationNumber: number,
  previouslyGeneratedCandidateKeys: readonly string[] = [],
): CandidateGenerationRequest {
  return {
    searchSpace,
    randomSeed: "genetic-seed",
    iterationNumber,
    previouslyGeneratedCandidateKeys,
  };
}

describe("GeneticStrategyGenerator", () => {
  it("exposes the approved bounded defaults", () => {
    const generator = new GeneticStrategyGenerator();

    expect(generator.profileId).toBe("GENETIC_V1");
    expect(generator.algorithmConfiguration).toEqual({
      population: 50,
      maximumGenerations: 10,
      elitePercent: 0.1,
      mutationPercent: 0.2,
    });
  });

  it("produces a reproducible unique sequence with canonical identity", () => {
    const first = new GeneticStrategyGenerator();
    const second = new GeneticStrategyGenerator();
    const firstKeys: string[] = [];
    const secondKeys: string[] = [];

    for (let iteration = 1; iteration <= 10; iteration += 1) {
      const firstCandidate = first.generate(request(iteration, firstKeys));
      const secondCandidate = second.generate(request(iteration, secondKeys));
      expect(secondCandidate).toEqual(firstCandidate);
      expect(firstCandidate.generatedBy).toBe("GENETIC");
      expect(firstCandidate.strategyDefinitionIds).toEqual(
        [...firstCandidate.strategyDefinitionIds].sort((left, right) => left.localeCompare(right)),
      );
      expect(firstCandidate.compositeLogicalFamilyKey).toBe(firstCandidate.candidateKey);
      firstKeys.push(firstCandidate.candidateKey);
      secondKeys.push(secondCandidate.candidateKey);
    }

    expect(new Set(firstKeys).size).toBe(firstKeys.length);
  });

  it("reports finite exhaustion instead of emitting duplicate candidates", () => {
    const tinySpace: SearchSpaceConfig = {
      availableStrategyDefinitionIds: ["strategy-a", "strategy-b"],
      componentCount: { minimum: 2, maximum: 2 },
      requireDistinctComponents: true,
    };
    const generator = new GeneticStrategyGenerator();
    const first = generator.generate({ ...request(1), searchSpace: tinySpace });

    expect(() => generator.generate({
      ...request(2, [first.candidateKey]),
      searchSpace: tinySpace,
    })).toThrowError(expect.objectContaining<GeneticGeneratorError>({ code: "SEARCH_SPACE_EXHAUSTED" }));
  });
});
