# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-059`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-059 — ENV-04 Q-02 checker boundary reconciliation

This replaceable signal supersedes `INS-058 / HOLD` and authorizes exactly one
bounded validation/tooling packet: `ENV-04`. It does not reopen Q-02 source,
C-03, ENV-01/ENV-02/ENV-03, or authorize any downstream feature.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base: `1683f07` (`docs(control): hold after Q-02 review`), which
  records the independent Q-02 review and `HOLD`. The Manager must verify the
  final authorization commit and current HEAD from Git before execution.
- Q-02 is `REVIEW` at source checkpoint
  `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`; its local implementation gates
  pass, while `npm run scope:check` is blocked only by the four exact approved
  profile occurrences recorded in `INS-058` and `HANDOFF.md`.
- ENV-03 is `REVIEW` with accepted checker evidence. C-02, C-03, S-01, Q-01,
  B-02, and L-01 remain at their recorded states. No downstream task is
  promoted by this signal.
- The working tree must be clean at dispatch, with no source/business-state
  drift from the reviewed base. Active-task inspection must find no running
  Cryptox Manager or worker. Historical tasks must not be resumed, retried,
  replaced, or duplicated.
- The operational `TASKS.md` row for `ENV-04`, if not already present, may be
  inserted and advanced only by the authorized Manager; the Instructor does
  not edit operational task state.

### Authorized packet: `ENV-04`

- **Authority and requirements:** `DEC-013`, `DEC-007`, `DEC-012`, ADR-010,
  `CSL-R-RP-02`, and `CSL-R-SE-03`. This packet changes executable validation
  policy only; it creates no product behavior or new profile.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on branch
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  completely, then verify this signal, checkpoint, DAG, dependencies, task
  row, active-task list, and write scopes before dispatch.
- **Fresh worker:** delegate exactly one fresh checker-tooling worker. Do
  not resume, replace, retry, or duplicate a historical worker. The worker
  may not edit governance, create a commit/branch/worktree, or create another
  worker.
- **Worker write scope:** only
  `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs`. No other script, package/config,
  module source, contract, REST DTO, migration, frontend, provider, queue, or
  documentation file may change.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for the ENV-04 state transition, worker
  review, evidence, limitations, checkpoint, and stop boundary. The Manager
  must not edit `INSTRUCTOR.md`, `DECISIONS.md`, or `MVP_PLAN.md`.

### ENV-04 acceptance criteria

- Permit `DOMAIN_GUIDED_V1` only in the existing canonical Search contract
  paths plus `modules/search/application/service.ts` and
  `modules/search/domain/generators/domain-guided/`.
- Permit `GENETIC_V1` only in the existing canonical Search contract paths
  plus `modules/search/application/service.ts` and
  `modules/search/domain/generators/genetic/`.
- Keep the additions exact and path-aware; do not permit a broad
  `modules/search/**` or `modules/search/application/**` boundary. Near-match
  paths and unrelated files must remain rejected.
- Preserve all prior checker positive/negative cases and continue rejecting
  deferred enterprise identity, queue/distributed infrastructure,
  live-trading/generalized risk, autonomous or unconfigured LLM,
  strict-replay vocabulary, and all other deferred scope.
- Do not change Q-02 algorithms, Search contracts/lifecycle, migrations,
  product behavior, or any task state other than the Manager-owned ENV-04
  operational checkpoint.

### Required validation and stop condition

- Move only ENV-04 through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`.
  Commit one coherent Manager checkpoint and stop; do not mark ENV-04 `DONE`
  and do not promote Q-02.
- Run `npm run test:scope-check`, `npm run scope:check`,
  `npm run arch:check`, `npm run artifacts:check`, applicable deferred-scope,
  typecheck/build/lint checks, and `git diff --check`. OpenSpec CLI and any
  unavailable environment remain `UNVERIFIED`/`BLOCKED`, never `PASS`.
- The final diff must contain only the two authorized checker files plus
  Manager-owned `TASKS.md` and `HANDOFF.md`. The four Q-02 findings must be
  resolved without weakening unrelated prohibitions. No Q-02 retry or
  downstream packet may start when this authorization is exhausted.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Q-02 checkpoint](../implementation/HANDOFF.md)
- [DEC-013](./DECISIONS.md#dec-013--q-02-approved-profile-checker-boundary-reconciliation)
