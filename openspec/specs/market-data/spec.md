# Market Data Capability

## Purpose and boundary

Market Data acquires Binance historical candlesticks and realtime updates, normalizes provider payloads, and exposes provider-neutral history and subscriptions. It owns candles, provider connection state, gap detection, and dataset provenance. Raw exchange payloads never cross the adapter boundary. REST is used for historical reads; the narrow market WebSocket is used only for normalized realtime market messages.

## Requirements

### Requirement: Provider-neutral Binance ingestion

The capability MUST validate pair and timeframe inputs and normalize Binance historical and realtime data into canonical candles, ticks, and connection status. Adding another exchange MUST be an adapter change that does not require frontend or strategy branching.

Traceability: `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-AR-01`; ADR-001 and ADR-005.

### Requirement: Historical and realtime continuity

Historical reads MUST be bounded and explicit about range, pagination, completeness, missing ranges, forming-candle inclusion, and observation time. No fixed page-size default is required. Realtime delivery MUST expose connection state, reconnect after interruption, and reconcile candles missed while disconnected. Duplicate or out-of-order provider input MUST not create duplicate closed candles.

Traceability: `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-FE-01`, `CSL-R-OB-01`.

### Requirement: Practical data provenance

A backtest MUST be able to identify its pair, timeframe, historical range, and dataset identity/version where practical. If exact retained data is unavailable, the recorded source provenance MUST state that limitation rather than imply exact replay.

Traceability: `CSL-R-RP-01`; ADR-007.

## Approved behavior and invariants

- Candle OHLC values MUST be finite, `high` MUST be at least `open`, `close`, and `low`, and `low` MUST be at most those values.
- Candle intervals MUST be ordered and non-overlapping for a pair/timeframe; the closed-candle key MUST be idempotent.
- Closed candles MUST not regress to forming state. Corrections MUST be observable and deterministic.
- Provider failure MUST be isolated at the adapter boundary and MUST NOT expose raw provider objects to consumers.
- Resource bounds, retry delays, and read limits MUST be configurable rather than architectural constants.

## Executable public API and status

The current executable public surface is [`modules/market-data/api/index.ts`](../../../modules/market-data/api/index.ts). It exposes `readCandles`, dataset provenance read/create operations, `subscribeMarketData`, and `shutdown`, and re-exports normalized market types. The functions currently throw `NOT_IMPLEMENTED`; this spec defines target behavior, not implementation status. REST and market WebSocket DTOs remain under `packages/contracts`.

## Failure expectations

- Invalid pairs, timeframes, ranges, limits, or cursors are rejected without contacting the provider.
- A partial history response identifies missing ranges; a completeness-required request fails explicitly rather than silently returning gaps.
- Disconnect, malformed payload, rate-limit, and provider timeout are observable; reconnect work is bounded.
- Shutdown stops new subscriptions and releases provider resources without fabricating final candles.

## Acceptance scenarios

#### Scenario: Historical data is normalized

- **Given** valid Binance candles for a pair, timeframe, and bounded range
- **When** a consumer reads historical candles
- **Then** it receives ordered canonical candles with completeness and provenance metadata, without Binance-specific shapes

#### Scenario: Realtime feed recovers a gap

- **Given** an active market subscription that disconnects after a closed candle
- **When** connectivity returns
- **Then** connection state is reported, missing candles are reconciled, and subsequent normalized updates continue without duplicates

#### Scenario: Four chart subscriptions remain independent

- **Given** four chart configurations with independently selected timeframes
- **When** one chart changes timeframe
- **Then** only that chart's history and subscription change

#### Scenario: A second provider is substituted

- **Given** a conforming provider adapter
- **When** it replaces Binance for a configured market
- **Then** consumers continue to use the same normalized API without provider-name branches
