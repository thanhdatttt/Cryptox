import { createHash } from "node:crypto";
import type { NewsItem } from "../domain/contracts";
import type { ExtractionTemplate, TemplateValidationStats } from "../domain/template-contracts";
import { validateNewsItem } from "../domain/rules";

const cleanText = (val: string): string => val
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
  .replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;?/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/\s+/g, " ")
  .trim();

export function extractWithTemplate(
  html: string,
  template: ExtractionTemplate,
  sourceUrl: string,
  sourceName: string,
  targetCoin?: string,
): NewsItem[] {
  const origin = new URL(sourceUrl).origin;
  const now = new Date().toISOString();
  const results: NewsItem[] = [];

  // 1. Identify container blocks based on template container selector
  const containerTag = template.selectors.container || "article";
  const containerRegex = new RegExp(`<(${containerTag.replace(/[^a-z0-9_-]/gi, "|")})\\b[^>]*>[\\s\\S]*?<\\/\\s*\\1\\s*>`, "gi");
  let blocks: string[] = html.match(containerRegex) || [];

  if (blocks.length === 0) {
    // Fallback standard article blocks
    blocks = html.match(/<article\b[^>]*>[\s\S]*?<\/article>/gi) || [];
  }
  if (blocks.length === 0) {
    blocks = (html.match(/<(?:div|section)\b[^>]*(?:card|article|news|post|item)[^>]*>[\s\S]*?<\/(?:div|section)>/gi) || []).slice(0, 20);
  }

  for (const block of blocks.slice(0, 20)) {
    // Title
    const titleMatch = block.match(/<h[1-4]\b[^>]*>([\s\S]*?)<\/h[1-4]>/i)
      ?? block.match(/<(?:span|div|a)\b[^>]*(?:title|headline)[^>]*>([\s\S]*?)<\/(?:span|div|a)>/i);
    // Link
    const linkMatch = block.match(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
    // Summary
    const summaryMatch = block.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)
      ?? block.match(/<(?:span|div)\b[^>]*(?:desc|summary|snippet)[^>]*>([\s\S]*?)<\/(?:span|div)>/i);
    // Date
    const dateMatch = block.match(/<time\b[^>]*\bdatetime=["']([^"']+)["'][^>]*>/i)
      ?? block.match(/<time\b[^>]*>([\s\S]*?)<\/time>/i);

    if (titleMatch && linkMatch) {
      const rawTitle = cleanText(titleMatch[1]);
      const rawContent = summaryMatch ? cleanText(summaryMatch[1]) : rawTitle;
      let rawHref = linkMatch[1].trim();
      if (rawHref.startsWith("/")) rawHref = origin + rawHref;

      let publishedAt = now;
      if (dateMatch) {
        const parsed = Date.parse(dateMatch[1]);
        if (Number.isFinite(parsed)) publishedAt = new Date(parsed).toISOString();
      }

      if (rawTitle.length >= 8 && rawHref.startsWith("http") && !results.some((r) => r.url === rawHref)) {
        const textToScan = `${rawTitle} ${rawContent}`.toUpperCase();
        const coins: string[] = [];
        if (targetCoin && targetCoin !== "ALL" && !coins.includes(targetCoin.toUpperCase())) {
          coins.push(targetCoin.toUpperCase());
        }
        for (const c of ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "DOGE"]) {
          if (textToScan.includes(c) && !coins.includes(c)) coins.push(c);
        }
        if (coins.length === 0) coins.push("BTC");

        const id = createHash("sha256").update(rawHref, "utf8").digest("hex").slice(0, 24);
        try {
          results.push(validateNewsItem({
            id,
            title: rawTitle.slice(0, 500),
            content: rawContent.slice(0, 5000),
            source: sourceName,
            publishedAt,
            crawledAt: now,
            relatedCoins: coins,
            url: rawHref,
          }));
        } catch {
          // ignore invalid item
        }
      }
    }
  }

  return results;
}

export function validateExtractedItems(items: NewsItem[]): TemplateValidationStats {
  if (items.length === 0) {
    return {
      evaluatedCount: 0,
      emptyFieldsPercent: 100.0,
      formatErrorsPercent: 0.0,
      totalDefectPercent: 100.0,
      integrityPercent: 0.0,
      isHighError: true,
      confidence: 0.0,
    };
  }

  const emptyCount = items.filter((i) => !i.content?.trim() || !i.source?.trim() || !i.title?.trim() || i.title.length < 8).length;
  const formatErrorCount = items.filter((i) => {
    try {
      const u = new URL(i.url);
      return !["http:", "https:"].includes(u.protocol);
    } catch {
      return true;
    }
  }).length;

  const emptyFieldsPercent = Number(((emptyCount / items.length) * 100).toFixed(1));
  const formatErrorsPercent = Number(((formatErrorCount / items.length) * 100).toFixed(1));
  const totalDefectPercent = Number(Math.min(100, emptyFieldsPercent + formatErrorsPercent).toFixed(1));
  const integrityPercent = Number((100 - totalDefectPercent).toFixed(1));

  return {
    evaluatedCount: items.length,
    emptyFieldsPercent,
    formatErrorsPercent,
    totalDefectPercent,
    integrityPercent,
    isHighError: totalDefectPercent > 10.0,
    confidence: Number((integrityPercent / 100 * 0.95).toFixed(2)),
  };
}
