# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-008`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `bbdf5b6de3283c0e8400a17f27eea3eec1c49247`
- Working tree at review: clean. The branch is
  `MVP_IMPLEMENTATION`, ahead of `origin/MVP_IMPLEMENTATION` only by the
  current local checkpoint commits.
- `INS-007` was executed and exhausted at this checkpoint. Its test-only
  reconciliation changed only `modules/strategy/application/service.spec.ts`,
  and the Manager closed `S-02`, `S-03`, and `B-01` after validation.
- Current task derivation: P-00, C-01, A-00, C-01A, E-01, F-01, S-01, S-02,
  S-03, and B-01 are DONE; D-01 and AU-01 are REVIEW; Q-01 and F-AUTH are
  READY; all other unfinished tasks remain BLOCKED by recorded start
  dependencies.
- Current review reproduced `npm run verify:stage4a`: PASS. Strategy is 51/51,
  Backtesting is 18/18, and build, typecheck, lint, architecture, artifact,
  deferred-scope, runtime smoke, and whitespace checks pass.
- Formal OpenSpec CLI validation remains `UNVERIFIED` because the CLI is
  unavailable. Live PostgreSQL migrate/rollback/remigrate evidence remains
  BLOCKED/UNVERIFIED for D-01/AU-01; this does not block the authorized fake/
  fixture phases below.

This instruction is valid only after the Orchestrator verifies immediately
before assignment that the reviewed HEAD and task/business premises remain
unchanged, the working tree is clean, both packets are still `READY`, and their
write scopes are disjoint. Any material source, business-state, requirement,
task-DAG, task-state, write-scope, or authority change makes this instruction
stale and requires a fresh Instructor review.

## Execution authorization

Approved execution frontier, and no more:

1. `Q-01` — Seeded Random Search and SearchRun Lifecycle, limited initially to
   its pure/fake-port phase.
2. `F-AUTH` — Frontend Authentication and Protected Navigation, limited initially
   to its fake/fixture client and UI phase.

The Orchestrator may assign these two packets in parallel, with one delegated
worker per packet, after verifying READY state, satisfied start dependencies,
disjoint write scopes, and the maximum useful concurrency. `Q-01` owns only
`modules/search/**` excluding frozen contracts and migrations. `F-AUTH` owns
only frontend Auth clients, screens, state, navigation, and tests. Neither may
perform real PostgreSQL/Auth integration in this frontier.

Neither packet may be marked `DONE` from fake/fixture evidence alone. A later
Instructor authorization is required for real-port integration and for any
newly unlocked task.

Authorization ends after review and integration of this frontier. A new Instructor
review and Instruction ID are required for the next frontier.

## Packet constraints

### Q-01 — Seeded Random Search and SearchRun Lifecycle

- Implement the approved seeded Random generator and finite, owner-aware
  SearchRun lifecycle against fake execution/ranking/persistence ports only.
- Cover seed determinism, valid unique candidates, finite stop conditions,
  positive in-flight bounds, capacity, cancellation, failure counts, terminal
  guards, and trusted owner propagation.
- Write only `modules/search/**` except frozen contracts and migrations. Do not
  implement simulation, Candidate persistence, scoring, B-02 integration, or
  real database adapters.
- Keep the Search generator seam and public Backtesting/Leaderboard boundaries
  unchanged. Record the partial phase as `REVIEW` or `IN_PROGRESS`; fake-only
  evidence cannot close Q-01.

### F-AUTH — Frontend Authentication and Protected Navigation

- Implement the Auth client/UI flow against typed fake/fixture clients first:
  registration, login, current-session restoration, logout, protected
  navigation, 401 recovery, and private-cache clearing.
- Write only frontend Auth clients, screens, state, navigation guards, and tests.
  Do not edit backend/modules, contracts, migrations, or business calculations.
- Never store session tokens in local/session storage or trust client-selected
  user identity. Preserve the approved HttpOnly-cookie boundary for real
  integration.
- Record the fake/fixture phase as `REVIEW` or `IN_PROGRESS`; real AU-01
  integration and completion require a later authorization.

## Explicitly not authorized

- `S-02`, `S-03`, `B-01`, or any other feature implementation outside `Q-01` and
  `F-AUTH` as bounded above.
- `D-01`/`AU-01` PostgreSQL integration or completion, and every blocked task
  (`M-01`, `M-02`, `L-01`, `N-01`, `N-02`, `B-02`, `AU-02`, `F-02`, `I-01`,
  `I-02`).
- Real-port integration, cross-module security integration, shared contract or
  migration changes, new task assignment, dependency/DAG changes, or any scope
  expansion. The Manager may only transition Q-01/F-AUTH to `REVIEW` or
  `IN_PROGRESS` for the bounded phase; closure requires later evidence and
  authorization.
- Any deferred scope, including enterprise identity, tenancy, queues/distributed
  execution, generalized risk, AI/LLM authoring or crawling, strict replay, CQRS,
  Event Sourcing, or a general event bus.

## Required execution and checkpoint rules

- The Orchestrator alone assigns owners, changes `TASKS.md` state, reviews and
  integrates worker output, records validation, and replaces `HANDOFF.md`.
- Every bounded implementation packet must be delegated to a worker/subagent;
  the Orchestrator must not implement `Q-01` or `F-AUTH` directly. Workers do
  not edit `INSTRUCTOR.md`, `DECISIONS.md`, `TASKS.md`, or `HANDOFF.md`.
- Before assignment, prove the current instruction is not stale, confirm a
  clean working tree, verify READY/dependencies, and prove disjoint write
  scopes. The fake/fixture limits in this instruction remain binding.
- Each packet must satisfy its focused acceptance tests plus applicable build,
  typecheck, workspace tests, architecture, artifact, deferred-scope, database,
  and diff checks. Unavailable evidence is `BLOCKED` or `UNVERIFIED`, never PASS.
- The next checkpoint must record packet owners, state transitions, commits,
  validation evidence, failures/blockers, exact remaining frontier, and that no
  newly READY task was started without a later Instructor authorization.

Pending human decisions: none.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [ADR-005](../adr/ADR_005_module_first_structure.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_practical_reproducibility.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is the current execution signal, not a task board or implementation
handoff. No feature implementation is performed by this Instructor update.
