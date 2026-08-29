# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-025`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Safety hold after `RB-01` review

Reason: `RB-01 documentation reconciliation planning is not internally consistent: HANDOFF.md states a topological order that directly fans out C-02 to B-03, while the detailed MVP plan and task record require S-05 and S-06 before B-03. The checkpoint therefore cannot safely support an implementation authorization.`

`INS-024` is exhausted. Its sole Manager-owned packet, `RB-01`, was committed at `acc7441040c4e16421880c54e7c57463b1974b66`. No implementation, worker, subagent, Orchestrator, or worktree is authorized by this signal.

## Review result: `NEEDS_HUMAN_DECISION`

### Verified checkpoint facts

- Branch/HEAD reviewed: `MVP_IMPLEMENTATION` / `acc7441040c4e16421880c54e7c57463b1974b66`; the working tree was clean.
- The `RB-01` commit changes only the three paths authorized by `INS-024`: `docs/implementation/MVP_PLAN.md`, `docs/implementation/TASKS.md`, and `docs/implementation/HANDOFF.md`. `git diff --check` and `git show --check` for that commit passed.
- From the reviewed re-baseline `496d5a34b76841b9f5b142fa512225f502f5fa26` through this checkpoint, no requirements, decision-ledger, ADR, architecture, data-model, active OpenSpec, source, executable-contract, migration, or runtime-configuration path changed. The only intervening control-plane changes are `INS-024` and the permitted `RB-01` implementation-document updates.
- DEC-007 requirement traceability and the preservation of historical `DONE` evidence are otherwise present. All newly allocated feature packets remain `BLOCKED`; `M-02` remains `REVIEW/UNVERIFIED`, and `AU-02`, `I-01`, and `I-02` remain blocked.

### Material inconsistency

- `docs/implementation/HANDOFF.md` labels its graph as the planned topological order and places `B-03` in the direct `C-02` fan-out. It also claims cross-document DAG/state consistency is `PASS`.
- `docs/implementation/MVP_PLAN.md` and `docs/implementation/TASKS.md` instead require `S-05` and `S-06` before `B-03`; they also express the safe URL content join as `N-03` before the corresponding `S-04` path. Thus the checkpoint does not state one unambiguous executable dependency order.

This signal does not repair that inconsistency. The Instructor review scope forbids changing `MVP_PLAN.md`, `TASKS.md`, or `HANDOFF.md`; a future, separately approved documentation-only correction must reconcile them before any implementation gate can be considered.

## Current extension frontier

`C-02` is the sole earliest *possible* extension gate. It remains `BLOCKED` and is not authorized. `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`, `F-03`, and `I-03` remain `BLOCKED`; no historical `DONE` packet is evidence that any DEC-007 extension is implemented.

## Conditions for any future bounded `C-02` authorization

Before an Instructor can issue a new, bounded `C-02` signal, all of the following must be true:

1. A documentation-only reconciliation has corrected the `HANDOFF.md` graph and its consistency claim so it matches the detailed `MVP_PLAN.md` and `TASKS.md` dependencies, including `S-05`/`S-06` before `B-03` and the `N-03`/`S-04` content join.
2. The corrected planning checkpoint is independently reviewed, has complete DEC-007 traceability, preserves historical evidence, and leaves every feature packet `BLOCKED` until separately authorized.
3. Git is clean and there is no unreviewed source, business-state, authority, or task-DAG drift after the reviewed correction checkpoint.
4. A new Instructor signal explicitly authorizes only `C-02`, states its exact contract/data-model/migration reconciliation scope, acceptance criteria, validation, and stop condition. It must not imply downstream feature authorization or worker fan-out.

Until those conditions are met, do not create or dispatch a Manager, Orchestrator, worker, subagent, or worktree, and do not implement any feature.

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
