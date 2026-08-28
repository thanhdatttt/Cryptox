# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-011`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `8f04e56` (`chore(control): close AU-01 under INS-010`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 16 local commits.
- The prior `INS-010` authorization has been consumed by another Orchestrator.
  D-01 and AU-01 are not part of this review's execution frontier and must not
  be assigned again.
- Reproduced `npm run verify:stage4a`: PASS. Build, typecheck, workspace tests,
  architecture, artifact, deferred-scope, and runtime-smoke gates pass. Runtime
  smoke honestly reports `/live=200`, `/ready=503`, `/health=404`.
- Direct PostgreSQL reachability on the dedicated local validation cluster was
  confirmed: PostgreSQL 16.10, database `cryptox`, and two migration records.

## Review result

The control plane is internally inconsistent and cannot safely authorize a new
feature frontier yet:

- `docs/implementation/HANDOFF.md` and the current closure commit `8f04e56`
  report AU-01 as `DONE` with independent Auth review passed.
- The current operational authority, `docs/implementation/TASKS.md`, still
  reports AU-01 as `REVIEW` with independent review pending.

Level 2 requires reconciliation rather than selecting the more convenient
artifact. Until the Orchestrator reconciles TASKS with HANDOFF and the Git
evidence, no feature worker may be assigned.

## Candidate frontier after reconciliation

The next candidate frontier is, and only is:

1. `M-01` — Binance historical market data.
2. `L-01` — configurable reproducible leaderboard.

Both are marked `READY` in TASKS, their dependencies are satisfied after D-01,
and their implementation write scopes are disjoint (`modules/market-data/**`
and `modules/leaderboard/**`). They may be authorized in parallel only after a
fresh Instructor review confirms that the AU-01 reconciliation is complete.

`M-02` remains dependent on M-01. Q-01/F-AUTH real-port integration and all
other unfinished packets remain outside this candidate frontier.

## Execution authorization

No feature execution is authorized under `INS-011`.

The Orchestrator may perform only the governance reconciliation required to
resolve the AU-01 TASKS/HANDOFF discrepancy. It must not reassign D-01 or
AU-01, edit feature source, or start M-01/L-01 while this instruction is
`HOLD`.

After reconciliation, a new Instructor Instruction ID is required before
M-01/L-01 can be delegated.

## Required reconciliation

The Orchestrator must verify the AU-01 implementation and independent-review
evidence against Git, then update only its owned control artifacts so that
`TASKS.md` accurately reflects the justified AU-01 state and `HANDOFF.md`
contains the latest checkpoint, commit, and validation evidence. If the evidence
does not justify `DONE`, it must preserve the safe state and report the gap.

## Explicitly not authorized

- Reassignment or rework of D-01 or AU-01.
- M-01, L-01, M-02, N-01, N-02, B-02, Q-01 real-port integration, F-AUTH
  real integration, AU-02, F-02, I-01, I-02, or any other unfinished packet.
- Migration changes, contract/DAG changes, scope expansion, or deferred
  features.

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
