"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const generators_1 = require("../domain/generators");
const definition = (id, category, userId = "owner-1") => ({
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
const space = {
    availableStrategies: [definition("trend", "TREND"), definition("momentum", "MOMENTUM"), definition("structure", "STRUCTURE")],
    maxComponents: 2,
};
(0, vitest_1.describe)("Search strategy generators", () => {
    (0, vitest_1.it)("provides distinct bounded RANDOM and GENETIC candidates with execution policy intent", () => {
        const generators = (0, generators_1.createDefaultStrategyGenerators)();
        const randomFirst = generators.RANDOM.generate(space);
        const randomSecond = generators.RANDOM.generate(space);
        const genetic = generators.GENETIC.generate(space);
        (0, vitest_1.expect)(randomFirst.generatedBy).toBe("RANDOM");
        (0, vitest_1.expect)(randomFirst.strategyDefinitions.length).toBeLessThanOrEqual(2);
        (0, vitest_1.expect)(randomFirst.compositeDefinition.components.length).toBe(randomFirst.strategyDefinitions.length);
        (0, vitest_1.expect)(randomFirst.compositeDefinition.components.every((component) => component.weight === 0)).toBe(true);
        (0, vitest_1.expect)(randomFirst.executionPolicyIntent.mode).toBe("TWO_SIDED_ONE_X_V1");
        (0, vitest_1.expect)(randomSecond.compositeDefinition.id).not.toBe(randomFirst.compositeDefinition.id);
        (0, vitest_1.expect)(genetic.generatedBy).toBe("GENETIC");
        (0, vitest_1.expect)(new Date(randomFirst.compositeDefinition.createdAt).getTime()).not.toBeNaN();
    });
    (0, vitest_1.it)("satisfies DOMAIN_GUIDED category rules and rejects unsatisfiable rules", () => {
        const generator = (0, generators_1.createDefaultStrategyGenerators)().DOMAIN_GUIDED;
        const candidate = generator.generate({ ...space, domainRules: { requiredCategories: ["TREND", "STRUCTURE"] } });
        (0, vitest_1.expect)(candidate.generatedBy).toBe("DOMAIN_GUIDED");
        (0, vitest_1.expect)(candidate.strategyDefinitions.map((item) => item.id)).toEqual(["trend", "structure"]);
        (0, vitest_1.expect)(() => generator.generate({ ...space, domainRules: { requiredCategories: ["INFORMATION"] } })).toThrow("DOMAIN_RULE_UNSATISFIABLE");
    });
});
