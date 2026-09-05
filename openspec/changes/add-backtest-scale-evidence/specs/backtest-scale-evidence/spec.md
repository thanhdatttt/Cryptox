## ADDED Requirements

### Requirement: Completed-attempt duration projection

The system SHALL calculate `averageBacktestDurationMs` from successful completed
Backtest Attempts that contain both `startedAt` and `completedAt`. It SHALL exclude
failed, cancelled, pending, and timestamp-incomplete attempts. It SHALL return
`null` when no qualifying attempt exists.

#### Scenario: Successful attempts have a duration aggregate

- **WHEN** a Search Run has completed attempts with valid start and completion times
- **THEN** its summary reports the arithmetic mean of their execution durations
- **AND** the value does not include queue wait or failed-attempt time.

#### Scenario: No valid completed attempt exists

- **WHEN** all attempts are pending, failed, cancelled, or lack timing data
- **THEN** the summary reports `averageBacktestDurationMs` as `null`.

### Requirement: Bounded, multi-worker scale evidence

The repository SHALL provide a repeatable benchmark procedure for at least 100 and
500 candidates through the real durable queue/worker path. The procedure SHALL
record `maxInFlight`, worker replicas, per-process concurrency, candle count,
strategy mix, commit, terminal counts, retry count, wall time, and throughput.

#### Scenario: Candidate bound is respected while draining

- **WHEN** a Search Run is configured with a positive `maxInFlight`
- **THEN** the benchmark and its automated checks show that queued plus running
  candidates never exceed that configured bound.

#### Scenario: Two workers process one durable queue

- **WHEN** two worker processes consume the same configured BullMQ queue
- **THEN** every candidate reaches exactly one terminal lifecycle outcome
- **AND** a successful candidate creates at most one Experiment.

#### Scenario: Generator capacity is exhausted

- **WHEN** a running Search Run has available capacity but all bounded generator
  attempts duplicate an existing fingerprint
- **THEN** the Search Run transitions to `FAILED` with
  `SEARCH_GENERATION_EXHAUSTED`
- **AND** it does not remain `RUNNING` with no queued or running candidate.

### Requirement: Honest capacity documentation

The architecture and demo guide SHALL distinguish Search Run `maxInFlight`, worker
replicas, and per-process BullMQ concurrency. They SHALL state that observed
throughput is workload and hardware dependent and SHALL link only measured results.
