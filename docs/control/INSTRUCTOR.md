# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-009`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `9b9fb98b3f87eb1e6e445f1cb967ace665de6300`
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
  BLOCKED/UNVERIFIED because valid local credentials or a running Docker daemon
  are unavailable.

## Execution authorization

None. This is a HOLD signal; the Orchestrator must not assign or start any
feature packet from this checkpoint.

The current safe frontier is blocked by the absence of a READY packet and by
the missing live PostgreSQL evidence required to close the D-01/AU-01 review
boundary. Q-01 and F-AUTH fake/fixture evidence is not sufficient to mark those
packets DONE or to authorize their real-port integration.

## Resume conditions

The Orchestrator may resume only after all of the following are true:

1. A valid local PostgreSQL environment is available and D-01/AU-01 review
   evidence is reconciled in the execution checkpoint.
2. `TASKS.md` and `HANDOFF.md` identify a concrete packet as READY with verified
   dependencies and a safe disjoint write scope.
3. A fresh Instructor review issues a new execution instruction and ID.

## Explicitly not authorized

- Q-01 or F-AUTH real-port integration or completion.
- D-01/AU-01 PostgreSQL integration or completion.
- M-01, M-02, L-01, N-01, N-02, B-02, AU-02, F-02, I-01, I-02, or any other
  unfinished packet.
- New task assignment, dependency/DAG changes, contract or migration changes,
  scope expansion, or deferred features.

The Orchestrator remains responsible for TASKS/HANDOFF state and must not
silently convert REVIEW or BLOCKED work into READY or DONE.

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
