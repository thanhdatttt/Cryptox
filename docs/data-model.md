# Cryptox Conceptual Data Model

## Purpose

This document defines accepted business entities, ownership, relationships, and provenance for the MVP. It is intentionally conceptual: it is not SQL DDL and does not claim that the described persistence is implemented. Physical migrations are authoritative once an entity is implemented.

The current repository contains contract and migration scaffolding. Earlier design
schemas containing broader tenant/identity, queue, risk, and strict-replay concepts
were consolidated during Stage 2 and remain recoverable from Git history; they do
not override the simple Authentication and per-user ownership model approved by the
later instructor change on 2026-08-28.

## DEC-007 reconciliation boundary

Migration `003_add_dec_007_extension_contracts` is the physical representation
gate for the approved extension state. It adds no runtime behavior and no new
ownership root. The mapping is deliberately additive so legacy V1 records remain
valid while future feature packets can persist their approved inputs.

| Approved representation | Physical owner | Boundary rule |
|---|---|---|
| Safe LLM draft/validation/approval state | `strategy_authoring_drafts`, `strategy_definitions.authoring_origin` | Structured draft and validation metadata may be retained; raw prompts, completions, credentials, and arbitrary URLs may not. |
| Immutable weighted composite configuration | `composite_strategy_definitions`, `composite_components` | Component version, enabled state, weight, and weighted thresholds are append-only definition data. |
| Seeded discovery provenance | `search_runs` extension columns | Profile/configuration, seed, dataset identity, and code provenance are stored together; no LLM or unbounded profile is represented. |
| Synthetic paper provenance | `candidates`, `experiments`, `trades` extension columns | Numeric trade/accounting values use `numeric(38,8)`; position mode is Long or synthetic Short only. |
| News extraction/refinement/retention | `extraction_templates`, `news_extraction_provenance`, `news_raw_html_artifacts`, `news_items` extension columns | Templates are versioned DRAFT/APPROVED/RETIRED records; raw HTML purge deadline is exactly seven days, and normalized/extraction retention is representable without credentials. |
| Market observability | no persistence table | It is a 100-tick in-memory/WebSocket projection, excluded from snapshots, history, backtests, and replay. |

`SentimentResult` remains a shared Sentiment-owned record with an optional
News-to-Sentiment join. Missing or degraded analysis is represented as absence or
degradation at the boundary, not as a fabricated neutral score. The schema adds
no `owner_user_id` to inherited children or shared News, Sentiment, dataset,
ranking, or plugin data.

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
NewsItem ----< NewsExtractionProvenance ----> ExtractionTemplate
```

| Entity | Owner | Purpose |
|---|---|---|
| User | Auth | Authenticated identity with normalized email and password hash. |
| AuthSession | Auth; belongs to User | Opaque server-side session identity, secure token digest, fixed expiry, and optional revocation. |
| Candle | Market Data | Normalized historical/closed OHLCV and forming realtime candle state. |
| Market observability state | Market Data; ephemeral | Per-pair connection/latency state and a 100-tick in-memory ring buffer; it is lost on restart and never becomes replay input. |
| StrategyDefinition | Strategy; direct User ownership | Immutable, versioned strategy type, normalized parameter configuration, and safe authoring-origin metadata. |
| CompositeDefinition and CompositeComponent | Strategy; CompositeDefinition is directly user-owned and components inherit | Immutable, versioned combination of same-owner Strategy Definitions, including enabled component state and weighted-vote configuration when selected. |
| SearchRun | Search; direct User ownership | Generator/profile/search-space configuration, seed, bounded stop condition, state, progress, and timing. |
| Candidate | Backtesting; direct User ownership | One manual or Search-generated proposal submitted for execution. |
| Backtest execution outcome | Backtesting | Observable success/failure, timing, and execution relationship for a Candidate. |
| Trade | Backtesting; inherits through Experiment | One simulated entry/exit/result belonging to the successful execution represented by an Experiment. |
| Experiment | Backtesting; inherits from Candidate | Canonical completed-result and provenance aggregate. |
| Evaluation result | Evaluation; inherits from Experiment | Metrics calculated independently from Strategy and Backtester implementation. |
| Score/ranking configuration | Leaderboard; shared system data | Versioned or stably identified policy used to compare Experiments. |
| LeaderboardScope and LeaderboardEntry | Leaderboard; scope is directly user-owned and entries inherit | User-specific ranking view whose entries reference same-owner completed Experiments. |
| NewsItem | News | Normalized persisted provider item. |
| ExtractionTemplate and extraction provenance | News; shared system data | Immutable/versioned template, extraction inputs/results/metrics, and controlled DRAFT-to-approved lifecycle. |
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

Historical/closed candles are durable business input when persistence is implemented. Realtime ticks and provider connection status are ephemeral delivery/health state and do not require historical persistence. `MARKET_OBSERVABILITY_V1` keeps exactly the most recent 100 normalized ticks per pair in memory with provider event time, received time, last latency, and connection state; it is labelled ephemeral, is lost after restart, and is excluded from backtest/replay input.

For Experiment provenance, record a dataset identity/version when practical. If no immutable dataset identifier exists, retain the pair, timeframe, range, source/provider, and other available provenance without claiming exact byte replay.

### StrategyDefinition

A StrategyDefinition contains:

- a unique definition ID;
- a strategy type/name;
- a definition version;
- normalized parameters; and
- creation/provenance metadata useful to identify the definition, including safe origin such as manual, approved LLM draft, or approved URL import.

It also has one direct authenticated owner. Logical-family version allocation and
uniqueness are scoped by that owner.

Definitions are immutable. A behavior-bearing parameter or strategy version change creates a new definition/version rather than overwriting history. An LLM draft is not a StrategyDefinition: deterministic validation and explicit user Save/Approve are required before version allocation. Provider secrets, raw credentials, and unapproved LLM output are never definition metadata. Application/code version or Git commit may be recorded where practical; exact executable hashes and indefinite artifact retention are not mandatory for the MVP.

### CompositeDefinition

A CompositeDefinition contains a unique ID/version, combination method, and ordered component references. Each component references an exact StrategyDefinition version and records enabled state and its weight when the selected method uses one. `WEIGHTED_VOTE_V1` records finite non-negative weights normalized to one and its `+0.30`/`-0.30` thresholds; only enabled components contribute their `+1/0/-1` signal. Method-specific thresholds or equivalent configuration are part of the immutable definition.

Changing components, order when meaningful, weights, thresholds, method, or a referenced definition produces a new CompositeDefinition version.

A CompositeDefinition is a direct user-owned root. Every referenced component
StrategyDefinition must have the same owner. CompositeComponent inherits ownership
from the CompositeDefinition.

### SearchRun

A SearchRun records:

- generator choice and search-space configuration;
- normalized algorithm profile/configuration and persisted seed;
- dataset identity and code version where practical;
- at least one explicit bounded stop condition;
- lifecycle state and stop reason;
- created, started, updated, and ended timing as applicable; and
- progress counts or projections needed by the UI.

The active profiles are `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1`. Domain-guided configuration names valid declared categories and no LLM. Genetic configuration includes its population, generation, elite, and mutation limits. Every profile respects the earlier of the configured candidate or duration bound; the default is 500 candidates or five minutes. SearchRun owns orchestration metadata only; Candidate and execution persistence belong to Backtesting.

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

A Trade is a simulated result, not an exchange order. It records its Experiment/execution relationship, sequence, pair, synthetic Long/Short side, entry and exit time/price, quantity or notional information needed by the simulator, exit reason, realized result, and win/loss/breakeven classification. It has no leverage, margin, funding, liquidation, exchange order, or spot-trading fields.

An Experiment's immutable execution profile may record decimal/fixed-point scale, fee, adverse slippage, synthetic position mode, and configured Stop Loss/Take Profit values. The `STOP_LOSS_WINS_V1` policy is an execution-profile identifier, not a generalized risk-management entity.

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
- execution profile, decimal/rounding settings, fee, slippage, position mode, and SL/TP policy; and
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

NewsItem stores normalized title/content, source, publication/collection time, canonical URL or provider identity, normalized-content hash, and related asset information as available. News persists/deduplicates the item before optional sentiment analysis.

An ExtractionTemplate has a stable version, source applicability, extraction configuration, status (`DRAFT` or approved), and reviewable quality metrics/diff against its predecessor. Extraction provenance links a NewsItem to the source, template version when applicable, collection/extraction timing, and safe result metadata. Backend-only URL acquisition is configuration-driven rather than an unbounded user-owned URL entity; raw HTML is an audit/reprocess artifact retained for seven days, while normalized News, extraction provenance, and template versions retain for 90 days.

SentimentResult references a NewsItem and records label/score, model name/version, and analysis time. Multiple results may exist when model versions change. Sentiment owns these results; a missing result is a valid degraded state when analysis fails or times out.

Mandatory sealed sentiment datasets, content hashes, and exact time-series replay are deferred until an approved INFORMATION-strategy backtest capability requires them.

## Consistency and retention rules

- Definition history is append-only through new IDs/versions; do not mutate a completed Experiment's referenced definition.
- One business owner validates and persists each entity; cross-module consumers use public APIs.
- Private repository reads and mutations scope by authenticated owner. Missing authentication is a transport/application 401; an authenticated cross-user private-resource lookup is indistinguishable from absence and returns 404.
- Experiment, Trade, metric, and score relationships must remain internally consistent and queryable.
- Numeric metrics and scores must be finite or use an explicitly modeled unavailable state.
- Store only provenance that is meaningful and available. Do not imply stronger replay guarantees than the retained data supports.
- Retention duration is an operational/product policy. This MVP retains normalized News, extraction provenance, and template versions for 90 days and raw HTML for seven days; it does not require indefinite artifact, binary, snapshot, or intermediate-value retention.

## Deferred data

The active MVP model excludes:

- roles/RBAC, organization/team membership, tenant/workspace hierarchies, external identity-provider records, OAuth/SSO, 2FA, email-verification, password-reset, and enterprise-IAM data;
- queue jobs, queue terminal messages, distributed attempts, leases, fencing tokens, watchdog state, and reconciliation ledgers;
- Redis keys or cache persistence;
- leverage/margin/funding/liquidation, trailing-stop, position-sizing, portfolio, generalized-risk, live-order, or exchange-account entities;
- raw LLM prompt/completion retention, provider credentials, autonomous authoring persistence, or automatic template-promotion entities;
- mandatory executable-artifact repositories and hashes for every input/intermediate; and
- CQRS read stores or Event-Sourcing event logs.

Adding any of these requires an approved capability/change and, where it changes architecture, a new or amended ADR.
