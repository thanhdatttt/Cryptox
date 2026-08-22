# Spec: Trade Stop-Loss and Take-Profit Fields

## 1. Overview

This capability extends the Backtesting-owned `Trade` contract and `trades` table with optional stop-loss and take-profit prices. Its canonical targets are `docs/design/data-model.md` and `docs/design/component-contracts.md`, including the Backtest result and Experiment Trade Detail projections.

## ADDED Requirements

### Requirement: Persist optional risk-trigger prices
Each Trade MUST support nullable `stop_loss` and `take_profit` numeric prices. A present value MUST be finite and greater than zero; absence MUST remain valid for legacy trades and strategies without those controls.

#### Scenario: Trade with both controls
- **WHEN** a deterministic backtest opens a trade with stop-loss and take-profit trigger prices
- **THEN** both positive prices are stored on that Trade and returned unchanged in Trade Detail

#### Scenario: Legacy trade
- **WHEN** an existing Trade has neither risk control
- **THEN** it remains valid and its REST projection returns both values as absent or `null`

### Requirement: Risk fields use price semantics
`stopLoss` and `takeProfit` MUST represent the trigger prices selected for the Trade at entry, not percentages or final exit reasons. They MUST be persisted with the completed Attempt's Trades and MUST NOT change after completion.

#### Scenario: Stop-loss exit
- **WHEN** a Trade exits because its stored stop-loss price is reached
- **THEN** `stopLoss` retains the entry-time trigger price while `exitPrice` records the simulated fill price

### Requirement: Contract propagation is consistent
The Backtesting in-process `Trade`, persisted Backtest result representation, worker write path, Experiment hydration, and REST Trade Detail DTO MUST carry the two fields consistently. Queue completion/failure signals MUST remain reference-only.

#### Scenario: Completed worker result
- **WHEN** a worker persists completed Trades containing risk prices and emits its terminal signal
- **THEN** the Completion Processor hydrates the same values from PostgreSQL without embedding Trade payloads in the queue signal

## 3. Behavior

The simulator chooses optional trigger prices according to its pinned runtime and definition, writes them together with the Trade, and never recalculates them during an Experiment read.

## 4. Contracts

```typescript
export interface Trade {
  id: string;
  backtestAttemptId: string;
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  resultPercent: number;
  signal: "LONG" | "SHORT";
  stopLoss?: number;
  takeProfit?: number;
}
```

```sql
ALTER TABLE trades
  ADD COLUMN stop_loss NUMERIC CHECK (stop_loss > 0),
  ADD COLUMN take_profit NUMERIC CHECK (take_profit > 0);
```

## 5. Constraints

- Fields are nullable; this change does not synthesize defaults for historical data.
- Live exchange order placement is out of scope.
- Exit reason is not added by this change.

## 6. Acceptance Criteria

- [ ] Positive stop-loss/take-profit prices round-trip through persistence and Experiment Trade Detail.
- [ ] Null values remain valid and preserve old Trade behavior.
- [ ] Non-positive or non-finite values are rejected.
- [ ] Queue terminal signals remain result-reference/status messages only.

