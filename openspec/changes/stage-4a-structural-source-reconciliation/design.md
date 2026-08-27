# Design

## Structural invariants

- Domain code imports no other business module.
- Cross-module application collaboration uses public module APIs.
- Packages do not import modules; apps use public/bootstrap surfaces.
- Search owns SearchRun; Backtesting owns Candidate/Trade/Experiment; Evaluation
  owns metric contracts; Leaderboard owns ranking configuration/scopes/entries.
- Provider implementations remain absent; provider ports are typed application
  boundaries.
- Backtest execution is mechanism-neutral. The MVP adapter is bounded and local,
  with an injected runner; the real simulator remains absent.
- REST remains empty/minimal unless an existing active DTO needs reconciliation.
  WebSocket remains market-only and self-contained.
- Redis, workers, queue transport, distributed recovery, Auth, optional trading
  risk, and strict replay are not active MVP runtime concepts.

## Wave 2 ownership decisions

- Strategy owns reusable strategy/composite definitions. Other module domains
  retain only their own identifiers and value snapshots; cross-module composition
  belongs at application or API boundaries.
- Search owns `SearchRun`, its bounded stop condition, Random generator identity,
  search-space choice, and orchestration counters. It does not redeclare Candidate
  execution state or ranking entries.
- Backtesting owns Candidate identity and mechanism-neutral execution state,
  long-only Buy/Sell Trade records, simulation configuration, and Experiment
  results. It does not own generator taxonomy, ranking scope, Evaluation metrics,
  queue delivery state, or distributed recovery metadata.
- Evaluation owns a neutral completed-result input and finite metric output.
  Leaderboard owns ranking configuration, configurable `K`, comparison scope, and
  ranked Experiment references. Neither domain imports Backtesting.
- Market Data, News, and Sentiment own normalized provider-neutral domain values;
  replaceable provider/model contracts are application ports. News-to-Sentiment
  collaboration is an application dependency on Sentiment's public API.
- Market WebSocket DTOs duplicate only the minimal self-contained wire values that
  transport owns. Queue DTOs have no active MVP owner and are retired.

## Build and resolution

Workspace packages expose explicit public and bootstrap entrypoints. Production
output is emitted only beneath ignored `dist/` directories. Application start
scripts use compiled local entrypoints and workspace package resolution without
POSIX-only `NODE_PATH` assignment. Source-side generated module sidecars are
removed only after clean build and resolution checks prove the new layout.

## Execution boundary

`BacktestExecutionPort` exposes bounded submission, capacity, status, and
cancellation. Submission distinguishes accepted from saturated. Accepted work has
one consumer-visible terminal result. `BoundedLocalBacktestExecutor` limits active
runner calls and uses an injected `BacktestRunner`; tests use fakes only.

## Runtime truth

Backend composition contains active MVP module surfaces without Auth or fake
`undefined as never` dependencies. Liveness reports process life. Readiness reports
whether required structural dependencies are available, and may truthfully remain
unavailable while feature implementations are absent.
