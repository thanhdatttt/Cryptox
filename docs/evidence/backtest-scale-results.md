# Backtest scale benchmark results

This is the reviewed, commit-bound record for Scenario 7. It supplements the
[procedure](backtest-scale-benchmark.md); the ignored per-run JSON files were
used to produce this table and are not presented as a main-branch artifact.

## Test identity

- Measured commit: `bfb110b9aee62ac54dfbdab6dfbf6d6c2f31b7e5`
- Host: Windows x64, Node `v22.21.0`, 8 logical CPU cores, 16,889,192,448 bytes RAM.
- Stack: isolated Docker Compose project; PostgreSQL 17, Redis 7, one backend,
  `backtest-worker` replicas `W`, and worker concurrency `C=1`.
- Same workload on every run: `GENETIC`, `maxComponents=1`, MA/RSI/Bollinger
  definitions, `BTCUSDT` at `1h`, 1,000 fixed closed candles ending
  `2025-01-31T00:00:00.000Z`, `maxInFlight=4`.
- Each run used a new user, strategies, scope and Search Run. Results are not a
  production capacity promise and must not be compared across machines/commits.

## Correctness gate

All 12 runs are `PASS`: every requested candidate completed, no failed or
cancelled/non-terminal candidate, no missing or duplicate Experiment, no failed
attempt/retry, and observed in-flight work never exceeded four. The preceding
real-Redis integration test also passed: two workers drained one queue while a
job was held and another job retried once, with no duplicate successful completion.

## Recorded runs

`wall` includes creating the isolated benchmark user/strategies/scope, starting
the Search Run, polling to terminal state and reading terminal candidates. `avg
execution` is the Search Run's completed-attempt duration metric; it is not the
same as end-to-end wall time.

| W | Candidates | Run | Wall (s) | Throughput (candidates/s) | Avg execution (ms) | Max observed in-flight | Correctness |
| ---: | ---: | --- | ---: | ---: | ---: | ---: | --- |
| 1 | 100 | R1 | 15.780 | 6.337 | 20.60 | 3 | PASS |
| 1 | 100 | R2 | 13.185 | 7.584 | 16.75 | 3 | PASS |
| 1 | 100 | R3 | 12.125 | 8.247 | 15.61 | 2 | PASS |
| 1 | 500 | R1 | 239.924 | 2.084 | 15.95 | 3 | PASS |
| 1 | 500 | R2 | 242.790 | 2.059 | 17.42 | 3 | PASS |
| 1 | 500 | R3 | 275.761 | 1.813 | 17.88 | 3 | PASS |
| 2 | 100 | R1 | 13.709 | 7.294 | 21.30 | 3 | PASS |
| 2 | 100 | R2 | 13.489 | 7.414 | 18.98 | 2 | PASS |
| 2 | 100 | R3 | 13.158 | 7.600 | 18.98 | 3 | PASS |
| 2 | 500 | R1 | 254.896 | 1.962 | 18.71 | 4 | PASS |
| 2 | 500 | R2 | 249.629 | 2.003 | 18.85 | 3 | PASS |
| 2 | 500 | R3 | 244.047 | 2.049 | 18.93 | 4 | PASS |

## Interpretation

The evidence establishes bounded submission and successful consumption by two
independent workers under both 100- and 500-candidate workloads. It does **not**
claim linear worker scaling: at 500 candidates, the three-run mean is about
1.986 candidates/s for `W=1` and 2.005 for `W=2` (about 1% on this host). With a
global `maxInFlight=4`, synchronous simulation, completion persistence, and the
backend/DB path on the same machine, those components can dominate. A different
capacity claim requires a separately recorded run with its own commit, host, and
capacity settings.

## Reproduction

Follow the exact [benchmark procedure](backtest-scale-benchmark.md). First run
the isolated Redis integration test, then execute each matrix cell three times.
Record the commit in `BENCHMARK_COMMIT`; do not replace this table with a dirty
working-tree result.
