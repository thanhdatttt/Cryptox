# ADR-004: Isolate Sentiment Behind an Internal Module Interface

## Status

Accepted — 2026-08-13

- **Last reviewed:** 2026-08-29
- **Partially superseded for MVP by:** [ADR-007](./ADR_007_practical_reproducibility.md)
- **Related decisions:** [ADR-005](./ADR_005_module_first_structure.md), [ADR-006](./ADR_006_local_backtest_execution.md)

### 2026-08-27 scope clarification

News/Sentiment separation, neutral inputs, provider/model replaceability, persistence ownership, and failure isolation remain accepted. ADR-007 replaces mandatory sealed sentiment time-series, content hashes, and exact replay mechanics for the MVP with practical provenance. When sentiment is used, its result retains model/version provenance. Stricter snapshot and alignment guarantees require a later approved INFORMATION-backtest capability.

Boundary clarification: ADR-005 (2026-08-14) amends the project-structure and ownership context referenced here; the internal News/Sentiment isolation decision remains unchanged.

### 2026-08-29 News-to-Strategy boundary clarification

The former mandatory sealed-sentiment snapshot and exact time-alignment rules in
this ADR's historical Decision are superseded for the academic extension by
ADR-007 as amended and `CSL-R-RP-02`. A future strategy may consume an explicit,
versioned News/Sentiment-derived input only through the public neutral module
boundary; it may not import News or Sentiment persistence, consume a mutable live
aggregate as if it were historical data, or bypass the Backtesting provenance
rules. The active scope provides practical provenance, not an unproven exact
news-replay guarantee.

## Context

News collection and sentiment inference change for different reasons. A crawler/provider should not depend on BERT, FinBERT, or another concrete model, and a model failure must not stop market charts, strategy configuration, Search Runs, or backtesting. The current MVP does not demonstrate a need to deploy or scale sentiment as a separate network service.

## Decision

- Keep `modules/news` and `modules/sentiment` as separate internal modules in the backend Modular Monolith.
- News providers return a normalized `NewsItem`; the collector persists/deduplicates it before requesting sentiment.
- The collector invokes `SentimentAnalysisService` through a typed in-process interface with a neutral `SentimentInput` and a timeout. Timeout/exception is caught at the News workflow boundary, reported to logs/metrics, and represented to readers as missing sentiment rather than a fabricated result row.
- News owns persistence of the normalized `NewsItem`. Sentiment owns persistence of `SentimentResult`, model provenance, and sealed sentiment snapshots. The News workflow may invoke Sentiment and compose the response, but it does not write Sentiment's tables directly.
- Any backtest using an `INFORMATION` strategy must pin a sealed, time-aligned sentiment snapshot with content hash and model name/version/hash. Sentiment owns snapshot creation/persistence; live aggregates are never used as reproducible historical input.
- Snapshot points use half-open dataset ranges, window-end timestamps, canonical base-asset symbols, normalized `[-1, 1]` scores, no future lookup, and no carry-forward over missing windows; a Candidate is rejected when a required candle window has no point.
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

- Replace the model implementation without changing News module or Strategy module contracts.
- Force inference timeout/failure and verify the News item remains available while charts and backtesting continue.
- Add a second `NewsProvider` without changing Sentiment.
