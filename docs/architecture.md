# Cryptox Architecture

## Purpose and authority

This document is the canonical architecture summary for the Crypto Strategy Lab MVP. It describes approved boundaries and evolution seams, not completed runtime functionality.

When sources disagree, use this order:

1. the protected instructor assignment and explicit later instructor changes;
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

The repository contains TypeScript module, application, package, and infrastructure scaffolding. Public module barrels and several contract types exist, but most exported operations still throw `NOT_IMPLEMENTED`; the approved end-to-end execution path is therefore a target for later source reconciliation, not a claim of working functionality. C-01 correctly froze contracts before the later instructor Authentication/ownership change. A follow-up C-01A contract extension is required before ownership-sensitive implementation begins.

In particular, the approved Backtest Execution Port and bounded local executor from [ADR-006](./adr/ADR_006_local_backtest_execution.md) are not implemented yet. Existing queue-shaped source and historical queue documentation do not make BullMQ, Redis, or a separate worker part of the active MVP architecture.

## Architectural style

Cryptox is a **synchronous modular monolith**. Business capabilities are modules composed in one backend process. Modules collaborate through explicit typed APIs; there is no general Event Bus.

The two external communication styles are deliberately narrow:

- **REST** handles Authentication plus frontend commands and queries, including historical data and progress/result reads.
- **WebSocket** carries normalized realtime market ticks, candles, and connection status only, as decided by [ADR-001](./adr/ADR_001_websocket.md).

The frontend is a presentation client. It renders data and sends commands but does not calculate strategy signals, backtest trades, evaluation metrics, or rankings.

## Module ownership

| Module | Owns | Important boundary |
|---|---|---|
| Auth | User credentials, opaque server-side sessions, credential verification, session expiry/revocation, and authenticated identity resolution | Resolves trusted identity at the server boundary; it does not orchestrate other business capabilities or implement roles/tenancy. |
| Market Data | Exchange normalization, Candle history, realtime ticks/candles, connection status, and historical dataset access | Raw provider payloads do not leave its adapter. |
| Strategy | Pure strategies, registry/descriptors, user-owned immutable Strategy Definitions, user-owned Composite Definitions, and signal combination | Trusted owner identity applies at definition application/repository boundaries; pure strategy analysis remains identity- and I/O-independent. |
| Search | User-owned Search Runs, generators, search space, stop conditions, and bounded orchestration | Submits the trusted SearchRun owner through Backtesting's public execution boundary; does not execute simulations or own Candidate persistence. |
| Backtesting | User-owned Candidate submission/execution, bounded local execution, simulation, execution progress/failure, Trades, and the completed Experiment aggregate | Candidate is the direct ownership root; Experiment and Trades inherit ownership. Callers do not depend on the executor mechanism. |
| Evaluation | Metric calculation and metric edge-case policy | Evaluates backtest results independently of Strategy and Backtester implementation. |
| Leaderboard | Shared score/ranking configuration, user-owned Leaderboard scopes, admission policy, and ranking reads | Ranks only same-owner completed Experiments; Top-K is configuration, not a hard-coded architectural constant. |
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
- The backend Authentication adapter resolves an opaque session once per request and supplies a trusted `AuthenticatedUserId` separately from client DTOs. User-owned application operations accept that identity; client `userId` fields do not establish authority.
- Auth does not become a God service: it validates credentials/sessions but does not read or write Strategy, Search, Backtesting, Evaluation, or Leaderboard persistence.
- Pure Strategy execution, Backtest simulation, Evaluation calculations, ranking calculations, Market Data normalization, and News/Sentiment analysis do not depend on Auth infrastructure.

The executable public surfaces currently live at:

- [`modules/market-data/api/index.ts`](../modules/market-data/api/index.ts)
- [`modules/strategy/api/index.ts`](../modules/strategy/api/index.ts)
- [`modules/search/api/index.ts`](../modules/search/api/index.ts)
- [`modules/backtesting/api/index.ts`](../modules/backtesting/api/index.ts)
- [`modules/evaluation/api/index.ts`](../modules/evaluation/api/index.ts)
- [`modules/leaderboard/api/index.ts`](../modules/leaderboard/api/index.ts)
- [`modules/news/api/index.ts`](../modules/news/api/index.ts)
- [`modules/sentiment/api/index.ts`](../modules/sentiment/api/index.ts)

The approved Auth public surface and ownership extensions do not yet exist. C-01A owns their executable-contract creation; A-00 does not change runtime source.

Current business types are generally defined in each module's `domain/contracts.ts` and re-exported from its public barrel. This document does not invent `api/contracts.ts` files or freeze full TypeScript interfaces.

## Core flows

### Authentication and private-resource access

1. Register/login credentials enter through REST and are verified by the Auth module using Argon2id password hashes.
2. Auth creates a cryptographically random opaque session with a fixed 24-hour expiry, stores only a secure token digest in PostgreSQL, and returns an HttpOnly, `SameSite=Lax`, path-rooted cookie with no Domain attribute.
3. Deployed HTTPS uses `Secure=true` and a host-only cookie name where practical. Localhost HTTP development/demo may disable `Secure`; TLS infrastructure is not required solely for the local MVP demo.
4. A request guard resolves the session to a trusted authenticated user. Private application operations receive that identity separately from DTOs.
5. Missing/invalid authentication returns 401. An authenticated request for another user's private resource uses an owner-scoped lookup and returns 404. Collections apply the owner predicate before pagination or counting.
6. Logout invalidates/revokes the server-side session and clears the cookie. V1 has no JWT, refresh token, roles, RBAC, OAuth/SSO, 2FA, email verification, or password-reset flow.

### Historical and realtime market data

1. A provider adapter converts exchange-specific payloads to normalized Market Data types.
2. Historical/closed candles are made available through REST-backed application reads.
3. The frontend loads history before subscribing to realtime updates.
4. The market WebSocket sends only normalized tick, candle, and connection-status messages. A same-pair/timeframe candle timestamp updates the forming/latest candle; a later timestamp appends a new candle. Duplicate or out-of-order input is normalized and reconciled rather than producing duplicate closed candles.
5. `MARKET_OBSERVABILITY_V1` additionally exposes provider event time, received time, last latency, connection state, and the latest 100 normalized ticks per pair from an in-memory ring buffer. That state is explicitly ephemeral, is lost on restart, and never participates in backtest or replay input.
6. Adding an exchange means adding an adapter behind the Market Data boundary; Strategy and frontend business behavior do not branch on provider identity.

The dashboard may render up to four independently configured pair/timeframe charts; that presentation requirement does not change Market Data ownership or transport boundaries.

Candle history, Market Dataset/provenance, News Items, Sentiment Results, ranking configurations, and strategy plugin descriptors are shared system data. Multiple authenticated users may consume the same normalized public-source records; Authentication does not duplicate them per user.

### Strategy definition and composition

1. A strategy plugin registers a stable type/name, category, parameter description, and creation behavior.
2. A Strategy Definition records a versioned, normalized configuration under one authenticated owner.
3. A Composite Definition has one authenticated owner, references exact same-owner Strategy Definition versions, and records its combination method and configuration.
4. Strategies analyze only their supplied context and return `BUY`, `SELL`, or `HOLD`.
5. Composite logic combines normalized signals without reading plugin internals.
6. `WEIGHTED_VOTE_V1` is a versioned composite configuration. Only enabled components participate; normalized non-negative weights apply to the `+1/0/-1` signal values and the immutable score thresholds decide the resulting signal.
7. `SMC_LITE_V1` and `WYCKOFF_LITE_V1` are deterministic plugins with documented fixed profiles. They are not claims of complete discretionary trading methods.

Prompt/URL authoring is an application workflow, not Strategy domain execution. A configured provider-neutral `LLM_AUTHORING_V1` adapter can produce one time-bounded structured draft, which deterministic validation and explicit user Save/Approve must turn into an immutable definition version. An unconfigured or failed request does not persist a definition. Pure plugins neither call the LLM nor fetch URLs.

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

- Search generates candidates only while an explicit stop condition and executor capacity permit. A Search-created Candidate receives ownership from the trusted SearchRun/user context.
- Search and manual callers know only the execution port.
- The local executor bounds concurrency/resources and produces an observable terminal success or failure.
- The Backtester simulates over historical input; it does not score its own result. `SYNTHETIC_SHORT_PAPER_V1` permits Long and synthetic Short directional positions only; it is not a spot or exchange-order capability.
- The configured execution profile uses fixed-point/decimal accounting. Its default fee/slippage settings apply at both entry and exit; a candle that reaches both SL and TP follows the documented `STOP_LOSS_WINS_V1` path. The profile is immutable Experiment provenance.
- Evaluation computes metrics from results/Trades.
- Leaderboard applies an identified shared score/ranking configuration within a user-owned scope, accepts only same-owner Experiments, and exposes owner-scoped ranked reads.
- A future distributed adapter may replace the local executor behind the port without changing upstream or downstream business contracts.

### News and sentiment

1. News obtains normalized items from configured Website, RSS, and HTML provider adapters. Imported URLs are fetched by backend adapters only under the ADR-009 HTTPS allowlist, destination validation, redirect, timeout, and body-size policy.
2. News persists/deduplicates an item by canonical URL, provider identity when present, and normalized-content hash before invoking Sentiment through a neutral input.
3. An LLM-assisted extraction adapter may yield versioned extraction templates. Self-healing can create only a reviewable `DRAFT` with a diff and metrics; user/administrator approval promotes it and prior versions remain rollback targets.
4. Sentiment persists a successful result with model/version provenance. A future Strategy consumes approved News/Sentiment-derived input only through a public neutral boundary and must identify that input in practical provenance.
5. Timeout or inference failure is logged/observed and represented as missing sentiment; the News item remains readable.
6. News and Sentiment do not import each other's persistence or domain internals.

## Reproducibility

[ADR-007](./adr/ADR_007_practical_reproducibility.md) defines practical provenance. A completed Experiment is traceable to its immutable strategy/composite configuration, authoring origin when applicable, pair/timeframe/range, dataset identity where practical, code version or Git commit where practical, execution profile, Trades and metrics, and relevant score/ranking configuration. A Search Run records its selected profile, normalized configuration, persisted seed, dataset identity, and code version so identical inputs produce the same candidate sequence and ranking.

Traceability is not automatically byte-for-byte replay. The system must state the available guarantee and must not silently substitute current code or data for unavailable historical inputs.

## Failure isolation and observability

- External providers are accessed through adapters so provider changes and malformed payloads remain at an infrastructure boundary.
- Sentiment timeout/failure degrades to missing auxiliary information, not failure of core flows.
- A strategy failure is contained within its backtest execution and becomes an observable failed result.
- Search has an explicit terminal state and stop reason; it never relies on an uncontrolled `while (true)` loop.
- Backtest execution exposes progress or terminal outcome, duration, and a useful failure reason without requiring a distributed recovery protocol.
- Market connection state, last latency, provider event time, received time, and explicitly ephemeral recent ticks are visible to the frontend so a disconnected feed is not mistaken for a static market.
- LLM authoring, external-content fetching, extraction, and template-refinement failures are bounded, observable, and cannot create an approved Strategy Definition or promoted template without the documented validation and human approval.
- Authentication failure, invalid/expired session, protected-route rejection, and ownership denial are observable without logging passwords, raw credentials, cookies, session tokens, or token digests.

## Real-data delivery and chart rendering

- Fixtures/fakes are allowed for unit, contract, deterministic integration/E2E, frontend decoupling, and provider failure/reconnect testing.
- Final runtime/demo evidence uses real Binance historical REST, real Binance realtime WebSocket data, a real configured News source, real PostgreSQL-persisted application/Auth state, and application-generated Backtest/Leaderboard results. Final/demo configuration must not silently select a mock provider.
- Strategy signals, Backtesting, Evaluation, Leaderboard ranking, and local `LEXICON_V1` Sentiment remain local derived computation over approved inputs.
- The frontend retains `lightweight-charts` 4.2.3/current compatible locked version for candlestick rendering. The library consumes normalized frontend state and owns no Market Data, Strategy, Backtest, Evaluation, or ranking business logic. A custom candlestick engine is not planned.

## Evolution seams

The MVP deliberately keeps these substitutions possible:

- a new exchange behind the Market Data adapter;
- a new strategy through the Strategy Registry;
- a new generator behind the Search generator contract;
- a configured LLM authoring adapter behind the Strategy application port;
- a configured Website/RSS/HTML source or extraction adapter behind the News boundary;
- a new sentiment model behind the Sentiment analysis port; and
- a future queue/worker executor behind the Backtest Execution Port.

An evolution is adopted only when requirements or measured constraints justify it and, when architecturally significant, through a new ADR.

## Deferred scope

The following are not active MVP architecture:

- RBAC, organization/team models, tenant/workspace hierarchy, OAuth/SSO, 2FA, email verification, password reset, external identity providers, or enterprise IAM;
- autonomous or unconfigured LLM use, LLM-driven trading/search, arbitrary URL retrieval, or automatic extraction-template promotion;
- leverage, margin, funding, liquidation, trailing stop, position sizing, portfolio/risk optimization, live trading, or exchange-order behavior;
- full discretionary/professional SMC or Wyckoff methodologies and unbounded/Bayesian/reinforcement-learning/agent-based search;
- Redis caching;
- BullMQ, separate backtest workers, distributed leases/fencing/watchdogs/reconciliation, and distributed retry budgets;
- microservices, Kafka, a general Event Bus, CQRS, or Event Sourcing; and
- indefinite executable-artifact retention or mandatory hashes/sealed copies for every intermediate value.

Deferred items require an explicit later decision; their presence in historical docs or source scaffolding is not approval.
