# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-042`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-042 — HOLD after ENV-02/S-05/S-06 closure

This replaceable signal supersedes `INS-041 / APPROVED_FOR_EXECUTION`. The
authorized closure review completed successfully; this HOLD records the
independent Instructor checkpoint before selecting the next implementation
packet. No implementation packet is authorized by this signal.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- HEAD: `07eb6cd269de1eb4e1df5fcc9c68d4a1384f85ea`
  (`checkpoint(ins-041): close strategy extension packets`).
- Working tree: clean; `git diff --check` passes.
- The INS-041 range changed only Manager-owned `TASKS.md` and `HANDOFF.md`;
  no source, product behavior, dependency, migration, or runtime path drifted.
- The fresh INS-041 closure Manager
  (`01a04ecb-9ec8-76f1-a30d-fabe7b3480cf`) is idle after completion. No worker
  was created for the state-only closure. The prior ENV-02 worker is closed and
  the prior S-05/S-06 workers are idle. No active Cryptox Manager, Orchestrator,
  or worker is running; no historical Manager or worktree was reused or
  removed.

### Independent closure evidence

- The Manager reverified immutable source hashes for all S-05/S-06 files against
  the INS-036 checkpoint and confirmed the ENV-02 implementation checkpoint
  contains only its two checker files plus operational records.
- `ENV-02`, `S-05`, and `S-06` were the only rows transitioned, each exactly
  `REVIEW -> DONE`. `ENV-01` and `C-02` stayed `DONE`; all downstream rows kept
  their prior states.
- Revalidated `npm run test:scope-check` (`7/7 PASS`),
  `npm run scope:check` (`PASS`), `npm run arch:check` (`PASS`),
  `npm run artifacts:check` (`PASS`), `npm run typecheck` (`PASS`),
  `npm run build` (`PASS`), `npm run lint` (`PASS`), and
  `git diff --check` (`PASS`).
- Revalidated root `npm test`: 291 executed tests passed, with 6
  environment-gated PostgreSQL/integration/E2E tests skipped; classify the
  overall gate as `UNVERIFIED`, not PASS.
- OpenSpec CLI and dedicated link/DAG automation remain `UNVERIFIED` because
  they are unavailable. Windows process-command attribution was also
  `UNVERIFIED` due OS permission denial; Codex task topology plus Git evidence
  established the active-task check.

### Operational state

- `TASKS.md` is authoritative and now records `ENV-02 = DONE`, `S-05 = DONE`,
  and `S-06 = DONE` with their original worker/checkpoint provenance.
- The next E1 candidates are `M-03`, `S-04`, `Q-02`, `N-03`, and `B-03`, all
  still `BLOCKED` pending a separate Instructor signal. `M-02` remains
  `REVIEW/UNVERIFIED`; `AU-02`, `I-01`, `I-02`, and all deferred scope remain
  blocked as recorded.
- No downstream work was started or unlocked automatically by this closure.

### Next decision boundary

The next authorization may select exactly one safe E1 implementation packet
whose dependencies, write scope, and acceptance evidence are reverified from
`MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, requirements, ADRs, architecture/data
model, active specs, source, and tests. A fresh Manager and authorized worker(s)
will be required for implementation. This HOLD itself authorizes nothing.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
