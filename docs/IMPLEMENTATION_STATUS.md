# Implementation Status

## Current state

- Branch: `implement`
- Current feature: Backtesting simulator (in progress)
- Next feature: Backtesting simulator
- Completed features: Strategy plugin runtime; Market data and normalized contracts; Evaluation metrics

## Baseline

- Root npm wrapper scripts cannot run in this shell because `npm` is not on PATH; equivalent workspace commands were run through bundled pnpm.
- `pnpm -r --if-present test`: passed; all existing module/app tests and the 2 strategy runtime tests passed.
- `pnpm -r --if-present build`: passed; all 13 buildable workspaces compiled and the frontend production bundle was generated.
- `pnpm -r --if-present lint`: passed; all 13 lintable workspaces type-checked.
- Direct dependency-cruiser invocation with the repository config: passed; 31 modules and 27 dependencies cruised with no violations.
- Market-data focused tests: passed; 5 tests covering validation order, default latest-1000 paging, gap reporting, and snapshot idempotency.
- Evaluation focused tests: passed; 2 tests covering compounded metrics/provenance and zero-trade/invalid-input behavior.

## Commits

Strategy plugin runtime committed as `97bd4f6` (`feat(strategy): add built-in plugin runtime and composite signals`). The required `implement` branch was created from `main`.
Market-data runtime committed as `cd091a6` (`feat(market-data): normalize candles and seal snapshots`).
Evaluation runtime is ready to commit after the passing validation above.

## Decisions and conflicts

- The PDF is authoritative over the Markdown companion and reference images.
- The reference images are visual targets, not additional API contracts; existing OpenSpec module contracts remain the executable design detail.
- Existing code is intentionally skeletal and existing skeleton tests are preserved unless a feature makes them obsolete.
- Added built-in MA, RSI, Bollinger, and Support/Resistance plugin implementations plus majority/weighted composite logic.
- The repository tracks source-adjacent generated JavaScript and declaration files. They were refreshed for the strategy API and plugin files so Vitest and the existing backend/worker composition tests resolve the same runtime implementation.
- Market Data now validates canonical pairs/timeframes/candles, reports aligned gaps, returns latest bounded pages, supports normalized provider subscriptions, and seals content-addressed snapshots.
- The PDF's four-chart dashboard limit remains a frontend concern; Market Data does not impose a four-subscription domain limit.
- Evaluation is pure and separate from Strategy/Backtesting implementation; it owns the pinned `MVP_EVALUATION_V1` formulas and finite metric checks.
- A temporary pnpm workspace manifest was used only for dependency installation and is not part of the implementation.

## Blockers

- No active blocker. The next feature is market data and normalized contracts.
