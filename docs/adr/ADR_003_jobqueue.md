# ADR-003: Restrict Asynchronous Messaging to the Backtest Job Queue

## Status

Accepted — 2026-08-13

Boundary clarification: ADR-005 (2026-08-14) amends the project-structure and ownership context referenced here; the BullMQ-only queue decision remains unchanged.

## Context

Backtesting is compute-heavy and may grow from hundreds to tens of thousands of candidates. It needs horizontal workers, retry/backoff, bounded concurrency, and backpressure. The other backend modules run inside one process and can collaborate more clearly through typed direct calls. Per-run pause/resume is an orchestration concern: Search Loop stops filling that run's slots and never globally pauses the shared BullMQ queue.

A general Event Bus would add ordering, duplicate-delivery, schema evolution, distributed tracing, and eventual-consistency concerns to Market Data, Evaluation, Leaderboard, News, and Sentiment even though those flows do not need independent asynchronous scaling.

## Decision

- Use Redis-backed BullMQ as the only asynchronous backend messaging boundary.
- Keep the canonical serialized Backtest queue payloads under `packages/contracts/queue`; keep the BullMQ adapter and queue lifecycle ownership under `modules/backtesting/infrastructure/queue`.
- Version serialized queue payloads with an explicit discriminator; the adapter validates the current schema and rejects unknown/malformed versions for reconciliation. Breaking payload changes require a new version and a producer/worker overlap period.
- Submit each backtest as a durable work-queue job with deterministic `jobId = candidateId`; one worker normally claims one job, while an active-attempt fence handles brief overlap during stalled recovery. This is competing-consumer queue semantics, not broadcast pub/sub.
- On normal processor return/throw paths, workers persist the Attempt outcome and Trades before BullMQ completion/failure. Crash, lock-loss, and max-stalled paths that bypass this write are repaired by the terminal watchdog before Candidate finalization.
- The thin adapter under `modules/backtesting/infrastructure/queue` forwards every native `completed(jobId, returnvalue)` (including typed `IGNORED` outcomes) and `retries-exhausted(jobId, attemptsMade)` wake-up. Every native `failed` is untrusted until this adapter verifies current terminal `failed` state and no runnable retry. Exhaustion and verified-failure wake-ups may both arrive for one job; the Completion Processor derives `candidateId = jobId`, reloads PostgreSQL, and handles pending/duplicate/terminal state idempotently.
- The backend completion handler reloads authoritative state, locks the Candidate, then transactionally evaluates/scores, persists one Experiment, applies scoped Top-10 admission, persists an entry only if admitted, updates counters, and marks completion.
- Completion processing is idempotent across every postcondition through the Candidate state transition, one transaction, unique constraints, and reconciliation—not merely through a unique Experiment row.
- Completion processing uses a persisted generation-bound lease token and a separate fixed five-claim retry budget with bounded backoff. Permanent/exhausted processing of `PROCESSING_RESULT` writes `FAILED`/`COMPLETION_PROCESSING` and leaves no partial Experiment; processing a `TERMINAL_FAILURE_PENDING` Candidate preserves its existing `RETRY_EXHAUSTED`/`INFRASTRUCTURE` cause. Both update counters and release the Search slot once.
- The Backtest Coordinator owns the QueueEvents adapter, stale-`CREATED` enqueue reconciler, due-completion reconciler, terminal-job watchdog, and queue cleanup. Search Loop never reads or mutates BullMQ.
- Intermediate processor failures create attempt history and `RETRY_WAIT`; the last normal processor attempt durably writes `TERMINAL_FAILURE_PENDING` before BullMQ exhausts retries, and only the Completion Processor writes Candidate `FAILED`.
- A watchdog compares all stale non-terminal Candidates (`CREATED`, `QUEUED`, `BACKTESTING`, `RETRY_WAIT`) with BullMQ terminal job state. For a crash/stall before a pending-state write, it closes a stale `RUNNING` Attempt or creates a synthetic failed Attempt if none exists, then invokes the same idempotent terminal-failure path under the Candidate lock. Retry delivery closes any abandoned `RUNNING` Attempt before allocating another.
- Every delivery establishes an active-attempt fencing generation under the Candidate lock. A late/stalled worker may not close a superseded Attempt or move the Candidate; allocation stops at the persisted `maxAttempts` budget.
- Search Loop owns the Search Run cancellation decision and calls the Backtesting public cancellation facade within the same process-level application unit of work; Search never writes Candidate tables or imports queue infrastructure. After commit it calls the Coordinator to best-effort remove waiting/delayed jobs. Manual cancellation calls the Coordinator directly. Active jobs are not force-killed and remain harmless because workers re-check/fence Candidate state.
- Do not introduce a general `EventEnvelope`, Event Bus service, Kafka, RabbitMQ, or Redis Pub/Sub for other domain flows without a new accepted ADR and measurable driver.

## Alternatives Considered

1. **Run all backtests synchronously inside the API process** — rejected because long CPU-bound work would block API capacity and cannot scale independently.
2. **Raw Redis Pub/Sub for job dispatch/results** — rejected because messages can be lost when consumers are disconnected and a broadcast can make multiple workers process the same job.
3. **General Event-Driven Architecture** — rejected for the MVP because only backtesting currently needs the operational cost of asynchronous messaging.
4. **Kafka/RabbitMQ** — deferred; BullMQ already provides the queue semantics, retry, and observability required by the current scope.

## Consequences

- Positive: worker count can scale independently of the backend.
- Positive: retry, backpressure, and queue depth are available without coupling every module to a broker.
- Positive: Evaluation and Leaderboard control flow remains explicit and easy to trace.
- Negative: Redis/BullMQ remains required even though the rest of the backend is synchronous.
- Negative: completion handlers and reconciliation logic must be idempotent.
- Negative: stalled-delivery fencing and persisted completion retry state add lifecycle complexity.
- Negative: frontend progress and Leaderboard views update through REST polling rather than push events.

## Evidence

- Increase workers from one to three and compare throughput/queue backlog without changing domain code.
- Force a worker failure and verify BullMQ retry plus one successful Experiment at most.
- Verify a non-terminal `failed` observation produces no terminal transition, `retries-exhausted` wakes normal terminal handling, and duplicate exhaustion/verified-failed wake-ups produce one final transition.
- Overlap a stalled delivery with its replacement and verify only the active attempt generation may transition the Candidate and no attempt is allocated past `maxAttempts`.
- Deliver the same completion notification twice and verify no duplicate Experiment or Leaderboard entry.
- Stop the completion listener, finish both a successful job and an exhausted-retry job, restart the backend, and verify reconciliation completes evaluation/ranking or terminal failure respectively.
- Force deterministic evaluation failure and transient completion failures; verify bounded processing claims, persisted backoff/lease recovery, and one terminal counter/slot release.
