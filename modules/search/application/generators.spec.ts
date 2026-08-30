import { describe, expect, it } from "vitest";
import { createDefaultStrategyGenerators } from "../domain/generators";
import type { SearchSpaceConfig } from "../domain/contracts";

const definition = (id: string, category: string, userId = "owner-1") => ({
  id,
  userId,
  logicalFamilyKey: `strategy:${id}`,
  strategyName: id,
  implementationVersion: "1",
  implementationSha256: "a".repeat(64),
  version: 1,
  parameters: {},
  createdAt: "2025-01-01T00:00:00.000Z",
  category,
});

const space: SearchSpaceConfig = {
  availableStrategies: [definition("trend", "TREND"), definition("momentum", "MOMENTUM"), definition("structure", "STRUCTURE")] as never[],
  maxComponents: 2,
};

describe("Search strategy generators", () => {
  it("provides distinct bounded RANDOM and GENETIC candidates with execution policy intent", () => {
    const generators = createDefaultStrategyGenerators();
    const randomFirst = generators.RANDOM.generate(space);
    const randomSecond = generators.RANDOM.generate(space);
    const genetic = generators.GENETIC.generate(space);

    expect(randomFirst.generatedBy).toBe("RANDOM");
    expect(randomFirst.strategyDefinitions.length).toBeLessThanOrEqual(2);
    expect(randomFirst.compositeDefinition.components.length).toBe(randomFirst.strategyDefinitions.length);
    expect(randomFirst.compositeDefinition.components.every((component) => component.weight === 0)).toBe(true);
    expect(randomFirst.executionPolicyIntent.mode).toBe("TWO_SIDED_ONE_X_V1");
    expect(randomSecond.compositeDefinition.id).not.toBe(randomFirst.compositeDefinition.id);
    expect(genetic.generatedBy).toBe("GENETIC");
    expect(new Date(randomFirst.compositeDefinition.createdAt).getTime()).not.toBeNaN();
  });

  it("satisfies DOMAIN_GUIDED category rules and rejects unsatisfiable rules", () => {
    const generator = createDefaultStrategyGenerators().DOMAIN_GUIDED;
    const candidate = generator.generate({ ...space, domainRules: { requiredCategories: ["TREND", "STRUCTURE"] } });

    expect(candidate.generatedBy).toBe("DOMAIN_GUIDED");
    expect(candidate.strategyDefinitions.map((item) => item.id)).toEqual(["trend", "structure"]);
    expect(() => generator.generate({ ...space, domainRules: { requiredCategories: ["INFORMATION"] } })).toThrow("DOMAIN_RULE_UNSATISFIABLE");
  });
});
