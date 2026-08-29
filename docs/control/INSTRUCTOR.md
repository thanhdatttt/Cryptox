# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-032`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: `RB-03 — C-02 Operational DAG Reconciliation`

Reason: `The accepted ENV-01 checkpoint is complete, but TASKS.md has not yet
recorded C-02's already-approved ENV-01 DONE and separate Instructor-review start
dependencies from MVP_PLAN.md. This bounded documentation correction restores the
operational DAG; it does not authorize C-02 or any implementation.`

This signal authorizes exactly one fresh Manager in the canonical
`MVP_IMPLEMENTATION` checkout. The Manager must not create a worker, subagent,
worktree, retry, or downstream task.

## Applicability

- Reviewed checkpoint: `MVP_IMPLEMENTATION` /
  `87e9fad4039e8b1133c09bffd0990938c0e4e986`
  (`docs(control): hold for C-02 DAG reconciliation`), after accepted ENV-01
  checkpoint `3df0b1e188635df5b217371bdb2efbc57695a844`.
- The worktree was clean; the completed ENV-01 Manager and worker are idle.
- `ENV-01` is `DONE`; C-02 and every feature packet remain `BLOCKED`.

Before editing, the Manager must prove current `INS-032`, clean Git state, the
reviewed checkpoint plus only this signal as later drift, and no active Cryptox
Manager or worker. If any condition fails, make no changes and report
`NEEDS_INSTRUCTOR_REVIEW`.

## Exact permitted work

The Manager may edit and commit only:

- `docs/implementation/TASKS.md`; and
- `docs/implementation/HANDOFF.md`.

In the existing C-02 operational record, reconcile the start-dependency/evidence
summary to the already-approved C-02 plan: `ENV-01 DONE` plus separate Instructor
review; completed baseline `C-01A`, `D-01`, `M-01`, `S-01`, `Q-01`, `B-02`,
`E-01`, `L-01`, `N-01`, and `N-02`; and `M-02 REVIEW/UNVERIFIED` as review input
only, not a retry dependency. Preserve the historical blocked C-02 attempt as
evidence. Keep C-02 `BLOCKED`, retain its write scope and acceptance criteria, and
do not create, change, or promote any other task state, scope, dependency, or
packet.

Update HANDOFF only to report this precise documentation reconciliation, its
validation, its commit, the preserved C-02 blocked state, and the next required
Instructor review. Do not edit `MVP_PLAN.md`: it is already canonical and correct.

## Explicit prohibitions

- Do not edit requirements, decisions, ADRs, architecture, data model, OpenSpec,
  source, executable contracts, migrations, runtime configuration, frontend, or
  dependencies.
- Do not create a task/packet, worker, subagent, worktree, or a second Manager.
- Do not start, retry, reclassify, or implement C-02, ENV-01, M-02, AU-02, I-01,
  I-02, M-03, S-04, S-05, S-06, Q-02, B-03, N-03, E-02, L-02, F-03, or I-03.

## Validation and stop condition

Run changed-path, link, DAG/state-consistency, historical-evidence preservation,
and whitespace checks. Commit only the accepted documentation correction, then
stop. `INS-032` is exhausted after RB-03; the system returns to Instructor review
in `HOLD`. C-02 cannot start until a later, separately reviewed and bounded
Instructor signal authorizes it.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
