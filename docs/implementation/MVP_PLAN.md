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
their `Requirements / baseline state / planned owner` field; task names remain the heading identifiers.

The approved 2026-08-29 functional amendment adds a second, explicitly planned
extension frontier. Its requirements are `CSL-R-MD-03`, `CSL-R-ST-05` through
`CSL-R-ST-07`, `CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-NW-02`, and
`CSL-R-RP-02`, plus the amended realtime behavior in `CSL-R-MD-02`. The
extension packets below are new work: no prior packet, including a `DONE`
packet, is evidence that one of these requirements is implemented.

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
deterministic. Component or method changes create a new version. This remains
the legacy `MAJORITY_VOTE_V1` baseline; `WEIGHTED_VOTE_V1` is an approved
DEC-007 extension planned in `S-05` and is not claimed by the original S-01
completion evidence.

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

### `DEC-007` functional-extension profiles

The following profiles are approved by [DEC-007](../control/DECISIONS.md#dec-007--controlled-academic-functional-extension-profiles)
and are planned here without changing contracts, migrations, or runtime source in
this reconciliation phase:

- `MARKET_OBSERVABILITY_V1` adds only ephemeral Market Data delivery/health state:
  provider event time, received time, last latency, connection state, and the
  latest 100 normalized ticks per pair. It is not persisted and never becomes
  backtest or replay input.
- `LLM_AUTHORING_V1` produces one structured draft per prompt/URL submission through
  a configured provider-neutral adapter with a 45-second bound. Deterministic
  validation and explicit Save/Approve are required before immutable persistence.
- `EXTERNAL_CONTENT_SAFETY_V1` limits URL acquisition to backend allowlisted HTTPS
  adapters with destination revalidation, no credentials, bounded redirects,
  timeout, and body size; extraction-template refinement creates only an approved-
  review `DRAFT` with provenance and rollback history.
- `WEIGHTED_VOTE_V1`, `SMC_LITE_V1`, and `WYCKOFF_LITE_V1` are immutable,
  deterministic Strategy profiles. The Lite names do not claim professional or
  discretionary methodology.
- `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1` are seeded, bounded discovery
  profiles whose algorithm configuration, seed, dataset identity, and code version
  are retained; Domain-guided generation uses declared categories and no LLM.
- `SYNTHETIC_SHORT_PAPER_V1` is candle-only Long/synthetic-Short simulation with
  `STOP_LOSS_WINS_V1`, 0.08% per-fill fee, adverse 5-bps per-fill slippage, and
  eight-place decimal/fixed-point accounting. The execution profile is immutable
  Experiment provenance and is not live trading or generalized risk.

The exact behavior, failure expectations, and acceptance scenarios remain
canonical in `docs/requirements.md`, the accepted ADR amendments, `docs/data-model.md`,
the active capability specifications, and the active `mvp-implementation` change.

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

The legacy diagram and wave rows above preserve the original program shape at
the A-00 checkpoint. The current operational states are owned by `TASKS.md` and
the latest `HANDOFF.md`; therefore their later `DONE`, `REVIEW`, or `BLOCKED`
states supersede any earlier READY wording in that historical planning view.

### DEC-007 extension DAG (planned; all feature packets blocked)

`RB-01`/`RB-02` are accepted planning checkpoints. The blocked first `C-02`
attempt established that its migration evidence needs a reproducible local
PostgreSQL environment and that the executable deferred-scope checker must be
reconciled to DEC-007 before contract/schema work can be validated. `ENV-01` is
therefore the sole pre-`C-02` environment/tooling gate. It must complete without
changing C-02 business behavior, contracts, data model, or migration semantics.
Every future extension implementation packet still depends on `C-02` after that
gate passes. Because the approved E1 implementation packets use extension-owned
directories that did not exist when `ENV-01` was accepted, the distinct
post-implementation reconciliation packet `ENV-02` closes the checker boundary
before `S-05`/`S-06` can leave `REVIEW`; it is not a retry or reopening of
`ENV-01`.

```text
RB-01/RB-02 DONE
  -> ENV-01 BLOCKED: local Docker PostgreSQL evidence + DEC-007 scope checker
       -> C-02 BLOCKED: extension contract/data-model/migration reconciliation gate
       |
       +--> M-03 BLOCKED: amended MD-02 + MARKET_OBSERVABILITY_V1
       +--> S-05 BLOCKED: WEIGHTED_VOTE_V1 composite
       +--> S-06 BLOCKED: SMC_LITE_V1 + WYCKOFF_LITE_V1 plugins
       +--> Q-02 BLOCKED: DOMAIN_GUIDED_V1 + GENETIC_V1 discovery
       +--> N-03 BLOCKED: safe URL import + versioned extraction/refinement
       +--> {N-03 | C-02} -> S-04 BLOCKED: LLM_AUTHORING_V1 controlled drafts
       +--> {S-05 | S-06} -> B-03 BLOCKED: SYNTHETIC_SHORT_PAPER_V1 + provenance

{S-05 REVIEW | S-06 REVIEW} + C-02 DONE
  -> ENV-02 BLOCKED: post-extension checker-boundary reconciliation
       -> S-05/S-06 closure review; only then may their downstream joins start

{C-02 | M-03 | S-04 | S-05 | S-06 | Q-02 | N-03 | B-03}
  -> E-02 BLOCKED: extension evaluation/decimal-boundary reconciliation
{Q-02 | B-03 | E-02}
  -> L-02 BLOCKED: extension ranking/provenance admission and reads

{M-03 | S-04 | S-05 | S-06 | Q-02 | B-03 | N-03 | E-02 | L-02}
  -> F-03 BLOCKED: DEC-007 functional-state frontend projections
  -> I-03 BLOCKED: extension boundary integration + reproducibility proof
       (after baseline I-01 and AU-02 are independently completed)
  -> I-02 BLOCKED: final all-requirements demo/verification
```

Shared-boundary joins are intentional: `S-04` consumes safe News content through
the News public API; `Q-02` submits the existing Candidate form through the
Backtesting public execution boundary and retains ranking inputs; `B-03` feeds
decimal-normalized results to Evaluation; `E-02` feeds finite metrics to
Leaderboard; and `N-03` invokes Sentiment through its neutral public boundary.
Ephemeral Market Data observability is joined only to delivery and frontend state,
never to `B-03` historical input. `I-03` owns the final cross-module transaction,
provider, provenance, and no-secret evidence for this extension frontier.

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

The DEC-007 extension sequence is a later controlled frontier, not an automatic
continuation of the legacy waves:

| Extension wave | Gate | Planned packets | Exit checkpoint |
|---|---|---|---|
| E0a | `RB-01`/`RB-02` accepted; C-02 blocked checkpoint reviewed | `ENV-01` only | Local Docker PostgreSQL and DEC-007 scope-checker evidence are accepted |
| E0 | `ENV-01` accepted and separately reviewed | `C-02` only | Contracts/data model/migrations are reconciled and validated |
| E1 | `C-02` DONE | `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03` | Pure/provider-boundary extension behavior and provenance pass |
| E2 | E1 packet reviews | `E-02` then `L-02` | Decimal evaluation and extension-aware ranking are proven |
| E3 | E2 plus all E1 packets | `F-03` | Functional-state frontend projections pass without business logic |
| E4 | E3 plus baseline `I-01` and `AU-02` | `I-03` | Shared-boundary joins, real-provider readiness, and reproducibility proof pass |
| E5 | `I-03` DONE | Existing `I-02` | Full required demo and final verification include DEC-007 evidence |

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
live exchange Long/Short and generalized risk; advanced or AI search;
unconfigured/autonomous LLM authoring; arbitrary URL fetching; automatic template
promotion; Redis/BullMQ/workers;
distributed leases/fencing/watchdogs; microservices/event bus; CQRS/Event Sourcing;
strict artifact repositories; unrelated cleanup.

## Complete task packets

### P-00 — Durable Program Bootstrap

- **Requirements / baseline state / planned owner:** CSL-R-DL-01, CSL-R-AR-01; DONE; Manager.
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

- **Requirements / baseline state / planned owner:** MD-01/02, ST-01–04, SE-01/02, BT-01, EV-01,
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, RD-01 and affected existing IDs; DONE;
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, ST-04, SE-01/02, BT-01, LB-01,
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, MD-01, ST-04, SE-02, BT-01, EV-01,
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, RD-01, OB-01; BLOCKED; Auth worker.
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

- **Requirements / baseline state / planned owner:** MD-01, RD-01, RP-01, AR-02; BLOCKED; Market Data worker.
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

- **Requirements / baseline state / planned owner:** MD-02, RD-01, FE-01, OB-01, AR-02, DM-01; BLOCKED; Market Data worker.
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

- **Requirements / baseline state / planned owner:** OW-01, ST-01, ST-03/04, AR-02/03, RP-01; BLOCKED; Strategy core worker.
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

- **Requirements / baseline state / planned owner:** ST-01/02, VIS-01, DM-01; BLOCKED; Strategy worker A.
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

- **Requirements / baseline state / planned owner:** ST-01/02, VIS-01, DM-01; BLOCKED; Strategy worker B.
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

- **Requirements / baseline state / planned owner:** EV-01, RP-01, AR-02/03; READY; Evaluation worker.
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

- **Requirements / baseline state / planned owner:** OW-01, LB-01, RP-01, OB-01; BLOCKED; Leaderboard worker.
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

- **Requirements / baseline state / planned owner:** BT-01, VIS-01, RP-01, AR-03; BLOCKED; Backtesting domain worker.
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

- **Requirements / baseline state / planned owner:** OW-01, BT-01, ST-04, RP-01, OB-01, AR-01/02; BLOCKED;
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

- **Requirements / baseline state / planned owner:** OW-01 plus ST-04, SE-01/02, BT-01, LB-01, RP-01,
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

- **Requirements / baseline state / planned owner:** OW-01, SE-01/02, LB-01, OB-01, DM-01, AR-02; BLOCKED; Search worker.
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

- **Requirements / baseline state / planned owner:** RD-01, NW-01, SN-01 isolation, OB-01, DM-01; BLOCKED; News worker.
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

- **Requirements / baseline state / planned owner:** SN-01, OB-01, AR-02/03, DM-01; BLOCKED; Sentiment worker.
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

- **Requirements / baseline state / planned owner:** FE-01, MD-02, RD-01, AR-03; READY; Frontend worker.
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, FE-01, DM-01; BLOCKED; Frontend worker.
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, ST-01/03, SE-01/02, BT-01, EV-01,
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

- **Requirements / baseline state / planned owner:** AU-01, OW-01, RD-01, all capability integrations,
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

- **Requirements / baseline state / planned owner:** Every REQUIRED ID, especially AU-01, OW-01, RD-01,
  DL-01, and DM-01;
  BLOCKED; Manager plus independent reviewers.
- **Objective:** Prove the complete MVP, architecture defense, clean setup, demo,
  requirement traceability, and final handoff.
- **Start/integration dependencies:** I-01 and the DEC-007 extension proof
  `I-03`; live provider smoke where required. `I-03` is a future blocked packet,
  so this final-verification packet cannot claim DEC-007 coverage before that
  proof exists.
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

## DEC-007 reconciliation and extension packets

The following packets are allocated by `RB-01`. `RB-01` is the only packet
executed by `INS-024`; every packet below it is future work and remains
`BLOCKED`. The packet boundaries are intentionally explicit so a later
Instructor signal can authorize one safe frontier without treating the legacy
`DONE` evidence as coverage of the new requirements.

### RB-01 — DEC-007 Documentation Reconciliation Planning

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-ST-05`–`07`,
  `CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`; `DEC-007`.
- **State / owner / wave:** DONE / Manager / Extension wave E0.
- **Start dependencies:** `INS-024 / APPROVED_FOR_EXECUTION`, reviewed
  re-baseline `496d5a34b76841b9f5b142fa512225f502f5fa26`, and a clean
  applicability checkpoint.
- **Integration dependencies:** None for this documentation packet.
- **Objective:** Reconcile the approved functional amendment into a durable
  implementation plan and task DAG before any extension implementation.
- **Exact write scope:** Only `docs/implementation/MVP_PLAN.md`,
  `docs/implementation/TASKS.md`, and `docs/implementation/HANDOFF.md`.
- **Forbidden:** All source, contracts, migrations, runtime/frontend files,
  requirements, decisions, ADRs, architecture, data model, OpenSpec files,
  workers, retries, and existing task-state or evidence rewrites.
- **Acceptance/tests:** Every amended requirement maps to a new packet; `C-02`
  is the earliest contract/data-model/migration gate; each future packet has a
  unique ID, exact scope, dependencies, acceptance, validation, and handoff;
  all feature packets remain `BLOCKED`; `M-02` remains `REVIEW/UNVERIFIED`;
  `AU-02` and `I-01`/`I-02` remain blocked; legacy `DONE` evidence is explicitly
  historical only.
- **Validation:** Reviewed-checkpoint and changed-path proof, complete
  requirement traceability, cross-file DAG/state consistency, documentation/link
  checks, `git diff --check`, and truthful unavailable-tool reporting. Formal
  OpenSpec CLI validation is `UNVERIFIED` unless it is actually available.
- **Definition of Done:** One coherent control-plane commit is recorded in the
  task board and latest handoff; no feature work starts. **Parallel:** NO.
  **Critical:** YES. **Handoff:** A later Instructor signal must authorize
  `C-02`; no packet is READY from this checkpoint.

### ENV-01 — Local Docker PostgreSQL Evidence and Deferred-Scope Checker Reconciliation

- **Requirement IDs / authority:** `CSL-R-RD-01`, DEC-007, DEC-008, ADR-010;
  this is a pre-`C-02` operational/tooling gate, not a product requirement or
  feature implementation.
- **State / owner / wave:** BLOCKED / one Infrastructure-and-tooling worker under
  Manager review / Extension wave E0a.
- **Start dependencies:** Accepted `RB-01`/`RB-02`; reviewed blocked `C-02`
  checkpoint `7f774ed505f45d927b650ccefcd76d9e4f8611d2`; Docker daemon evidence
  must be rechecked at execution. `C-02` is not retried by this packet.
- **Integration dependencies:** Unblocks a later, separately reviewed and
  Instructor-authorized `C-02` only. It unlocks no E1 feature packet.
- **Objective:** Provide Codex-operated Docker/Compose PostgreSQL development and
  test databases with real migration proof, and reconcile the canonical
  `scope:check` owner to narrowly recognize approved DEC-007 profiles without
  weakening deferred-scope enforcement.
- **Exact write scope:** `infra/docker-compose.yml` and new environment-only
  helpers under `infra/db/local-*` (never `infra/db/migrations/**` or
  `infra/db/migrate.config.js`); local migration-validation helpers;
  `scripts/check-deferred-scope.cjs` and its focused test/helper files; root
  `package.json` command wiring; `.gitignore`; and optional `.env.example`
  placeholders. The Manager alone may update `TASKS.md` and `HANDOFF.md`. No
  `modules/**` business code, executable C-02 contract/DTO/data-model files,
  C-02 migrations, requirements, decisions, ADRs, architecture, OpenSpec,
  runtime configuration, dependencies, frontend, Auth, provider, or cloud files
  are in scope.
- **Acceptance/tests:** Docker/Compose exposes health-checked separate local
  development and test databases with persistent named volumes; one documented
  command provisions, waits, and validates migrations; a separate command resets
  test data without touching development data; local generated/configured URLs are
  ignored and never logged/committed, while `.env.example` is placeholder-only;
  migration evidence executes up, down, remigrate, and constraints on the test
  database. If Docker is absent/unusable, report `BLOCKED` with evidence and do
  not install software or use cloud services. The checker canonical owner is
  `scripts/check-deferred-scope.cjs`; focused positive/negative tests prove
  approved DEC-007 vocabulary is allowed only at its approved boundary while
  deferred enterprise identity, queue/distributed, live-trading/generalized-risk,
  autonomous/unconfigured LLM, and strict-replay scope remain rejected.
- **Validation:** Docker client/daemon and compose health evidence; secret scan of
  tracked diff; development/test isolation and reset proof; real migration
  up/down/remigrate/constraint probes; focused scope-checker allow/reject tests;
  root `scope:check`; architecture/artifact/scope/deferred-scope checks;
  link/DAG checks; `git diff --check`; and OpenSpec status. Missing Docker,
  daemon, or OpenSpec CLI is `BLOCKED`/`UNVERIFIED`, never `PASS`.
- **Definition of Done:** Manager independently reviews one worker's bounded
  output, commits a self-contained environment/checker checkpoint, and records
  exact commands, service health, migration evidence, checker evidence, secrets
  handling, and blockers. The system returns to Instructor review in `HOLD`; no
  automatic C-02 retry or downstream promotion occurs. **Parallel:** NO.
  **Critical:** YES. **Handoff:** State that ENV-01 is accepted or blocked and
  name the exact C-02 preconditions it leaves.

### C-02 — DEC-007 Contract, Data-Model and Migration Reconciliation Gate

- **Requirement IDs:** `CSL-R-MD-02`/`03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`.
- **State / owner / wave:** BLOCKED / Manager with one contract-and-schema
  owner / Extension wave E0.
- **Start dependencies:** `ENV-01` DONE and separately Instructor-reviewed;
  baseline inputs are `C-01A`, `D-01`, `M-01`, `S-01`, `Q-01`, `B-02`, `E-01`,
  `L-01`, `N-01`, and `N-02`. `M-02` is a `REVIEW/UNVERIFIED` evidence input
  only and must not be retried or moved. The blocked attempt at
  `7f774ed505f45d927b650ccefcd76d9e4f8611d2` is not retry authority.
- **Integration dependencies:** Unblocks `M-03`, `S-04`, `S-05`, `S-06`,
  `Q-02`, `B-03`, and `N-03` only after its gate evidence passes.
- **Objective:** Reconcile extension fields, lifecycle states, provenance,
  ephemeral delivery state, safe-content policy, and decimal/profile semantics
  across canonical contracts, the conceptual model, and physical migrations.
  This is a prerequisite gate, not feature behavior.
- **Exact write scope:** `modules/{market-data,strategy,search,backtesting,news,sentiment,evaluation,leaderboard}/api/contracts.ts`;
  the corresponding `application/ports.ts` files; extension DTOs under
  `packages/contracts/rest/**` and `packages/contracts/websocket/**`;
  `docs/data-model.md`; and approved migration/schema validation files under
  `infra/db/**`. No runtime implementations, providers, frontend, or Auth
  behavior are in scope.
- **Acceptance/tests:** One canonical owner is identified for each extension
  contract; `MARKET_OBSERVABILITY_V1` is explicitly ephemeral and excluded from
  historical inputs; LLM draft/approval and safe URL/refinement states are
  representable without secrets; weighted/Lite strategy configuration is
  immutable; all three Search profiles retain seed/configuration/dataset/code;
  paper execution and eight-place decimal provenance are representable; News
  extraction/template/provenance/retention states and neutral Sentiment joins
  are representable; inherited/shared ownership remains unchanged; old public
  contracts remain compatible where not explicitly extended.
- **Validation:** Contract serialization and boundary tests, migration
  down/up/remigrate and constraint checks through the accepted `ENV-01` local
  environment, architecture/deferred-scope/scope checks through its accepted
  checker, link/DAG checks, `git diff --check`, and strict OpenSpec validation if
  available. Unavailable checks are `BLOCKED` or `UNVERIFIED`, never `PASS`.
- **Definition of Done:** Reviewed contract/data-model/migration checkpoint
  identifies every downstream input and no extension packet is promoted
  automatically. **Parallel:** NO. **Critical:** YES. **Handoff:** Publish the
  exact canonical files, migration IDs, compatibility notes, and fan-out order.

### M-03 — Amended Realtime Market Delivery and `MARKET_OBSERVABILITY_V1`

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-RP-02`,
  `CSL-R-FE-01`, `CSL-R-OB-01`.
- **State / owner / wave:** BLOCKED / Market Data worker / Extension wave E1.
- **Start dependencies:** `C-02`, `M-01`, and the `F-01` normalized chart input
  contract. `M-02` remains `REVIEW/UNVERIFIED`; this packet must re-prove the
  amended realtime behavior without changing M-02's historical state.
- **Integration dependencies:** `F-03`, baseline `I-01`, and `I-03`; no
  observability state may become a Backtesting dependency.
- **Objective:** Complete the amended same-timestamp/later-timestamp realtime
  behavior and expose bounded ephemeral provider telemetry and the per-pair
  latest-100 tick ring buffer on the market-only WebSocket boundary.
- **Exact write scope:** `modules/market-data/api/**` excluding `contracts.ts`,
  `modules/market-data/application/**`, `modules/market-data/infrastructure/**`,
  and their focused tests. No frontend, REST/WS contract, migration, or general
  event-channel changes.
- **Acceptance/tests:** Provider event/received times, latency, connection state,
  restart-empty semantics, 100-tick cap, duplicate/out-of-order suppression,
  gap recovery, shutdown, and four-chart independence are deterministic;
  observability is visibly ephemeral and cannot alter historical/replay input;
  real Binance readiness is reported honestly and fixture-only final mode does
  not pass.
- **Validation:** Focused Market Data and market-WebSocket tests, resilience and
  restart tests, frontend contract checks, architecture/scope/artifact/deferred
  checks, and real Binance smoke when configured; unavailable live evidence is
  `BLOCKED`/`UNVERIFIED`.
- **Definition of Done:** Reviewed Market Data handoff proves the amended MD-02
  and MD-03 scenarios and lists provider limitations. **Parallel:** YES after
  `C-02`; **Critical:** YES to `F-03`/`I-03`.

### S-04 — Controlled `LLM_AUTHORING_V1` Strategy Drafts

- **Requirement IDs:** `CSL-R-ST-05`, `CSL-R-RP-02`, with the safe imported-content
  join in `CSL-R-NW-02`.
- **State / owner / wave:** BLOCKED / Strategy application worker / E1.
- **Start dependencies:** `C-02` and completed legacy `S-01`; URL-origin authoring
  also requires the public result of `N-03`.
- **Integration dependencies:** `N-03`, `F-03`, `AU-02`, and `I-03`.
- **Objective:** Add a provider-neutral, configured one-request authoring flow
  that returns a structured draft, validates it deterministically, and persists
  only after explicit authenticated Save/Approve.
- **Exact write scope:** `modules/strategy/api/**` excluding `contracts.ts`,
  `modules/strategy/application/**`, `modules/strategy/infrastructure/**`, and
  focused Strategy authoring tests. URL fetching, News persistence, pure plugin
  I/O, provider secrets, and frontend files are forbidden.
- **Acceptance/tests:** Missing configuration, timeout, provider failure, malformed
  draft, and rejected approval have no persistence side effect; one prompt/URL
  submission makes at most one request within 45 seconds; valid approval creates
  one immutable owner-scoped version with safe origin metadata and no secret;
  URL input consumes only the safe News public boundary and never performs direct
  fetches from Strategy.
- **Validation:** Strategy/application unit and contract tests, provider timeout
  and no-write tests, owner/approval integration, architecture/deferred/scope
  checks, and OpenSpec validation status reported truthfully.
- **Definition of Done:** Draft, validation, Save/Approve, failure, provenance,
  and public-boundary evidence are reviewed. **Parallel:** YES after `C-02` with
  disjoint scope; **Critical:** `N-03`/`F-03` join.

### S-05 — Immutable `WEIGHTED_VOTE_V1` Composite

- **Requirement IDs:** `CSL-R-ST-03`, `CSL-R-ST-06`, `CSL-R-RP-02`.
- **State / owner / wave:** BLOCKED / Strategy composite worker / E1.
- **Start dependencies:** `C-02` and completed legacy `S-01`.
- **Integration dependencies:** `B-03`, `L-02`, `F-03`, and `I-03`.
- **Objective:** Implement the immutable weighted composite policy over exact
  same-owner component versions without identity-branching.
- **Exact write scope:** New extension-owned composite implementation and tests
  under `modules/strategy/domain/composite/**` plus its narrowly scoped Strategy
  application adapter/tests under `modules/strategy/application/composite/**`.
  Canonical contracts, migrations, shared registry barrels, other plugins,
  frontend, and Backtesting are forbidden; bootstrap registration is an
  integration responsibility.
- **Acceptance/tests:** Enabled components map BUY/HOLD/SELL to `+1/0/-1`;
  finite non-negative weights normalize to one; thresholds `+0.30`/`-0.30`
  produce BUY/SELL/HOLD including ties; component enabled state, weights,
  thresholds, and exact versions are immutable provenance; invalid or cross-owner
  definitions fail before execution.
- **Validation:** Pure deterministic composite tests, contract/owner integration,
  architecture and scope checks, and downstream Backtesting/Leaderboard evidence.
- **Definition of Done:** Weighted behavior is independently reviewed and
  explicitly distinguished from the historical S-01 `MAJORITY_VOTE_V1` evidence.
  **Parallel:** YES after `C-02`; **Critical:** YES to `B-03`.

### S-06 — Deterministic `SMC_LITE_V1` and `WYCKOFF_LITE_V1` Plugins

- **Requirement IDs:** `CSL-R-ST-07`, `CSL-R-RP-02`.
- **State / owner / wave:** BLOCKED / Strategy plugin worker / E1.
- **Start dependencies:** `C-02` and completed legacy `S-01`.
- **Integration dependencies:** `B-03`, `F-03`, and `I-03`.
- **Objective:** Add two documented deterministic registry plugins with bounded
  inputs and no claim of full discretionary/professional methodology.
- **Exact write scope:** `modules/strategy/domain/plugins/smc-lite/**`,
  `modules/strategy/domain/plugins/wyckoff-lite/**`, and their focused tests.
  Existing built-ins, shared contracts, registry barrels, apps, migrations, and
  frontend are forbidden; registration is a later integration join.
- **Acceptance/tests:** SMC uses confirmed pivot-window swing highs/lows and
  close-based Break of Structure; Wyckoff uses fixed range/volume accumulation,
  distribution, and breakout heuristics; validation, insufficient data, purity,
  determinism, descriptors, and truthful Lite labeling are proven.
- **Validation:** Focused pure Strategy tests, fixture determinism, architecture/
  artifact/deferred/scope checks, and registration/readiness evidence later.
- **Definition of Done:** Both profiles and their limitations are reviewed;
  historical S-02/S-03 evidence is not reused as ST-07 evidence. **Parallel:**
  YES after `C-02`; **Critical:** `B-03`/`F-03`.

### ENV-02 — Post-Extension Approved-Profile Checker Boundary Reconciliation

- **Requirement IDs / authority:** `CSL-R-RP-02`, DEC-007, DEC-010, ADR-010;
  this is a post-extension validation/tooling gate and creates no product
  behavior or new profile.
- **State / owner / wave:** BLOCKED / Manager with exactly one checker-tooling
  worker / E1 closure gate.
- **Start dependencies:** `ENV-01` DONE, `C-02` DONE, and `S-05`/`S-06` at
  `REVIEW` with their source evidence available. The current Instructor signal
  must explicitly authorize this packet. `ENV-02` is not a retry of `ENV-01`.
- **Integration dependencies:** The accepted checker gate is required before
  `S-05`/`S-06` can be promoted to `DONE`; no downstream feature packet is
  promoted by this packet.
- **Objective:** Reconcile the canonical deferred-scope checker with the exact
  extension-owned implementation boundaries already authorized for
  `WEIGHTED_VOTE_V1`, `SMC_LITE_V1`, and `WYCKOFF_LITE_V1`, while retaining
  rejection of every deferred or unapproved boundary.
- **Exact write scope:** `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs` only, plus the Manager's required
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` state /
  checkpoint updates. No module, package, app, migration, dependency, runtime,
  frontend, requirement, ADR, OpenSpec, or other governance file is in the
  implementation worker scope.
- **Acceptance/tests:** The checker permits the approved profile identifiers at
  the existing canonical contract/port/REST/migration boundaries and at only
  these exact implementation directories: `modules/strategy/application/
  composite/`, `modules/strategy/domain/composite/`,
  `modules/strategy/domain/plugins/smc-lite/`, and
  `modules/strategy/domain/plugins/wyckoff-lite/`. Focused tests prove positive
  cases for those boundaries and negative cases for the same identifiers in an
  unrelated path. No path-wide exclusion, generic profile bypass, or weakening
  of deferred enterprise identity, distributed/queue, live-trading/generalized
  risk, autonomous/unconfigured LLM, or strict-replay rejection is allowed.
- **Validation:** Focused checker tests (`npm run test:scope-check`), root
  `npm run scope:check`, architecture/artifact/deferred-scope checks,
  `git diff --check`, and applicable typecheck/build/lint evidence. OpenSpec CLI
  and any unavailable environment check remain `UNVERIFIED`/`BLOCKED`, never
  `PASS`.
- **Definition of Done:** One fresh Manager reconciles the task row through
  `READY`, delegates exactly one disjoint worker, independently reviews the
  scoped diff and evidence, commits an `ENV-02` checkpoint, and records exact
  status in the operational files. `S-05` and `S-06` remain `REVIEW` for a
  separate Instructor closure review; no automatic downstream start occurs.
  **Parallel:** NO. **Critical:** YES to S-05/S-06 closure. **Handoff:** Name
  the four implementation boundaries, focused positive/negative results, root
  scope result, and any unavailable checks.

### Q-02 — Seeded `DOMAIN_GUIDED_V1` and `GENETIC_V1` Discovery

- **Requirement IDs:** `CSL-R-SE-03`, `CSL-R-RP-02`, `CSL-R-OB-01`,
  `CSL-R-LB-01`.
- **State / owner / wave:** BLOCKED / Search worker / E1.
- **Start dependencies:** `C-02`, `S-01`, and legacy `Q-01`'s public generator/
  lifecycle boundary. `Q-01` remains evidence for Random only and is not evidence
  that SE-03 is implemented.
- **Integration dependencies:** `B-02`, `L-01`, `B-03`, `L-02`, `F-03`, and
  `I-03`; all joins use public APIs.
- **Objective:** Add deterministic Domain-guided and Genetic profiles while
  retaining one candidate form, explicit finite bounds, and seeded reproducibility.
- **Exact write scope:** `modules/search/domain/generators/domain-guided/**`,
  `modules/search/domain/generators/genetic/**`, the Search application/profile
  wiring and persistence projections under `modules/search/application/**` and
  `modules/search/infrastructure/**` excluding canonical contracts, and focused
  Search tests. No Backtesting simulation, score calculation, or LLM use.
- **Acceptance/tests:** Profiles retain algorithm configuration, seed, dataset
  identity, and code version; identical inputs reproduce candidate sequence and
  ranking; Domain-guided uses declared categories only; Genetic defaults are
  population 50, max 10 generations, elite 10%, mutation 20%; both respect the
  earlier of 500 candidates or five minutes and never exceed budget/capacity;
  state, failures, timing, cancellation, and ranking are observable.
- **Validation:** Generator/lifecycle determinism and boundedness tests,
  persistence/integration tests through public Search/Backtesting/Leaderboard
  APIs, architecture/scope/deferred checks, and reproducibility evidence.
- **Definition of Done:** Both profiles are independently reviewed; no old Q-01
  completion claim is expanded. **Parallel:** YES after `C-02`; **Critical:**
  `L-02`/`I-03`.

### B-03 — Synthetic Directional Paper Execution and Provenance

- **Requirement IDs:** `CSL-R-BT-02`, `CSL-R-RP-02`, `CSL-R-BT-01`,
  `CSL-R-OB-01`.
- **State / owner / wave:** BLOCKED / Backtesting worker / E1.
- **Start dependencies:** `C-02`, `B-01`, `B-02`, `M-01`, `S-01`, `S-05`, and
  `S-06`. Historical B-01/B-02 evidence remains limited to their approved
  long-only/legacy boundaries.
- **Integration dependencies:** `E-02`, `L-02`, `F-03`, baseline `I-01`, and
  `I-03`; no live exchange-order path is allowed.
- **Objective:** Extend the deterministic simulator and Experiment provenance
  for Long and synthetic Short paper positions with bounded OHLC exits.
- **Exact write scope:** `modules/backtesting/domain/**`,
  `modules/backtesting/application/**`, `modules/backtesting/infrastructure/**`,
  and focused Backtesting tests, excluding canonical contracts, migrations,
  frontend, exchange order code, and generalized risk.
- **Acceptance/tests:** `SYNTHETIC_SHORT_PAPER_V1` uses Binance candles only;
  Long/Short direction is explicit; `STOP_LOSS_WINS_V1` resolves dual-trigger
  candles; fee is 0.08% per entry/exit fill; adverse slippage is 5 bps per fill;
  P&L is decimal/fixed-point to eight places; execution profile, fee, slippage,
  rounding, position mode, SL/TP, dataset, code, and definition provenance are
  persisted; deterministic reruns, no partial Experiment, one terminal outcome,
  and no leverage/margin/funding/liquidation/order behavior are proven.
- **Validation:** Backtesting domain/application/integration suites, decimal
  golden cases, dual-trigger and direction cases, persistence/provenance checks,
  architecture/deferred/scope checks, and downstream Evaluation/Leaderboard
  integration. Unavailable PostgreSQL/provider evidence is not PASS.
- **Definition of Done:** Reviewed handoff lists exact arithmetic/profile and
  remaining real-data limitations. **Parallel:** After `S-05`/`S-06` and `C-02`;
  **Critical:** YES to `E-02`/`L-02`.

### N-03 — Safe URL Import and Versioned News Extraction Refinement

- **Requirement IDs:** `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-SN-01`,
  `CSL-R-ST-05`, `CSL-R-OB-01`.
- **State / owner / wave:** BLOCKED / News/Sentiment boundary worker / E1.
- **Start dependencies:** `C-02`, completed `N-01`, and completed `N-02`; those
  packets are baseline evidence only, not NW-02 evidence.
- **Integration dependencies:** `S-04`, `F-03`, baseline `I-01`, and `I-03`.
- **Objective:** Implement configured Website/RSS/HTML collection, backend-only
  safe URL import, controlled extraction-template lifecycle, retention, and
  neutral News-to-Sentiment failure isolation.
- **Exact write scope:** `modules/news/api/**`, `application/**`, and
  `infrastructure/**` excluding canonical contracts; `modules/sentiment/api/**`,
  `application/**`, and `infrastructure/**` only for the approved neutral
  boundary/provenance join; and focused News/Sentiment tests. No frontend,
  Strategy internals, credentials, arbitrary user URL store, or migrations.
- **Acceptance/tests:** HTTPS allowlist/source checks; localhost/private/link-local
  and DNS-rebinding rejection; no credentials; at most three revalidated
  redirects; 20-second total timeout; 1 MiB body cap; Website/RSS/HTML adapters;
  canonical/provider/content-hash deduplication; versioned templates with
  diff/metrics and DRAFT-only self-healing; explicit approval/rollback; 1–5
  minute refresh with five-minute default; seven-day raw HTML and 90-day
  normalized/provenance/template retention; Sentiment failure leaves News
  readable; real configured source is required for final mode.
- **Validation:** Safe-fetch security/resilience tests including DNS/redirect
  revalidation, extraction/refinement and purge tests, News/Sentiment contract
  tests, architecture/deferred/scope checks, and real-provider smoke when
  configured. External availability is `BLOCKED`/`UNVERIFIED` when absent.
- **Definition of Done:** Reviewed handoff proves no unsafe remote contact,
  automatic template promotion, or secret/provenance leak. **Parallel:** YES
  after `C-02`; **Critical:** `S-04`/`F-03`/`I-03`.

### E-02 — Extension Evaluation and Decimal-Boundary Reconciliation

- **Requirement IDs:** `CSL-R-BT-02`, `CSL-R-RP-02`, `CSL-R-EV-01`.
- **State / owner / wave:** BLOCKED / Evaluation worker / Extension wave E2.
- **Start dependencies:** `C-02`, `B-03`, and completed `E-01`; E-01's legacy
  evidence remains valid only for its original metric boundary.
- **Integration dependencies:** `L-02`, `F-03`, and `I-03`.
- **Objective:** Prove Evaluation consumes the decimal-normalized paper result,
  remains independent of Strategy/Backtesting implementation, and exposes the
  required finite metrics without recomputing fills.
- **Exact write scope:** `modules/evaluation/**` excluding canonical contracts,
  migrations, Strategy, Backtesting, Leaderboard, frontend, and provider code.
- **Acceptance/tests:** Return, Win Rate, Maximum Drawdown, and Number of Trades
  remain deterministic and finite for Long/Short decimal results; fee/slippage/
  rounding are not recomputed; invalid numeric input fails without ranking; input
  immutability and zero-trade behavior remain explicit.
- **Validation:** Focused Evaluation tests, decimal integration fixtures, public
  boundary tests, architecture/scope/deferred checks, and `L-02` admission proof.
- **Definition of Done:** Evaluation handoff identifies its version/policy and
  proves no optional metric or risk scope leaked in. **Parallel:** After B-03;
  **Critical:** YES to `L-02`.

### L-02 — Extension-Aware Ranking and Provenance Admission

- **Requirement IDs:** `CSL-R-LB-01`, `CSL-R-SE-03`, `CSL-R-BT-02`,
  `CSL-R-RP-02`, `CSL-R-OB-01`, `CSL-R-OW-01`.
- **State / owner / wave:** BLOCKED / Leaderboard worker / E2.
- **Start dependencies:** `C-02`, `Q-02`, `B-03`, `E-02`, and completed `L-01`.
  L-01's ranking evidence is not expanded to claim extension provenance.
- **Integration dependencies:** `F-03`, baseline `I-01`, and `I-03`.
- **Objective:** Preserve deterministic, owner-scoped admission and reads while
  exposing the extension provenance needed to explain discovery and paper results.
- **Exact write scope:** `modules/leaderboard/**` excluding canonical contracts,
  migrations, Strategy, Search generation, Backtesting simulation, and frontend.
- **Acceptance/tests:** Only finite successfully evaluated same-owner Experiments
  enter a scope; deterministic Top-K/ties/idempotency remain; entries relate to
  strategy/composite version, Search profile/seed/configuration/dataset/code,
  execution/decimal profile, metrics, and ranking configuration without mutating
  historical Experiments or leaking cross-user data.
- **Validation:** Leaderboard unit/DB/public-boundary tests, provenance and
  owner-isolation integration, architecture/scope/deferred checks, and repeatable
  ranking evidence. PostgreSQL unavailability is `UNVERIFIED`.
- **Definition of Done:** Reviewed handoff distinguishes extension admission from
  the historical L-01 packet and lists any persistence limitations. **Parallel:**
  E2 after Q-02/B-03/E-02; **Critical:** YES to `F-03`/`I-03`.

### F-03 — DEC-007 Functional-State Frontend Projections

- **Requirement IDs:** `CSL-R-MD-03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-FE-01`, `CSL-R-DM-01`.
- **State / owner / wave:** BLOCKED / Frontend worker / Extension wave E3.
- **Start dependencies:** `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`,
  `E-02`, and `L-02`; legacy `F-01`/`F-02` remain historical baseline evidence.
- **Integration dependencies:** `I-03` and baseline `I-01`; no feature packet
  may make the frontend its own source of truth.
- **Objective:** Present backend-derived observability, draft approval, weighted/
  Lite strategy state, discovery provenance, synthetic-paper profile, extraction
  review state, News/Sentiment degradation, and result/leaderboard provenance.
- **Exact write scope:** `apps/frontend/**` only; no module, backend, contract,
  migration, provider, or business-calculation changes.
- **Acceptance/tests:** Up to four independent charts show ephemeral status and
  restart loss honestly; LLM draft/validation/Save/Approve is distinct; weighted
  and Lite descriptors are rendered without name-based business branches; Search
  profile/budget/seed and paper direction/SL/TP/fee/slippage/decimal status are
  visible; News template DRAFT/approval and missing Sentiment are clear; no
  private cache or client identity bypass is introduced.
- **Validation:** Frontend component/browser/contract/build/typecheck/lint tests,
  architecture/artifact/deferred/scope checks, and real API/browser evidence when
  the integrated runtime exists. Fixture-only evidence cannot close final mode.
- **Definition of Done:** Reviewed frontend handoff identifies every extension
  projection and its backend source. **Parallel:** NO with other frontend writers;
  **Critical:** YES to `I-03`.

### I-03 — DEC-007 Boundary Integration and Reproducibility Proof

- **Requirement IDs:** All DEC-007 extension IDs, amended `CSL-R-MD-02`,
  `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-OB-01`, and
  `CSL-R-AR-01`–`03` as integration drivers.
- **State / owner / wave:** BLOCKED / Manager or integration worker / E4.
- **Start dependencies:** `C-02`, `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`,
  `N-03`, `E-02`, `L-02`, `F-03`, and independently completed baseline `I-01`
  plus `AU-02`. `I-01` and `AU-02` remain blocked now; this packet does not
  authorize either task.
- **Integration dependencies:** Live configured Binance historical/realtime,
  real configured News, PostgreSQL Auth/application state, and application-
  generated Backtest/Leaderboard results. `I-02` depends on this proof.
- **Objective:** Join the extension modules through public APIs and prove the
  final runtime boundary, ownership, provider readiness, practical provenance,
  market-only WebSocket, and reproducible bounded profiles.
- **Exact write scope:** `apps/backend/**`, thin REST/market-WebSocket transport
  mappers, and extension integration/E2E tests owned by this packet. No domain
  algorithm, module persistence, migration, frontend, queue, or general event-bus
  changes.
- **Acceptance/tests:** Shared-boundary joins are proven for safe URL→Strategy
  authoring, Search→Backtesting→Evaluation→Leaderboard, News→Sentiment,
  ephemeral Market Data→Frontend, owner propagation, no-secret observability,
  real-provider preflight, synthetic paper labeling, and same-input seeded
  sequence/ranking/provenance; failure isolation and no mock-only final mode are
  explicit; baseline cross-module transaction evidence is closed here where
  applicable.
- **Validation:** Full build/typecheck/lint/test, architecture/artifact/
  deferred/scope checks, REST/market-WS/runtime smoke, PostgreSQL, real-provider
  and E2E evidence, reproducibility reruns, and `git diff --check`; unavailable
  external checks remain `BLOCKED`/`UNVERIFIED`.
- **Definition of Done:** A self-contained integration/reproducibility handoff
  names all evidence and remaining limitations, and makes `I-02` the only next
  final-verification packet. **Parallel:** NO. **Critical:** YES.

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
- The DEC-007 extension frontier additionally proves ephemeral market observability;
  controlled LLM drafts and safe URL import; versioned News extraction with
  approval; weighted voting; deterministic Lite SMC/Wyckoff; seeded Domain-guided
  and Genetic discovery; and synthetic Long/Short paper execution with SL/TP,
  fee, slippage, eight-place decimal accounting, and practical provenance.
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
leverage, margin, funding, liquidation, trailing stops, position sizing,
generalized risk, live orders, and exchange execution; SentimentStrategy;
Bayesian, reinforcement-learning, agent-based, unbounded, or LLM-driven search;
unconfigured/autonomous LLM actions, arbitrary URL retrieval, and automatic
extraction-template promotion; ML/ONNX Sentiment V1; Redis/BullMQ/workers and
distributed recovery; microservices, Kafka, general Event Bus, CQRS, Event
Sourcing; full professional/discretionary SMC/Wyckoff; multiple delivered
exchanges; optional Profit Factor/Sharpe; strict binary/dataset replay and
production artifact repositories.

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

After the accepted `RB-01`/`RB-02` planning baseline and blocked first `C-02`
attempt, the Manager must identify `ENV-01` as the sole pre-`C-02` environment
and checker-reconciliation gate, then follow the DEC-007 extension DAG through
the later contract/schema gate, Market Data, Strategy, Search, Backtesting,
News/Sentiment, Evaluation/Leaderboard, Frontend, and `I-03`. `ENV-02` is the
separate post-extension checker-boundary gate for the implemented S-05/S-06
packets and does not authorize downstream work. `M-02` remains
`REVIEW/UNVERIFIED`, `AU-02` and `I-01`/`I-02` remain blocked, and none of the
legacy `DONE` packets is treated as proof of a newly approved extension
requirement.
