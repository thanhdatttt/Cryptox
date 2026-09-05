## Context

The backend submits Search candidates through the Backtesting public facade. Redis
and BullMQ provide durable dispatch; independently runnable workers execute jobs;
PostgreSQL remains the source of truth for candidates, attempts, experiments, and
completion fencing. `maxInFlight` is a producer-side cap for one Search Run, not a
worker-pool setting. The worker accepts `BACKTEST_WORKER_CONCURRENCY`, but the
current simulator performs synchronous candle iteration and prefix construction;
therefore raising concurrency in one Node process must be benchmarked, not assumed
to provide CPU parallelism.

The first baseline run exposed a concrete operational issue: the QueueEvents
completed handler parsed its event return value directly. When that event payload
was unusable, completion fell back to the periodic recovery loop, adding roughly
one recovery interval before Search could refill slots. The listener now resolves
the retained BullMQ job by ID, validates its durable payload, and forwards the
terminal wake-up; reconciliation remains the fallback.

## Goals / Non-Goals

**Goals:**

- Report a defensible completed-attempt execution duration aggregate.
- Prove bounded submission and terminal correctness under an actual queue/worker
  workload.
- Make the scale test repeatable and reviewable from source, command, and result.
- Demonstrate worker replicas separately from per-process concurrency.

**Non-Goals:**

- Replacing BullMQ, introducing Kafka, changing simulator trading semantics, or
  promising a fixed throughput improvement across machines.
- Treating a synthetic delay-only workload as evidence of real backtest capacity.
- Publishing a benchmark result before its command succeeds in the target stack.

## Decisions

### 1. Define timing precisely

For each successful completed attempt, `executionDurationMs` equals
`completedAt - startedAt`. Failed, cancelled, pending, and timestamp-incomplete
attempts do not enter the aggregate. The existing `averageBacktestDurationMs`
summary field is populated from that set; an empty set remains `null` rather than
zero. Queue wait and end-to-end duration are distinct metrics and are not silently
substituted for execution duration.

### 2. Keep capacity controls separate

The benchmark records three independent controls:

| Control | Meaning |
| --- | --- |
| `maxInFlight` | Maximum queued + running candidates for one Search Run |
| Worker replicas `W` | Independently running worker processes consuming the same queue |
| Worker concurrency `C` | BullMQ processing concurrency within one process |

The baseline is `W=1, C=1`; the primary comparison is `W=2, C=1`. An optional
`W=1, C=2` run is informative but must not be presented as multi-core scaling.

### 3. Benchmark real, sealed inputs

The harness creates or selects one sealed scope and runs the real Search/Backtest
path with a documented candidate set. It runs at least 100 and 500 candidates,
records candle count, strategy mix, commit, machine characteristics, configuration,
wall time, terminal counts, retries, duration aggregate, and throughput. It repeats
each configuration three times and emits machine-readable JSON plus a checked-in
human-readable result only after review.

### 4. Preserve lifecycle guarantees

Concurrency tests must verify no oversubmission beyond `maxInFlight`, no duplicate
Experiment per candidate, and correct retry/terminal handling. They use the public
Backtesting/Search facades and real queue infrastructure where feasible; test-only
fixtures remain outside production composition.

### 5. Surface generator exhaustion

The deterministic generator retries a bounded number of candidate drafts per
available slot. If it cannot submit any new candidate while capacity is empty,
the same run state would repeat forever. The Search Run therefore transitions to
`FAILED` with `SEARCH_GENERATION_EXHAUSTED`; this is a configuration/workload
limit, not a successful max-candidate run. Benchmark automation records it as a
failed result rather than timing out silently.

## Risks / Trade-offs

- Timing values may be missing on old attempts: exclude them, return `null` for no
  valid sample, and cover the behavior with tests.
- CPU-bound jobs may not improve with `C>1` in a single process: compare process
  replicas, document the observed trade-off, and do not optimize blindly.
- A large sealed scope can make the benchmark slow: record candle count and choose
  a representative fixed fixture; do not conceal workload reduction.
- Multi-worker execution can expose races: use existing fencing/idempotency as the
  invariant and make failures visible in the benchmark output.

## Validation

1. Focused unit tests cover duration aggregation and bounded slot refill.
2. Queue integration test proves two consumers drain candidates without duplicate
   terminal Experiment creation or a cap violation.
3. Benchmark runs pass at 100 and 500 candidates for `W=1,C=1` and `W=2,C=1`.
4. Documentation cites actual result artifacts and states machine-specific limits.
