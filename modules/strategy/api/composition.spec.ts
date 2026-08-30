import { describe, expect, it } from "vitest";
import type { AuthenticatedUserId } from "modules/auth/api";
import { createInMemoryStrategyDependencies } from "../application/memory";
import { movingAverageFactory } from "../domain/plugins/moving-average";
import { rsiFactory } from "../domain/plugins/rsi";
import { bollingerBandsFactory } from "../domain/plugins/bollinger-bands";
import { supportResistanceFactory } from "../domain/plugins/support-resistance";
import { smcLiteFactory } from "../domain/plugins/smc-lite";
import { wyckoffLiteFactory } from "../domain/plugins/wyckoff-lite";
import {
  SMC_LITE_V1_ID,
  STRATEGY_FACTORIES,
  TECHNICAL_PROFILES_V1_ID,
  WYCKOFF_LITE_V1_ID,
} from ".";
import { createStrategyModule } from "./bootstrap";

const canonicalFactories = [
  movingAverageFactory,
  rsiFactory,
  bollingerBandsFactory,
  supportResistanceFactory,
  smcLiteFactory,
  wyckoffLiteFactory,
] as const;

describe("Strategy public composition", () => {
  it("publishes the canonical factories in deterministic order with exact profiles", () => {
    expect(STRATEGY_FACTORIES).toHaveLength(canonicalFactories.length);
    expect(STRATEGY_FACTORIES.map((factory) => factory.descriptor.name)).toEqual([
      "MA",
      "RSI",
      "BOLLINGER_BANDS",
      "SUPPORT_RESISTANCE",
      "SMC_LITE_V1",
      "WYCKOFF_LITE_V1",
    ]);
    expect(STRATEGY_FACTORIES.map((factory) => factory.descriptor.behaviorProfileId)).toEqual([
      TECHNICAL_PROFILES_V1_ID,
      TECHNICAL_PROFILES_V1_ID,
      TECHNICAL_PROFILES_V1_ID,
      TECHNICAL_PROFILES_V1_ID,
      SMC_LITE_V1_ID,
      WYCKOFF_LITE_V1_ID,
    ]);
    expect(STRATEGY_FACTORIES.map((factory) => factory.descriptor.extensionProfileId)).toEqual([
      undefined,
      undefined,
      undefined,
      undefined,
      SMC_LITE_V1_ID,
      WYCKOFF_LITE_V1_ID,
    ]);

    for (const [index, factory] of STRATEGY_FACTORIES.entries()) {
      expect(factory).toBe(canonicalFactories[index]);
      expect(factory.descriptor).toBe(canonicalFactories[index]!.descriptor);
      expect(factory.create).toBe(canonicalFactories[index]!.create);
    }
    expect(new Set(STRATEGY_FACTORIES.map((factory) => factory.create)).size).toBe(
      canonicalFactories.length,
    );
  });

  it("keeps the public factory collection immutable", () => {
    expect(Object.isFrozen(STRATEGY_FACTORIES)).toBe(true);
    expect(() => {
      (STRATEGY_FACTORIES as unknown as Array<(typeof canonicalFactories)[number]>).push(
        canonicalFactories[0],
      );
    }).toThrow(TypeError);
    expect(() => {
      (STRATEGY_FACTORIES as unknown as Array<(typeof canonicalFactories)[number]>)[0] =
        canonicalFactories[1];
    }).toThrow(TypeError);
  });

  it("can be injected into the existing Strategy bootstrap from the public seam", async () => {
    const dependencies = createInMemoryStrategyDependencies(STRATEGY_FACTORIES);
    const strategyModule = createStrategyModule(dependencies);
    const context = { authenticatedUserId: "composition-owner" as AuthenticatedUserId };

    const definition = await strategyModule.defineStrategy(context, {
      logicalFamilyKey: "composition-family",
      strategyName: "MA",
      parameters: { fastPeriod: 2, slowPeriod: 3 },
    });

    expect(strategyModule.listStrategies().map((descriptor) => descriptor.name)).toEqual(
      STRATEGY_FACTORIES.map((factory) => factory.descriptor.name),
    );
    await expect(strategyModule.resolveStrategy(definition)).resolves.toMatchObject({
      name: "MA",
      category: "TREND",
    });
  });
});
