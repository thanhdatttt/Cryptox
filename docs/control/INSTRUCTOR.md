# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-033`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: `RB-03 — C-02 Operational DAG Reconciliation (corrected applicability)`

Reason: `INS-032's Manager made no edits or commits because its delegated prompt
incorrectly called the authorization commit the reviewed checkpoint. This signal
corrects only that applicability wording and reauthorizes the same documentation-
only RB-03 scope; it does not authorize C-02 or any implementation.`

This signal authorizes exactly one fresh Manager in the canonical
`MVP_IMPLEMENTATION` checkout. The Manager must not create a worker, subagent,
worktree, retry, or downstream task.

## Exact applicability record

- The reviewed pre-authorization checkpoint is
  `87e9fad4039e8b1133c09bffd0990938c0e4e986`
  (`docs(control): hold for C-02 DAG reconciliation`).
- `a7025fed645f5f1a06579d3035d637d64082ebe7` is the expected sole child and
  `INS-032` authorization commit, not the reviewed checkpoint.
- The prior RB-03 Manager stopped with `NEEDS_INSTRUCTOR_REVIEW` and made no
  edits or commits. The worktree at `a7025fe` was clean; no other Cryptox Manager
  or worker is active.
- `ENV-01` remains `DONE`; C-02 and every feature packet remain `BLOCKED`.

Before editing, the fresh Manager must prove current `INS-033`, clean Git state,
the reviewed pre-authorization checkpoint followed only by `a7025fe` and this
signal, and absence of another active Cryptox Manager/worker. If any premise
cannot be proved, make no changes and report `NEEDS_INSTRUCTOR_REVIEW`.

## Exact permitted work

The Manager may edit and commit only:

- `docs/implementation/TASKS.md`; and
- `docs/implementation/HANDOFF.md`.

In the existing C-02 operational record, reconcile only its start-dependency/
evidence summary to the already-approved `MVP_PLAN.md` definition: `ENV-01 DONE`
plus separate Instructor review; completed baseline `C-01A`, `D-01`, `M-01`,
`S-01`, `Q-01`, `B-02`, `E-01`, `L-01`, `N-01`, and `N-02`; and
`M-02 REVIEW/UNVERIFIED` as review input only, not retry or completion dependency.
Preserve the historical blocked C-02 attempt as evidence. Keep C-02 `BLOCKED` and
unchanged in scope and acceptance. Do not edit `MVP_PLAN.md`, which is already
canonical and correct.

Update HANDOFF only with this precise reconciliation, validation, commit,
preserved blocked state, and required fresh Instructor review.

## Explicit prohibitions

- Do not edit requirements, decisions, ADRs, architecture, data model, OpenSpec,
  source, executable contracts, migrations, runtime configuration, frontend,
  dependencies, or any packet/task other than the permitted C-02 record wording.
- Do not create a task/packet, worker, subagent, worktree, or a second Manager.
- Do not start, retry, reclassify, or implement C-02, ENV-01, M-02, AU-02, I-01,
  I-02, M-03, S-04, S-05, S-06, Q-02, B-03, N-03, E-02, L-02, F-03, or I-03.

## Validation and stop condition

Run changed-path, link, DAG/state-consistency, historical-evidence-preservation,
and whitespace checks. Commit only the accepted documentation correction, then
stop. `INS-033` is exhausted after RB-03; the system returns to Instructor review
in `HOLD`. C-02 cannot start until a later, separately reviewed and bounded
Instructor signal authorizes it.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
