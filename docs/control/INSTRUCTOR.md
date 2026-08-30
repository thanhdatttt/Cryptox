# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-066`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-066 — HOLD after Q-02 seeded discovery closure

The previous `INS-065 / APPROVED_FOR_EXECUTION` is exhausted. This signal
persists a safe Instructor checkpoint after the Manager's Q-02 closure and
authorizes no implementation, closure, worker, or downstream start yet.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `bd9dd86`
  (`checkpoint(q-02): close seeded discovery reconciliation`); Git is clean
  after the parent Instructor committed the audited Manager-owned
  `TASKS.md`/`HANDOFF.md` diff.
- Q-02 is `DONE` under INS-065. Its source checkpoint remains
  `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`; ENV-04 is `DONE` at `4c964f6`
  with implementation checkpoint `5032582`; C-03 is `DONE` at `a115025`.
- Current operational board: 29 `DONE`, 5 `REVIEW` (`M-02`, `M-03`, `B-03`,
  `N-03`, `ENV-03`), and 8 `BLOCKED` (`S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, `I-03`, `AU-02`) across 42 task rows. This is packet-state
  progress only, not final MVP acceptance.
- The current deferred-scope checker and its 13 focused tests pass, and
  `npm run scope:check` now passes for the approved B-03 and Q-02 boundaries.
  ENV-03's reviewed checkpoint `0bc215f` therefore has the local evidence for
  a separate Manager-only closure review, subject to the start gate below.
- Real PostgreSQL, configured Binance/News providers, browser/demo runtime,
  link/DAG automation, and OpenSpec CLI evidence remain `UNVERIFIED` or
  `BLOCKED` where recorded. No unavailable check is treated as PASS.
- Control-plane finding requiring reconciliation before acceptance: a legacy
  narrative paragraph in `docs/implementation/TASKS.md` still broadly says
  that all extension packets other than the completed S-05/S-06/Q-02 remain
  `BLOCKED`, while the authoritative rows for M-03, B-03, N-03, and ENV-03 are
  `REVIEW`. The next Manager may correct only this stale summary wording as
  part of an explicitly authorized control-plane reconciliation; no Instructor
  or Manager may silently change task states outside that authorization.

### Conditions for the next authorization

Before issuing an `APPROVED_FOR_EXECUTION` signal, the Instructor must verify
that the tree remains clean, no Cryptox Manager/worker is running, the current
HEAD and reviewed checkpoint are unchanged, and TASKS/HANDOFF/DAG agree. The
next safe candidate is exactly `ENV-03` closure/reconciliation; it must not
promote B-03 or start any E1/E2/downstream feature. Any material drift or
unavailable required evidence keeps the system at `HOLD` or moves it to
`NEEDS_HUMAN_DECISION` with exact evidence.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
