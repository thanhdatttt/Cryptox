# Frontend Capability

## Purpose

The frontend presents market charts, descriptor-driven strategy selection/configuration, manual backtesting, Search Runs, results, rankings, trade markers, News, and Sentiment. It is a presentation client: business rules, provider normalization, strategy analysis, simulation, metric calculation, and ranking stay in backend capabilities.

## Requirements

### Requirement: Independent multi-timeframe market dashboard

The frontend MUST display candlestick charts for up to four independently configurable timeframes. It MUST load historical data before applying normalized realtime market updates, display connection state, provider event/received time and last latency where available, and recover after reconnect without cross-changing another chart. Recent ticks are explicitly ephemeral and their restart loss MUST be represented as current delivery state, not historical/backtest data.

Traceability: `CSL-R-FE-01`, `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-DL-01`; ADR-001.

#### Scenario: Four charts are independent

- **Given** four visible charts with distinct timeframe selections
- **When** one chart's timeframe changes
- **Then** only that chart reloads/resubscribes and the other three retain their state

### Requirement: Descriptor-driven strategy and search workflows

The frontend MUST derive available strategies and parameter controls from public descriptors rather than hard-coded strategy names. It MUST support selecting/configuring a strategy or composite, submitting a manual synthetic paper backtest, starting an approved discovery profile with finite stop conditions, and reading progress through request/response APIs. It MUST make LLM draft, deterministic validation, missing-configuration/error, and explicit Save/Approve state distinct; it must not imply that draft generation automatically saves a Strategy Definition.

Traceability: `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-ST-05`, `CSL-R-ST-06`, `CSL-R-ST-07`, `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-SE-03`, `CSL-R-BT-01`, `CSL-R-BT-02`.

#### Scenario: Strategy controls come from descriptors

- **Given** a newly registered conforming strategy descriptor
- **When** the strategy screen loads
- **Then** the strategy and its validated parameter controls appear without a frontend core branch for its name

#### Scenario: Draft does not become a saved definition automatically

- **Given** a structured authoring draft or a failed/unconfigured authoring request
- **When** the Strategy workflow renders its backend state
- **Then** it exposes validation/error and requires explicit Save/Approve before
  showing a persisted version

#### Scenario: Search progress uses the command/query boundary

- **Given** an active bounded Search Run
- **When** the frontend requests its progress
- **Then** current status, counts, failures, and ranking are returned through request/response APIs without widening the market WebSocket

### Requirement: Explainable results and auxiliary information

The frontend MUST present required evaluation metrics, configurable Top-K results, selected-strategy overlays, Buy/Sell and Entry/Exit markers, News, and available Sentiment. Missing Sentiment MUST be shown as unavailable/degraded and MUST NOT block charts or core strategy/backtest flows.

Traceability: `CSL-R-EV-01`, `CSL-R-LB-01`, `CSL-R-VIS-01`, `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-DM-01`.

#### Scenario: Results are explainable

- **Given** a completed Experiment
- **When** its result view opens
- **Then** required metrics, relevant provenance, candlesticks, and Buy/Sell plus Entry/Exit markers are presented

### Requirement: Functional-state presentation without visual prescription

The frontend MUST present the backend-derived state needed to operate and audit
the approved flows: synthetic-paper trade direction/exit and execution profile;
discovery profile/budget/provenance; source/refresh and extraction-template draft
review state; and result/leaderboard provenance. It MUST use public normalized
contracts and must not reproduce any screenshot's layout, color, or pixel-level
styling as a requirement.

Traceability: `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`; DEC-007.

#### Scenario: Synthetic paper result is honestly labelled

- **Given** a completed Long or synthetic Short Experiment
- **When** its result is displayed
- **Then** trade direction, exit details, execution profile, and paper-simulation
  status are visible without representing the result as a live exchange order

#### Scenario: Sentiment outage is degraded

- **Given** News remains readable while Sentiment is unavailable
- **When** the dashboard is viewed
- **Then** News and core trading views remain usable and Sentiment is marked unavailable

### Requirement: Authenticated private workflows

The frontend MUST support registration, login, current-session restoration, logout,
and protected private-resource navigation. It MUST NOT send or store an arbitrary
owner identity as authorization evidence, and MUST clear private cached data when
the authenticated user changes or logs out.

Traceability: `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-DM-01`; ADR-008.

#### Scenario: Authenticated user changes

- **Given** User A has viewed private resources and then logs out
- **When** User B logs in
- **Then** User A's cached Strategies, Backtests, and Leaderboard are not displayed to User B

### Requirement: Approved chart renderer and real final data path

Candlesticks MUST be rendered through the installed `lightweight-charts` 4.2.3 or
current compatible locked version from normalized REST/WebSocket state. Typed fake
clients MAY support development/tests, but final/demo mode MUST use real configured
providers and MUST NOT silently select fake Market Data, News, Auth, Backtest, or
Leaderboard responses.

Traceability: `CSL-R-RD-01`, `CSL-R-FE-01`, `CSL-R-DM-01`.

#### Scenario: Final chart uses real normalized data

- **Given** final/demo configuration
- **When** the market dashboard starts
- **Then** `lightweight-charts` renders normalized real Binance history/realtime data and no mock provider is silently selected
## Approved behavior and invariants

- REST handles commands and non-market queries; WebSocket carries only normalized realtime market messages.
- Search and backtest progress is read through request/response APIs rather than the market WebSocket.
- Strategy, evaluation, and ranking logic MUST NOT be duplicated in the client.
- Chart and trade rendering MUST use backend-owned normalized contracts and preserve timeframe identity.
- Loading and resource limits MUST be explicit/configurable; the frontend MUST NOT assume a fixed historical page size.
- The chart library MUST NOT own Market Data normalization, Strategy, Backtest, Evaluation, or ranking logic; a custom candlestick engine is not MVP work.
- Frontend state is a projection of backend authorization, validation, and
  provenance; it cannot decide LLM approval, URL safety, template promotion,
  candle reconciliation, simulation fills, or ranking.

## Executable public API and status

There is no current frontend `api/index.ts` public barrel. The frontend's backend-facing behavior is supported by the existing module barrels [`market-data`](../../../modules/market-data/api/index.ts), [`strategy`](../../../modules/strategy/api/index.ts), [`search`](../../../modules/search/api/index.ts), [`backtesting`](../../../modules/backtesting/api/index.ts), [`evaluation`](../../../modules/evaluation/api/index.ts), [`leaderboard`](../../../modules/leaderboard/api/index.ts), [`news`](../../../modules/news/api/index.ts), and [`sentiment`](../../../modules/sentiment/api/index.ts), projected through REST and the market-only WebSocket contracts. Most server operations and the current UI remain scaffolding; these links do not authorize direct client imports.

## Failure expectations

- Invalid controls are reported before submission and backend validation errors remain visible and actionable.
- Market disconnect displays stale/disconnected state while bounded recovery proceeds; it does not silently present frozen data as live.
- Search/backtest polling failure preserves the last known state and permits a later refresh.
- News or Sentiment failure degrades only those panels; charts, strategy configuration, and result reads continue.
