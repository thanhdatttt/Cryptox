# ADR-001: Use WebSocket Only for Realtime Market Data

## Status

Accepted — 2026-08-13

- **Last reviewed:** 2026-08-27
- **Related decisions:** [ADR-005](./ADR_005_module_first_structure.md), [ADR-006](./ADR_006_local_backtest_execution.md)
- **Canonical architecture:** [Architecture](../architecture.md)

### 2026-08-27 scope clarification

This decision remains accepted for its transport boundary: WebSocket is for normalized realtime market data only, while commands and queries use REST. Authentication is deferred from the MVP, so the historical word "authenticated" below does not establish an active authentication requirement. The historical `202 Accepted` guidance applies when a command is exposed as asynchronous; this ADR does not require every bounded-local operation to use that response status.

## Context

The dashboard must display live ticks/candles and exchange connection health without repeatedly polling `GET /price`. Other frontend features — strategy configuration, Search Run progress, experiments, Leaderboard, and news — tolerate request/response latency and do not require a permanent push channel.

Using WebSocket for every backend state change would create a second API model, reconnect/resubscribe behavior, and message ordering concerns without a matching MVP driver.

## Decision

- Use one authenticated WebSocket gateway only for normalized `MarketTick`, `Candle`, and `MarketDataConnectionStatus` messages.
- Load historical chart data through REST before subscribing to realtime updates.
- Use REST for strategy/search commands and for progress, backtest, Experiment, Leaderboard, and News/Sentiment queries.
- An asynchronous command returns `202 Accepted` with a resource identifier; the frontend polls that resource while it is active.
- Do not push `LeaderboardUpdated`, `StrategyEvaluated`, `NewsCollected`, or other domain events to the browser.

## Alternatives Considered

1. **Poll all market prices through REST** — rejected because it creates unnecessary traffic and poorer realtime behavior.
2. **Use WebSocket for every frontend feature** — rejected because most features are naturally request/response and do not justify connection-state complexity.
3. **Use Server-Sent Events for all updates** — viable for one-way streams, but does not simplify the current split enough to replace the selected market WebSocket.

## Consequences

- Positive: the realtime requirement is met with a narrow, testable channel.
- Positive: frontend data access remains conventional REST for most features.
- Positive: WebSocket reconnect logic cannot affect Search Runs or backtest completion.
- Negative: active Search Run pages generate periodic REST reads.
- Negative: the UI may display progress or Leaderboard changes one polling interval after they are persisted.

## Evidence

- Disconnect/reconnect the market WebSocket and verify automatic recovery plus missing-candle reconciliation.
- Close the browser during a Search Run, reopen it, and verify progress is reconstructed through REST.
- Verify that no non-market WebSocket message types exist in the public contract.
