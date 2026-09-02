import { createHash } from "node:crypto";
import type { ExtractionTemplate, TemplateValidationStats } from "../domain/template-contracts";

export interface LlmTemplateGeneratorOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
}

export interface NewsTemplateGenerator {
  generateTemplate(domain: string, sampleHtml: string): Promise<ExtractionTemplate>;
  repairTemplate(domain: string, currentTemplate: ExtractionTemplate, sampleHtml: string, stats: TemplateValidationStats): Promise<ExtractionTemplate>;
}

const defaultSelectorsForDomain = (domain: string) => {
  const d = domain.toLowerCase();
  if (d.includes("decrypt")) {
    return {
      container: "article, div.grid-cols-1",
      title: "h3, h2, .article-title",
      summary: "p, .summary, description",
      link: "a[href*='/']",
      time: "time, span.date",
      tags: "span.category, a[href*='/tag']",
    };
  }
  if (d.includes("bankless")) {
    return {
      container: "article, div.article-card",
      title: "h2, h1, .headline",
      summary: "p, .excerpt, .description",
      link: "a[href*='/read']",
      time: "time, span.published",
      tags: "div.tags",
    };
  }
  if (d.includes("cryptoslate")) {
    return {
      container: "article, div.news-feed-item",
      title: "h1, h2, h3",
      summary: "p, .subdeck",
      link: "a",
      time: "time, span.posted-date",
      tags: "div.categories",
    };
  }
  return {
    container: "article, div.card, div.post, div.news-item",
    title: "h1, h2, h3, .title, .headline",
    summary: "p, .summary, .description, .excerpt",
    link: "a",
    time: "time, .date, .pubDate",
    tags: ".tags, .categories",
  };
};

export function createLlmTemplateGenerator(options: LlmTemplateGeneratorOptions = {}): NewsTemplateGenerator {
  const request = options.fetch ?? globalThis.fetch;
  const apiKey = options.apiKey?.trim();
  const model = options.model?.trim() || "gemini-3.6-flash";
  const endpoint = options.endpoint?.trim() || "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

  const callLlm = async (systemPrompt: string, userPrompt: string): Promise<any> => {
    if (!apiKey) return null;
    try {
      const response = await request(endpoint, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;
      return typeof text === "string" ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };

  return {
    async generateTemplate(domain: string, sampleHtml: string): Promise<ExtractionTemplate> {
      const normalizedDomain = domain.toLowerCase().trim();
      const snippet = sampleHtml.slice(0, 4000);
      const now = new Date().toISOString();

      const llmResult = await callLlm(
        "You are an expert HTML parser engineer. Analyze the provided HTML sample and extract the most accurate CSS selectors/tags for articles on this website. Return ONLY a JSON object with keys: container, title, summary, link, time, tags.",
        `Website Domain: ${normalizedDomain}\nHTML Sample:\n${snippet}`,
      );

      const selectors = (llmResult?.selectors || (llmResult?.container && llmResult)) ?? defaultSelectorsForDomain(normalizedDomain);
      const id = `tpl-${createHash("sha256").update(`${normalizedDomain}:v1.0`, "utf8").digest("hex").slice(0, 16)}`;

      return {
        id,
        domain: normalizedDomain,
        version: "v1.0",
        selectors: {
          container: selectors.container || "article",
          title: selectors.title || "h1, h2, h3",
          summary: selectors.summary || "p",
          link: selectors.link || "a",
          time: selectors.time || "time",
          tags: selectors.tags || "tags",
        },
        sampleHtmlSnippet: snippet.slice(0, 500),
        confidence: 0.85,
        defectRate: 0.0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    },

    async repairTemplate(
      domain: string,
      currentTemplate: ExtractionTemplate,
      sampleHtml: string,
      stats: TemplateValidationStats,
    ): Promise<ExtractionTemplate> {
      const normalizedDomain = domain.toLowerCase().trim();
      const snippet = sampleHtml.slice(0, 4000);
      const now = new Date().toISOString();
      const nextVersion = currentTemplate.version === "v1.0" ? "v1.1" : `v1.${Number(currentTemplate.version.split(".")[1] || 1) + 1}`;

      const llmResult = await callLlm(
        "You are a Self-Healing Web Scraper Optimizer. The previous extraction template suffered from layout drift and high defect rate. Generate updated fallback selectors (comma-separated multi-tier selectors) that ensure 100% data completeness on the new HTML. Return ONLY a JSON object with keys: container, title, summary, link, time, tags.",
        `Domain: ${normalizedDomain}\nDefect Rate: ${stats.totalDefectPercent}%\nPrevious Template Selectors: ${JSON.stringify(currentTemplate.selectors)}\nNew HTML Sample:\n${snippet}`,
      );

      const base = defaultSelectorsForDomain(normalizedDomain);
      const selectors = (llmResult?.selectors || (llmResult?.container && llmResult)) ?? {
        container: `${currentTemplate.selectors.container}, ${base.container}`,
        title: `${currentTemplate.selectors.title}, ${base.title}, .headline, .article-header`,
        summary: `${currentTemplate.selectors.summary}, ${base.summary}, div.desc`,
        link: `${currentTemplate.selectors.link}, ${base.link}`,
        time: `${currentTemplate.selectors.time}, ${base.time}, pubDate`,
        tags: `${currentTemplate.selectors.tags || ""}, ${base.tags}`,
      };

      const id = `tpl-${createHash("sha256").update(`${normalizedDomain}:${nextVersion}`, "utf8").digest("hex").slice(0, 16)}`;

      return {
        id,
        domain: normalizedDomain,
        version: nextVersion,
        selectors: {
          container: selectors.container,
          title: selectors.title,
          summary: selectors.summary,
          link: selectors.link,
          time: selectors.time,
          tags: selectors.tags,
        },
        sampleHtmlSnippet: snippet.slice(0, 500),
        confidence: 0.95,
        defectRate: 0.0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    },
  };
}
