# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-063`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-063 — C-03 contract reconciliation closure review

This replaceable signal supersedes `INS-062 / HOLD` and authorizes exactly one
Manager-owned closure packet: review and close `C-03`. It authorizes no worker,
source implementation, Q-02 closure, or downstream work.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base: `987eb98` (`docs(control): hold after ENV-04 closure`), with
  ENV-04 closed at `4c964f6` and the current tree clean at dispatch.
- C-03 source checkpoint: `51e98f9d5edd545831007dc6ce105701384bfd44`
  (`checkpoint(ins-055): review C-03 search contracts`). C-03 remains `REVIEW`;
  Q-02 remains `REVIEW` and must not be promoted by this signal.
- The parent Instructor independently reviewed the C-03 contract, port, REST,
  and focused-test diff. C-03 focused tests pass 9/9; current deferred-scope
  tests pass 13/13, `scope:check`, architecture, artifacts, typecheck, build,
  lint, and diff checks pass. The current workspace evidence is 341 passed
  tests with 6 PostgreSQL-gated skips; those skips are not PASS evidence.
  OpenSpec CLI remains `UNVERIFIED`, and real provider/database/demo evidence
  remains `UNVERIFIED` or `BLOCKED` where recorded.
- Active-task inspection must find no other running Cryptox Manager or worker.
  Historical tasks must not be resumed, retried, replaced, or duplicated.

### Authorized packet: `C-03` closure review

- **Authority and requirements:** `CSL-R-SE-03`, `CSL-R-RP-02`,
  `CSL-R-LB-01`, `CSL-R-OB-01`, DEC-007, DEC-012, and the C-02 boundary.
  This is a control-plane closure review of the already executed C-03
  reconciliation; it creates no product behavior.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on branch
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  completely, then verify this signal, `TASKS.md`, `HANDOFF.md`, the DAG,
  current Git, dependencies, and active tasks before editing anything.
- **Worker rule:** no worker is authorized or needed. This packet is limited
  to Manager-owned control-plane reconciliation and closure review; the Manager
  must not create a worker or touch source.
- **Manager-owned write scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. Reconcile the C-03 checkpoint to the
  current Git history and evidence, preserve its exact source scope and all
  `UNVERIFIED`/`BLOCKED` limitations, and update only C-03's operational state
  and checkpoint text. Q-02 and every other task state must remain unchanged.

### Acceptance and stop condition

- Verify the exact C-03 contract/REST/port/checker diff and the focused 9/9
  tests, current 13/13 scope tests, `scope:check`, architecture, artifacts,
  typecheck, build, lint, workspace-test, and diff-check evidence. Unavailable
  OpenSpec, PostgreSQL, provider, or demo checks must not become `PASS`.
- If evidence and control records remain consistent, move only C-03
  `REVIEW -> DONE`; otherwise keep C-03 `REVIEW` and record the precise reason.
  Do not promote or close Q-02.
- Commit one coherent Manager checkpoint containing only the two authorized
  control files and stop immediately. No source, contract, migration,
  dependency, provider, frontend, or downstream packet may change.
- After this authorization, renewed Instructor review is required before Q-02
  closure or any implementation authorization.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
