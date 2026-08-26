import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./style.css", import.meta.url), "utf8");

function token(name: string): number {
  const match = css.match(new RegExp(`--${name}:\\s*(\\d+)px`));
  return Number(match?.[1] ?? 0);
}

describe("frontend typography system", () => {
  it("defines shared readable type tokens with the required minimums", () => {
    expect(token("type-body")).toBeGreaterThanOrEqual(14);
    expect(token("type-control")).toBeGreaterThanOrEqual(14);
    expect(token("type-support")).toBeGreaterThanOrEqual(12);
    expect(token("type-meta")).toBeGreaterThanOrEqual(12);
    expect(token("type-dense")).toBeGreaterThanOrEqual(11);
    expect(token("type-card-title")).toBeGreaterThanOrEqual(16);
    expect(css).toContain("--leading-body: 1.5;");
    expect(css).toContain("--leading-support: 1.45;");
  });

  it("routes core application surfaces through the shared tokens", () => {
    expect(css).toContain("button,\ninput,\ntextarea,\nselect {\n  font-size: var(--type-control);");
    expect(css).toContain("table,\n.strategy-table,\nth,\ntd {\n  font-size: var(--type-control);");
    expect(css).toContain(".panel h2,\n.market-side-title h2,\n.market-card-heading h2 {\n  font-size: var(--type-card-title);");
    expect(css).toContain(".error,\n.success,\n.muted,\n.strategy-error,\n.market-error {\n  font-size: var(--type-support);");
    expect(css).toContain(".chart text {\n  font-size: var(--type-dense);");
  });

  it("adds wrapping safeguards for narrow layouts", () => {
    expect(css).toContain("@media (max-width: 1320px)");
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain(".validation-grid {\n    grid-template-columns: repeat(2, minmax(0, 1fr));");
    expect(css).toContain(".market-card-footer span {\n    white-space: normal;");
  });
});
