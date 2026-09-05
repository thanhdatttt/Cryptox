# Backtest scale benchmark evidence

This document defines the reproducible evidence procedure for demo Scenario 7.
It intentionally contains no throughput claim until a reviewed JSON result is
committed alongside the command output.

## Capacity model

`maxInFlight` bounds queued plus running candidates for one Search Run. It is
not a worker setting. Worker replicas (`W`) are separate Node processes consuming
the same BullMQ queue; `BACKTEST_WORKER_CONCURRENCY` (`C`) is BullMQ concurrency
inside each process. The current simulator is synchronous and candle-count
sensitive, so `C > 1` is measured rather than assumed to provide CPU parallelism.

## Preconditions

1. Start the durable Compose stack with seeded demo market data, one backend, Redis,
   PostgreSQL, and the selected number of `backtest-worker` replicas.
2. Use the fixed seeded scope `BTCUSDT`, `1h`, 1,000 closed candles ending at
   `2025-01-31T00:00:00.000Z`.
3. The harness creates MA, RSI, and Bollinger definitions and uses the `GENETIC`
   generator with exactly one mutated component per candidate. This retains a
   real parameter-search → queue → worker → Experiment path while avoiding a
   database-write-heavy, variable-size composite workload that would obscure
   queue capacity. The generator consults prior fingerprints before returning a
   draft, avoiding a benchmark that stalls after exhausting a small random sample.
4. Record the Git commit and host CPU/RAM from the result file; do not compare
   values from different commits or materially different machines as a speed-up.

## Command matrix

Run every cell three times. The command creates a fresh user, strategy, scope, and
Search Run; it writes an ignored JSON result under `tmp/backtest-scale/` unless
`BENCHMARK_OUTPUT` is explicitly set.

| Label | Candidates | W | C | maxInFlight |
| --- | ---: | ---: | ---: | ---: |
| Baseline | 100, then 500 | 1 | 1 | 4 |
| Replica comparison | 100, then 500 | 2 | 1 | 4 |

For each container configuration, set the same environment values and run:

```powershell
$env:BENCHMARK_CANDIDATES = "100"
$env:BENCHMARK_MAX_IN_FLIGHT = "4"
$env:BENCHMARK_WORKER_REPLICAS = "1"
$env:BENCHMARK_WORKER_CONCURRENCY = "1"
$env:BENCHMARK_COMMIT = (git rev-parse HEAD)
npm run benchmark:backtest-scale
```

Run the recorded matrix only after the implementation is committed, so this
commit value identifies the code actually measured. An exploratory run from a
dirty worktree may use `BENCHMARK_COMMIT=UNCOMMITTED`, but it is not evidence
for the checklist or a main-branch claim.

Use `docker compose ... up --scale backtest-worker=2` for the replica comparison,
then set `BENCHMARK_WORKER_REPLICAS=2`. An optional `W=1,C=2` observation may be
recorded as a trade-off, not as proof of multi-core scaling.

## PASS gate and result schema

A run is PASS only if all requested candidates are terminal and completed, each
completed candidate has one unique Experiment, observed queued plus running work
never exceeds `maxInFlight`, and the harness writes `schemaVersion: 1` JSON.
The result contains workload/candle count, capacity settings, wall time, measured
throughput, average execution duration, retry count, and terminal counts.

## Isolated real-queue integration check

Before the matrix, start an otherwise unused Redis instance and set
`BACKTEST_QUEUE_INTEGRATION_REDIS_URL` to its URL. Then run:

```powershell
$env:BACKTEST_QUEUE_INTEGRATION_REDIS_URL = "redis://127.0.0.1:6380"
npm run test --workspace=@cryptox/backtesting -- infrastructure/queue/adapter.integration.spec.ts
Remove-Item Env:BACKTEST_QUEUE_INTEGRATION_REDIS_URL
```

This test deliberately holds one job in worker 1, then verifies worker 2 drains
another job and a one-time retry. It fails if any successful candidate completes
twice. It uses generated job IDs and removes retained jobs during teardown.

Commit only reviewed JSON outputs that include the command configuration and
environment note. A failed or timeout result is evidence of an issue, not a basis
for changing the checklist to `Đạt`.
