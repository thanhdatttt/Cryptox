# Implementation Status

## Current state

- Branch: `implement`
- Current feature: Search and leaderboard (in progress)
- Next feature: News and sentiment
- Completed features: Strategy plugin runtime; Market data and normalized contracts; Evaluation metrics; Backtesting simulator

## Baseline

- Root npm wrapper scripts cannot run in this shell because `npm` is not on PATH; equivalent workspace commands were run through bundled pnpm.
- `pnpm -r --if-present test`: passed; all existing module/app tests and the 2 strategy runtime tests passed.
- `pnpm -r --if-present build`: passed; all 13 buildable workspaces compiled and the frontend production bundle was generated.
- `pnpm -r --if-present lint`: passed; all 13 lintable workspaces type-checked.
- Direct dependency-cruiser invocation with the repository config: passed; 31 modules and 27 dependencies cruised with no violations.
- Market-data focused tests: passed; 5 tests covering validation order, default latest-1000 paging, gap reporting, and snapshot idempotency.
- Evaluation focused tests: passed; 2 tests covering compounded metrics/provenance and zero-trade/invalid-input behavior.
- Backtesting focused tests: passed; 5 tests covering next-open/no-look-ahead execution, stop-first OHLC exits, deterministic fee/slippage accounting, final-candle reversal suppression, and lifecycle-facade isolation.
- After a network-enabled dependency repair, `pnpm -r --if-present test`: passed for all 13 workspace projects; `pnpm -r --if-present build`: passed; and `pnpm -r --if-present lint`: passed.
- Direct dependency-cruiser invocation with `.dependency-cruiser.js`: passed; 31 modules and 27 dependencies cruised with no violations.
- The same focused and workspace validation set was rerun after the simulator's scientific-notation precision hardening and passed unchanged.

## Commits

Strategy plugin runtime committed as `97bd4f6` (`feat(strategy): add built-in plugin runtime and composite signals`). The required `implement` branch was created from `main`.
Market-data runtime committed as `cd091a6` (`feat(market-data): normalize candles and seal snapshots`).
Evaluation runtime committed as `0d8f1f8` (`feat(evaluation): add deterministic finite metric policy`).
Backtesting simulator committed as `9d9645e` (`feat(backtesting): add deterministic candle simulator`).

## Decisions and conflicts

- The PDF is authoritative over the Markdown companion and reference images.
- The reference images are visual targets, not additional API contracts; existing OpenSpec module contracts remain the executable design detail.
- Existing code is intentionally skeletal and existing skeleton tests are preserved unless a feature makes them obsolete.
- Added built-in MA, RSI, Bollinger, and Support/Resistance plugin implementations plus majority/weighted composite logic.
- The repository tracks source-adjacent generated JavaScript and declaration files. They were refreshed for the strategy API and plugin files so Vitest and the existing backend/worker composition tests resolve the same runtime implementation.
- Market Data now validates canonical pairs/timeframes/candles, reports aligned gaps, returns latest bounded pages, supports normalized provider subscriptions, and seals content-addressed snapshots.
- The PDF's four-chart dashboard limit remains a frontend concern; Market Data does not impose a four-subscription domain limit.
- Evaluation is pure and separate from Strategy/Backtesting implementation; it owns the pinned `MVP_EVALUATION_V1` formulas and finite metric checks.
- Backtesting implements `NEXT_OPEN_OHLC_STOP_FIRST_V2` semantics as a pure simulator: decisions only observe closed candles through the current close; entries/reversals fill at the next open; protective exits are stop-first and gap-aware; and final-candle entries are suppressed.
- The simulator uses local fixed-decimal `bigint` arithmetic for the selected half-up rounding scales, applies fees/slippage separately at entry and exit, and records settlement asset plus equity-before/equity-after audit values on every Trade.
- The network-approved pnpm repair rebuilt an incomplete virtual store. A temporary workspace manifest remains uncommitted because this repository declares npm workspaces but the available pnpm version requires its own workspace manifest.
- A temporary pnpm workspace manifest was used only for dependency installation and is not part of the implementation.

## Blockers

- No active blocker. The next feature is Search and leaderboard.
