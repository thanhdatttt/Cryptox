# ADR-006: Use a Bounded Local Backtest Executor Behind an Execution Port for the MVP

- **Status:** Accepted
- **Decision date:** 2026-08-27
- **Decision owners:** Cryptox team
- **Supersedes:** [ADR-003](./ADR_003_jobqueue.md) for the current MVP execution topology
- **Amends:** [ADR-005](./ADR_005_module_first_structure.md) process and deployable-topology statements
- **Related decisions:** [ADR-001](./ADR_001_websocket.md), [ADR-007](./ADR_007_practical_reproducibility.md)
- **Canonical documents:** [Requirements](../requirements.md), [Architecture](../architecture.md)

## Context

The assignment requires correct historical backtesting, a bounded strategy-search loop, clear module boundaries, and a credible path to scale. It does not require distributed execution infrastructure for the MVP. The repository currently provides module and public-API scaffolding rather than an operational queue or worker runtime.

Making Redis, BullMQ, a separate worker deployable, delivery fencing, watchdogs, and reconciliation prerequisites would consume substantial effort before the core strategy-to-result path is demonstrated. At the same time, running an unrestricted compute loop inside a request handler would provide neither resource control nor an evolution seam.

## Decision

Cryptox will execute MVP backtests through a Backtest Execution Port owned by the Backtesting application boundary.

The active flow is:

```text
Manual submission or Search
  -> Backtest Execution Port
  -> Bounded Local Executor
  -> Backtester
  -> Evaluator
  -> Leaderboard
```

- Manual submission and Search depend on the execution port, not on a local executor, queue, or worker implementation.
- The MVP adapter is an in-process bounded local executor. It enforces configurable concurrency or resource limits and never starts an unbounded generation/execution loop.
- The Backtester remains deterministic domain/application logic behind the executor. Strategy analysis remains pure.
- Evaluation remains separate from Strategy and Backtester implementation. Leaderboard scoring/ranking remains a separate responsibility after evaluation.
- An execution returns or records a terminal success/failure outcome suitable for progress, duration, and error observability. The MVP does not adopt a distributed recovery protocol.
- REST remains the frontend command/query transport. WebSocket remains restricted to realtime market data under ADR-001. The execution port is not an Event Bus.
- A later queue/worker adapter may implement the same port without changing Search, Backtester, Evaluator, or Leaderboard callers.

Redis, BullMQ, a separate worker pool, queue-specific schemas, leases, fencing tokens, watchdogs, reconciliation, and distributed retry budgets are deferred. ADR-003 preserves the historical reasoning for that possible scale-out direction.

## Consequences

### Positive

- The MVP can demonstrate the complete architectural path with lower operational complexity.
- Bounded concurrency protects the backend from an uncontrolled search/backtest loop.
- The port keeps the execution mechanism replaceable and prevents queue concerns from leaking into Search or domain logic.
- Failures can be observed and tested without first implementing distributed delivery semantics.

### Trade-offs

- The MVP does not provide independent worker scaling, durable queued delivery, or recovery after process loss.
- Long-running execution remains limited by the capacity and lifecycle of one application process.
- Moving to distributed execution later requires a new adapter and an explicit operational decision, informed by measured need.

## Alternatives considered

1. **Run backtests in an unbounded synchronous loop.** Rejected because it can block request processing and exhaust resources.
2. **Require BullMQ and a separate worker pool now.** Rejected for the MVP because the operational and recovery complexity is not justified by current evidence. Its design history remains in ADR-003.
3. **Introduce a general Event Bus.** Rejected because the other modules collaborate more clearly through typed in-process APIs and market realtime already has a narrow WebSocket boundary.

## Verification

Implementation work following this ADR must demonstrate:

- a configurable bound on concurrent local executions;
- a bounded Search stop condition;
- one terminal success or failure result per submitted execution;
- observable duration and failure information; and
- the ability to substitute a test/future execution adapter without changing Search, Backtester, Evaluator, or Leaderboard contracts.

This ADR records target architecture. At acceptance time, `modules/backtesting/application/ports.ts` does not yet define the approved execution port; source reconciliation is a later implementation task.
