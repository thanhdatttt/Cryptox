# Frontend Capability

## Purpose and boundary

The frontend presents market charts, descriptor-driven strategy selection/configuration, manual backtesting, Search Runs, results, rankings, trade markers, News, and Sentiment. It is a presentation client: business rules, provider normalization, strategy analysis, simulation, metric calculation, and ranking stay in backend capabilities.

## Requirements

### Requirement: Independent multi-timeframe market dashboard

The frontend MUST display candlestick charts for up to four independently configurable timeframes. It MUST load historical data before applying normalized realtime market updates, display connection state, and recover after reconnect without cross-changing another chart.

Traceability: `CSL-R-FE-01`, `CSL-R-MD-02`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DL-01`; ADR-001.

### Requirement: Descriptor-driven strategy and search workflows

The frontend MUST derive available strategies and parameter controls from public descriptors rather than hard-coded strategy names. It MUST support selecting/configuring a strategy or composite, submitting a manual backtest, starting Random Search with finite stop conditions, and reading progress through request/response APIs.

Traceability: `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-BT-01`.

### Requirement: Explainable results and auxiliary information

The frontend MUST present required evaluation metrics, configurable Top-K results, selected-strategy overlays, Buy/Sell and Entry/Exit markers, News, and available Sentiment. Missing Sentiment MUST be shown as unavailable/degraded and MUST NOT block charts or core strategy/backtest flows.

Traceability: `CSL-R-EV-01`, `CSL-R-LB-01`, `CSL-R-VIS-01`, `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-DM-01`.

### Requirement: Authenticated private workflows

The frontend MUST support registration, login, current-session restoration, logout,
and protected private-resource navigation. It MUST NOT send or store an arbitrary
owner identity as authorization evidence, and MUST clear private cached data when
the authenticated user changes or logs out.

Traceability: `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-DM-01`; ADR-008.

### Requirement: Approved chart renderer and real final data path

Candlesticks MUST be rendered through the installed `lightweight-charts` 4.2.3 or
current compatible locked version from normalized REST/WebSocket state. Typed fake
clients MAY support development/tests, but final/demo mode MUST use real configured
providers and MUST NOT silently select fake Market Data, News, Auth, Backtest, or
Leaderboard responses.

Traceability: `CSL-R-RD-01`, `CSL-R-FE-01`, `CSL-R-DM-01`.

## Approved behavior and invariants

- REST handles commands and non-market queries; WebSocket carries only normalized realtime market messages.
- Search and backtest progress is read through request/response APIs rather than the market WebSocket.
- Strategy, evaluation, and ranking logic MUST NOT be duplicated in the client.
- Chart and trade rendering MUST use backend-owned normalized contracts and preserve timeframe identity.
- Loading and resource limits MUST be explicit/configurable; the frontend MUST NOT assume a fixed historical page size.
- The chart library MUST NOT own Market Data normalization, Strategy, Backtest, Evaluation, or ranking logic; a custom candlestick engine is not MVP work.

## Executable public API and status

There is no current frontend `api/index.ts` public barrel. The frontend's backend-facing behavior is supported by the existing module barrels [`market-data`](../../../modules/market-data/api/index.ts), [`strategy`](../../../modules/strategy/api/index.ts), [`search`](../../../modules/search/api/index.ts), [`backtesting`](../../../modules/backtesting/api/index.ts), [`evaluation`](../../../modules/evaluation/api/index.ts), [`leaderboard`](../../../modules/leaderboard/api/index.ts), [`news`](../../../modules/news/api/index.ts), and [`sentiment`](../../../modules/sentiment/api/index.ts), projected through REST and the market-only WebSocket contracts. Most server operations and the current UI remain scaffolding; these links do not authorize direct client imports.

## Failure expectations

- Invalid controls are reported before submission and backend validation errors remain visible and actionable.
- Market disconnect displays stale/disconnected state while bounded recovery proceeds; it does not silently present frozen data as live.
- Search/backtest polling failure preserves the last known state and permits a later refresh.
- News or Sentiment failure degrades only those panels; charts, strategy configuration, and result reads continue.

## Acceptance scenarios

#### Scenario: Four charts are independent

- **Given** four visible charts with distinct timeframe selections
- **When** one chart's timeframe changes
- **Then** only that chart reloads/resubscribes and the other three retain their state

#### Scenario: Strategy controls come from descriptors

- **Given** a newly registered conforming strategy descriptor
- **When** the strategy screen loads
- **Then** the strategy and its validated parameter controls appear without a frontend core branch for its name

#### Scenario: Search progress uses the command/query boundary

- **Given** an active bounded Search Run
- **When** the frontend requests its progress
- **Then** current status, counts, failures, and ranking are returned through request/response APIs without widening the market WebSocket

#### Scenario: Results are explainable

- **Given** a completed Experiment
- **When** its result view opens
- **Then** required metrics, relevant provenance, candlesticks, and Buy/Sell plus Entry/Exit markers are presented

#### Scenario: Sentiment outage is degraded

- **Given** News remains readable while Sentiment is unavailable
- **When** the dashboard is viewed
- **Then** News and core trading views remain usable and Sentiment is marked unavailable

#### Scenario: Authenticated user changes

- **Given** User A has viewed private resources and then logs out
- **When** User B logs in
- **Then** User A's cached Strategies, Backtests, and Leaderboard are not displayed to User B

#### Scenario: Final chart uses real normalized data

- **Given** final/demo configuration
- **When** the market dashboard starts
- **Then** `lightweight-charts` renders normalized real Binance history/realtime data and no mock provider is silently selected
