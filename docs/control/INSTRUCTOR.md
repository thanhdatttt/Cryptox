# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-044`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-044 — Hold after M-03 worker interruption

This replaceable signal supersedes `INS-043 / APPROVED_FOR_EXECUTION`. The
INS-043 authorization is exhausted. It produced no implementation change and
does not authorize a retry, a downstream packet, or any other source work.

### Instructor review

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed checkpoint commit: `bafe2ba09c583945fdd79f2ca865e340df0dc436`
  (`checkpoint(ins-043): record M-03 worker interruption`).
- Authorization reviewed: `INS-043`, commit
  `393d3dfa06386787076af80f319361a82def73d9`.
- The one authorized M-03 worker
  `01a04ef0-4cc6-78d3-af30-a393155b1953` was interrupted before
  implementation. No source files changed, no source commit exists, and no
  focused or acceptance validation evidence exists.
- `TASKS.md` and `HANDOFF.md` consistently record M-03 as `IN_PROGRESS`, with
  the worker interruption and no reviewable implementation. M-03 is not
  `REVIEW` or `DONE`.
- Independent Git review found a clean working tree, no module/package/app/
  infrastructure/business-state drift, and no active Cryptox Manager or worker
  after the checkpoint. Historical tasks were not reused, removed, or reset.
- `C-02`, `M-01`, and `F-01` remain complete; `M-02` remains
  `REVIEW/UNVERIFIED` and was not reopened. `S-04`, `Q-02`, `S-05`, `S-06`,
  `N-03`, `B-03`, and later packets remain governed by their recorded task
  states and have not been started by this signal.

### Required next action

Remain on `HOLD` until a fresh Instructor authorization explicitly defines a
bounded recovery attempt, after rechecking the current checkpoint, active task
topology, and exact M-03 write scope. No Manager, worker, downstream packet,
or source change is authorized by INS-044.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
