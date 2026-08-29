# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-037`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-037 — Instructor review after INS-036

This is a replaceable review checkpoint. It supersedes `INS-036 /
APPROVED_FOR_EXECUTION` and authorizes no implementation packet.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- HEAD: `3aa0db528d7758788067348f70b5ea02d68bdb45`
  (`checkpoint(ins-036): review strategy extensions`).
- Working tree: clean; `git diff --check` passes.
- The commit contains only the Manager-owned `TASKS.md` and `HANDOFF.md`, plus
  the 12 INS-036 S-05/S-06 implementation, focused-test, and limitation-README
  paths. No canonical contract, shared registry, app, migration, dependency,
  generated artifact, or downstream-module path changed.
- The INS-036 Manager
  (`01a04db6-6c00-7841-a5f2-443c8f05dad7`) and its only two workers
  (`01a04e66-d981-7e42-b75d-1bb3b7340c73` for S-05 and
  `01a04e66-e691-7a50-af2f-b1eecd39053b` for S-06) are idle. No other active
  Cryptox Manager, Orchestrator, or worker was found; historical threads and
  worktrees were not reused or removed.

### Independent evidence

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

### Task state and blocker

- `TASKS.md` remains authoritative and unchanged by the Instructor:
  `S-05 = REVIEW`, `S-06 = REVIEW`; neither is `DONE` because the required
  root deferred-scope gate is blocked. `C-02 = DONE`, `S-01 = DONE`, and all
  downstream packets remain in their recorded states.
- This is a control-plane/tooling reconciliation issue, not permission to
  bypass the checker. The accepted `ENV-01` packet is already `DONE`, and the
  current task board has no separate `READY` packet authorizing a follow-up
  edit to `scripts/check-deferred-scope.cjs` and its focused tests. Reopening
  ENV-01, adding a task, or changing checker allowlists requires an explicit
  reconciled plan/DAG decision before execution.

### HOLD boundary

- No Manager or worker may be created under this signal.
- Do not mark S-05/S-06 `DONE`, start M-03, S-04, Q-02, N-03, B-03, E-02,
  L-02, F-03, I-03, M-02, AU-02, I-01, I-02, or any deferred packet.
- Before any next authorization, reconcile the checker follow-up as an
  explicit executable packet or obtain the required human decision, then
  re-verify branch/HEAD, clean Git, task DAG, checkpoint applicability, and
  absence of active Cryptox Manager/worker threads.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
