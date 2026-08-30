import { describe, expect, it } from "vitest";
import type { CandidateGenerationRequest, SearchSpaceConfig } from "../../../api/contracts";
import { DomainGuidedGeneratorError, DomainGuidedStrategyGenerator } from "./domain-guided-generator";

const searchSpace: SearchSpaceConfig = {
  availableStrategyDefinitionIds: ["momentum-a", "trend-b", "trend-a", "momentum-b", "unclassified"],
  componentCount: { minimum: 2, maximum: 2 },
  requireDistinctComponents: true,
};

function request(
  iterationNumber: number,
  previouslyGeneratedCandidateKeys: readonly string[] = [],
): CandidateGenerationRequest {
  return {
    searchSpace,
    randomSeed: "domain-guided-seed",
    iterationNumber,
    previouslyGeneratedCandidateKeys,
  };
}

function generator(): DomainGuidedStrategyGenerator {
  return new DomainGuidedStrategyGenerator({
    categories: ["Momentum", "Trend"],
    categoryMembers: {
      Momentum: ["momentum-b", "momentum-a"],
      Trend: ["trend-b", "trend-a"],
      Undeclared: ["unclassified"],
    },
  });
}

describe("DomainGuidedStrategyGenerator", () => {
  it("uses only declared category membership and produces canonical candidates", () => {
    const candidate = generator().generate(request(1));

    expect(candidate.generatedBy).toBe("DOMAIN_GUIDED");
    expect(candidate.strategyDefinitionIds).toHaveLength(2);
    expect(candidate.strategyDefinitionIds.some((id) => id.startsWith("momentum-"))).toBe(true);
    expect(candidate.strategyDefinitionIds.some((id) => id.startsWith("trend-"))).toBe(true);
    expect(candidate.strategyDefinitionIds).not.toContain("unclassified");
    expect(candidate.candidateKey).toBe(
      JSON.stringify(["MAJORITY_VOTE_V1", ...candidate.strategyDefinitionIds]),
    );
    expect(candidate.compositeLogicalFamilyKey).toBe(candidate.candidateKey);
  });

  it("replays the same deterministic sequence and avoids previously generated keys", () => {
    const first = generator();
    const second = generator();
    const firstKeys: string[] = [];
    const secondKeys: string[] = [];

    for (let iteration = 1; iteration <= 6; iteration += 1) {
      const firstCandidate = first.generate(request(iteration, firstKeys));
      const secondCandidate = second.generate(request(iteration, secondKeys));
      expect(secondCandidate).toEqual(firstCandidate);
      firstKeys.push(firstCandidate.candidateKey);
      secondKeys.push(secondCandidate.candidateKey);
    }

    expect(new Set(firstKeys).size).toBe(6);
    expect(firstKeys.every((key) => !key.includes("unclassified"))).toBe(true);
    expect(() => first.generate(request(7, firstKeys))).toThrowError(
      expect.objectContaining<DomainGuidedGeneratorError>({ code: "SEARCH_SPACE_EXHAUSTED" }),
    );
  });

  it("rejects a declared category that has no available strategy definition", () => {
    const invalid = new DomainGuidedStrategyGenerator({
      categories: ["Trend", "Information"],
      categoryMembers: { Trend: ["trend-a"], Information: ["missing"] },
    });

    expect(() => invalid.generate(request(1))).toThrowError(
      expect.objectContaining<DomainGuidedGeneratorError>({ code: "INVALID_CATEGORY_CONFIGURATION" }),
    );
  });
});
