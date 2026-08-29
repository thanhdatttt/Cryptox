# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-014`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `158e38f` (`docs(control): clarify INS-013 checkpoint commits`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 25 local commits.
- INS-013 is exhausted. Its Orchestrator delegated, reviewed, and integrated
  M-02 and B-02 in disjoint scopes. D-01, AU-01, M-01, and L-01 remain DONE and
  must not be reassigned or reworked.
- Current checkpoint evidence: M-02 focused tests 22/22 PASS and B-02 focused
  tests 32/32 PASS. Workspace tests/build/typecheck, architecture, artifacts,
  deferred-scope, runtime smoke, and whitespace checks PASS.
- The checkpoint truthfully records unresolved `UNVERIFIED`/conditional gates:
  live Binance realtime smoke, real PostgreSQL/Auth integration for B-02,
  cancellation during the final completion window, and proof of atomic
  Experiment plus Leaderboard persistence across module adapters.
- No source, business state, or task-DAG change was found after the INS-013
  execution checkpoint; the intervening commits are control-plane checkpoint
  documentation only.

## Approved execution frontier

The Orchestrator is authorized to execute exactly these two bounded review-closure
packets in parallel:

1. `M-02` — Realtime Market Delivery and Gap Recovery review closure.
2. `B-02` — Candidate, Execution, and Experiment Orchestration review closure.

These are continuations of the existing `REVIEW` records, not permission to
reassign completed work or broaden either packet. Before assigning a worker, the
Orchestrator must reconcile each authorized review record to `READY` only if the
review evidence supports that transition and the write scope remains unchanged.
If no bounded implementation fix is necessary, Manager-side validation and
checkpoint work is sufficient.

### M-02 boundary

- Governing requirements: `MD-02`, `RD-01`, `FE-01`, `OB-01`, `AR-02`, `DM-01`.
- Start dependencies: `M-01` and `F-01`, both `DONE`.
- Integration dependencies: `I-01` remains downstream and is not a start
  prerequisite for this bounded packet.
- Allowed write scope: Market Data application/infrastructure and market
  WebSocket tests under `modules/market-data/**`; do not alter frozen contracts
  unless a separately approved contract change exists.
- Objective: review the implemented normalized kline streaming, connection
  state, bounded reconnect, REST gap fill before continuation, missing-candle
  reconciliation, deduplication, shutdown, and connection observability; fix a
  defect only within the existing Market Data scope.
- Required evidence: re-run the focused resilience suite and make a truthful
  attempt at the real Binance stream smoke. Provider access failure remains
  `BLOCKED` or `UNVERIFIED`, never `PASS`; do not mark M-02 `DONE` on fixture
  evidence alone when a required live gate remains unresolved.
- Forbidden: general event bus, non-market WebSocket features, frontend state,
  migrations, unrelated modules, or automatic I-01 work.

### B-02 boundary

- Governing requirements: `OW-01`, `BT-01`, `ST-04`, `RP-01`, `OB-01`,
  `AR-01`, `AR-02`.
- Start dependencies: `D-01`, `S-01`, `B-01`, `E-01`, and `L-01`, all `DONE`.
- Integration dependencies: `M-01`, `S-02`, and `S-03` are required before
  final I-01/I-02 integration, not as permission to broaden this packet.
- Allowed write scope: Backtesting application/infrastructure/API
  implementations and packet-scoped tests under `modules/backtesting/**`;
  use public module APIs and explicit in-process adapters.
- Objective: review the implemented trusted manual/Search Candidate owner
  propagation, bounded execution, B-01 runner, Evaluation, inherited
  Experiment/Trades, same-owner Leaderboard admission, idempotency, rollback,
  provenance, and terminal outcome handling; fix only packet-scoped defects.
- Required evidence: success/failure/cancel/saturation paths, cross-user
  not-found, no partial Experiment, provenance, rollback, and an attempt at the
  applicable PostgreSQL/Auth integration tests. Specifically resolve or record
  the cancellation race and establish the limits of atomic Experiment plus
  Leaderboard persistence. Missing database configuration/service is
  `BLOCKED` or `UNVERIFIED`, never `PASS`; do not claim cross-module atomicity
  before the shared transaction-aware adapter is actually proven.
- Forbidden: Search lifecycle changes, concrete Binance internals, distributed
  recovery, backend controllers, migrations, risk/shorting, or unrelated modules.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the non-stale `INS-014` signal, TASKS readiness after any justified
review-to-ready reconciliation, dependencies, and disjoint write scopes.
Delegate each bounded implementation fix to a separate worker. The Orchestrator
alone changes `TASKS.md`/`HANDOFF.md`, reviews and integrates worker output, runs
the applicable gates, records exact commits and evidence, and stops when this
authorization is exhausted.

Do not automatically start Q-01 real-port integration, AU-02, I-01, I-02,
F-AUTH real integration, N-01, N-02, F-02, or any other newly unlocked task.
A new Instructor review and Instruction ID are required for the next frontier.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, or L-01.
- Q-01 real-port integration, AU-02, N-01, N-02, F-AUTH real integration,
  F-02, I-01, I-02, or any other unfinished packet outside M-02/B-02.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after the M-02 and B-02 review-closure attempts are
reviewed/integrated, or when a required evidence/environment gate blocks safe
completion. A fresh Instructor review and new Instruction ID are required
afterward.

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
