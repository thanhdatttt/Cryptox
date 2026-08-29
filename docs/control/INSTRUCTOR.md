# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-040`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-040 — HOLD after ENV-02 independent review

This replaceable signal supersedes `INS-039 / APPROVED_FOR_EXECUTION`. The
authorized ENV-02 implementation is accepted at the evidence boundary, but
operational task promotion and any next packet require a fresh authorization.
No implementation packet is authorized by this HOLD.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- HEAD: `2751fbe3e554351c4629b230b4951c4121702416`
  (`checkpoint(ins-039): record ENV-02 handoff`).
- Working tree: clean; `git diff --check` passes.
- The post-INS-036 range contains only the Instructor governance update for
  `ENV-02`, the Manager-owned ENV-02 checkpoint, and the two authorized checker
  files. No module, package, app, infrastructure, migration, dependency,
  runtime, frontend, contract, or unrelated source path changed.
- The fresh INS-039 Manager
  (`01a04ea7-b1bd-73c2-972a-7d67e6f551c9`) is idle after its checkpoint; its
  one worker (`01a04eae-367c-7fc3-8961-dccb9e760cf9`, Confucius) is closed.
  No other active Cryptox Manager, Orchestrator, or worker is running. No
  historical Manager or worktree was reused or removed.

### Independent review evidence

- `ENV-02` changed exactly `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs`; Manager-owned control changes are
  limited to `docs/implementation/TASKS.md` and `HANDOFF.md`.
- The checker retains its canonical owner and generic deferred-scope rejection.
  `WEIGHTED_VOTE_V1` is allowed only at its existing canonical boundaries plus
  `modules/strategy/application/composite/` and
  `modules/strategy/domain/composite/`. `SMC_LITE_V1` and `WYCKOFF_LITE_V1`
  are allowed only in their exact approved plugin directories.
- Exact directory matching and exact-file matching reject near-match paths;
  focused tests cover canonical positives, all four implementation positives,
  unrelated-path negatives, market observability, synthetic-paper risk, and
  every deferred family.
- Independent `npm run test:scope-check`: `7/7 PASS`.
- Independent `npm run scope:check`: `PASS` with no deferred enterprise-Auth,
  queue/distributed, risk, autonomous-LLM, or strict-replay leakage.
- Independent `npm run arch:check`: `PASS` (75 modules, 197 dependencies;
  expected forbidden fixtures detected).
- Independent `npm run artifacts:check`: `PASS`.
- Independent `npm run typecheck`, `npm run build`, and `npm run lint`: `PASS`.
- Independent `npm test`: executed tests passed, but 6 environment-gated
  PostgreSQL/integration/E2E tests were skipped; classify the full gate as
  `UNVERIFIED`, not PASS.
- OpenSpec CLI status/apply and dedicated link/DAG automation remain
  `UNVERIFIED` because the executables/checker are unavailable. PostgreSQL,
  live-provider, migration, browser, and runtime-smoke checks are not
  applicable to this pure checker-boundary packet and are not claimed PASS.

### Operational state

- `TASKS.md` remains authoritative and Manager-owned:
  `ENV-02 = REVIEW`, `S-05 = REVIEW`, `S-06 = REVIEW`.
- `ENV-01 = DONE` and `C-02 = DONE`; all other downstream extension packets
  retain their recorded states. No downstream packet was started or promoted.
- The accepted checker gate now supplies the missing closure evidence for
  S-05/S-06, but no agent may silently transition their task rows. A new
  Manager authorization must explicitly perform the review-state promotion.

### Next decision boundary

The next authorization may permit only a Manager-owned closure review of the
already implemented `ENV-02`, `S-05`, and `S-06` evidence. It must not modify
source, start downstream work, or treat the passing checker as automatic
authorization. After that closure, the Instructor will review the new
checkpoint before selecting the next E1 implementation frontier.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
