# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-010`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `bc88f36` (`docs: hold after INS-008 checkpoint review`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by the local INS-008 feature and checkpoint
  commits.
- `INS-008` was executed and exhausted. The Manager delegated and integrated
  the bounded Q-01 and F-AUTH fake/fixture phases, then recorded the checkpoint
  in `docs/implementation/HANDOFF.md`.
- Current task derivation: P-00, C-01, A-00, C-01A, E-01, F-01, S-01, S-02,
  S-03, and B-01 are DONE; D-01 and AU-01 are REVIEW; Q-01 and F-AUTH are
  REVIEW after their authorized fake/fixture phases; all other unfinished tasks
  remain BLOCKED. No unfinished task is currently a safe READY frontier for a
  new authorization.
- Reproduced `npm run verify:stage4a`: PASS. Build, typecheck, workspace tests,
  architecture, artifact, deferred-scope, runtime smoke, and diff checks pass.
  Runtime smoke honestly reports `/live=200`, `/ready=503`, `/health=404`.
- Formal OpenSpec CLI validation remains `UNVERIFIED` because the CLI is
  unavailable. Live PostgreSQL migrate/rollback/remigrate evidence remains
  PASS on a dedicated temporary PostgreSQL 16.10 cluster at
  `postgres://cryptox@localhost:55432/cryptox`; the existing PostgreSQL service
  on port 5432 was not modified. The evidence includes a full up/down/up cycle,
  `pgcrypto`, 18 MVP tables, and both migration records.

## Execution authorization

Approved execution frontier, and no more:

1. `D-01` — complete the live PostgreSQL migration/review phase against the
   dedicated local cluster, including reconciliation of the already-passed
   migrate/rollback/remigrate evidence.
2. `AU-01` — implement and validate the real PostgreSQL-backed Auth/session
   integration, only after the Orchestrator has reviewed and closed the D-01
   dependency and confirmed F-AUTH's reviewed fake/fixture boundary.

The Orchestrator must first reconcile each specifically authorized phase to
`READY` in `TASKS.md`, verify the current HEAD/business premises, and record the
temporary database connection in `HANDOFF.md` without committing credentials.
It must delegate D-01 and AU-01 to workers with disjoint write scopes. AU-01 may
not start until D-01's required review is complete. The same local database may
be used for both phases while it remains available.

This instruction authorizes only the two phases above. It does not authorize
the newly unlocked M-01 or any automatic follow-on work.

Authorization ends after the Orchestrator reviews and integrates D-01 and
AU-01, or when the database environment becomes unavailable. A new Instructor
review and Instruction ID are required for the next frontier.

## Explicitly not authorized

- M-01, M-02, L-01, N-01, N-02, B-02, Q-01 real-port integration, F-AUTH
  real integration, AU-02, F-02, I-01, I-02, or any other unfinished packet
  outside the two authorized phases.
- Migration changes outside D-01 ownership, contract/DAG changes, scope
  expansion, or deferred features.

The Orchestrator remains responsible for TASKS/HANDOFF state and must not
silently convert unrelated REVIEW or BLOCKED work into READY or DONE. D-01 and
AU-01 may be marked DONE only after their complete applicable acceptance and
integration evidence is reviewed.

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
