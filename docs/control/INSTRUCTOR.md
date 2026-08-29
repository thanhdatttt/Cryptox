# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-016`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `f351bca` (`docs(control): close INS-015 checkpoint`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 34 local commits.
- INS-015 is exhausted. Its Orchestrator closed B-02 at the DEC-006 packet
  boundary, integrated the F-AUTH real-session boundary patch, and safely
  stopped Q-01 when no reviewable real-port handoff arrived. D-01, AU-01, M-01,
  L-01, and B-02 remain DONE and
  must not be reassigned or reworked.
- Current checkpoint evidence: F-AUTH has a frontend real-session boundary patch
  with 23/23 tests and typecheck/build/lint PASS, plus an AU-01 PostgreSQL smoke
  1/1 PASS. Q-01's prior fake-port phase remains reviewed PASS but its real-port
  worker produced no reviewable handoff. M-02 focused realtime 9/9 and full
  Market Data 23 PASS / 1 skipped. Workspace build/typecheck/tests,
  architecture, artifacts, deferred-scope, runtime smoke, and whitespace checks
  PASS.
- Remaining truthful `UNVERIFIED` gates are F-AUTH browser/service completion,
  Q-01 real persistence/Backtesting/Leaderboard integration, live Binance
  realtime smoke, and I-01 cross-module Experiment/Leaderboard atomicity.
- No source, business-state, or task-DAG drift was found after the INS-015
  checkpoint. The current task board and handoff are authoritative.

## Approved execution frontier

The Orchestrator is authorized to execute exactly these two independent
review-closure phases in parallel:

1. `F-AUTH` — complete real AU-01 integration of the existing frontend Auth phase.
2. `Q-01` — complete real-port integration of the existing Search phase.

These continue existing REVIEW records; they do not reassign completed work or
broaden scope. Each bounded implementation fix must be delegated to a separate
worker with a disjoint write scope. B-02 is already DONE at its packet boundary;
M-02 remains REVIEW and is not part of this instruction.

### F-AUTH boundary

- Governing requirements: `AU-01`, `OW-01`, `FE-01`, `DM-01`.
- Start/integration dependencies: `C-01A`, `F-01`, and `AU-01`, all DONE.
- Allowed scope: only `apps/frontend/**` Auth clients, screens, state,
  navigation guards, and tests; use the existing AU-01 public transport and
  HttpOnly cookie boundary.
- Objective: review the existing real-session boundary patch, complete the real
  AU-01 register/login/session restoration/logout integration, and close F-AUTH
  if its protected-navigation and cache-isolation DoD passes.
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
verify the non-stale `INS-016` signal, task readiness after any justified
review-to-ready reconciliation, dependencies, and disjoint write scopes.
Delegate F-AUTH and Q-01 implementation work to separate workers. The
Orchestrator alone changes
`TASKS.md`/`HANDOFF.md`, reviews and integrates worker output, runs applicable
gates, records exact commits and evidence, and stops when this authorization is
exhausted.

Do not start M-02 rework, B-02 rework, AU-02, I-01, I-02, N-01, N-02, F-02, or
any other newly unlocked task. M-02 remains REVIEW with its live-provider
limitation; carry that evidence to a later explicitly authorized integration
gate. A new Instructor review and Instruction ID are required for the next
frontier.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, L-01, or B-02.
- M-02 source/rework, AU-02, N-01, N-02, F-02, I-01, I-02, or any other
  unfinished packet outside F-AUTH/Q-01 review closure.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after the authorized F-AUTH/Q-01 review-closure work is
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
