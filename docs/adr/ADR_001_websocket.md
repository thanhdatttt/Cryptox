# ADR-001: Restrict WebSocket to realtime market data

## Status

Accepted — implemented.

## Context

The dashboard needs live ticks, candles, and upstream connection status. Strategy editing, search status, experiments, leaderboard, news, and sentiment are durable resources that can be read through ordinary request/response APIs. Pushing every domain change would create a second API model, ordering/reconnect concerns, and unnecessary coupling.

## Decision

- Expose one authenticated Socket.IO namespace, `/market`, for normalized market subscriptions and server updates only.
- Load historical candles through REST, then apply normalized realtime updates from the WebSocket.
- Keep strategy, search, backtest, experiment, leaderboard, news, and sentiment commands/queries on REST.
- The frontend never receives raw Binance payloads.

## Alternatives considered

1. Poll market prices only through REST — rejected because it increases latency and request volume for chart updates.
2. Push all backend state through WebSocket — rejected because most state has no realtime driver and needs a second delivery/ordering model.
3. Use Server-Sent Events everywhere — rejected because it does not improve the narrow market-subscription use case enough to justify another transport.

## Consequences

- Market reconnect logic stays isolated from search and backtesting.
- Active search/leaderboard pages use periodic REST reads and can be one polling interval behind durable state.
- A future non-market push channel requires a separate decision and evidence of need.

## Evidence and verification

- [`apps/backend/src/market.gateway.ts`](../../apps/backend/src/market.gateway.ts) exposes the `/market` gateway.
- [`packages/contracts/websocket/market-data.ts`](../../packages/contracts/websocket/market-data.ts) restricts the public message vocabulary to market messages.
- Demo: subscribe, disconnect/reconnect, and verify normalized status/candle recovery in the dashboard.
