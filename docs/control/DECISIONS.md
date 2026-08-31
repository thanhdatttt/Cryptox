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
