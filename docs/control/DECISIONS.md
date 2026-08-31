# Durable Decision Ledger

This append-oriented ledger records only approved decisions needed for continuity
between independent Instructor and Orchestrator conversations. Requirements remain
in `docs/requirements.md`, architecture decisions remain in accepted ADRs, and
operational task state remains in `docs/implementation/TASKS.md`.

New records use a stable `DEC-XXX` ID and the fields Status, Authority, Decision,
Why, Affected, optional Supersedes, and Canonical references. Allowed statuses are
`PROPOSED`, `APPROVED`, `SUPERSEDED`, and `REJECTED`. Existing records are not
silently rewritten; a changed decision receives a new record and supersession link.

## DEC-001 — Repository-controlled Level 2 orchestration

Status: `APPROVED`

Authority: Human governance instruction

Decision: Repository artifacts plus Git are the shared source of truth for
independent Instructor, Orchestrator, and worker conversations. The Instructor
owns durable decisions and current authorization; the Orchestrator owns execution,
task state, integration, validation, and handoff; workers own only bounded assigned
implementation and evidence.

Why: Continuity must survive conversation loss without manual copying or hidden
chat state.

Affected: `AGENTS.md`, `docs/control/*`, `docs/implementation/{MVP_PLAN,TASKS,HANDOFF}.md`

Canonical references: [Contributor rules](../../AGENTS.md), [Instructor control](./INSTRUCTOR.md)

## DEC-002 — Simple Auth, opaque sessions, and per-user ownership

Status: `APPROVED`

Authority: Later instructor requirement and architecture review

Decision: MVP Auth is email/password with Argon2id hashes and PostgreSQL-backed
opaque server-side sessions using a fixed 24-hour absolute expiry. Trusted identity
comes from the server boundary. StrategyDefinition, CompositeDefinition, SearchRun,
Candidate, and LeaderboardScope are direct user-owned roots; their approved children
inherit ownership.

Why: The instructor requires real Authentication and private-resource isolation
without expanding the MVP into enterprise identity or general tenancy.

Affected: `CSL-R-AU-01`, `CSL-R-OW-01`, C-01A, D-01, AU-01/AU-02, S-01, B-02, Q-01, L-01, F-AUTH

Canonical references: [Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md), [Auth spec](../../openspec/specs/auth/spec.md)

## DEC-003 — Real final/demo data with controlled fixtures elsewhere

Status: `APPROVED`

Authority: Later instructor requirement

Decision: Tests and development may use fixtures and fakes, but final/demo evidence
must use real configured Binance historical/realtime data, a real configured News
source, real PostgreSQL application/Auth state, and application-generated Backtest
and Leaderboard results. Mock-only final configuration cannot pass.

Why: Deterministic testing and truthful delivered-runtime evidence are separate
acceptance needs.

Affected: `CSL-R-RD-01`, Market Data, News, Auth, frontend, I-01, I-02

Canonical references: [Requirements](../requirements.md), [Architecture](../architecture.md), [MVP program](../implementation/MVP_PLAN.md)

## DEC-004 — Retain lightweight-charts for candlesticks

Status: `APPROVED`

Authority: Architecture review

Decision: The frontend retains `lightweight-charts` 4.2.3 or the current compatible
locked version as the candlestick renderer over normalized state. A custom chart
engine and chart-owned business logic are outside MVP scope.

Why: The existing renderer satisfies the visualization need while preserving
frontend and Market Data boundaries.

Affected: `CSL-R-FE-01`, `CSL-R-RD-01`, F-01, F-02

Canonical references: [Architecture](../architecture.md), [Frontend spec](../../openspec/specs/frontend/spec.md), [MVP program](../implementation/MVP_PLAN.md)

## DEC-005 — Ownership contract gate

Status: `APPROVED`

Authority: Architecture review and approved implementation program

Decision: C-01A is the additive Auth/ownership contract gate. D-01 and S-01 remain
blocked until C-01A completes. Task readiness and current execution authorization
remain separate gates.

Why: Ownership-sensitive persistence and Strategy work must not begin against the
pre-Auth C-01 contract freeze, and Instructor authorization is a separate gate from
task readiness.

Affected: C-01A, D-01, S-01 and downstream ownership-sensitive tasks

Canonical references: [Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md), [MVP program](../implementation/MVP_PLAN.md)

## DEC-006 — Packet-boundary closure and integrated proof ownership

Status: `APPROVED`

Authority: Instructor checkpoint review after INS-014

Decision: B-02 may be closed at its packet boundary when its owner-scoped
execution, rollback, terminal-outcome, provenance, PostgreSQL, and focused/global
evidence pass. The remaining proof that Experiment persistence and Leaderboard
admission are atomic across module adapters belongs to I-01, which must use and
prove one explicit in-process transaction-aware composition. This integration
gate must remain `UNVERIFIED` until I-01 evidence exists and must not prevent the
Q-01 real-port phase from using the completed B-02 public APIs once B-02 is closed.

Why: B-02's packet DoD is controlled manual execution reaching Leaderboard, while
I-01 owns runtime composition and cross-module transaction wiring. Keeping those
proofs distinct prevents both premature final claims and a circular task DAG.

Affected: B-02, Q-01, I-01, I-02, `CSL-R-BT-01`, `CSL-R-RP-01`, `CSL-R-OW-01`

Canonical references: [MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md), [ADR-006](../adr/ADR_006_local_backtest_execution.md), [ADR-007](../adr/ADR_007_practical_reproducibility.md)

## DEC-007 — Controlled academic functional-extension profiles

Status: `APPROVED`

Authority: Instructor functional amendment approved 2026-08-29

Decision: The academic MVP adopts the bounded profiles recorded in
`CSL-R-MD-03`, `CSL-R-ST-05` through `CSL-R-ST-07`, `CSL-R-SE-03`,
`CSL-R-BT-02`, `CSL-R-NW-02`, and `CSL-R-RP-02`. They authorize: ephemeral
market observability; provider-neutral LLM strategy drafts requiring deterministic
validation and human Save/Approve; allowlisted and bounded backend-only external
content fetches with draft-only extraction-template refinement; deterministic
Lite SMC/Wyckoff plugins and weighted voting; bounded seeded Random,
Domain-guided, and Genetic discovery; and synthetic Long/Short paper backtests
with deterministic OHLC SL/TP, fee, slippage, decimal accounting, and practical
provenance.

The profiles do not authorize live exchange orders, leverage, margin, funding,
liquidation, autonomous LLM persistence or promotion, unrestricted user URL
fetching, a general WebSocket event channel, a pixel-perfect frontend, or claims
of professional/discretionary SMC or Wyckoff behavior. The named requirements,
accepted ADR amendments, and active OpenSpec capability specifications are the
canonical detailed behavior; this decision does not itself create executable task
state or implementation authorization.

Why: The five-screen functional amendment expands the academic demonstration
scope while preserving truthful simulation, explicit human control of generative
and external-content actions, bounded resource use, and the established modular
monolith boundaries.

Affected: Market Data, Strategy, Search, Backtesting, News, Sentiment,
Evaluation, Leaderboard, Frontend, the active `mvp-implementation` change, and
future reconciliation/extension packets. `TASKS.md` and `HANDOFF.md` are not
changed by this decision.

Canonical references: [Requirements](../requirements.md),
[Architecture](../architecture.md), [Data model](../data-model.md),
[ADR-001](../adr/ADR_001_websocket.md),
[ADR-002](../adr/ADR_002_plugin_architecture.md),
[ADR-004](../adr/ADR_004_sentiment_isolated_module.md),
[ADR-006](../adr/ADR_006_local_backtest_execution.md),
[ADR-007](../adr/ADR_007_practical_reproducibility.md),
[ADR-009](../adr/ADR_009_controlled_llm_and_external_content.md), and
[active MVP change](../../openspec/changes/mvp-implementation/).

## DEC-008 — Automated local PostgreSQL evidence and deferred-scope reconciliation

Status: `APPROVED`

Authority: Instructor operational decision approved 2026-08-29 after the blocked
`C-02` checkpoint `7f774ed505f45d927b650ccefcd76d9e4f8611d2`

Decision: Local development and migration evidence use a Codex-provisioned
Docker/Compose PostgreSQL environment, never a manual operating-system PostgreSQL
installation or cloud database. The environment has health-checked, persistent
local volumes and separate development and test databases. Its committed tooling
must provide clear commands to provision/wait, validate migrations, and reset only
test data. Docker absence or an unusable daemon is a truthful `BLOCKED` result;
the tooling must not install system software, use a cloud database, or request
secrets in chat.

`DATABASE_URL` and any test connection string exist only in process-local
environment or an ignored local environment file. Tooling may generate a local
ignored value without logging it. A committed `.env.example` may contain
placeholders only; no password, token, or usable connection string is committed.
Migration evidence requires real up, down, remigrate, and constraint probes against
the local test database.

The canonical deferred-scope checker owner is
`scripts/check-deferred-scope.cjs`, invoked by the root `scope:check` script in
`package.json`. It must be reconciled through a bounded, tested allowlist of the
approved DEC-007 profiles while continuing to reject deferred enterprise identity,
distributed/queue, live-trading/generalized-risk, autonomous/unconfigured LLM, and
strict-replay scope. Disabling the checker, excluding active paths, or broadly
allowing prohibited terms is not an acceptable remedy.

`ENV-01` is the new pre-`C-02` environment/tooling reconciliation gate. It changes
no C-02 business contract, data model, migration semantics, or feature behavior.
`C-02` remains blocked and may be retried only after `ENV-01` is accepted and a
separate Instructor signal explicitly authorizes it.

Why: The prior C-02 attempt had no configured database for migration proof and
failed the existing checker on now-approved DEC-007 vocabulary. Reproducible local
infrastructure and a truthful executable policy are prerequisites to reliable
contract/schema reconciliation, not a reason to waive validation.

Affected: `ENV-01`, `C-02`, root validation tooling, local PostgreSQL operations,
`CSL-R-RD-01`, DEC-007 extension evidence, and the active
`mvp-implementation` delivery program.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md),
[ADR-006](../adr/ADR_006_local_backtest_execution.md),
[ADR-007](../adr/ADR_007_practical_reproducibility.md),
[Implementation program](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), and
[scope checker](../../scripts/check-deferred-scope.cjs).

## DEC-009 — Later functional-amendment precedence

Status: `APPROVED`

Authority: Later Instructor functional amendment approved 2026-08-29 and
preserved as repository evidence under
`docs/assignment/amendment-2026-08-29/`

Decision: For a functional capability that an explicit later Instructor
amendment adds, changes, or expands, the later amendment takes precedence over
conflicting or absent behavior in the protected assignment PDF. The PDF remains
authoritative for requirements that the amendment does not change, including its
foundational academic and architectural constraints. This precedence does not
override a newer approved decision or an approved architecture constraint.

The five amendment screenshots and their README are functional evidence only.
They do not authorize visual reproduction, create task state, or expand the
bounded profiles. `docs/requirements.md`, accepted ADR amendments,
`docs/architecture.md`, `docs/data-model.md`, and active OpenSpec specifications
remain the normalized detailed authority for executable behavior and deferred
scope. This clarification creates no implementation authorization and changes
no operational task state.

Why: The later amendment explicitly re-baselines approved academic behavior,
including capabilities not present in the original assignment. Recording the
precedence prevents an approved functional delta from being discarded merely
because the PDF predates it, while preserving the PDF for all unchanged
requirements and the repository's higher-level constraints.

Affected: `CSL-R-MD-03`, `CSL-R-ST-05` through `CSL-R-ST-07`,
`CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, DEC-007, and
future amendment-scoped implementation reviews.

Canonical references: [Assignment evidence](../assignment/amendment-2026-08-29/README.md),
[Requirements](../requirements.md), [DEC-007](#dec-007--controlled-academic-functional-extension-profiles),
[Architecture](../architecture.md), [Data model](../data-model.md), and the
[active MVP change](../../openspec/changes/mvp-implementation/).

## DEC-010 — Post-extension deferred-scope boundary reconciliation

Status: `APPROVED`

Authority: Instructor operational decision under the current human governance
authorization, after independent review of INS-036 and INS-038

Decision: The completed `ENV-01` packet is not reopened or retried. A distinct
`ENV-02` packet is approved to reconcile the canonical deferred-scope checker
after the approved S-05/S-06 implementation directories exist. The checker may
allow `WEIGHTED_VOTE_V1` only in its existing canonical contract/port/REST/
migration boundaries plus `modules/strategy/application/composite/` and
`modules/strategy/domain/composite/`; it may allow `SMC_LITE_V1` only in
`modules/strategy/domain/plugins/smc-lite/`; and it may allow `WYCKOFF_LITE_V1`
only in `modules/strategy/domain/plugins/wyckoff-lite/`. The implementation must
be expressed as exact, testable path boundaries with focused positive and
negative tests. It must not exclude active paths broadly, bypass the checker,
or weaken rejection of deferred enterprise identity, distributed/queue,
live-trading/generalized-risk, autonomous/unconfigured LLM, or strict-replay
scope.

This reconciliation changes no product behavior, contracts, migrations,
runtime configuration, or task state by itself. The Manager must add and move
the `ENV-02` row through the normal operational sequence in `TASKS.md`, and the
Instructor must separately review the resulting checkpoint before S-05/S-06 are
promoted or any downstream packet starts.

Why: `ENV-01` correctly reconciled the checker for the boundaries known at its
pre-C-02 execution point. INS-036 then implemented approved extension-owned
Strategy directories, exposing a real checker-boundary mismatch. A narrowly
scoped follow-up preserves the checker as an executable policy without treating
the mismatch as permission to bypass validation or as a reason to repeat a
completed environment packet.

Affected: `ENV-02`, S-05, S-06, `scripts/check-deferred-scope.cjs`, its focused
tests, and the E1 closure DAG. `ENV-01`, C-02, product contracts, and downstream
task state are not reopened by this decision.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [DEC-007](#dec-007--controlled-academic-functional-extension-profiles),
[ADR-010](../adr/ADR_010_local_postgres_environment_and_scope_checker.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[scope checker](../../scripts/check-deferred-scope.cjs), and
[INS-039](./INSTRUCTOR.md).

## DEC-011 — B-03 approved-profile checker boundary reconciliation

Status: `APPROVED`

Authority: Instructor operational decision after the independent `INS-052`
review of the accepted B-03 source checkpoint
`692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`

Decision: A distinct `ENV-03` packet is approved to reconcile the canonical
deferred-scope checker with the already approved B-03 implementation boundary.
It may allow `SYNTHETIC_SHORT_PAPER_V1` and `STOP_LOSS_WINS_V1` only in the
existing canonical Backtesting contract/port/REST/migration boundaries and in
the exact B-03 implementation directories
`modules/backtesting/domain/`, `modules/backtesting/application/`, and
`modules/backtesting/infrastructure/`. The directional paper vocabulary needed
by that profile may be allowed only in those same exact Backtesting directories
and existing canonical boundaries.

The packet must add focused positive tests for each approved implementation
boundary and negative tests for the same identifiers/vocabulary in unrelated
paths. It must preserve rejection of deferred enterprise identity,
distributed/queue, live-trading/generalized-risk, autonomous/unconfigured LLM,
strict-replay, and all other unapproved scope. No path-wide exclusion, generic
profile bypass, contract/migration change, or product behavior is authorized.
`ENV-03` is not a retry or reopening of `ENV-01` or `ENV-02`; it does not
promote B-03 or any downstream packet by itself.

Why: B-03 is an approved DEC-007 capability and its independently reviewed
source is now present, but `npm run scope:check` still rejects its exact
implementation vocabulary. The mismatch is a real executable-policy boundary
issue. Resolving it separately keeps B-03 source review bounded and preserves
the checker as an enforceable safeguard.

Affected: `ENV-03`, `scripts/check-deferred-scope.cjs`,
`scripts/check-deferred-scope.test.cjs`, B-03 closure review, and the E1
extension DAG. `ENV-01`, `ENV-02`, B-03 source, product contracts, migrations,
and downstream task state are not reopened or changed by this decision.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md),
[DEC-007](#dec-007--controlled-academic-functional-extension-profiles),
[DEC-010](#dec-010--post-extension-deferred-scope-boundary-reconciliation),
[ADR-010](../adr/ADR_010_local_postgres_environment_and_scope_checker.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[scope checker](../../scripts/check-deferred-scope.cjs), and
[INS-052](./INSTRUCTOR.md).

## DEC-012 — Q-02 seeded-discovery contract boundary reconciliation

Status: `APPROVED`

Authority: Instructor operational decision after the `INS-054` frontier review
and the accepted `ENV-03` checker checkpoint
`0bc215f5781a7a2860d439b3b4953104a99d9e3a`

Decision: A distinct `C-03` packet is approved to reconcile the canonical
Search contract surface required by the already approved `CSL-R-SE-03` seeded
discovery capability. The public Search generator type, generator port
registry shape, SearchRun status/command types, and Search REST request/status
surface may explicitly represent `RANDOM`, `DOMAIN_GUIDED`, and `GENETIC`
while retaining the existing one-candidate form, owner-free client commands,
finite stop conditions, and `RANDOM_V1`/`DOMAIN_GUIDED_V1`/`GENETIC_V1`
provenance vocabulary. The REST parser may validate the explicit accepted
generator values, but this packet does not implement a generator or make the
application run a new profile.

The canonical deferred-scope checker may be updated only as needed to recognize
the actual canonical Search contract/REST paths without weakening its policy.
Focused positive and negative checker tests must remain. No algorithm,
generator implementation, Search lifecycle change, migration, database schema
change, frontend, provider, queue/distributed behavior, LLM behavior, or
unrelated source is authorized. `C-03` is not a retry or reopening of `C-02`;
the later Q-02 implementation packet remains separately authorized work and
must retain its own exact generator write scope.

Why: `modules/search/api/contracts.ts` already records the approved seeded
profile IDs and provenance shape, but its executable generator union and
application port registry remain `RANDOM`-only; the Search REST contract/parser
also remains `RANDOM`-only. Allowing Q-02 to proceed without reconciling this
would silently widen or contradict the frozen public contract boundary.

Affected: `C-03`, the named Search contract/port/REST files and focused tests,
the canonical deferred-scope checker path recognition, and the Q-02 start gate.
`C-02`, B-03, ENV-02, ENV-03, migrations, Search algorithms, and downstream
task state are not reopened or promoted by this decision.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md),
[DEC-007](#dec-007--controlled-academic-functional-extension-profiles),
[DEC-010](#dec-010--post-extension-deferred-scope-boundary-reconciliation),
[DEC-011](#dec-011--b-03-approved-profile-checker-boundary-reconciliation),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Search capability spec](../../openspec/specs/search/spec.md), and
[INS-054](./INSTRUCTOR.md).

## DEC-013 — Q-02 approved-profile checker boundary reconciliation

Status: `APPROVED`

Authority: Instructor operational decision after the independent `INS-058`
review of the Q-02 source checkpoint
`95cb98463f60c35f71dda2f7832f0aa9ad22a30c`

Decision: A distinct `ENV-04` packet is approved to reconcile the canonical
deferred-scope checker for the already approved Q-02 implementation. The
checker may recognize `DOMAIN_GUIDED_V1` in
`modules/search/application/service.ts` and under
`modules/search/domain/generators/domain-guided/`, and may recognize
`GENETIC_V1` in `modules/search/application/service.ts` and under
`modules/search/domain/generators/genetic/`. These are exact additions for
the reviewed implementation paths; they must not become a broad
`modules/search/**` allowance.

`ENV-04` may change only the checker and its focused tests/helpers. It must
preserve all existing positive and negative cases and continue rejecting
deferred enterprise identity, queue/distributed, live-trading/generalized
risk, autonomous or unconfigured LLM, strict-replay, and near-match path
scope. It does not reopen Q-02 source, C-03 contracts, migrations, product
behavior, or downstream task state. Q-02 remains `REVIEW` until a separate
Instructor closure review after the checker gate.

Why: Q-02 source was independently reviewed and all applicable local code
gates pass, but `npm run scope:check` reports the four exact approved-profile
occurrences as outside the stale checker boundary. This is an executable
policy mismatch that must be repaired separately so the checker remains an
enforceable safeguard rather than being hidden or bypassed.

Affected: `ENV-04`, `scripts/check-deferred-scope.cjs`, its focused tests/helpers,
and the Q-02 closure review. Q-02 implementation, C-03, ENV-01/ENV-02/ENV-03,
migrations, and downstream feature task state are not reopened or promoted by
this decision.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md),
[DEC-007](#dec-007--controlled-academic-functional-extension-profiles),
[DEC-010](#dec-010--post-extension-deferred-scope-boundary-reconciliation),
[DEC-012](#dec-012--q-02-seeded-discovery-contract-boundary-reconciliation),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[scope checker](../../scripts/check-deferred-scope.cjs),
[Q-02 checkpoint](../implementation/HANDOFF.md), and
[INS-058](./INSTRUCTOR.md).

## DEC-014 — N-03 residual auto-refresh scheduler completion

Status: `APPROVED`

Authority: Instructor operational decision after the `INS-072` frontier review
and the accepted M-03 closure checkpoint `280b280`

Decision: A distinct residual packet, `N-03A`, is approved to complete the
missing auto-refresh scheduler behavior required by `CSL-R-NW-02` in the
already approved N-03 News boundary. N-03A is completion work, not a retry,
replacement, or reopening of the completed N-03 worker implementation. It may
add a provider-neutral, application-owned, testable scheduler that invokes the
existing public News collection at a configured one-to-five-minute interval
with a five-minute default, prevents overlapping runs, isolates refresh failure,
and shuts down idempotently. The scheduler must not perform direct remote
fetching, persist timer state, log credentials, or introduce a queue/distributed
protocol.

The exact implementation scope is limited to `modules/news/api/**` excluding
canonical contracts and contract-only tests, `modules/news/application/**`, and
focused News scheduler tests. The worker may not change infrastructure,
Sentiment, Strategy, frontend, backend composition, contracts, migrations,
dependencies, credentials, arbitrary URL behavior, OpenSpec artifacts, or any
other source. A separate `INS-* / APPROVED_FOR_EXECUTION` must authorize the
worker and Manager; this decision does not itself start work or promote N-03.

Why: N-03's safe-fetch, extraction, retention, provenance, and neutral
Sentiment evidence is present, but its checkpoint explicitly records that only
the interval setting/default is exposed and no scheduler is implemented.
Closing N-03 without this bounded completion would claim an approved
auto-refresh requirement that the source does not prove.

Affected: `N-03A`, the residual N-03 closure review, the E1-to-E2 News
dependency, and the relevant News application/test boundary. Existing N-03
source history, contracts, migrations, Sentiment behavior, downstream task
state, and all deferred scope remain unchanged until a separately authorized
Manager checkpoint proves the packet.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md),
[ADR-009](../adr/ADR_009_controlled_llm_and_external_content.md),
[News capability spec](../../openspec/specs/news/spec.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[N-03 checkpoint](../implementation/HANDOFF.md), and
[INS-072](./INSTRUCTOR.md).

## DEC-015 — F-03 frontend packet-boundary closure review

Status: `APPROVED`

Authority: Instructor review after the `INS-089` bounded F-03 residual checkpoint
and independently audited commit `6a4e86e`

Decision: The F-03 screen projection implementation may be considered for packet
closure only at its approved frontend boundary: projection of supplied DTO/state,
explicit unavailable states for absent LLM and seeded-start transport, generic
descriptor/composite/search/paper/News metadata, and packet regression evidence.
The committed implementation does not claim real-provider, PostgreSQL,
feature-transport, browser/demo, or final all-requirements evidence; those remain
integration and final-demo gates owned by separately authorized `I-03`, `I-01`,
`AU-02`, and `I-02` work.

Why: The bounded F-03 source and tests now satisfy the local packet acceptance
without inventing transport or business logic, while the previous Manager
checkpoint was necessarily stale after the Instructor's exact audit commit. A
fresh governance-only Manager must reconcile `TASKS.md` and `HANDOFF.md` to the
commit before any state transition is treated as authoritative.

Affected: F-03 packet closure review, `TASKS.md`, `HANDOFF.md`, `INS-090`, and the
E3-to-E4 boundary. No source scope, requirement baseline, deferred scope, or
downstream authorization is changed by this decision.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
[F-03 authorization](./INSTRUCTOR.md), and commit `6a4e86e`.

## DEC-016 — F-03 checkpoint consistency gate

Status: `APPROVED`

Authority: Instructor review after the INS-091 governance-only checkpoint
reconciliation, preserved in commit `9ed13bc`

Decision: F-03 remains unaccepted for operational closure until the Manager
reconciles every current-state statement in `TASKS.md` and `HANDOFF.md`. The
top task table may not claim `DONE` while the current state-derivation section
claims `REVIEW / NEEDS_INSTRUCTOR_REVIEW`. A fresh governance-only Manager may
correct that contradiction against the already audited `6a4e86e` source/test
boundary, with no worker, source implementation, downstream promotion, or
change to any other task state.

Why: `TASKS.md` is the sole operational task-state authority, and an internal
contradiction makes the checkpoint non-authoritative even though the F-03
packet-local implementation and validation evidence are otherwise sufficient.
The correction is a control-plane reconciliation, not a new implementation or
permission to claim final integration, provider, database, or browser evidence.

Affected: F-03 closure reconciliation, `TASKS.md`, `HANDOFF.md`, and the
current Instructor HOLD. M-02, AU-02, I-01, I-02, I-03, final integration,
deferred scope, and all source contracts remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
[INS-092 HOLD](./INSTRUCTOR.md), and commit `9ed13bc`.

## DEC-017 — M-02 live-evidence closure boundary

Status: `APPROVED`

Authority: Instructor frontier review after the accepted F-03 checkpoint at
`b73d014`

Decision: M-02 may be reviewed for closure only through the existing Market
Data implementation and its bounded resilience evidence plus one truthful
public Binance realtime smoke. No source rework, transport/configuration
change, frontend change, or downstream promotion is included. If the live
provider is unavailable or the smoke cannot prove the required behavior, M-02
remains `REVIEW` with `UNVERIFIED` or `BLOCKED` evidence; fixtures and failed
connections are never promoted to PASS.

Why: M-02's implementation checkpoint and deterministic recovery tests are
present, but its task record still lacks accepted real-provider evidence. The
real Binance requirement is a final/runtime gate, while this bounded review
must keep that limitation explicit and preserve the later I-01 integration
boundary.

Affected: M-02 review closure, `TASKS.md`, `HANDOFF.md`, and the next
Instructor checkpoint. M-03, F-03, AU-02, I-01, I-02, I-03, and all deferred
scope remain unchanged and separately authorized.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Market Data spec](../../openspec/specs/market-data/spec.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), [INS-095 authorization](./INSTRUCTOR.md),
and commit `5160c1c`.

## DEC-018 — Human continuation decision for the AU-02 blocker

Status: `APPROVED`

Authority: Explicit user governance direction in the active Instructor task on
2026-08-30: continue the Level 2 loop autonomously until the MVP is complete,
with full decision authority within repository rules.

Decision: The Instructor may issue one fresh, bounded AU-02 security-integration
authorization after independently revalidating its dependencies, local
PostgreSQL/Auth environment, absence of active writers, and safe write scope.
This decision satisfies the previously recorded human-decision gate for
considering a new AU-02 attempt; it does not itself change task state, authorize
source edits, relax deferred scope, or permit a retry beyond the next explicit
authorization.

Why: AU-02 is the only predecessor blocking the remaining integration chain,
while the prior INS-021 bounded attempt produced no accepted ownership matrix
evidence and correctly stopped with `NEEDS_HUMAN_DECISION`. The user explicitly
directed the Instructor to continue rather than leave the program at that
checkpoint.

Affected: AU-02, I-01, I-02, I-03, and the next Instructor checkpoint. Existing
requirements, ownership rules, deferred scope, and all current task states
remain unchanged until a separately authorized Manager execution proves them.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), and [INS-096 HOLD](./INSTRUCTOR.md).

## DEC-019 — AU-02 attempt exhausted without acceptance

Status: `APPROVED`

Authority: Instructor review after the single bounded `INS-097` Manager/worker
attempt and the parent-audited checkpoint `6f83d3c`

Decision: The `INS-097` AU-02 attempt is closed at `REVIEW`, not `DONE`. Its
existing per-module evidence is retained as packet context, but the complete
cross-module two-user ownership matrix and applicable real PostgreSQL/Auth/Search
integration evidence remain unproven. No automatic retry, replacement,
duplicate worker, or downstream I-01/I-02/I-03 authorization follows from this
checkpoint.

Why: The sole authorized worker returned no source/test changes, while the
documented host database credential still failed authentication and Docker
Compose remained unavailable. Fixture or in-memory evidence cannot satisfy the
AU-02 acceptance boundary, and the repository rules require unavailable checks
to remain `BLOCKED`/`UNVERIFIED`.

Affected: AU-02, `TASKS.md`, `HANDOFF.md`, `INS-098 / HOLD`, and the remaining
integration DAG. Requirements, ownership rules, deferred scope, and all other
task states are unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-097`, and commit
`6f83d3c`.

## DEC-020 — AU-02 application database gate revalidated

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-098 / HOLD` at `8e73cb9`

Decision: The previously unavailable host PostgreSQL premise is no longer a
blocker for a fresh, explicit AU-02 completion authorization. The Instructor
may issue one bounded AU-02 authorization requiring the complete cross-module
ownership matrix and real Auth/Search integration. This decision is not an
automatic retry, does not reopen any other packet, and does not relax the
prohibition on duplicate workers, retries, scope expansion, or downstream work.

Why: The local Docker containers remain healthy and the documented password
from `infra/db/local.env` successfully authenticated read-only host connections
to the database names defined by `infra/docker-compose.yml`:
`cryptox_development` on port `55432` and `cryptox_test` on port `55433`.
`SELECT current_database()` returned the expected database name for both
connections. The password value was not printed or changed. Docker Compose CLI
availability remains `UNVERIFIED`, but direct documented PostgreSQL access is
now available for the AU-02 application-level gate.

Affected: AU-02 and `INS-099`. I-01, I-02, I-03, all deferred scope, the
requirements baseline, ownership rules, and all other task states remain
unchanged until the separately authorized Manager proves AU-02.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-098`, and commit
`8e73cb9`.

## DEC-021 — INS-099 AU-02 attempt held after concrete Search failure

Status: `APPROVED`

Authority: Fresh Instructor review after the completed `INS-099` Manager
checkpoint persisted at `49ca52e`

Decision: `INS-099` is exhausted at `AU-02 = REVIEW`, not `DONE`. The current
Instructor signal is `INS-100 / HOLD`. No automatic retry, replacement,
duplicate worker, downstream packet, or I-01/I-02/I-03 authorization follows
from this checkpoint. A later AU-02 remediation requires its own explicit
authorization after fresh review.

Why: The sole worker made no source/test changes. Real Auth PostgreSQL
integration passed `3/3`, but real Search reached PostgreSQL and failed at
`modules/search/application/integration.spec.ts:377` with
`completedCandidateCount = 0` instead of `1`. The complete cross-module
two-user ownership matrix remains unproven. Workspace and policy gates passed
with environment-gated skips, while Docker Compose, standalone `psql`, and
OpenSpec CLI remain `UNVERIFIED`; none of these facts supports an AU-02 `DONE`
claim.

Affected: AU-02, `TASKS.md`, `HANDOFF.md`, `INS-100`, and the remaining
integration DAG. All requirements, ownership rules, deferred scope, and other
task states remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-099`, and commit
`49ca52e`.

## DEC-022 — Fresh explicit AU-02 remediation authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-100 / HOLD` at `9d2d6d9`

Decision: The Instructor may issue exactly one new, bounded AU-02 remediation
authorization, recorded as `INS-101 / APPROVED_FOR_EXECUTION`, for the concrete
real Search integration failure and the still-missing cross-module ownership
matrix. This is not an automatic retry of `INS-099`; it does not authorize any
other packet, duplicate, replacement, second worker, or downstream work.

Why: The prior sole worker made no source/test changes, real Auth PostgreSQL
integration passed `3/3`, and real Search reached PostgreSQL but failed at
`modules/search/application/integration.spec.ts:377` with
`completedCandidateCount = 0` instead of `1`. Fresh redacted process-local
connectivity checks still pass for both documented local databases, so the
remediation has a safe application-level environment premise. The complete
two-user ownership matrix remains unproven and must not be inferred from
fixture-only evidence.

Affected: AU-02 and `INS-101`. I-01, I-02, I-03, all deferred scope, the
requirements baseline, ownership rules, and all other task states remain
unchanged until the new explicit attempt is independently reviewed.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-100`, and commit
`9d2d6d9`.

## DEC-023 — INS-101 AU-02 remediation accepted at DONE

Status: `APPROVED`

Authority: Independent Instructor review after the fresh INS-101 Manager
checkpoint and commit `422d47fad516f0e57930f91e3da88b22cb726183`

Decision: The bounded `INS-101` AU-02 remediation is accepted as `DONE`.
The Search lifecycle defect and the complete applicable two-user ownership /
trusted-identity matrix are evidenced by the reviewed Search source/tests,
real PostgreSQL Search integration, existing owner-focused module suites, and
the real Auth/backend smoke. The current Instructor signal is
`INS-102 / HOLD`; no downstream packet is authorized by this decision.

Why: The independently rerun Search regression passed `13/13`; the real
PostgreSQL Search integration passed `1/1` with the required completed-candidate
invariant; real PostgreSQL Auth passed `3/3`; backend Auth E2E passed `1/1`; and
serial `verify:stage4a` passed with `386` workspace tests and `6` explicit
environment-gated skips. The Manager recorded exactly one fresh Manager and
one fresh internal worker, made no retry, and stayed within the authorized
Search/application and checkpoint scope. The Manager's staging attempt was
denied by the Git ACL, so the Instructor committed the exact audited five-file
delta once at the cited commit. No assertion was weakened and no fixture
replaced the real Search database path.

Remaining environment limitations are retained as `UNVERIFIED`: Docker /
Compose, standalone `psql`, OpenSpec CLI, and local PDF text extraction. These
limitations do not change the accepted AU-02 evidence, but they must not be
reported as `PASS` or silently used to authorize unrelated work.

Affected: AU-02, `TASKS.md`, `HANDOFF.md`, `INS-102`, and the remaining
integration DAG. `I-01`, `I-02`, `I-03`, all deferred scope, requirements,
ownership rules, and other task states remain unchanged until separately
authorized.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-101`, and commit
`422d47fad516f0e57930f91e3da88b22cb726183`.

## DEC-024 — Fresh explicit I-01 integration authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-102 / HOLD` at `9f0841a`

Decision: The Instructor may issue exactly one bounded `INS-103 /
APPROVED_FOR_EXECUTION` for I-01 Runtime, Transports and Observability
Integration. The authorization is limited to one fresh same-directory Manager
and one fresh sequential internal worker, the backend integration boundary,
and the exact acceptance/validation/prohibitions recorded in `INSTRUCTOR.md`.
It does not authorize I-02, I-03, extension work, a retry, or any excluded
module/contract/migration/frontend change.

Why: AU-02 is independently accepted at `422d47f` and its governance HOLD is
persisted at `9f0841a`; all I-01 start dependencies are recorded `DONE` in
`TASKS.md`; the tracked checkout is clean; and no competing Cryptox execution
writer is active. Read-only live preflight reached Binance historical data and
CoinDesk RSS, while the unauthenticated CoinDesk JSON endpoint correctly
remains unavailable because no API key is configured. The latter is retained
as an environment limitation rather than treated as PASS, and I-01 must
select only a real configured News source or report the unavailable path
truthfully.

Affected: I-01, `TASKS.md`, `HANDOFF.md`, `INS-103`, and the baseline runtime
integration join. I-02 and I-03, all deferred scope, requirements, contracts,
accepted architecture, and all other task states remain unchanged until a
separate reviewed authorization.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`INS-102`, `DEC-007`, and commit `9f0841a`.

## DEC-025 — Strategy public composition seam after INS-103 review

Status: `APPROVED`

Authority: Fresh Instructor review after the completed `INS-103` Manager
checkpoint, independently audited and recorded at `7d686b6`

Decision: The `INS-103` I-01 attempt is accepted as an honest `REVIEW /
NEEDS_INSTRUCTOR_REVIEW` checkpoint, not as implementation completion. A new,
separate packet `I-01S` may be authorized to reconcile the missing
Strategy-owned public composition seam. The seam may expose a typed immutable
factory registry/composition helper from the public Strategy package entrypoint,
implemented through the Strategy API/application boundary and backed by the
already approved Strategy implementations. It must let backend composition
inject the existing `createStrategyModule` without deep-importing
`modules/strategy/domain/**` or duplicating algorithm code.

Why: The current public Strategy bootstrap accepts injected factories, while
the public entrypoint's default registry is empty and exposes no approved way
for the backend composition root to obtain the built-in and completed Lite
factories. The only concrete factories are under Strategy domain plugin paths,
which were intentionally excluded from `INS-103`. Deep imports or copies would
violate the synchronous modular-monolith dependency direction, Strategy's
registry ownership, and the exact I-01 scope. This is a source-reconciliation
boundary needed to realize already approved behavior, not a new product
feature, contract change, UI requirement, or authorization for downstream work.

Scope guard: `I-01S` is limited to `modules/strategy/api/**` and
`modules/strategy/application/**` plus focused tests, with no canonical REST/
WebSocket contract, plugin algorithm, persistence, migration, backend,
frontend, dependency, or deferred-scope change. `I-01` remains incomplete and
requires a separate fresh authorization after `I-01S` is independently
accepted. `I-02`, `I-03`, all extensions, retries, replacements, duplicates,
and downstream promotion remain unauthorized.

Affected: `I-01`, the new `I-01S` prerequisite, `TASKS.md`, `HANDOFF.md`,
`INS-104`, and the integration DAG. Requirements, approved functional image
amendments, accepted architecture, and all deferred-scope rules remain
unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Strategy specification](../../openspec/specs/strategy/spec.md),
[MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-103`, and commit
`7d686b6`.

## DEC-026 — INS-104 I-01S composition seam accepted at DONE

Status: `APPROVED`

Authority: Independent Instructor review after the completed `INS-104`
Manager checkpoint, with the exact audited source/checkpoint delta integrated
at `7d574e6`.

Decision: The bounded `INS-104` packet `I-01S` is accepted as `DONE`. The
Strategy public composition seam is now available through a typed immutable
`STRATEGY_FACTORIES` collection, preserves the approved factory descriptors,
profile identifiers, and function identity, and is proven compatible with
`createStrategyModule`. `I-01` remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and
requires a separate fresh authorization; `I-02`, `I-03`, all extensions,
retries, replacements, duplicates, and downstream packets remain
unauthorized.

Why: The Manager used exactly one fresh same-directory Manager and exactly one
fresh sequential internal worker, changed only the four authorized Strategy
source/test paths plus the two Manager checkpoint files, and stopped at the
authorized boundary. The Manager's single staging attempt was denied by the
Git ACL; the Instructor independently reviewed the exact six-path delta and
integrated it once at `7d574e6`. Focused Strategy tests passed `119/119`, and
the independent workspace `verify:stage4a` passed build, typecheck, `389`
workspace tests, architecture/dependency, artifact/source-sidecar,
deferred-scope, runtime-smoke, lint, test-scope `13/13`, secret/log,
whitespace, and exact-path checks. OpenSpec CLI, six environment-gated
PostgreSQL/integration/E2E tests, and real provider/browser/demo/final
integration evidence remain `UNVERIFIED` or `BLOCKED` and were not treated as
PASS.

Affected: `I-01S`, `I-01`, `TASKS.md`, `HANDOFF.md`, `INS-104`, and the
integration DAG. Requirements, approved functional image amendments, accepted
architecture, contracts, and all deferred-scope rules remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Strategy specification](../../openspec/specs/strategy/spec.md),
[MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-104`, and commit
`7d574e6`.

## DEC-027 — Fresh explicit I-01 resumption after I-01S acceptance

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-105 / HOLD` at `f656274`, with
the accepted I-01S implementation at `7d574e6`.

Decision: The Instructor authorizes exactly one fresh `INS-106 /
APPROVED_FOR_EXECUTION` attempt for `I-01 — Runtime, Transports and
Observability Integration`. The attempt is limited to one fresh same-directory
Manager in the canonical checkout, using `gpt-5.6-luna` with reasoning `max`,
and exactly one fresh sequential internal worker. The complete boundary,
acceptance gates, validation, prohibitions, and stop condition are recorded in
`INSTRUCTOR.md`. No I-02, I-03, extension, retry, replacement, duplicate,
worktree, or downstream packet is authorized.

Why: I-01S is independently accepted at `DONE`; its Strategy-owned immutable
`STRATEGY_FACTORIES` seam resolves the previous I-01 composition blocker while
preserving the approved contracts, algorithms, and dependency direction. The
task board shows `41 DONE`, `1 REVIEW` (`I-01`), and `2 BLOCKED` (`I-02`,
`I-03`); every I-01 start dependency is `DONE`; the tracked tree is clean at
the `INS-105` checkpoint; and active-task inspection found no competing
Cryptox Manager or worker. I-01 must still prove real backend composition,
ownership, persistence, provider, readiness, REST/market-WebSocket, and
observability behavior; unavailable environment evidence remains
`UNVERIFIED`/`BLOCKED`.

Affected: `I-01`, `TASKS.md`, `HANDOFF.md`, `INS-106`, and the integration DAG.
I-02, I-03, all extensions, deferred scope, requirements, contracts, accepted
architecture, and all other task states remain unchanged until separately
reviewed and authorized.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-105`, `DEC-026`, and
commits `f656274` and `7d574e6`.

## DEC-028 — INS-106 I-01 integration held after independent review

Status: `APPROVED`

Authority: Independent Instructor review after the fresh `INS-106` Manager
checkpoint, with the exact audited source and checkpoint delta integrated at
`0bab722`.

Decision: The bounded `INS-106` I-01 attempt is accepted as an honest
`REVIEW / NEEDS_INSTRUCTOR_REVIEW` checkpoint, not as `DONE`. The backend
runtime, REST transport, market-only WebSocket transport, readiness projection,
and observability boundary are reviewable and remain committed at `0bab722`.
The current Instructor signal is `INS-107 / HOLD`; no new implementation,
I-02, I-03, extension, retry, replacement, duplicate, or downstream packet is
authorized by this decision.

Why: The Manager used exactly one fresh same-directory Manager and exactly one
fresh sequential internal worker, stopped at the authorized `apps/backend/**`
and checkpoint boundary, and made no excluded-path or contract change. The
Instructor independently verified the exact 16-path delta, corrected one
trailing blank line before integration, and confirmed backend tests `15 passed /
1 skipped`; workspace build, typecheck, lint, and tests passed (`396 passed /
6 environment-gated skips`); artifacts, deferred-scope, test-scope `13/13`,
secret/log, whitespace, and exact-scope checks passed. The Manager's single
staging attempt was denied by the Git ACL and was not retried.

The packet cannot be promoted to `DONE` because real PostgreSQL/Docker,
configured Binance/CoinDesk, and browser/demo evidence remain
`BLOCKED`/`UNVERIFIED`; the current public module surface does not expose the
Backtesting bounded executor, Search generator composition, Strategy
PostgreSQL bootstrap, or Sentiment PostgreSQL bootstrap needed for truthful
production composition. `arch:check` still fails on 71 pre-existing
violations, and `runtime:smoke` fails because its legacy assertion expects the
old three-name readiness list while the implementation truthfully reports
seven required dependencies. OpenSpec CLI evidence remains `UNVERIFIED`.
These are explicit reconciliation/environment blockers, not permission to
expand I-01 into excluded `modules/**`, contracts, migrations, infrastructure,
frontend, or deferred scope.

Affected: `I-01`, `TASKS.md`, `HANDOFF.md`, `INS-107`, and the remaining
integration DAG. Requirements, approved functional image amendments, accepted
architecture, contracts, all completed packets, `I-02`, `I-03`, and deferred
scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-106`, `DEC-027`, and
commit `0bab722`.

## DEC-029 — Fresh explicit I-01R public seam reconciliation authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-107 / HOLD` at `b20c5e6`, with
the I-01 review recorded at `0bab722`.

Decision: The Instructor authorizes exactly one fresh `INS-108 /
APPROVED_FOR_EXECUTION` attempt for the new prerequisite packet `I-01R —
Public Module Bootstrap and Persistence Seam Reconciliation`. The attempt is
limited to one fresh same-directory Manager in the canonical checkout using
`gpt-5.6-luna` with reasoning `max`, and up to three fresh internal workers
with the explicitly disjoint scopes recorded in `INSTRUCTOR.md`. The packet
may reconcile only already approved public composition/persistence seams; it
does not authorize resumed I-01, I-02, I-03, extensions, retries,
replacements, duplicates, worktrees, or downstream execution.

Why: Independent I-01 review proved the backend transport boundary but found
concrete public-surface gaps that cannot be repaired inside the authorized
`apps/backend/**` boundary: the bounded local Backtesting executor and the
approved Search generators are not publicly composable, Strategy's existing
owner-scoped definitions/composites have no PostgreSQL adapter/bootstrap, and
the existing Sentiment PostgreSQL adapter is not exposed through its public
package entrypoint. The accepted architecture and already approved schema
support a bounded owner-review reconciliation without changing contracts,
migrations, algorithms, or product scope. The plan now records `I-01R` as a
separate prerequisite and the current checkout is clean apart from the
untouched app-generated `.codex/config.toml`; no Cryptox writer is active.

Affected: `I-01R`, `I-01`, `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, `INS-108`,
and the integration DAG. Requirements, approved functional image amendments,
accepted architecture, canonical contracts, completed packets, `I-02`,
`I-03`, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-107`, `DEC-028`, and
commit `b20c5e6`.

## DEC-030 — INS-108 I-01R held after independent seam review

Status: `APPROVED`

Authority: Independent Instructor review after the fresh `INS-108` Manager
checkpoint, with the exact audited source delta integrated at `9bbbfda`.

Decision: The bounded `I-01R` attempt is accepted as an honest
`REVIEW / NEEDS_INSTRUCTOR_REVIEW` checkpoint, not as `DONE`. The public
Backtesting, Search, Strategy, and Sentiment seams remain committed at
`9bbbfda`, and the current Instructor signal is `INS-109 / HOLD`. No I-01
resumption, I-02, I-03, extension, retry, replacement, duplicate, or
downstream packet is authorized by this decision.

Why: The Manager used exactly one fresh same-directory Manager and exactly
three fresh disjoint internal workers in the canonical checkout, stopped at
the authorized I-01R boundary, and made no excluded-path or contract/schema
change. The Instructor independently reviewed the exact source delta and
confirmed Backtesting `46/46`, Search `36 passed / 1 PostgreSQL-gated skip`,
Strategy `125 passed / 2 PostgreSQL-gated skips`, Sentiment `20/20`, root
workspace test/build/typecheck/lint success, artifact/source-sidecar,
test-scope `13/13`, secret/log, whitespace, exact-path, and diff checks. The
Manager's single Git staging attempt was denied by
`D:/agy-cli-projects/AOS/Cryptox/.git/index.lock` permission failure and was
not retried. The parent integrated only the independently audited delta once.

The packet cannot be promoted because `npm run scope:check` rejects the two
approved Search profile entries in the new public registry, `npm run
arch:check` reports 71 dependency violations including a new public
API/infrastructure boundary finding, and `npm run runtime:smoke` fails a stale
readiness assertion. Docker/local PostgreSQL validation is blocked, the two
live Strategy integration tests are skipped because `DATABASE_URL` is unset,
and OpenSpec CLI plus real provider/browser/demo/final runtime evidence remain
unverified. These are explicit reconciliation and environment blockers, not
permission to repair excluded paths within I-01R or to treat fixtures/skips as
live evidence.

Affected: `I-01R`, `I-01`, `TASKS.md`, `HANDOFF.md`, `INS-109`, and the
integration DAG. Requirements, approved functional image amendments, accepted
architecture, contracts, completed packets, `I-02`, `I-03`, and deferred scope
remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-108`, `DEC-029`, and
commit `9bbbfda`.

## DEC-031 — Fresh explicit ENV-05 validation and architecture reconciliation authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-109 / HOLD` at `b8c6f52`, with
the exact I-01R source delta independently integrated at `9bbbfda`.

Decision: The Instructor authorizes exactly one fresh `INS-110 /
APPROVED_FOR_EXECUTION` attempt for `ENV-05 — Validation and Architecture Gate
Reconciliation`. It is limited to one fresh same-directory Manager using
`gpt-5.6-luna` with reasoning `max`, and at most three fresh disjoint internal
workers with the scopes recorded in `INSTRUCTOR.md`. It authorizes no I-01R
closure, I-01 resumption, I-02, I-03, extension, retry, replacement, duplicate,
worktree, or downstream execution.

Why: Independent I-01R review found a false-positive Search profile boundary,
a stale readiness assertion, a checker configuration mismatch with the
documented allowlisted bootstrap facade, and concrete source dependency/cycle
findings. The approved architecture and `DEC-007` profiles require those
gates to remain strict and truthful; the reconciliation can be bounded to
the validation files, the explicitly named architecture/source paths, and
behavior-preserving plumbing. Live PostgreSQL/Docker, OpenSpec CLI, and real
provider/browser/demo evidence remain environmental limitations and must not be
masked by this packet.

Affected: `ENV-05`, `I-01R`, `I-01`, `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`,
`INS-110`, and the integration DAG. Requirements, approved functional image
amendments, accepted architecture, contracts, completed packets, `I-02`,
`I-03`, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `INS-109`, `DEC-030`, and
commit `b8c6f52`.

## DEC-032 — ENV-05 held after independent architecture-gate review

Status: `APPROVED`

Authority: Independent Instructor review after the `INS-110` Manager checkpoint
and exact integration at `5fc0bb2`.

Decision: Preserve the exact bounded ENV-05 worker output and Manager
checkpoint in commit `5fc0bb2`, but keep `ENV-05` at `REVIEW /
NEEDS_INSTRUCTOR_REVIEW`. The current task board remains authoritative with
`I-01R` and `I-01` in `REVIEW`, `ENV-05` in `REVIEW`, and `I-02`/`I-03` in
`BLOCKED`. No packet is promoted or started by this decision. Any remaining
architecture repair must receive a separate explicit Instructor authorization
with exact source/tooling scope; it may not be inferred from ENV-05.

Why: Independent validation confirmed the approved Search scope boundary and
runtime readiness contract (`13/13` scope cases; `/live=200`, `/ready=503`,
`/health=404`), behavior-preserving source plumbing, `409` workspace tests
passed with `8` environment-gated skips, typecheck/build/lint/artifact and
diff checks passed. The unchanged active architecture rules still report `28`
application-to-own-API violations, including files outside ENV-05's authorized
paths. That is a real gate failure, not evidence to weaken the checker. Local
Docker/PostgreSQL is `BLOCKED`, and the unavailable OpenSpec CLI is
`UNVERIFIED`.

Affected: `ENV-05`, `I-01R`, `I-01`, `I-02`, `I-03`, `TASKS.md`,
`HANDOFF.md`, and the next Instructor authorization. Requirements, approved
functional image amendments, accepted ADRs, completed packet states, and
deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `DEC-031`, `INS-110`, and
commit `5fc0bb2`.

## DEC-033 — Fresh explicit ENV-06 application-boundary reconciliation authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-111 / HOLD` at `17db62f`, the
integrated ENV-05 checkpoint `5fc0bb2`, and the independent `arch:check` result.

Decision: The Instructor authorizes exactly one fresh `INS-112 /
APPROVED_FOR_EXECUTION` attempt for `ENV-06 — Remaining Application Contract
Boundary Reconciliation`. It is limited to one fresh same-directory Manager
using `gpt-5.6-luna` with reasoning `max` and exactly three fresh disjoint
internal workers with the module scopes recorded in `INSTRUCTOR.md`. It
authorizes no ENV-05 retry, I-01R closure, I-01 resumption, I-02, I-03,
extension, replacement, duplicate, worktree, or downstream execution.

Why: ENV-05 truthfully repaired its authorized scope, but the strict active
architecture gate still reports `28` application-to-own-API dependencies in
the Backtesting, Search, News, Market Data, and Leaderboard application
boundaries. The remaining source reconciliation is necessary to satisfy the
accepted `api -> application -> domain` layering and must preserve public
exports and behavior. Changing the checker to hide type-only edges, lowering
severity, or adding a broad allowlist is not approved.

Affected: `ENV-06`, `ENV-05`, `I-01R`, `I-01`, `MVP_PLAN.md`, `TASKS.md`,
`HANDOFF.md`, `INS-112`, and the integration DAG. Requirements, approved
functional image amendments, accepted ADRs, contracts, completed packet
states, `I-02`, `I-03`, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[ADR-005](../adr/ADR_005_module_first_structure.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `DEC-032`, `INS-111`, and
commit `17db62f`.

## DEC-034 — ENV-06 accepted; HOLD after live PostgreSQL review

Status: `APPROVED`

Authority: Independent Instructor review of the `INS-112` Manager checkpoint,
the exact ENV-06 integration commit `d274f52`, and newly available local
Docker/PostgreSQL evidence.

Decision: Preserve ENV-06 as `DONE` with its exact audited 23-file source
boundary reconciliation and Manager checkpoint in `d274f52`. Keep the current
Instructor signal at `HOLD`; do not close I-01R or resume I-01. A live
PostgreSQL run exposed one reproducible Strategy persistence defect outside the
ENV-06 changed paths: the existing Strategy integration test fails at
`modules/strategy/infrastructure/postgres.ts:637` with `NOT_FOUND` when a valid
same-owner composite is inserted. This requires a separately authorized,
single-purpose ENV-07 packet.

Why: ENV-06 independently passes the strict architecture checker (0
violations), deferred-scope checker (13/13), scope/artifact/runtime-smoke,
focused affected-module tests, build, typecheck, lint, whitespace, exact-path,
and source review. Docker Compose `v2.40.3` is now reachable and local
migration validation passes (`up`, constraints, `down`, remigrate). With a
process-local test URL, Auth persistence (3/3), Market Data persistence (1/1),
Search Q-01 integration (1/1), and backend Auth E2E (1/1) pass. The Strategy
failure is reproducible in a targeted rerun and no Strategy path is changed by
ENV-06; it is therefore a separate validation blocker, not permission to
expand ENV-06 or to treat the full suite as PASS.

Affected: `ENV-06`, `ENV-07`, `I-01R`, `I-01`, `MVP_PLAN.md`, `TASKS.md`,
`HANDOFF.md`, `INS-113`, and the integration DAG. Requirements, approved
functional image amendments, accepted ADRs, public contracts, completed packet
states, `I-02`, `I-03`, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [ADR-005](../adr/ADR_005_module_first_structure.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `DEC-033`, `INS-112`, and
commit `d274f52`.

## DEC-035 — Fresh explicit ENV-07 Strategy persistence authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-113 / HOLD` at `391d639`, the
integrated ENV-06 checkpoint `d274f52`, and reproducible local PostgreSQL
evidence.

Decision: Authorize exactly one fresh `INS-114 /
APPROVED_FOR_EXECUTION` attempt for `ENV-07 — Strategy PostgreSQL Composite
Persistence Reconciliation`. The authorization is limited to one fresh
same-directory Manager using `gpt-5.6-luna` with reasoning `max` and exactly
one fresh internal worker. The worker's implementation scope is limited to
`modules/strategy/infrastructure/postgres.ts` and, only if strictly required
for a focused regression assertion,
`modules/strategy/infrastructure/postgres.integration.spec.ts`. The Manager
may add and operate only the new ENV-07 row and latest checkpoint, and may
review/integrate only the exact authorized source delta.

Why: Docker Compose `v2.40.3` is reachable and local migration validation
passes. A targeted real PostgreSQL Strategy integration reproducibly fails a
valid same-owner composite insert because the existing `componentPayload`
emits camelCase JSON keys while `jsonb_to_recordset` reads snake_case fields,
returning `NOT_FOUND` at `modules/strategy/infrastructure/postgres.ts:637`.
The defect is outside ENV-06's exact changed paths and blocks truthful
acceptance of the persistence prerequisite. The packet repairs only that
mapping and must prove same-owner persistence, exact component versions,
owner filtering, and cross-owner rejection without changing schema,
contracts, ownership, provenance, or algorithm behavior.

Prohibitions: no ENV-06 retry, I-01R closure, I-01 resumption, I-02, I-03,
extension, migration/schema change, API/DTO redesign, checker change, broad
skip, unrelated cleanup, retry, replacement, duplicate, worktree, or
downstream execution. Any unavailable tool or environment is `BLOCKED` or
`UNVERIFIED`, never `PASS`; OpenSpec CLI is not assumed available.

Affected: `ENV-07`, `ENV-06`, `I-01R`, `I-01`, `MVP_PLAN.md`, `TASKS.md`,
`HANDOFF.md`, `INS-114`, and the integration DAG. Requirements, approved
functional image amendments, accepted ADRs, public contracts, completed
packet states, `I-02`, `I-03`, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [ADR-005](../adr/ADR_005_module_first_structure.md),
[MVP plan](../implementation/MVP_PLAN.md), [Task state](../implementation/TASKS.md),
[Latest checkpoint](../implementation/HANDOFF.md), `DEC-034`, `INS-113`, and
commit `391d639`.

## DEC-036 — ENV-07 held after independent integration review

Status: `APPROVED`

Authority: Independent Instructor review after the `INS-114` Manager
checkpoint, the exact ENV-07 source/control integration at `6653191`, and
fresh local Docker/PostgreSQL validation.

Decision: Preserve the exact Strategy PostgreSQL JSON-key reconciliation and
the Manager checkpoint in commit `6653191`, but keep `ENV-07` at
`REVIEW / NEEDS_INSTRUCTOR_REVIEW` and replace the current signal with
`INS-115 / HOLD`. The real assertions pass, but the focused integration
command remains nonzero because its existing `afterAll` cleanup deletes
fixture users before `composite_components`, violating the
`composite_components_strategy_fk` foreign key. The cleanup is a separate
single-purpose authorization. Do not close `I-01R`, resume `I-01`, start
`I-02`/`I-03`, or promote any extension packet.

Why: The source delta is within the approved ENV-07 boundary and independently
preserves the existing camelCase payload, version/provenance behavior,
owner-filtered reads, cross-owner rejection, schema, contracts, and
algorithms. Real local PostgreSQL proves `2/2` ENV-07 assertions. Independent
non-DB gates, local migration validation, and the deferred-scope `13/13`
suite pass, while the teardown failure is a genuine required-test failure,
not a reason to weaken the checker or broaden the packet. OpenSpec CLI is
`UNVERIFIED`; the Manager's staging attempt was blocked by Git ACL and the
already-reviewed exact delta was integrated once by the Instructor.

Affected: `ENV-07`, `I-01R`, `I-01`, `I-02`, `I-03`, `MVP_PLAN.md`, `TASKS.md`,
`HANDOFF.md`, `INS-114`, `INS-115`, and the integration DAG. Requirements,
approved functional image amendments, accepted ADRs, completed packet states,
and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-035`, `INS-114`, and commit `6653191`.

## DEC-037 — Fresh ENV-08 teardown authorization with conditional ENV-07 closure

Status: `APPROVED`

Authority: Independent Instructor review at `INS-115 / HOLD`, the integrated
ENV-07 checkpoint `6653191`, and the reproducible local PostgreSQL teardown
failure recorded in the ENV-07 handoff.

Decision: Authorize exactly one fresh `INS-116 /
APPROVED_FOR_EXECUTION` attempt for `ENV-08 — Strategy PostgreSQL Integration
Teardown Reconciliation`, using one same-directory `gpt-5.6-luna` Manager with
reasoning `max` and exactly one fresh internal worker. The worker may edit only
`modules/strategy/infrastructure/postgres.integration.spec.ts` and only the
existing `afterAll` deletion ordering needed to remove dependent composite
rows before referenced definitions/users. The Manager may add and operate only
the ENV-08 task row and checkpoint, and may move ENV-07 from `REVIEW` to `DONE`
only after the focused real integration exits cleanly and proves the full
ENV-07 acceptance. No other task may move or start.

Why: ENV-07's production mapping repair is independently reviewed and
integrated, and its two real behavior assertions pass. The required focused
command remains nonzero solely because the unchanged teardown deletes fixture
users before `composite_components`, violating
`composite_components_strategy_fk`. This is a narrow test-harness defect that
blocks truthful ENV-07 acceptance and must be repaired under a separate
authorization; it is not permission to alter production source, schema,
contracts, ownership, algorithms, checkers, or unrelated cleanup. Local
migration validation and all other applicable gates pass; OpenSpec CLI remains
`UNVERIFIED` unless available.

Prohibitions: no ENV-07 source changes, migration/schema changes, API/DTO
redesign, assertion weakening, broad skip, retry, replacement, duplicate,
worktree, I-01R closure, I-01, I-02, I-03, extension, downstream, or final/demo
claim. Fast/priority service tier is required for the internal worker when the
subagent tool exposes it; unavailable environments remain `BLOCKED` or
`UNVERIFIED`.

Affected: `ENV-08`, `ENV-07`, `I-01R`, `I-01`, `I-02`, `I-03`, `MVP_PLAN.md`,
`TASKS.md`, `HANDOFF.md`, `INS-115`, `INS-116`, and the integration DAG.
Requirements, approved functional image amendments, accepted ADRs, the
integrated ENV-07 source, completed packet states, and deferred scope remain
unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-036`, `INS-115`, and commit `6653191`.

## DEC-038 — ENV-08 and ENV-07 accepted; HOLD before I-01R review

Status: `APPROVED`

Authority: Independent Instructor review after the `INS-116` Manager
checkpoint, the exact ENV-08/ENV-07 integration at `09ba93b`, and fresh local
Docker/PostgreSQL evidence.

Decision: Accept the bounded ENV-08 teardown reconciliation and the conditional
ENV-07 closure as `DONE` in the operational board. Replace the current signal
with `INS-117 / HOLD`. Preserve the exact source/test/control changes and
evidence, but do not close `I-01R`, resume `I-01`, start `I-02`/`I-03`, or
promote any extension/downstream packet without a fresh authorization.

Why: The worker changed only the authorized integration-test teardown ordering;
the production Strategy source and assertions remain unchanged. Independent
local PostgreSQL execution passed both tests (`2/2`, exit `0`) and proved the
ENV-07 ownership, version, and persistence behavior with no teardown FK error.
Strategy unit `5/5`, workspace `409` passed with `8` expected environment-gated
skips, build/typecheck/lint, architecture, scope, deferred-scope `13/13`,
artifacts, runtime smoke, migration validation, and hygiene checks all pass.
OpenSpec CLI is `UNVERIFIED`. The Manager's single Git staging attempt was
ACL-blocked; the Instructor integrated the exact reviewed delta once.

Affected: `ENV-08`, `ENV-07`, `ENV-05`, `I-01R`, `I-01`, `I-02`, `I-03`,
`MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, `INS-116`, `INS-117`, and the
integration DAG. Requirements, approved functional image amendments, accepted
ADRs, completed packet states, integrated Strategy source, and deferred scope
remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-037`, `INS-116`, and commit `09ba93b`.

## DEC-039 — Fresh ENV-05 and I-01R closure-validation authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-117 / HOLD` at `5c215d0`, the
integrated reconciliation chain `9bbbfda`, `5fc0bb2`, `d274f52`, `6653191`,
and `09ba93b`, plus current independent validation of the strict repository
gates.

Decision: Authorize exactly one fresh `INS-118 /
APPROVED_FOR_EXECUTION` Manager attempt in the canonical same-directory
checkout for closure validation of exactly `ENV-05` and `I-01R`. The Manager
may update only their existing rows and the latest `HANDOFF.md`; it may move
either row from `REVIEW` to `DONE` only after all current bounded evidence
passes. Authorize exactly one fresh read-only internal verifier with no write
scope. No implementation worker, source change, new task row, I-01
resumption, I-02/I-03, extension, deferred, downstream, retry, replacement,
duplicate, or worktree is authorized.

Why: The original ENV-05/I-01R review blockers have since received separate,
explicit reconciliations: the approved Search boundary and runtime smoke were
made truthful, the strict architecture finding set was repaired, and the
Strategy PostgreSQL mapping plus teardown now pass real local integration. The
current independent checks report scope/deferred `13/13`, zero architecture
violations, correct runtime readiness semantics, focused public-seam tests,
workspace `409` passed with `8` expected environment-gated skips,
build/typecheck/lint, and hygiene checks passing. This authorization only
permits evidence-based closure of the already implemented packets; it does
not infer or grant the next I-01 implementation scope. OpenSpec CLI remains
`UNVERIFIED` while unavailable, and unavailable external evidence must remain
`UNVERIFIED`/`BLOCKED`.

Affected: `ENV-05`, `I-01R`, `I-01`, `I-02`, `I-03`, `MVP_PLAN.md`, `TASKS.md`,
`HANDOFF.md`, `INS-117`, `INS-118`, and the integration DAG. Requirements,
approved functional image amendments, accepted ADRs, integrated source,
completed packets, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-038`, `INS-117`, and commit `5c215d0`.

## DEC-040 — ENV-05 and I-01R accepted; HOLD before I-01 review

Status: `APPROVED`

Authority: Independent Instructor review after the fresh `INS-118` Manager
checkpoint, exact integration at `1fab40d`, current deterministic validation,
and fresh local Docker/PostgreSQL evidence.

Decision: Accept exactly the bounded `ENV-05` and `I-01R` closure transitions
from `REVIEW` to `DONE` under `INS-118`, preserve the Manager's operational
checkpoint, and replace the signal with `INS-119 / HOLD`. Do not resume `I-01`,
start `I-02`/`I-03`, promote any extension, or infer final/demo acceptance
without a separate fresh authorization.

Why: The Manager changed only the two authorized task rows and latest handoff;
the source/business tree remained unchanged. Independent review confirmed the
four public seams, scope/deferred `13/13`, strict architecture `0`, correct
runtime smoke, workspace `409` passed with `8` expected environment-gated
skips, build/typecheck/lint, artifacts, secret/log, exact-path, whitespace,
and diff checks. Fresh Instructor execution additionally confirmed local
migration validation and Strategy PostgreSQL integration `2/2`, exit `0`,
including owner/version/provenance, cross-owner rejection, and clean teardown.
The single authorized verifier timed out and was closed, so its result remains
`UNVERIFIED`; it was not used as a PASS. OpenSpec CLI and external
provider/browser/demo/final evidence remain `UNVERIFIED`/`BLOCKED` where
unavailable. The next safe action is a new Instructor review of `I-01`, not an
automatic promotion.

Affected: `ENV-05`, `I-01R`, `I-01`, `I-02`, `I-03`, `MVP_PLAN.md`, `TASKS.md`,
`HANDOFF.md`, `INS-118`, `INS-119`, and the integration DAG. Requirements,
approved functional image amendments, accepted ADRs, integrated source,
completed packet states, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-039`, `INS-118`, and commit `1fab40d`.

## DEC-041 — Fresh explicit I-01 runtime integration authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-119 / HOLD` at `2462f18`, the
accepted `I-01R`/ENV validation chain through `1fab40d`, and inspection of the
current backend runtime frontier.

Decision: Authorize exactly one fresh `INS-120 /
APPROVED_FOR_EXECUTION` attempt for `I-01 — Runtime, Transports and
Observability Integration`. It is limited to one fresh same-directory Manager
and exactly one fresh sequential internal worker with the backend scope
recorded in `INSTRUCTOR.md`. The worker may repair only the already approved
backend composition boundary in `apps/backend/**`, with the narrowly
conditional WebSocket dependency allowance already present in the packet. No
I-02, I-03, extension, deferred, retry, replacement, duplicate, worktree, or
downstream execution is authorized.

Why: All I-01 prerequisites are now independently accepted, including the
public Backtesting/Search/Strategy/Sentiment seams, strict architecture and
deferred-scope gates, Strategy persistence/integration, and local migration
validation. The current backend implementation remains a real bounded frontier:
its runtime defaults still leave the public Search, Backtesting, and
PostgreSQL Strategy/Sentiment paths unavailable or in-memory and its readiness
details retain the pre-reconciliation limitation. A fresh backend-only
implementation can compose the approved modules while preserving contracts,
trusted identity, market-only WebSocket, failure visibility, and deferred-scope
boundaries. Real database/provider/browser evidence must be reported honestly
where unavailable and cannot be replaced by fixtures or skips.

Affected: `I-01`, `I-02`, `I-03`, `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`,
`INS-119`, `INS-120`, and the integration DAG. Requirements, approved
functional image amendments, accepted ADRs, contracts, completed packets,
integrated module source, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-040`, `INS-119`, and commit `2462f18`.

## DEC-042 — I-01 runtime integration accepted to closure review; HOLD

Status: `APPROVED`

Authority: Independent Instructor review after the fresh `INS-120` Manager
checkpoint, exact source/control integration at `5e06fdf`, current workspace
gates, local PostgreSQL/migration evidence, real Binance historical/realtime
evidence, and the bounded HTTP runtime smoke.

Decision: Accept the exact in-scope I-01 backend implementation delta from
`INS-120` at `5e06fdf` for closure review, preserve the operational `I-01`
row at `REVIEW`, and replace the current signal with `INS-121 / HOLD`. No
I-02, I-03, extension, deferred, downstream, retry, replacement, duplicate,
or final/demo implementation is authorized. A separate fresh Instructor
signal is required before a Manager may update I-01 to `DONE`.

Why: The integrated delta is limited to the authorized backend boundary and
its Manager-owned checkpoint artifacts. Independent checks now pass for the
deterministic workspace gates, real local PostgreSQL Auth/application flows,
migrations, configured runtime readiness, real Binance historical/realtime
providers, and HTTP Auth → manual backtest → SearchRun behavior. CoinDesk
live News remains `BLOCKED/UNVERIFIED` because the public endpoint requires
credentials that are not configured; OpenSpec CLI and browser/final-demo
evidence remain `UNVERIFIED` where unavailable. Those limitations must be
reported truthfully and evaluated at their own final-verification boundary,
not silently converted to PASS or used to broaden this HOLD.

Affected: `I-01`, `I-02`, `I-03`, `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`,
`INS-120`, `INS-121`, and the integration DAG. Requirements, approved
functional image amendments, accepted ADRs, contracts, completed packets,
integrated source, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-041`, `INS-120`, and commit `5e06fdf`.

## DEC-043 — Fresh I-01 closure-validation authorization

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-121 / HOLD` at `0419f5f`, the
integrated I-01 implementation at `5e06fdf`, current deterministic gates,
local PostgreSQL/migration validation, real Binance historical/realtime
evidence, and the bounded HTTP runtime smoke.

Decision: Authorize exactly one fresh `INS-122 /
APPROVED_FOR_EXECUTION` Manager in the canonical same-directory checkout to
perform closure validation of exactly the existing `I-01` task. Authorize
exactly one fresh sequential internal read-only verifier with no write scope;
authorize no implementation worker. The Manager may update only the existing
I-01 row and latest `HANDOFF.md`, moving I-01 from `REVIEW` to `DONE` only
when the applicable core acceptance evidence is independently confirmed.
No I-02, I-03, extension, deferred, downstream, retry, replacement,
duplicate, worktree, or final/demo implementation is authorized.

Why: The backend source now composes the approved public seams and has passed
the real local PostgreSQL, migration, Binance, readiness, Auth/ownership,
manual-backtest, and SearchRun checks required for the I-01 integration
boundary. CoinDesk live News remains `BLOCKED/UNVERIFIED` because no
credential is configured and the endpoint returned HTTP 401; OpenSpec CLI and
browser/final-demo evidence remain `UNVERIFIED` where unavailable. The plan
explicitly treats missing News credentials as a live smoke/demo limitation,
not permission to claim PASS or select a mock final provider; those obligations
remain for the later integration/final boundary. The closure Manager must
preserve those truthful statuses and stop at I-01.

Affected: `I-01`, `I-02`, `I-03`, `TASKS.md`, `HANDOFF.md`, `INS-121`,
`INS-122`, and the integration DAG. Requirements, approved functional image
amendments, accepted ADRs, contracts, integrated source, completed packets,
and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-042`, `INS-121`, and commit `5e06fdf`.

## DEC-044 — I-01 closure accepted; HOLD before I-03

Status: `APPROVED`

Authority: Independent Instructor review after the fresh `INS-122` closure
Manager checkpoint, the exact Manager delta in `TASKS.md`/`HANDOFF.md`, the
unchanged I-01 source at `5e06fdf`, and the current repository/control-plane
audit.

Decision: Accept the authorized `I-01 REVIEW → DONE` transition. The
authoritative board is now exactly 49 rows: `47 DONE` and `I-02`/`I-03`
`BLOCKED`. Replace the current signal with `INS-123 / HOLD`; authorize no
implementation or downstream work from this decision. The Manager's single
explicit commit attempt was denied by the `.git/index.lock` permission error;
the exact two-file Manager delta must be preserved when the Instructor creates
the governance checkpoint commit, without staging `.codex/config.toml`.

Why: The closure review found no source/business drift and no scope leakage.
The authorized recorded PostgreSQL/application, migration, Binance,
configured-runtime, HTTP, workspace, architecture, artifacts, scope, and
deferred-scope evidence remains valid. The one fresh read-only verifier timed
out and is recorded `UNVERIFIED` without retry or replacement. Current
Docker/Compose and sandbox Binance reruns, CoinDesk News without credentials,
OpenSpec CLI, and browser/final-demo evidence remain `BLOCKED`/`UNVERIFIED`;
none is claimed as PASS, and no mock provider is used as final evidence.

Next frontier: `I-03` is the only candidate because its recorded extension
dependencies and baseline `I-01` are DONE. This decision does not authorize
I-03. A fresh Instructor review and separate bounded `INS-* /
APPROVED_FOR_EXECUTION` signal are required before creating its one fresh
same-directory Manager, with worker scopes, real-provider obligations, and
stop conditions explicitly stated.

Affected: `I-01`, `I-02`, `I-03`, `TASKS.md`, `HANDOFF.md`, `INS-122`,
`INS-123`, and the integration DAG. Requirements, approved functional image
amendments, accepted ADRs, contracts, completed packets, integrated source,
and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-043`, `INS-122`, and commit `5e06fdf`.

## DEC-045 — Authorize I-03 boundary integration and reproducibility proof

Status: `APPROVED`

Authority: Fresh Instructor review after `INS-123 / HOLD` at the governance
checkpoint `b5def95`, independent acceptance of I-01 as `DONE`, verification of
the current 49-row task board, the I-03 dependency DAG, the integrated source
checkpoint `5e06fdf`, and the absence of active competing Cryptox tasks.

Decision: Authorize exactly one fresh `INS-124 /
APPROVED_FOR_EXECUTION` Manager in the canonical same-directory checkout for
exactly the existing `I-03` packet. Authorize exactly one sequential internal
implementation worker with the bounded `apps/backend/**`/thin transport/I-03
integration-test scope, followed by at most one sequential read-only verifier.
The Manager alone may update only the I-03 operational row and latest
`HANDOFF.md`; all feature implementation must be delegated to that one worker.
No I-02 or other task, extension, deferred scope, retry, replacement,
duplicate, worktree, user-visible task, or manual approval is authorized.

Why: `C-02`, all recorded E1/E2/E3 extension packets, baseline `I-01`, and
`AU-02` are now `DONE`, making I-03 the only safe frontier before final I-02.
The packet must prove public boundary joins, ownership, market-only realtime
delivery, practical provenance, seeded reproducibility, generated results,
failure isolation, and final-provider preflight without changing module
algorithms, persistence, contracts, migrations, frontend, or deferred scope.
Real configured Binance/PostgreSQL/News obligations remain explicit. CoinDesk
401 without credentials, unavailable Docker Compose/OpenSpec/browser evidence,
or sandbox network failures remain `BLOCKED`/`UNVERIFIED`; fixtures, skips, and
mock providers cannot be promoted to final PASS. If an applicable I-03 gate
cannot be proven, the Manager must leave I-03 at `REVIEW` and report the exact
blocker.

Affected: `I-03`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-123`, `INS-124`, and
the integration DAG. Requirements, approved functional image amendments,
accepted ADRs, contracts, completed packets, integrated source, and deferred
scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-044`, `INS-123`, and commit `b5def95`.

## DEC-046 — I-03 interrupted by usage-limit system error; HOLD

Status: `APPROVED`

Authority: Independent Instructor review after the single Manager authorized by
`INS-124 / DEC-045` and its single sequential implementation worker both
terminated with the same Codex usage-limit system error before the Manager
produced a review handoff.

Decision: Supersede `INS-124 / APPROVED_FOR_EXECUTION` with
`INS-125 / HOLD`. Preserve the operational `I-03 IN_PROGRESS` state because
the task was interrupted, not completed; do not manually change
`TASKS.md`/`HANDOFF.md` task state. Preserve the worker-produced
`apps/backend/src/i03.boundary.integration.spec.ts` artifact in its authorized
backend test scope. Authorize no I-02 or other work from this HOLD.

Evidence: the preserved I-03 artifact passes its focused `4/4` Vitest suite
and backend TypeScript no-emit compilation, but it has not received Manager
review, scope reconciliation, or checkpoint acceptance. The Manager and
worker did not produce a final report or commit. The remaining tracked delta is
the one Manager-owned I-03 row; `.codex/config.toml` remains untouched and
unstaged. Existing real-provider, Docker/Compose, CoinDesk News, OpenSpec CLI,
and browser/demo limitations remain `BLOCKED`/`UNVERIFIED` exactly as recorded;
no unavailable check is promoted to PASS.

Recovery boundary: a future fresh Instructor signal may authorize one explicit
recovery/reconciliation Manager after verifying that no active Manager/worker
exists. That signal must distinguish review/integration of this interrupted
artifact from a retry, must define whether any new implementation worker is
actually necessary, and must preserve all original I-03 scope/prohibitions.
No recovery Manager, worker, retry, replacement, duplicate, or downstream task
is authorized by this decision itself.

Affected: `I-03`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-124`, `INS-125`, and
the integration DAG. Requirements, approved functional image amendments,
accepted ADRs, contracts, completed packets, and deferred scope remain
unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-045`, `INS-124`, and commit `9601d77`.

## DEC-047 — Authorize one I-03 recovery/reconciliation Manager

Status: `APPROVED`

Authority: Independent Instructor review after the account/quota environment
was restored and the prior INS-124 Manager plus its one implementation worker
were verified terminal. The current repository remains at `db9898b` with the
expected interrupted delta: one Manager-owned I-03 row modified in
`TASKS.md`, the preserved authorized worker artifact
`apps/backend/src/i03.boundary.integration.spec.ts`, and untouched
app-generated `.codex/config.toml`.

Decision: Issue `INS-126 / APPROVED_FOR_EXECUTION` for exactly one fresh Manager
in the canonical same-directory checkout to review and reconcile the preserved
I-03 artifact. This is not a retry, replacement, duplicate, or reimplementation
of the terminal INS-124 worker. The recovery Manager may independently inspect
and validate the artifact, stage/commit it if accepted, and update only the
existing I-03 operational row and latest `HANDOFF.md`. No new implementation
worker is authorized; at most one sequential internal read-only verifier with
write scope `none` may be used. If the artifact is insufficient, the Manager
must leave I-03 at `REVIEW` and report `NEEDS_INSTRUCTOR_REVIEW` rather than
retrying the worker.

Evidence: the 49-row board is `47 DONE`, `I-03 IN_PROGRESS`, `I-02 BLOCKED`,
with all recorded I-03 dependencies `DONE`; no active Cryptox Manager/worker
exists; the artifact's focused suite is `4/4`; backend/workspace validation
gates are recorded as passed where run; and unavailable OpenSpec, live-provider,
credential, Docker/Compose, browser/demo checks remain `UNVERIFIED`/`BLOCKED`.
I-02 remains blocked and receives no authorization from this decision.

Affected: `I-03`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-125`, `INS-126`, and
the I-03 recovery checkpoint. Requirements, approved functional image
amendments, accepted ADRs, contracts, architecture, data model, and deferred
scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-046`, `INS-125`, and commit `db9898b`.

## DEC-048 — I-03 independently accepted; HOLD before I-02

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh recovery Manager
under `INS-126 / DEC-047` completed and became idle. The Manager commit is
`223fc1b91baf83944d19f9dad57c151fe8bf5d7c` on `MVP_IMPLEMENTATION`.

Decision: Accept I-03's `IN_PROGRESS -> REVIEW -> DONE` transition and supersede
`INS-126 / APPROVED_FOR_EXECUTION` with `INS-127 / HOLD`. The commit contains
exactly the preserved I-03 integration test artifact, the I-03 row in
`TASKS.md`, and the latest `HANDOFF.md`; no other task or source path changed.
Keep I-02 explicitly `BLOCKED`. A separate future Instructor authorization is
required before I-02 may move to `READY` or start.

Evidence: the final board is exactly 49 rows, `48 DONE` and `I-02 BLOCKED`;
the only remaining worktree item is untouched app-generated
`.codex/config.toml`; no active Manager/worker/verifier or downstream task
exists. Independent focused I-03 tests are `4/4`; full workspace tests are
`415 passed / 8 expected PostgreSQL-gated skips`; build/typecheck/lint,
architecture (`182 modules / 579 dependencies`), artifact/deferred/scope
(`13/13`), runtime smoke, whitespace, and diff checks pass. Prior real
PostgreSQL/Binance evidence is carried forward only because source/business
state is unchanged. Current Docker/PostgreSQL, live provider, News credential,
OpenSpec, and browser/demo checks remain `BLOCKED`/`UNVERIFIED`; fixtures are
not promoted to final evidence.

Affected: `I-03`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-126`, `INS-127`, and
the final integration checkpoint. Requirements, functional image amendments,
accepted ADRs, contracts, architecture, data model, and deferred scope remain
unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-047`, `INS-126`, and commit `223fc1b`.

## DEC-049 — Authorize I-02 final E2E/demo verification

Status: `APPROVED`

Authority: Instructor review after I-03 was independently accepted under
`INS-127 / DEC-048`, the repository returned to HOLD, I-01/I-03 were verified
`DONE`, and the final packet was re-read from `MVP_PLAN.md`/`TASKS.md`.

Decision: Issue exactly one fresh Manager authorization
`INS-128 / APPROVED_FOR_EXECUTION` for the existing final I-02 packet. The
Manager may use at most three disjoint internal reviewer/test children in
parallel, with dedicated backend/frontend test scopes and either README-only
traceability or a read-only verifier. No feature redesign, deferred scope,
second Manager, duplicate, retry, replacement, worktree, or downstream task is
authorized. I-02 alone may move through the normal operational states; the
Manager owns its task row and latest handoff.

Evidence: current HEAD is `a58530f` on `MVP_IMPLEMENTATION`, with only the
untouched app-generated `.codex/config.toml` untracked; the board is exactly 49
rows, `48 DONE` and `I-02 BLOCKED`; no competing Cryptox task is active. Docker
Engine `28.5.1`, Compose `v2.40.3`, two healthy local PostgreSQL containers, and
`npm run db:local:validate` (`up`, constraints, `down`, remigrate) are freshly
verified. Live Binance/News credentials/provider access, browser/demo, and
OpenSpec CLI availability still require truthful execution-time verification;
unavailable evidence cannot be PASS.

Acceptance includes real Auth/session and two-user isolation, real Binance
BTCUSDT four-chart realtime market-only delivery, Strategy/Search/Experiment/
Trade/metrics/provenance/Leaderboard behavior, real News plus local LEXICON
Sentiment and failure demonstrations, mock-only rejection, all required
architecture scenarios, clean setup, E2E twice, final traceability and clean
tracked Git checkpoint. If a required item is unavailable or a defect exceeds
the bounded app/test/doc scope, the Manager must leave I-02 `REVIEW` and report
the exact blocker/`NEEDS_INSTRUCTOR_REVIEW`; it must not manufacture PASS or
expand authorization.

Affected: `I-02`, `I-03`, `TASKS.md`, `HANDOFF.md`, `INS-127`, `INS-128`, and
the final MVP checkpoint. Requirements, functional image amendments, accepted
ADRs, contracts, architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-048`, `INS-127`, and commit `a58530f`.

## DEC-050 — I-02 remains REVIEW; HOLD before any new finalization packet

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh Manager under
`INS-128 / DEC-049` completed at the bounded checkpoint
`c9d2a26`, with no active Cryptox Manager, worker, verifier, retry, replacement,
duplicate, or downstream task remaining.

Decision: Accept the I-02 checkpoint only as `REVIEW` —
`NEEDS_INSTRUCTOR_REVIEW` — and supersede `INS-128 / APPROVED_FOR_EXECUTION`
with `INS-129 / HOLD`. I-02 is not `DONE`, and this decision authorizes no
implementation, task transition, downstream promotion, or reuse of the
exhausted INS-128 scope.

Evidence: the authoritative board remains exactly 49 rows, `48 DONE`, with
only I-02 at `REVIEW`; the tracked tree remains clean except for untouched
`.codex/config.toml`. Independent static and boundary gates pass, including
architecture `184 modules / 615 dependencies`, scope/deferred `13/13`, and
the full workspace suite against the local PostgreSQL test database (`433
passed`, `0 skipped`); local migration validation and Auth E2E also pass.
These results do not prove final configured provider/browser acceptance.

The material remaining gap is explicit: the repository contains the tested
provider-neutral LLM authoring application and OpenAI-compatible adapter, but
the backend runtime does not compose a public authoring transport and the
frontend explicitly keeps LLM authoring unavailable. No real LLM request or
application API key usage is claimed. Real configured LLM, Binance, News, and
browser/demo evidence remain `UNVERIFIED`/`BLOCKED`; OpenSpec CLI and source/
spec status reconciliation remain unavailable or inconsistent. These findings
were outside the bounded INS-128 scope and cannot be repaired implicitly.

Next step: a fresh Instructor review may issue a separate bounded authorization
for the missing LLM public composition and/or final configured-demo evidence,
but only with explicit source/contract/runtime/frontend write scopes, required
environment handling without secrets in chat, acceptance criteria, and a stop
condition. No downstream work is promoted by this decision.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-128`, `INS-129`, and the final
MVP checkpoint. Requirements, approved functional image amendments, accepted
ADRs, existing completed packet source, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-049`, `INS-128`, and commit `c9d2a26`.

## DEC-051 — Authorize S-04I LLM public composition reconciliation

Status: `APPROVED`

Authority: Instructor review after the `INS-128` I-02 Manager exhausted its
bounded final-verification scope, I-02 was independently retained at `REVIEW`,
`INS-129 / HOLD` was committed, and the residual was recorded in `MVP_PLAN.md`
at governance commit `22bc88e`. The source/business checkpoint remains
`c9d2a26`; no Cryptox Manager or worker is active.

Decision: Issue exactly one fresh same-directory Manager authorization
`INS-130 / APPROVED_FOR_EXECUTION` for `S-04I — LLM_AUTHORING_V1 Public
Composition Reconciliation`. The Manager may add exactly one `S-04I` row to the
operational `TASKS.md` board and may use at most three hidden internal workers,
strictly sequentially, for Strategy module composition, authenticated
REST/backend composition, and frontend authoring composition in disjoint
scopes. The Manager owns only the new row, `HANDOFF.md`, integration, and
checkpoint commits; workers may not edit control-plane files. No migration,
provider-specific adapter, autonomous/unconfigured LLM, arbitrary URL fetch,
downstream task, I-02 transition, second Manager, duplicate, retry, replacement,
or worktree is authorized.

Acceptance is limited to the approved provider-neutral `LLM_AUTHORING_V1`
workflow: server-side explicit endpoint/model/key configuration (including a
non-OpenAI provider only when OpenAI-compatible), one bounded structured
request, no secret exposure, fail-closed provider errors, deterministic
validation, explicit authenticated Validate/Save/Approve, immutable
owner-scoped persistence, and frontend status/ownership evidence. The exact
runtime configuration names are `LLM_AUTHORING_ENDPOINT`,
`LLM_AUTHORING_MODEL`, and `LLM_AUTHORING_API_KEY`; no key is requested in chat
or printed in evidence. Missing real configuration, OpenSpec CLI, live
provider, or browser environment must be recorded `UNVERIFIED`/`BLOCKED`, not
promoted through fixtures.

The Manager must verify `AGENTS.md`, `ORCHESTRATOR_START.md`, the current
signal, checkpoint, task DAG, dependencies, and clean applicability before
dispatch; stop at `S-04I REVIEW`; and return the repository to a checkpoint for
fresh Instructor audit. A new Instructor authorization is required before
I-02 final revalidation.

Affected: `S-04I`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-129`, `INS-130`, and
the final MVP checkpoint. Existing requirements, accepted ADRs, architecture,
data model, functional image amendments, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-050`, `INS-129`, `S-04I`, and commit `22bc88e`.

## DEC-052 — S-04I partial checkpoint accepted; residual completion required

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh Manager under
`INS-130 / DEC-051` completed its bounded S-04I scope and became idle. The
Manager's Git staging attempt was denied by the environment, so the parent
Instructor independently staged and committed the exact audited delta at
`f872590` without including the untouched `.codex/config.toml`.

Decision: Accept the S-04I implementation only as a safe partial source/control
checkpoint and supersede `INS-130 / APPROVED_FOR_EXECUTION` with `INS-131 /
HOLD`. Keep both `S-04I` and `I-02` at `REVIEW`; neither is `DONE`, and no
downstream packet is promoted. Preserve the Strategy/REST/backend composition
already implemented. Record `S-04J` in `MVP_PLAN.md` as a distinct residual
closure packet for the missing frontend composition, the unproven exactly-one
approval invariant across separate request contexts, and the narrow deferred-
scope checker boundary. S-04J is not a retry, replacement, or reopening of
S-04I.

Evidence: focused S-04I tests pass `37/37`; the workspace passes `433` tests
with `8` environment-gated skips; build/typecheck/lint, architecture (`187
modules / 631 dependencies`), artifacts, `test:scope-check` `13/13`, runtime
smoke, and diff checks pass. PostgreSQL migration/integration is `BLOCKED`
because both Compose clients cannot access the Docker daemon/named pipe in this
environment; live provider, frontend/browser authoring, real Binance/News,
OpenSpec CLI, and live deferred-scope execution remain `UNVERIFIED` or
`BLOCKED`. `npm run scope:check` fails on the single known canonical REST-file
boundary mismatch. Fixture tests do not become real-provider or browser PASS.

The independent audit also found that `approvalChain` is created per authoring
port/request. Sequential repeated approval is covered, but two separate
authenticated request contexts can race before the persisted draft is marked
approved, so the required exactly-one immutable definition is not yet proven.
This is a material correctness gap and requires the explicitly scoped S-04J
review before final I-02 verification.

Affected: `S-04I`, `S-04J`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-130`,
`INS-131`, and the final MVP checkpoint. Requirements, approved functional
image amendments, accepted ADRs, contracts, architecture, data model, and
deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-051`, `INS-130`, `INS-131`, `S-04I`, `S-04J`, and commit `f872590`.

## DEC-053 — Authorize S-04J residual LLM completion and approval integrity

Status: `APPROVED`

Authority: Instructor review after `DEC-052 / INS-131` held the repository at
the independently committed S-04I partial checkpoint `f872590`. Git is clean
for tracked files except the untouched app-generated `.codex/config.toml`, and
no Cryptox Manager or worker is active.

Decision: Issue exactly one fresh same-directory Manager authorization
`INS-132 / APPROVED_FOR_EXECUTION` for the planned `S-04J` residual closure.
The Manager may use exactly three hidden internal workers, strictly
sequentially and with disjoint scopes: Strategy approval concurrency/
idempotency, frontend LLM authoring composition, and the narrow deferred-scope
checker boundary. The Manager owns the new S-04J row, `HANDOFF.md`, integration,
and checkpoint commit, and may reconcile S-04I from `REVIEW` to `DONE` only if
the combined acceptance is actually proven. No existing S-04I retry/reopen,
I-02 transition, downstream packet, user-visible child task, worktree,
duplicate, retry, replacement, migration, provider-specific adapter, or
autonomous/unconfigured LLM behavior is authorized.

Requirements and acceptance remain bounded to `CSL-R-ST-05`, `CSL-R-RP-02`,
`CSL-R-OW-01`, and the configured-runtime part of `CSL-R-RD-01`. The Manager
must preserve explicit server-side endpoint/model/key configuration, one
bounded provider request, deterministic validation, explicit human approval,
safe provenance, owner isolation, and no-secret behavior. The Strategy worker
must prove exactly-one approval across separate authoring request contexts; the
frontend worker must use the already composed typed REST boundary and expose
the required authoring states/actions; the checker worker must fix only the
canonical `packages/contracts/rest/strategy.ts` allowlist boundary.

Evidence limitations remain truthful: unavailable PostgreSQL/Docker, real
provider, browser/demo, OpenSpec, Binance, and News checks are not promoted to
PASS. If the approval fix requires a migration or any other out-of-scope
change, the Manager must stop at `NEEDS_INSTRUCTOR_REVIEW`.

Affected: `S-04J`, `S-04I`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-131`,
`INS-132`, and the final MVP checkpoint. Existing requirements, approved
functional image amendments, ADRs, contracts, architecture, data model, and
deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-052`, `INS-131`, `S-04I`, `S-04J`, and commit `b522724`.

## DEC-054 — Hold S-04J after timed-out frontend worker; plan residual closure

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh Manager under
`INS-132 / DEC-053` reached its bounded checkpoint. Git remains at committed
HEAD `5bc1c32` with the exact Manager checkpoint delta uncommitted: two
Strategy application/test paths, six frontend feature paths, and the Manager's
`TASKS.md`/`HANDOFF.md`, plus untouched `.codex/config.toml`.

Decision: Supersede `INS-132 / APPROVED_FOR_EXECUTION` with `INS-133 / HOLD`.
Keep `S-04J` at `REVIEW`, leave `S-04I` and `I-02` at `REVIEW`, and do not
dispatch the unstarted checker worker or final I-02. Worker 1 Archimedes was
independently accepted in scope with Strategy `129` tests passed and `3`
PostgreSQL-gated skips. Worker 2 Meitner timed out after partial frontend
changes and returned no test/completion evidence; the parent Manager correctly
did not retry or replace it. The Instructor independently found the frontend
suite at `36 passed / 2 failed` because stale assertions still expect the old
unavailable-only panel. Frontend typecheck/build pass, but this does not accept
the unreviewed behavior. PostgreSQL, real provider, browser/demo, OpenSpec,
Binance/News, and remaining full-gate evidence remain `BLOCKED`/`UNVERIFIED`.

Plan `S-04K` as a distinct residual closure packet for the preserved partial
frontend artifact and the exact deferred-scope checker boundary. S-04K is not
a retry of Worker 2: it must review and finish only the unverified residue,
add truthful frontend coverage, then run the checker in a separate disjoint
worker. It remains within the already approved `LLM_AUTHORING_V1` boundary and
does not expand into new provider, contract, migration, or autonomous LLM
scope. No secret supplied in chat is stored, echoed, or included in any
authorization.

Affected: `S-04K`, `S-04J`, `S-04I`, `I-02`, `TASKS.md`, `HANDOFF.md`,
`INS-132`, `INS-133`, and the final MVP checkpoint. Existing requirements,
approved functional image amendments, ADRs, contracts, architecture, data
model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-053`, `INS-132`, `S-04J`, and commit `5bc1c32`.

## DEC-055 — Authorize S-04K timeout-residue frontend/checker closure

Status: `APPROVED`

Authority: Instructor review under `DEC-054 / INS-133` confirmed that S-04J
stopped safely after Worker 2 timed out, while preserving an exact partial
frontend delta in the canonical checkout. The governance-only HOLD and plan
commit is `0a3ec85`; the expected uncommitted Manager checkpoint delta remains
limited to two Strategy paths, six frontend feature paths, and
`TASKS.md`/`HANDOFF.md`, with untouched `.codex/config.toml` excluded.

Decision: Issue exactly one fresh same-directory Manager authorization
`INS-134 / APPROVED_FOR_EXECUTION` for the distinct `S-04K` residual closure.
This is not a retry or replacement of timed-out Worker 2: the new packet owns
review/completion of the unverified residue and the checker work that was never
started. The Manager may use exactly two hidden internal workers, strictly
sequentially and with disjoint scopes: one frontend residual-completion worker
and one narrow deferred-scope checker worker. No I-02 transition or downstream
packet is authorized.

The frontend worker may touch only `apps/frontend/src/**` and must add truthful
coverage for the typed Save/Validate/Approve workflow, prompt and approved-News
inputs, all required states, fail-closed/unavailable behavior, safe provenance,
ownership, and no-secret/raw-completion exposure. It must enforce the existing
approved News/template boundary in fixtures. The checker worker may touch only
`scripts/check-deferred-scope.cjs` and `scripts/check-deferred-scope.test.cjs`
and may fix only the canonical `packages/contracts/rest/strategy.ts` boundary.
The Manager owns `S-04K` TASKS/HANDOFF/integration and may close S-04I/S-04J
only after combined acceptance is proven. No contracts, backend, Strategy,
migrations, providers, autonomous LLM, arbitrary URL fetch, queue/distributed
scope, control-plane worker edits, duplicate/retry/replacement, or second
Manager is authorized.

Required evidence remains truthful: focused and full static/test gates must be
rerun after the residue is reviewed; PostgreSQL, configured LLM, Binance/News,
browser/demo, and OpenSpec remain `BLOCKED`/`UNVERIFIED` unless actually
available and exercised. No secret supplied in chat is stored or echoed.

Affected: `S-04K`, `S-04J`, `S-04I`, `I-02`, `TASKS.md`, `HANDOFF.md`,
`INS-133`, `INS-134`, and the final MVP checkpoint. Existing requirements,
approved functional image amendments, ADRs, contracts, architecture, data
model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-054`, `INS-133`, `S-04K`, and commit `0a3ec85`.

## DEC-056 — Hold S-04K after frontend timeout; narrow final residue

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh Manager under
`INS-134 / DEC-055` reached its bounded checkpoint. Git remains at committed
HEAD `53733e1` with the exact expected S-04K delta uncommitted: the two
Strategy paths, six frontend feature paths, and Manager-owned `TASKS.md`/
`HANDOFF.md`, plus untouched `.codex/config.toml`.

Decision: Supersede `INS-134 / APPROVED_FOR_EXECUTION` with `INS-135 / HOLD`.
Keep `S-04K`, `S-04J`, `S-04I`, and `I-02` at `REVIEW`. Worker 1 Pasteur
timed out after identifying and partially addressing two genuine frontend
boundary defects; it returned no final report or test evidence and was shut
down without retry/replacement. The checker worker was not dispatched. The
frontend suite remains `36 passed / 2 failed` on stale unavailable-state
assertions; typecheck/build pass; Strategy authoring remains `14/14`; the
deferred-scope checker still fails on the canonical REST-file boundary. No
fixture, skip, or unavailable external environment is promoted to `PASS`.

Plan `S-04L` as a distinct, smaller residual packet. It is not a retry or
replacement of Pasteur: it covers only the known frontend state/cache and
post-approval projection residue, stale frontend expectations and focused
coverage, followed by the checker worker that has never run. The packet stays
inside the approved `LLM_AUTHORING_V1` boundary and may not add a provider,
contract, backend, Strategy, migration, autonomous LLM, arbitrary URL,
queue/distributed behavior, or downstream implementation.

Affected: `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`, `TASKS.md`, `HANDOFF.md`,
`INS-134`, `INS-135`, and the final MVP checkpoint. Existing requirements,
approved functional image amendments, ADRs, contracts, architecture, data
model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-055`, `INS-134`, `S-04K`, and commit `53733e1`.

## DEC-057 — Authorize S-04L narrowly bounded final frontend/checker residue

Status: `APPROVED`

Authority: Independent Instructor audit under `DEC-056 / INS-135` found that
S-04K stopped safely after its sole frontend worker timed out. The preserved
delta remains exact and uncommitted at the governance checkpoint `53733e1`;
the latest governance HOLD is `57c1281`. No active Manager or worker exists.

Decision: Issue exactly one fresh same-directory Manager authorization
`INS-136 / APPROVED_FOR_EXECUTION` for distinct packet `S-04L`. This is not a
retry or replacement of Pasteur: it is limited to the known remaining
frontend acceptance residue and the checker worker never dispatched. Use at
most two hidden internal workers, strictly sequentially and with disjoint
scopes; do not start I-02 or downstream work.

Worker 1 may write only the explicitly listed existing frontend state/client/
fixture/test files under `apps/frontend/src/**` in `INS-136`, and must fix the
known cache/transport and post-approval projection concerns, update the two
stale assertions, and add focused authoring-state/boundary coverage. It must
not modify `screens.tsx`, fixture-data, contracts, backend, Strategy,
migrations, providers, or control plane. After review, Worker 2 may write only
the two deferred-scope checker files and fix only the canonical
`packages/contracts/rest/strategy.ts` allowlist boundary with a regression
test. No other checker or product scope is authorized.

The Manager owns `S-04L` TASKS/HANDOFF/integration and may reconcile
S-04I/S-04J/S-04K only after combined acceptance is proven. Required full
gates and external evidence remain truthful: PostgreSQL, configured LLM,
Binance/News, browser/demo, and OpenSpec are `BLOCKED`/`UNVERIFIED` unless
actually exercised. No secret supplied in chat is stored or echoed.

Affected: `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`, `TASKS.md`, `HANDOFF.md`,
`INS-135`, `INS-136`, and the final MVP checkpoint. Existing requirements,
approved functional image amendments, ADRs, contracts, architecture, data
model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-056`, `INS-135`, `S-04L`, and commit `57c1281`.

## DEC-058 — Hold S-04L after frontend evidence failure

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh Manager under
`INS-136 / DEC-057` reached its bounded S-04L checkpoint. The Manager recorded
the correct `REVIEW` state after Noether timed out and did not dispatch the
checker worker. Git remains at committed HEAD `7ae2cfe`; the accumulated
uncommitted implementation delta and the untracked focused frontend test are
preserved for a separately authorized review. `.codex/config.toml` remains
outside scope.

Decision: Supersede `INS-136 / APPROVED_FOR_EXECUTION` with `INS-137 / HOLD`.
Keep S-04L, S-04K, S-04J, S-04I, and I-02 at `REVIEW`. Independent frontend
validation found `48 passed / 1 failed` across 14 files: the remaining failure
is a stale READY-state assertion in `screens.spec.tsx`. The new authoring test
passes `11/11`, but frontend typecheck/lint fail at its zero-argument fixture
`news` call; build passes. Strategy remains `129 passed / 3` PostgreSQL-gated
skips and the cross-context approval evidence is preserved. The checker worker
was not dispatched and its correction is unresolved. No source or control
delta is accepted as S-04L DONE, and no downstream work is authorized.

Plan distinct packet `S-04M` for only these two frontend test/typecheck defects,
followed after review by the previously unstarted narrow deferred-scope checker
worker. S-04M is not a retry or replacement of Noether and does not expand the
approved LLM authoring behavior. PostgreSQL, configured LLM, Binance/News,
browser/demo, OpenSpec, and unavailable/skipped evidence remain
`BLOCKED`/`UNVERIFIED` unless actually exercised.

Affected: `S-04M`, `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`, `TASKS.md`,
`HANDOFF.md`, `INS-136`, `INS-137`, and the final MVP checkpoint. Existing
requirements, functional image authority, ADRs, contracts, architecture, data
model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-057`, `INS-136`, and `S-04L`.

## DEC-059 — Authorize S-04M final frontend test/checker closure

Status: `APPROVED`

Authority: Independent Instructor audit under `DEC-058 / INS-137` confirmed
that S-04L stopped safely after its single frontend worker timed out. The
governance-only HOLD/plan checkpoint is `db93bd8`; the accumulated source and
Manager-owned checkpoint delta remains uncommitted, and no Cryptox Manager or
worker is active.

Decision: Issue exactly one fresh same-directory Manager authorization
`INS-138 / APPROVED_FOR_EXECUTION` for distinct packet `S-04M`. This is not a
retry or replacement of Noether. The Manager may use at most two hidden
internal workers, strictly sequentially and with disjoint scopes. Worker 1 is
limited to correcting the stale READY-state assertion in
`apps/frontend/src/features/screens.spec.tsx` and the zero-argument fixture
call in `apps/frontend/src/features/authoring.spec.ts`. After the Manager
reviews that result, Worker 2 may run only the narrow deferred-scope checker
correction in `scripts/check-deferred-scope.cjs` and
`scripts/check-deferred-scope.test.cjs` for the canonical
`packages/contracts/rest/strategy.ts` boundary.

No production behavior, provider, contract, backend, Strategy, migration,
autonomous LLM, arbitrary URL, control-plane worker edit, retry, replacement,
duplicate, second Manager, I-02 transition, or downstream packet is
authorized. Required checks must be truthful; PostgreSQL, configured LLM,
Binance/News, browser/demo, and OpenSpec remain `BLOCKED`/`UNVERIFIED` unless
actually exercised. The Manager must stop at one REVIEW checkpoint and return
the repository for independent Instructor audit.

Affected: `S-04M`, `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`, `TASKS.md`,
`HANDOFF.md`, `INS-137`, `INS-138`, and the final MVP checkpoint. Existing
requirements, functional image authority, ADRs, contracts, architecture, data
model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-058`, `INS-137`, and `S-04M`.

## DEC-060 — Hold after independent S-04M acceptance

Status: `APPROVED`

Authority: Independent Instructor audit after the single fresh Manager under
`INS-138 / DEC-059` reached its bounded S-04M checkpoint. The Manager correctly
completed the two workers in sequence and recorded `REVIEW`, but its one
staging attempt was denied by `.git/index.lock` and was not retried.

Decision: Accept the packet-local S-04M implementation/checker evidence and
integrate the exact 15-path worker/control delta at `16a347e`. Frontend passes
`49/49` including authoring `11/11`; Strategy passes `129` with `3`
PostgreSQL-gated skips; root `verify:stage4a`, checker regression `15/15`,
live scope scan, architecture, artifacts, runtime smoke, exact-path,
whitespace, secret/log, and diff checks pass. PostgreSQL/Auth, configured LLM,
Binance/News, browser/demo, and OpenSpec remain `BLOCKED`/`UNVERIFIED`.

Supersede `INS-138 / APPROVED_FOR_EXECUTION` with `INS-139 / HOLD`, leaving
`I-02` and `S-04I` through `S-04M` at `REVIEW`. Plan distinct control-only
packet `S-04N` so one fresh Manager can reconcile the five residual S-04 rows
to `DONE` from the combined accepted evidence. S-04N has no implementation or
worker scope and does not authorize I-02; final verification requires its own
authorization.

Affected: `S-04N`, `S-04M`, `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`,
`TASKS.md`, `HANDOFF.md`, `INS-138`, `INS-139`, and the final MVP checkpoint.
Existing requirements, functional image authority, ADRs, contracts,
architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-059`, `INS-138`, and `S-04M`.

## DEC-061 — Authorize S-04N residual closure reconciliation

Status: `APPROVED`

Authority: Independent Instructor audit under `DEC-060 / INS-139` accepted the
combined S-04I–S-04M source/checker checkpoint at `16a347e`. The latest
governance HOLD is `69ac2ba`; Git is clean except the app-generated
`.codex/config.toml`, no implementation task is active, and no Manager or
worker is running.

Decision: Issue exactly one fresh same-directory control-only Manager
authorization `INS-140 / APPROVED_FOR_EXECUTION` for distinct packet `S-04N`.
The Manager may add one S-04N row and reconcile only `S-04I`, `S-04J`,
`S-04K`, `S-04L`, and `S-04M` from `REVIEW` to `DONE` after verifying the
combined accepted evidence. It may write only `TASKS.md` and `HANDOFF.md`;
there is no worker scope. I-02 remains `REVIEW` and is not authorized.

The Manager must use `gpt-5.6-luna` with `max` reasoning in the canonical
same-directory checkout, perform the full bootstrap and control-plane/DAG
reconciliation, make one checkpoint commit attempt, and stop for independent
Instructor review. No source, tests, contracts, migrations, providers,
requirements, ADRs, OpenSpec, retry, replacement, duplicate, second Manager,
worker, I-02 transition, or downstream work is authorized. External
PostgreSQL/Auth, configured LLM, Binance/News, browser/demo, and OpenSpec
remain `BLOCKED`/`UNVERIFIED` unless actually exercised.

Affected: `S-04N`, `S-04M`, `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`,
`TASKS.md`, `HANDOFF.md`, `INS-139`, `INS-140`, and the final MVP checkpoint.
Existing requirements, functional image authority, ADRs, contracts,
architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-060`, `INS-139`, and `S-04N`.

## DEC-062 — Hold after independent S-04N reconciliation

Status: `APPROVED`

Authority: Independent Instructor audit after the one fresh same-directory
control-only Manager under `INS-140 / DEC-061` completed S-04N. The Manager
changed only `TASKS.md` and `HANDOFF.md`, created no worker, and stopped at
`REVIEW`. Its one staging attempt was denied by `.git/index.lock` permission
and was not retried.

Decision: Accept the exact Manager-authored control-plane delta and persist
`INS-141 / HOLD`. S-04I through S-04M are now `DONE`; S-04N remains `REVIEW`
as the completed control checkpoint; I-02 remains `REVIEW`. The resulting
board has 55 rows: 53 `DONE`, 2 `REVIEW`, and no `READY`, `IN_PROGRESS`, or
`BLOCKED` row. No unrelated task state or source/business state changed.

The accepted combined S-04I–S-04M evidence remains frontend `49/49` including
authoring `11/11`, Strategy `129` with 3 PostgreSQL-gated skips, root
`verify:stage4a`, checker `15/15` plus live scan, architecture/artifacts/
runtime-smoke/exact-path/whitespace/secret-log/diff checks. PostgreSQL/Auth,
configured LLM, Binance/News, browser/demo, and OpenSpec remain
`BLOCKED`/`UNVERIFIED`; no final I-02 claim is made. A separate authorization
is required for final I-02 verification.

Affected: `S-04N`, `S-04M`, `S-04L`, `S-04K`, `S-04J`, `S-04I`, `I-02`,
`TASKS.md`, `HANDOFF.md`, `INS-140`, `INS-141`, and the final MVP checkpoint.
Existing requirements, functional image authority, ADRs, contracts,
architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-061`, `INS-140`, and `S-04N`.

## DEC-063 — Authorize final I-02 revalidation after E5R closure

Status: `APPROVED`

Authority: Independent Instructor audit under `INS-141 / DEC-062` accepted the
S-04N control checkpoint and persisted its exact Manager-authored delta at
`cf598c3`. The board is 55 rows with 53 `DONE` and only `S-04N` plus `I-02` at
`REVIEW`; no implementation task or Cryptox Manager/worker is active. Local
Docker PostgreSQL is reachable, both services are healthy, and the repository
migration validator passed real up/constraints/down/remigrate evidence.

Decision: Issue exactly one fresh same-directory Manager authorization
`INS-142 / APPROVED_FOR_EXECUTION` for the safe group `S-04N` control-row
closure plus final revalidation of the existing `I-02` packet. The Manager may
reconcile only `S-04N REVIEW -> DONE`, then explicitly re-enter only
`I-02 REVIEW -> READY -> IN_PROGRESS`, and must stop at an I-02 `REVIEW`
checkpoint for independent Instructor audit. This re-entry is not a retry and
does not authorize optional scope or a new product packet.

The Manager may create at most three hidden internal reviewer/test subagents
with disjoint scopes: backend I-02 test paths, frontend I-02 test paths, and a
read-only traceability/demo reviewer or README-only documentation worker. They
must not create user-visible tasks or edit production source, contracts,
migrations, infra, environment, control-plane files, or paths outside their
scopes. Shared Docker/database resources require sequential write-capable work.
The Manager alone owns `TASKS.md` and `HANDOFF.md`.

Acceptance is the full I-02 DoD in `MVP_PLAN.md`/`TASKS.md`: real local Auth
session and two-user isolation; Binance four-chart historical/realtime flow;
strategy/composite, bounded search/progress, owner-specific leaderboard and
Experiment results; visualization/metrics/provenance; real News plus local
LEXICON sentiment; controlled provider/failure behavior; mock-only rejection;
all architecture scenarios; clean install/migration/build/typecheck/tests,
two E2E runs, and exact final diff evidence. Unavailable or skipped evidence
remains `UNVERIFIED`/`BLOCKED`. The runtime LLM contract is
`LLM_AUTHORING_ENDPOINT`/`LLM_AUTHORING_MODEL`/`LLM_AUTHORING_API_KEY`; no
chat secret may be echoed, stored, or silently mapped from `GEMINI_*`.

No second Manager, worker retry/replacement, source implementation, migration,
provider adapter, arbitrary URL, autonomous/unconfigured LLM, deferred scope,
cloud database, secret request, downstream task, or unapproved fix is allowed.
One checkpoint staging/commit attempt is allowed; a Git denial is recorded once
without retry.

Affected: `S-04N`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-141`, `INS-142`,
`MVP_PLAN.md`, and the final MVP checkpoint. Existing requirements, functional
image authority, ADRs, contracts, architecture, data model, and deferred scope
remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-062`, `INS-141`, and `I-02`.

## DEC-064 — Hold after independent I-02 live-evidence audit

Status: `APPROVED`

Authority: Independent Instructor audit after the one fresh same-directory
Manager under `INS-142 / DEC-063` completed the authorized `S-04N` closure and
re-entered `I-02`, stopping at `REVIEW`. The Manager changed only the
authorized backend I-02 test plus `TASKS.md`/`HANDOFF.md`; its single staging
attempt was denied by `.git/index.lock` and was not retried.

Decision: Accept the exact test/checkpoint delta and persist `INS-143 / HOLD`.
The operational board is 55 rows with 54 `DONE` and only `I-02` at `REVIEW`;
no other task is executable or active. The Instructor independently reran the
backend I-02 fixture boundary (`6/6`), frontend I-02 fixture boundary (`5/5`),
full workspace tests with local PostgreSQL (`455 passed / 0 skipped`), Auth
E2E (`1/1`), Docker/Compose and migration validation, real Binance history and
market WebSocket delivery, and a live application flow through Search,
Experiment, Trades, Leaderboard, and cross-owner isolation. These results do
not convert fixture/browser probes into live-demo evidence.

I-02 is not DONE because the live News collection path is not composed into
the backend runtime, the public CoinDesk request returned `401` without a
configured credential, configured LLM variables are absent, and configured
browser/demo plus consolidated eight-scenario evidence remain
`UNVERIFIED`/`BLOCKED`. The chat-supplied Gemini secret is not used, stored, or
silently mapped to the repository's `LLM_AUTHORING_*` contract.

The News runtime composition gap is recorded as a residual implementation item
for a separately planned packet within already-approved requirements. No
source implementation, downstream packet, second Manager, retry, provider
credential request, or deferred scope is authorized by this decision.

Affected: `I-02`, `N-03`, `TASKS.md`, `HANDOFF.md`, `INS-142`, `INS-143`, and
the final MVP checkpoint. Existing assignment, functional image authority,
requirements, ADRs, contracts, architecture, data model, and deferred scope
remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-063`, `INS-142`, and `I-02`.

## DEC-065 — Authorize E5R News runtime and README residual packets

Status: `APPROVED`

Authority: Instructor review after the one fresh same-directory Manager under
`INS-142 / DEC-063` completed the authorized final I-02 revalidation
and stopped at `I-02 / REVIEW`. Independent local evidence proves
the core PostgreSQL/Auth, Binance historical/realtime, Strategy/composite,
bounded Search, persisted result, and cross-owner flows. It also proves that
the configured News collection/scheduler is not composed into the real backend
runtime and that `README.md` remains stale.

Decision: Authorize exactly one fresh same-directory Manager under
`INS-144 / APPROVED_FOR_EXECUTION` for the already-approved E5R
residual group `N-03R + I-02D`. This is not a retry of `N-03`
or `N-03A`, adds no new product scope, and does not authorize final
`I-02` promotion.

The Manager may create at most two fresh hidden internal workers, sequentially:

- N-03R runtime worker: only `apps/backend/src/runtime.ts` and
  narrowly named focused backend runtime-composition tests under
  `apps/backend/src/`. It consumes the existing News
  provider/scheduler boundaries and may not redesign News contracts, adapters,
  migrations, or routes.
- I-02D documentation worker: only `README.md`, with truthful
  install/run, architecture, demo, validation, fixture/live, environment,
  and deferred-scope guidance. It may not edit source or control-plane files.

The Manager alone may add these two rows to `TASKS.md`, move each only
`BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, and update
`HANDOFF.md`. `I-02` remains `REVIEW`; no downstream
task may start. Workers may not edit control-plane files, create user-visible
tasks, overlap write scopes, retry or replace timed-out work, or broaden into
frontend, Strategy, Search, Backtesting, Leaderboard, contracts, migrations,
infrastructure, arbitrary providers, autonomous/unconfigured LLM, or deferred
scope.

Acceptance and validation are exactly those in the E5R residual closure
packets: N-03R must prove bounded initial News collection, approved interval
scheduling, failure continuation, no overlap, idempotent shutdown, truthful
persisted reads, and visible unconfigured-provider behavior through the real
composition; I-02D must make all documented paths truthful without secrets or
unavailable PASS claims. Focused/relevant tests, build, typecheck, lint,
architecture, artifacts, scope/deferred, runtime smoke, diff, exact-path, and
secret checks are required as applicable. Real CoinDesk, configured LLM,
browser/demo, OpenSpec, and consolidated architecture evidence remain
`BLOCKED`/`UNVERIFIED` when unavailable. The runtime LLM
contract remains `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`,
and `LLM_AUTHORING_API_KEY`; no `GEMINI_*` mapping or chat
secret is permitted.

The Manager must stop after both residual packets reach `REVIEW`,
before re-entering `I-02`. One explicit-path staging/commit attempt is
allowed; a `.git/index.lock` permission denial is recorded without
retry. Any material source/business-state drift, task-DAG conflict,
contract/migration/provider redesign requirement, or out-of-scope finding is
`NEEDS_INSTRUCTOR_REVIEW`.

Affected: `N-03R`, `I-02D`, `I-02`, `N-03`,
`N-03A`, `TASKS.md`, `HANDOFF.md`,
`MVP_PLAN.md`, `INS-143`, and `INS-144`.
Existing assignment, functional image authority, requirements, ADRs,
contracts, architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-064`, `INS-143`, `INS-144`,
`N-03R`, `I-02D`, and `I-02`.

## DEC-066 — Hold after N-03R acceptance and I-02D usage-limit interruption

Status: `APPROVED`

Authority: Independent Instructor audit of the one fresh same-directory
Manager under `INS-144 / DEC-065`. The Manager completed and
reviewed N-03R, then dispatched the single sequential README-only worker for
I-02D. That worker terminated with a platform usage-limit error before
changing `README.md`; it was not retried or replaced.

Decision: Accept the exact N-03R source/test delta at the Instructor review
boundary and persist `INS-145 / HOLD`. The implementation changes
only `apps/backend/src/runtime.ts` and
`apps/backend/src/runtime.news-composition.spec.ts`. Independent
runtime tests pass `2/2`, News scheduler tests pass `5/5`,
backend tests pass `31` with one environment-gated skip, and
typecheck, build, lint, architecture, artifacts, deferred-scope, whitespace,
and exact-path checks pass. N-03R remains `REVIEW` operationally
until a future Manager performs its explicit control closure.

The operational board is 57 rows: 54 `DONE`, N-03R `REVIEW`,
I-02 `REVIEW`, and I-02D `BLOCKED` after the Manager
checkpoint. No Manager or worker remains active. Real CoinDesk/PostgreSQL,
Docker, configured LLM, configured browser/demo, OpenSpec, and consolidated
live architecture evidence remain `BLOCKED`/`UNVERIFIED`;
no fixture or unavailable environment is promoted to PASS, and no
`GEMINI_*` mapping or chat secret is used.

After this HOLD, a separate fresh authorization may close N-03R and re-enter
the existing I-02D row for one fresh hidden README-only worker. This is a
bounded continuation of the same residual, not a new product task and not an
automatic retry. That Manager must stop at I-02D `REVIEW`, before
final I-02 revalidation. No source implementation is authorized under this
HOLD.

Affected: `N-03R`, `I-02D`, `I-02`,
`TASKS.md`, `HANDOFF.md`, `INS-144`,
`INS-145`, and the exact N-03R source/test paths. Existing
assignment, functional image authority, requirements, ADRs, contracts,
architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-065`, `INS-144`, `N-03R`,
`I-02D`, and `I-02`.

## DEC-067 — Authorize I-02D continuation and N-03R control closure

Status: `APPROVED`

Authority: Independent Instructor review after `INS-144 / DEC-065`
completed the bounded N-03R implementation and its Manager checkpoint, while
the sequential I-02D worker terminated with a platform usage-limit error before
editing `README.md`. The exact N-03R delta was independently tested,
reviewed, committed, and placed under `INS-145 / HOLD`.

Decision: Authorize exactly one fresh same-directory Manager under
`INS-146 / APPROVED_FOR_EXECUTION` for the existing residual rows
only. The Manager may close N-03R `REVIEW -> DONE` after rechecking
the committed evidence, then re-enter I-02D `BLOCKED -> READY ->
IN_PROGRESS -> REVIEW` and dispatch at most one fresh hidden
README-only worker. The fresh worker attempt is authorized as a continuation
after the prior terminal platform failure; it is not an automatic retry in
INS-144 and adds no product scope.

The worker may edit only `README.md`. It must make install/run,
architecture, demo, validation, fixture/live, required environment, and
deferred-scope documentation truthful, with every command/path existing or
explicitly environment-dependent. It must not claim unavailable CoinDesk,
LLM, browser/demo, OpenSpec, or other evidence as PASS and must not include
credentials. No source, contract, migration, infrastructure, requirement,
ADR, OpenSpec, or control-plane edit is authorized for the worker. The Manager
alone updates `TASKS.md` and `HANDOFF.md`.

I-02 remains `REVIEW`; no final I-02 revalidation or downstream task
may start. The Manager must use gpt-5.6-luna with max reasoning in the same
canonical checkout, create no user-visible task, and stop after N-03R closure
and I-02D `REVIEW`. If the fresh worker terminates again, the Manager
must record I-02D `BLOCKED` without retry or replacement. One
explicit-path staging/commit attempt is allowed; a Git permission denial is
recorded without retry. Any source drift, task-DAG conflict, or out-of-scope
need is `NEEDS_INSTRUCTOR_REVIEW`.

Affected: `N-03R`, `I-02D`, `I-02`,
`TASKS.md`, `HANDOFF.md`, `INS-145`,
`INS-146`, and `DEC-067`. Existing assignment, functional
image authority, requirements, ADRs, contracts, architecture, data model, and
deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-066`, `INS-145`, `INS-146`,
`N-03R`, `I-02D`, and `I-02`.

## DEC-068 — Hold after I-02D acceptance

Status: `APPROVED`

Authority: Independent Instructor audit of the fresh same-directory Manager
under `INS-146 / DEC-067`. The Manager closed N-03R from its committed
evidence and completed exactly one authorized README-only I-02D worker. The
worker changed only `README.md`; the Manager updated only `TASKS.md` and
`HANDOFF.md` and stopped before I-02.

Decision: Accept the exact I-02D documentation delta integrated at commit
`f2fb6f9` and persist `INS-147 / HOLD`. The operational board is 57 rows:
55 `DONE`, `I-02D` `REVIEW`, and `I-02` `REVIEW`, with no `READY`,
`IN_PROGRESS`, or `BLOCKED` row. README links, documented command surfaces,
secret scan, whitespace, build, typecheck, lint, architecture, artifacts,
deferred-scope checker and its 15/15 tests, and runtime smoke pass. The known
architecture fixture diagnostic remains only a diagnostic; no new violation
was introduced.

Docker/PostgreSQL in the Manager environment, live CoinDesk collection without
a configured credential, configured LLM, configured browser/demo, OpenSpec CLI
execution, and consolidated live architecture scenarios remain
`BLOCKED`/`UNVERIFIED`. Documentation does not promote those gaps, fixtures,
or skipped tests to runtime PASS. No chat-supplied Gemini credential was used
or mapped.

The next action requires a separate final I-02 authorization beginning from
the committed HEAD containing this HOLD, whose accepted source/documentation
base is `f2fb6f9`. It must independently re-check source/business state, task
dependencies, and the remaining live/demo evidence; it must not start
downstream work or implement a new source gap under this HOLD.

Affected: `I-02D`, `I-02`, `N-03R`, `TASKS.md`, `HANDOFF.md`,
`INS-146`, and `INS-147`. Existing assignment, functional image authority,
requirements, ADRs, contracts, architecture, data model, and deferred scope
remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-067`, `INS-146`, `INS-147`, `I-02D`, `I-02`, and `N-03R`.

## DEC-069 — Authorize final I-02 revalidation

Status: `APPROVED`

Authority: Independent Instructor review at the committed `INS-147 / HOLD`
checkpoint `19f0de6`. N-03R is accepted and closed; the exact I-02D README
delta is accepted at `f2fb6f9`; the only remaining operational review row is
the existing final I-02 packet.

Decision: Authorize exactly one fresh same-directory Manager under
`INS-148 / APPROVED_FOR_EXECUTION` to close I-02D as a control-only
`REVIEW -> DONE` transition and re-enter I-02 through
`REVIEW -> READY -> IN_PROGRESS`. The Manager may use at most two fresh hidden
read-only verifiers with disjoint backend/frontend verification scopes. No
verifier may edit files, and no production source, contract, migration,
infrastructure, environment, requirements, ADR, OpenSpec, or control-plane
feature change is authorized.

The Manager must validate the existing I-02 acceptance scenarios and relevant
repository gates, use real configured data/providers where available, and
preserve `BLOCKED`/`UNVERIFIED` for unavailable Docker/Compose, PostgreSQL,
CoinDesk, LLM, browser/demo, OpenSpec, or consolidated live architecture
evidence. Fixtures, skips, documentation, and prior historical evidence are
not live PASS. The chat-supplied Gemini credential remains prohibited and no
credential may be requested or printed.

I-02 may move to `DONE` only if the complete final evidence and Full MVP DoD
are actually satisfied; otherwise it must remain `REVIEW` or
`NEEDS_INSTRUCTOR_REVIEW` with the precise blocker. The Manager must stop at
this packet and make at most one explicit-path staging/commit attempt. No
retry/replacement, extension, or downstream packet is authorized.

Affected: `I-02D`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-147`, and `INS-148`.
Existing assignment, functional image authority, requirements, ADRs,
contracts, architecture, data model, and deferred scope remain unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-068`, `INS-147`, `INS-148`, `I-02D`, and `I-02`.

## DEC-070 — Hold after independent INS-148 I-02 revalidation

Status: `HOLD`

Authority: Independent Instructor review after the fresh same-directory
Manager completed INS-148 / DEC-069. The Manager's exact control delta was
limited to `TASKS.md` and `HANDOFF.md`; both hidden read-only verifiers
completed once without edits. The five functional-amendment screenshots were
re-read and remain functional evidence only; their approved behavior is
already represented by the requirements and implementation packets.

Decision: Accept the control-only `I-02D REVIEW -> DONE` transition, but keep
the existing final `I-02` row at `REVIEW`. The board is 57 rows with `56 DONE`,
one `REVIEW`, and no `READY`, `IN_PROGRESS`, or `BLOCKED` row. Independent
validation proves deterministic I-02 behavior and local persistence: focused
backend `6/6`, frontend/projection `8/8`, full workspace `457 passed / 0
skipped` with the local PostgreSQL test database, migration
up/constraints/down/remigrate, build, typecheck, lint, architecture, artifact,
deferred-scope `15/15`, runtime smoke, and diff checks. This evidence is
accepted only at its stated boundary.

The Full MVP DoD is not yet proven. The real CoinDesk request without a
configured credential returned HTTP `401`; the final runtime has no configured
`COINDESK_API_KEY`, no configured `LLM_AUTHORING_*` provider, no localhost
browser/demo session, and the local OpenSpec CLI is unavailable. Manager-side
Compose/daemon access also remains `BLOCKED`/`UNVERIFIED`, even though the
Instructor host independently validated local Docker/PostgreSQL. No fixture,
skip, README statement, or historical result is promoted to live PASS. No
chat-supplied Gemini credential was mapped or used.

No implementation packet is safe to open under this HOLD. A future fresh
authorization may re-enter only I-02 after the missing configured provider and
demo evidence exists; it must not add a new provider, silently map `GEMINI_*`,
start downstream work, or retry a failed worker. Deferred scope and all other
task states remain unchanged.

Affected: `I-02D`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-148`, and `INS-149`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-069`, `INS-148`, `INS-149`, `I-02D`, and `I-02`.

## DEC-071 — Authorize narrow I-02 remote market client fix

Status: `APPROVED`

Authority: Instructor browser verification at the committed `INS-149 / HOLD`
checkpoint `69d7982`. The local backend returned live/readiness success with
PostgreSQL, but the frontend in explicit remote market mode rendered
`Failed to execute 'fetch' on 'Window': Illegal invocation` for all four
charts. Source inspection shows that the Auth and Feature clients already use
receiver-preserving browser fetch wrappers; the unbound default exists only in
the market client seam.

Decision: Authorize exactly one fresh same-directory Luna/max Manager under
`INS-150 / APPROVED_FOR_EXECUTION` to re-enter the existing `I-02` row and
delegate exactly one hidden worker. The worker may change only
`apps/frontend/src/market/clients.ts` and
`apps/frontend/src/market/clients.spec.ts`, adding a regression test for the
browser receiver behavior. The fix must preserve the existing remote REST and
market-WebSocket contracts and must not add providers, fixtures, API changes,
Auth/Feature changes, or any backend/module scope.

Acceptance requires the focused regression and I-02 frontend tests, relevant
typecheck/lint/build and repository gates, and a real local browser check in
remote mode showing the four charts no longer fail at the fetch boundary.
Fixture tests remain fixture evidence. Missing CoinDesk credential, configured
`LLM_AUTHORING_*`, OpenSpec CLI, and any other unavailable final-demo evidence
remain `BLOCKED`/`UNVERIFIED`; no `GEMINI_*` mapping or chat credential use is
authorized. If the issue crosses the exact two-file scope, the Manager must
stop for renewed Instructor review. No downstream packet is authorized.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-149`, and `INS-150`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-070`, `INS-149`, `INS-150`, and `I-02`.

## DEC-072 — Hold after independent INS-150 market-client repair review

Status: `HOLD`

Authority: Independent Instructor review after the fresh same-directory
Manager completed `INS-150 / DEC-071`. The sole hidden worker changed only the
authorized market client and regression test. The Manager updated the task
checkpoint and attempted one explicit-path commit; Git denied creation of
`.git/index.lock` in the Manager environment. The parent Instructor reviewed
the exact delta, reran the relevant tests and frontend build checks, and
integrated the four reviewed paths in commit
`37e168eb60acb808db897c7f3bbb97b8bc2a1e29`.

Accept the bounded receiver-preserving browser `fetch` repair and keep `I-02`
at `REVIEW`, not `DONE`. Independent evidence is focused frontend/I-02 `10/10`,
full frontend `50/50`, full workspace `449` passed with `9` expected
environment-gated skips and no failures, frontend/root build/typecheck/lint,
architecture, artifacts, deferred-scope, and diff checks, plus a same-origin
remote browser check where all four chart histories loaded without the prior
`Illegal invocation` error. This evidence does not prove authenticated
WebSocket/Auth isolation, real News, configured LLM, clean-install, OpenSpec
CLI, or the consolidated final demo.

The next possible implementation authorization may address the already
approved provider/configuration boundary: Docker-managed backend PostgreSQL
connection composition, ignored local `.env` loading/documentation, CoinDesk
RSS through the existing configured RSS adapter, and Gemini through the
existing OpenAI-compatible `LLM_AUTHORING_V1` contract. It must be a fresh
bounded review with explicit write scopes and must not expose or commit any
credential, silently map `GEMINI_*`, claim CoinDesk API evidence without a
successful real feed call, or promote I-02 until all final acceptance gates
are independently proven. No downstream task is authorized by this decision.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-150`, `INS-151`, and the
provider/configuration evidence boundary. Existing requirements, accepted ADRs,
architecture, data model, functional amendment, and deferred scope remain
unchanged.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-071`, `INS-150`, `INS-151`, and `I-02`.

## DEC-073 — Authorize bounded provider and local configuration completion

Status: `APPROVED`

Authority: Instructor review at the committed `INS-151 / HOLD` checkpoint
`2be555ccd834dca74d3ed53c307136f4975ebe02`. The operational board remains 57
rows with 56 `DONE` and only `I-02` at `REVIEW`; no Manager or worker is active.

Authorize exactly one fresh same-directory Luna/max Manager and exactly two
sequential hidden implementation workers for the bounded I-02 provider and
local-configuration packet recorded in `INS-152`. Worker A may change only
`apps/backend/src/runtime.ts` and
`apps/backend/src/runtime.news-composition.spec.ts` to compose the existing
safe configured RSS boundary from explicit allowlisted environment values,
preserve the explicit legacy CoinDesk JSON path, and exercise the existing
provider-neutral `LLM_AUTHORING_V1` OpenAI-compatible configuration path. The
official CoinDesk RSS feed is the no-API-key News option; a live feed call is
not claimed by this decision. Gemini is likewise an endpoint/model choice
through the existing `LLM_AUTHORING_*` names and Google's OpenAI-compatible
endpoint, not a native SDK, `GEMINI_*` alias, or new contract.

Worker B may change only the exact local configuration, Docker, frontend
env-loading/build, and documentation paths listed in `INS-152`. The root
`.env` remains ignored and user-created; no key, password, connection string,
or token may enter the repository or chat. Compose must construct the backend's
internal `DATABASE_URL` against the healthy `postgres-dev` service, while
preserving the existing explicit migration-preparation flow. Frontend build
and runtime configuration may expose only public `VITE_*` values.

Acceptance requires deterministic runtime/configuration tests, truthful
provider and Compose evidence, focused/full relevant tests and repository
quality gates, exact scope, no fixture fallback, and no secret exposure. A
missing Gemini key or unavailable Docker/Compose/OpenSpec/live-provider
environment remains `UNVERIFIED`/`BLOCKED`; it is never promoted to PASS. The
Manager must stop after this packet and leave `I-02` at `REVIEW` unless the
pre-existing full I-02 live/demo acceptance is independently proven. No
downstream packet, retry, replacement, duplicate, or architectural expansion
is authorized.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-151`, `INS-152`, and the
bounded provider/configuration evidence boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [Architecture](../architecture.md),
[Data model](../data-model.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-072`, `INS-151`, `INS-152`, the
[CoinDesk RSS announcement](https://www.coindesk.com/coindesk-news/2021/09/17/coindesk-rss),
and [Google Gemini OpenAI compatibility](https://ai.google.dev/gemini-api/docs/openai).

## DEC-074 — Hold after independent INS-152 configuration audit

Status: `HOLD`

Authority: Independent Instructor review after the fresh INS-152 Manager and
its two sequential hidden workers completed. The authorized delta is confined
to the recorded runtime, test, local `.env`, Docker, frontend, documentation,
and Manager checkpoint paths. Deterministic validation passed at its stated
boundaries, but the root template's empty optional
`COINDESK_RSS_ALLOWED_URLS=` is treated by the runtime parser as invalid rather
than absent. This prevents a copied `.env.example` from composing the valid
CoinDesk RSS configuration and must be corrected before acceptance.

Keep `I-02` at `REVIEW` and the repository on `HOLD`. The Manager's single
explicit staging attempt failed before staging with `.git/index.lock:
Permission denied`; the parent Instructor may integrate the exact reviewed
INS-152 delta for traceability, but no source change is accepted as complete
until a fresh authorization fixes this defect. Authorize no downstream packet,
provider redesign, native Gemini SDK, `GEMINI_*` alias, credential use, retry,
replacement, or duplicate. A future instruction may authorize only the
empty-optional-list parser correction and focused regression through one fresh
Manager and one hidden worker.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-152`, `INS-153`, and the
bounded provider/configuration evidence boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-073`, `INS-152`, and `INS-153`.

## DEC-075 — Authorize optional RSS allowlist reconciliation

Status: `APPROVED`

Authority: Instructor review after the INS-152 output was integrated at
`7c10afa14eff40adb85603453d2c743c6a7acfd0` and held under `INS-153 / DEC-074`.
The runtime's optional allowlist parser currently rejects a blank
`COINDESK_RSS_ALLOWED_URLS=` value even when the URL and a valid host/prefix
allowlist are present in the supported `.env.example`. This is a real copied
configuration failure, not a hypothetical provider concern.

Authorize exactly one fresh same-directory Luna/max Manager and exactly one
fresh hidden worker under `INS-154`. The worker may change only
`apps/backend/src/runtime.ts` and
`apps/backend/src/runtime.news-composition.spec.ts` to treat a blank optional
RSS list as absent while retaining fail-closed malformed/all-empty allowlist,
HTTPS, private-destination, and no-fixture behavior. No `.env.example`, Docker,
README, module, contract, provider protocol, credential, `GEMINI_*` alias,
retry, replacement, duplicate, or downstream packet is authorized.

Acceptance is focused deterministic regression plus relevant backend/repository
quality gates with `I-02` remaining `REVIEW`. Missing live provider, Gemini,
Docker, PostgreSQL, browser, clean-install, and OpenSpec evidence remains
`BLOCKED`/`UNVERIFIED`, never PASS. The Manager must stop after one worker,
one review/integration, and one commit attempt; the Instructor will independently
audit the resulting delta.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-153`, `INS-154`, and the
optional RSS configuration boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-074`, `INS-153`, and `INS-154`.

## DEC-076 — Hold after independent INS-154 acceptance and environment probe

Status: `HOLD`

Authority: Instructor review after INS-154 / DEC-075 completed with one fresh
Manager and one hidden worker. The optional RSS allowlist correction is
accepted and committed at `48301b240b533db4cdf53651eaaea24a3225e9ac` after the
Manager's single staging attempt was denied by `.git/index.lock` and the parent
Instructor integrated the exact reviewed four-file delta. Focused and
repository deterministic gates pass, while I-02 remains `REVIEW`.

An Instructor-side Docker probe also passed: the Docker daemon and Compose
interpolation were available, the existing local PostgreSQL development/test
services were healthy, and `npm run db:local:validate` passed its up,
constraint, down, and remigrate proof. This is evidence for the local database
boundary only; it is not a full backend/frontend Compose demo or authenticated
real-data acceptance.

The remaining I-02 gates are a full Compose application run and teardown,
live configured CoinDesk RSS through the safe News boundary, a live Gemini
OpenAI-compatible authoring call through the existing `LLM_AUTHORING_*`
contract using a newly rotated local key, authenticated real-data browser/demo
coverage including ownership and Binance realtime behavior, clean-install
evidence, and formal OpenSpec CLI validation. The root `.env` is absent; the
previously exposed chat key is not usable and no credential may be requested,
printed, stored, or committed. Missing live evidence remains
`UNVERIFIED`/`BLOCKED`, never `PASS`.

`TASKS.md` and `HANDOFF.md` remain Manager-owned and currently retain the
pre-integration wording that the INS-154 delta is uncommitted. A fresh Manager
must reconcile those records to `48301b2` before the next acceptance decision.
No downstream packet, retry, replacement, duplicate, provider redesign,
native Gemini integration, or scope expansion is authorized by this HOLD.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-154`, `INS-155`, and the
bounded provider/configuration evidence boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-075`, `INS-154`, and `INS-155`.

## DEC-077 — Record Instructor-owned Docker and local application evidence

Status: `APPROVED`

Authority: Instructor validation after `INS-155 / HOLD`, using the canonical
checkout at source commit `48301b240b533db4cdf53651eaaea24a3225e9ac` and
governance HEAD `59a69e1`. This entry records environment evidence that was
unavailable to the prior unprivileged Manager context; it does not turn a
tool's mere presence into a PASS and does not replace the Manager checkpoint.

The following Instructor-side checks passed without adding a credential or
printing a secret:

- Docker daemon access and Docker Compose CLI were available in the elevated
  Instructor context.
- Compose interpolation validation passed with the local generated
  PostgreSQL environment file, without exposing its value.
- `npm run db:local:validate` passed the local PostgreSQL up, constraint,
  down, and remigrate proof.
- `docker compose ... up --detach --build --wait backend frontend` completed
  successfully. Backend, frontend, `postgres-dev`, and `postgres-test` were
  healthy; `/live=200`, `/ready=200`, and the frontend root returned `200`.
  A sanitized container inspection confirmed the backend database target was
  `postgres-dev:5432/cryptox_development` with a password present but not
  printed.
- `docker compose ... down` completed successfully for the exact
  `cryptox-local` project without removing named volumes or unrelated
  containers.

This proves the local Docker/Compose/PostgreSQL/migration/application-health
boundary, not the final I-02 product demo. A live CoinDesk request through the
existing safe runtime provider remains `BLOCKED` with `SafeNewsFetchError`
reason `HTTP_ERROR`; a direct HTTP status check returning 200 is not promoted
to runtime-provider PASS. The root `.env` is absent, so live Gemini authoring
and its Save/Approve persistence path remain `UNVERIFIED`; the previously
exposed chat key is not used. Authenticated real-data browser/demo coverage,
clean-install/reprovision evidence, and formal OpenSpec CLI validation also
remain `UNVERIFIED`/`BLOCKED`. The Docker frontend image emitted an npm audit
observation (7 vulnerabilities reported by the build tool); it is recorded,
not silently repaired under this evidence-only decision.

Authorize exactly one fresh same-directory Luna/max Manager under `INS-156`,
with no worker, to reconcile only `TASKS.md` and `HANDOFF.md` to the accepted
`48301b2` source checkpoint and this evidence. The Manager must leave `I-02`
at `REVIEW`; no source change, credential, retry, duplicate, downstream task,
provider redesign, or scope expansion is authorized.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-155`, `INS-156`, and the local
environment evidence boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-076`, `INS-155`, and `INS-156`.

## DEC-078 — Hold after Instructor-owned Docker reconciliation

Status: `HOLD`

Authority: Instructor review after the control-only `INS-156` reconciliation
was independently audited and integrated at
`c896ad3f926f0819b309ab3891e68f96ab28bc78`. The accepted source/runtime/test implementation remains
`48301b240b533db4cdf53651eaaea24a3225e9ac`; I-02 remains `REVIEW` with 57
operational rows, 56 `DONE`, and no competing active task.

The repeated Docker/PostgreSQL block is confirmed to be a Manager execution
context permission issue. Instructor-side checks passed Docker daemon access,
Compose interpolation, local PostgreSQL migration validation
`up/constraints/down/remigrate`, project-scoped backend/frontend Compose build
and `--wait`, health for both Postgres services plus backend/frontend, backend
`/live=200`, `/ready=200`, frontend `200`, sanitized internal target
`postgres-dev:5432/cryptox_development`, and exact project teardown without
volume removal or unrelated-container impact. Managers must preserve this
committed evidence while reporting their own unavailable tool context as
`UNVERIFIED/BLOCKED`.

I-02 is not complete. Live CoinDesk RSS through the safe runtime remains
`BLOCKED` (`SafeNewsFetchError` / `HTTP_ERROR`) despite a direct HTTP 200;
the root `.env` is absent, so live Gemini through `LLM_AUTHORING_*` plus
Save/Approve persistence remains `UNVERIFIED`; authenticated real-data
browser/demo coverage, clean-install/reprovision, and formal OpenSpec CLI
validation remain `UNVERIFIED/BLOCKED`. The previously exposed chat key was
not used and must not be used. The Docker build also reported an npm audit
observation (7 vulnerabilities); it is recorded, not silently repaired under
this hold.

No downstream packet or new implementation authorization is issued by this
HOLD. A future signal may authorize one final evidence/reconciliation Manager
after the environment prerequisites are satisfied; no provider redesign,
native Gemini integration, credential in repository/chat, retry, replacement,
duplicate, or scope expansion is implied.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-156`, `INS-157`, and the
Docker/PostgreSQL evidence boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-077`, `INS-156`, and `INS-157`.

## DEC-079 — Authorize N-03S pinned HTTPS transport correction

Status: `APPROVED`

Authority: Instructor review after `INS-157 / HOLD`, against the canonical
checkout at `c0a5d67032fdc04a25a0023794d6bf634cff8ce8` with 56 of 57 task rows
`DONE`, only `I-02` at `REVIEW`, and no active Manager or worker.

Independent live diagnosis found a real defect in the existing safe News
transport: Node 22 invokes the custom HTTPS lookup in its multi-address lookup
mode, while the pinned transport returns the single-address callback shape.
The resulting `ERR_INVALID_IP_ADDRESS` is wrapped as `SafeNewsFetchError` with
reason `HTTP_ERROR`. A normal HTTPS request to the same public CoinDesk RSS
endpoint succeeds, so this is a bounded transport compatibility defect rather
than evidence of a Docker, PostgreSQL, migration, or CoinDesk API-key failure.

Authorize exactly one fresh same-directory Luna/max Manager under `INS-158 /`
`APPROVED_FOR_EXECUTION` and exactly one fresh hidden worker. The worker may
change only `modules/news/infrastructure/safe-fetch.ts` and
`modules/news/infrastructure/safe-fetch.spec.ts` to make the default pinned
HTTPS transport compatible with the supported Node lookup mode while retaining
address pinning, TLS/SNI, HTTPS and allowlist checks, redirect revalidation,
DNS/private-destination protection, no credentials/cookies, timeout, and body
limits. The Manager may update only `TASKS.md` and `HANDOFF.md` for the N-03S
checkpoint and must stop at `REVIEW`.

No runtime composition, provider protocol, CoinDesk JSON/API migration,
allowlist weakening, unrestricted fetch fallback, Docker, PostgreSQL,
migration, README, frontend, LLM/Gemini, credential, retry, replacement,
duplicate, worktree, I-02 promotion, or downstream execution is authorized.
Focused safe-fetch and applicable repository gates are required. Instructor
will independently run the live safe-runtime RSS smoke after integration;
direct HTTP status, fixture output, skipped tests, or unavailable environment
cannot be promoted to PASS. Any need for a path outside the two listed worker
files is `NEEDS_INSTRUCTOR_REVIEW`.

Affected: `N-03S`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-157`, `INS-158`,
`MVP_PLAN.md`, and the existing `CSL-R-NW-02`/`CSL-R-RD-01` safe News boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
[ADR-009](../adr/ADR_009_controlled_llm_and_external_content.md),
`DEC-078`, `INS-157`, and `INS-158`.

## DEC-080 — Hold after N-03S acceptance and Gemini provider diagnosis

Status: `HOLD`

Authority: Instructor review after `INS-158 / APPROVED_FOR_EXECUTION`. The
bounded N-03S source correction was independently reviewed and integrated at
`c228117` (`fix(news): support Node 22 pinned lookup shape`). The exact four
tracked files in that Manager checkpoint were integrated; the untracked
`.codex/config.toml` and ignored local `.env` remain outside the commit, and
no credential value is recorded.

N-03S acceptance evidence is complete: focused safe-fetch `7/7`, News `36/36`,
backend `43` with one environment-gated skip, workspace `462` with nine
environment-gated skips, build/typecheck/lint, architecture, artifact,
scope/deferred, runtime-smoke, exact-path, secret/logging, whitespace, and
diff checks passed. The Instructor's production safe-runtime CoinDesk RSS
smoke returned a non-empty normalized result with five items. The single
fresh hidden worker and Manager stopped at the authorized `REVIEW` boundary;
the Manager's one explicit-path staging attempt was denied and was not retried.

The local `.env` is now present with the existing provider-neutral
`LLM_AUTHORING_*` names. Gemini model metadata was reachable and a diagnostic
Flash request through the OpenAI-compatible endpoint succeeded for another
listed model, but the configured `gemini-3.7-flash` completion did not produce
a bounded application result and observed timeout/503 behavior. Native
Interactions diagnostics did not complete either. Therefore live structured
`LLM_AUTHORING_V1` draft validation and Save/Approve persistence remain
`BLOCKED`, not PASS; no provider response, credential, or draft was persisted.

The remaining I-02 evidence is authenticated real-data browser/demo coverage,
clean-install/reprovision, and formal OpenSpec CLI validation, with unavailable
checks remaining `UNVERIFIED`/`BLOCKED`. N-03R and I-02D are `DONE`, so the E5R
residual join is eligible for a new bounded final I-02 revalidation signal.
That signal may reconcile/close the Manager-owned N-03S row and run the
existing I-02 final evidence only. It does not authorize native Gemini code,
automatic fallback/retry, a new provider, fixture substitution, or unrelated
repair. The current Instructor signal is `INS-159 / HOLD`.

Affected: `N-03S`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-158`, `INS-159`, and
the existing E5R residual join.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-079`, `INS-158`, and `INS-159`.

## DEC-081 — Authorize E5R closure and final I-02 revalidation

Status: `APPROVED`

Authority: Independent Instructor review at the committed `INS-159 / HOLD`
checkpoint `a4520dc`. N-03R and I-02D are `DONE`; N-03S source and live
safe-runtime acceptance is complete at `c228117`, with only its Manager-owned
operational row still at `REVIEW`. The board has no `READY` or `IN_PROGRESS`
row and no active Cryptox Manager or worker. This satisfies the E5R residual
join recorded in `MVP_PLAN.md` and permits re-entry into the existing final
I-02 packet.

Authorize exactly one fresh same-directory Manager in the canonical checkout,
using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager may
close only N-03S `REVIEW -> DONE`, re-enter only I-02 through
`REVIEW -> READY -> IN_PROGRESS`, and run the existing final I-02 verification.
It may move I-02 to `REVIEW` or `DONE` only according to the evidence. The
Manager alone owns the corresponding `TASKS.md` and `HANDOFF.md` updates.

The Manager may create at most three fresh hidden internal read-only verifiers
with disjoint backend, frontend/browser, and setup/traceability scopes. No
verifier may edit files or create/retry/replace another task. The Manager and
verifiers must preserve the distinction between real provider/demo evidence
and fixtures, skips, historical results, or unavailable environments.

Final acceptance is the existing I-02 scope: PostgreSQL-backed Auth and
two-user ownership isolation; Binance historical/realtime/recovery and
four-chart behavior; strategy/composite, bounded Search/progress/Top-K,
Experiment, signals/overlays, metrics and provenance; real News and local
Sentiment; configured LLM draft validation plus explicit Save/Approve and
failure isolation; functional amendment behavior; all eight architecture
change scenarios; clean setup/migration, E2E twice where available, and the
repository quality gates. Any unavailable Docker, PostgreSQL, provider,
browser, clean-install, or OpenSpec evidence remains `BLOCKED`/`UNVERIFIED`.

This decision authorizes no source repair, native Gemini protocol, `GEMINI_*`
mapping, automatic retry/backoff/fallback, new provider, credential change,
fixture substitution, migration/Docker redesign, deferred scope, or
downstream task. A provider outage must remain a truthful failure and must not
be converted into PASS. If complete Full MVP DoD evidence is not present, the
Manager must leave I-02 at `REVIEW` with precise blockers. It may make at most
one explicit-path checkpoint staging/commit attempt and must stop after this
authorization; the Instructor will independently audit the result.

Affected: `N-03S`, `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-159`, `INS-160`, and
the E5R residual join.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-080`, `INS-159`, and `INS-160`.

## DEC-082 — Hold after independent INS-160 final review

Status: `HOLD`

Authority: Instructor review after the fresh same-directory INS-160 Manager
completed. The Manager's exact two-file control checkpoint was integrated at
`15a0314`; N-03S is now `DONE`, and the only operational review row is the
existing final `I-02`. The Manager created exactly three hidden read-only
verifiers, all completed without edits, and made one denied explicit-path
commit attempt without retry. The tracked source/business tree has no drift
from the accepted `c228117` checkpoint; `.codex/config.toml` remains the only
pre-existing untracked item.

Independent review accepts the deterministic and bounded evidence: workspace
`462` tests with nine environment-gated skips, I-02 fixture E2E backend `6/6`
and frontend `5/5` on each of two runs, build/typecheck/lint,
architecture/artifacts/scope/deferred checks, runtime smoke, and the accepted
N-03S live CoinDesk safe-runtime result. The root ignored `.env` now selects
`gemini-3.6-flash`, and the complete provider adapter returned a structured
draft with `fastPeriod` and `slowPeriod`; application REST Save/Approve
persistence has not yet been proved.

The final I-02 Full MVP DoD is not proven. Current live PostgreSQL/Auth
ownership E2E, configured Binance application/realtime and authenticated
browser/demo evidence, clean install/reprovision, full application LLM
Save/Approve, traceability reconciliation, and a consolidated executable
eight-scenario matrix remain `BLOCKED`/`UNVERIFIED` as applicable. OpenSpec is
not unavailable: Instructor execution of installed CLI `1.11.0` passed the
active `mvp-implementation` change but failed all ten capability specs because
they lack the validator-required `## Purpose` and `## Requirements` sections.

Keep the current Instructor signal at `INS-161 / HOLD`. The next authorization
must be separately bounded for OpenSpec/spec-format and traceability
reconciliation, or a strictly bounded live-evidence action if no artifact
change is needed. It may not silently repair source, add native Gemini code,
map `GEMINI_*`, add automatic retry/fallback, change credentials, substitute
fixtures, or start downstream work. No claim of final MVP completion is
permitted until the remaining live/demo and validation requirements are
actually evidenced.

Affected: `I-02`, `N-03S`, `TASKS.md`, `HANDOFF.md`, `INS-160`, `INS-161`, and
the OpenSpec/traceability final-verification boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-081`, `INS-160`, and `INS-161`.

## DEC-083 — Authorize OpenSpec and traceability reconciliation

Status: `APPROVED`

Authority: Instructor review at the committed `INS-161 / HOLD` checkpoint
`5d14f27598f2b2b25c0f3d4ec44f9319a1009f9a`. The final INS-160 review left
only `I-02` operationally at `REVIEW` (`57` of `58` rows are `DONE`); no
Manager or worker is active. OpenSpec CLI `1.11.0` is installed and runnable
in the Instructor context. Its active `mvp-implementation` change validates,
but all ten active capability specs fail solely because their purpose heading
is not in the CLI-required `## Purpose` form. The final review also identified
seven required IDs not literally covered by the current `MVP_PLAN.md`.

Authorize exactly one fresh same-directory Manager in the canonical checkout,
using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager may
create exactly two fresh hidden internal workers sequentially, with disjoint
write scopes: one may normalize only the ten active capability spec headings
under `openspec/specs/` while preserving their existing content and meaning;
the other may edit only `docs/implementation/MVP_PLAN.md` to add traceability
for `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-MD-01`, `CSL-R-SE-01`,
`CSL-R-SE-02`, `CSL-R-ST-02`, and `CSL-R-VIS-01` to existing approved packets
and evidence. No worker may edit source, tests, requirements, ADRs, active or
archived changes, config, environment, task state, handoff, or credentials.

The Manager alone may update `TASKS.md` and `HANDOFF.md`, and may re-enter
only the existing `I-02` row `REVIEW -> READY -> IN_PROGRESS -> REVIEW` for
this reconciliation. It must not mark I-02 `DONE` under this packet. Acceptance
requires OpenSpec `validate --all --no-interactive --json` to pass for all
active specs/change, the seven IDs to link to existing packets without DAG or
scope changes, and exact-path/whitespace/secret/link/DAG checks to pass. Any
semantic requirement change, new task, source repair, or extra path is
`NEEDS_INSTRUCTOR_REVIEW`. Each worker runs once; no retry/replacement. The
Manager makes at most one explicit-path checkpoint commit attempt and stops.

No native Gemini integration, `GEMINI_*` mapping, automatic retry/fallback,
credential change, provider addition, fixture substitution, deferred scope,
final I-02 promotion, or downstream execution is authorized. The Instructor
will independently rerun the CLI and audit the resulting documentation/spec
diff before issuing the next signal.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `MVP_PLAN.md`, `openspec/specs/**`,
`INS-161`, and `INS-162`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-082`, `INS-161`, and `INS-162`.

## DEC-084 — Hold after independent INS-162 reconciliation review

Status: `HOLD`

Authority: Instructor review after the fresh same-directory INS-162 Manager
completed and the Instructor independently integrated the audited delta at
`ddddfe6` (`chore(control): integrate INS-162 reconciliation`). The exact
authorized changes are limited to the ten active OpenSpec spec headings, the
19-line seven-ID traceability block in `MVP_PLAN.md`, and the Manager-owned
`TASKS.md`/`HANDOFF.md` checkpoint. The pre-existing untracked
`.codex/config.toml` remains excluded; no source, test, environment,
credential, migration, infrastructure, or provider change was made.

The operational board remains 58 rows with 57 `DONE` and only `I-02` at
`REVIEW`. INS-162 moved only I-02 through `REVIEW -> READY -> IN_PROGRESS ->
REVIEW`; N-03S, N-03R, I-02D, I-01, and I-03 remain `DONE`. Galileo and Pauli
were fresh hidden sequential workers, each completed once and closed; no retry,
replacement, duplicate, competing Manager, or worktree was used.

OpenSpec CLI `1.11.0` is installed and executable through the Instructor's
absolute npm shim. Independent `openspec validate --all --no-interactive
--json` returned 11 items: the active `mvp-implementation` change passed, but
all 10 capability specs failed because each requirement has no validator-
recognized nested scenario. The CLI requires level-4 headers such as
`#### Scenario: ...` with `WHEN`/`THEN`/`AND` bullets. The `## Purpose`
normalization is therefore accepted, but scenario restructuring is a separate
semantic/spec-format reconciliation and is not silently included in INS-162.

INS-162's exact-path, Markdown/link/anchor, DAG, scope, secret, whitespace, and
diff checks passed, and the seven previously omitted canonical IDs are now
mapped to existing packets/evidence in `MVP_PLAN.md` without changing task DAG
or scope. The full I-02 DoD remains unproven: live PostgreSQL/Auth ownership,
configured Binance historical/realtime/recovery, authenticated browser/demo,
clean install/reprovision, application LLM Save/Approve, and consolidated
architecture/live evidence remain `BLOCKED` or `UNVERIFIED` at their recorded
boundaries. Earlier Instructor-side Docker/PostgreSQL, RSS, and Gemini 3.6
provider-boundary evidence is not promoted beyond what it actually proves.

The next signal may authorize only a bounded OpenSpec scenario-format
conversion and/or a separately bounded final live-evidence packet after fresh
applicability review. No source repair, native Gemini protocol,
`GEMINI_*` mapping, automatic retry/fallback, credential change, fixture
substitution, migration/Docker redesign, deferred scope, or downstream task is
authorized under this HOLD. No final MVP-complete claim is permitted until
the remaining evidence is real and independently reviewed.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `MVP_PLAN.md`, active OpenSpec
specifications, `INS-162`, and the final I-02 verification boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-083`, `INS-162`, and `INS-163`.

## DEC-085 — Authorize OpenSpec scenario-format reconciliation

Status: `APPROVED`

Authority: Instructor review at the committed `INS-163 / HOLD` checkpoint
`05be4b000a81b98f5095cdf3de2746cc198df933`. The tracked tree is clean apart
from the pre-existing untracked `.codex/config.toml`; the operational board
has 58 rows with 57 `DONE` and only `I-02` at `REVIEW`.

Independent execution of installed OpenSpec CLI `1.11.0` confirmed that the
active `mvp-implementation` change passes but all ten active capability specs
fail because every requirement has an empty validator-recognized scenario
collection. The existing `#### Scenario: ...` blocks are grouped under a
separate acceptance section. This is a bounded specification-structure
reconciliation, not permission to change product behavior.

Authorize exactly one fresh same-directory Manager in the canonical checkout,
using `gpt-5.6-luna` with `max` reasoning and no worktree. It may create exactly
one fresh hidden worker, once, with the same model/reasoning. The worker may
edit only the ten active capability spec files under `openspec/specs/` listed
in `INS-164`, moving each existing scenario block under the requirement it
already describes and removing only an empty acceptance-section heading. All
scenario text, requirement prose, traceability, links, and meaning must be
preserved; no scenario may be added, deleted, duplicated, or reworded. An
ambiguous mapping requires `NEEDS_INSTRUCTOR_REVIEW`.

The Manager alone may update `TASKS.md` and `HANDOFF.md`, re-entering only
`I-02` as `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; it must not mark I-02
`DONE` or run any pending active-change implementation task. Acceptance
requires formal OpenSpec validation of all 11 active items, exact scenario
count/placement preservation, every requirement having a nested scenario,
and exact-path Markdown/link/DAG/scope/secret/whitespace/diff checks. One
checkpoint commit attempt maximum; no retry.

No source/test implementation, active-change or archived-change edit,
requirement/ADR/architecture change, native Gemini protocol, `GEMINI_*`
mapping, automatic retry/fallback, credential change, fixture substitution,
migration/Docker redesign, deferred scope, downstream task, or final MVP
promotion is authorized. The Instructor will independently rerun OpenSpec and
audit the result before the next signal.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, the ten active OpenSpec capability
specifications, `INS-163`, and `INS-164`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-084`, `INS-163`, and `INS-164`.

## DEC-086 — Hold after failed INS-164 preservation review

Status: `HOLD`

Authority: Instructor review after INS-164 / DEC-085 completed. The fresh
Manager `01a0596b-ddbc-7e00-953b-287cec56d184` and single worker Popper
`01a0596f-34e6-70d2-813c-559c38f00bd9` ran once, used the canonical checkout,
and closed without a commit attempt after independent gates failed. No retry,
replacement, duplicate, or worktree was used.

The active OpenSpec validation is genuinely available and passes `11/11`:
the active `mvp-implementation` change plus all ten capability specs validate,
and all 47 requirements have nested scenarios. The worker output is not
accepted because exact scenario preservation is `63/64`: the original
Backtesting block `#### Scenario: Dual-trigger candle is conservative` is
missing from its required `Deterministic historical simulation` placement.
`git diff --check` also reports new EOF blank-line residues in nine specs.

The current intentional uncommitted delta is exactly the ten active spec files
plus Manager-owned `TASKS.md` and `HANDOFF.md`; no source/business path or
other tracked file changed. The operational board remains 58 rows, 57 `DONE`,
only `I-02` at `REVIEW`, with no other active row. INS-164 moved only I-02
through `REVIEW -> READY -> IN_PROGRESS -> REVIEW` and left it at `REVIEW`.

Keep the repository on `HOLD`. A fresh authorization may permit only a bounded
correction of this known delta: restore the exact missing existing scenario,
remove the nine introduced EOF blank-line residues, and rerun OpenSpec plus
exact preservation/placement, Markdown/link/DAG/scope/secret/whitespace/diff
checks. No source implementation, requirements/ADR/architecture change,
provider or credential change, native Gemini protocol, automatic retry or
fallback, fixture substitution, Docker/migration redesign, deferred scope,
downstream execution, or final MVP promotion is authorized until that fresh
review succeeds.

Affected: `I-02`, the ten active OpenSpec specifications, `TASKS.md`,
`HANDOFF.md`, `INS-164`, and the final I-02 verification boundary.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-085`, `INS-164`, and `INS-165`.

## DEC-087 — Authorize bounded correction of the failed spec delta

Status: `APPROVED`

Authority: Instructor review at the committed `INS-165 / HOLD` checkpoint
`c007f40`. The current working tree intentionally contains exactly the
unaccepted INS-164 delta: ten active OpenSpec spec files plus Manager-owned
`TASKS.md` and `HANDOFF.md`. No source/business path or unrelated tracked drift
is present; `.codex/config.toml` remains excluded.

INS-164's formal OpenSpec validation passes `11/11` and all 47 requirements have
nested scenarios, but exact preservation is `63/64`. The only missing baseline
block is `#### Scenario: Dual-trigger candle is conservative` from Backtesting,
which belongs under `Deterministic historical simulation`. `git diff --check`
also reports one new EOF blank line in nine of the changed specs. The prior
Manager and Popper completed once and closed; no retry or replacement is
authorized.

Authorize exactly one fresh same-directory Manager and exactly one fresh hidden
correction worker, both using `gpt-5.6-luna` with `max` reasoning, in the
canonical checkout and without a worktree. The new worker may edit only the
nine spec paths listed in INS-166: restore the exact missing baseline scenario
once and verbatim in Backtesting and remove only the nine reported EOF blank
lines. It must preserve all other existing relocation changes and may not edit
the auth spec, control plane, requirements, ADRs, OpenSpec change/config,
source, tests, environment, credentials, migrations, infrastructure, or any
other path.

The Manager alone may update `TASKS.md` and `HANDOFF.md`, re-entering only I-02
as `REVIEW -> READY -> IN_PROGRESS -> REVIEW`, and must leave I-02 at `REVIEW`.
Acceptance requires exact equality with the baseline's 64 scenario blocks,
correct placement under all 47 requirements, `git diff --check` PASS,
OpenSpec `11/11` PASS, and exact-path/Markdown/link/DAG/scope/secret/whitespace
checks. One explicit-path commit attempt maximum; no retry. If any unexpected
semantic or path change is needed, stop at `NEEDS_INSTRUCTOR_REVIEW`.

No implementation, provider, credential, Docker/migration, deferred-scope,
downstream, or final MVP action is authorized. The Instructor will independently
audit and integrate only a passing result before issuing the next signal.

Affected: the known INS-164 spec delta, `I-02`, `TASKS.md`, `HANDOFF.md`,
`INS-165`, and `INS-166`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-086`, `INS-165`, and `INS-166`.

## DEC-088 — Hold after failed INS-166 preservation review

Status: `HOLD`

Authority: Instructor review after `INS-166 / DEC-087`. The fresh same-directory
Manager `01a05983-76af-7a50-bc62-c84ce66ec14a` and one fresh hidden worker
Averroes `01a05988-8f79-75c3-a85c-ba0c9ef400fc` completed once and closed with
no staging or commit attempt. No retry, replacement, duplicate, or worktree
was used.

The correction now preserves all 64 baseline scenario blocks exactly once and
places scenarios under all 47 requirements; `git diff --check` passes. The
Instructor independently ran the installed global OpenSpec CLI `1.11.0` via
the absolute npm shim and verified `11/11 PASS`. This proves the OpenSpec
installation is valid, while the Manager's inability to access the shim remains
`BLOCKED/UNVERIFIED` and is not converted to PASS.

The output is not accepted because the non-scenario preservation gate found one
duplicate final invariant in `openspec/specs/evaluation/spec.md`, and byte-level
review found unauthorized mixed line endings in the nine worker target specs:
backtesting, evaluation, frontend, leaderboard, market-data, news, search,
sentiment, and strategy. The current intentional tracked delta remains exactly
the ten active specs plus Manager-owned `TASKS.md` and `HANDOFF.md`; no source
or business-state drift is present. The board remains 58 rows, 57 `DONE`, only
`I-02` at `REVIEW`, and no other active task.

Keep the repository on `HOLD`. A fresh authorization may allow only removal of
that one duplicate invariant and restoration of the original LF bytes in the
nine affected specs, with exact 64-block preservation, OpenSpec, whitespace,
path, link, DAG, scope, and secret checks. No implementation, provider,
credential, Docker/migration, deferred-scope, downstream, or final I-02 action
is authorized until that correction is independently accepted.

Affected: `I-02`, the ten active OpenSpec specs, `TASKS.md`, `HANDOFF.md`,
`INS-166`, and `INS-167`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-087`, `INS-166`, and `INS-167`.

## DEC-089 — Authorize exact spec-delta preservation repair

Status: `APPROVED`

Authority: Instructor review at the committed `INS-167 / HOLD` checkpoint
`ec1209d`. OpenSpec `1.11.0` is genuinely installed as the global
`@fission-ai/openspec@1.11.0` package and the Instructor's direct absolute-shim
run passes all 11 active items. The Manager sandbox's inability to access the
shim remains `BLOCKED/UNVERIFIED` and is not treated as a PASS.

The known uncommitted delta contains exactly the ten active capability specs
plus Manager-owned `TASKS.md` and `HANDOFF.md`; no source or business-state
drift is present. INS-166's correction now has exact scenario preservation
`64/64`, nested coverage `47/47`, correct Backtesting dual-trigger placement,
and `git diff --check` PASS, but independent review rejects it because
`openspec/specs/evaluation/spec.md` repeats one final invariant and nine worker
target specs contain unauthorized mixed line endings. The board remains 58
rows, 57 `DONE`, only `I-02` `REVIEW`, with no active Manager or worker.

Authorize exactly one fresh same-directory `gpt-5.6-luna` Manager with `max`
reasoning and exactly one fresh hidden worker under it, also Luna max, with no
worktree and no retry/replacement of Averroes. The worker may edit only the
nine affected active spec paths listed in `INS-168`: remove that one duplicate
invariant and restore LF bytes, preserving every scenario and all other
content. The Manager alone may update `TASKS.md`/`HANDOFF.md`, re-enter only
`I-02` through `REVIEW -> READY -> IN_PROGRESS -> REVIEW`, and must stop at
`REVIEW`.

Acceptance requires exact 64-block/47-requirement preservation, `w/lf` for all
active specs, OpenSpec `11/11 PASS` where available, and exact-path,
Markdown/link, DAG, scope/deferred, secret, whitespace, and diff checks. One
explicit-path commit attempt maximum; no implementation, provider, credential,
Docker/migration, deferred-scope, downstream, or final I-02 action is
authorized. The Instructor will independently audit and integrate only a
passing result.

Affected: `I-02`, the ten active OpenSpec specs, `TASKS.md`, `HANDOFF.md`,
`INS-167`, and `INS-168`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-088`, `INS-167`, and `INS-168`.

## DEC-090 — Authorize post-integration control reconciliation

Status: `APPROVED`

Authority: Instructor review after INS-168/DEC-089. The Instructor independently
accepted the scoped correction and integrated exactly the ten active OpenSpec
specifications plus Manager-owned `TASKS.md` and `HANDOFF.md` at commit
`3d1342637e9f6d83cd8799f458f477e65aad0731`. OpenSpec `1.11.0` passes all 11
active items; exact scenario preservation is `64/64`, nested requirement
coverage `47/47`, all active specs are LF-only, and the applicable repository
gates pass. Only the pre-existing untracked `.codex/config.toml` remains.

The INS-168 Manager and Darwin worker completed once and closed. The Manager's
single staging/commit attempt was correctly denied by `.git/index.lock`, but
the Instructor then performed the authorized independent integration. As a
result, `TASKS.md` and `HANDOFF.md` still describe the earlier uncommitted
checkpoint and HEAD `5a74e98`; this is stale control evidence, not source drift.
The operational board remains 58 rows, 57 `DONE`, only `I-02` `REVIEW`, with no
active Manager or worker.

Authorize exactly one fresh same-directory `gpt-5.6-luna` Manager with `max`
reasoning, no worktree, and zero workers. The Manager may edit only
`docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` to record
the accepted integration HEAD `3d13426`, the validation evidence, and the
truthful I-02 checkpoint, leaving I-02 at `REVIEW` and starting nothing else.
No implementation, source, provider, credential, Docker/migration,
OpenSpec-change, downstream, or final MVP work is authorized. One explicit-path
commit attempt maximum; the Instructor will independently verify the result.

Affected: `I-02`, `TASKS.md`, `HANDOFF.md`, `INS-168`, and `INS-169`.

Canonical references: [Contributor rules](../../AGENTS.md),
[Requirements](../requirements.md), [MVP plan](../implementation/MVP_PLAN.md),
[Task state](../implementation/TASKS.md), [Latest checkpoint](../implementation/HANDOFF.md),
`DEC-089`, `INS-168`, and `INS-169`.
