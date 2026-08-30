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
