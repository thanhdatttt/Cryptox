# Spec: LLM-Interpreted News Crawling

## 1. Overview

This capability changes only the crawler provider path in `modules/news`: fetched HTML is semantically interpreted by an LLM instead of relying solely on site-specific structural selectors. The primary targets are `news-spec.md` and the News provider contracts in `component-contracts.md`. RSS, structured News API, News persistence ordering, and Sentiment boundaries remain unchanged.

## ADDED Requirements

### Requirement: Crawler HTML uses semantic LLM interpretation
The crawler adapter MUST pass bounded fetched HTML, or a cleaned representation preserving meaningful tag/text relationships, to an `HtmlNewsInterpreter` LLM port and MUST obtain schema-constrained News fields. Pure CSS selectors, XPath, or fixed DOM position rules MUST NOT be the sole content-understanding mechanism.

#### Scenario: Layout changes but meaning remains
- **WHEN** an article's DOM structure changes while title, body, publication information, and source remain semantically present
- **THEN** the crawler uses LLM interpretation to produce candidate canonical News fields without requiring Collector changes

### Requirement: Structural processing is limited to safety and normalization
The crawler MAY remove scripts/styles, resolve URLs, enforce size bounds, and retain relevant tag/text relationships before LLM invocation. It MUST treat page instructions as untrusted data, and the LLM interpreter MUST have no tools or authority to fetch resources, call modules, or write data.

#### Scenario: Prompt injection in article HTML
- **WHEN** fetched HTML contains instructions directed at the model
- **THEN** those instructions are treated as article data and cannot trigger tools or bypass the output schema

### Requirement: Interpreted output must normalize and validate
The crawler adapter MUST validate the interpreter's title, content, source, published time, related coins, and canonical URL before returning canonical `NewsItem[]` to the News Collector. Raw HTML and raw model output MUST remain inside crawler infrastructure.

#### Scenario: Valid interpreted article
- **WHEN** the model returns all required fields in the constrained schema and values pass News validation
- **THEN** the adapter returns a canonical `NewsItem` and the existing Collector persists it before invoking Sentiment

#### Scenario: Hallucinated or malformed fields
- **WHEN** required fields are missing, invalid, or inconsistent with the fetched page/source URL
- **THEN** the adapter rejects that candidate and no malformed News item is persisted

### Requirement: Crawler LLM failures remain isolated
Fetch failures, model timeouts, provider errors, and schema failures MUST be observable and MUST NOT corrupt already-persisted News or make RSS/News API collection, Market Data, Strategy, Search, or Backtesting unavailable. The crawler MUST NOT fabricate a News item on failure.

#### Scenario: Interpreter timeout
- **WHEN** the LLM interpreter times out for one fetched page
- **THEN** that page produces no News item, the failure is logged/measured, and other provider paths remain usable

### Requirement: Existing News and Sentiment boundary remains stable
After successful interpretation, the crawler MUST return the existing canonical `NewsItem` contract. The Collector MUST preserve exact-URL deduplication, persist News before Sentiment invocation, and represent Sentiment failure as missing sentiment.

#### Scenario: Successful crawl followed by Sentiment failure
- **WHEN** a crawler-interpreted News item persists successfully and Sentiment then fails
- **THEN** the News item remains readable and sentiment is missing rather than fabricated

## 3. Behavior

```mermaid
sequenceDiagram
    participant C as News Collector
    participant Crawl as Crawler Adapter
    participant Web as Public Website
    participant LLM as HtmlNewsInterpreter
    participant PG as news_items
    participant S as Sentiment API

    C->>Crawl: fetch()
    Crawl->>Web: bounded HTTP(S) fetch
    Web-->>Crawl: HTML
    Crawl->>Crawl: safety cleanup; retain semantic structure
    Crawl->>LLM: bounded HTML + output schema
    LLM-->>Crawl: structured candidate fields
    Crawl->>Crawl: normalize and validate
    Crawl-->>C: canonical NewsItem[]
    C->>PG: insert NewsItem
    PG-->>C: persisted item
    C->>S: analyze(SentimentInput)
```

## 4. Contracts

```typescript
export interface HtmlNewsInterpreter {
  interpret(input: {
    sourceUrl: string;
    html: string;
  }): Promise<InterpretedNewsCandidate[]>;
}

export interface InterpretedNewsCandidate {
  title: string;
  content: string;
  source: string;
  publishedAt: string;
  relatedCoins: string[];
  canonicalUrl: string;
}
```

The crawler adapter maps validated candidates to the existing `NewsItem` shape and remains registered through the existing `NewsProvider` interface. No new News or Sentiment database table is required.

## 5. Constraints

- The LLM requirement applies to crawler HTML, not RSS or structured News API payloads.
- Provider/model SDK types and raw outputs stay in infrastructure.
- No general event, new queue, model tools, or crawler-specific fields cross the News public boundary.
- Fetch/model timeout and input byte limits are configuration values; their existence is normative, exact values are implementation configuration.

## 6. Acceptance Criteria

- [ ] Crawler extraction invokes an LLM semantic interpreter and is not solely selector-based.
- [ ] Valid output is normalized into the unchanged `NewsItem` contract.
- [ ] Malformed/hallucinated output and timeouts persist no News item and are observable.
- [ ] Prompt-like page content cannot invoke tools or bypass schema validation.
- [ ] RSS/API collection and News-before-Sentiment ordering remain unchanged.
