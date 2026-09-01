import { describe, expect, it } from "vitest";
import { createDefaultStrategyGenerators } from "../domain/generators";
import type { SearchSpaceConfig } from "../domain/contracts";
import type { StrategyParameterDescriptor } from "modules/strategy/api";

const descriptor = (key: string, type: "INTEGER" | "NUMBER" | "ENUM", defaultValue: number | string, bounds: Partial<StrategyParameterDescriptor> = {}): StrategyParameterDescriptor => ({ key, label: key, type, required: true, defaultValue, ...bounds });
const definition = (id: string, strategyName: string, parameters: Record<string, number | string>, parameterDescriptors: readonly StrategyParameterDescriptor[]) => ({ id, userId: "owner-1", logicalFamilyKey: "strategy:" + strategyName, strategyName, implementationVersion: "1.0.0", implementationSha256: id.padEnd(64, "0"), version: 1, parameters, parameterDescriptors, createdAt: "2025-01-01T00:00:00.000Z" });
const space: SearchSpaceConfig = {
  availableStrategies: [
    definition("ma", "MA", { fastPeriod: 2, slowPeriod: 3 }, [descriptor("fastPeriod", "INTEGER", 2, { minimum: 2, maximum: 10, step: 1 }), descriptor("slowPeriod", "INTEGER", 3, { minimum: 3, maximum: 12, step: 1 })]),
    definition("rsi", "RSI", { period: 2, buyThreshold: 0, sellThreshold: 100 }, [descriptor("period", "INTEGER", 2, { minimum: 2, maximum: 10, step: 1 }), descriptor("buyThreshold", "NUMBER", 0, { minimum: 0, maximum: 50, step: 0.5 }), descriptor("sellThreshold", "NUMBER", 100, { minimum: 50, maximum: 100, step: 0.5 })]),
    definition("mode", "MODE", { mode: "A" }, [descriptor("mode", "ENUM", "A", { options: ["A", "B", "C"] })]),
  ] as never[],
  maxComponents: 3,
};

describe("GENETIC Search generator", () => {
  it("uses deterministic crossover/mutation and preserves lineage on recovery", () => {
    const generator = createDefaultStrategyGenerators().GENETIC;
    const context = { searchRunId: "run-genetic", iterationNumber: 4 };
    const first = generator.generate(space, context);
    const recovered = generator.generate(space, context);
    expect(recovered.strategyDefinitions).toEqual(first.strategyDefinitions);
    expect(recovered.fingerprint).toBe(first.fingerprint);
    expect(recovered.lineage).toEqual(first.lineage);
    expect(first.generatedBy).toBe("GENETIC");
    expect(first.lineage?.parentFingerprints).toHaveLength(2);
    expect(first.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("mutates only descriptor-allowed values and keeps strategy relationships valid", () => {
    const generator = createDefaultStrategyGenerators().GENETIC;
    for (let iteration = 1; iteration <= 12; iteration += 1) {
      const result = generator.generate(space, { searchRunId: "boundary-run", iterationNumber: iteration });
      for (const item of result.strategyDefinitions) {
        const descriptors = item.parameterDescriptors ?? [];
        for (const parameter of descriptors) {
          const value = item.parameters[parameter.key];
          if (parameter.type === "ENUM") expect(parameter.options).toContain(value);
          else {
            expect(typeof value).toBe("number");
            expect(value as number).toBeGreaterThanOrEqual(parameter.minimum!);
            expect(value as number).toBeLessThanOrEqual(parameter.maximum!);
            expect(((value as number) - parameter.minimum!) / parameter.step!).toBeCloseTo(Math.round(((value as number) - parameter.minimum!) / parameter.step!), 8);
          }
        }
        if (item.strategyName === "MA") expect(item.parameters.fastPeriod as number).toBeLessThan(item.parameters.slowPeriod as number);
        if (item.strategyName === "RSI") expect(item.parameters.buyThreshold as number).toBeLessThan(item.parameters.sellThreshold as number);
      }
    }
  });

  it("does not repeat a recorded fingerprint and reports a bounded unsatisfiable space", () => {
    const generator = createDefaultStrategyGenerators().GENETIC;
    const first = generator.generate(space, { searchRunId: "unique-run", iterationNumber: 1 });
    const second = generator.generate({ ...space, generatedFingerprints: [first.fingerprint] }, { searchRunId: "unique-run", iterationNumber: 1 });
    expect(second.fingerprint).not.toBe(first.fingerprint);
    const impossible: SearchSpaceConfig = {
      availableStrategies: [definition("impossible", "MA", { fastPeriod: 5, slowPeriod: 5 }, [descriptor("fastPeriod", "INTEGER", 5, { minimum: 5, maximum: 5 }), descriptor("slowPeriod", "INTEGER", 5, { minimum: 5, maximum: 5 })])] as never[],
      maxComponents: 1,
    };
    expect(() => generator.generate(impossible, { searchRunId: "impossible-run", iterationNumber: 1 })).toThrow("GENETIC_SEARCH_SPACE_UNSATISFIABLE");
  });
});
