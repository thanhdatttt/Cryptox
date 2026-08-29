# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-019`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `abd9b54` (`docs(control): record INS-018 commit references`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 51 local commits.
- INS-018 is exhausted. Q-01 closed its reproduced persisted SearchRun race
  and real-port integration at source commit `317ca0d`; F-02 closed its
  fixture-first frontend packet at `84209b0`. D-01, AU-01, M-01, L-01, B-02,
  F-AUTH, N-01, and N-02 remain DONE and must not be reassigned or reworked.
- Q-01 evidence is now complete: focused Search 22 passed / 1 skipped,
  package gates pass, and the real PostgreSQL public Search→Backtesting→
  Leaderboard pipeline passed twice, including persisted terminal state,
  ownership checks, Backtesting completion, and Leaderboard admission.
- F-02 evidence is complete at its authorized fixture-first boundary: frontend
  31/31, six packet-scoped tests, typecheck/lint/build/global gates PASS.
  Real API/browser integration remains a later I-01 concern. F-AUTH's local
  browser/Auth evidence is complete at packet boundary; deployed HTTPS and a
  real private business endpoint remain `UNVERIFIED` for I-01.
- N-01 and N-02 are DONE at their initial packet boundaries with their fixture,
  adapter, persistence-mapping, and failure-isolation gates PASS. Live CoinDesk
  and real News/Sentiment PostgreSQL evidence remain `UNVERIFIED` for later
  runtime integration.
- M-02 remains REVIEW/UNVERIFIED. Its realtime resilience suite is 9/9 and
  full Market Data is 23 passed / 1 skipped; the INS-018 live Binance attempt
  reached the provider but ended with reconnect-limit exhaustion. No source or
  configuration rework was made.
- AU-02 remains BLOCKED only on its unreconciled task state: its start
  dependencies AU-01, D-01, S-01, L-01, B-02, Q-01 real integration, and
  F-AUTH are now satisfied. I-01/I-02 remain blocked. `verify:stage4a` passed;
  formal OpenSpec CLI validation remains `UNVERIFIED` because the CLI is
  unavailable. Cross-module Experiment/Leaderboard transaction atomicity is
  still reserved for I-01.
- No source, business-state, or task-DAG drift was found after INS-018. The
  current task board and handoff are authoritative.

## Approved execution frontier

The Orchestrator is authorized to execute exactly these two bounded phases:

1. `AU-02` — implement the cross-module per-user ownership security matrix and
   narrowly approved owner-scoped fixes.
2. `M-02` — perform one bounded evidence-only live Binance realtime re-probe
   using the existing Market Data implementation; no source rework is
   authorized.

AU-02 is an initial security-integration packet now that its start dependencies
are satisfied; its final runtime composition remains an I-01 concern. M-02 is
an evidence-only review closure. AU-02 implementation work must be delegated to
a worker; M-02 may be validated by the Manager because it has no implementation
write scope. No downstream task may start automatically when either phase is
complete.

### AU-02 boundary

- Governing requirements: `OW-01`, `AU-01`, `ST-04`, `SE-01`, `SE-02`, `BT-01`,
  `LB-01`, and `OB-01`.
- Start dependencies: AU-01, D-01, S-01, L-01, B-02, Q-01 real integration,
  and F-AUTH are DONE.
- Allowed scope: cross-module security/integration tests plus narrowly approved
  owner-scoped fixes across Auth, Strategy, Search, Backtesting, Leaderboard,
  and their existing runtime boundary where integration evidence proves a
  defect. Use trusted authenticated identity, not client-supplied identity.
- Objective: produce the two-user isolation matrix for read/update/delete/
  cancel/list/rank, unauthenticated rejection, cross-user not-found semantics,
  Search Candidate owner propagation, same-owner Leaderboard admission, and
  shared-data behavior.
- Required evidence: User A/B isolation, 401 unauthenticated responses, 404
  cross-user private lookups, client identity cannot bypass request context, no
  secret logging, and all applicable package/global gates.
- Forbidden: pure Strategy/simulator/Evaluation algorithms, Market Data/News
  ownership, unrelated refactors, deferred enterprise identity, migrations,
  and automatic I-01/I-02 work. Any source fix must remain narrowly tied to a
  failing security assertion and preserve public contracts.

### M-02 evidence boundary

- Governing requirements: `MD-02`, `RD-01`, `FE-01`, `OB-01`, `AR-02`, and
  `DM-01`.
- Use the existing configured Binance WebSocket/Market Data implementation and
  perform one bounded live attempt, reporting provider reachability, normalized
  delivery, connection state, and reconnect/gap behavior truthfully.
- No source, contract, migration, frontend, or configuration rework is
  authorized. If Binance again fails or reconnects exhaust, retain M-02 as
  REVIEW/`UNVERIFIED`; fixture resilience cannot be promoted to live PASS.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the non-stale `INS-019` signal, task readiness after any justified
blocked/review-to-ready reconciliation, dependencies, and disjoint write
scopes. Delegate AU-02 implementation to a separate worker. The Orchestrator
alone changes `TASKS.md`/`HANDOFF.md`, reviews and integrates worker output,
runs applicable gates, records exact commits and evidence, and stops when this
authorization is exhausted.

Do not start I-01, I-02, F-AUTH/F-02/Q-01/N-01/N-02 rework, B-02 rework, M-02
source rework, D-01, AU-01, or any other newly unlocked task. Do not claim
final/demo completion from fixture-only or unavailable-provider evidence. A new
Instructor review and Instruction ID are required for the next frontier.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, L-01, B-02, Q-01, F-AUTH,
  F-02, N-01, or N-02.
- I-01, I-02, M-02 source changes, or any unfinished packet outside AU-02 and
  the M-02 evidence-only probe.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after AU-02 review/integration and the single M-02 live
evidence attempt are recorded, or when a required evidence/environment gate
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
