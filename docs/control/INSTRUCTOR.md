# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-068`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-068 — HOLD after ENV-03 checker closure

The previous `INS-067 / APPROVED_FOR_EXECUTION` is exhausted. This signal
persists the reviewed ENV-03 closure and authorizes no implementation, worker,
or downstream start yet.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `1942627`
  (`checkpoint(env-03): close checker reconciliation`); Git is clean after
  the parent Instructor committed the audited Manager-owned closure diff.
- Q-02 is `DONE` under INS-065. Its source checkpoint remains
  `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`; ENV-04 is `DONE` at `4c964f6`
  with implementation checkpoint `5032582`; C-03 is `DONE` at `a115025`.
- Current operational board: 30 `DONE`, 4 `REVIEW` (`M-02`, `M-03`, `B-03`,
  `N-03`), and 8 `BLOCKED` (`S-04`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`,
  `I-03`, `AU-02`) across 42 task rows. This is packet-state
  progress only, not final MVP acceptance.
- ENV-03 is now `DONE` under INS-067. The current deferred-scope checker and
  its 13 focused tests pass, and `npm run scope:check` passes for the approved
  B-03 and Q-02 boundaries. The later ENV-04 checker reconciliation at
  `5032582` remains unchanged.
- Real PostgreSQL, configured Binance/News providers, browser/demo runtime,
  link/DAG automation, and OpenSpec CLI evidence remain `UNVERIFIED` or
  `BLOCKED` where recorded. No unavailable check is treated as PASS.

### Reviewed frontier and next safe candidate

- B-03 remains `REVIEW` after its accepted source checkpoint
  `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`. The parent Instructor independently
  reran all seven Backtesting test files: 43/43 pass. The current checker
  tests are 13/13 and `npm run scope:check` passes. B-03's real Binance and
  PostgreSQL evidence remain `UNVERIFIED`/`BLOCKED`, but its packet definition
  permits those unavailable runtime checks to remain explicitly limited.
- The next safe candidate is exactly a Manager-only `B-03` closure review,
  subject to a fresh start-gate verification. B-03 must not be promoted or
  edited by this HOLD checkpoint; no E-02/L-02/downstream start is implied.
- Before issuing the next authorization, verify clean Git, no active Cryptox
  Manager/worker, unchanged source/business state, and consistent TASKS,
  HANDOFF, DAG, and requirements. Any material drift keeps `HOLD` or requires
  `NEEDS_HUMAN_DECISION` with exact evidence.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
