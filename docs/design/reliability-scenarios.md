# Demonstrable reliability scenarios

This page is the presentation guide for rubric criterion 23. It documents two
scenarios that are implemented and covered by automated tests on the current
branch. A passing unit test proves the stated component behaviour; a live demo
is still required to claim a successful browser or external-provider run.

## Scenario 1 — Binance realtime disconnect is visible and recovery is bounded

**Question answered:** What happens if the upstream Binance WebSocket
disconnects?

**Expected behaviour**

1. The market-data subscription manager publishes `RECONNECTING` instead of
   silently leaving a chart stale.
2. It reconnects the complete, de-duplicated subscription set after a bounded
   exponential-backoff retry.
3. If an upstream connection cannot be opened, it publishes `DISCONNECTED`
   with an `UNAVAILABLE` error; it does not loop indefinitely.
4. The backend forwards only the normalized connection status on `/market`;
   the frontend renders that status separately from historical chart data.

**Automated evidence**

- [`subscription-manager.spec.ts`](../../modules/market-data/application/subscription-manager.spec.ts)
  simulates a disconnect, verifies `RECONNECTING`, runs the scheduled retry,
  and verifies the original subscription set is restored. Its second test
  verifies an unavailable upstream reaches `DISCONNECTED` after bounded retry.
- [`subscription-manager.ts`](../../modules/market-data/application/subscription-manager.ts)
  contains the production state machine and its eight-attempt default bound.
- [`service.ts`](../../modules/market-data/application/service.ts) broadcasts
  `CONNECTION_STATUS`; [`market.tsx`](../../apps/frontend/src/market.tsx)
  consumes that state in the dashboard.

Run the focused proof from the repository root:

```bash
npm run test --workspace=@cryptox/market-data -- application/subscription-manager.spec.ts
```

**Live presentation (optional, provider-dependent):** Start the application,
authenticate, open a `BTCUSDT` chart, briefly block the backend's access to
Binance, then restore it. Show the connection state changing from
`RECONNECTING` to `CONNECTED` (or the explicit `DISCONNECTED` fallback if
recovery is not available). Capture the status and a recovered candle. Do not
represent this as passed unless it was observed in the current environment.

## Scenario 2 — a backtest remains pinned to the exact strategy version

**Question answered:** How can a later strategy edit avoid changing the meaning
of an existing experiment?

**Expected behaviour**

1. Defining the same logical strategy with changed parameters creates a new
   immutable version; an identical definition is idempotent.
2. Each definition retains `strategyName`, `implementationVersion`,
   `implementationSha256`, and a unique version-specific id.
3. Backtest candidates reference those exact definition ids. Resolving an old
   definition requests the retained artifact by its SHA; if unavailable, the
   run fails explicitly rather than substituting the current built-in strategy.

**Automated evidence**

- [`service.spec.ts`](../../modules/strategy/application/service.spec.ts)
  verifies a changed MA definition becomes version 2 and verifies that a
  retained artifact is used instead of the current built-in implementation.
- [`service.ts`](../../modules/strategy/application/service.ts) assigns
  `version = previous + 1` and resolves the artifact using its SHA.
- [`component-contracts.md`](component-contracts.md) defines the immutable
  version-pinning rule; [`modules/backtesting/application/service.ts`](../../modules/backtesting/application/service.ts)
  executes the candidate's stored strategy definitions when replaying.

Run the focused proof from the repository root:

```bash
npm run test --workspace=@cryptox/strategy -- application/service.spec.ts
```

**Live presentation:** Create MA with `fastPeriod=20, slowPeriod=50`, then
create MA again with `fastPeriod=10, slowPeriod=50`. Show the two definitions
share a logical family but have different version/id. Run or inspect an
experiment created with the first definition; its saved definition id and
implementation hash must remain the first version. If the retained artifact
cannot be supplied, show the explicit `IMPLEMENTATION_ARTIFACT_UNAVAILABLE`
error—never silently run the new version.

## Deliberate scope

MACD is not currently registered by the project, so it is not used as evidence
for this criterion. The two scenarios above are selected because they match
implemented, testable behaviour and avoid presenting a planned plugin as a
completed feature.
