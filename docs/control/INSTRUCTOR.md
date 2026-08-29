# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-043`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-043 — Implement M-03 realtime market observability

This replaceable signal supersedes `INS-042 / HOLD` and authorizes exactly one
bounded E1 implementation packet: `M-03 — Amended Realtime Market Delivery and
MARKET_OBSERVABILITY_V1`. It does not authorize any other packet or any
contract/schema change.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Authorization base HEAD: `52ef6ceb37d821e294cb4a7d9e041fa085356a9f`
  (`docs(control): hold after strategy closure`).
- Working tree was clean; `TASKS.md` records `ENV-01`, `C-02`, `ENV-02`, `S-05`,
  and `S-06` as `DONE`.
- `M-03`, `S-04`, `Q-02`, `N-03`, `B-03`, `E-02`, `L-02`, `F-03`, and `I-03`
  remain `BLOCKED`; `M-02` remains `REVIEW/UNVERIFIED` and is not reopened.
- `C-02`, `M-01`, and the `F-01` normalized chart input are complete and are
  the verified M-03 start dependencies. No active Cryptox Manager, Orchestrator,
  or worker is running; historical Managers/worktrees are not to be reused or
  removed.

### Authorized packet: `M-03`

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-RP-02`,
  `CSL-R-FE-01`, and `CSL-R-OB-01`.
- **Manager pre-dispatch:** Add/reconcile the existing `M-03` task row from
  `MVP_PLAN.md` in `TASKS.md` if needed, verify its dependencies and this
  signal, then move only `M-03` through `BLOCKED -> READY -> IN_PROGRESS`.
  Do not start a task merely because it is READY.
- **Fresh Manager:** Create exactly one new Manager in the canonical
  same-directory checkout, no worktree, with model `gpt-5.6-luna` and `max`
  reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` fully and recover authority from
  the repository before dispatch.
- **Exactly one worker:** Delegate exactly one Market Data worker with the
  independent write scope below. No second worker, retry, or duplicate Manager.
- **Worker write scope:** implementation and focused tests under
  `modules/market-data/api/**`, excluding `modules/market-data/api/contracts.ts`
  and its contract-only test. The worker may add/modify API delivery,
  observability, and API-focused tests within that boundary only.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for state, review, and checkpoint evidence.
  Workers must not edit either file or any other governance artifact.
- **Forbidden:** `modules/market-data/api/contracts.ts`,
  `modules/market-data/application/**`,
  `modules/market-data/infrastructure/**`,
  `packages/contracts/**`, `apps/**`, migrations, dependencies, runtime
  configuration, frontend, other modules, requirements, ADRs, OpenSpec,
  `MVP_PLAN.md`, `DECISIONS.md`, and `INSTRUCTOR.md`.

### M-03 acceptance criteria

- Re-prove same-timestamp candle updates and later-timestamp append behavior;
  duplicate/out-of-order provider input must not create duplicate closed
  candles.
- Re-prove bounded disconnect/reconnect and missing-candle reconciliation using
  the existing provider-neutral public boundaries. Connection state, provider
  event time, received time, and non-negative last latency must be delivered
  without raw provider payloads.
- Expose `MARKET_OBSERVABILITY_V1` as delivery-only state with an in-memory
  latest-100 normalized-tick ring buffer per pair. It must be explicitly
  `EPHEMERAL_IN_MEMORY_ONLY`, empty after restart, remain on the market-only
  WebSocket boundary, and never alter candle history, dataset snapshots,
  backtest, or replay input.
- Preserve independent pair/timeframe subscription state and shutdown behavior;
  do not turn WebSocket into a general event bus or add frontend business logic.
- Preserve truthful final/demo behavior: configured real Binance readiness must
  be reported honestly; fixtures/fakes are for deterministic tests only and do
  not pass final real-provider evidence.

### Required validation and stop condition

- Focused Market Data API/realtime and market-WebSocket contract tests, existing
  resilience/restart/gap tests, and relevant package/root tests must pass where
  applicable.
- Run `npm run arch:check`, `npm run artifacts:check`, `npm run scope:check`,
  `npm run typecheck`, `npm run build`, `npm run lint`, and `git diff --check`.
  Run real Binance smoke/readiness only if configured; unavailable provider,
  PostgreSQL, browser, OpenSpec, or link/DAG checks are `UNVERIFIED`/`BLOCKED`,
  never PASS.
- Manager must review changed-path/name-only, provider boundary, ephemeral
  isolation, test evidence, and no-scope-drift. Record exact worker/Manager
  IDs, transitions, commit, validation results, and unavailable checks.
- If source/business state, task DAG, checkpoint, or write-scope premise drifts,
  stop with `NEEDS_INSTRUCTOR_REVIEW`. If required M-03 evidence fails, leave
  M-03 at `REVIEW` or `BLOCKED` with the exact reason.
- Stop after M-03 is reviewed, committed, and checkpointed. Do not mark any
  downstream packet READY/DONE or start `S-04`, `Q-02`, `N-03`, `B-03`, `E-02`,
  `L-02`, `F-03`, `I-03`, `M-02`, `AU-02`, `I-01`, `I-02`, or deferred scope.
  A fresh Instructor review is required before the next authorization.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
