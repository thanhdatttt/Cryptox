# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-049`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-049 — Complete the existing M-03 recovery packet

This replaceable signal supersedes `INS-048 / HOLD` and authorizes exactly one
bounded continuation/recovery of the existing `M-03` packet. The previous
worker ended before implementation began and produced no source change; this
is a fresh execution of the unfinished packet, not a resume of that worker.
No other packet is authorized.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `daf320e7bc895cb0038824ac290d3419173a4832`, the committed
  `INS-048 / HOLD` governance checkpoint; the working tree is clean.
- N-03 source and Manager checkpoint commit:
  `d4161ec458c869ff18fa89dd9732df260629c915`. N-03 remains `REVIEW`, not
  `DONE`. `M-03` remains `IN_PROGRESS` after its interrupted worker, and
  `M-02` remains `REVIEW/UNVERIFIED`.
- The latest control checkpoint records N-03 as `REVIEW` with root evidence
  `310 passed / 6 skipped`; the six environment-gated skips are explicitly
  non-PASS. No source, business-state, contract, migration, dependency, or
  runtime drift was found.
- M-03 start dependencies are `C-02=DONE`, `M-01=DONE`, and the `F-01`
  normalized-chart input. `M-02` remains `REVIEW/UNVERIFIED` and must not be
  moved or retried.
- No Cryptox Manager or worker is active. The prior M-03 Manager/worker are
  historical/inactive; do not reuse their task context, resume their worker,
  or create a duplicate.

### Authorized packet: `M-03`

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-RP-02`,
  `CSL-R-FE-01`, and `CSL-R-OB-01`.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout, no worktree, with model `gpt-5.6-luna` and
  `xhigh` reasoning. It must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` fully and recover authority
  from the repository before dispatch.
- **Fresh worker:** delegate exactly one new Market Data worker through the
  Manager's approved subagent mechanism. Do not resume, replace, retry, or
  duplicate Anscombe; do not create a second worker, Manager, or downstream
  task. Keep the existing M-03 state `IN_PROGRESS` until review; do not reset
  it to `BLOCKED`/`READY` to disguise the interruption.
- **Worker write scope:** `modules/market-data/api/**` excluding
  `contracts.ts` and `contracts.spec.ts`, plus
  `modules/market-data/application/**`,
  `modules/market-data/infrastructure/**`, and focused Market Data tests.
  `packages/contracts/**`, frontend, and every other module are forbidden.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for M-03 identity, state, review,
  validation, limitations, and checkpoint. Preserve all unrelated states and
  N-03 evidence.

### M-03 acceptance criteria

- For one pair/timeframe, same-timestamp candles update the current candle and
  later timestamps append; duplicate/out-of-order input does not create
  duplicate closed candles. Reconnect/gap recovery is bounded and deterministic
  and does not fabricate final candles.
- Expose provider event time, received time, last latency, connection state,
  explicit ephemeral state, and no more than the latest 100 normalized ticks
  per pair in memory. The ring is empty after restart, is never persisted, and
  never becomes Backtest/replay input.
- Prove provider failure isolation, bounded reconnect/shutdown/resource cleanup,
  and independent state for up to four chart subscriptions at the Market Data
  boundary. Raw provider objects must not cross the boundary.
- Fixtures/fakes may prove deterministic behavior, but real Binance readiness
  must be reported separately; fixture-only evidence is not final provider PASS.

### Carried N-03 evidence

- News focused tests: `30/30 PASS`.
- Sentiment focused tests: `19/19 PASS`.
- Root workspace run: `310 passed / 6 skipped`, exit success. The six skipped
  tests are environment-gated PostgreSQL, integration, or E2E checks and are
  not treated as PASS.
- Root typecheck, build, lint, architecture, artifacts, deferred-scope, and
  `git diff --check`: `PASS`.
- PostgreSQL migration/runtime validation: `BLOCKED`; this host has Docker but
  no working `docker compose` command.
- Real configured News smoke, browser/runtime smoke, OpenSpec CLI, and link/DAG
  automation: `UNVERIFIED` or `BLOCKED`.
- Auto-refresh is `PARTIAL / UNVERIFIED`: the 1–5 minute configuration and
  five-minute default are present, but a scheduler was not implemented in
  N-03. The frozen canonical public News contract still exposes only its
  existing public barrel, so import/template exposure requires explicit
  contract-boundary reconciliation rather than silent scope expansion.

### Required validation and stop condition

- Run focused Market Data, market-WebSocket, reconnect/gap, restart-loss,
  shutdown, observability, and four-subscription tests, plus applicable package
  and root tests.
- Run `npm run arch:check`, `npm run artifacts:check`, `npm run scope:check`,
  `npm run typecheck`, `npm run build`, `npm run lint`, and `git diff --check`.
  Real Binance, PostgreSQL, browser/runtime, OpenSpec, and link/DAG checks that
  are unavailable are `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Review exact changed paths, no contract/frontend/migration/event-bus drift,
  ephemeral-versus-historical separation, restart/gap behavior, test counts,
  and honest provider status. Mark M-03 `REVIEW` or `BLOCKED` if evidence is
  incomplete; do not claim `DONE` from fixture-only evidence where the final
  provider gate is unavailable.
- Commit the coherent Manager checkpoint and stop immediately. Do not start or
  promote `S-04`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`, `F-03`, `I-03`, `M-02`,
  `AU-02`, `I-01`, `I-02`, or any deferred scope.

### Deferred and prohibited feature scope

`S-04`, `Q-02`, `B-03`, `E-02`, `L-02`, `F-03`, `I-03`, `M-02`,
`AU-02`, `I-01`, `I-02`, and all deferred enterprise identity, queue/distributed,
risk, autonomous-LLM, strict-replay, cloud-database, secrets, or unrelated
scope remain unauthorized. No worker may infer authorization from `READY`.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
