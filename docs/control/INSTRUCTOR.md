# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-002`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `e9ab1b3bc832f91c975d39a8d4324d455ee5a91e`
- Reviewed source/business baseline: `791a50031955a39756d41884bd1876d5840aab5e`
- Working tree at review: clean.
- Intervening commits `c4825a5b041b7e5a417baf1e106e532b45b66f15` and
  `e9ab1b3bc832f91c975d39a8d4324d455ee5a91e` were proven governance-only: they
  added the Level 2 control plane and bootstrap prompts and did not change runtime
  source, executable contracts, requirements, the task DAG, or task state.
- Recovered checkpoint: P-00, C-01, and A-00 are DONE; no implementation task has
  started; C-01A, E-01, and F-01 are the only READY tasks.

The governance-only commit that persists this instruction may follow the reviewed
HEAD only when its complete intervening diff is limited to this Instructor control
update. Any other material source, business-state, requirement, task-DAG, task-state,
or write-scope change makes this instruction stale and requires
`NEEDS_INSTRUCTOR_REVIEW` before assignment or execution.

## Execution authorization

Approved execution frontier, and no more:

1. `C-01A` — Authentication & Ownership Contract Extension.
2. `E-01` — Independent Evaluation.
3. `F-01` — Frontend Chart and Client Foundation.

The Orchestrator may assign these packets in parallel only while preserving their
disjoint write scopes and the repository concurrency limit. One contract writer
alone owns C-01A. READY state, dependency satisfaction, and this instruction must
all still be verified immediately before assignment.

Authorization ends after review and integration of this frontier. Completion of
C-01A or another packet does not authorize any newly READY downstream task; a new
Instructor review and Instruction ID are required.

Explicitly not authorized:

- `D-01`, `S-01`, `AU-01`, `L-01`, `Q-01`, `B-02`, `F-AUTH`, or any other task,
  including work that becomes READY after C-01A or F-01.
- Runtime Auth implementation, repositories/providers, migrations, controllers,
  ownership-sensitive feature implementation, frontend Auth/protected navigation,
  or any deferred capability.
- Any expansion of E-01 into scoring, optional metrics, or persistence, or of F-01
  into backend/module work, business calculations, Auth UI, or real-provider
  integration.

## Constraints and checkpoint requirements

- C-01A is additive contract work only. Preserve unrelated C-01 contracts, pure
  Strategy/simulator/Evaluation/ranking contracts, and market WebSocket payloads.
  It may update the executable deferred-scope gate only as narrowly required to
  admit the now-approved Auth contracts before adding those contracts.
- E-01 is limited to `modules/evaluation/**` excluding frozen contracts and must
  implement only the four required deterministic finite metrics and edge cases in
  its approved packet.
- F-01 is limited to `apps/frontend/**` and frozen transport imports. It may use a
  fixture market source for tests/development; real Market Data integration remains
  M-02/I-01 and Auth UI remains F-AUTH.
- The Orchestrator alone updates `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, assigns owners, reviews diffs, integrates work,
  and records validation evidence.
- Before assignment, compare current Git with the reviewed checkpoint and prove
  that any intervening Instructor commit is governance-only. Stop on overlapping
  writes, uncommitted material changes, changed task premises, or authority drift.
- Each packet must satisfy its focused acceptance tests plus applicable build,
  typecheck, test, architecture, artifact, scope, OpenSpec, and diff checks.
  Unavailable evidence is `BLOCKED` or `UNVERIFIED`, never `PASS`.

Review evidence at `e9ab1b3`: root Stage 4A verification passed (build, typecheck,
49 tests, architecture, source-artifact, deferred-scope, and backend smoke gates).
The frontend test runner correctly reported no tests at the current skeleton; F-01
must add the packet-required frontend evidence. The current deferred-scope checker
still contains its documented pre-A-00 Auth prohibition; C-01A owns only the narrow
reconciliation needed for approved Auth contracts.

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
- [ADR-001](../adr/ADR_001_websocket.md)
- [ADR-005](../adr/ADR_005_module_first_structure.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_practical_reproducibility.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is the current execution signal, not a task board or implementation
handoff. No feature implementation is performed by this Instructor update.
