# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-021`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `deb0472` (`docs(control): checkpoint INS-020 AU-02 retry blocker`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 57 local commits.
- INS-020 is exhausted at a truthful blocked checkpoint. Q-01 and F-02 remain
  DONE at their approved packet boundaries, and D-01, AU-01, M-01, L-01,
  B-02, F-AUTH, N-01, and N-02 remain DONE; none may be reassigned or
  reworked.
- AU-02 start dependencies are satisfied: AU-01, D-01, S-01, L-01, B-02,
  Q-01 real integration, and F-AUTH are DONE. The INS-019 AU-02 worker was
  safely interrupted after its focused test process stalled during setup. The
  INS-020 retry restored lockfile-pinned dependencies and passed the in-memory
  baseline (14 passed / 4 skipped), but still produced no AU-02 matrix
  source/test diff, commit, or security evidence. AU-02 remains
  BLOCKED/UNVERIFIED. This is an execution failure, not a reviewed product
  decision that closes the packet.
- M-02 remains REVIEW/UNVERIFIED. Its realtime resilience suite is 9/9 and
  full Market Data is 23 passed / 1 skipped, but two bounded live Binance
  attempts ended with socket failure/reconnect exhaustion, zero normalized
  candles, and no live recovery evidence. No source or configuration rework is
  authorized until the provider/environment premise changes.
- `verify:stage4a` passed for the completed source tree. Formal OpenSpec CLI
  validation remains `UNVERIFIED` because the CLI is unavailable. Cross-module
  Experiment/Leaderboard transaction atomicity, real frontend API/browser
  integration, live CoinDesk, and real News/Sentiment PostgreSQL evidence remain
  later I-01/final-demo concerns.
- No source, business-state, or task-DAG drift was found after INS-020. The
  current TASKS/HANDOFF checkpoint is authoritative and clean.

## Approved execution frontier

The Orchestrator is authorized to execute exactly one bounded phase:

1. `AU-02` — make one final implementation-first retry of the cross-module
   per-user ownership security integration, writing the packet-scoped matrix
   early and applying only narrowly approved owner-scoped fixes proven by
   failing assertions.

This is a final bounded retry of the existing AU-02 BLOCKED record after two
non-productive worker attempts. It does not reassign completed work or broaden
scope. The retry must use a separate worker, use the already-restored
lockfile-pinned dependencies, and produce an early test/source checkpoint. If
the worker again produces no matrix diff or accepted evidence in the bounded
window, stop and report `NEEDS_HUMAN_DECISION`; do not spawn another retry.
No M-02 retry or downstream task is authorized.

### AU-02 boundary

- Governing requirements: `OW-01`, `AU-01`, `ST-04`, `SE-01`, `SE-02`, `BT-01`,
  `LB-01`, and `OB-01`.
- Start dependencies: AU-01, D-01, S-01, L-01, B-02, Q-01 real integration,
  and F-AUTH are DONE.
- Allowed scope: cross-module security/integration tests plus narrowly approved
  owner-scoped fixes across Auth, Strategy, Search, Backtesting, Leaderboard,
  and their existing runtime boundary when a security assertion proves a
  defect. Use trusted authenticated identity, not client-supplied identity.
- Objective: produce the User A/B isolation matrix for read/update/delete/
  cancel/list/rank, unauthenticated rejection, cross-user not-found semantics,
  Search Candidate owner propagation, same-owner Leaderboard admission, and
  shared-data behavior.
- Required evidence: User A/B isolation, 401 unauthenticated responses, 404
  cross-user private lookups, client identity cannot bypass request context, no
  secret logging, reproducible setup diagnostics, an early packet-scoped
  matrix diff, and applicable global gates.
- Implementation-first constraint: begin with a short setup check, then create
  and run the available deterministic/in-memory matrix through public APIs. If
  `DATABASE_URL` is unavailable, record PostgreSQL/Auth and Search real
  integration as `UNVERIFIED`; do not spend this bounded retry waiting for that
  environment.
- Forbidden: pure Strategy/simulator/Evaluation algorithms, Market Data/News
  ownership, unrelated refactors, deferred enterprise identity, migrations,
  contract changes, and automatic I-01/I-02 work. Any source fix must remain
  narrowly tied to a failing security assertion.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the non-stale `INS-021` signal, task readiness after the justified
BLOCKED-to-READY reconciliation, dependencies, and disjoint write scope.
Delegate AU-02 implementation to one separate worker using
`gpt-5.6-luna` with `xhigh` reasoning. The worker may not edit
`INSTRUCTOR.md`, `DECISIONS.md`, `TASKS.md`, or `HANDOFF.md`. The Orchestrator
alone changes TASKS/HANDOFF, reviews and integrates output, runs gates, records
exact commits/evidence, and stops when this authorization is exhausted.

If the worker again produces no early matrix diff/evidence after setup, stop
safely and preserve AU-02 as BLOCKED/UNVERIFIED, then report
`NEEDS_HUMAN_DECISION`; do not spawn retries in the same authorization. Do not
start M-02, I-01, I-02, F-AUTH,
F-02, Q-01, N-01, N-02, or B-02 rework, nor D-01/AU-01 or any other follow-on
task. A new Instructor review and Instruction ID are required afterward.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, L-01, B-02, Q-01, F-AUTH,
  F-02, N-01, or N-02.
- M-02 source changes or live re-probes, I-01, I-02, or any unfinished packet
  outside the explicitly authorized AU-02 final retry.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after the single AU-02 final retry is reviewed/integrated
or blocked with evidence/`NEEDS_HUMAN_DECISION`. A fresh Instructor review and
new Instruction ID is required afterward.

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
