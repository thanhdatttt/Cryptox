# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-060`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-060 — post-ENV-04 checkpoint hold

This replaceable signal supersedes `INS-059 / APPROVED_FOR_EXECUTION`. No
implementation packet is authorized while the Manager-owned ENV-04 checkpoint
records are reconciled.

### Reviewed evidence

- Branch: `MVP_IMPLEMENTATION`.
- HEAD: `5032582` (`checkpoint(env-04): reconcile Q-02 checker boundary`).
- The parent Instructor independently verified that the commit contains only
  the two authorized checker files and the Manager-owned `TASKS.md` and
  `HANDOFF.md` changes from ENV-04.
- `npm run test:scope-check` passed 13/13; `npm run scope:check`,
  `npm run arch:check`, and `npm run artifacts:check` passed. The Manager's
  recorded typecheck, build, lint, workspace-test, and diff-check evidence was
  also reviewed. OpenSpec CLI remains `UNVERIFIED`; PostgreSQL-dependent tests
  and real provider/demo evidence remain `UNVERIFIED` or `BLOCKED` where
  recorded.
- ENV-04 and Q-02 remain `REVIEW` in `TASKS.md`. The committed
  `HANDOFF.md`/`TASKS.md` checkpoint text still describes the pre-parent-commit
  Git permission failure, so those Manager-owned records must be reconciled
  before either packet is closed or downstream work is authorized.

### Required next review

- Do not start, retry, replace, or duplicate any worker or implementation
  packet. Do not authorize Q-02, B-03, S-04, E-02, L-02, F-03, I-01, I-02,
  I-03, AU-02, M-02, M-03, N-03, or any downstream work under this signal.
- Before a new authorization, verify a clean Git tree relative to `5032582`,
  no active Cryptox Manager or worker, and consistent signal/checkpoint/DAG
  state.
- The next fresh Manager may be authorized only for the narrow Manager-owned
  reconciliation and closure review of ENV-04 (and any directly evidenced
  Q-02 closure decision if separately named). It must update only
  `TASKS.md`/`HANDOFF.md` for that review, preserve `REVIEW` when evidence is
  insufficient, and stop before downstream work.
- A future authorization for implementation or environment-gated work must
  name its packet, requirement IDs, exact worker write scope, acceptance
  criteria, validation gates, dependencies, prohibitions, and stop condition.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [ENV-04 checkpoint](../implementation/HANDOFF.md)
- [ENV-04 decision](./DECISIONS.md#dec-013--q-02-approved-profile-checker-boundary-reconciliation)
