# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-012`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `1f56c36` (`chore(control): reconcile AU-01 completion state`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 18 local commits.
- The prior `INS-011` HOLD was resolved by the Orchestrator's governance-only
  reconciliation. `TASKS.md` now agrees with `HANDOFF.md` and the Git evidence:
  D-01 and AU-01 are `DONE`. Neither task is part of this authorization and
  neither may be reassigned or reworked.
- Current repository gates remain PASS from the reviewed checkpoint: build,
  typecheck, workspace tests, architecture, artifact, deferred-scope, runtime
  smoke, and whitespace checks. Runtime smoke honestly reports `/live=200`,
  `/ready=503`, `/health=404`. Formal OpenSpec CLI validation remains
  `UNVERIFIED` because the CLI is unavailable.

## Approved execution frontier

The Orchestrator is authorized to execute exactly these two independent packets
in parallel:

1. `M-01` — Binance Historical Market Data.
2. `L-01` — Configurable Reproducible Leaderboard.

### M-01 boundary

- Governing requirements: `MD-01`, `RD-01`, `RP-01`, `AR-02`.
- Start dependencies: `C-01` and `D-01`, both `DONE`.
- Allowed write scope: `modules/market-data/**` except frozen contracts, plus
  its repository/provider tests as required by the packet.
- Objective: validate, paginate, normalize, persist, and identify historical
  candles with bounded reads, explicit half-open ranges, completeness checks,
  provenance, and provider substitution.
- Required evidence: focused module/contract/DB tests and truthful live Binance
  historical smoke evidence. If live Binance access is unavailable, report it
  as `BLOCKED` or `UNVERIFIED`, never `PASS`.
- Forbidden: frontend/apps, migrations, unrelated modules, and raw Binance
  shapes outside the adapter boundary.

### L-01 boundary

- Governing requirements: `OW-01`, `LB-01`, `RP-01`, `OB-01`.
- Start dependencies: `C-01A` and `D-01`, both `DONE`. `E-01` and `B-02` are
  downstream integration dependencies/gates, not permission to start this
  bounded leaderboard packet; `E-01` is already `DONE` and `B-02` remains
  `BLOCKED`.
- Allowed write scope: `modules/leaderboard/**` except frozen contracts and
  migrations, plus packet-scoped tests.
- Objective: implement `LINEAR_REQUIRED_V1`, versioned configuration and
  scopes, configurable Top-K, deterministic admission/ties, eligibility,
  ownership enforcement, and idempotent reads.
- Required evidence: owner-filtered collections, unauthenticated rejection,
  same-owner admission, cross-user rejection/not-found, alternate K, exact
  score/tie ordering, duplicate handling, configuration versioning, and stable
  deterministic order.
- Forbidden: metric calculation, Experiment mutation, fixed-K assumptions,
  migrations, and unrelated module/app changes.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the current Instructor signal, task readiness, dependencies, and disjoint
write scopes. Delegate each bounded implementation packet to its own worker. The
two workers may run in parallel because their scopes are disjoint. The
Orchestrator alone manages `TASKS.md`/`HANDOFF.md`, reviews and integrates worker
output, runs the applicable gates, and stops when this authorization is
exhausted.

This instruction does not authorize automatic follow-on work when M-01 or L-01
unlocks another task. A new Instructor review is required before M-02, B-02,
Q-01 real-port integration, F-AUTH real integration, or any other unfinished
packet starts.

## Explicitly not authorized

- Reassignment or rework of D-01 or AU-01.
- M-02, B-02, N-01, N-02, Q-01 real-port integration, F-AUTH real integration,
  AU-02, F-02, I-01, I-02, or any other unfinished packet outside M-01/L-01.
- Frontend/app changes, migrations, contract/DAG changes, scope expansion,
  deferred enterprise identity, queues/distributed execution, risk features,
  AI/LLM authoring, or any other deferred feature.

Authorization ends after the Orchestrator reviews and integrates M-01 and L-01,
or when a required environment/evidence gate is blocked. A fresh Instructor
review and new Instruction ID are required for the next frontier.

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
