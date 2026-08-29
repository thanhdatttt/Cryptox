# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-039`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-039 — Reconcile approved E1 checker boundaries (`ENV-02`)

This replaceable signal supersedes `INS-038 / NEEDS_HUMAN_DECISION` and
authorizes exactly one new post-extension tooling packet. The prior `ENV-01`
packet remains complete and is not reopened. The durable rationale and exact
boundary policy are recorded in `DEC-010`.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- Authorization base HEAD before this governance update:
  `ea1b50338cafb90afa3a8e08671ea3633ebeaf14`.
- Reviewed source/business checkpoint: `3aa0db528d7758788067348f70b5ea02d68bdb45`
  (`checkpoint(ins-036): review strategy extensions`). The current authorization
  commit contains only this Instructor signal, `DEC-010`, and the `MVP_PLAN`
  packet; the Manager must prove that governance-only delta is non-material
  before execution.
- The reviewed source checkpoint contains only the Manager-owned `TASKS.md` and
  `HANDOFF.md`, plus the 12 INS-036 S-05/S-06 implementation, focused-test, and
  limitation-README paths. No canonical contract, shared registry, app,
  migration, dependency, generated artifact, or downstream-module path changed.
- Working tree was clean and `git diff --check` passed at review.
- The INS-036 Manager
  (`01a04db6-6c00-7841-a5f2-443c8f05dad7`) and its only two workers
  (`01a04e66-d981-7e42-b75d-1bb3b7340c73` for S-05 and
  `01a04e66-e691-7a50-af2f-b1eecd39053b` for S-06) are idle. No other active
  Cryptox Manager, Orchestrator, or worker was found; historical threads and
  worktrees were not reused or removed.

### Independent evidence carried into this authorization

- S-05 `WEIGHTED_VOTE_V1`: focused tests `17/17 PASS`; Strategy workspace
  `89/89 PASS`.
- S-06 `SMC_LITE_V1`/`WYCKOFF_LITE_V1`: focused tests `20/20 PASS`; Strategy
  workspace `89/89 PASS`.
- Root `npm test`: all 291 executed tests passed; 6 environment-gated
  PostgreSQL/integration/E2E tests were skipped, so the full gate is
  `UNVERIFIED`, not PASS.
- Root `build`, `typecheck`, `lint`, `arch:check`, `artifacts:check`, and
  `test:scope-check` (`5/5`) are `PASS`.
- Root `scope:check` is `BLOCKED` (exit 1) on exactly:
  `modules/strategy/application/composite/weighted-vote.ts`,
  `modules/strategy/domain/composite/weighted-vote.ts`,
  `modules/strategy/domain/plugins/smc-lite/index.ts`, and
  `modules/strategy/domain/plugins/wyckoff-lite/index.ts`. The checker
  currently allowlists these profile identifiers only in canonical contract,
  port, REST, or migration boundaries, while the approved S-05/S-06 task
  scopes are extension-owned implementation boundaries.
- OpenSpec CLI and dedicated link/DAG automation remain `UNVERIFIED` because
  the executables/checker are unavailable. No unavailable check is claimed as
  PASS.

### Task state and reconciliation

- `TASKS.md` remains authoritative and unchanged by the Instructor:
  `S-05 = REVIEW`, `S-06 = REVIEW`; neither is `DONE` because the required
  root deferred-scope gate is blocked. `C-02 = DONE`, `S-01 = DONE`, and all
  downstream packets remain in their recorded states.
### Authorized packet: `ENV-02`

- **Only packet:** `ENV-02 — Post-Extension Approved-Profile Checker Boundary
  Reconciliation`.
- **Requirements/authority:** `CSL-R-RP-02`, DEC-007, DEC-010, ADR-010, and
  the approved S-05/S-06 packet records in `MVP_PLAN.md`.
- **Manager pre-dispatch control-plane action:** Reconcile a new `ENV-02` row
  in `TASKS.md` from the plan, initially `BLOCKED`, verify
  `ENV-01 = DONE`, `C-02 = DONE`, `S-05 = REVIEW`, `S-06 = REVIEW`, and then
  move only `ENV-02` through `BLOCKED -> READY`. No worker may be created
  before the persisted row is `READY` and the signal/checkpoint comparison
  passes.
- **Exact worker write scope:** `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs` only. The worker must not edit
  `TASKS.md`, `HANDOFF.md`, any module/package/app/migration file, or any
  other governance artifact.
- **Exact Manager-owned control scope:** the Manager alone may update the
  `ENV-02` row and `HANDOFF.md`, review/integrate the worker's scoped changes,
  and commit the execution checkpoint. No other source or plan changes are
  authorized.
- **Acceptance:** Add exact allowlist entries for
  `modules/strategy/application/composite/`,
  `modules/strategy/domain/composite/`,
  `modules/strategy/domain/plugins/smc-lite/`, and
  `modules/strategy/domain/plugins/wyckoff-lite/` for their corresponding
  approved identifiers, while preserving existing canonical boundaries and
  generic deferred-scope rejection. Focused tests must prove both allowed and
  rejected paths. No broad exclusions or checker bypasses.
- **Validation:** `npm run test:scope-check` and `npm run scope:check` must
  pass; run applicable architecture/artifact/deferred-scope, typecheck,
  build/lint, and `git diff --check` gates. Report OpenSpec CLI or unavailable
  environments as `UNVERIFIED`/`BLOCKED`, never PASS.
- **Dependencies:** The reviewed checkpoint, `ENV-01`, `C-02`, and existing
  S-05/S-06 evidence must remain applicable. If source/business state, task DAG,
  or material premises drift, stop with `NEEDS_INSTRUCTOR_REVIEW`.
- **Prohibitions:** Do not mark S-05/S-06 `DONE`; do not start M-03, S-04,
  Q-02, N-03, B-03, E-02, L-02, F-03, I-03, M-02, AU-02, I-01, I-02, or any
  deferred packet; do not reopen ENV-01; do not install software, use cloud
  databases, request secrets, reset Git, delete worktrees/history, or create a
  duplicate Manager/worker.
- **Stop condition:** Stop after `ENV-02` is reviewed, committed, and its
  checkpoint is recorded, with `S-05`/`S-06` still `REVIEW`. The Manager must
  not auto-start newly unlocked work. A fresh Instructor review is required
  before any later signal.

### Dispatch preconditions

- One fresh Manager only, same-directory canonical checkout, no worktree, using
  model `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md`
  and `docs/control/prompts/ORCHESTRATOR_START.md` fully before acting.
- Before dispatch, re-verify branch `MVP_IMPLEMENTATION`, the authorization
  commit's governance-only delta, clean status, current signal, checkpoint
  applicability, task states, and absence of active Cryptox Manager/worker
  tasks. This signal is stale if any of those checks fail.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
