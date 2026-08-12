# ADR-004: Isolate Sentiment Behind an Internal Module Interface

## Status

Accepted — 2026-08-13

## Context

News collection and sentiment inference change for different reasons. A crawler/provider should not depend on BERT, FinBERT, or another concrete model, and a model failure must not stop market charts, strategy configuration, Search Runs, or backtesting. The current MVP does not demonstrate a need to deploy or scale sentiment as a separate network service.

## Decision

- Keep `news-ingestion` and `sentiment` as separate internal modules in the backend Modular Monolith.
- News providers return a normalized `NewsItem`; the collector persists/deduplicates it before requesting sentiment.
- The collector invokes `SentimentAnalysisService` through a typed in-process interface with a timeout. Timeout/exception is caught at the News workflow boundary, reported to logs/metrics, and represented to readers as missing sentiment rather than a fabricated result row.
- Sentiment classifies and returns `SentimentResult`; the News workflow owns persistence of both the normalized News item and returned result. Concrete implementation details remain hidden, while model name/version are returned as provenance.
- Any backtest using an `INFORMATION` strategy must pin a sealed, time-aligned sentiment snapshot with content hash and model name/version/hash. Live aggregates are never used as reproducible historical input.
- A sentiment failure produces degraded/missing sentiment only. It cannot fail Market Data, Search, Backtesting, or the saved News item.
- Do not publish `NewsCollected` or `SentimentAnalyzed` events.
- Extract Sentiment into a separate deployable only if measured inference load, runtime dependencies, or fault-isolation requirements justify it; that change requires a superseding ADR.

## Alternatives Considered

1. **Crawler calls a concrete ML model directly** — rejected because provider and model changes become coupled.
2. **Separate Sentiment microservice now** — deferred because it adds network deployment, timeout/retry, authentication, and observability costs without a current scaling driver.
3. **Event Bus between News and Sentiment** — rejected for the MVP; a direct isolated interface meets the requirement with less operational complexity.

## Consequences

- Positive: model/provider implementations can change independently behind contracts.
- Positive: the current deployment remains simple.
- Positive: failures are explicitly degraded instead of propagated to core trading flows.
- Negative: CPU/memory-heavy inference shares the backend process unless a later extraction is approved.
- Negative: timeout and resource limits must be enforced so inference cannot monopolize the backend.

## Evidence

- Replace the model implementation without changing News Collector or Strategy Engine contracts.
- Force inference timeout/failure and verify the News item remains available while charts and backtesting continue.
- Add a second `NewsProvider` without changing Sentiment.
