# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-024`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: documentation-only reconciliation planning

Reason: `The approved DEC-007 functional re-baseline must be translated into a durable implementation-plan and task-DAG reconciliation before any extension implementation can be considered.`

This authorization permits exactly one Manager-owned governance packet, `RB-01 —
DEC-007 Documentation Reconciliation Planning`. It is not a feature
implementation authorization and is exhausted when that packet's documentation
checkpoint is committed.

## Reviewed repository checkpoint and applicability

- Reviewed branch and HEAD: `MVP_IMPLEMENTATION` /
  `496d5a34b76841b9f5b142fa512225f502f5fa26`
  (`docs: rebaseline academic functional extensions`).
- Review observation: working tree was clean and the branch was ahead of
  `origin/MVP_IMPLEMENTATION` by 63 local commits. `git diff` from the reviewed
  re-baseline commit to the reviewed HEAD was empty; therefore no source or
  business-state drift occurred after that re-baseline.
- The authority chain is internally consistent for the new functional scope:
  `docs/requirements.md`, `DEC-007`, ADR-001/002/004/006/007 as amended,
  ADR-009, architecture, data model, active `mvp-implementation`, and affected
  capability specs all carry the approved profiles.
- A documentation reconciliation is required because `MVP_PLAN.md` still records
  legacy V1 decisions/deferred items, `TASKS.md` lacks DEC-007 extension packets,
  and `HANDOFF.md` is an old INS-021 checkpoint. This is an expected
  control-plane gap, not authority to repair source or revise historical task
  evidence.
- Before acting, the Manager MUST verify the exact reviewed checkpoint, a clean
  working tree, and that the only later commit is this Instructor signal changing
  `docs/control/INSTRUCTOR.md`. Any source, business-state, task-DAG, or other
  material drift beyond that governance-only signal requires
  `NEEDS_INSTRUCTOR_REVIEW` and no work.

## Exact Manager scope

The Manager performs `RB-01` directly; this governance work does not require
delegation. It may edit only:

- `docs/implementation/MVP_PLAN.md`;
- `docs/implementation/TASKS.md`; and
- `docs/implementation/HANDOFF.md`.

`RB-01` MUST be added as a new unique reconciliation/planning packet and may
follow its normal Manager-owned documentation lifecycle. The Manager must create
new, unique **future feature implementation** packets that trace every approved
extension requirement, while leaving every such future implementation packet
`BLOCKED` when this authorization ends. No new feature packet may be marked
`READY`, `IN_PROGRESS`, `REVIEW`, or `DONE` by this authorization.

The planning packet MUST:

1. map the amended `CSL-R-MD-02` plus `CSL-R-MD-03`, `CSL-R-ST-05` through
   `CSL-R-ST-07`, `CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-NW-02`, and
   `CSL-R-RP-02` to new extension/reconciliation packets with requirement IDs,
   bounded write scopes, acceptance criteria, validation, and explicit order;
2. define a new earliest contract/data-model/migration reconciliation gate that
   all extension feature fan-out depends upon, without changing contracts,
   migrations, or data-model authority in this phase;
3. record the dependency DAG from that gate through Market Data, Strategy,
   Search, Backtesting, News/Sentiment, Evaluation/Leaderboard, Frontend, and
   final integration/reproducibility proof, including shared-boundary joins;
4. preserve every existing `DONE` packet and its source/validation evidence as
   historical baseline evidence only. It may add explicit links and limitation
   notes but MUST NOT rewrite historical claims or treat old completion as proof
   of any DEC-007 requirement;
5. leave `M-02` at its current `REVIEW/UNVERIFIED` evidence state, `AU-02` and
   `I-01`/`I-02` blocked, and never retry/rework an existing packet; and
6. replace `HANDOFF.md` with a current `INS-024` checkpoint naming the reviewed
   re-baseline commit, `RB-01`, all newly allocated task IDs, the blocked
   extension frontier, validation actually run, unresolved existing evidence,
   and every `UNVERIFIED` item.

## Explicit prohibitions

- Do not create an Orchestrator child, worker, subagent, worktree, assignment, or
  retry.
- Do not edit application source, executable contracts, migrations, frontend
  implementation, runtime configuration, dependencies, generated artifacts, or
  any non-`docs/implementation/` path.
- Do not edit `docs/requirements.md`, `docs/control/DECISIONS.md`, ADRs,
  architecture, data model, OpenSpec change/specifications, or this Instructor
  signal.
- Do not change an existing task's state, owner, completed history, source commit,
  validation claim, or implementation scope except to add a truthful
  reconciliation dependency/reference required to preserve baseline evidence.
- Do not mark any DEC-007 feature implementation packet READY or create a worker
  merely because a documentation dependency has been recorded.
- Do not retry AU-02 or M-02, start I-01/I-02, or infer a general implementation
  frontier from this signal.

## Required validation and stop condition

The Manager must validate the final documentation checkpoint with at least:

- Git reviewed-checkpoint/applicability proof and changed-path proof;
- complete requirement-to-packet traceability for the DEC-007 extensions;
- DAG/dependency and state consistency between `MVP_PLAN.md`, `TASKS.md`, and
  `HANDOFF.md`;
- `git diff --check`; and
- truthful status for unavailable validation. Formal OpenSpec CLI validation is
  currently `UNVERIFIED` unless the Manager can actually run it successfully.

After committing the coherent `RB-01` planning checkpoint, the Manager stops.
This authorization is then exhausted. No task may be assigned or started until an
Instructor independently reviews that checkpoint and issues a separate explicit
signal; the expected post-review state is `HOLD` until a later bounded first
implementation packet is approved.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Accepted ADRs](../adr/)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)

Notes: `INS-024` authorizes Manager-owned documentation reconciliation planning
only. It replaces the prior `INS-023 / HOLD` for this single bounded phase and
does not authorize feature implementation.
