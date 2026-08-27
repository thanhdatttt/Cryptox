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
