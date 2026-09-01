import { describe, expect, it } from "vitest";
import { createDefaultStrategyGenerators } from "../domain/generators";
import type { SearchSpaceConfig } from "../domain/contracts";

const definition = (id: string, category: string, parameters: Record<string, number | string> = {}, userId = "owner-1") => ({
  id, userId, logicalFamilyKey: `strategy:${id}`, strategyName: id, implementationVersion: "1", implementationSha256: "a".repeat(64), version: 1, parameters, createdAt: "2025-01-01T00:00:00.000Z", category,
});

const space: SearchSpaceConfig = {
  availableStrategies: [definition("trend", "TREND", { period: 14 }), definition("momentum", "MOMENTUM", { period: 10 }), definition("structure", "STRUCTURE", { period: 20 })] as never[],
  maxComponents: 2,
};

describe("Search strategy generators", () => {
  it("is deterministic for a run/iteration and produces stable fingerprints", () => {
    const generators = createDefaultStrategyGenerators();
    const context = { searchRunId: "run-1", iterationNumber: 3 };
    const first = generators.RANDOM.generate(space, context);
    const second = generators.RANDOM.generate(space, context);
    expect(second.fingerprint).toBe(first.fingerprint);
    expect(second.strategyDefinitions).toEqual(first.strategyDefinitions);
    expect(second.compositeDefinition.components).toEqual(first.compositeDefinition.components);
    expect(second.compositeDefinition.id).toBe(first.compositeDefinition.id);
    expect(first.generatedBy).toBe("RANDOM");
    expect(first.strategyDefinitions.length).toBeLessThanOrEqual(2);
    expect(first.compositeDefinition.components.length).toBe(first.strategyDefinitions.length);
    expect(first.compositeDefinition.components.every((component) => component.weight === 0)).toBe(true);
    expect(first.executionPolicyIntent.mode).toBe("TWO_SIDED_ONE_X_V1");
    expect(first.fingerprint).toMatch(/^[0-9a-f]+$/);
    expect(new Date(first.compositeDefinition.createdAt).getTime()).not.toBeNaN();
  });

  it("applies parameter variants and DOMAIN_GUIDED category rules", () => {
    const generators = createDefaultStrategyGenerators();
    const first = generators.RANDOM.generate(space, { searchRunId: "run-1", iterationNumber: 1 });
    const later = generators.RANDOM.generate(space, { searchRunId: "run-1", iterationNumber: 2 });
    expect(first.strategyDefinitions.some((item) => item.parameters.period !== 14 && item.parameters.period !== 10)).toBe(true);
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    const candidate = generators.DOMAIN_GUIDED.generate({ ...space, domainRules: { requiredCategories: ["TREND", "STRUCTURE"], allowedCategories: ["TREND", "STRUCTURE"] } }, { searchRunId: "run-1", iterationNumber: 1 });
    expect(candidate.generatedBy).toBe("DOMAIN_GUIDED");
    expect(candidate.strategyDefinitions.map((item) => item.id)).toEqual(["trend", "structure"]);
    expect(() => generators.DOMAIN_GUIDED.generate({ ...space, domainRules: { requiredCategories: ["INFORMATION"] } })).toThrow("DOMAIN_RULE_UNSATISFIABLE");
    expect(() => generators.DOMAIN_GUIDED.generate({ ...space, domainRules: { allowedCategories: ["INFORMATION"] } })).toThrow("EMPTY_SEARCH_SPACE");
  });
});
