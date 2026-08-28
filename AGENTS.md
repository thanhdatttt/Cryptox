# Cryptox Contributor Rules

## Purpose and required reading

Cryptox is a university Crypto Strategy Lab whose primary deliverable is a defensible, extensible software architecture. Read this file first. Before changing the repository, then read the governing sources in this order:

1. The instructor assignment and later approved instructor changes identified in `docs/requirements.md`.
2. `docs/requirements.md` for the reviewed, traceable baseline and approved/deferred scope.
3. Accepted ADRs in `docs/adr/`, following explicit supersession relationships.
4. The primary architecture and data-model documents once established at `docs/architecture.md` and `docs/data-model.md`.
5. Approved active capability specs under `openspec/specs/`.
6. An approved active change under `openspec/changes/`, when one exists.

Current source is evidence of implementation status and is authoritative for the exact shape of an already-approved executable contract. It cannot create product scope.

## Level 2 repository control plane

The repository and Git are the shared source of truth for independent Instructor,
Orchestrator/Manager, and worker conversations. Chat history, chat-only decisions,
and an agent's memory are not execution authority.

The stable responsibility split is:

- The **Instructor** interprets requirement changes, reviews architecture and the
  current execution frontier, records durable approvals in
  `docs/control/DECISIONS.md`, and issues the current execution signal in
  `docs/control/INSTRUCTOR.md`. The Instructor is not the normal feature worker.
- The **Orchestrator/Manager** verifies the current Instructor signal, assigns only
  authorized READY work with disjoint write scopes, reviews and integrates worker
  output, validates checkpoints, and alone updates
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
- **Workers** implement only an assigned packet and return scoped changes, tests,
  and checkpoint evidence. They may read but must not edit `INSTRUCTOR.md`,
  `DECISIONS.md`, `TASKS.md`, or `HANDOFF.md`, and they do not move global task
  state.

Control artifacts have one purpose each: `MVP_PLAN.md` owns the durable program and
task packets; `TASKS.md` is the sole operational task-state/dependency authority;
`HANDOFF.md` is the latest replaceable execution checkpoint; `DECISIONS.md` is the
append-oriented approved decision ledger; and `INSTRUCTOR.md` is the small,
replaceable current authorization. Do not duplicate those truths across files.

### Level 2 bootstrap prompts

Reusable fresh-conversation bootstrap templates are
`docs/control/prompts/INSTRUCTOR_START.md` for the Instructor and
`docs/control/prompts/ORCHESTRATOR_START.md` for the Orchestrator. They are templates
only, not execution authority; current authority and execution state remain in the
repository control-plane artifacts and Git.

A fresh Instructor or Orchestrator starts without prior conversation context by:

1. reading this file and inspecting Git branch, HEAD, status, and recent commits;
2. reading `INSTRUCTOR.md`, `DECISIONS.md`, `HANDOFF.md`, and `TASKS.md`;
3. reading the relevant `MVP_PLAN.md` packets and the governing requirements,
   accepted ADRs, architecture, data model, capability specs, active change,
   source, and diffs needed for the role's review; and
4. checking the control plane for internal consistency before changing state or
   source.

After that common bootstrap, a fresh Instructor inspects the relevant repository
source/diffs, reviews the proposed frontier, appends any necessary durable decision,
and replaces `INSTRUCTOR.md` with `HOLD`, `APPROVED_FOR_EXECUTION`, or
`NEEDS_HUMAN_DECISION`. When explicitly executing an Instructor update, it commits
the governance changes and does not implement feature code. A fresh Orchestrator
verifies instruction applicability, task readiness, dependencies, and write-scope
safety; assigns only the authorized READY packets; records the Instruction ID in
the execution checkpoint; updates TASKS/HANDOFF after review and integration; and
stops when that authorization is exhausted.

Before executing an Instructor instruction, the Orchestrator must compare its
recorded reviewed checkpoint with current Git. If source, business state, the task
DAG, or another material premise changed and applicability cannot be proven, stop
and report `NEEDS_INSTRUCTOR_REVIEW`. A governance-only commit that creates or
persists the reviewed control record may be accepted only after its diff is proven
non-material to the authorized source/business state.

A task is executable only when `TASKS.md` marks it READY, the current non-stale
Instructor signal explicitly authorizes it, its dependencies are verified, and its
write scope is safe. READY alone never means start. The Orchestrator stops when the
authorization scope is exhausted and never automatically starts newly unlocked
work unless the current instruction explicitly permits it.

The operational state sequence remains `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`,
with the Orchestrator alone making transitions. If TASKS conflicts with
MVP_PLAN, HANDOFF, or higher approved requirement/decision authority, execution
stops for reconciliation; no agent silently selects the convenient file.

If a material architecture, scope, or task-DAG issue appears during an active Goal,
the Instructor issues HOLD or the Orchestrator reports BLOCKED; execution reaches a
safe checkpoint; durable decision, plan, task, and handoff artifacts are reconciled;
then the Instructor re-authorizes. Chat-only changes do not override repository
authority.

Replacement agents recover from repository artifacts and Git, not an earlier
conversation. An interrupted worker task remains IN_PROGRESS unless review evidence
supports another state; its checkpoint should identify completed and remaining
work, touched files, tests/failures, blockers, and the latest commit. A replacement
Orchestrator reconciles Git evidence against TASKS/HANDOFF before proceeding, and a
replacement Instructor reviews the latest execution checkpoint before issuing a
new signal.

## Authority and ambiguity

Authority descends in this order: instructor assignment; reviewed requirements baseline; accepted ADRs (including supersession); approved architecture; approved capability specs; approved active change; this file; generated harnesses; temporary notes. README is navigation, not requirement authority. Archived OpenSpec changes are historical and non-authoritative.

When sources conflict, follow the higher authority and record the lower-level inconsistency. Do not turn examples into requirements, infer optional scope, or silently choose between materially different interpretations. If the assignment remains ambiguous after review, mark the point unresolved and request a decision before implementation.

## Approved architecture and scope

- The active architecture is a **Synchronous Modular Monolith**. Business modules live under `modules/`; `apps/` are composition roots; `packages/` contain transport/technical contracts; `infra/` owns operations.
- Normal application coordination is synchronous through public module APIs. Consumers must not deep-import another module's domain or infrastructure. Within a module, dependencies point `api -> application -> domain`; infrastructure implements application ports.
- Strategies are infrastructure-independent and extensible through registration. External exchanges, news sources, sentiment models, and backtest execution sit behind replaceable ports.
- WebSocket is restricted to realtime market delivery. It is not a general event bus.
- MVP backtesting targets `Search -> BacktestExecutionPort -> Bounded Local Executor -> Backtester -> Evaluator -> Leaderboard`. Callers must not depend on local versus future distributed execution.
- Authentication uses the approved simple local Auth V1: email/password plus a PostgreSQL-backed opaque server-side session in an HttpOnly cookie. Trusted authenticated identity is derived at the server boundary and passed separately from client DTOs.
- StrategyDefinition, CompositeDefinition, SearchRun, Candidate, and LeaderboardScope are direct user-owned roots. Their approved children inherit ownership; normalized Market Data/datasets, public News/Sentiment, ranking configurations, and strategy plugin descriptors remain shared.
- Approved MVP requirements are in `docs/requirements.md`. RBAC, organization/team or tenant hierarchy, OAuth/SSO, 2FA, external identity providers, password reset, enterprise IAM, AI/LLM authoring, optional trading/risk features, mandatory Redis/BullMQ, distributed protocols, microservices, Kafka, CQRS, and Event Sourcing remain deferred and must not become active requirements without approval.
- Development and deterministic tests may use fixtures/fakes. The delivered runtime and instructor demo must use real configured Binance historical/realtime and News integrations, real PostgreSQL application/Auth state, and application-generated Backtest/Leaderboard data; mock providers must not be silently selected in final/demo configuration.

Stage 2 documentation refinement is complete. Application/runtime source, executable contracts, migrations, infrastructure, generated artifacts, and tooling may be modified only through a separately approved change with explicit scope, governing requirements, acceptance criteria, and validation. Do not infer implementation scope from historical scaffolding, archived OpenSpec changes, or stale source assumptions. Repository inconsistencies discovered outside the current approved change must be reported rather than silently repaired.

The executable deferred-scope checker still reflects the pre-A-00 Auth prohibition.
A-00 does not modify that tool; C-01A owns the narrow gate update needed before it
adds approved simple Auth contracts. Until then, do not mistake the checker's legacy
wording for current product authority or use A-00 as permission to edit source.

## Contract authority

Markdown explains behavior and links to contracts; it must not copy complete TypeScript interfaces or SQL schemas. Each executable contract must have one canonical owner. Target owners are:

- Module API contracts: `modules/{auth,strategy,search,backtesting,market-data,news,sentiment,evaluation,leaderboard}/api/contracts.ts`.
- Application/repository/provider ports: `modules/{auth,strategy,search,backtesting,leaderboard,market-data,news,sentiment}/application/ports.ts`.
- REST DTOs: `packages/contracts/rest/**`; market WebSocket DTOs: `packages/contracts/websocket/**`.

Where the current tree differs from these target owners, treat it as an unverified reconciliation item and resolve it only through an explicitly approved source-reconciliation or implementation change, never as an implicit repair within an unrelated task.

## OpenSpec role

OpenSpec is a concise capability/change mechanism, not the highest authority and not mandatory for every small task. An unapproved delta must never enter canonical specs. Archived changes remain history only. Normally keep at most one cross-cutting active change; an empty active set is valid. Specs should state purpose, boundary, approved behavior, acceptance scenarios, requirement IDs, failure expectations, and links to executable contracts—not repeat the architecture book, full interfaces, schemas, or product-wide infrastructure policy.

## Validation and Definition of Done

Before completion, identify the governing requirement IDs and acceptance criteria, keep the diff within approved scope, and verify no deferred feature or unrelated change leaked in. As relevant, require domain unit tests, boundary integration/contract tests, architecture dependency checks, typecheck, lint, build, test suites, acceptance evidence, reproducibility/provenance, observability, truthful status documentation, and an ADR/document update for architectural changes. Generated source artifacts must not be committed unless an approved workflow explicitly owns and verifies them; do not manually edit generated files.

For user-owned resources, acceptance must include unauthenticated rejection, cross-user negative reads/mutations, owner-filtered collections, and trusted identity propagation. Passwords, raw credentials, session tokens, cookies, and token digests must never be logged. Pure Strategy execution, Backtest simulation, and Evaluation calculations remain independent of Auth infrastructure.

A change is done only when all applicable checks pass and the diff is reviewable and reversible. If a required tool or environment is unavailable, report the check as **BLOCKED** or **UNVERIFIED**—never **PASS**.
