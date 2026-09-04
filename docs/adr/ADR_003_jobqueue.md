# ADR-003: Restrict asynchronous messaging to durable backtest jobs

## Status

Accepted — implemented.

## Context

Backtesting is CPU-heavy, retryable, and the one workload that benefits from independently scalable workers. Most core module collaboration remains inside one backend process and is easier to reason about with explicit typed calls and transactions. A general event bus would add ordering, duplicate-delivery, versioning, and eventual-consistency cost without a current driver.

## Decision

- Use Redis-backed BullMQ as the only asynchronous business boundary.
- Backtesting owns queue dispatch, terminal signal adaptation, reconciliation, and completion processing.
- Queue payloads live in `packages/contracts/queue` and are versioned.
- Candidate state in PostgreSQL is authoritative; queue events wake completion processing but do not become domain truth.
- Search submits/cancels candidates only through Backtesting's public API and does not touch BullMQ directly.

## Alternatives considered

1. Run all backtests in the API process — rejected because long work reduces API capacity and cannot scale independently.
2. Raw Redis Pub/Sub — rejected because it lacks durable competing-consumer job semantics.
3. Kafka/RabbitMQ/general Event Bus — deferred because BullMQ already supplies the required queue, retry, and backpressure behavior for this scope.

## Consequences

- Worker count can scale without changing domain code.
- Idempotent completion and retry/reconciliation logic are required.
- Redis remains a durable-runtime dependency, while ordinary module calls stay synchronous.

## Evidence and verification

- [`packages/contracts/queue/backtesting.ts`](../../packages/contracts/queue/backtesting.ts) is the canonical job/terminal-signal contract.
- [`modules/backtesting/infrastructure/queue/adapter.ts`](../../modules/backtesting/infrastructure/queue/adapter.ts) implements the BullMQ adapter/worker boundary.
- Demo: complete one job, force one retry, and show a single terminal candidate/experiment outcome.
- Benchmark separately before claiming worker throughput or average backtest duration.
