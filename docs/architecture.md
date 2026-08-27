# Cryptox Architecture

## Purpose and authority

This document is the canonical architecture summary for the Crypto Strategy Lab MVP. It describes approved boundaries and evolution seams, not completed runtime functionality.

When sources disagree, use this order:

1. the protected instructor assignment;
2. reviewed project requirements in [requirements.md](./requirements.md);
3. accepted ADRs, including explicit amendment or supersession;
4. this architecture document;
5. approved capability specifications;
6. an approved active change, when one exists;
7. repository guidance and generated harnesses; and
8. historical design notes.

Earlier design material was consolidated during Stage 2 and remains recoverable
from Git history. It cannot override this document or a later accepted ADR; the
content-coverage record is in [consolidation-record.md](./consolidation-record.md).

## Current implementation status

The repository contains TypeScript module, application, package, and infrastructure scaffolding. Public module barrels and several contract types exist, but most exported operations still throw `NOT_IMPLEMENTED`; the approved end-to-end execution path is therefore a target for later source reconciliation, not a claim of working functionality.

In particular, the approved Backtest Execution Port and bounded local executor from [ADR-006](./adr/ADR_006_local_backtest_execution.md) are not implemented yet. Existing queue-shaped source and historical queue documentation do not make BullMQ, Redis, or a separate worker part of the active MVP architecture.

## Architectural style

Cryptox is a **synchronous modular monolith**. Business capabilities are modules composed in one backend process. Modules collaborate through explicit typed APIs; there is no general Event Bus.

The two external communication styles are deliberately narrow:

- **REST** handles frontend commands and queries, including historical data and progress/result reads.
- **WebSocket** carries normalized realtime market ticks, candles, and connection status only, as decided by [ADR-001](./adr/ADR_001_websocket.md).

The frontend is a presentation client. It renders data and sends commands but does not calculate strategy signals, backtest trades, evaluation metrics, or rankings.

## Module ownership

| Module | Owns | Important boundary |
|---|---|---|
| Market Data | Exchange normalization, Candle history, realtime ticks/candles, connection status, and historical dataset access | Raw provider payloads do not leave its adapter. |
| Strategy | Pure strategies, registry/descriptors, immutable Strategy Definitions, Composite Definitions, and signal combination | No I/O in strategy analysis and no identity-based branching in consumers. |
| Search | Search Runs, generators, search space, stop conditions, and bounded orchestration | Submits through Backtesting's public execution boundary; does not execute simulations or own Candidate persistence. |
| Backtesting | Backtest submission/execution boundary, bounded local execution, simulation, execution progress/failure, Trades, and the completed Experiment aggregate | Owns the Backtest Execution Port; callers do not depend on the executor mechanism. |
| Evaluation | Metric calculation and metric edge-case policy | Evaluates backtest results independently of Strategy and Backtester implementation. |
| Leaderboard | Score/ranking configuration, admission policy, and ranking reads | Ranks completed Experiments; Top-K is configuration, not a hard-coded architectural constant. |
| News | Provider abstraction, normalized News Items, collection, deduplication, and News persistence | Persists collected news before requesting sentiment analysis. |
| Sentiment | Neutral analysis input, Sentiment Results, model/version provenance, and Sentiment persistence | Failure or timeout is contained and cannot stop market, strategy, search, or backtest flows. |

## Dependency direction

Inside a module, dependencies point inward:

```text
api -> application -> domain
infrastructure -> implements application ports
```

- `domain` contains pure business types and policies and does not depend on HTTP, databases, caches, queues, provider SDKs, frameworks, or UI code.
- `application` coordinates use cases and defines ports.
- `infrastructure` implements ports for storage and external providers.
- `api` exposes the module's supported runtime surface. Composition/bootstrap code wires dependencies without exposing infrastructure to consumers.
- A module or application imports another module through that module's public `api/index.ts`, never through its `domain` or `infrastructure` internals.

The executable public surfaces currently live at:

- [`modules/market-data/api/index.ts`](../modules/market-data/api/index.ts)
- [`modules/strategy/api/index.ts`](../modules/strategy/api/index.ts)
- [`modules/search/api/index.ts`](../modules/search/api/index.ts)
- [`modules/backtesting/api/index.ts`](../modules/backtesting/api/index.ts)
- [`modules/evaluation/api/index.ts`](../modules/evaluation/api/index.ts)
- [`modules/leaderboard/api/index.ts`](../modules/leaderboard/api/index.ts)
- [`modules/news/api/index.ts`](../modules/news/api/index.ts)
- [`modules/sentiment/api/index.ts`](../modules/sentiment/api/index.ts)

Current business types are generally defined in each module's `domain/contracts.ts` and re-exported from its public barrel. This document does not invent `api/contracts.ts` files or freeze full TypeScript interfaces.

## Core flows

### Historical and realtime market data

1. A provider adapter converts exchange-specific payloads to normalized Market Data types.
2. Historical/closed candles are made available through REST-backed application reads.
3. The frontend loads history before subscribing to realtime updates.
4. The market WebSocket sends only normalized tick, candle, and connection-status messages.
5. Adding an exchange means adding an adapter behind the Market Data boundary; Strategy and frontend business behavior do not branch on provider identity.

The dashboard may render up to four independently configured pair/timeframe charts; that presentation requirement does not change Market Data ownership or transport boundaries.

### Strategy definition and composition

1. A strategy plugin registers a stable type/name, category, parameter description, and creation behavior.
2. A Strategy Definition records a versioned, normalized configuration.
3. A Composite Definition references exact Strategy Definition versions and records its combination method and configuration.
4. Strategies analyze only their supplied context and return `BUY`, `SELL`, or `HOLD`.
5. Composite logic combines normalized signals without reading plugin internals.

Adding a new indicator strategy is a registry extension. It must not require changes to Backtesting, Evaluation, Leaderboard, or frontend core logic.

### Bounded search and local backtesting

The approved MVP path is:

```text
Search or manual submission
  -> Backtest Execution Port
  -> Bounded Local Executor
  -> Backtester
  -> Evaluator
  -> Leaderboard
```

- Search generates candidates only while an explicit stop condition and executor capacity permit.
- Search and manual callers know only the execution port.
- The local executor bounds concurrency/resources and produces an observable terminal success or failure.
- The Backtester simulates over historical input; it does not score its own result.
- Evaluation computes metrics from results/Trades.
- Leaderboard applies an identified score/ranking configuration and exposes ranked Experiment reads.
- A future distributed adapter may replace the local executor behind the port without changing upstream or downstream business contracts.

### News and sentiment

1. News obtains normalized items from provider adapters.
2. News persists/deduplicates an item before invoking Sentiment through a neutral input.
3. Sentiment persists a successful result with model/version provenance.
4. Timeout or inference failure is logged/observed and represented as missing sentiment; the News item remains readable.
5. News and Sentiment do not import each other's persistence or domain internals.

## Reproducibility

[ADR-007](./adr/ADR_007_practical_reproducibility.md) defines practical provenance. A completed Experiment is traceable to its immutable strategy/composite configuration, pair/timeframe/range, dataset identity where practical, code version or Git commit where practical, Trades and metrics, and relevant score/ranking configuration.

Traceability is not automatically byte-for-byte replay. The system must state the available guarantee and must not silently substitute current code or data for unavailable historical inputs.

## Failure isolation and observability

- External providers are accessed through adapters so provider changes and malformed payloads remain at an infrastructure boundary.
- Sentiment timeout/failure degrades to missing auxiliary information, not failure of core flows.
- A strategy failure is contained within its backtest execution and becomes an observable failed result.
- Search has an explicit terminal state and stop reason; it never relies on an uncontrolled `while (true)` loop.
- Backtest execution exposes progress or terminal outcome, duration, and a useful failure reason without requiring a distributed recovery protocol.
- Market connection state is visible to the frontend so a disconnected feed is not mistaken for a static market.

## Evolution seams

The MVP deliberately keeps these substitutions possible:

- a new exchange behind the Market Data adapter;
- a new strategy through the Strategy Registry;
- a new generator behind the Search generator contract;
- a new sentiment model behind the Sentiment analysis port; and
- a future queue/worker executor behind the Backtest Execution Port.

An evolution is adopted only when requirements or measured constraints justify it and, when architecturally significant, through a new ADR.

## Deferred scope

The following are not active MVP architecture:

- authentication, users, ownership, or multi-tenancy;
- AI/LLM strategy authoring or LLM-specific crawling;
- stop-loss, take-profit, portfolio, or generalized risk systems;
- Redis caching;
- BullMQ, separate backtest workers, distributed leases/fencing/watchdogs/reconciliation, and distributed retry budgets;
- microservices, Kafka, a general Event Bus, CQRS, or Event Sourcing; and
- indefinite executable-artifact retention or mandatory hashes/sealed copies for every intermediate value.

Deferred items require an explicit later decision; their presence in historical docs or source scaffolding is not approval.
