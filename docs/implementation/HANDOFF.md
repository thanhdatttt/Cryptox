# MVP Implementation Checkpoint

## Resume here

- **Current stage:** MVP Implementation
- **Completed wave:** Wave 1 — executable contract and behavior freeze
- **Next frontier:** Wave 2
- **Branch:** `MVP_IMPLEMENTATION`
- **Contract-freeze commit:** `d7136318ecc5ca98670db4c260974a64d0fcbbfe`
- **Checkpoint HEAD:** The commit containing this file; resolve it with
  `git rev-parse HEAD` after checkout.
- **Task state:** P-00 and C-01 DONE. D-01, S-01, E-01, and F-01 READY. Every
  other unfinished task remains BLOCKED by the approved DAG.
- **Work started after C-01:** None.

Read [`AGENTS.md`](../../AGENTS.md), the authority chain it specifies, the active
[`mvp-implementation` change](../../openspec/changes/mvp-implementation/), the
full [`MVP_PLAN.md`](MVP_PLAN.md), and the mutable [`TASKS.md`](TASKS.md) before
claiming one READY packet.

## C-01 result

C-01 froze canonical public module contracts and application ports for Market
Data, Strategy, Search, Backtesting, Evaluation, Leaderboard, News, and
Sentiment. It also froze self-contained REST DTOs/validators, market-only
WebSocket messages, generic visualization traces, deterministic Search identity,
bounded execution seams, honest replay provenance, ranking configuration, and a
TypeScript gate for contract fixtures.

Canonical source owners remain:

- module public contracts under `modules/*/api/contracts.ts`;
- replaceable application ports under their owning module's `application/ports.ts`;
- REST DTOs under `packages/contracts/rest/`;
- market-only WebSocket DTOs under `packages/contracts/websocket/`.

Consumers must use public module barrels. Packages remain self-contained and do
not import business modules. Existing runtime stubs remain intentionally
unimplemented; C-01 added no provider, persistence, strategy, simulator, search,
ranking, controller, or frontend feature implementation.

## Frozen V1 decisions

- `LINEAR_REQUIRED_V1`: 50% Return, 30% Win Rate, minus 20% drawdown magnitude;
  successful finite results with at least one trade are eligible; deterministic
  tie order is frozen; K is configurable with default 10.
- `TECHNICAL_PROFILES_V1`: approved MA, Wilder RSI, population-deviation
  Bollinger, and `SUPPORT_RESISTANCE_V1` behavior.
- `SUPPORT_RESISTANCE_V1`: prior 20 completed candles, current excluded; support
  is minimum LOW and resistance maximum HIGH; 0.5% zones; bullish/bearish candle
  rejection confirmation; ambiguity, overlap, both/neither conditions,
  insufficient history, and breakouts yield HOLD.
- `MAJORITY_VOTE_V1`: at least two distinct immutable definitions, equal votes
  across BUY/SELL/HOLD, unique highest wins, tie yields HOLD.
- `BACKTEST_EXECUTION_V1`: deterministic single-position long-only full-cash
  execution at t+1 OPEN, fee on both sides, adverse configured slippage, exact
  quantity/net-PnL formulas, ignored repeated/inapplicable signals, and final
  candle CLOSE liquidation with fee/slippage.
- `LEXICON_V1`: deterministic local, replaceable, model-neutral Sentiment with
  provider/profile/model provenance; no hosted inference or model downloads.
- Demo defaults remain configurable: BTCUSDT, 5m/15m/1h/4h, 30 days, 10,000
  USDT, 0.1% fee per side, zero slippage, and K=10.

Do not reopen these decisions without higher-authority evidence or human review.

## Validation evidence

- Three independent read-only C-01 reviews: PASS.
- Root build: PASS.
- Root typecheck, including contract fixtures: PASS.
- Root lint: PASS.
- Root tests: PASS, 49 tests.
- Architecture dependency checks: PASS, 26 modules / 40 dependencies and all
  negative fixtures detected.
- Source-artifact check: PASS.
- Deferred-scope check: PASS.
- `git diff --check`: PASS.
- OpenSpec strict validation for `mvp-implementation`: PASS.

Live Binance/CoinDesk credentials, PostgreSQL/Docker, real providers, migrations,
and application runtime behavior are later task concerns and were not required
for C-01.

## READY/BLOCKED recomputation

Newly READY after C-01:

1. D-01 — Minimal MVP Persistence Foundation.
2. S-01 — Strategy Registry, Definitions and Composite Core.
3. E-01 — Independent Evaluation.
4. F-01 — Frontend Chart and Client Foundation.

All remaining tasks stay BLOCKED exactly as recorded in `TASKS.md`. In
particular, do not start B-01 until S-01 is DONE, and do not start persistence-
dependent capability packets until D-01 is DONE.

## Fresh-agent restart procedure

1. Confirm `MVP_IMPLEMENTATION`, resolve the checkpoint HEAD, and verify a clean
   worktree.
2. Follow the full authority reading order and inspect the contract-freeze commit.
3. Confirm `TASKS.md` shows exactly D-01, S-01, E-01, and F-01 READY.
4. Select and claim only an approved READY packet; record owner, branch, and
   starting commit before editing.
5. Treat the C-01 public contracts and V1 profiles as frozen inputs. Any proposed
   change requires Manager review and an approved change in scope.
6. Preserve disjoint write scopes and do not exceed useful concurrency.
