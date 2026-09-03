import { describe, expect, it } from "vitest";
import { validateSearchParameters, type SearchValidationInput } from "./features";
import type { StrategyDefinition, StrategyCategory } from "./api";

const mockDefinition = (id: string, name: string, category: StrategyCategory): StrategyDefinition & { category: StrategyCategory } => ({
  id,
  userId: "user-1",
  logicalFamilyKey: `strat:${name}`,
  strategyName: name,
  implementationVersion: "1.0.0",
  implementationSha256: "a".repeat(64),
  version: 1,
  parameters: { period: 14 },
  category,
  createdAt: "2025-01-01T00:00:00.000Z",
});

const sampleDefinitions: StrategyDefinition[] = [
  mockDefinition("def-ma", "Moving Average", "TREND"),
  mockDefinition("def-rsi", "RSI", "MOMENTUM"),
  mockDefinition("def-bb", "Bollinger Bands", "VOLATILITY"),
  mockDefinition("def-sr", "Support Resistance", "STRUCTURE"),
  mockDefinition("def-news", "News Sentiment", "INFORMATION"),
];

const categoryFor = (def: StrategyDefinition) => (def as any).category as StrategyCategory;

describe("Search Configuration & Validation Matrix", () => {
  const baseValidInput: SearchValidationInput = {
    scopeId: "scope-btc-1h",
    selectedIds: ["def-ma", "def-rsi"],
    maxInFlight: "1",
    maxComponents: "2",
    stopType: "maxCandidates",
    stopValue: "5",
    generatorType: "RANDOM",
    definitions: sampleDefinitions,
    categoryFor,
  };

  describe("1. All Search Generator Types", () => {
    it("successfully validates RANDOM generator", () => {
      const result = validateSearchParameters({ ...baseValidInput, generatorType: "RANDOM" });
      expect(result.generatorType).toBe("RANDOM");
      expect(result.domainRules).toBeUndefined();
    });

    it("successfully validates GENETIC generator", () => {
      const result = validateSearchParameters({ ...baseValidInput, generatorType: "GENETIC" });
      expect(result.generatorType).toBe("GENETIC");
      expect(result.domainRules).toBeUndefined();
    });

    it("successfully validates DOMAIN_GUIDED generator with proper rules", () => {
      const result = validateSearchParameters({
        ...baseValidInput,
        generatorType: "DOMAIN_GUIDED",
        requiredCategories: ["TREND"],
        allowedCategories: ["TREND", "MOMENTUM"],
        forbiddenCategories: ["INFORMATION"],
      });
      expect(result.generatorType).toBe("DOMAIN_GUIDED");
      expect(result.domainRules).toEqual({
        requiredCategories: ["TREND"],
        allowedCategories: ["TREND", "MOMENTUM"],
        forbiddenCategories: ["INFORMATION"],
      });
    });
  });

  describe("2. Stop Condition Types and Limits", () => {
    it("handles maxCandidates properly", () => {
      const result = validateSearchParameters({ ...baseValidInput, stopType: "maxCandidates", stopValue: "10" });
      expect(result.stopCondition).toEqual({ maxCandidates: 10 });
    });

    it("handles maxDurationSeconds properly", () => {
      const result = validateSearchParameters({ ...baseValidInput, stopType: "maxDurationSeconds", stopValue: "300" });
      expect(result.stopCondition).toEqual({ maxDurationSeconds: 300 });
    });

    it("handles noImprovementAfterIterations properly", () => {
      const result = validateSearchParameters({ ...baseValidInput, stopType: "noImprovementAfterIterations", stopValue: "5" });
      expect(result.stopCondition).toEqual({ noImprovementAfterIterations: 5 });
    });

    it.each(["0", "-1", "-100", "2.5", "abc", "", "NaN"])(
      "rejects invalid stopValue: %s",
      (invalidValue) => {
        expect(() =>
          validateSearchParameters({ ...baseValidInput, stopValue: invalidValue })
        ).toThrow(/Stop limit must be a positive whole number/);
      }
    );
  });

  describe("3. Concurrency (maxInFlight) Validation", () => {
    it.each(["1", "2", "4", "10"])("accepts valid concurrency: %s", (concurrency) => {
      const result = validateSearchParameters({ ...baseValidInput, maxInFlight: concurrency });
      expect(result.maxInFlight).toBe(Number(concurrency));
    });

    it.each(["0", "-1", "1.5", "0.2", "abc", "", "NaN"])(
      "rejects invalid concurrency: %s",
      (invalidConcurrency) => {
        expect(() =>
          validateSearchParameters({ ...baseValidInput, maxInFlight: invalidConcurrency })
        ).toThrow(/Max in-flight concurrency must be a positive integer/);
      }
    );
  });

  describe("4. Ensemble Size (maxComponents) Validation", () => {
    it.each(["1", "2", "3", "5"])("accepts valid maxComponents: %s", (components) => {
      const result = validateSearchParameters({ ...baseValidInput, maxComponents: components });
      expect(result.maxComponents).toBe(Number(components));
    });

    it.each(["0", "-1", "1.2", "2.9", "abc", "", "NaN"])(
      "rejects invalid maxComponents: %s",
      (invalidComponents) => {
        expect(() =>
          validateSearchParameters({ ...baseValidInput, maxComponents: invalidComponents })
        ).toThrow(/Max components must be a positive integer/);
      }
    );
  });

  describe("5. Scope and Strategy Pool Selection", () => {
    it("rejects when scopeId is missing or blank", () => {
      expect(() => validateSearchParameters({ ...baseValidInput, scopeId: "" })).toThrow(
        /Please select a benchmark dataset scope/
      );
      expect(() => validateSearchParameters({ ...baseValidInput, scopeId: "   " })).toThrow(
        /Please select a benchmark dataset scope/
      );
    });

    it("rejects when no strategies are selected", () => {
      expect(() => validateSearchParameters({ ...baseValidInput, selectedIds: [] })).toThrow(
        /Please select at least one strategy definition/
      );
    });

    it("accepts single strategy in pool when maxComponents is 1", () => {
      const result = validateSearchParameters({ ...baseValidInput, maxComponents: "1", selectedIds: ["def-ma"] });
      expect(result.strategyDefinitionIds).toEqual(["def-ma"]);
    });

    it("rejects single strategy in pool when maxComponents >= 2", () => {
      expect(() =>
        validateSearchParameters({ ...baseValidInput, maxComponents: "2", selectedIds: ["def-ma"] })
      ).toThrow(/Ensemble Size \(Max Components\) is set to 2, but only 1 strategy is selected/);
    });

    it("accepts all strategies in pool", () => {
      const allIds = sampleDefinitions.map((d) => d.id);
      const result = validateSearchParameters({ ...baseValidInput, selectedIds: allIds });
      expect(result.strategyDefinitionIds).toHaveLength(5);
    });
  });

  describe("6. Domain-Guided Rule Consistency & Constraints", () => {
    it("rejects when a category is both Required and Forbidden", () => {
      expect(() =>
        validateSearchParameters({
          ...baseValidInput,
          generatorType: "DOMAIN_GUIDED",
          requiredCategories: ["TREND"],
          forbiddenCategories: ["TREND"],
        })
      ).toThrow(/A category cannot be both required and forbidden/);
    });

    it("rejects when Allowed categories are defined but omit a Required category", () => {
      expect(() =>
        validateSearchParameters({
          ...baseValidInput,
          generatorType: "DOMAIN_GUIDED",
          requiredCategories: ["TREND"],
          allowedCategories: ["MOMENTUM"],
        })
      ).toThrow(/Required categories must be allowed/);
    });

    it("rejects when Forbidden categories overlap with Allowed categories", () => {
      expect(() =>
        validateSearchParameters({
          ...baseValidInput,
          generatorType: "DOMAIN_GUIDED",
          allowedCategories: ["TREND", "MOMENTUM"],
          forbiddenCategories: ["TREND"],
        })
      ).toThrow(/Forbidden categories must be excluded from allowed categories/);
    });

    it("rejects when required categories count exceeds maxComponents", () => {
      expect(() =>
        validateSearchParameters({
          ...baseValidInput,
          generatorType: "DOMAIN_GUIDED",
          maxComponents: "1",
          requiredCategories: ["TREND", "MOMENTUM"],
          selectedIds: ["def-ma", "def-rsi"],
        })
      ).toThrow(/Max components \(1\) must be at least the count of required categories \(2\)/);
    });

    it("rejects when a required category has no eligible selected strategies in pool", () => {
      expect(() =>
        validateSearchParameters({
          ...baseValidInput,
          generatorType: "DOMAIN_GUIDED",
          requiredCategories: ["INFORMATION"],
          selectedIds: ["def-ma", "def-rsi"], // News is def-news, not selected
        })
      ).toThrow(/Every required category needs an eligible selected definition/);
    });

    it("rejects when domain filtering leaves 0 eligible strategies", () => {
      expect(() =>
        validateSearchParameters({
          ...baseValidInput,
          generatorType: "DOMAIN_GUIDED",
          allowedCategories: ["INFORMATION"], // Only information allowed
          selectedIds: ["def-ma", "def-rsi"], // But only MA and RSI selected
        })
      ).toThrow(/The selected domain rules leave no eligible strategy definitions in the pool/);
    });
  });
});
