# ADR-004: Isolate sentiment behind an internal module interface

## Status

Accepted — implemented as an internal module, not a microservice.

## Context

News collection and sentiment inference change for different reasons. A provider must not depend on a concrete model, and an inference failure must not prevent market charts, strategy configuration, search, or backtesting. The current project has no measured requirement to operate a separately deployed sentiment service.

## Decision

- Keep `modules/news` and `modules/sentiment` as separate modules within the modular monolith.
- News validates/deduplicates/persists `NewsItem` records before invoking Sentiment through a typed interface.
- Sentiment owns `SentimentResult`, model provenance, and sealed sentiment snapshots.
- A failed or timed-out analysis is visible as missing/degraded sentiment; it does not fabricate a neutral result or discard the news item.
- Extract a network service only when measured model load, runtime dependencies, or fault-isolation needs justify the operational cost.

## Alternatives considered

1. Make each crawler call a concrete model — rejected because provider/model change would be coupled.
2. Deploy a sentiment microservice now — deferred because it adds network, authentication, timeout/retry, and operations cost without a demonstrated driver.
3. Publish news/sentiment through an event bus — rejected because the direct isolated interface meets the present need with less machinery.

## Consequences

- News providers and models can change independently behind contracts.
- Model CPU/memory remains in the backend process until an extraction decision is justified.
- Callers must distinguish valid `NEUTRAL` sentiment from missing/failed analysis.

## Evidence and verification

- [`modules/news`](../../modules/news) owns news collection/persistence contracts.
- [`modules/sentiment`](../../modules/sentiment) owns sentiment analysis and snapshots.
- [`apps/backend/src/compose.ts`](../../apps/backend/src/compose.ts) composes both modules through their public bootstrap APIs.
- Demo: force/observe an analysis failure and verify the news item remains available with an explicit degraded state.
