# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-051`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-051 — B-03 synthetic directional paper execution and provenance

This replaceable signal supersedes `INS-050 / HOLD` and authorizes exactly one
bounded implementation/review of `B-03`. B-03 is independent of the unresolved
M-03 and N-03 review gates at its start boundary; no other packet is authorized.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `9800a7d8d6ea377e956e7babbdb633732a03049a`, the committed
  `INS-050 / HOLD` governance checkpoint; the working tree is clean.
- The current task board is internally consistent. B-03 is `BLOCKED`, and all
  of its start dependencies are `DONE`: `C-02`, `B-01`, `B-02`, `M-01`, `S-01`,
  `S-05`, and `S-06`. M-03 and N-03 remain `REVIEW`; neither is silently
  promoted or used as a B-03 start dependency. M-02 remains `REVIEW/UNVERIFIED`.
- M-03 source/business checkpoint is preserved at
  `b73b298726418d502f396b4f7ed29c1afbbdcf20`; N-03 source/business checkpoint
  is preserved at `d4161ec458c869ff18fa89dd9732df260629c915`. Their unresolved
  real-provider and integration evidence remains explicitly non-PASS.
- The approved authority chain already defines `CSL-R-BT-02` and
  `SYNTHETIC_SHORT_PAPER_V1` in the requirements, ADR-006/007, active
  Backtesting spec, and DEC-007 amendment. No new scope decision is inferred.
- The active-task inspection found no Cryptox Manager or worker. Historical
  Managers/workers are inactive and must not be reused; no duplicate task,
  retry, worktree, reset, or history rewrite is permitted.

### Authorized packet: `B-03`

- **Requirement IDs:** `CSL-R-BT-02`, `CSL-R-RP-02`, `CSL-R-BT-01`, and
  `CSL-R-OB-01`.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  fully, then verify this signal, checkpoint, DAG, dependencies, and scope
  before dispatch.
- **Fresh worker:** the Manager must delegate exactly one fresh Backtesting
  implementation worker with a disjoint bounded write scope. Do not resume,
  replace, retry, or duplicate any historical worker. The worker may not edit
  control-plane artifacts.
- **Worker write scope:** `modules/backtesting/domain/**`,
  `modules/backtesting/application/**`, `modules/backtesting/infrastructure/**`,
  and focused Backtesting tests, excluding frozen
  `modules/backtesting/api/contracts.ts` and `contracts.spec.ts`.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for B-03 ownership, state transitions,
  review, validation, limitations, and the single checkpoint. Preserve all
  unrelated task states and prior M-03/N-03 evidence.

### B-03 acceptance criteria

- Implement `SYNTHETIC_SHORT_PAPER_V1` over identified Binance historical
  candles only. Long and synthetic Short are explicit candle-simulation modes;
  no exchange order, leverage, margin, funding, liquidation, live execution,
  or generalized risk behavior may be introduced.
- Apply next-candle-open signal timing and bounded OHLC exits. For both Long
  and synthetic Short, `STOP_LOSS_WINS_V1` must resolve a single candle that
  reaches both configured SL and TP conservatively, with exactly one exit.
  Range-end closure and no-lookahead behavior must remain deterministic.
- Apply the approved default/configured profile exactly: `0.08%` fee per entry
  and exit fill, adverse `5` basis-point slippage per fill, fixed-point or
  decimal P&L rounded to eight decimal places with `HALF_UP`, and explicit
  position mode, stop-loss, take-profit, fee, slippage, rounding, and execution
  profile provenance.
- Persist or round-trip the approved paper execution provenance with Candidate/
  Experiment/Trade data through existing approved persistence fields where the
  adapter is in scope. Trade direction and exit reason must be inspectable;
  there must be no exchange-order artifact. Do not alter migrations.
- Preserve bounded local execution, owner propagation, one terminal outcome, no
  partial Experiment, failure/cancellation behavior, and deterministic reruns.
  Evaluation and Leaderboard must receive the same stable result shape and no
  deferred risk semantics.

### Required validation and stop condition

- Run focused Backtesting domain/application/infrastructure tests, including
  Long/Short direction, decimal eight-place golden cases, fee/slippage, dual
  SL/TP trigger, range-end/no-lookahead, provenance round-trip, deterministic
  rerun, failure/cancellation, owner boundary, and no-order/deferred-scope
  checks. Run applicable package and root tests.
- Run `npm run arch:check`, `npm run artifacts:check`, `npm run scope:check`,
  `npm run typecheck`, `npm run build`, `npm run lint`, deferred-scope and
  `git diff --check`. Verify exact changed paths and frozen contracts/migrations
  remain unchanged. Any unavailable tool/environment is `UNVERIFIED` or
  `BLOCKED`, never `PASS`.
- PostgreSQL persistence and real Binance-backed candle evidence must be
  reported separately from fixture/fake evidence. If unavailable, keep the
  corresponding validation `UNVERIFIED`/`BLOCKED`; never promote B-03 to `DONE`
  on fixture-only evidence where the packet's persistence/provider gate is
  required.
- The Manager must review the worker result, update B-03 only through the
  valid state sequence, commit one coherent checkpoint, and stop immediately
  when this authorization is exhausted. The Instructor will independently
  review Git, diff, tests, and control-plane consistency before any next signal.
- Do not start or promote `S-04`, `Q-02`, `N-03`, `M-03`, `E-02`, `L-02`,
  `F-03`, `I-03`, `M-02`, `AU-02`, `I-01`, `I-02`, or any other downstream or
  deferred packet under this signal.

### Prohibitions and deferred scope

No migration, frozen API contract, frontend, exchange-order path, live trading,
generalized risk, leverage/margin/funding/liquidation, distributed queue,
Redis/BullMQ, microservice, event-sourcing, autonomous LLM, secrets, cloud
database, unrelated module, or control-plane edit outside Manager-owned
`TASKS.md`/`HANDOFF.md` is authorized. `READY` alone is not authorization.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_provenance_reproducibility.md)
- [Backtesting capability spec](../../openspec/specs/backtesting/spec.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
