# Implementation Status

## Current state

- Branch: `implement`
- Current feature: Integration hardening (in progress)
- Next feature: Final requirements review and delivery
- Completed features: Strategy plugin runtime; Market data and normalized contracts; Evaluation metrics; Backtesting simulator; Leaderboard scoring and Top-K admission; Search orchestration; News and sentiment; Auth runtime and protected routes; Initial persistence and HTTP composition; Frontend application

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
- Leaderboard focused tests: passed; 3 tests covering deterministic scoring/zero-trade exclusion, strict Top-K admission and idempotency, and rank-eligible per-run ordering. The full workspace test/build/lint and dependency-cruiser checks passed after this module.
- Search focused tests: passed; 3 tests covering bounded slot filling, drained max-candidate completion, idempotent cancellation, and isolated static facade behavior. The full workspace test/build/lint and dependency-cruiser checks passed after this module.
- README local-run instructions were reviewed against the root and workspace package scripts. The documentation-only change does not affect the previously passing implementation validation set.
- Frontend local-run smoke test: the Vite development server responded with HTTP 200 at `http://127.0.0.1:5173/`.
- News focused tests: passed; 3 tests covering normalized persistence before Sentiment invocation, exact-URL duplicate handling in the composition default, missing/degraded Sentiment reads, and malformed provider values.
- Sentiment focused tests: passed; 3 tests covering append-only model provenance/latest selection, invalid inference-result rejection, and immutable content-hashed window snapshots with no future/carry-forward reads.
- News/Sentiment workspace validation: `pnpm -r --if-present test`, `pnpm -r --if-present build`, and `pnpm -r --if-present lint` all passed for 13 workspace projects. Direct dependency-cruiser validation passed with 31 modules and 27 dependencies cruised and no violations.
- Auth focused tests: passed; 3 tests covering bcrypt-only password storage, one-hour HS256 JWT claims/verification, duplicate/credential handling, and invalid or expired token rejection.
- Backend Auth composition tests: passed; 2 tests covering nine-module composition plus `/auth/register`, `/auth/login`, and protected `/auth/me` controller mapping.
- Auth workspace validation: `pnpm -r --if-present test`, `pnpm -r --if-present build`, and `pnpm -r --if-present lint` all passed for 13 workspace projects. Direct dependency-cruiser validation passed with 32 modules and 32 dependencies cruised and no violations.
- Auth PostgreSQL repository tests: passed; 1 test covering parameterized insert/read SQL and storage-to-domain mapping. The full workspace test/build/lint/dependency-cruiser validation was rerun after the users migration and adapter and passed unchanged (32 modules and 32 dependencies cruised).
- HTTP composition tests: passed; backend controller tests now cover authenticated strategy-list, market-candle, and News read mappings plus invalid market query and missing bearer handling. Full workspace test/build/lint passed, and dependency-cruiser passed with 34 modules and 36 dependencies cruised.
- Frontend focused tests: passed; 3 tests cover deterministic initial four-panel chart state, immutable panel updates, and the closed-versus-forming candle merge invariant. The frontend production build and TypeScript lint passed.
- Frontend smoke test: the Vite development server responded with HTTP 200 and the root mount at `http://127.0.0.1:5174/`. The in-app browser connector could not initialize because of a host `AppData` permission error, so the check was limited to the production build and HTTP response rather than a browser screenshot.
- Frontend workspace validation: `pnpm -r --if-present test`, `pnpm -r --if-present build`, and `pnpm -r --if-present lint` passed for all 13 workspace projects. Direct dependency-cruiser validation passed with 36 modules and 38 dependencies cruised and no violations.

## Commits

Strategy plugin runtime committed as `97bd4f6` (`feat(strategy): add built-in plugin runtime and composite signals`). The required `implement` branch was created from `main`.
Market-data runtime committed as `cd091a6` (`feat(market-data): normalize candles and seal snapshots`).
Evaluation runtime committed as `0d8f1f8` (`feat(evaluation): add deterministic finite metric policy`).
Backtesting simulator committed as `9d9645e` (`feat(backtesting): add deterministic candle simulator`).
Leaderboard scoring and Top-K admission committed as `8f8364c` (`feat(leaderboard): add deterministic scoring and Top-K admission`).
Search orchestration committed as `06b93e5` (`feat(search): add bounded strategy loop orchestration`).
News and Sentiment runtime committed as `502e7e2` (`feat(news): add sentiment isolation and sealed snapshots`).
Auth runtime and protected routes committed as `da4ca1c` (`feat(auth): add bcrypt jwt runtime and protected routes`).
PostgreSQL Auth persistence committed as `3e5d913` (`feat(auth): add PostgreSQL user persistence`).
Initial authenticated backend facade routes committed as `36bee80` (`feat(backend): add authenticated public facade routes`).
Frontend state and reference-screen application committed as `126e718` (`feat(frontend): add reference dashboard screens and state`).

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
- Leaderboard scoring is pure and formula-versioned; scope/formula lookup is cached before synchronous scoring. Its factory uses injected ports and provides an in-memory default only for the existing composition shell and deterministic tests.
- Search uses serialized per-run slot filling, only public Backtesting/Leaderboard ports, explicit bounded stop conditions, pause/resume/cancel state transitions, and durable repository-shaped run state. Its default in-memory adapter exists solely for the current composition shell and tests.
- A temporary pnpm workspace manifest was used only for dependency installation and is not part of the implementation.
- The README documents npm as the supported user-facing workflow because the repository declares npm workspaces. It includes a Windows PowerShell backend command because the current package start script uses POSIX `NODE_PATH=...` syntax.
- News accepts only canonical normalized `NewsItem` values from provider adapters, stores them before attempting Sentiment, and composes missing Sentiment rather than fabricating a neutral value on timeout/inference failure. The concrete RSS/API/crawler extraction and LLM-template implementations remain composition adapters because no external provider credentials or approved extraction contract are present yet.
- Sentiment validates neutral input/result provenance, keeps model results append-only, selects latest by timestamp then insertion order in the in-memory adapter, and seals deterministic SHA-256 snapshot points. A point is readable only at its completed aggregation-window end; it never exposes a future point or carries a previous window across a missing one.
- The worker's local placeholder now implements the expanded Sentiment repository shape without reaching into Sentiment internals.
- Auth uses `bcryptjs` for bcrypt-compatible password hashes and `jsonwebtoken` for HS256 one-hour JWTs. The in-memory adapter supports local composition/tests; PostgreSQL user persistence remains the next incomplete portion of the composed feature. Backend composition reads `JWT_SECRET` when set and otherwise uses a documented development-only fallback that must not be used for deployment.
- `infra/db/migrations/002_create_users.js` creates the Auth-owned `users` table after the existing pgcrypto extension migration. Backend composition selects the PostgreSQL Auth repository when `DATABASE_URL` is configured and otherwise retains the local in-memory repository; `npm run db:migrate` is the documented migration entrypoint.
- The composed REST surface is currently `GET /health`, Auth register/login/me, `GET /strategies`, `GET /market/candles`, and `GET /news`, all except health/Auth credentials requiring a verified bearer JWT. Backtest/Search/Leaderboard routes remain integration-hardening work because their static public facade functions are intentionally skeletal while their test runtimes are composition-specific.
- The frontend provides the supplied Realtime, Strategy Engine, Discovery, Backtest, News Crawler, and Settings screens as a responsive local presentation shell. It keeps its four-chart configuration and merge behavior as tested UI state; displayed market/analysis values are explicitly labelled demo data until the remaining public facade routes are composed into live frontend transport.

## Blockers

- No active blocker. Integration hardening will compose the remaining public Backtest/Search/Leaderboard facades and complete the final requirement review.
