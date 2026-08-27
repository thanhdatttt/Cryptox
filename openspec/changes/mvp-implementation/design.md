# Design

## Program boundary

Implementation preserves the accepted Synchronous Modular Monolith. Business
modules collaborate synchronously through public APIs; REST serves commands and
queries; WebSocket remains restricted to normalized realtime Market Data; Search
and manual callers use the mechanism-neutral Backtest Execution Port.

## Delivery model

1. Freeze shared contracts and approved behavior profiles.
2. Establish the minimal physical persistence model.
3. Implement pure/module capabilities in parallel with disjoint write scopes.
4. Integrate Candidate execution, Search, transports, frontend, and providers.
5. Prove every REQUIRED ID through automated acceptance evidence and the demo.

Pure computation is deliberately independent of live adapters: the simulator uses
deterministic candle fixtures and fake strategies; core Candidate/Experiment
orchestration uses controlled definitions and fakes before live integration; Random
Search begins against fake execution and ranking ports.

## Approved behavior decisions

The versioned decisions are defined in `docs/implementation/MVP_PLAN.md`:

- `LINEAR_REQUIRED_V1` ranking;
- `TECHNICAL_PROFILES_V1`;
- `MAJORITY_VOTE_V1` composite policy;
- CoinDesk Data API as the primary live News adapter;
- deterministic local `LEXICON_V1` Sentiment;
- configurable demo defaults.

These decisions are frozen for MVP V1 and are not to be re-opened by workers.

## Execution and handoff

`TASKS.md` is the only mutable task board. The Manager owns state transitions,
integration, validation, and checkpoint commits. `HANDOFF.md` is replaced after
each wave and contains only the latest resumable checkpoint.

OpenSpec CLI validation is currently unavailable and must remain reported as
UNVERIFIED until a separately approved tooling task restores it.
