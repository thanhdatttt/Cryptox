# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-041`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-041 — Closure review for ENV-02, S-05, and S-06

This replaceable signal supersedes `INS-040 / HOLD` and authorizes exactly one
Manager-owned closure review of already implemented, independently validated
work. It authorizes no new implementation and no downstream packet. No worker
is authorized or needed because the packet contains only evidence review and
operational state transitions.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Authorization base HEAD: `bac4df05ec7cbe16753196013c38f4e30120dbca`
  (`docs(control): hold after ENV-02 review`).
- Working tree was clean; current signal was `INS-040 / HOLD`.
- `ENV-01 = DONE`, `C-02 = DONE`, `ENV-02 = REVIEW`, `S-05 = REVIEW`, and
  `S-06 = REVIEW`. `M-03`, `S-04`, `Q-02`, `N-03`, `B-03`, and all later
  extension/integration packets remain `BLOCKED`.
- The ENV-02 Manager
  (`01a04ea7-b1bd-73c2-972a-7d67e6f551c9`) is idle after completion and its
  one worker (`01a04eae-367c-7fc3-8961-dccb9e760cf9`) is closed. No other
  active Cryptox Manager, Orchestrator, or worker is running. No historical
  Manager or worktree was reused or removed.

### Authorized closure scope

- **Only state transitions:** Review the existing `ENV-02`, `S-05`, and `S-06`
  evidence and, only if all acceptance and validation evidence remains
  applicable, transition those three rows independently from `REVIEW` to
  `DONE`. Do not alter any other task row.
- **Manager-owned files:** Only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` may change. The Manager must record this
  instruction ID, the reviewed commits, the unchanged worker topology, the
  evidence decision, and the stop boundary. No worker may be created.
- **No implementation:** Do not edit `scripts/**`, `modules/**`,
  `packages/**`, `apps/**`, `infra/**`, dependencies, migrations, runtime,
  frontend, requirements, ADRs, OpenSpec, `MVP_PLAN.md`, `DECISIONS.md`, or
  `INSTRUCTOR.md`. Do not amend or rewrite prior evidence; append/replace only
  the current Manager checkpoint as its ownership permits.

### Acceptance and validation required for promotion

- Confirm `d8c5bf3324cbee349e272cb177537fa6ed062df0` contains only the
  authorized checker/test implementation plus the Manager checkpoint changes,
  and `2751fbe3e554351c4629b230b4951c4121702416` records the completed ENV-02
  handoff.
- Confirm the four exact extension boundaries remain allowlisted, near-match
  paths remain rejected, and no generic deferred-scope rejection was weakened.
- Re-run or verify evidence for `npm run test:scope-check` (`7/7 PASS`),
  `npm run scope:check` (`PASS`), `npm run arch:check`,
  `npm run artifacts:check`, `npm run typecheck`, `npm run build`,
  `npm run lint`, and `git diff --check`.
- The root `npm test` result remains `UNVERIFIED` because six
  environment-gated PostgreSQL/integration/E2E tests are skipped despite all
  executed tests passing. OpenSpec CLI and dedicated link/DAG automation remain
  `UNVERIFIED`; do not convert these to PASS.
- If any source/business-state drift, evidence gap, or task-DAG inconsistency
  is found, do not promote rows; record `BLOCKED`/`NEEDS_INSTRUCTOR_REVIEW` in
  the handoff and stop.

### Prohibitions and stop condition

- Do not create a worker, do not create another Manager, do not retry ENV-02,
  and do not start or promote `M-03`, `S-04`, `Q-02`, `N-03`, `B-03`, `E-02`,
  `L-02`, `F-03`, `I-03`, `M-02`, `AU-02`, `I-01`, `I-02`, or any deferred
  packet.
- After the closure review and required Manager checkpoint commit, stop with
  `ENV-02`, `S-05`, and `S-06` at `DONE` if accepted, or with their exact
  unchanged states and a blocker if not. No automatic downstream start occurs.
- A fresh Instructor review is mandatory before the next implementation
  authorization.

### Dispatch requirements

- Create exactly one fresh Manager in the same canonical checkout, no worktree,
  using `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md`
  and `docs/control/prompts/ORCHESTRATOR_START.md` fully, then recover all
  authority from the repository before acting.
- Before dispatch, the Manager must reverify branch/HEAD, clean status, this
  signal, checkpoint applicability, task states, and absence of active
  Cryptox Manager/worker tasks. This signal is stale if any premise fails.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
