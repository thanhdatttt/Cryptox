import { describe, expect, it } from "vitest";
import * as strategyApi from "./index";

describe("strategy public entrypoint", () => {
  it("exports only the frozen runtime facade and profile constants", () => {
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
    expect(strategyApi.listStrategies()).toEqual([]);
  });
});
