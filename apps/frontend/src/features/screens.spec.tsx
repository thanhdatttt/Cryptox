import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InMemoryPrivateCache } from "../auth/cache";
import { FixtureFeatureClient } from "./fixture-client";
import { FeatureWorkspace } from "./screens";
import { FeatureWorkspaceStore } from "./state";

describe("fixture feature workspace", () => {
  it("renders descriptor controls, bounded progress, explainable results, overlays, and News", async () => {
    const store = new FeatureWorkspaceStore(
      new FixtureFeatureClient({ ownerUserId: "user-render" }),
      new InMemoryPrivateCache(),
    );
    await store.load();

    const markup = renderToStaticMarkup(
      createElement(FeatureWorkspace, {
        section: "experiments",
        email: "researcher@example.test",
        store,
      }),
    );

    expect(markup).toContain("Descriptor controls");
    expect(markup).toContain("Moving average crossover");
    expect(markup).toContain("Relative strength index");
    expect(markup).toContain("Bollinger bands");
    expect(markup).toContain("Bounded Random Search");
    expect(markup).toContain("Search progress 4 of 4");
    expect(markup).toContain("Return");
    expect(markup).toContain("Win rate");
    expect(markup).toContain("Max drawdown");
    expect(markup).toContain("Provenance");
    expect(markup).toContain("fixture-market");
    expect(markup).toContain("Moving averages");
    expect(markup).toContain("PRICE");
    expect(markup).toContain("ENTRY");
    expect(markup).toContain("EXIT");
    expect(markup).toContain("Sentiment unavailable");
  });
});
