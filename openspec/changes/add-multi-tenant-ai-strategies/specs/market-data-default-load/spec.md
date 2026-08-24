# Spec: Market Data Default Historical Load

## 1. Overview

This capability updates `modules/market-data` page-query behavior. Its canonical targets are `market-data-spec.md` and the Market Data portion of `component-contracts.md`.

## ADDED Requirements

### Requirement: Omitted historical page limit defaults to 1000

For `GET /market/candles` and the equivalent `readCandles` page query with no explicit range and no `limit`, Market Data MUST use exactly 1000 as the effective limit and return the latest available closed-candle page in ascending timestamp order.

#### Scenario: Initial chart load without limit

- **WHEN** a caller requests candles for a valid pair/timeframe without a range, cursor, or limit
- **THEN** Market Data evaluates the request with `limit = 1000` and returns at most the latest 1000 closed candles

#### Scenario: Fewer than 1000 candles exist

- **WHEN** the authoritative store contains fewer than 1000 closed candles for the pair/timeframe
- **THEN** the response returns all available matching candles without fabricating missing history

### Requirement: Explicit and range queries retain established behavior

An explicit valid `limit` MUST override the 1000 default within the existing bounds. Explicit range queries, completeness policies, cursors, provider pagination, cache rules, and dataset snapshot creation MUST retain their existing semantics.

#### Scenario: Explicit smaller page

- **WHEN** a caller supplies `limit = 200`
- **THEN** Market Data uses 200 rather than the default 1000

#### Scenario: Snapshot creation

- **WHEN** Backtesting requests a sealed dataset snapshot for a complete explicit range
- **THEN** snapshot candle count is determined by that range and timeframe, not capped or padded to 1000

## 3. Behavior

The transport maps an omitted page limit to the constant `1000` before invoking the normal historical-read path. Existing validation, PostgreSQL/cache fallback, completeness metadata, and cursor binding then operate on that effective limit.

## 4. Contracts

```typescript
export const DEFAULT_HISTORICAL_CANDLE_LIMIT = 1000;

// Effective page rule:
// request.limit ?? DEFAULT_HISTORICAL_CANDLE_LIMIT
```

The response contract MUST expose its normal effective range/cursor/completeness metadata; no new database fields or tables are required.

## 5. Constraints

- The default applies to closed historical candle page loads only.
- Forming-candle inclusion remains opt-in.
- This change does not force every explicit request or provider call to exactly 1000.

## 6. Acceptance Criteria

- [ ] Omitted-limit page reads use 1000 deterministically.
- [ ] Explicit limits still work within existing validation bounds.
- [ ] Range reads and immutable snapshot behavior are unchanged.
- [ ] Returned candles preserve the existing chronological ordering and completeness contract.
