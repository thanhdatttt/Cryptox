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
