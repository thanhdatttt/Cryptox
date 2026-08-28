# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-001`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed source/business HEAD: `791a50031955a39756d41884bd1876d5840aab5e`
- Review basis: P-00, C-01, and A-00 are DONE; no feature worker is assigned and no
  implementation from the stalled Goal exists.

The governance-only commit that first persists this control record may follow the
reviewed HEAD. It is covered only when its complete intervening diff is proven to
contain no material source, business-state, task-DAG, or requirement change. Any
other material change makes this instruction stale and requires
`NEEDS_INSTRUCTOR_REVIEW`.

## Execution authorization

Approved execution frontier: none.

Candidate frontier for the next Instructor review:

- C-01A
- E-01
- F-01

Explicitly not authorized:

- C-01A, E-01, F-01, or any other implementation task during this bootstrap.
- D-01 and S-01, which remain BLOCKED by C-01A.

## Constraints

- Preserve `docs/implementation/TASKS.md` as the operational state authority.
- Do not assign writable feature workers or modify runtime source, frontend feature
  source, migrations, executable contracts, or instructor requirements under this
  instruction.
- A fresh Instructor must review the repository under the Level 2 protocol before
  replacing this HOLD with execution approval.

Pending decisions: none recorded; fresh Instructor frontier review is required.

## Canonical references

- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is a current control signal, not a task board or conversation transcript.
