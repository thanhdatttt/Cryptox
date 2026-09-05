## Why

Cryptox has a durable BullMQ backtest worker and Search Run backpressure, but it
cannot yet demonstrate the assignment's scale scenario honestly. The Search
summary returns no measured execution duration, existing tests do not exercise a
multi-worker Redis/PostgreSQL run, and no repeatable 100-plus-candidate benchmark
exists. Configuration alone is not evidence of throughput.

## What Changes

- Persist and project execution timing for completed Backtest Attempts, without
  conflating queue waiting time, failed attempts, or end-to-end Search Run time.
- Add focused application and adapter tests for bounded Search submission,
  concurrent workers, retries, and exactly-once Experiment completion.
- Terminate a Search Run explicitly when its bounded generator attempts cannot
  produce a new fingerprint, rather than leaving it RUNNING with no work.
- Add a reproducible benchmark harness and result format for 100 and more
  candidates against a sealed benchmark scope.
- Document how `maxInFlight`, worker process replicas, and worker concurrency
  interact, including the CPU-bound trade-off of the current simulator.
- Update the evaluation/demo guide only with observed benchmark output; do not
  pre-claim a speed-up.

## Capabilities

### New Capabilities

- `backtest-scale-evidence`: Measurable and reproducible evidence that a bounded
  Search Run drains a large candidate set through the existing durable worker
  queue while preserving lifecycle correctness.

### Modified Capabilities

- `backtest-log`: Search candidate summaries expose a defined aggregate of
  completed-attempt execution durations.
- `search`: Search Run capacity documentation distinguishes `maxInFlight` from
  worker-pool capacity.

## Impact

- Backtesting attempt summary/projection, Search status projection, focused tests,
  benchmark tooling, Docker demo instructions, README, architecture, and ADR-003.
- No new message broker, microservice, domain event bus, strategy behavior,
  historical candle semantics, or schema migration is introduced unless inspection
  proves timestamps are absent.
