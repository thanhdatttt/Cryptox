import { describe, expect, it } from "vitest";
import { extractWithTemplate, validateExtractedItems } from "./template-engine";
import { InMemoryNewsTemplateRepository } from "./template-repository";
import { createLlmTemplateGenerator } from "./llm-template-generator";
import type { ExtractionTemplate } from "../domain/template-contracts";

describe("News Extraction Template Engine & Repository", () => {
  const sampleTemplate: ExtractionTemplate = {
    id: "tpl-123",
    domain: "decrypt.co",
    version: "v1.0",
    selectors: {
      container: "article",
      title: "h2, h3",
      summary: "p",
      link: "a",
      time: "time",
      tags: "span",
    },
    confidence: 0.9,
    defectRate: 0.0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("extracts articles from HTML using template selectors without LLM tokens", () => {
    const html = `
      <html>
        <body>
          <article class="news-card">
            <h2>Bitcoin Breaks $100k All-Time High Record</h2>
            <p>Bitcoin has surged past milestone levels with institutional inflows.</p>
            <a href="/news/btc-milestone">Read more</a>
            <time datetime="2026-09-02T10:00:00Z">Sep 2, 2026</time>
          </article>
          <article class="news-card">
            <h2>Ethereum Layer 2 Activity Surges 300%</h2>
            <p>L2 rollup transactions have reached record highs this quarter.</p>
            <a href="/news/eth-l2-surge">Read more</a>
            <time datetime="2026-09-02T10:30:00Z">Sep 2, 2026</time>
          </article>
        </body>
      </html>
    `;

    const items = extractWithTemplate(html, sampleTemplate, "https://decrypt.co/news", "DECRYPT", "BTC");
    expect(items.length).toBe(2);
    expect(items[0]!.title).toContain("Bitcoin Breaks");
    expect(items[0]!.url).toBe("https://decrypt.co/news/btc-milestone");
    expect(items[0]!.source).toBe("DECRYPT");
    expect(items[1]!.title).toContain("Ethereum Layer 2");
    expect(items[1]!.url).toBe("https://decrypt.co/news/eth-l2-surge");
  });

  it("computes validation statistics and detects high defects", () => {
    const items = extractWithTemplate(
      "<html><body><article><h2>BTC</h2><a href='/a'>link</a></article></body></html>",
      sampleTemplate,
      "https://decrypt.co",
      "DECRYPT",
    );
    // Title is too short ("BTC" < 8 chars) so extractWithTemplate rejects it
    expect(items.length).toBe(0);
    const stats = validateExtractedItems(items);
    expect(stats.isHighError).toBe(true);
    expect(stats.totalDefectPercent).toBe(100.0);
  });

  it("persists and activates template versions in repository", async () => {
    const repo = new InMemoryNewsTemplateRepository();
    await repo.save(sampleTemplate);

    const active = await repo.findActiveByDomain("decrypt.co");
    expect(active?.version).toBe("v1.0");
    expect(active?.isActive).toBe(true);

    const v11: ExtractionTemplate = {
      ...sampleTemplate,
      id: "tpl-456",
      version: "v1.1",
      isActive: false,
    };
    await repo.save(v11);

    const all = await repo.findAllByDomain("decrypt.co");
    expect(all.length).toBe(2);

    // Switch active version to v1.1
    await repo.setActiveVersion("decrypt.co", "v1.1");
    const updatedActive = await repo.findActiveByDomain("decrypt.co");
    expect(updatedActive?.version).toBe("v1.1");
    expect(updatedActive?.isActive).toBe(true);
  });

  it("generates default resilient templates via generator", async () => {
    const gen = createLlmTemplateGenerator();
    const tpl = await gen.generateTemplate("bankless.com", "<html><body><article><h2>Title</h2></article></body></html>");
    expect(tpl.domain).toBe("bankless.com");
    expect(tpl.version).toBe("v1.0");
    expect(tpl.selectors.title).toBeDefined();

    const repaired = await gen.repairTemplate("bankless.com", tpl, "", {
      evaluatedCount: 1,
      emptyFieldsPercent: 100,
      formatErrorsPercent: 0,
      totalDefectPercent: 100,
      integrityPercent: 0,
      isHighError: true,
      confidence: 0,
    });
    expect(repaired.version).toBe("v1.1");
    expect(repaired.selectors.title).toContain("headline");
  });
});
