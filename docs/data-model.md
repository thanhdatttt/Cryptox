# Cryptox Conceptual Data Model

## Purpose

This document defines accepted business entities, ownership, relationships, and provenance for the MVP. It is intentionally conceptual: it is not SQL DDL and does not claim that the described persistence is implemented. Physical migrations are authoritative once an entity is implemented.

The current repository contains contract and migration scaffolding. Earlier design
schemas containing broader tenant/identity, queue, risk, and strict-replay concepts
were consolidated during Stage 2 and remain recoverable from Git history; they do
not override the simple Authentication and per-user ownership model approved by the
later instructor change on 2026-08-28.

## Ownership and relationships

```text
User
  +----< AuthSession
  +----< StrategyDefinition
  +----< CompositeDefinition ----< CompositeComponent
  +----< SearchRun
  +----< Candidate ----0..1 Experiment ----< Trade
  |                         +---- evaluation results
  |                         +---- market input provenance
  +----< LeaderboardScope ----< LeaderboardEntry

CompositeComponent ----> StrategyDefinition
Candidate ----> StrategyDefinition or CompositeDefinition
SearchRun ----< Candidate (when Search-generated)
LeaderboardEntry ----> Experiment
LeaderboardEntry ----> shared RankingConfiguration
NewsItem ----< SentimentResult
```

| Entity | Owner | Purpose |
|---|---|---|
| User | Auth | Authenticated identity with normalized email and password hash. |
| AuthSession | Auth; belongs to User | Opaque server-side session identity, secure token digest, fixed expiry, and optional revocation. |
| Candle | Market Data | Normalized historical/closed OHLCV and forming realtime candle state. |
| StrategyDefinition | Strategy; direct User ownership | Immutable, versioned strategy type and normalized parameter configuration. |
| CompositeDefinition and CompositeComponent | Strategy; CompositeDefinition is directly user-owned and components inherit | Immutable, versioned combination of same-owner Strategy Definitions. |
| SearchRun | Search; direct User ownership | Generator/search-space choice, bounded stop condition, state, progress, and timing. |
| Candidate | Backtesting; direct User ownership | One manual or Search-generated proposal submitted for execution. |
| Backtest execution outcome | Backtesting | Observable success/failure, timing, and execution relationship for a Candidate. |
| Trade | Backtesting; inherits through Experiment | One simulated entry/exit/result belonging to the successful execution represented by an Experiment. |
| Experiment | Backtesting; inherits from Candidate | Canonical completed-result and provenance aggregate. |
| Evaluation result | Evaluation; inherits from Experiment | Metrics calculated independently from Strategy and Backtester implementation. |
| Score/ranking configuration | Leaderboard; shared system data | Versioned or stably identified policy used to compare Experiments. |
| LeaderboardScope and LeaderboardEntry | Leaderboard; scope is directly user-owned and entries inherit | User-specific ranking view whose entries reference same-owner completed Experiments. |
| NewsItem | News | Normalized persisted provider item. |
| SentimentResult | Sentiment | Optional model output linked to a News Item with model provenance. |

Modules expose these concepts through their public APIs. One module must not read or write another module's persistence directly.

Direct user-owned roots are StrategyDefinition, CompositeDefinition, SearchRun,
Candidate, and LeaderboardScope. CompositeComponent, Experiment, Trade,
EvaluationResult, and LeaderboardEntry inherit ownership through their required
parent relationship and do not duplicate `owner_user_id`. Candle, Market Dataset
and provenance, NewsItem, SentimentResult, RankingConfiguration, and Strategy
plugin descriptors remain shared system data.

## Entity rules

### User and AuthSession

A User stores an application-generated ID, normalized email, Argon2id password
hash, and created/updated timestamps. Normalized email is globally unique. V1 has
no roles, organization/team membership, tenant hierarchy, OAuth/SSO identity,
email-verification state, password-reset records, or billing data.

An AuthSession stores an application-generated ID, User reference, digest of a
cryptographically random opaque token, creation time, fixed expiration time, and
an optional revocation time. Raw tokens are never persisted. Sessions have a
24-hour absolute lifetime with no sliding renewal or refresh token. User/session
persistence belongs to Auth; other modules receive only trusted authenticated
identity from the server application boundary.

### Candle and market input

A Candle carries pair, timeframe, timestamp, open, high, low, close, volume, and closed/forming state. Historical backtests use a declared pair, timeframe, and half-open or otherwise unambiguously documented historical range.

Historical/closed candles are durable business input when persistence is implemented. Realtime ticks and provider connection status are ephemeral delivery/health state and do not require historical persistence.

For Experiment provenance, record a dataset identity/version when practical. If no immutable dataset identifier exists, retain the pair, timeframe, range, source/provider, and other available provenance without claiming exact byte replay.

### StrategyDefinition

A StrategyDefinition contains:

- a unique definition ID;
- a strategy type/name;
- a definition version;
- normalized parameters; and
- creation/provenance metadata useful to identify the definition.

It also has one direct authenticated owner. Logical-family version allocation and
uniqueness are scoped by that owner.

Definitions are immutable. A behavior-bearing parameter or strategy version change creates a new definition/version rather than overwriting history. Application/code version or Git commit may be recorded where practical; exact executable hashes and indefinite artifact retention are not mandatory for the MVP.

### CompositeDefinition

A CompositeDefinition contains a unique ID/version, combination method, and ordered component references. Each component references an exact StrategyDefinition version and records its weight when the selected method uses one. Method-specific thresholds or equivalent configuration are part of the immutable definition.

Changing components, order when meaningful, weights, thresholds, method, or a referenced definition produces a new CompositeDefinition version.

A CompositeDefinition is a direct user-owned root. Every referenced component
StrategyDefinition must have the same owner. CompositeComponent inherits ownership
from the CompositeDefinition.

### SearchRun

A SearchRun records:

- generator choice and search-space configuration;
- at least one explicit bounded stop condition;
- lifecycle state and stop reason;
- created, started, updated, and ended timing as applicable; and
- progress counts or projections needed by the UI.

The MVP generator is Random. Other generator types are evolution seams, not claims of implemented behavior. SearchRun owns orchestration metadata only; Candidate and execution persistence belong to Backtesting.

SearchRun is a direct user-owned root. Its definitions, LeaderboardScope, and
Search-created Candidates must resolve to the same authenticated owner.

### Candidate and execution outcome

A Candidate identifies whether it was submitted manually or by a SearchRun and references the selected immutable Strategy/Composite Definition plus its market-input selection. A Search Candidate also records its SearchRun and iteration/generation context.

The bounded local executor produces one observable terminal success or failure for each accepted execution. The MVP model may retain simple execution timing and failure information but does not require queue job IDs, delivery attempts, leases, fencing generations, watchdog state, or distributed retry bookkeeping.

Candidate is the direct Backtesting ownership root for both manual and
Search-generated submissions. Manual ownership comes from authenticated request
context; Search-generated ownership comes from the trusted SearchRun/user context,
never from a client identity field.

### Trade and evaluation result

A Trade is a simulated result, not an exchange order. It records its Experiment/execution relationship, sequence, pair, entry and exit time/price, quantity or notional information needed by the simulator, realized result, and win/loss/breakeven classification.

Stop-loss, take-profit, generalized position/risk policies, and live-order fields are outside the MVP data model.

Evaluation results record the metrics required by the reviewed requirements and retain their relationship to the Experiment. Evaluation policy/implementation identification is stored when relevant to comparison, but the MVP does not require a separately retained evaluator binary.

### Experiment

Experiment is the canonical successful backtest record. It links or embeds enough information to resolve:

- the StrategyDefinition or CompositeDefinition used;
- normalized strategy/composite parameters and versions;
- pair, timeframe, and historical range;
- dataset identity/version where practical, otherwise explicit data provenance;
- application/code version or Git commit where practical;
- the Trades and evaluation results;
- score/ranking configuration where relevant; and
- creation/completion timing.

This is practical provenance under [ADR-007](./adr/ADR_007_practical_reproducibility.md). A record can be traceable without being byte-for-byte replayable. Missing historical artifacts must not be hidden by substituting current code or data.

Experiment inherits ownership from its required Candidate relationship. Trades and
Evaluation results inherit through Experiment.

### Score, ranking, and LeaderboardEntry

A score/ranking configuration has a stable identity or version and records the formula/configuration needed to explain a ranking. An Experiment stores or references the configuration used for its score.

A LeaderboardEntry references an Experiment rather than duplicating its Strategy, Trades, or metrics. Rankings compare only Experiments that satisfy the same declared comparison scope. Top-K is configurable; `K = 10` may be a product default but is not a data invariant.

SearchRun ranking and a cross-run Leaderboard may be separate read views over Experiments. Their precise lifetime/admission behavior belongs in an approved capability specification, not in physical table assumptions here.

LeaderboardScope is a direct user-owned root. A LeaderboardEntry inherits from its
scope and may reference only an Experiment whose Candidate has the same owner.
Owner filtering occurs before pagination/counting.

### NewsItem and SentimentResult

NewsItem stores normalized title/content, source, publication/collection time, URL or provider identity, and related asset information as available. News persists/deduplicates the item before optional sentiment analysis.

SentimentResult references a NewsItem and records label/score, model name/version, and analysis time. Multiple results may exist when model versions change. Sentiment owns these results; a missing result is a valid degraded state when analysis fails or times out.

Mandatory sealed sentiment datasets, content hashes, and exact time-series replay are deferred until an approved INFORMATION-strategy backtest capability requires them.

## Consistency and retention rules

- Definition history is append-only through new IDs/versions; do not mutate a completed Experiment's referenced definition.
- One business owner validates and persists each entity; cross-module consumers use public APIs.
- Private repository reads and mutations scope by authenticated owner. Missing authentication is a transport/application 401; an authenticated cross-user private-resource lookup is indistinguishable from absence and returns 404.
- Experiment, Trade, metric, and score relationships must remain internally consistent and queryable.
- Numeric metrics and scores must be finite or use an explicitly modeled unavailable state.
- Store only provenance that is meaningful and available. Do not imply stronger replay guarantees than the retained data supports.
- Retention duration is an operational/product policy. The MVP does not require indefinite artifact, binary, snapshot, or intermediate-value retention.

## Deferred data

The active MVP model excludes:

- roles/RBAC, organization/team membership, tenant/workspace hierarchies, external identity-provider records, OAuth/SSO, 2FA, email-verification, password-reset, and enterprise-IAM data;
- queue jobs, queue terminal messages, distributed attempts, leases, fencing tokens, watchdog state, and reconciliation ledgers;
- Redis keys or cache persistence;
- stop-loss/take-profit and generalized portfolio/risk entities;
- LLM prompt/completion records or AI strategy-authoring entities;
- mandatory executable-artifact repositories and hashes for every input/intermediate; and
- CQRS read stores or Event-Sourcing event logs.

Adding any of these requires an approved capability/change and, where it changes architecture, a new or amended ADR.
