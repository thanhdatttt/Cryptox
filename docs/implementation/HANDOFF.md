# INS-051 Execution Checkpoint — B-03 Synthetic Directional Paper Execution

## Resume here

- **Authorization:** `INS-051 / APPROVED_FOR_EXECUTION`; exactly one bounded
  implementation/review of `B-03` was authorized. No other packet was started,
  promoted, or retried.
- **Fresh Manager:** `01a04f9f-b8a9-7530-bb79-9f7fddbb7878`, operating in the
  canonical same-directory checkout `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`. Parent Instructor task:
  `01a04d93-13a4-7d91-b010-f2b800f696df`.
- **Fresh worker:** Pascal, `01a04fa2-b515-74d3-a448-0ab605dfabab`, the sole
  new Backtesting implementation worker. It used the canonical checkout,
  created no thread/worker, branch, worktree, or commit, and edited no control
  artifact.
- **Reviewed source/business base:** `9800a7d8d6ea377e956e7babbdb633732a03049a`.
  The current authorization signal is the non-material governance delta at
  `40163ab`; frozen Backtesting contracts and migrations were unchanged.
- **Starting checkpoint:** branch `MVP_IMPLEMENTATION`, HEAD `40163ab`, clean
  before the Manager task transition and worker changes.

## Applicability and preconditions

- `INS-051` is current and `APPROVED_FOR_EXECUTION`. B-03 was verified as the
  only authorized task; its start dependencies `C-02`, `B-01`, `B-02`, `M-01`,
  `S-01`, `S-05`, and `S-06` were all `DONE`.
- `M-03` and `N-03` remain `REVIEW`; `M-02` remains `REVIEW/UNVERIFIED`.
  None was changed, promoted, or used as a B-03 start dependency.
- Repository task records and active-task inspection showed no competing
  Cryptox Manager or worker before Pascal was dispatched. Historical tasks and
  workers were not resumed, replaced, retried, or duplicated.
- B-03 moved exactly `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`. The Manager
  owns the state transition and this checkpoint; the worker did not edit
  `TASKS.md` or `HANDOFF.md`.

## Worker implementation and Manager review

- **Requirements:** `CSL-R-BT-02`, `CSL-R-RP-02`, `CSL-R-BT-01`, and
  `CSL-R-OB-01`.
- **Worker scope:** `modules/backtesting/domain/**`,
  `modules/backtesting/application/**`, `modules/backtesting/infrastructure/**`,
  and focused Backtesting tests, excluding frozen API contracts and migrations.
- **Worker paths:**
  `modules/backtesting/domain/{simulator,simulator.spec}.ts`;
  `modules/backtesting/application/{service,service.spec}.ts`;
  `modules/backtesting/infrastructure/{postgres,postgres.spec}.ts`.
- **Manager paths:** `docs/implementation/TASKS.md` and this file only for
  state, ownership, review, evidence, limitations, and the stop boundary. The
  Manager made one narrow review fix in the worker-owned application/test paths:
  nested `paperExecution` is now passed under `SimulationInput.configuration`,
  with an application assertion proving a synthetic-short run reaches a
  directional trade.
- **Simulation:** Explicit Long and synthetic Short candle-only modes use
  next-candle-open signals with no lookahead, bounded OHLC Stop Loss/Take Profit,
  conservative single-exit `STOP_LOSS_WINS_V1` dual-trigger handling, and
  deterministic range-end closure. No exchange order, leverage, margin,
  funding, liquidation, live execution, or generalized risk was introduced.
- **Accounting/provenance:** Paper fills use fixed-point eight-place `HALF_UP`
  arithmetic, 0.08% fee per entry/exit fill, and adverse 5-bps slippage per
  fill. Trade direction and exit reason are inspectable. Approved
  `paper_execution_provenance` and `position_mode` persistence fields are
  round-tripped through the existing Candidate/Experiment/Trade adapters;
  migrations were not changed. Evaluation/Leaderboard result shapes remain
  stable.
- **Resilience/ownership:** Existing bounded local execution, owner-filtered
  Candidate/Experiment/Trade access, deterministic reruns, one terminal outcome,
  cancellation, failure containment, and no-partial-Experiment behavior remain
  covered by the focused application/infrastructure tests.

## Validation and evidence

- **Focused Backtesting:** PASS — 43 passed across 7 files.
- **Root workspace:** PASS — 327 passed / 6 skipped. The skips are existing
  environment-gated PostgreSQL/integration/E2E checks and are not PASS evidence.
- **Repository gates:** PASS — `npm run test:scope-check` (7/7),
  `npm run arch:check`, `npm run artifacts:check`, `npm run typecheck`,
  `npm run build`, `npm run lint`, and `git diff --check`.
- **Deferred-scope gate:** BLOCKED — `npm run scope:check` rejects the approved
  B-03 identifiers and directional paper vocabulary in their authorized
  Backtesting implementation directories. The checker is outside this packet's
  write scope and was not modified or bypassed.
- **PostgreSQL:** BLOCKED — `npm run db:local:validate` could not run because
  Docker Compose is unavailable on this host (`docker: unknown command: docker
  compose`). Fixture/query-adapter provenance evidence passes, but no real
  PostgreSQL runtime PASS is claimed.
- **Real Binance:** UNVERIFIED — no configured live Binance historical/realtime
  runtime was available on this host. Fixture candle evidence is not promoted
  to real-provider PASS.
- **OpenSpec:** UNVERIFIED — the `openspec` CLI is unavailable. The checked-in
  active Backtesting capability spec/change and governing documents were read
  directly.
- **Other evidence:** Browser/runtime and link/DAG automation were not run and
  remain `UNVERIFIED`; no unavailable check is claimed as PASS.

## State and stop boundary

- **B-03:** `REVIEW`, not `DONE`. The implementation and focused/global fixture
  evidence are present, but the required deferred-scope gate and real
  PostgreSQL/Binance evidence remain unavailable.
- `M-03` and `N-03` remain `REVIEW`; `M-02` remains `REVIEW/UNVERIFIED`.
  `S-04`, `Q-02`, `E-02`, `L-02`, `F-03`, `I-03`, `AU-02`, `I-01`, `I-02`, and
  all other downstream/deferred tasks remain at their recorded states. No task
  was auto-started or promoted.
- Frozen `modules/backtesting/api/contracts.ts`,
  `modules/backtesting/api/contracts.spec.ts`, and all migrations are unchanged.
- **Manager checkpoint commit:** one coherent checkpoint commit contains the
  accepted B-03 source/tests plus Manager-owned `TASKS.md` and this `HANDOFF.md`.
  Its exact Git hash is reported at the stop boundary.
- **Renewed authorization:** required before any follow-on task or any separate
  reconciliation of the blocked deferred-scope/real-provider gates.
