# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-018`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `95e0f3c` (`docs(control): finalize INS-017 handoff reference`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 46 local commits.
- INS-017 is exhausted. Its reviewed source commit `04bf234` contains only the
  four authorized packet scopes; Manager control commits `70fdfce`, `b67b65a`,
  and `95e0f3c` reconcile ownership, validation, and the final checkpoint.
  D-01, AU-01, M-01, L-01, B-02, F-AUTH, N-01, and N-02 must not be reassigned
  or reworked.
- F-AUTH is DONE at its packet boundary: frontend 25/25, typecheck/build/lint,
  AU-01 PostgreSQL 3/3, backend HTTP 1/1, and local browser credential flow
  PASS. Deployed HTTPS `Secure` behavior and a real private business endpoint
  remain `UNVERIFIED` for the later runtime integration gate.
- N-01 is DONE at its initial packet boundary: News 14/14 plus package,
  architecture, artifact, deferred-scope, and whitespace gates PASS. Live
  CoinDesk and real News PostgreSQL evidence remain `UNVERIFIED` for later
  integration. N-02 is DONE at its initial packet boundary: Sentiment 16/16
  plus the applicable gates PASS; real PostgreSQL remains `UNVERIFIED`.
- Q-01 remains REVIEW/UNVERIFIED. Its focused suite is 21/21 and package/global
  gates PASS, but the reachable dedicated PostgreSQL public Search,
  Backtesting, and Leaderboard pipeline reproduced a material defect: in-memory
  SearchRun state reached `COMPLETED` while the persisted row remained
  `RUNNING`. No concurrency fix was claimed.
- M-02 remains REVIEW because live Binance realtime evidence is `UNVERIFIED`;
  its focused realtime suite is 9/9 and full Market Data is 23 PASS / 1 skipped.
  `verify:stage4a` is PASS, while formal OpenSpec CLI validation remains
  `UNVERIFIED` because the CLI is unavailable.
- No source, business-state, or task-DAG drift was found after INS-017. The
  current task board and handoff are authoritative. B-02 remains DONE under
  DEC-006, with cross-module Experiment/Leaderboard atomicity reserved for
  I-01. AU-02 and I-01/I-02 remain blocked; F-02 is BLOCKED only because it has
  not yet been reconciled after its start dependencies became satisfied.

## Approved execution frontier

The Orchestrator is authorized to execute exactly these three bounded phases:

1. `Q-01` — repair the persisted SearchRun lifecycle race and complete the
   real-port Search integration closure.
2. `F-02` — implement the initial authenticated Strategy/Search/result and
   auxiliary frontend views against typed clients/fakes.
3. `M-02` — perform an evidence-only live Binance realtime integration probe
   using the existing Market Data implementation; no source rework is
   authorized by this instruction.

Q-01 continues its existing REVIEW record. F-02 is an initial implementation
packet whose start dependencies `C-01A`, `F-01`, and F-AUTH are DONE; its later
real-API/AU-02 integration remains gated. M-02 is a review/evidence closure
only. Q-01 and F-02 implementation work must be delegated to separate workers
with disjoint write scopes. No downstream task may start automatically when one
of these phases becomes DONE.

### Q-01 boundary

- Governing requirements: `SE-01`, `SE-02`, `LB-01`, `OB-01`, `DM-01`, `AR-02`,
  `OW-01`.
- Start/integration dependencies: `C-01A`, `S-01`, `D-01`, `L-01`, and B-02
  are DONE.
- Allowed scope: only `modules/search/**` except frozen contracts and
  migrations; use public Backtesting and Leaderboard module APIs.
- Objective: fix the reproduced stale persisted SearchRun lifecycle outcome,
  add regression coverage, and complete the real PostgreSQL/public pipeline
  evidence without broadening Search responsibilities.
- Required evidence: deterministic generation, owner-scoped persistence and
  lifecycle, cross-user not-found, bounded stop/cancel/failure behavior,
  public Backtesting/Leaderboard integration, and persisted terminal-state
  correctness under the reproduced concurrent path. Fake-only evidence cannot
  close Q-01.
- Forbidden: simulation, Candidate persistence outside Search's public
  boundary, score calculation, backend controllers, migrations, contract
  changes, or automatic AU-02/I-01 work.

### F-02 boundary

- Governing requirements: `ST-01`, `ST-03`, `SE-01`, `SE-02`, `BT-01`, `EV-01`,
  `LB-01`, `VIS-01`, `NW-01`, `SN-01`, `DM-01`, `AU-01`, `OW-01`.
- Start dependencies: `C-01A`, `F-01`, and F-AUTH, all DONE. All real APIs and
  AU-02 remain later integration dependencies at I-01.
- Allowed scope: only `apps/frontend/**` feature views, typed feature clients,
  presentation state, and tests; consume the existing Auth boundary and typed
  module contracts/fakes. The existing `apps/frontend/src/auth/**` boundary is
  read-only in this packet.
- Objective: implement descriptor-driven Strategy controls, authenticated
  Search progress, Leaderboard/Experiment/trade result views, generic price and
  indicator overlays, News/Sentiment panels, and frontend cache isolation.
- Required evidence: owner-scoped authenticated fixture flow, A/B cache
  isolation, descriptor-driven controls without strategy-name branches, bounded
  Search status presentation, required metrics/provenance, and graceful missing
  Sentiment display.
- Forbidden: backend or module implementation, indicator/signal/backtest/
  metric/score/provider business logic, migrations, browser token storage,
  client-selected identity, and claiming real-API/I-01 completion from fakes.

### M-02 evidence boundary

- Governing requirements: `MD-02`, `RD-01`, `FE-01`, `OB-01`, `AR-02`, `DM-01`.
- Use the existing configured Binance WebSocket/Market Data implementation and
  report live connection, normalized delivery, disconnect/reconnect and gap
  behavior truthfully.
- No source, contract, migration, frontend, or configuration rework is
  authorized. If live Binance is unavailable, retain M-02 as REVIEW/
  `UNVERIFIED`; do not turn fixture evidence into a PASS.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the non-stale `INS-018` signal, task readiness after any justified
review/blocked-to-ready reconciliation, dependencies, and disjoint write
scopes. Delegate Q-01 and F-02 implementation work to separate workers. The
Orchestrator alone changes `TASKS.md`/`HANDOFF.md`, reviews and integrates
worker output, runs applicable gates, records exact commits and evidence, and
stops when this authorization is exhausted.

Do not start AU-02, I-01, I-02, N-01/N-02 rework, F-AUTH rework, B-02 rework,
M-02 source rework, D-01, AU-01, or any other newly unlocked task. Do not claim
final/demo completion from fixture-only or unavailable-provider evidence. A new
Instructor review and Instruction ID are required for the next frontier.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, L-01, B-02, F-AUTH, N-01, or
  N-02.
- AU-02, I-01, I-02, M-02 source changes, or any unfinished packet outside the
  explicitly authorized Q-01, F-02, and M-02 evidence phases.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after Q-01/F-02 review and integration, and the M-02 live
evidence attempt is recorded, or when a required evidence/environment gate
blocks safe completion. A fresh Instructor review and new Instruction ID are
required afterward.

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
