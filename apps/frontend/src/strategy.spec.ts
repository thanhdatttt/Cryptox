import { describe, expect, it } from "vitest";
import { generatedDefinition, strategyDefinitionJson, weightedComponents } from "./strategy";

describe("strategy workspace data mapping", () => {
  it("uses the actual returned definition for the preview", () => {
    const definition = { id: "definition-1", strategyName: "RSI", parameters: { period: 14 }, version: 2, createdAt: "2025-01-01T00:00:00.000Z" };
    const result = { generationId: "generation-1", kind: "SINGLE" as const, strategyDefinition: definition, modelName: "LOCAL_DETERMINISTIC", modelVersion: "1.0.0", promptVersion: "1" };
    expect(generatedDefinition(result)).toEqual(definition);
    expect(strategyDefinitionJson(result)).toContain('"strategyName": "RSI"');
    expect(strategyDefinitionJson(result)).toContain('"modelName": "LOCAL_DETERMINISTIC"');
  });

  it("creates weighted composite components without inventing backend rules", () => {
    expect(weightedComponents(["a", "b"], {})).toEqual([{ strategyDefinitionId: "a", weight: 0.5 }, { strategyDefinitionId: "b", weight: 0.5 }]);
    expect(weightedComponents(["a", "b"], { a: 0.7, b: 0.3 })).toEqual([{ strategyDefinitionId: "a", weight: 0.7 }, { strategyDefinitionId: "b", weight: 0.3 }]);
  });
});
