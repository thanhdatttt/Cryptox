import { describe, expect, it } from "vitest";
import * as strategyApi from "./index";

describe("strategy public entrypoint", () => {
  it("exports the public runtime facade, profile constants, and factory collection", () => {
    expect(Object.keys(strategyApi).sort()).toEqual(
      [
        "BUILT_IN_STRATEGY_NAMES",
        "LITE_STRATEGY_PROFILES_V1",
        "LLM_AUTHORING_V1",
        "LLM_AUTHORING_V1_ID",
        "MAJORITY_VOTE_V1",
        "MAJORITY_VOTE_V1_ID",
        "SMC_LITE_V1_ID",
        "STRATEGY_IDENTITY_V1",
        "STRATEGY_IDENTITY_V1_ID",
        "STRATEGY_FACTORIES",
        "STRATEGY_SIGNALS",
        "TECHNICAL_PROFILES_V1",
        "TECHNICAL_PROFILES_V1_ID",
        "WEIGHTED_VOTE_V1",
        "WEIGHTED_VOTE_V1_ID",
        "WYCKOFF_LITE_V1_ID",
        "combineSignals",
        "defineComposite",
        "defineStrategy",
        "listStrategies",
        "listCompositeDefinitions",
        "listStrategyDefinitions",
        "readCompositeDefinition",
        "readStrategyDefinition",
        "resolveStrategy",
      ].sort(),
    );
    expect(strategyApi.listStrategies().map((descriptor) => descriptor.name)).toEqual([
      "MA",
      "RSI",
      "BOLLINGER_BANDS",
      "SUPPORT_RESISTANCE",
      "SMC_LITE_V1",
      "WYCKOFF_LITE_V1",
    ]);
    expect(Object.isFrozen(strategyApi.STRATEGY_FACTORIES)).toBe(true);
  });
});
