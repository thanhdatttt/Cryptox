# Design

## Program boundary

Implementation preserves the accepted Synchronous Modular Monolith. Business
modules collaborate synchronously through public APIs; REST serves commands and
queries; WebSocket remains restricted to normalized realtime Market Data; Search
and manual callers use the mechanism-neutral Backtest Execution Port.

The later instructor change adds an Auth module for email/password and
PostgreSQL-backed opaque sessions. Backend request context resolves trusted
authenticated identity separately from DTOs. StrategyDefinition,
CompositeDefinition, SearchRun, Candidate, and LeaderboardScope are direct
user-owned roots; their approved children inherit ownership. Public-source Market
Data/datasets, News/Sentiment, ranking configurations, and plugin descriptors remain
shared. Pure Strategy execution, simulation, Evaluation, and ranking calculations
remain independent of Auth infrastructure.

## Delivery model

1. Preserve the completed C-01 contract freeze, reconcile the later requirement,
   and complete the additive C-01A Authentication/ownership contract extension.
2. Establish the minimal physical persistence model, including Users, AuthSessions,
   and direct owner-root references.
3. Implement pure/module capabilities in parallel with disjoint write scopes.
4. Integrate Candidate execution, Search, transports, frontend, and providers.
5. Prove every REQUIRED ID through automated acceptance evidence and the demo.

Pure computation is deliberately independent of live adapters: the simulator uses
deterministic candle fixtures and fake strategies; core Candidate/Experiment
orchestration uses controlled definitions and fakes before live integration; Random
Search begins against fake execution and ranking ports.

Fixtures/fakes remain approved for development, deterministic tests, resilience,
and frontend/backend decoupling. Final/demo acceptance separately proves real
Binance historical/realtime adapters, a real configured News source, PostgreSQL
application/Auth state, and real generated Backtest/Leaderboard data. Final/demo
configuration must not silently select mock providers. `lightweight-charts` 4.2.3
or the current compatible locked version remains the frontend candlestick renderer;
it owns no business logic.

## Approved behavior decisions

The versioned decisions are defined in `docs/implementation/MVP_PLAN.md`:

- `LINEAR_REQUIRED_V1` ranking;
- `TECHNICAL_PROFILES_V1`;
- `MAJORITY_VOTE_V1` composite policy;
- CoinDesk Data API as the primary live News adapter;
- deterministic local `LEXICON_V1` Sentiment;
- configurable demo defaults.
- `AUTH_SESSION_V1`: Argon2id credentials plus a PostgreSQL-backed opaque session,
  fixed 24-hour expiry, HttpOnly `SameSite=Lax` cookie, no JWT/refresh token;
- `PER_USER_OWNERSHIP_V1`: direct and inherited ownership defined by ADR-008;
- `REAL_DATA_DELIVERY_V1`: fixtures allowed in tests/dev, real integrations and
  persisted application/Auth state required for final/demo evidence;
- `lightweight-charts` 4.2.3/current compatible lock for candlestick rendering.
- `MARKET_OBSERVABILITY_V1`: Market Data exposes only ephemeral per-pair 100-tick
  observability state, provider/received times, latency, and connection state;
  this never becomes backtest/replay input.
- `LLM_AUTHORING_V1`: a configured provider-neutral adapter returns one structured
  45-second-bounded draft per submission; deterministic validation and explicit
  user Save/Approve precede immutable definition persistence.
- `EXTERNAL_CONTENT_SAFETY_V1`: backend-only allowlisted HTTPS fetches, bounded
  redirects/time/body, no credentials, safe destination revalidation, and
  draft-only extraction-template refinement with human approval and rollback.
- `SYNTHETIC_SHORT_PAPER_V1` and `STOP_LOSS_WINS_V1`: candle-based directional
  paper simulation only; no exchange orders; default 0.08% per-fill fee, adverse
  5-bps per-fill slippage, decimal/fixed-point 8-place accounting, and immutable
  execution provenance.
- `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1`: seeded bounded discovery with
  persisted input/configuration and default 500-candidate-or-five-minute budget.
- `WEIGHTED_VOTE_V1`, `SMC_LITE_V1`, and `WYCKOFF_LITE_V1`: exact deterministic
  behavior profiles; no professional/discretionary-method claim.

These decisions are frozen for MVP V1 and are not to be re-opened by workers.
They define functional behavior only; they do not prescribe screenshot layout,
color, or pixel-perfect frontend reproduction.

## Execution and handoff

`TASKS.md` is the only mutable task board. The Manager owns state transitions,
integration, validation, and checkpoint commits. `HANDOFF.md` is replaced after
each wave and contains only the latest resumable checkpoint.

OpenSpec CLI validation was unavailable at P-00. C-01 restored access through the
project's approved cached runner and strict validation passed. Each checkpoint must
report its actual validation result; unavailable execution is UNVERIFIED, never an
inherited PASS.
