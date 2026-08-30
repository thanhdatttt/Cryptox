# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-061`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-061 — ENV-04 checkpoint reconciliation and closure review

This replaceable signal supersedes `INS-060 / HOLD` and authorizes exactly one
Manager-owned closure packet: reconcile and review `ENV-04`. It authorizes no
worker, source implementation, Q-02 closure, or downstream work.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed source/checkpoint commit: `5032582` (`checkpoint(env-04): reconcile
  Q-02 checker boundary`). Current signal/hold commit: `8e7ee65`.
- The parent Instructor independently verified that `5032582` contains only
  the two authorized checker files and the Manager-owned ENV-04 checkpoint
  changes. The working tree is clean at dispatch.
- `npm run test:scope-check` passed 13/13; `npm run scope:check`,
  `npm run arch:check`, and `npm run artifacts:check` passed. The recorded
  typecheck, build, lint, workspace-test, and diff-check evidence was reviewed.
  OpenSpec CLI remains `UNVERIFIED`; PostgreSQL-dependent tests and real
  provider/demo evidence remain `UNVERIFIED` or `BLOCKED` where recorded.
- `TASKS.md` and `HANDOFF.md` still describe the Manager's pre-parent-commit
  Git permission failure. This is a Manager-owned documentation checkpoint
  inconsistency, not permission to alter source or task scope.
- Before dispatch, active-task inspection must find no other running Cryptox
  Manager or worker. Historical tasks must not be resumed, retried, replaced,
  or duplicated.

### Authorized packet: `ENV-04` closure/reconciliation

- **Authority and requirements:** `DEC-013`, `DEC-007`, `DEC-012`, ADR-010,
  `CSL-R-RP-02`, and `CSL-R-SE-03`. This is a control-plane closure review of
  the already executed checker reconciliation; it creates no product behavior.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on branch
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  completely, then verify this signal, `TASKS.md`, `HANDOFF.md`, the DAG,
  current Git, and active tasks before editing anything.
- **Worker rule:** no worker is authorized or needed. This packet is limited
  to Manager-owned control-plane reconciliation and closure review; the Manager
  must not create a worker or touch source.
- **Manager-owned write scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. Reconcile the ENV-04 checkpoint commit to
  `5032582`, remove the obsolete statement that the parent commit is pending,
  preserve all evidence and `UNVERIFIED`/`BLOCKED` limitations, and update only
  the ENV-04 operational state. Q-02 and every other task state must remain
  unchanged.

### Acceptance and stop condition

- Verify the exact ENV-04 checker diff and the already recorded 13/13 focused
  tests, `scope:check`, architecture, artifacts, typecheck, build, lint,
  workspace-test, and diff-check evidence. Do not convert unavailable
  OpenSpec, PostgreSQL, or provider evidence to `PASS`.
- If the evidence and control records are consistent after reconciliation,
  move only ENV-04 `REVIEW -> DONE`; otherwise keep ENV-04 `REVIEW` and record
  the precise reason. Do not promote or close Q-02.
- Commit one coherent Manager checkpoint containing only the two authorized
  control files and stop immediately. No source, contract, migration,
  dependency, provider, frontend, or downstream packet may change.
- After this authorization, renewed Instructor review is required before any
  Q-02 closure or implementation authorization.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [ENV-04 checkpoint](../implementation/HANDOFF.md)
- [ENV-04 decision](./DECISIONS.md#dec-013--q-02-approved-profile-checker-boundary-reconciliation)
