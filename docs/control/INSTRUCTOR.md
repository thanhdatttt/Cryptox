# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-026`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: `RB-02 — RB-01 DAG Consistency Correction`

Reason: `The human decision accepts the detailed dependencies in MVP_PLAN.md and TASKS.md as canonical. The RB-01 HANDOFF.md summary must be corrected without changing product scope, task scope, source behavior, requirements, or task dependencies.`

This signal authorizes exactly one fresh Manager, directly in the canonical
`MVP_IMPLEMENTATION` checkout. It authorizes no worker, subagent, child
Orchestrator, worktree, source implementation, or implementation packet. The
Manager stops immediately after committing `RB-02`.

## Reviewed checkpoint and applicability

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `3b8deba7bc4736d3dc1b09e7d98d1a0faecf528a`
  (`docs(control): hold after RB-01 DAG review`).
- The working tree was clean at review. The only currently active Cryptox thread
  is this Instructor review; known Manager/worker threads are idle or not loaded.
- `INS-025 / HOLD` remains the current signal until this replacement signal is
  committed. The human decision is limited to resolving the documented DAG
  summary; it neither changes DEC-007 nor authorizes `C-02`.
- Before changing any file, the Manager MUST confirm the current signal is
  `INS-026`, the reviewed HEAD is unchanged apart from this governance signal,
  the tree is clean, and no other Cryptox Manager or worker is active. If any
  check fails, make no change and report `NEEDS_INSTRUCTOR_REVIEW`.

## Approved canonical extension DAG

```text
C-02
 ├─→ M-03, S-05, S-06, Q-02, N-03
 ├─→ S-04 for its prompt-only path; N-03 gates S-04 URL-origin completion
 └─→ B-03 only after both S-05 and S-06
       → E-02
Q-02 + B-03 + E-02 → L-02
M-03 + S-04 + S-05 + S-06 + Q-02 + B-03 + N-03 + E-02 + L-02 → F-03
F-03 + baseline I-01 + AU-02 → I-03 → I-02
```

The detailed dependencies already in `MVP_PLAN.md` and `TASKS.md` are
canonical. `C-02` and every extension implementation packet remain
`BLOCKED`; no historical `DONE` evidence expands to cover DEC-007.

## Exact Manager scope

The Manager may directly edit only:

- `docs/implementation/HANDOFF.md`.

A read-only comparison may establish that a minimal matching clarification in
`docs/implementation/MVP_PLAN.md` or `docs/implementation/TASKS.md` is
strictly necessary. Only if that evidence is recorded may the Manager make that
minimal wording-only clarification. It must not alter a dependency, task state,
task scope, owner, requirement, acceptance criterion, validation requirement,
or implementation ordering.

`RB-02` must:

1. replace the ambiguous direct `C-02 → B-03` fan-out in `HANDOFF.md` with
   the approved DAG;
2. distinguish the `S-04` prompt-only path from the `N-03`-gated URL-origin
   completion path;
3. correct the prior false `DAG/state consistency: PASS` claim with a truthful
   statement of the corrected comparison;
4. record the exact reviewed commit, changed paths, validation results, blockers,
   and that no implementation was started;
5. run changed-path, Markdown-link, DAG/state-consistency, and whitespace
   checks; and
6. commit the bounded correction, then stop.

## Explicit prohibitions

- Do not create a worker, subagent, child Orchestrator, extra Manager, or
  worktree.
- Do not edit source, executable contracts, migrations, runtime configuration,
  dependencies, frontend implementation, requirements, decisions, ADRs,
  architecture, data model, or OpenSpec artifacts.
- Do not alter any task dependency, state, scope, owner, requirement, or source
  behavior. Do not start, retry, or reclassify `C-02`, `M-02`, `AU-02`,
  `I-01`, `I-02`, or any extension implementation packet.
- Do not infer a general implementation authorization from this documentation
  correction.

## Stop condition

After the `RB-02` commit, this authorization is exhausted. A fresh Instructor
review is required and the system returns to `HOLD`; that later review must not
authorize `C-02` unless it is separately and explicitly approved.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
