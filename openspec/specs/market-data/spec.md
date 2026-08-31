# Market Data Capability

## Purpose

Market Data acquires Binance historical candlesticks and realtime updates, normalizes provider payloads, and exposes provider-neutral history and subscriptions. It owns candles, provider connection state, gap detection, and dataset provenance. Raw exchange payloads never cross the adapter boundary. REST is used for historical reads; the narrow market WebSocket is used only for normalized realtime market messages.

## Requirements

### Requirement: Provider-neutral Binance ingestion

The capability MUST validate pair and timeframe inputs and normalize Binance historical and realtime data into canonical candles, ticks, and connection status. Adding another exchange MUST be an adapter change that does not require frontend or strategy branching.

Traceability: `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DM-01`; ADR-001 and ADR-005.

#### Scenario: A second provider is substituted

- **Given** a conforming provider adapter
- **When** it replaces Binance for a configured market
- **Then** consumers continue to use the same normalized API without provider-name branches

### Requirement: Historical and realtime continuity

Historical reads MUST be bounded and explicit about range, pagination, completeness, missing ranges, forming-candle inclusion, and observation time. No fixed page-size default is required. Realtime delivery MUST expose connection state, reconnect after interruption, and reconcile candles missed while disconnected. Duplicate or out-of-order provider input MUST not create duplicate closed candles.

Traceability: `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-FE-01`, `CSL-R-OB-01`.

#### Scenario: Realtime feed recovers a gap

- **Given** an active market subscription that disconnects after a closed candle
- **When** connectivity returns
- **Then** connection state is reported, missing candles are reconciled, and subsequent normalized updates continue without duplicates

#### Scenario: Four chart subscriptions remain independent

- **Given** four chart configurations with independently selected timeframes
- **When** one chart changes timeframe
- **Then** only that chart's history and subscription change

### Requirement: Deterministic candle update and ephemeral observability

For one pair/timeframe, an incoming normalized candle with the same timestamp as
the latest forming or current candle MUST update that candle; a later timestamp
MUST append a new candle. `MARKET_OBSERVABILITY_V1` MUST expose provider event
time, received time, last latency, connection state, and only the latest 100
normalized ticks per pair in an in-memory ring buffer. This state MUST be marked
ephemeral, be lost on restart, remain a market-WebSocket concern, and MUST NOT be
used as Backtest or replay input.

Traceability: `CSL-R-MD-02`, `CSL-R-MD-03`; ADR-001.

#### Scenario: Same timestamp updates and later timestamp appends

- **Given** a subscription whose latest candle has timestamp `T`
- **When** a normalized candle for `T` arrives and then one for a later timestamp
  arrives
- **Then** the first update replaces the latest candle state and the second adds
  one later candle without a duplicate closed candle

#### Scenario: Recent ticks remain ephemeral

- **Given** 101 normalized ticks for one pair and a live market connection
- **When** Market Data exposes observability state and then restarts
- **Then** the state contains the most recent 100 ticks before restart and an
  explicitly empty/restarted ephemeral buffer afterward; no Backtest input changes

### Requirement: Practical data provenance

A backtest MUST be able to identify its pair, timeframe, historical range, and dataset identity/version where practical. If exact retained data is unavailable, the recorded source provenance MUST state that limitation rather than imply exact replay.

Traceability: `CSL-R-RP-01`; ADR-007.

#### Scenario: Historical data is normalized

- **Given** valid Binance candles for a pair, timeframe, and bounded range
- **When** a consumer reads historical candles
- **Then** it receives ordered canonical candles with completeness and provenance metadata, without Binance-specific shapes

### Requirement: Real Binance final delivery

Fixtures MAY validate normalization, gaps, reconnects, and deterministic consumers.
The delivered runtime and instructor demo MUST use the real configured Binance
historical REST and realtime WebSocket adapters and MUST NOT silently select a mock
Market Data provider.

Traceability: `CSL-R-RD-01`, `CSL-R-DM-01`.

#### Scenario: Final mode rejects mock-only Market Data

- **Given** final/demo configuration with no real Binance adapter
- **When** readiness or demo preflight runs
- **Then** required real-data evidence is unavailable and the condition is not reported as PASS
## Approved behavior and invariants

- Candle OHLC values MUST be finite, `high` MUST be at least `open`, `close`, and `low`, and `low` MUST be at most those values.
- Candle intervals MUST be ordered and non-overlapping for a pair/timeframe; the closed-candle key MUST be idempotent.
- Closed candles MUST not regress to forming state. Corrections MUST be observable and deterministic.
- A tick buffer contains no more than 100 normalized ticks for a pair and its loss
  after restart is an explicit state transition, not missing persisted market data.
- Provider failure MUST be isolated at the adapter boundary and MUST NOT expose raw provider objects to consumers.
- Resource bounds, retry delays, and read limits MUST be configurable rather than architectural constants.

## Executable public API and status

The current executable public surface is [`modules/market-data/api/index.ts`](../../../modules/market-data/api/index.ts). It exposes `readCandles`, dataset provenance read/create operations, `subscribeMarketData`, and `shutdown`, and re-exports normalized market types. The functions currently throw `NOT_IMPLEMENTED`; this spec defines target behavior, not implementation status. A market WebSocket contract exists under `packages/contracts`; the intended REST contract barrel is currently empty and remains a post-harness reconciliation item.

## Failure expectations

- Invalid pairs, timeframes, ranges, limits, or cursors are rejected without contacting the provider.
- A partial history response identifies missing ranges; a completeness-required request fails explicitly rather than silently returning gaps.
- Disconnect, malformed payload, rate-limit, and provider timeout are observable; reconnect work is bounded.
- Shutdown stops new subscriptions and releases provider resources without fabricating final candles.
