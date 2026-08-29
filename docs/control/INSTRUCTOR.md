# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-015`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `d9346fe` (`docs(control): record INS-014 closure checkpoint`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 30 local commits.
- INS-014 is exhausted. Its Orchestrator delegated, reviewed, and integrated
  bounded closure fixes for M-02 and B-02 in disjoint scopes. D-01, AU-01, M-01,
  and L-01 remain DONE and
  must not be reassigned or reworked.
- Current checkpoint evidence: M-02 focused realtime 9/9 and full Market Data
  23 PASS / 1 skipped; B-02 full Backtesting 33/33, Auth PostgreSQL 3/3, and
  same-owner/cross-user adapter probes PASS. Workspace build/typecheck/tests,
  architecture, artifacts, deferred-scope, runtime smoke, and whitespace checks
  PASS.
- Remaining truthful `UNVERIFIED` gates are live Binance realtime smoke and
  proof of atomic Experiment plus Leaderboard persistence across module
  adapters. The cancellation-race and replay-provenance findings from INS-014
  are fixed and covered by passing tests.
- No source, business-state, or task-DAG drift was found after the INS-014
  checkpoint. The current task board and handoff are the authority for the
  remaining REVIEW/BLOCKED states.

## Approved execution frontier

The Orchestrator is authorized to execute exactly this bounded,
dependency-ordered frontier:

1. `B-02` — packet-boundary closure and state reconciliation only.
2. `F-AUTH` — real AU-01 integration of the existing frontend Auth phase.
3. `Q-01` — real-port integration of the existing Search phase, but only after
   B-02 is closed by the Orchestrator under this instruction.

These continue existing REVIEW records; they do not reassign completed work or
broaden scope. B-02 closure is Manager-side review/state work. F-AUTH and Q-01
implementation/integration work must each be delegated to separate workers with
disjoint write scopes. F-AUTH may run in parallel with B-02 closure. Q-01 is
explicitly sequenced after B-02 reaches `DONE`.

### B-02 boundary

- Governing requirements: `OW-01`, `BT-01`, `ST-04`, `RP-01`, `OB-01`,
  `AR-01`, `AR-02`.
- Start dependencies: `D-01`, `S-01`, `B-01`, `E-01`, and `L-01`, all `DONE`.
- Integration dependencies: `M-01`, `S-02`, and `S-03`, all satisfied.
- Allowed write scope: Backtesting application/infrastructure/API
  implementations and packet-scoped tests under `modules/backtesting/**`;
  use public module APIs and explicit in-process adapters.
- Objective: independently verify the INS-014 packet evidence and close B-02 at
  its MVP_PLAN packet boundary if its DoD is met. No new implementation scope is
  permitted unless a bounded regression is found.
- Required evidence: success/failure/cancel/saturation paths, cross-user
  not-found, no partial Experiment, provenance, rollback, PostgreSQL/Auth
  integration, and exactly one terminal outcome. Cross-module
  Experiment/Leaderboard atomicity is an I-01 gate and must remain `UNVERIFIED`
  here.
- Forbidden: Search lifecycle changes, concrete Binance internals, distributed
  recovery, backend controllers, migrations, risk/shorting, or unrelated modules.

### F-AUTH boundary

- Governing requirements: `AU-01`, `OW-01`, `FE-01`, `DM-01`.
- Start/integration dependencies: `C-01A`, `F-01`, and `AU-01`, all DONE.
- Allowed scope: only `apps/frontend/**` Auth clients, screens, state,
  navigation guards, and tests; use the existing AU-01 public transport and
  HttpOnly cookie boundary.
- Objective: integrate the existing fixture-first frontend Auth flow with real
  AU-01 register/login/session restoration/logout behavior and close F-AUTH if
  its protected-navigation and cache-isolation DoD passes.
- Required evidence: real register/login/session restore/logout, protected
  navigation, 401 recovery, private-cache clearing, and truthful cookie behavior.
- Forbidden: backend/module implementation, client-selected identity, browser
  token storage, migrations, or business logic.

### Q-01 boundary

- Governing requirements: `SE-01`, `SE-02`, `LB-01`, `OB-01`, `DM-01`, `AR-02`,
  `OW-01`.
- Start dependencies: `C-01A` and `S-01`, both DONE.
- Integration dependencies: `D-01`, `L-01`, and B-02 DONE under this
  instruction before the real-port phase starts.
- Allowed scope: only `modules/search/**` except frozen contracts and
  migrations; use public Backtesting and Leaderboard module APIs.
- Objective: integrate the existing seeded SearchRun/Candidate lifecycle with
  real persistence, Backtesting execution, and Leaderboard admission; fix only
  packet-scoped issues found by integration evidence.
- Required evidence: seed determinism, owner-scoped persistence/lifecycle,
  cross-user not-found, bounded stop/cancel/failure behavior, real port/database
  integration, and global gates. Fake-only evidence cannot close Q-01.
- Forbidden: simulation, Candidate persistence implementation outside Search's
  public boundary, score calculation, backend controllers, migrations, or
  automatic AU-02/I-01 work.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the non-stale `INS-015` signal, B-02 evidence, task readiness after any
justified review-to-ready reconciliation, dependencies, and disjoint write
scopes. Delegate F-AUTH and Q-01 implementation work to separate workers. Q-01
must not start before B-02 is DONE. The Orchestrator alone changes
`TASKS.md`/`HANDOFF.md`, reviews and integrates worker output, runs applicable
gates, records exact commits and evidence, and stops when this authorization is
exhausted.

Do not start M-02 rework, AU-02, I-01, I-02, N-01, N-02, F-02, or any other
newly unlocked task. M-02 remains REVIEW with its live-provider limitation;
carry that evidence to a later explicitly authorized integration gate. A new
Instructor review and Instruction ID are required for the next frontier.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, or L-01.
- M-02 source/rework, AU-02, N-01, N-02, F-02, I-01, I-02, or any other
  unfinished packet outside the B-02/F-AUTH/Q-01 sequence above.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after B-02 closure and the authorized F-AUTH/Q-01 work are
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
