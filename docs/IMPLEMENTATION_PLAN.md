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

2. **Implement durable manual backtest execution and public API** *(completed in `4518930`)*
   - Replace the assignment-required Backtesting public `NOT_IMPLEMENTED` functions with an authenticated, synchronous manual-run vertical slice.
   - Add PostgreSQL migrations/repositories for Backtesting-owned copies of input snapshots/candles, benchmark scopes, candidates, attempts, trades, experiment results, and idempotency/audit data.
   - Acceptance: a saved strategy and market snapshot produce deterministic persisted trades and evaluation through the public API; scope, candidate, attempt, trade, and experiment reads enforce ownership.

3. **Connect evaluation, leaderboard, and bounded search end-to-end** *(completed in `745dc18`)*
   - Replace Search and Leaderboard public `NOT_IMPLEMENTED` functions with a deterministic, offline-capable generation → Backtesting → Evaluation → Top-K flow.
   - Persist search runs, candidate projections, and leaderboard entries; expose authenticated REST commands and reads.
   - Acceptance: a bounded search generates deterministic strategies without external credentials, submits/evaluates them through Backtesting, and serves scope-specific rankings with lifecycle controls. Search runs and Leaderboard entries are durable; candidate and experiment records remain Backtesting-owned durable projections.

4. **Replace the Backtesting worker/queue skeleton with durable dispatch and recovery** *(completed; commit pending)*
   - Replace `apps/backtest-worker` and the Backtesting queue placeholder with BullMQ/Redis dispatch and consumption.
   - Persist a transactional dispatch record before publishing, use a stable job identity, and make recovery replay undispatched work after a process failure.
   - Use a database lease/fencing token at worker execution and completion so duplicate broker deliveries cannot duplicate trades or experiments. Configure bounded retries with deterministic backoff and durable retry/terminal state.
   - Acceptance: a queued submission is durable before Redis publication, can be recovered after dispatch failure, is processed at most once under a valid fence, records retry/terminal outcomes, and completes normal attempt/trade/result records through the worker process.

5. **Complete durable Market Data, News, and Sentiment backend flows**
   - Add PostgreSQL migrations/repositories for normalized market candles/snapshots, news, sentiment analyses, and sentiment snapshots.
   - Make configured Binance access real without fabricating a provider success on failure; supply a concrete local/demo news provider and deterministic sentiment fallback with model/version provenance.
   - Expose the required authenticated REST commands and reads and prove collect → normalize → persist → analyze and snapshot retrieval with integration fixtures.

6. **Close remaining backend transport and end-to-end composition gaps**
   - Replace remaining backend/worker public placeholders, compose all modules without `undefined as never`, and complete authenticated Strategy, Market Data, Backtesting, Search, Leaderboard, News, and Sentiment transport surfaces.
   - Make the Search lifecycle work over queued Backtesting: generate → persist → dispatch → worker execute → evaluate → rank → retrieve, including lifecycle/recovery visibility.
   - Acceptance: module-boundary integration tests prove the full authenticated backend flow without controller-owned domain logic or undeclared external credentials.

7. **Docker-backed backend integration and final traceability**
   - Make Docker Compose run PostgreSQL, Redis, backend, and the backtest worker; apply migrations and execute a real end-to-end validation.
   - Acceptance: no assignment-required backend public API, worker, queue, repository, or facade remains a `NOT_IMPLEMENTED` implementation or placeholder; full tests, build, lint, architecture check, and Docker-backed validation pass. If Docker is unavailable, record the exact evidence and stop rather than claiming completion.

## Execution discipline

For each feature: update status to in progress; add/adjust focused tests; run the smallest relevant validation first; run the appropriate broader checks; update status before committing; then create one focused commit. Do not start a later feature while a required check for the current feature fails.
