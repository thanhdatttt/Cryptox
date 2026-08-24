# Continuation Implementation Plan

## Source precedence

1. `B:\Bao\Crypto Strategy Lab – Đồ án cuối kỳ.pdf` — authoritative assignment
2. `backtest.jpg`, `disco.jpg`, `news.jpg`, `realtime.jpg`, and `strategy.jpg` — visual reference
3. `docs/assignment/crypto-strategy-lab-final-project.md`, `docs/REQUIREMENTS_MAP.md`, and design/OpenSpec documents
4. Existing code and tests

The Markdown assignment is a searchable companion to the PDF. Existing tests and earlier status claims are evidence only; they do not turn a placeholder or demonstration path into a completed requirement.

## Reopening audit — 2026-08-24

The previous `Complete` state was premature and is withdrawn. The targeted audit found these assignment-critical gaps:

| Area | Evidence | Consequence |
| --- | --- | --- |
| Public backtesting flow | `modules/backtesting/api/index.ts` exports required lifecycle/query functions that all throw `NOT_IMPLEMENTED`; `apps/backtest-worker/src/compose.ts` throws from snapshot creation and sentiment analysis. | R-07, R-08, and R-09 cannot run through their public/worker path. |
| Search and leaderboard public flows | `modules/search/api/index.ts` and `modules/leaderboard/api/index.ts` export only `NOT_IMPLEMENTED` functions. | R-07 and R-10 cannot operate end-to-end. |
| Worker/queue integration | `apps/backtest-worker/src/main.ts` is a skeleton and `modules/backtesting/infrastructure/queue/adapter.ts` is a placeholder. | The assignment’s asynchronous backtest flow is not deployable. |
| Persistence | Only users and strategy-library migrations/repositories exist (`002`, `003`). Candidate, attempt, trade, evaluation, search-run, leaderboard, market-snapshot, and news/sentiment durable records are missing. | Required reproducibility, audit, ranking, and pipeline state are not durable. |
| Backend composition | The backend only exposes health, auth, strategies, market candles, and news reads; it composes several modules with `undefined as never`. | Strategy → market data → backtest → evaluation → leaderboard/search has no HTTP end-to-end flow. |
| Frontend | `apps/frontend/src/main.tsx` is an explicitly labelled hard-coded demo presentation. | R-02, R-03, R-13, and R-15 are not fulfilled with live API data. |
| Operational workflow | The root supports npm workspaces, but the backend `dev` script invokes undeclared `ts-node`; backend and worker start scripts rely on POSIX `NODE_PATH=...` syntax. | The documented local workflow fails on Windows and is not a single reliable npm workflow. |

The audit also found source-adjacent generated JavaScript/declaration files that preserve obsolete `NOT_IMPLEMENTED` test expectations. Those expectations must be replaced only as their corresponding public flows are implemented.

## Ordered continuation features

1. **Repair the normal local developer workflow** *(completed in `2070778`)*
   - Keep npm as the sole supported package manager; commit and maintain `package-lock.json`.
   - Make root install/build/development/start commands work, with a cross-platform backend launcher and no undeclared runtime tools.
   - Acceptance: `npm install`, `npm run build`, documented root development/start commands, and focused launcher smoke verification pass on Windows-compatible Node tooling.

2. **Implement durable backtest execution and public API**
   - Replace every Backtesting public `NOT_IMPLEMENTED` function; add PostgreSQL migrations/repositories for benchmark scopes, candidates, attempts, trades, evaluations, snapshots, and idempotency/audit data.
   - Replace the worker skeleton/queue placeholder with a real job dispatch/consume/complete path.
   - Acceptance: a saved strategy and market snapshot produce deterministic persisted trades and evaluation through the public API and worker.

3. **Connect evaluation, leaderboard, and bounded search end-to-end**
   - Replace Search and Leaderboard public `NOT_IMPLEMENTED` functions; persist search runs, leaderboard scopes/entries, and outcomes; expose authenticated REST routes.
   - Acceptance: random search creates candidates, invokes backtests, evaluates results, ranks a Top-K, and supports status/pause/resume/cancel with durable recovery.

4. **Deliver live frontend flows for implemented APIs**
   - Replace hard-coded demo paths with authenticated REST/WebSocket transport and loading/error/empty states for strategy, market charts, backtests/trades, discovery/leaderboard, and news.
   - Acceptance: the supplied screen flows operate against the composed backend without direct Binance payload handling in the browser.

5. **Complete market and news/sentiment production adapters**
   - Persist normalized market/news data as required by the pipeline; make Binance realtime/history and the configured news collection → store → sentiment flow concrete, resilient, and observable.
   - Acceptance: adapter-contract tests plus an integration fixture prove the full collect/normalize/store/analyze and realtime update paths.

6. **Docker-backed integration and final traceability**
   - Run PostgreSQL/Redis/backend/worker/frontend together, apply migrations, execute an end-to-end smoke flow, close remaining visual/requirements-map gaps, and remove obsolete placeholders.
   - Acceptance: no assignment-required public `NOT_IMPLEMENTED` implementation remains; full tests, build, lint, architecture check, and Docker-backed validation pass.

## Execution discipline

For each feature: update status to in progress; add/adjust focused tests; run the smallest relevant validation first; run the appropriate broader checks; update status before committing; then create one focused commit. Do not start a later feature while a required check for the current feature fails.
