# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-004`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `c98a102aa8bdd161f2ce9b885590fedf27658b8f`
- Working tree at review: clean.
- Human direction: the `INS-003` HOLD is accepted and governance-only
  reconciliation of its four recorded inconsistencies is authorized.
- Preserved completed implementation: `9ca2d7c` (C-01A), `a20a7c5` (E-01), and
  `901065a` (F-01), checkpointed by `2858388`.

The governance-only commit that persists this instruction may follow the reviewed
HEAD only when its complete diff is limited to `docs/control/INSTRUCTOR.md`. Any
other intervening change makes this instruction stale and requires a new Instructor
review before reconciliation begins.

## Execution authorization

Authorized packet: `GOV-R1` — INS-003 Control-Plane Reconciliation.

This is a single governance-only Orchestrator/Manager packet. It is not a feature
task, creates no new product scope, changes no task dependency, and authorizes no
implementation worker.

Exact allowed files, and no others:

1. `AGENTS.md`
2. `docs/implementation/TASKS.md`
3. `docs/implementation/MVP_PLAN.md`
4. `docs/implementation/HANDOFF.md`

## Exact reconciliation scope

### `AGENTS.md`

- Replace only the obsolete paragraph claiming that the deferred-scope checker
  still has the pre-A-00 Auth prohibition and that C-01A must update it.
- State the verified current fact: C-01A is complete; the checker now permits the
  approved simple Auth V1 contracts while continuing to reject deferred enterprise
  identity, queue/distributed, risk, and strict-replay scope.
- Do not change role ownership, authority order, architecture, requirements, or
  validation policy.

### `docs/implementation/TASKS.md`

- Replace the stale final `State derivation at this checkpoint` with the strict
  current derivation already supported by its table, task records, and HANDOFF:
  P-00/C-01/A-00/C-01A/E-01/F-01 are DONE; D-01/S-01/AU-01/F-AUTH are READY; all
  other unfinished tasks remain BLOCKED by recorded start dependencies.
- Update only stale authorization annotations on those READY records so they say
  that `INS-004` authorizes governance reconciliation only and does not authorize
  feature execution.
- Do not transition any task, assign an owner, change a dependency, alter a write
  scope, or claim new task validation.

### `docs/implementation/MVP_PLAN.md`

- Clarify that packet state/owner values are approval-time planning metadata and
  never operational state.
- Mechanically rename every `Requirements/state/owner` packet label to an
  unambiguous form such as `Requirements / baseline state / planned owner`, and
  update the introductory explanation accordingly.
- Preserve every recorded baseline value, task packet, dependency, wave, objective,
  allowed/forbidden scope, acceptance criterion, and approved decision unchanged.
  `TASKS.md` remains the sole current state/owner authority.

### `docs/implementation/HANDOFF.md`

- Preserve all validated INS-002 implementation results and source commit evidence.
- Correct `79 workspace tests` to the reproduced `84 workspace tests`.
- Record that `INS-004` executed governance reconciliation only, list the four
  changed governance files, state that no task state or feature source changed, and
  require renewed Instructor review before any READY feature task starts.
- Keep C-01A/E-01/F-01 DONE and D-01/S-01/AU-01/F-AUTH READY but unauthorized for
  feature execution.

## Explicitly forbidden

- D-01, S-01, AU-01, F-AUTH, or any other feature task.
- Feature/runtime/frontend source, executable contracts, migrations, infrastructure,
  dependencies, scripts, tests, OpenSpec artifacts, requirements, ADRs,
  architecture, data model, or `docs/control/DECISIONS.md`.
- Any task state transition, task assignment, dependency/DAG change, packet-scope
  change, new durable decision, or reinterpretation of validated INS-002 evidence.
- Starting workers or using this instruction to begin a newly READY task.

## Required validation and checkpoint

Before committing GOV-R1, the Orchestrator/Manager must prove:

1. The diff from the post-INS-004 starting commit contains only the four allowed
   files and only the bounded edits above.
2. TASKS current-frontier rows, task records, final derivation, HANDOFF, and strict
   start-dependency recomputation all agree exactly.
3. No operational/current-state text still claims C-01A/E-01/F-01 are READY or
   D-01/S-01 are blocked by C-01A; historical packet values may remain only under
   the explicit baseline-state label. No text claims the checker retains the
   pre-A-00 Auth prohibition or the latest checkpoint ran only 79 workspace tests.
4. Every MVP_PLAN packet uses the clarified baseline-state/planned-owner label and
   no packet value, dependency, wave, scope, or acceptance text changed.
5. Documentation links resolve; `git diff --check` passes; strict OpenSpec
   validation remains PASS; `npm run verify:stage4a` and root lint pass with 84
   workspace tests; unavailable evidence is reported honestly.
6. The reconciliation is one coherent local commit and the final working tree is
   clean.

The resulting HANDOFF must identify the INS-004 starting checkpoint, the
reconciliation checkpoint as the commit containing that HANDOFF (resolved with
`git rev-parse HEAD` after checkout), changed paths, validations, unchanged
implementation commits, and the need for a new Instructor Instruction ID.
Authorization expires immediately after the GOV-R1 checkpoint is committed.

Approved feature frontier: none.

Pending human decisions: none.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: `APPROVED_FOR_EXECUTION` applies only to GOV-R1 control-plane reconciliation.
It is not feature execution authorization.
