# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-003`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `2858388759b38218d8a89513ecbcc654c3c56d16`
- Working tree at review: clean.
- Prior instruction: `INS-002` / `APPROVED_FOR_EXECUTION`; its authorized frontier
  is exhausted.
- Completed source commits: `9ca2d7c` (C-01A), `a20a7c5` (E-01), and `901065a`
  (F-01).
- Execution checkpoint commit: `2858388`, limited to the Manager-owned
  `docs/implementation/HANDOFF.md` and `docs/implementation/TASKS.md` update.

The completed frontier remained within `INS-002` scope. C-01A added only the
approved Auth/ownership contracts and narrow architecture/scope gates; E-01 added
the four required Evaluation metrics without scoring or persistence; F-01 added
the frontend market-chart foundation without Auth UI or backend/provider
implementation. Canonical requirements, accepted ADRs, architecture, data model,
capability specifications, and the active change design/specification were not
materially changed.

## Consistency result

Execution authorization is on HOLD because the repository control plane is not
internally consistent:

1. `docs/implementation/TASKS.md` records C-01A, E-01, and F-01 as DONE and D-01,
   S-01, AU-01, and F-AUTH as READY in its current-frontier table and task records,
   but its final `State derivation at this checkpoint` still says C-01A, E-01, and
   F-01 are READY and D-01/S-01 are BLOCKED. Because TASKS is the sole operational
   state authority, no agent may select the convenient portion of this conflict.
2. `AGENTS.md` still says the deferred-scope checker has its pre-A-00 Auth
   prohibition and that C-01A must update it. C-01A is now DONE and commit
   `9ca2d7c` already replaced that prohibition with the approved enterprise-Auth
   guard. The repository startup rules therefore describe obsolete gate state.
3. The durable packets in `docs/implementation/MVP_PLAN.md` retain pre-execution
   state labels for C-01A and newly unlocked tasks. The plan states that TASKS owns
   mutable state, but these unlabeled historical state fields now conflict with the
   current board and must be clarified or reconciled so a fresh agent cannot mistake
   them for operational state.
4. `HANDOFF.md` reports 79 workspace tests, while a clean reproduction at the
   reviewed HEAD executes 84 passing workspace tests. The checkpoint must correct
   the count or document the exact narrower selection it intended to report.

These are governance/control inconsistencies, not a feature-code failure and not a
new requirement ambiguity.

## Execution authorization

Approved execution frontier: none.

Explicitly not authorized:

- D-01, S-01, AU-01, F-AUTH, or any other implementation task.
- Any newly unlocked downstream task or continuation based only on a READY row.
- Feature source, executable contract, migration, runtime, frontend feature, or
  dependency changes under this instruction.

Required reconciliation before the next Instructor review:

- The Orchestrator/Manager must correct the stale final state derivation in
  `TASKS.md` so it agrees with the current-frontier table, task records, HANDOFF,
  and strict dependency recomputation.
- Reconcile the obsolete post-C-01A deferred-scope-checker statement in `AGENTS.md`.
- Clarify or reconcile non-operational state labels in `MVP_PLAN.md` without moving
  operational state out of TASKS or changing the approved task DAG/packets.
- Keep this reconciliation governance-only, update HANDOFF if needed for a clean
  restart, correct the workspace-test evidence count, validate
  links/diffs/whitespace and control-plane consistency, and commit one coherent
  checkpoint.
- Return for a new Instructor review and Instruction ID. Do not start work as part
  of the reconciliation.

Candidate frontier for that later review, not authorization: Wave 2 D-01, S-01,
and the fake-repository phase of AU-01. Before approval, the Orchestrator must
provide explicit disjoint path assignments: D-01 owns migrations and assigned
PostgreSQL adapters/tests; S-01 excludes those PostgreSQL paths; AU-01 excludes
migrations and PostgreSQL adapter work until the D-01 checkpoint. F-AUTH remains a
separately READY candidate but is not part of this proposed three-worker Wave 2
frontier.

## Review evidence

- Reproduced `npm run verify:stage4a`: PASS — build, typecheck, 84 workspace tests,
  architecture (42 modules / 88 dependencies and 9 rule fixtures), source-artifact,
  deferred-scope, and backend smoke gates passed.
- Reproduced root lint: PASS.
- Reproduced the three Auth API contract files: 4/4 tests PASS. The checkpoint's
  broader explicit C-01A suite records 14 files / 35 tests PASS with independent
  re-review PASS.
- The checkpoint records Evaluation 15/15, frontend 12/12 plus browser interaction,
  strict OpenSpec validation, frozen-contract audit, and independent re-reviews as
  PASS.
- `git diff --check` and the reviewed working tree are clean.

Pending human decisions: none. Repository governance reconciliation is required.

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

Notes: this HOLD is the current execution signal. It authorizes no implementation
and does not alter the completed-task evidence in the latest HANDOFF.
