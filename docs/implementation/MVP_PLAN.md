# Crypto Strategy Lab MVP Implementation Program

## Purpose and authority

This is the durable implementation program for the instructor-required Crypto
Strategy Lab MVP. It is an execution aid, not product authority. Before acting,
follow the reading order in [`AGENTS.md`](../../AGENTS.md). Canonical scope and
architecture remain in:

- [`docs/requirements.md`](../requirements.md)
- [`docs/architecture.md`](../architecture.md)
- [`docs/data-model.md`](../data-model.md)
- accepted [`docs/adr/`](../adr/)
- active [`openspec/specs/`](../../openspec/specs/)
- approved [`mvp-implementation` change](../../openspec/changes/mvp-implementation/)

The objective is the smallest dependency-aware program that implements every
REQUIRED requirement while preserving the Synchronous Modular Monolith, public
module APIs, provider ports, market-only WebSocket, bounded local Backtest
execution, practical provenance, and honest failure/observability behavior.
P-00 and C-01 remain completed history. The instructor-approved 2026-08-28
Authentication, per-user ownership, and real-data delta is reconciled by A-00 and
an additive C-01A gate rather than by reopening C-01.

The new canonical requirement IDs are `CSL-R-AU-01` (simple Authentication),
`CSL-R-OW-01` (per-user ownership), and `CSL-R-RD-01` (real-data delivery).
Task packets use the repository's established shortened requirement notation in
their `Requirements/state/owner` field; task names remain the heading identifiers.

## Approved MVP V1 decisions

These decisions are human-approved. Workers must not reopen them.

### `LINEAR_REQUIRED_V1`

```text
score = 0.50 * ReturnPercent
      + 0.30 * WinRatePercent
      - 0.20 * MaxDrawdownMagnitudePercent
```

Eligibility requires a successfully completed Experiment, finite required
metrics, and `NumberOfTrades > 0`. Tie order is score descending, Return
descending, drawdown magnitude ascending, Win Rate descending, then Experiment
ID ascending. Formula, weights, eligibility, and ties are versioned. K is
configurable; 10 is only the demo/default.

### `TECHNICAL_PROFILES_V1`

- **MA:** close-price SMA crossover; fast 20, slow 50; cross up BUY, cross down
  SELL, equality/insufficient history HOLD.
- **RSI:** Wilder RSI; period 14; below 30 BUY, above 70 SELL; flat series 50,
  no losses 100, no gains 0; insufficient history HOLD.
- **Bollinger:** close-price mean reversion; SMA20, population deviation,
  multiplier 2; below lower BUY, above upper SELL, equality/insufficient HOLD.
- **Support/Resistance:** previous rolling 20-candle low/high, current candle
  excluded, 0.5% proximity, bounce-oriented; overlap, tie, breakout, or
  insufficient history HOLD.
- **Global:** closed ordered finite candles; invalid parameters fail before
  execution; no lookahead; a signal at candle t executes no earlier than t+1
  open; indicator values use generic descriptor-driven visualization metadata.

These are versioned project choices, not claims that the assignment mandated
their exact formulas or defaults.

### `MAJORITY_VOTE_V1`

Composite definitions contain at least two distinct immutable Strategy
Definitions. Components have equal weight; BUY, SELL, and HOLD are counted; a
unique highest count wins and any tie returns HOLD. Component identity is
deterministic. Component or method changes create a new version. Weighted
combination is not MVP V1 scope.

### Provider and demo choices

- Primary live News adapter: CoinDesk Data API. Deterministic development and
  acceptance tests use fixtures; missing credentials block only live smoke/demo.
- Sentiment: deterministic local rule/lexicon provider `LEXICON_V1`; no hosted
  API, account, model download, ONNX, Transformers, or LLM. Persist provider and
  version provenance. The internal lexicon/library may be selected in N-02 if it
  preserves contracts and adds no unnecessary infrastructure.
- Configurable demo defaults: BTCUSDT; 5m/15m/1h/4h; 30 days; 10,000 USDT;
  0.1% fee; zero slippage; one full-capital long position; K=10.

### `AUTH_SESSION_V1`

- Email/password registration, login, current-user lookup, expiry, and logout only.
- Argon2id password hashes; PostgreSQL-backed opaque server-side sessions; store
  only a secure digest of a cryptographically random token.
- Fixed 24-hour absolute expiry; no sliding renewal, JWT, or refresh token.
- HttpOnly, `SameSite=Lax`, `Path=/`, no Domain cookie. HTTPS/deployed operation
  uses `Secure=true` and host-only naming where practical; localhost HTTP may
  disable `Secure` without requiring new TLS infrastructure.
- Login throttling is recommended hardening, not an instructor acceptance blocker.

### `PER_USER_OWNERSHIP_V1`

- Direct user-owned roots: StrategyDefinition, CompositeDefinition, SearchRun,
  Candidate, and LeaderboardScope.
- Inherited ownership: CompositeComponent from CompositeDefinition; Experiment
  from Candidate; Trade and EvaluationResult from Experiment; LeaderboardEntry
  from LeaderboardScope.
- Shared system data: Candle, Market Dataset/provenance, NewsItem,
  SentimentResult, RankingConfiguration, and Strategy plugin descriptors.
- Trusted authenticated identity is supplied separately from DTOs. Private
  repositories scope by owner; unauthenticated private access is 401 and an
  authenticated cross-user resource lookup is 404. Collections filter by owner
  before pagination/counting.
- Pure Strategy execution, Backtest simulation, Evaluation, and ranking
  calculations remain independent of Auth infrastructure.

### `REAL_DATA_DELIVERY_V1` and chart renderer

- Fixtures/fakes remain allowed for development, deterministic tests, resilience,
  and frontend/backend decoupling.
- Final/demo evidence requires real Binance historical REST and realtime
  WebSocket, a real configured News source, PostgreSQL-persisted application/Auth
  state, and application-generated Backtest/Leaderboard results. Final/demo
  configuration must not silently select mock providers.
- Strategy, Backtesting, Evaluation, Leaderboard, and `LEXICON_V1` Sentiment remain
  local computation over approved inputs.
- Retain `lightweight-charts` 4.2.3/current compatible locked version. Do not build
  a custom candlestick engine or place business logic in the chart library.

## Dependency DAG and critical path

Pure computation must not wait for live providers or real built-ins.

```text
P-00 DONE -> C-01 DONE -> A-00 DONE -> C-01A READY
                                      |
              +-----------------------+------------------------+
              |                       |                        |
              v                       v                        v
        D-01 Persistence         S-01 Strategy core        AU-01 Auth core
         |      |                  |       |                   |
         |      +-> L-01 ----------+       +-> B-01 -----------+-> B-02
         |                         |                               |
         |                         +-> Q-01 pure ------------------+-> Q-01 integration
         +-> M-01/M-02             +-> S-02/S-03                  |
         +-> N-01/N-02                                             +-> AU-02
         |                                                             |
         +-------------------------------> I-01 <-----------------------+

E-01 READY --------------------------------> B-02
F-01 READY -> F-AUTH --(AU-01 integrate)--> F-02 ---------------------> I-01 -> I-02
```

The revised critical join is:

```text
A-00 -> C-01A
  -> { S-01 -> B-01 | D-01 -> L-01 } -> B-02 -> Q-01 integration
  -> { AU-01 | Q-01 integration } -> AU-02
  -> { AU-02 | F-01 -> F-AUTH -> F-02 | real-provider lanes } -> I-01 -> I-02
```

E-01 and F-01 remain independently READY after A-00 but are not started by A-00.
M-01/M-02, real built-ins, News/Sentiment, Search integration, Auth/frontend, and
real-provider evidence complete before I-01/I-02, not before unrelated pure work.

## Execution waves

| Wave | Gate | Parallel frontier | Exit checkpoint |
|---|---|---|---|
| 0 | P-00 | None | Durable program and approved change committed |
| 1 | C-01 only | No shared-contract fan-out | Executable/transport contracts frozen |
| A | A-00 only | No implementation | Later instructor delta is canonical and resumable |
| 1A | C-01A contract writer | E-01 and F-01 may run only as separately claimed disjoint packets; max three workers | Auth/ownership contracts frozen |
| 2 | C-01A complete | D-01 sole migration writer, S-01, AU-01 fake-repository phase; E-01/F-01 if unfinished | Schema and owned/Auth seams stable |
| 3 | Manager freezes S-01 and D-01 seams | B-01, S-02, S-03, M-01/M-02, N-01/N-02, L-01, AU-01 DB integration; max three workers | Pure capabilities and repositories pass |
| 4 | F-01 checkpoint and C-01A | F-AUTH then F-02; Q-01 pure lifecycle | Authenticated fixture workflows and bounded Search pass |
| 5 | B-02 then Q-01 real integration | AU-02 only after affected owners checkpoint | Persisted owner-scoped Search/Experiment/Leaderboard passes |
| 6 | I-01 | Independent architecture/security/coverage review | Runnable integrated backend/frontend with real-provider preflight |
| 7 | I-02 | Independent test/reviewer agents | Full MVP DoD, two-user isolation, and real demo evidence |

## Task state and checkpoint protocol

`TASKS.md` is the only mutable status board. Valid states are BLOCKED, READY,
IN_PROGRESS, REVIEW, and DONE. Only the Manager changes state. A worker supplies
diff/commit, validation output, failures, risks, and handoff; the Manager validates
before marking DONE.

After every wave, the Manager:

1. updates `TASKS.md` states, owners, commits, and validation;
2. replaces `HANDOFF.md` with the latest checkpoint;
3. records blockers, decisions, branches/worktrees, failures, and next actions;
4. commits the coherent checkpoint.

## Common task-packet rules

Every worker reads, in order: `AGENTS.md`; cited assignment sections;
`docs/requirements.md`; applicable accepted ADRs; architecture; data model when
persistence is involved; relevant capability specs; the active MVP change; this
plan; `TASKS.md`; and the latest `HANDOFF.md`.

Every code task runs its workspace build, typecheck, focused tests, and relevant
integration tests, plus root architecture, artifact, and deferred-scope checks.
Unavailable checks are BLOCKED or UNVERIFIED, never PASS.

Globally forbidden: RBAC, organizations/teams, tenant hierarchy, OAuth/SSO, 2FA,
external identity providers, password-reset infrastructure, enterprise IAM;
Long/Short and generalized risk; advanced or AI search; AI strategy authoring;
mandatory LLM crawling; Redis/BullMQ/workers;
distributed leases/fencing/watchdogs; microservices/event bus; CQRS/Event Sourcing;
strict artifact repositories; unrelated cleanup.

## Complete task packets

### P-00 — Durable Program Bootstrap

- **Requirements/state/owner:** CSL-R-DL-01, CSL-R-AR-01; DONE; Manager.
- **Objective/rationale:** Persist approved decisions, execution packets, mutable
  board, checkpoint, and OpenSpec governance so no conversation context is needed.
- **Start/integration dependencies:** Human Stage 5 review / none.
- **Unblocks:** C-01.
- **Required reading:** Entire authority chain and completed Stage 4A change.
- **Inputs/outputs:** Reviewed Stage 5 plan and amendments -> three implementation
  artifacts, archived Stage 4A, active `mvp-implementation` change, one commit.
- **Affected/allowed paths:** `docs/implementation/**`, `openspec/changes/**`.
- **Forbidden paths:** Application/module/package source, migrations, runtime infra.
- **Architecture constraints:** Link canonical sources; do not duplicate authority.
- **Acceptance/tests:** Fresh-agent questions all answerable; P-00 DONE; C-01 READY;
  no feature task DONE; `git diff --check`; documentation/link and scope audit.
- **Validation outcome:** Documentation/repository checks PASS; OpenSpec CLI
  validation UNVERIFIED because CLI is unavailable.
- **Risks/unresolved/blockers:** None after human decisions were supplied.
- **Definition of Done:** Durable checkpoint commit exists and C-01 is the sole
  READY task. **Parallel:** NO. **Critical:** YES.
- **Fresh-agent handoff:** Read `HANDOFF.md`, confirm checkpoint commit, start C-01
  only; do not begin implementation fan-out.

### C-01 — Executable Contract and Behavior Freeze

- **Requirements/state/owner:** MD-01/02, ST-01–04, SE-01/02, BT-01, EV-01,
  LB-01, VIS-01, NW-01, SN-01, RP-01, OB-01; DONE; Manager.
- **Objective/rationale:** Stabilize public module APIs, application ports, REST
  DTOs, overlay projections, metric/ranking configuration, and contract fixtures
  before parallel implementation.
- **Start/integration dependencies:** P-00 / none. **Unblocks:** A-00 after the later
  instructor change; its original contract freeze remains authoritative where C-01A
  does not extend it.
- **Reading:** Assignment §§4–30, 35–37, 40–45; ADR-001/002/004/006/007; all specs.
- **Inputs/outputs:** Stage 4A contracts plus approved V1 decisions -> frozen,
  self-contained executable/transport contracts and tests.
- **Allowed paths:** Module API contracts/ports, `packages/contracts/rest/**`, market
  WS mappings when necessary, contract tests.
- **Forbidden paths:** Implementations, providers, migrations, apps, frontend UI.
- **Constraints:** Four required Evaluation metrics only; market-only WS; stable
  generator/execution/provider seams; no provider/domain leakage; LEXICON_V1.
- **Acceptance/tests:** Serialization/validation fixtures, public-entrypoint guards,
  generic overlays, configurable K/ranking version, Random-only generator, MACD
  locality fixture, no shared contract ambiguity.
- **Validation:** Root build/typecheck/tests; arch/artifact/scope; `git diff --check`.
- **Risks/blockers:** Any new business choice stops and returns to human review.
- **DoD:** Contract-freeze commit `d7136318ecc5ca98670db4c260974a64d0fcbbfe`
  recorded in TASKS/HANDOFF. **Parallel:** NO. **Critical:** YES. **Handoff:** C-01
  was correct against the prior baseline; use C-01A only for the later delta.

### A-00 — Persist Instructor Auth / Ownership / Real-Data Requirement Change

- **Requirements/state/owner:** AU-01, OW-01, RD-01 and affected existing IDs; DONE;
  Manager.
- **Objective:** Persist the approved later instructor delta in canonical
  requirements, ADR, architecture/data model, capability specs, active change, and
  durable program without changing executable contracts or starting implementation.
- **Start/integration dependencies:** Human Stage 5.2 review after C-01 / none.
  **Unblocks:** C-01A; E-01 and F-01 remain independently READY.
- **Reading:** Entire authority chain, C-01 commit/checkpoint, approved Stage 5.2
  audit and amendments, all affected specs/change/program artifacts.
- **Inputs/outputs:** Human-approved requirement change -> AU/OW/RD IDs, ADR-008,
  Auth/ownership/real-data specs, revised packets/DAG/checkpoint, one local commit.
- **Allowed paths:** `AGENTS.md`; canonical/reconciliation/ADR/implementation
  Markdown under `docs/**`; active `openspec/specs/**` and
  `openspec/changes/mvp-implementation/**`; and authority context in
  `openspec/config.yaml` only.
- **Forbidden:** Executable module/package/frontend source, migrations,
  infrastructure/tooling, task implementation, branches/worktrees.
- **Acceptance/tests:** C-01 remains DONE; ownership/shared-data/Auth/real-data/chart
  decisions are consistent; C-01A exists; D-01/S-01 are blocked; E-01/F-01 remain
  READY; fresh-agent questions require no conversation context.
- **Validation:** Authority/traceability/link/scope inspection, OpenSpec strict
  validation, changed-path audit, `git diff --check`.
- **DoD:** One coherent documentation/governance checkpoint. **Parallel:** NO.
  **Critical:** YES. **Handoff:** execute C-01A next; do not infer implementation
  authorization from A-00.

### C-01A — Authentication & Ownership Contract Extension

- **Requirements/state/owner:** AU-01, OW-01, ST-04, SE-01/02, BT-01, LB-01,
  RP-01, OB-01; READY; unassigned contract specialist/Manager.
- **Objective:** Add only Auth, trusted identity, owner-root, owner-scoped
  repository/list, same-owner invariant, and 401/404 contracts required by the
  later instructor change while preserving unrelated C-01 decisions.
- **Start/integration dependencies:** A-00 / none. **Unblocks:** D-01, S-01, L-01,
  Q-01 ownership work, B-02 ownership work, AU-01, and F-AUTH.
- **Reading:** A-00 checkpoint; ADR-008; Auth and affected capability specs; C-01
  source/contracts/tests; current plan/board/handoff.
- **Inputs/outputs:** C-01 freeze plus approved ownership model -> additive module
  API/application-port/REST DTO contracts and contract fixtures.
- **Allowed:** `modules/auth/{api,application}/**` contract/port files;
  `modules/{strategy,search,backtesting,leaderboard}/{api,application}/**` contract
  and port files only; Auth/private DTOs under `packages/contracts/rest/**`;
  contract fixtures/tests; and scope/architecture gate updates only where C-01A
  executable-contract acceptance requires them.
- **Forbidden:** Auth/runtime implementation, repositories/providers, migrations,
  controllers, frontend UI, pure Strategy/simulator/Evaluation/ranking algorithms.
- **Acceptance/tests:** No authoritative client identity field; direct/inherited
  roots match ADR-008; owner-scoped port shapes; 401/404 semantics; additive REST
  compatibility; market WS payloads and pure contracts unchanged.
- **Validation:** Contract serialization/validation, public-entrypoint guards, root
  build/typecheck/tests, architecture/artifact/scope, OpenSpec, `git diff --check`.
- **DoD:** C-01A checkpoint recorded before any ownership-sensitive task starts.
  **Parallel:** one contract writer; E-01/F-01 only through separately claimed
  disjoint packets. **Critical:** YES. **Handoff:** enumerate every new/unchanged
  canonical contract, test evidence, and D-01/S-01/AU-01 implementation inputs.

### D-01 — Minimal MVP Persistence Foundation

- **Requirements/state/owner:** AU-01, OW-01, MD-01, ST-04, SE-02, BT-01, EV-01,
  LB-01, NW-01, SN-01, RP-01, OB-01; BLOCKED; persistence specialist.
- **Objective:** Add approved physical entities, Users/AuthSessions, direct
  owner-root references, and repository conventions without duplicating ownership
  onto inherited/shared data.
- **Start/integration dependencies:** C-01A / none. **Unblocks:** AU-01 DB
  integration, persistence-backed work, L-01, and B-02.
- **Reading:** Assignment §§35–36; ADR-005/007/008; data model; Auth and owner specs.
- **Inputs/outputs:** Frozen contracts -> reversible migrations, repository test
  harness, DB scripts, application-generated UUIDv4 convention.
- **Allowed paths:** `infra/db/**`, module PostgreSQL adapters/tests assigned by packet.
- **Forbidden:** Auth application behavior, owner columns on inherited/shared data,
  queue/attempt/lease, risk, LLM, artifact tables; business behavior.
- **Constraints:** One migration owner; no concurrent numbering; no pgcrypto dependency.
- **Acceptance/tests:** Fresh migrate/rollback/remigrate; unique normalized email;
  secure session-digest/expiry constraints; direct owner FKs/indexes; owner-scoped
  definition uniqueness; inherited/shared ownership absence; existing FK,
  idempotency, immutability, and deferred-column tests.
- **Validation:** DB scripts/integration plus global gates.
- **Risks/blockers:** PostgreSQL/Docker availability; existing external migration use.
- **DoD:** Schema supports approved entities and checkpoint records migration commit.
  **Parallel:** YES with non-DB modules, one DB writer. **Critical:** gates B-02.

### AU-01 — Simple Authentication and Session Runtime

- **Requirements/state/owner:** AU-01, OW-01, RD-01, OB-01; BLOCKED; Auth worker.
- **Objective:** Implement Argon2id User credentials, opaque PostgreSQL sessions,
  register/login/current-user/logout, expiry/revocation, request identity, and
  sanitized observability.
- **Start/integration dependencies:** C-01A / D-01. **Unblocks:** F-AUTH real
  integration, AU-02, and I-01.
- **Reading:** Auth requirement/spec, ADR-008, C-01A, D-01 schema checkpoint,
  backend composition and security rules.
- **Inputs/outputs:** Frozen Auth contracts plus User/session schema -> Auth module,
  repositories, thin backend Auth transport/guard, and tests.
- **Allowed:** `modules/auth/**`, Auth-specific backend transport/composition, Auth
  tests; repository adapter work only after D-01 checkpoint.
- **Forbidden:** Other business-module implementations, migrations, JWT/refresh,
  roles/RBAC, tenants, OAuth/SSO, 2FA, email verification/reset, external IAM.
- **Acceptance/tests:** Register, duplicate normalized email, valid/invalid login,
  current user, fixed expiry, logout revocation, cookie policy, localhost Secure
  exception, no credential/session-secret logging. Throttling is optional hardening.
- **Validation:** Auth unit/contract/DB/E2E/resilience/OBS tests plus global gates.
- **DoD:** Real PostgreSQL-backed Auth works without external identity/Redis.
  **Parallel:** YES before DB integration with fake repositories; no migration edits.
  **Critical:** YES through AU-02/I-01. **Handoff:** record cookie/session settings,
  schema dependency, protected-route integration seams, and security evidence.

### M-01 — Binance Historical Market Data

- **Requirements/state/owner:** MD-01, RD-01, RP-01, AR-02; BLOCKED; Market Data worker.
- **Objective:** Validate, paginate, normalize, persist, and identify historical candles.
- **Start/integration dependencies:** C-01, D-01 / live smoke before I-01.
- **Unblocks:** M-02 and real-data integration.
- **Reading:** Assignment §§4–5, 32.3–32.4, 35–37, 40.3/40.7; ADR-001/007; MD spec.
- **Inputs/outputs:** Binance fixtures/provider port -> complete canonical history and
  practical dataset provenance.
- **Allowed:** `modules/market-data/**` except frozen contracts; its repository/tests.
- **Forbidden:** Frontend, apps, migrations, raw Binance shapes outside adapter.
- **Constraints:** Closed ordered finite candles; explicit half-open ranges; bounded reads.
- **Acceptance/tests:** Pagination, gaps, duplicate/out-of-order, malformed payload,
  completeness-required, provider substitution, provenance.
- **Validation:** Module/DB/contract tests; real Binance historical smoke is required
  final/demo evidence and unavailable access is BLOCKED/UNVERIFIED.
- **Risks/blockers:** Network/region affects live smoke only.
- **DoD:** Historical facade works with fixtures and live status is honestly reported.
  **Parallel:** YES. **Critical:** integration, not pure computation.

### M-02 — Realtime Market Delivery and Gap Recovery

- **Requirements/state/owner:** MD-02, RD-01, FE-01, OB-01, AR-02, DM-01; BLOCKED; Market Data worker.
- **Objective:** Normalized kline streaming, connection state, bounded reconnect,
  missing-candle reconciliation and deduplicated continuation.
- **Start/integration dependencies:** M-01 / F-01 and I-01.
- **Unblocks:** Live charts and I-01.
- **Reading:** Assignment §§4–5, 32.3–32.4, 40.7; ADR-001; MD/frontend specs.
- **Allowed:** Market Data application/infrastructure and market WS tests.
- **Forbidden:** General event bus, non-market WS, frontend state.
- **Acceptance/tests:** Forced disconnect, backoff, resubscribe, REST gap fill before
  continuation, duplicate suppression, shutdown, connection observability.
- **Validation:** Fixture resilience plus required final/demo real Binance stream
  smoke and global gates; unavailable provider evidence is not PASS.
- **Risks:** Provider lifecycle/limits. **DoD:** recovery transcript/tests recorded.
  **Parallel:** YES. **Critical:** final integration/demo.

### S-01 — Strategy Registry, Definitions and Composite Core

- **Requirements/state/owner:** OW-01, ST-01, ST-03/04, AR-02/03, RP-01; BLOCKED; Strategy core worker.
- **Objective:** Implement registry, descriptors, immutable definitions, generic
  analysis/overlay output and MAJORITY_VOTE_V1 using fake plugins.
- **Start/integration dependencies:** C-01A / D-01 for persistence completion.
- **Unblocks:** B-01, S-02, S-03, Q-01.
- **Reading:** Assignment §§6, 11–16, 35–36, 40–41; ADR-002/007/008; Strategy spec.
- **Allowed:** Strategy core/application/infrastructure/tests excluding built-in dirs.
- **Forbidden:** Apps, exchange/database calls in strategy runtime, identity branching.
- **Acceptance/tests:** Registration, invalid params, owner-scoped immutable
  versioning/list/read, same-owner composites, cross-user not-found, every composite
  tie, deterministic/pure fake plugin, test-only MACD.
- **Validation:** Strategy tests and global gates.
- **Risks:** Contract drift prohibited. **DoD:** stable fake-plugin seam committed.
  **Parallel:** YES after C-01A. **Critical:** YES.

### S-02 — Moving Average and RSI

- **Requirements/state/owner:** ST-01/02, VIS-01, DM-01; BLOCKED; Strategy worker A.
- **Objective:** Implement MA/RSI TECHNICAL_PROFILES_V1 and deterministic overlays.
- **Start/integration dependencies:** S-01 / B-02 and I-01.
- **Unblocks:** Real built-in integration.
- **Reading:** Assignment §§7–8, 11–12, 25; Strategy spec; V1 decisions above.
- **Allowed:** Dedicated MA/RSI plugin directories and tests.
- **Forbidden:** Shared registration/contracts, other plugins, apps, migrations.
- **Acceptance/tests:** Cross/equality/warm-up; Wilder thresholds; flat/no-gain/no-loss;
  invalid params; purity and descriptor values.
- **Validation:** Targeted Strategy and global gates.
- **Risks:** None after S-01. **DoD:** factories ready for Manager registration.
  **Parallel:** YES with S-03/B-01. **Critical:** final integration only.

### S-03 — Bollinger Bands and Support/Resistance

- **Requirements/state/owner:** ST-01/02, VIS-01, DM-01; BLOCKED; Strategy worker B.
- **Objective:** Implement approved Bollinger and rolling Support/Resistance profiles.
- **Start/integration dependencies:** S-01 / B-02 and I-01.
- **Allowed:** Dedicated Bollinger/SR plugin directories and tests.
- **Forbidden:** Shared registration/contracts, MA/RSI, apps, migrations.
- **Acceptance/tests:** Population deviation, zero variance, equality; rolling extrema,
  current exclusion, proximity, overlap/tie/breakout HOLD, warm-up and purity.
- **Validation/risks:** Targeted Strategy/global gates; none after S-01.
- **DoD:** Factories ready for Manager registration. **Parallel:** YES. **Critical:**
  final integration only. **Handoff:** no shared registration edits.

### E-01 — Independent Evaluation

- **Requirements/state/owner:** EV-01, RP-01, AR-02/03; READY; Evaluation worker.
- **Objective:** Pure deterministic Return, Win Rate, drawdown magnitude and trade count.
- **Start/integration dependencies:** C-01 / B-02. **Unblocks:** B-02/L-01 integration.
- **Reading:** Assignment §§20–21, 37; ADR-006/007; Evaluation spec.
- **Allowed:** `modules/evaluation/**` except frozen contracts.
- **Forbidden:** Scores, optional Profit Factor/Sharpe, other-module persistence.
- **Acceptance/tests:** Golden formulas, zero trades, flat curve, non-finite input,
  input immutability and evaluation version.
- **Validation:** Evaluation/global gates. **Risks:** none.
- **DoD:** No placeholder evaluator. **Parallel:** YES. **Critical:** gates B-02.

### L-01 — Configurable Reproducible Leaderboard

- **Requirements/state/owner:** OW-01, LB-01, RP-01, OB-01; BLOCKED; Leaderboard worker.
- **Objective:** Implement LINEAR_REQUIRED_V1, versioned configuration, scopes,
  configurable Top-K, deterministic admission/ties and idempotent reads.
- **Start/integration dependencies:** C-01A, D-01 / E-01 and B-02.
- **Unblocks:** B-02 and Q-01 integration.
- **Reading:** Assignment §§21–23, 33, 35–37; ADR-007; Leaderboard spec.
- **Allowed:** `modules/leaderboard/**` except frozen contracts/migrations.
- **Forbidden:** Metric calculation, Experiment mutation, fixed K invariant.
- **Acceptance/tests:** User-owned scopes, same-owner Experiment admission,
  cross-user not-found/rejection, K=10/alternate K, eligibility, exact score, ties,
  duplicate submission, config-version change, stable order.
- **Validation:** Module/DB/global gates. **Risks:** none; decision is approved.
- **DoD:** Ranking seed/version and tests committed. **Parallel:** YES. **Critical:** gates B-02.

### B-01 — Deterministic Historical Simulator

- **Requirements/state/owner:** BT-01, VIS-01, RP-01, AR-03; BLOCKED; Backtesting domain worker.
- **Objective:** Implement pure deterministic long-only simulation and visualization
  traces without providers, persistence, real built-ins, Evaluation, or Leaderboard.
- **Start dependencies:** C-01 and S-01 only.
- **Integration dependencies:** M-01, S-02, S-03 before I-01/I-02, not before implementation.
- **Unblocks:** B-02.
- **Reading:** Assignment §§19–20, 25–26, 35–37; ADR-002/006/007; BT spec.
- **Inputs/outputs:** Deterministic Candle fixtures and fake Strategy -> Trades,
  equity curve, signals and generic overlay points.
- **Allowed:** Backtesting simulator/domain runner/tests, excluding orchestration/executor.
- **Forbidden:** Provider calls, DB, scoring, generalized risk, shorting, apps.
- **Constraints:** One full-capital long position; t signal -> t+1 open; configurable
  10,000 capital, 0.1% fee, zero slippage defaults; range-end close.
- **Acceptance/tests:** No lookahead, repeated signals, fee/slippage, no trades,
  range-end exit, deterministic rerun, fake Strategy error.
- **Validation:** Simulator/global gates. **Risks:** none after S-01.
- **DoD:** Golden fixture passes independently. **Parallel:** YES. **Critical:** YES.

### B-02 — Candidate, Execution and Experiment Orchestration

- **Requirements/state/owner:** OW-01, BT-01, ST-04, RP-01, OB-01, AR-01/02; BLOCKED;
  Backtesting application worker.
- **Objective:** Connect owner-scoped Candidate persistence, bounded executor, B-01
  runner, Evaluation, inherited Experiment/Trades, and same-owner Leaderboard with
  controlled definitions.
- **Start dependencies:** D-01, S-01, B-01, E-01, L-01.
- **Integration dependencies:** M-01 and S-02/S-03 only before I-01/I-02.
- **Unblocks:** Q-01 real integration and I-01.
- **Reading:** Assignment §§19–24, 33, 35–37, 40.4/40.8, 43; ADR-006/007/008.
- **Allowed:** Backtesting application/infrastructure/API implementations/tests.
- **Forbidden:** Search lifecycle, concrete Binance internals, distributed recovery,
  backend controllers.
- **Acceptance/tests:** Trusted manual/Search Candidate owner propagation,
  owner-scoped status/cancel/Experiment/Trade reads, cross-user not-found,
  saturation, success/failure/cancel, exactly one terminal outcome, no partial
  Experiment, idempotency, provenance, transaction rollback.
- **Validation:** Backtesting DB/cross-module/global gates.
- **Risks:** Cross-module transaction adapter must remain in-process and explicit.
- **DoD:** Controlled manual fixture reaches Leaderboard. **Parallel:** limited.
  **Critical:** YES. **Handoff:** list remaining real-provider/plugin integration.

### AU-02 — Per-User Ownership Security Integration

- **Requirements/state/owner:** OW-01 plus ST-04, SE-01/02, BT-01, LB-01, RP-01,
  OB-01; BLOCKED; Manager/security integration worker.
- **Objective:** Prove complete owner propagation and cross-user isolation across
  Auth, Strategy, Search, Backtesting, and Leaderboard without duplicating pure
  capability implementation.
- **Start/integration dependencies:** AU-01, D-01, S-01, L-01, B-02, and Q-01 real
  integration / F-AUTH and I-01. **Unblocks:** I-01/I-02 security acceptance.
- **Reading:** ADR-008, Auth/ownership specs, C-01A/D-01 and affected capability
  handoffs, latest board/checkpoint.
- **Inputs/outputs:** Implemented owner-aware capabilities -> two-user security
  integration suite, resource evidence matrix, narrowly owner-reviewed fixes.
- **Allowed:** Cross-module security/integration tests and explicitly approved
  owner-scoped fixes in Auth/Strategy/Search/Backtesting/Leaderboard/backend.
- **Forbidden:** Pure Strategy/simulator/Evaluation algorithms, Market Data/News
  ownership, unrelated refactors, migrations without D-01 owner review.
- **Acceptance/tests:** User A/B isolation for read/update/delete/cancel/list/rank;
  client identity cannot bypass context; 401 unauthenticated; 404 cross-user;
  Search Candidate owner propagation; same-owner Leaderboard admission; shared data
  remains shared; no secret logs.
- **Validation:** Integration/E2E/ARCH/REPRO/OBS security evidence plus global gates.
- **DoD:** Resource-by-resource isolation matrix passes. **Parallel:** NO with active
  writers in affected modules. **Critical:** YES. **Handoff:** provide the A/B
  isolation matrix, any owner-reviewed fixes, and unresolved integration risks.

### Q-01 — Seeded Random Search and SearchRun Lifecycle

- **Requirements/state/owner:** OW-01, SE-01/02, LB-01, OB-01, DM-01, AR-02; BLOCKED; Search worker.
- **Objective:** Build deterministic Random generation and finite SearchRun lifecycle
  early against fake execution/ranking/persistence ports, then integrate later.
- **Start dependencies:** C-01A and S-01.
- **Integration dependencies:** D-01, L-01, B-02.
- **Unblocks:** Search demo and I-01 after integration.
- **Reading:** Assignment §§15–18, 23–24, 32.6–32.7, 40.2, 42; Search spec; ADR-006.
- **Allowed:** `modules/search/**` except frozen contracts/migrations.
- **Forbidden:** Simulation, Candidate persistence, score calculation, advanced generators.
- **Acceptance/tests:** Seed determinism, valid unique combinations, trusted
  SearchRun/Candidate owner propagation, owner-scoped lifecycle/ranking,
  cross-user not-found, capacity, candidate/duration/no-improvement/space-exhausted
  stops, cancel, failure counts, terminal guard.
- **Validation:** Pure fake-port tests first; DB/real-port/global tests for completion.
- **Risks:** Do not mark DONE after fake-only phase; record partial IN_PROGRESS/REVIEW.
- **DoD:** Both pure lifecycle and D-01/L-01/B-02 integration pass. **Parallel:** YES.
  **Critical:** final integration, not pure computation.

### N-01 — News Collection, Deduplication and Query

- **Requirements/state/owner:** RD-01, NW-01, SN-01 isolation, OB-01, DM-01; BLOCKED; News worker.
- **Objective:** Fixture-first provider-neutral News with CoinDesk live adapter.
- **Start/integration dependencies:** C-01, D-01 / N-02 and I-01.
- **Reading:** Assignment §§27–30, 32.4, 40.5; ADR-004/007; News spec.
- **Allowed:** `modules/news/**` except frozen contracts/migrations.
- **Forbidden:** Sentiment implementation/tables, crawling/LLM, frontend.
- **Acceptance/tests:** Normalization, provider GUID dedupe, malformed-item isolation,
  deterministic query, provider outage, News survives Sentiment failure.
- **Validation:** Fixture/DB/global; live CoinDesk smoke separately reported.
- **Risks:** API key/provider access may block final live evidence. **DoD:** News
  works with fixtures/provider replacement and a real configured source is proven
  at final/demo or reported BLOCKED/UNVERIFIED. **Parallel:** YES. **Critical:** final demo.

### N-02 — `LEXICON_V1` Sentiment

- **Requirements/state/owner:** SN-01, OB-01, AR-02/03, DM-01; BLOCKED; Sentiment worker.
- **Objective:** Deterministic local lexicon/rule provider, normalized score,
  persistence, provenance, and isolated failure.
- **Start/integration dependencies:** C-01, D-01 / N-01 and I-01.
- **Reading:** Assignment §§29–30, 40.5–40.6; ADR-004/007; Sentiment spec.
- **Allowed:** `modules/sentiment/**` except frozen contracts/migrations.
- **Forbidden:** News persistence, hosted API, model download, ONNX/Transformers,
  LLM, SentimentStrategy.
- **Acceptance/tests:** Positive/neutral/negative fixtures; finite normalized score;
  deterministic repeat; negation/intensifier policy documented; version provenance;
  exception/invalid output stores nothing; missing read is explicit.
- **Validation:** Sentiment unit/DB/failure-isolation/global gates.
- **Risks:** Internal library choice must not change public contracts or add service infra.
- **DoD:** LEXICON_V1 replaceability and News isolation proven. **Parallel:** YES.
  **Critical:** final demo.

### F-01 — Frontend Chart and Client Foundation

- **Requirements/state/owner:** FE-01, MD-02, RD-01, AR-03; READY; Frontend worker.
- **Objective:** App shell, typed REST/market-WS clients, four independent chart
  states, `lightweight-charts` adapter, and fake market source for development.
- **Start/integration dependencies:** C-01 / M-02 and I-01.
- **Allowed:** `apps/frontend/**`; frozen transport imports only.
- **Forbidden:** Backend/modules, business calculations, migrations.
- **Acceptance/tests:** 1–4 charts, independent timeframe change, history before
  realtime, stale/disconnected state, unsubscribe, fake gap replacement.
- **Validation:** Frontend build/typecheck/component/browser tests and contract checks.
- **Risks:** Chart DOM testing; wrap the retained library for fakes. **DoD:** fake
  four-chart flow with no custom chart engine; real integration remains M-02/I-01.
  **Parallel:** YES. **Critical:** final integration.

### F-AUTH — Frontend Authentication and Protected Navigation

- **Requirements/state/owner:** AU-01, OW-01, FE-01, DM-01; BLOCKED; Frontend worker.
- **Objective:** Add register/login/current-session restoration/logout, protected
  private navigation, 401 recovery, and private cache clearing without client-owned
  identity or browser token storage.
- **Start/integration dependencies:** C-01A and completed F-01 shell / AU-01.
  **Unblocks:** replanned F-02 and I-01.
- **Reading:** Auth/frontend specs, ADR-008, C-01A Auth DTOs, F-01 handoff, cookie policy.
- **Inputs/outputs:** Typed Auth contracts -> Auth screens/state/guards and tests,
  first against fakes and then real AU-01.
- **Allowed:** Frontend Auth/client/navigation/tests after F-01 checkpoint.
- **Forbidden:** Backend/modules, localStorage/sessionStorage session tokens,
  client `userId` authorization, business calculations.
- **Acceptance/tests:** Register/login/logout; reload restores valid session; expired
  session returns to login; A's cached private data is absent after B logs in;
  localhost cookie behavior and final/deployed cookie expectations are documented.
- **Validation:** Component/browser/build/typecheck plus AU-01 E2E integration.
- **DoD:** Protected frontend flow works through HttpOnly session cookies.
  **Parallel:** Not with an active F-01 shared-shell writer. **Critical:** integration.
  **Handoff:** record fake/real Auth client coverage, cache-clearing evidence, and
  the F-02/I-01 integration contract.

### F-02 — Frontend Strategy, Search, Result and Auxiliary Views

- **Requirements/state/owner:** AU-01, OW-01, ST-01/03, SE-01/02, BT-01, EV-01,
  LB-01, VIS-01, NW-01, SN-01, DM-01; BLOCKED; Frontend worker.
- **Objective:** Descriptor-driven controls, Search progress, Leaderboard, Experiment,
  trades/overlays, News and Sentiment panels against fake typed clients.
- **Start/integration dependencies:** C-01A, F-01, F-AUTH / all real APIs and AU-02 at I-01.
- **Allowed:** Frontend features/tests only.
- **Forbidden:** Indicator/signal/backtest/metric/score/provider logic.
- **Acceptance/tests:** Authenticated owner-scoped definitions/Search/Experiments/
  Leaderboard; A/B cache isolation; new descriptor without name branch; bounded
  Search status; generic price/indicator overlays; required metrics/provenance;
  missing Sentiment degraded.
- **Validation:** Component/browser/build/global contract tests.
- **Risks:** Frozen DTO drift requires Manager gate. **DoD:** complete fixture demo.
  **Parallel:** YES. **Critical:** final integration.

### I-01 — Runtime, Transports and Observability Integration

- **Requirements/state/owner:** AU-01, OW-01, RD-01, all capability integrations,
  OB-01, AR-01–03;
  BLOCKED; Manager/integration worker.
- **Objective:** Compose Auth and real modules, trusted request identity, protected
  REST routes, market-only WS, final/demo provider configuration/readiness,
  failures and operational projections.
- **Start dependencies:** AU-01, AU-02, B-02; completed M-01/M-02, S-02/S-03
  registration, Q-01 integration, N-01/N-02, F-01/F-AUTH/F-02.
- **Integration dependencies:** Live Binance/CoinDesk availability for final smoke.
- **Unblocks:** I-02.
- **Reading:** Entire authority chain and latest checkpoint.
- **Allowed:** `apps/backend/**`, example configuration, thin transport mappers;
  module fixes only through owner review.
- **Forbidden:** Controller business logic, non-market WS, fake-ready status,
  Redis/worker topology.
- **Acceptance/tests:** Auth REST/session; 401/404 ownership semantics; REST/WS
  contracts; final/demo preflight rejects mock-only required providers; one HTTP
  manual backtest and SearchRun; visible Auth/search/executor/provider/ranking state.
- **Validation:** HTTP/WS/runtime/full root checks.
- **Risks:** Network/credentials/PostgreSQL. **DoD:** integrated system ready for E2E.
  **Parallel:** NO. **Critical:** YES.

### I-02 — E2E Demo, Documentation and Final Verification

- **Requirements/state/owner:** Every REQUIRED ID, especially AU-01, OW-01, RD-01,
  DL-01, and DM-01;
  BLOCKED; Manager plus independent reviewers.
- **Objective:** Prove the complete MVP, architecture defense, clean setup, demo,
  requirement traceability, and final handoff.
- **Start/integration dependencies:** I-01 / live provider smoke where required.
- **Allowed:** E2E tests, README, acceptance/checkpoint evidence, narrowly reviewed fixes.
- **Forbidden:** Optional scope or redesign during stabilization.
- **Acceptance/tests:** Real register/login/session/logout; User A/B isolation;
  real Binance BTCUSDT four-chart realtime; definitions/composite; bounded Random
  Search; progress; user-specific Top-K; selected Experiment; signals, entry/exit,
  overlays; four metrics/provenance; real-source News/local LEXICON sentiment;
  provider/failure demonstrations; mock-only final configuration rejection; all
  eight architecture change scenarios.
- **Validation:** Clean install, migration, build, typecheck, all tests, arch/artifact/
  scope/runtime, E2E twice, clean Git state; unavailable evidence not marked PASS.
- **Risks:** External outage. **DoD:** Full DoD below, change archived, final checkpoint.
  **Parallel:** Reviewer/test work only. **Critical:** YES.

## Manager, subagent/worker, and Git policy

- Maximum useful concurrency: one Manager plus three workers.
- Manager owns Goal, READY/BLOCKED state, contracts, critical path, integration,
  validation, commits, task board, and checkpoints.
- Subagents/workers own bounded packets and never broaden scope or edit another
  worker's paths. They return their diff or commit, validation evidence, failures,
  risks, and a concise handoff to the Manager; they do not change board state.
- Default Git workflow: existing Manager branch with native workers on disjoint
  scopes; Manager alone stages/commits and never uses broad staging during overlap.
- One contract writer owns C-01A; one migration writer owns D-01. F-01 and F-AUTH
  do not overlap on the shared frontend shell, and AU-02 does not overlap active
  writers in the affected private-resource modules.
- Use a feature branch for an external human or multi-commit independently reviewed
  stream. Use a worktree only for long-running independent frontend versus auxiliary
  streams that require isolated builds/commits. Never use worktrees for contracts,
  migrations, shared registration, or integration.
- Reviewer agents run after C-01/D-01, after pure capability waves, before I-01
  acceptance, and during I-02. They do not silently repair out-of-scope findings.

## Full MVP Definition of Done

- Every REQUIRED ID resolves to implemented behavior, passing evidence, and owner.
- No active MVP public operation throws `NOT_IMPLEMENTED`; frontend is not a placeholder.
- Real registration/login/current-user/expiry/logout uses PostgreSQL-backed User and
  opaque session state; no final Auth response is faked.
- Two-user negative acceptance proves owner-scoped Strategy Definitions,
  Composite Definitions, Search Runs, Candidates/Experiments, and Leaderboards;
  client identity fields cannot bypass trusted request context.
- Historical/realtime Binance flows are provider-neutral and recover gaps.
- Four charts, four built-ins, composite, deterministic simulation, required metrics,
  bounded Random Search, configurable Top-K, markers/overlays, News and LEXICON
  Sentiment complete the demo.
- Experiment provenance resolves definitions, market input, code where practical,
  Trades, metrics, and ranking configuration without overclaiming exact replay.
- Search, execution capacity/duration/failures, provider state, and Leaderboard are observable.
- News/Sentiment failures do not break core flows.
- Final/demo evidence uses real Binance history/realtime, a real configured News
  source, real PostgreSQL application/Auth state, and application-generated
  Backtest/Leaderboard results; mock-only final configuration is rejected.
- `lightweight-charts` renders normalized candles without owning business logic;
  no custom candlestick engine is introduced.
- Architecture, artifact, deferred-scope, build, typecheck, test, runtime and E2E
  checks pass with honest BLOCKED/UNVERIFIED reporting.
- README contains verified Install, Run, Architecture, and Demo instructions.
- Active implementation change is complete/archived; TASKS and HANDOFF identify the
  release/demo commit and no hidden context remains.

## Explicitly deferred

RBAC, organization/team models, tenant/workspace hierarchy, OAuth/SSO, 2FA,
external identity providers, email verification, password reset, enterprise IAM;
configurable Long/Short, stop loss, take profit, trailing stops, position sizing,
generalized risk; SentimentStrategy;
Genetic/Bayesian/domain-guided/AI search; AI/LLM authoring or crawling; ML/ONNX
Sentiment V1; Redis/BullMQ/workers/distributed recovery; microservices, Kafka,
general Event Bus, CQRS, Event Sourcing; SMC/Wyckoff; multiple delivered exchanges;
optional Profit Factor/Sharpe; strict binary/dataset replay and production artifact
repositories.

## Fresh-agent resume test

A new Manager reads `AGENTS.md`, the canonical linked sources, this plan,
`TASKS.md`, and `HANDOFF.md`; verifies the checkpoint commit; selects the highest
critical READY task with a free write scope; follows its packet; supplies validation
evidence for REVIEW; and lets the Manager update state/checkpoint. No approved V1
decision depends on conversation history.

At the A-00 checkpoint the Manager must be able to explain from repository files
alone that C-01 was correctly completed before the later instructor change; Auth V1
uses opaque PostgreSQL sessions; the five direct roots and inherited/shared data
are fixed by ADR-008; deterministic fixtures remain allowed but final/demo paths are
real; `lightweight-charts` is retained; C-01A is the next ownership-sensitive gate;
E-01/F-01 are READY; and D-01/S-01 remain BLOCKED by C-01A.
