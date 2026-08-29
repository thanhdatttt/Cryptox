# Spec: Market Data Module (`modules/market-data`)

Status: proposed implementation baseline — audited and refined

This spec is the behavior and contract source for `modules/market-data`. It
refines the existing market-data contracts in `docs/design/component-contracts.md`
and the storage model in `docs/design/data-model.md` without changing the
repository's selected transport architecture.

## 1. Overview

### Purpose

`modules/market-data` provides normalized market observations and immutable
candle datasets to the rest of Cryptox. It hides exchange-specific payloads,
normalizes provider data, persists authoritative closed candles, serves
historical chart data through the Backend REST surface, and delivers realtime
ticks, candles, and provider connection status through the market-only
WebSocket.

The module is an internal business module in the synchronous Modular Monolith.
It is not a microservice, a message broker, an indicator engine, or a strategy
runtime.

### Scope

In scope:

- Canonical `Pair` and `Timeframe` validation.
- Provider capability and adapter abstraction.
- Binance historical REST ingestion.
- Binance realtime tick and candle-stream ingestion.
- Normalization of provider payloads into the existing `Candle`, `MarketTick`,
  `MarketDataConnectionStatus`, and `DatasetSnapshotRef` contracts.
- Historical chart reads through the Backend REST adapter.
- Realtime market delivery through the market-only WebSocket adapter.
- Forming-candle updates and closed-candle persistence.
- Redis latest-value cache management with PostgreSQL fallback.
- Reconnect, bounded retry, missed-data reconciliation, and connection status.
- Duplicate, out-of-order, gap, malformed-data, and correction handling.
- Immutable content-addressed candle dataset snapshots for backtests.
- Module observability and operational failure reporting.

Out of scope:

- Indicator calculation or `StrategyContext` construction.
- Strategy, composite, Buy/Sell/Hold, or position decisions.
- Backtest orchestration, queueing, evaluation, search, or leaderboard logic.
- News, sentiment, or model inference.
- Frontend business logic or chart rendering.
- A general-purpose Event Bus, domain-event catalog, Redis Pub/Sub, Kafka,
  RabbitMQ, or a new microservice boundary.

### Ownership and actors

| Actor | Allowed interaction |
|---|---|
| `apps/backend` REST adapter | Calls `readCandles`; maps the result to the existing historical REST contract. |
| `apps/backend` market WebSocket gateway | Calls `subscribeMarketData`; forwards only normalized market messages. |
| `apps/backend` composition root | Calls `createMarketDataModule` and supplies concrete infrastructure adapters through the bootstrap boundary. |
| `modules/backtesting` | Calls the public snapshot creation/read contract; it never reads the `candles` or snapshot tables directly. |
| `apps/backtest-worker` | Reads sealed snapshot data through `createMarketDataSnapshotReader` when the worker process requires it; it never imports Market Data repositories or provider adapters. |
| `modules/strategy` | Receives caller-mapped `StrategyCandle` values; it does not depend on Market Data domain or infrastructure internals. |
| Frontend | Uses Backend REST for historical data and the market-only WebSocket for normalized realtime data; it never calls Binance. |
| Provider adapter (Binance first) | The only component allowed to know its provider's REST/WebSocket payload shapes, symbol mappings, stream names, and provider error details. |

### Module boundary

The public runtime surface is the allowlisted Market Data API. Other modules
and apps may import `modules/market-data/api` or its approved bootstrap facade
only. They may not import `modules/market-data/domain` or
`modules/market-data/infrastructure` directly.

```text
apps/backend REST/WebSocket
              |
              v
modules/market-data/api
              |
              v
modules/market-data/application
              |
              v
modules/market-data/domain
              ^
              |
modules/market-data/infrastructure
  (repositories, cache, Binance adapter)
```

Raw Binance payloads stop at the infrastructure adapter. No raw provider
object, provider-specific enum, provider error, stream name, or exchange
timestamp field may cross the public Market Data boundary.

## 2. Requirements

The PDF contains both requirements and teaching examples. The classifications
below prevent examples from becoming accidental hard-coded contracts.

| Source idea | Class | Market Data interpretation |
|---|---|---|
| Obtain cryptocurrency market data from Binance | MUST | Binance historical and realtime adapters are required for the MVP. |
| Show realtime candlestick data and avoid repeated price polling | MUST | Historical bootstrap uses REST; subsequent normalized market updates use the market-only WebSocket. |
| Support up to four charts with independently changeable timeframes | MUST for the dashboard use case | The dashboard may maintain at most four chart subscriptions. Market Data itself does not impose a four-subscription domain limit. |
| Keep the frontend independent from Binance payloads | MUST | Frontend consumes canonical REST/WebSocket contracts only. |
| Add another provider without rewriting downstream components | SHOULD | A provider is added through adapter registration and capability mapping; existing canonical contracts remain stable. |
| Reconnect, retry, and recover missed candles after Binance disconnects | SHOULD and required for reliability | The provider connection state machine and reconciliation flow are normative in this spec. |
| Preserve data for historical analysis and backtesting | MUST | Closed candles are authoritative in PostgreSQL; snapshots are sealed and content-addressed. |
| Handle scale and low-latency realtime delivery | SHOULD | Bounded caches, asynchronous provider I/O, and observable reconciliation are required; no unapproved SLA is invented. |
| OKX, Bybit, Coinbase, multiple exchanges, or future timeframes | MAY | The adapter boundary supports them, but only Binance and the current canonical timeframe set are MVP scope. |
| Exact symbols such as `BTCUSDT` | ILLUSTRATIVE | Used as a valid example, not an allowlist. Pair validation is capability-based. |
| The sample set `1m`, `5m`, `15m`, `1h`, `4h`, `1d` | ILLUSTRATIVE in the PDF, canonical in this repository | The current project contract intentionally defines these six `Timeframe` values. Extending them requires a coordinated contract and migration decision. |
| Four-chart layout and the exact order `5m`, `15m`, `1h`, `4h` | ILLUSTRATIVE | Layout and selected values belong to the dashboard use case. |
| `GET /price` polling, exact Binance routes, raw payload examples | ILLUSTRATIVE | The existing repository REST surface is `GET /market/candles`; external Binance routes remain adapter internals. |
| `MarketPriceUpdated`, `CandleClosed`, `LEADERBOARD_UPDATED`, or similar names | ILLUSTRATIVE | No domain events are introduced. WebSocket transport messages are scoped to market delivery and are not an Event Bus. |
| MA, RSI, Bollinger, Support/Resistance, and chart overlays | Out of scope for Market Data | Market Data supplies candles/ticks only; Strategy and Frontend own their respective behavior. |

### Terminology

### Pair

`Pair` is the canonical exchange-independent market symbol, represented as a
non-empty string. The canonical form is trimmed uppercase ASCII with no
whitespace or control characters. The module does not parse a pair by guessing
where the base asset ends; provider-specific symbol mapping stays inside the
adapter.

A pair is valid for an operation only when the selected provider advertises
support for it. A syntactically valid but unsupported pair returns
`UNSUPPORTED_PAIR`.

### Provider and provider connection

`ProviderId` identifies a registered market-data provider, for example
`BINANCE` or `OKX`. It is a canonical uppercase identifier, not a raw provider
object. It MUST be non-empty and match the provider identifier form
`[A-Z0-9][A-Z0-9_-]*`. A provider connection is the
infrastructure-managed historical or realtime session associated with one
`ProviderId`.

The public connection status is provider-level. Pair/timeframe subscription
failure is reported as a subscription error and does not create a new provider
state.

### Timeframe and candle interval

The current canonical `Timeframe` values are:

```text
1m | 5m | 15m | 1h | 4h | 1d
```

Each value maps to one fixed duration in seconds. The mapping is owned by the
Market Data domain and is used for timestamp alignment, gap detection, and
snapshot completeness. An implementation must not infer duration from a
provider payload.

The timeframe grid is anchored at the Unix epoch in UTC. An instant is aligned
to a timeframe when its UTC epoch-microsecond value is divisible by the
timeframe duration in microseconds. This same rule applies to candle open
timestamps and to both endpoints of a range that is used for completeness or a
snapshot.

The current project mapping is:

| Timeframe | Duration | Candle interval |
|---|---:|---|
| `1m` | 60 seconds | `[open, open + 60s)` |
| `5m` | 300 seconds | `[open, open + 300s)` |
| `15m` | 900 seconds | `[open, open + 900s)` |
| `1h` | 3,600 seconds | `[open, open + 3,600s)` |
| `4h` | 14,400 seconds | `[open, open + 14,400s)` |
| `1d` | 86,400 seconds | `[open, open + 86,400s)` |

All timestamps in public contracts are ISO-8601 UTC strings. A candle's
`timestamp` is its interval open time. Its exclusive interval end is derived
from `timeframe`; it is not a second timestamp hidden in a provider payload.

### Tick

A `MarketTick` is a normalized point observation for a pair at a provider event
timestamp. Ticks are realtime delivery data and are not an authoritative
historical record. Its price is a finite, strictly positive quote-currency
value and its timestamp is a UTC instant that is not in the future under the
configured clock-skew policy. The module does not promise exactly-once tick
delivery.

### Candle

A `Candle` is an OHLCV value for one canonical pair, timeframe, and interval
open. A forming candle may still change. A closed candle is finalized for the
current provider view and is eligible for PostgreSQL persistence and snapshot
creation.

### Forming candle and closed candle

- `isClosed = false` means the interval is still forming and later normalized
  updates may replace its values.
- `isClosed = true` means the interval is closed. Normal stream updates must not
  reopen it. A provider correction is a separate explicit correction path and
  never mutates an already sealed dataset snapshot.

### Historical range

All ranges use the half-open form `[from, to)`. `from` is included and `to` is
excluded. A range is valid only when `to > from` and both endpoints are UTC
instants aligned to the requested timeframe grid. Range alignment is required
for both `ALLOW_PARTIAL` and `REQUIRE_COMPLETE`; the caller does not receive a
silently rounded range.

### Data gap and partial result

A gap exists when an expected candle open time in a requested range has no
valid closed candle. `missingRanges` are sorted, non-overlapping, half-open
ranges formed by coalescing adjacent missing intervals. A historical chart
read may return a partial result when the caller allows it, but a backtest
dataset snapshot must reject gaps.

### Data correction

A correction is a provider-authoritative value for an already known candle
identity whose OHLCV differs from the persisted live/history row. It is not a
normal duplicate. A historical/reconciliation observation is correction
eligible; a differing realtime close is quarantined and triggers reconciliation
instead of overwriting a closed row. The live row may be corrected through the
explicit correction path, the affected cache is invalidated, and every already
sealed snapshot remains unchanged. A future snapshot receives a new hash if
its content differs.

### Dataset snapshot

A dataset snapshot is a sealed, content-addressed ordered set of closed candles
for one pair, timeframe, and half-open range. Its `sha256` is computed from a
canonical serialization of the normalized identity and ordered OHLCV values.
Backtesting references a snapshot ID/hash, never a mutable date-range query.

### Functional requirements

### Provider abstraction and normalization

#### FR-MD-001 - Provider adapter boundary

The module MUST access an exchange only through a registered provider adapter.
The adapter MUST expose capabilities for supported pairs and timeframes,
historical fetch, realtime connection, and connection close. Binance MUST be
the first registered provider.

The adapter MAY use any Binance-specific REST/WebSocket route or payload shape
internally. It MUST map raw provider payloads to the internal normalized
observation contract before returning or invoking an application callback. No
raw provider object, route, payload field, provider error, or sequence type may
appear in an application port, public module contract, REST response, WebSocket
payload, log field intended for consumers, or cross-module API.

#### FR-MD-002 - Pair validation

Every public historical, realtime-subscription, and snapshot command MUST
validate the canonical pair before provider I/O. It MUST reject empty,
whitespace-containing, non-uppercase, or control-character pairs with
`INVALID_PAIR` and reject provider-unsupported pairs with `UNSUPPORTED_PAIR`.

The module MUST return the canonical pair in every normalized response. It MUST
not silently uppercase or otherwise rewrite a caller's invalid input; callers
may normalize before validation as an explicit client concern.

#### FR-MD-003 - Timeframe validation

Every public operation MUST validate the timeframe against the current
canonical union. A non-string or malformed transport value MUST return
`INVALID_TIMEFRAME`; a well-formed value outside the canonical union MUST
return `UNSUPPORTED_TIMEFRAME`, both without provider I/O. The provider adapter
MUST map the canonical timeframe to its own interval representation internally.

The four-chart dashboard limit MUST NOT be encoded as a Market Data domain
limit, provider capability limit, database constraint, or snapshot constraint.

#### FR-MD-004 - Binance historical ingestion

The Binance adapter MUST support historical closed-candle retrieval for every
currently supported pair/timeframe that Binance advertises. The application
layer MUST validate, deduplicate, and persist the adapter's normalized provider
observations before returning a historical response whose completeness metadata
matches the caller's requested mode.

The adapter MUST surface provider unavailability, rate limiting, malformed
responses, and partial retrieval as typed internal failures. Raw provider
errors do not cross the module boundary. `UNAVAILABLE` maps to
`PROVIDER_UNAVAILABLE`, `RATE_LIMITED` maps to `PROVIDER_RATE_LIMITED`, and
`MALFORMED_RESPONSE` maps to `PROVIDER_PAYLOAD_INVALID`; authentication
failure is reported as non-retryable `PROVIDER_UNAVAILABLE` without exposing
credential details.

#### FR-MD-005 - Binance realtime ingestion

The Binance adapter MUST support realtime tick input and realtime candle
updates for supported pair/timeframe subscriptions. It MUST deliver only
normalized provider observations to the application. Provider connection
details, stream names, sequence fields, and raw event timestamps remain
adapter-internal.

The application layer MUST treat provider candle updates as the source for
forming/closed candle OHLCV state. It MUST NOT fabricate a closed candle from
partial ticks unless a future accepted provider adapter contract explicitly
declares that behavior.

#### FR-MD-006 - Canonical normalization

Every provider observation crossing from infrastructure to application MUST be
mapped to the internal normalized observation contract and then validated into
one of the canonical contracts below. Normalization MUST:

- use the canonical uppercase pair;
- use a canonical `Timeframe` value;
- convert timestamps to UTC ISO-8601;
- convert all numeric fields to finite numbers in the canonical units;
- preserve the provider's closed/forming truth for candle updates;
- reject unsupported or ambiguous provider values rather than guessing.

The same validation MUST reject a future tick timestamp, not only a future
candle timestamp. A provider observation with no reliable ordering evidence
MUST NOT overwrite a closed candle; reconciliation is the recovery path.

### Historical reads and persistence

#### FR-MD-007 - Historical chart bootstrap

The module MUST provide historical closed candles through its public
`readCandles` API. The Backend REST adapter MUST expose the existing planning
surface `GET /market/candles` and map query/response data without leaking
provider details.

The default historical response MUST contain closed candles only. A caller may
request the current forming candle only through an explicit optional flag; a
forming candle MUST never be included in a sealed dataset snapshot. When
`includeForming=true`, the response MUST set `formingIncluded=true` only when
the current forming value was actually available from the forming cache or a
non-closed PostgreSQL row; a cache miss MUST NOT be represented as a forming
candle.

#### FR-MD-008 - Historical completeness

Historical reads MUST support both:

- `ALLOW_PARTIAL`: return valid available candles with `complete = false` and
  explicit `missingRanges` when a requested range cannot be fully supplied.
- `REQUIRE_COMPLETE`: return a typed completeness error instead of pretending
  that a partial range is complete.

The default mode for `readCandles` and `GET /market/candles` is
`ALLOW_PARTIAL`. Callers MUST opt into `REQUIRE_COMPLETE` for workflows that
need a gap-free range. Snapshot creation MUST always use
`REQUIRE_COMPLETE`.

For a range-based query, `from` and `to` are both required and MUST be aligned.
For a page query without a range, an omitted `limit` uses the fixed
`DEFAULT_HISTORICAL_CANDLE_LIMIT = 1000`; an explicit `limit` means the latest
closed-candle page for the pair/timeframe. The response range is the effective
coverage of that page; `complete` describes only whether that effective page
has no internal gaps, not whether all historical data exists. `limit` MUST be
a positive integer and MUST NOT exceed the configured maximum. A range query
without `limit` keeps its existing range/snapshot semantics and uses the
configured range-page bound. A requested range span
or page size beyond configured bounds returns `RANGE_TOO_LARGE`; no query is
allowed to create an unbounded result.

Every cursor is opaque, bound to the pair/timeframe/range/limit/
`includeForming`/completeness query fingerprint, and ordered by ascending
candle timestamp. A malformed, expired, or mismatched cursor returns
`INVALID_CURSOR` without provider I/O.

If historical data is missing from PostgreSQL and the provider is available,
the application MAY hydrate the missing range through the provider adapter,
persist validated results, and retry the read. If the provider is unavailable,
the module MUST return the valid database data plus completeness metadata or a
typed error according to the requested completeness mode.

#### FR-MD-009 - Closed-candle persistence

Every valid closed candle received from realtime processing or historical
reconciliation MUST be persisted in PostgreSQL before it is treated as
authoritative historical data.

The canonical live identity MUST be `(pair, timeframe, timestamp)`. The normal
closed-candle write MUST be idempotent. A forming update MAY be held in Redis
and MAY also be represented by a non-closed PostgreSQL row, consistent with the
existing `candles.is_closed` model; only closed rows are authoritative for
historical completeness and snapshots.

#### FR-MD-010 - Latest-value cache

The module MUST maintain the existing cache responsibilities:

| Cache key | Content | Authority |
|---|---|---|
| `ticks:latest:{pair}` | Latest normalized tick plus `schemaVersion` and `asOf` | Ephemeral optimization only |
| `candles:latest:{pair}:{timeframe}` | Bounded latest candle window plus `schemaVersion`, `asOf`, and `completeThrough` | Ephemeral optimization only |
| `connection:status:{provider}` | Latest normalized provider status | Ephemeral optimization only |

The module MUST treat a candle cache entry as fresh only when its `asOf` is no
older than `2 x timeframe interval` and it declares `completeThrough`, the
exclusive UTC boundary immediately after the last contiguous closed candle.
`asOf` is the module-clock time at which the cache entry was produced. A tick
cache entry MUST use the existing five-second freshness rule.

A candle cache entry may satisfy a historical query only when the requested
effective range is covered by the cache window and its `completeThrough`
boundary proves the requested closed intervals are complete; otherwise the
module MUST read PostgreSQL.

Cache miss, stale data, invalid JSON/schema, or cache unavailability MUST fall
back to PostgreSQL for historical/closed-candle reads. Redis MUST never be the
source of truth for snapshots or lifecycle decisions. Because the accepted
data model does not persist `MarketTick`, a tick-cache miss or stale tick has
no PostgreSQL fallback; the module MUST report no cached tick and wait for the
next realtime tick rather than fabricate one.

### Candle lifecycle and quality

#### FR-MD-011 - Forming-candle lifecycle

For one candle identity, the allowed normal lifecycle is:

```text
absent -> FORMING -> CLOSED
absent ----------------> CLOSED   (historical bootstrap/reconciliation)
CLOSED -> CLOSED        (explicit provider correction only)
```

The module MUST never transition a candle from `CLOSED` back to `FORMING`.
Repeated forming updates MUST replace the current forming representation for
the same identity. A close update MUST persist the final normalized value and
publish it as a closed `Candle` message after the authoritative write succeeds.

#### FR-MD-012 - Candle invariants

Every accepted candle MUST satisfy all of the following:

- `pair` and `timeframe` are valid canonical values;
- `timestamp` is UTC, finite, and aligned to the timeframe grid;
- `timestamp` is not in the future according to the module clock and the
  configured provider clock-skew policy;
- `open`, `high`, `low`, `close`, and `volume` are finite numbers;
- `open > 0`, `high > 0`, `low > 0`, `close > 0`, and `volume >= 0`;
- `high >= max(open, close, low)` and `low <= min(open, close, high)`;
- the candle identity is unique in the live store;
- a closed candle cannot be accepted as an older normal update that regresses
  a previously persisted correction or closure.

Invalid observations MUST be rejected or quarantined before persistence and
before WebSocket delivery. They MUST increment an observable invalid-data
counter with provider, pair/timeframe where safe, and reason.

#### FR-MD-013 - Duplicate and out-of-order handling

The module MUST be idempotent for identical provider observations. A duplicate
closed candle MUST not create a second database row, a second snapshot row, or
an observable duplicate correction.

Out-of-order input MUST be handled by candle identity and an adapter-provided
opaque ordering key retained inside the adapter/application boundary. A late
forming update MUST NOT reopen a closed candle. A late closed update with the
same canonical content is a duplicate; a differing value is handled only as a
correction when it came from historical/reconciliation input. If ordering is
unknown, the differing observation is quarantined and reconciliation is
requested; it is not silently applied.

The module MUST NOT promise global ordering or exactly-once delivery to
WebSocket clients. Consumers MUST merge candles by `(pair, timeframe,
timestamp)` and use `isClosed` plus timestamp to reconstruct the latest view.

#### FR-MD-014 - Gap detection

For any range requiring completeness, the module MUST compute expected candle
opens from the timeframe duration and identify missing intervals. A gap MUST
not be silently filled with synthetic OHLCV data.

Chart reads MAY expose gaps through `missingRanges`. Snapshot creation MUST
fail with `DATASET_GAP` until all expected closed candles exist. Reconciliation
MUST attempt provider historical retrieval for detected gaps before returning
the final completeness result.

#### FR-MD-015 - Correction policy

An identical closed update is idempotent. A changed value for a closed live
candle MUST:

1. be accepted only through an explicit correction/reconciliation path;
2. be validated using the same candle invariants;
3. update the mutable live/history row in PostgreSQL in one transaction;
4. invalidate the affected latest-candle cache before repopulation;
5. emit a correction metric and structured audit log; and
6. never update or delete an already sealed dataset snapshot.

If the corrected content is used in a future snapshot, the future snapshot MUST
have a new content hash and snapshot identity. Existing backtest references
remain reproducible.

### Connection, retry, and reconciliation

#### FR-MD-016 - Connection state machine

The provider connection MUST expose the existing public statuses:

```text
DISCONNECTED -> RECONNECTING -> CONNECTED
CONNECTED    -> RECONNECTING  (provider disconnect/error/heartbeat timeout)
RECONNECTING -> DISCONNECTED  (controlled shutdown or exhausted policy)
CONNECTED    -> DISCONNECTED  (controlled shutdown)
```

`RECONNECTING` includes an in-progress retry attempt. `DISCONNECTED` covers
both not-yet-connected and deliberately stopped states; the transport consumer
uses connection lifecycle context and the latest status message to distinguish
them when needed.

`lastEventAt` is the UTC timestamp of the latest provider frame observed. Before
the first provider frame, it is initialized to the connection state transition
time because the existing public field is non-optional.

#### FR-MD-017 - Reconnect and bounded retry

On an unexpected provider disconnect, the adapter MUST:

1. transition the provider status to `RECONNECTING`;
2. stop treating new realtime data as available;
3. preserve the last durable candle boundary per pair/timeframe;
4. retry using an injected bounded backoff policy with jitter;
5. re-establish the provider stream and requested subscriptions; and
6. start missed-data reconciliation before declaring the connection healthy.

The backoff policy MUST have finite delay, finite retry-attempt policy, and a
shutdown cancellation path. Exact delay values are operational configuration,
not a Market Data domain constant. Tests MUST inject a deterministic policy and
verify that the delay is bounded and cancellation stops further attempts.

#### FR-MD-018 - Missed-data reconciliation

After reconnect, and on startup recovery, the module MUST reconcile each
affected pair/timeframe from the last authoritative closed boundary through the
exclusive `closedThrough` boundary returned by the provider adapter.
Reconciliation MUST:

- use the provider historical adapter, not the WebSocket cache;
- validate that `closedThrough` is UTC, timeframe-aligned, and not beyond the
  configured provider clock-skew policy;
- validate every returned candle;
- detect and retry/fail explicit gaps;
- upsert idempotently;
- apply authoritative corrections through the correction path; and
- only then publish provider status as `CONNECTED` for the provider, and only
  after every accepted subscription on that provider has completed
  reconciliation. A single provider-level status MUST NOT be interpreted as
  per-subscription health; an individual subscription failure remains an
  explicit subscription error and keeps the provider degraded until recovered.

If reconciliation cannot complete, the provider status MUST remain
`RECONNECTING` or `DISCONNECTED` according to the retry policy, and the module
MUST expose the failure through metrics/logs. It MUST NOT claim that no candles
were missed merely because the WebSocket handshake succeeded.

#### FR-MD-019 - Provider failure isolation

A Binance REST or WebSocket failure MUST be contained inside Market Data. It
MUST NOT fail Strategy, Search, Backtesting, Evaluation, Leaderboard, News, or
Sentiment module control flow directly.

Existing PostgreSQL data remains readable during a provider outage. Realtime
consumers receive a normalized connection status, and historical callers
receive cached/database data, partial metadata, or a typed retryable error.

A PostgreSQL outage is not a provider disconnect. It MUST NOT be represented by
changing the provider connection status; instead the module MUST withhold
closed-candle delivery until the authoritative write succeeds, return
`MARKET_DATA_UNAVAILABLE` where applicable, and reconcile after PostgreSQL is
available again.

#### FR-MD-020 - Controlled shutdown

On application shutdown, the module MUST stop accepting new subscriptions,
cancel provider reconnect attempts, close provider streams, flush already
validated closed-candle writes, and release provider resources. It MUST NOT
create a dataset snapshot from an incomplete operation. A best-effort
`DISCONNECTED` status may be sent before the transport closes.

The public `shutdown()` operation is idempotent. After it resolves, new
subscriptions are rejected and a later subscription is allowed only after a
new module instance is composed.

### Dataset snapshots

#### FR-MD-021 - Snapshot creation and sealing

The module MUST provide a public snapshot-creation operation for a canonical
pair, timeframe, and `[from, to)` range. It MUST read only closed candles from
PostgreSQL, require complete coverage, and reject empty ranges, gaps, invalid
rows, or an unaligned range. `to <= from` returns `INVALID_RANGE`; an aligned
valid range with zero closed rows returns `DATASET_EMPTY`; a range with some
rows but one or more missing intervals returns `DATASET_GAP`.

Snapshot creation MUST:

- calculate the versioned canonical SHA-256 serialization defined in Section
  6.8 over pair, timeframe, range, ordered timestamps, and normalized OHLCV
  values;
- write snapshot metadata and all snapshot candle rows atomically;
- expose only a fully sealed snapshot after commit;
- return an existing sealed snapshot when the same content hash already exists;
- roll back all rows if interrupted before sealing; and
- prevent application-level update/delete of sealed snapshot content.

The `DatasetSnapshotRef` returned to callers MUST refer only to sealed content.

For this repository, sealing is a logical invariant rather than a new schema
column: a snapshot becomes sealed only when its parent and all child rows,
count, and hash have been verified in one committed PostgreSQL transaction.
No intermediate parent/child set is addressable through the public API.

#### FR-MD-022 - Snapshot read

Backtesting and approved workers MUST read snapshot metadata and candles by
snapshot identity through the public Market Data snapshot contract. In the
separately deployable worker, this is the read-only
`createMarketDataSnapshotReader` composition backed by PostgreSQL; it does not
instantiate provider or realtime adapters and does not query snapshot tables
directly. A snapshot
read MUST not fall back to mutable live candles, latest-value cache, or a new
provider fetch. If the requested snapshot is missing, unsealed, corrupted, or
hash-inconsistent, the API MUST return a non-retryable snapshot integrity error.
The snapshot seal, expected candle count, child-row identity, and content hash
MUST be verified before the first page is returned; a later page MUST not be
served from a different snapshot identity.

#### FR-MD-023 - Provider registration and selection

The Market Data module MUST support a provider registry at composition time.
The Binance adapter MUST be registered as the MVP default provider. Public
MVP queries use the configured default provider and therefore do not require a
provider field in the existing historical/chart or snapshot contracts.

The composition/bootstrap configuration MUST be able to register a second
provider and select it as the default without changing Frontend, Strategy,
Backtesting, Evaluation, Search, or Leaderboard contracts. If a future product
requirement needs per-request provider selection, that selection MUST be added
as an explicit versioned API field; it MUST NOT be inferred from pair syntax.

## 3. Behavior

### UC-MD-001 - Initial historical chart load

1. Frontend requests either an aligned pair/timeframe range or a bounded latest
   page from Backend REST.
2. Backend validates the transport DTO and calls `readCandles`.
3. Market Data validates canonical pair/timeframe and range.
4. Market Data reads a fresh cache only as an optimization; authoritative
   closed history comes from PostgreSQL.
5. If the database range is missing/partial and the provider is available,
   Market Data hydrates and persists validated closed candles.
6. Market Data returns ordered candles, completeness metadata, `formingIncluded`,
   and the module-clock `asOf` watermark.
7. Frontend renders the response and then subscribes to realtime updates.

### UC-MD-002 - Subscribe to realtime pair/timeframe data

1. WebSocket client sends an idempotent subscribe command with one or more
   canonical pair/timeframe subscriptions.
2. Gateway calls `subscribeMarketData` through the public API.
3. Market Data validates each item and returns an acknowledgement or typed
   per-item error.
4. Market Data ensures the provider connection is active and the adapter has
   the requested stream.
5. A duplicate subscription is acknowledged without creating a duplicate
   provider stream; removing the last subscription releases the idle stream.
6. Gateway receives only normalized tick, candle, and connection-status
   messages for the accepted subscriptions.

Changing one chart timeframe MUST unsubscribe/resubscribe only that chart's
subscription; it MUST NOT require a full page reload or alter other chart
subscriptions.

### UC-MD-003 - Receive a tick

1. Binance adapter receives a provider tick.
2. Adapter normalizes and validates pair, price, and UTC timestamp.
3. Market Data updates `ticks:latest:{pair}` and emits a normalized
   `MarketTick` to matching subscribers.
4. The tick is not inserted into the authoritative candle history table.

### UC-MD-004 - Update a forming candle and close it

1. Adapter receives a normalized candle update with `isClosed = false`.
2. Market Data validates interval identity and OHLCV invariants.
3. Market Data replaces the forming representation and updates the latest
   candle cache.
4. Adapter later receives a close update with `isClosed = true`.
5. Market Data validates and persists the closed candle in PostgreSQL.
6. After the database write succeeds, Market Data updates cache metadata and
   emits the closed canonical candle.

### UC-MD-005 - Reconnect after disconnect

1. Adapter detects socket close, provider error, or heartbeat timeout.
2. Status changes to `RECONNECTING` and is made available to market clients.
3. Adapter applies the injected bounded backoff policy.
4. Adapter reconnects and restores accepted subscriptions.
5. Market Data reconciles every accepted subscription from its durable boundary
   to the adapter's `closedThrough` boundary.
6. Only after all accepted subscriptions reconcile does provider status change
   to `CONNECTED`.
7. On failed/exhausted recovery, status remains degraded and the error is
   observable; existing PostgreSQL history remains readable.

### UC-MD-006 - Reconcile missed candles

1. For each affected pair/timeframe, determine the last persisted closed open
   time.
2. Request `closedThrough` and the provider historical range needed to reach
   that exclusive boundary.
3. Normalize and validate every result.
4. Detect missing expected intervals and retry/fail explicitly.
5. Upsert duplicates idempotently and apply proven corrections through the
   correction policy.
6. Refresh the latest-candle cache only after authoritative writes complete.

### UC-MD-007 - Handle duplicate or out-of-order input

1. Identify the candle by pair, timeframe, and open timestamp.
2. Ignore identical duplicates without duplicate persistence or correction
   metrics.
3. Reject a late forming update after closure.
4. Accept a differing closed value only when it is proven authoritative by the
   provider correction/reconciliation path.
5. Do not promise global or exactly-once WebSocket ordering.

### UC-MD-008 - Handle provider failure

1. Convert provider-specific failure to an internal typed failure.
2. Update connection status and metrics.
3. Keep PostgreSQL-backed historical reads available.
4. Return a retryable or completeness-aware response to the current caller.
5. If PostgreSQL is unavailable, withhold a closed-candle broadcast and keep
   provider status provider-level; do not use the status to report a database
   outage.
6. Do not publish raw provider errors or invoke unrelated domain modules as a
   side effect.

### UC-MD-009 - Create and seal a dataset snapshot

1. Caller submits pair, timeframe, and aligned `[from, to)` range.
2. Market Data validates the request and checks closed-candle completeness.
3. A consistent PostgreSQL read obtains the ordered candle set.
4. The module computes the canonical SHA-256.
5. If a sealed snapshot with the hash exists, return its reference.
6. Otherwise insert metadata and rows in one transaction and seal on commit.
7. Return `DatasetSnapshotRef` only after the transaction commits.

### UC-MD-010 - Add a second provider

1. Implement a new infrastructure adapter behind the provider port.
2. Register its `ProviderId` and capability mapping at composition time.
3. Reuse the canonical normalization, validation, persistence, cache,
   reconciliation, REST, and WebSocket contracts.
4. Existing Frontend, Strategy, Backtesting, Evaluation, and Leaderboard
   contracts remain unchanged.

## 4. Contracts

### 6.1 Canonical public domain contracts

These contracts are owned by `modules/market-data/api`. A transport package may
re-export only the minimal serialized projections required by REST or the
market WebSocket.

```typescript
export type Pair = string;

export type Timeframe = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export interface MarketPairMetadata {
  pair: Pair;              // opaque canonical symbol
  baseAsset: string;       // e.g. BTC
  quoteAsset: string;      // e.g. USDT
  settlementAsset: string; // accounting currency used by the simulator/UI
}

// Extensible provider identifier. It is not a raw adapter or an enum that
// forces Frontend changes when another provider is registered.
export type ProviderId = string;

export interface Candle {
  pair: Pair;
  timeframe: Timeframe;
  timestamp: string; // ISO-8601 UTC interval open time
  open: number;      // finite positive quote-currency price
  high: number;      // finite positive quote-currency price
  low: number;       // finite positive quote-currency price
  close: number;     // finite positive quote-currency price
  volume: number;    // finite non-negative base-asset volume
  isClosed: boolean;
}

export interface MarketTick {
  pair: Pair;
  price: number;     // finite positive quote-currency price
  timestamp: string;  // ISO-8601 UTC provider event time
}

export interface MarketDataConnectionStatus {
  provider: ProviderId;
  status: "CONNECTED" | "RECONNECTING" | "DISCONNECTED";
  lastEventAt: string; // ISO-8601 UTC; transition time before first event
}

export interface DatasetSnapshotRef {
  id: string;                         // opaque UUID string; required, non-empty
  pair: Pair;
  pairMetadata: MarketPairMetadata;   // normalized by Market Data; consumers never parse Pair
  timeframe: Timeframe;
  range: { from: string; to: string }; // UTC, half-open [from, to)
  candleCount: number;                 // positive count of closed candles
  sha256: string;                      // lowercase 64-character hex digest
  createdAt: string;                   // ISO-8601 UTC commit time
}
```

The existing `Candle`, `MarketTick`, and `DatasetSnapshotRef` field names are
retained. The `MarketDataConnectionStatus.provider` semantic is widened from
the current illustrative closed union to the extensible `ProviderId` string;
this is an intentional contract decision recorded in Section 12.

Canonical field semantics:

| Contract field | Type / allowed range | Requiredness, unit, and timezone | Producer | Consumer |
|---|---|---|---|---|
| `Pair` | non-empty uppercase ASCII string; no whitespace/control characters | Required; exchange-independent symbol, no unit/timezone | Market Data API caller and adapter mapping | REST, WebSocket, Strategy/Backtesting projections |
| `Timeframe` | `1m\|5m\|15m\|1h\|4h\|1d` | Required; fixed UTC grid duration | Market Data domain | All candle queries and consumers |
| `Candle.pair` / `.timeframe` | `Pair` / `Timeframe` | Required; identifies the market and interval | Market Data application | REST, WebSocket, snapshot reader |
| `Candle.timestamp` | UTC ISO-8601 string, timeframe-grid aligned | Required; interval open time, not interval end | Market Data normalizer | REST, WebSocket, snapshot reader |
| `Candle.open/high/low/close` | finite `number`, strictly `> 0` | Required; quote-currency price | Market Data normalizer | Charts, snapshot reader, Strategy context-builder |
| `Candle.volume` | finite `number`, `>= 0` | Required; base-asset volume | Market Data normalizer | Charts, snapshot reader, Strategy context-builder |
| `Candle.isClosed` | `boolean` | Required; `false` is forming, `true` is closed | Market Data application | REST, WebSocket, consumers |
| `MarketTick.pair` / `.price` | `Pair` / finite `number > 0` | Required; price is quote-currency value | Market Data normalizer | Market WebSocket and chart gateway |
| `MarketTick.timestamp` | UTC ISO-8601 string, not future under clock policy | Required; provider event time | Market Data normalizer | Market WebSocket consumers |
| `MarketDataConnectionStatus.provider` | `ProviderId` matching `[A-Z0-9][A-Z0-9_-]*` | Required; provider identity, no raw adapter data | Market Data connection manager | Market WebSocket consumers, observability |
| `MarketDataConnectionStatus.status` | `CONNECTED\|RECONNECTING\|DISCONNECTED` | Required; provider-level connection state | Market Data connection manager | Market WebSocket consumers |
| `MarketDataConnectionStatus.lastEventAt` | UTC ISO-8601 string | Required; latest provider frame, or state-transition time before first frame | Market Data connection manager | Market WebSocket consumers |
| `DatasetSnapshotRef.id` | opaque non-empty UUID string | Required; immutable snapshot identity | Market Data snapshot repository | Backtesting/worker |
| `DatasetSnapshotRef.pairMetadata` | canonical pair/base/quote/settlement strings | Required; copied from the provider-independent pair registry and immutable with the snapshot | Market Data pair registry | Backtesting/Frontend; consumers never parse `Pair` |
| `DatasetSnapshotRef.range` | UTC aligned `{from,to}` with `from < to` | Required; half-open `[from,to)` | Market Data snapshot repository | Backtesting benchmark scope |
| `DatasetSnapshotRef.candleCount` | positive integer | Required; exact closed child-row count | Market Data snapshot repository | Backtesting/verification |
| `DatasetSnapshotRef.sha256` | lowercase 64-hex string | Required; content address, no unit/timezone | Market Data snapshot repository | Backtesting/reproducibility checks |
| `DatasetSnapshotRef.createdAt` | UTC ISO-8601 string | Required; commit time of the sealed snapshot | Market Data snapshot repository | Backtesting/audit |

### 6.2 Public in-process Market Data API

The following is the minimum public behavior. Symbol names may be equivalent
only when the responsibility and boundary remain unchanged.

```typescript
export interface HistoricalCandleQuery {
  pair: Pair;
  timeframe: Timeframe;
  range?: { from: string; to: string };
  limit?: number;
  cursor?: string;
  includeForming?: boolean;
  completeness?: "ALLOW_PARTIAL" | "REQUIRE_COMPLETE";
}

export const DEFAULT_HISTORICAL_CANDLE_LIMIT = 1000;

export interface HistoricalCandlePage {
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
  candles: Candle[];              // ordered by timestamp ascending
  complete: boolean;
  missingRanges: Array<{ from: string; to: string }>;
  formingIncluded: boolean;        // true only when requested forming tail is present
  asOf: string;                    // ISO-8601 UTC module-clock read watermark
  nextCursor?: string;
}

export interface DatasetSnapshotCreateCommand {
  pair: Pair;
  timeframe: Timeframe;
  range: { from: string; to: string };
}

export interface DatasetSnapshotPage {
  snapshot: DatasetSnapshotRef;
  candles: Candle[];               // always isClosed=true, ordered ascending
  nextCursor?: string;
}

export interface DatasetSnapshotReadQuery {
  snapshotId: string;
  cursor?: string;
  limit?: number;
}

export interface MarketSubscription {
  pair: Pair;
  timeframe: Timeframe;
}

export type MarketDataUpdate =
  | { kind: "TICK"; payload: MarketTick }
  | { kind: "CANDLE"; payload: Candle }
  | { kind: "CONNECTION_STATUS"; payload: MarketDataConnectionStatus };

export interface MarketDataModulePublicApi {
  readPairMetadata(pair: Pair): Promise<MarketPairMetadata>;
  readCandles(query: HistoricalCandleQuery): Promise<HistoricalCandlePage>;
  createDatasetSnapshot(command: DatasetSnapshotCreateCommand): Promise<DatasetSnapshotRef>;
  readDatasetSnapshot(query: DatasetSnapshotReadQuery): Promise<DatasetSnapshotPage>;
  subscribeMarketData(
    subscriptions: MarketSubscription[],
    sink: (update: MarketDataUpdate) => void
  ): Promise<() => Promise<void>>;
  shutdown(): Promise<void>;
}

export type MarketDataSnapshotReader = Pick<
  MarketDataModulePublicApi,
  "readDatasetSnapshot"
>;

export function createMarketDataSnapshotReader(
  deps: Pick<MarketDataModuleDependencies, "snapshotRepository" | "clock" | "observability">
): MarketDataSnapshotReader;

export function createMarketDataModule(
  deps: MarketDataModuleDependencies
): MarketDataModulePublicApi;
```

`DatasetSnapshotReadQuery.limit` is a positive integer under the configured
page bound. Its cursor is opaque, bound to `(snapshotId, limit)`, and ordered
by the immutable child timestamp. A malformed or mismatched cursor returns
`INVALID_CURSOR`; a limit beyond the configured page bound returns
`RANGE_TOO_LARGE`; a page never changes snapshot identity.

`MarketDataModuleDependencies` is a composition-only type. It supplies the
provider registry, candle repository, snapshot repository, latest-value cache,
clock, bounded reconnect policy, and observability sink. It is consumed only
by `createMarketDataModule`; no caller receives a repository or adapter from
the public runtime API. The composition root owns the lifecycle and invokes
`shutdown()` during application shutdown.

Dependency responsibilities are fixed even though concrete TypeScript names
are implementation-specific:

| Dependency | Responsibility | May expose raw provider data? |
|---|---|---|
| Provider registry | Select registered adapters and capabilities | No; adapters map before the application port |
| Candle repository | Authoritative live/closed candle reads and writes | No |
| Snapshot repository | Atomic snapshot create/read, count/hash verification, logical sealing | No |
| Latest-value cache | Redis latest tick/candle/status optimization | No; cache payloads are validated wrappers |
| Clock | UTC now and deterministic test time | No |
| Reconnect policy | Bounded, cancellable delay/attempt decisions | No |
| Observability sink | Structured logs, metrics, and safe audit records | No unbounded raw payloads |

`subscribeMarketData` is an in-process delivery port used by the Backend
market WebSocket gateway. It is not a general event publisher: it accepts only
market subscriptions, emits only the three normalized update kinds, and has no
cross-domain consumers. The accepted subscription set is keyed by
`(pair,timeframe)` per sink. When the last accepted subscription is removed,
the module-wide accepted subscription set is empty, the module MAY close an
idle provider stream; it MUST NOT retain a provider stream solely for an empty
subscriber set.

The returned unsubscribe function MUST be idempotent. Once it resolves, the
sink MUST receive no new updates. Sink exceptions MUST be contained by the
Market Data delivery adapter and MUST NOT tear down the provider connection or
other subscribers. The gateway owns bounded buffering/backpressure. Market
Data MUST NOT retain an unbounded per-subscriber queue; a dropped realtime
message is recoverable through historical REST reconciliation, while closed
candle persistence remains authoritative in PostgreSQL.

After a subscription is accepted, its sink MUST receive the current
provider-level connection status before the first subsequent market update for
that sink. A newly composed module starts `DISCONNECTED`; an active subscription
then drives the normal `RECONNECTING`/`CONNECTED` lifecycle. This status says
nothing about PostgreSQL availability.

### 6.3 Provider adapter port

The adapter port is infrastructure-facing and MUST NOT be exported as a raw
provider contract to other business modules.

```typescript
type ProviderObservationSource = "REALTIME_STREAM" | "HISTORICAL_SYNC";

interface NormalizedProviderCandleObservation {
  candle: Candle;
  source: ProviderObservationSource;
  // Opaque and scoped to one provider connection; never serialized publicly.
  orderKey?: string;
}

interface NormalizedProviderTickObservation {
  tick: MarketTick;
  source: "REALTIME_STREAM";
  orderKey?: string;
}

interface ProviderAdapterFailure {
  code: "UNAVAILABLE" | "RATE_LIMITED" | "MALFORMED_RESPONSE" | "AUTHENTICATION_FAILED";
  retryable: boolean;
  safeMessage: string;
}

interface MarketDataProviderAdapter {
  readonly id: ProviderId;
  capabilities(): Promise<{
    pairs: Pair[];
    timeframes: Timeframe[];
  }>;
  getClosedThrough(input: {
    pair: Pair;
    timeframe: Timeframe;
  }): Promise<string>; // aligned UTC exclusive boundary; not a raw provider field
  compareOrder?(left: string, right: string): -1 | 0 | 1;
  fetchHistorical(command: {
    pair: Pair;
    timeframe: Timeframe;
    range: { from: string; to: string };
  }): Promise<NormalizedProviderCandleObservation[]>;
  connectRealtime(input: {
    subscriptions: MarketSubscription[];
    onTick(observation: NormalizedProviderTickObservation): void;
    onCandle(observation: NormalizedProviderCandleObservation): void;
    onDisconnect(error?: ProviderAdapterFailure): void;
  }): Promise<{ close(): Promise<void> }>;
}
```

The adapter maps raw exchange payloads to these normalized observations before
the application layer sees them. `source` and `orderKey` are Market Data
internal metadata: `HISTORICAL_SYNC` is the only correction-eligible source,
and an `orderKey` can be used only to reject a demonstrably older observation.
Other modules must never import this port or any raw payload type. The
`getClosedThrough` result is the exclusive UTC boundary after the provider's
latest closed interval and is required for reconnect reconciliation.
When an adapter supplies `orderKey`, it MUST also supply `compareOrder`; the
application may discard an observation only when that comparator proves it is
older. Without both values, same-identity differences use the quarantine and
reconciliation path.
Every adapter method MUST translate provider exceptions into
`ProviderAdapterFailure` before the application boundary; raw exceptions are
logged only inside the adapter with secrets and unbounded payloads removed.

### 6.4 Historical REST contract

The Backend REST adapter uses the existing planning route:

```text
GET /market/candles
```

Query fields:

| Field | Type | Requiredness and semantics |
|---|---|---|
| `pair` | string | Required canonical pair. Invalid syntax is `INVALID_PAIR`; unsupported provider pair is `UNSUPPORTED_PAIR`. |
| `timeframe` | `Timeframe` | Required canonical timeframe; malformed input is `INVALID_TIMEFRAME`, non-canonical input is `UNSUPPORTED_TIMEFRAME`. |
| `from` | ISO-8601 UTC string | Required when `to` is present; absent together with `to` for a limit-only query; included in the aligned half-open range. |
| `to` | ISO-8601 UTC string | Required when `from` is present; absent together with `from` for a limit-only query; excluded from the aligned range. |
| `limit` | positive integer | Required when `from` and `to` are both absent; optional with a range; subject to configured server bounds. |
| `cursor` | opaque string | Optional continuation token bound to the original query fingerprint; invalid/mismatched values return `INVALID_CURSOR`. |
| `includeForming` | boolean | Optional, default `false`; may include only the current forming tail, and reports `formingIncluded`. |
| `completeness` | `ALLOW_PARTIAL \| REQUIRE_COMPLETE` | Optional, default `ALLOW_PARTIAL`; snapshot creation is always `REQUIRE_COMPLETE`. |

The caller MUST provide either both `from` and `to` or a valid `limit`, but not
an incomplete range. A response contains `HistoricalCandlePage`. It MUST be
ordered ascending by candle open time, and `complete`/`missingRanges` are
authoritative for the requested or effective page range. `formingIncluded`
does not affect completeness; completeness is computed from closed candles
only. A valid range with no rows uses the `ALLOW_PARTIAL`/`REQUIRE_COMPLETE`
semantics in the error table; a limit-only query with no rows returns
`404 NO_DATA` because it has no effective range to report.

### 6.5 Market WebSocket contract

The market WebSocket is a transport adapter, not a domain event catalog.
`SUBSCRIPTION_ACK` and `ERROR` below are per-connection transport-control
responses required to make subscribe/unsubscribe and validation observable;
they are not market-domain messages, broadcasts, or Event Bus events. The only
server-pushed market data types are tick, candle, and provider connection
status.

Client commands:

```typescript
export type MarketWebSocketClientMessage = {
  schemaVersion: 1;
  action: "SUBSCRIBE" | "UNSUBSCRIBE";
  requestId: string;
  subscriptions: MarketSubscription[];
};
```

Server envelope:

```typescript
export type MarketWebSocketServerMessage = {
  schemaVersion: 1;
  type:
    | "MARKET_TICK"
    | "CANDLE"
    | "CONNECTION_STATUS"
    | "SUBSCRIPTION_ACK"
    | "ERROR";
  sentAt: string;       // ISO-8601 UTC gateway send time
  requestId?: string;   // present for command acknowledgement/error
  payload:
    | MarketTick
    | Candle
    | MarketDataConnectionStatus
    | {
        action: "SUBSCRIBE" | "UNSUBSCRIBE";
        accepted: Array<{
          subscription: MarketSubscription;
          state: "ACTIVE" | "ALREADY_ACTIVE" | "ABSENT";
        }>;
        rejected: Array<{ subscription: MarketSubscription; code: MarketDataError["code"] }>;
      }
    | MarketDataError;
};
```

Subscription commands are idempotent for the same connection. A duplicate
`SUBSCRIBE` does not create duplicate provider subscriptions. A duplicate
`UNSUBSCRIBE` is acknowledged as already absent. Invalid items are rejected
individually where possible; a command with no valid subscription does not
start a provider stream. `requestId` correlates the acknowledgement or command
error to the client command and is required on those control responses. A
provider failure is delivered as connection status, not as a generic domain
event.

The gateway MUST deliver only:

- ticks for an accepted pair;
- candles for an accepted pair/timeframe; and
- provider connection status.

The gateway MUST NOT deliver Strategy, Search, Backtest, News, Sentiment,
Leaderboard, or generic domain-event messages on this channel.

No exactly-once or global ordering guarantee is made. A client merges candle
messages by `(pair, timeframe, timestamp)`, does not reopen a closed candle,
and treats status as the source for connection health.

### 6.6 Error contract

```typescript
export interface MarketDataError {
  code:
    | "INVALID_PAIR"
    | "UNSUPPORTED_PAIR"
    | "INVALID_TIMEFRAME"
    | "UNSUPPORTED_TIMEFRAME"
    | "INVALID_RANGE"
    | "INVALID_CURSOR"
    | "RANGE_TOO_LARGE"
    | "NO_DATA"
    | "HISTORY_UNAVAILABLE"
    | "HISTORY_INCOMPLETE"
    | "DATASET_EMPTY"
    | "DATASET_GAP"
    | "DATASET_NOT_FOUND"
    | "DATASET_NOT_SEALED"
    | "DATASET_INTEGRITY_FAILURE"
    | "SUBSCRIPTION_REJECTED"
    | "PROVIDER_UNAVAILABLE"
    | "PROVIDER_RATE_LIMITED"
    | "PROVIDER_PAYLOAD_INVALID"
    | "MARKET_DATA_UNAVAILABLE"
    | "INTERNAL_ERROR";
  message: string;       // safe human-readable description
  retryable: boolean;
  details?: Record<
    string,
    string | number | boolean | Array<string> | Array<{ from: string; to: string }>
  >;
}
```

Error messages MUST NOT include raw credentials, provider payloads, or
provider-specific secrets. HTTP mapping is owned by the Backend adapter:

`retryable` describes this occurrence, not an unconditional property of the
code. Validation, unsupported-input, duplicate/no-data, snapshot-integrity,
and shutdown errors are non-retryable by the caller. Provider availability,
rate-limit, database availability, and incomplete-history errors may be
retryable only when the corresponding failure matrix policy says so.

| Error class | REST behavior |
|---|---|
| Invalid request, invalid cursor, or unsupported pair/timeframe | `400` |
| No data for a valid but empty range | `200` with `candles=[]`, `complete=false`, and `missingRanges=[requested range]` for `ALLOW_PARTIAL`; `404 NO_DATA` for `REQUIRE_COMPLETE`. |
| Known incomplete history for `REQUIRE_COMPLETE` without an active provider outage | `409 HISTORY_INCOMPLETE` with missing ranges |
| Provider unavailable/rate limited, database unavailable, or required history unavailable because of infrastructure | `503` with `retryable=true` |
| Snapshot not found | `404 DATASET_NOT_FOUND` |
| Snapshot not sealed | `409 DATASET_NOT_SEALED` |
| Snapshot hash/count/child-row integrity failure | `500 DATASET_INTEGRITY_FAILURE` and an integrity alert; never silently fetch replacement data. |
| Unexpected internal failure | `500` |

Because sealing is transaction-commit based, a create interrupted before commit
normally presents as `DATASET_NOT_FOUND`; `DATASET_NOT_SEALED` is reserved for
a defensive repository check that discovers an addressable but unsealed
record, not for a normal intermediate transaction.

### 6.7 Persistence and repository responsibilities

PostgreSQL is authoritative. The Market Data repository layer owns:

- live `candles` rows keyed by `(pair, timeframe, timestamp)`;
- closed-candle historical reads and gap computation;
- idempotent forming/closed upserts;
- explicit correction writes and audit metadata where the implementation
  requires it;
- `dataset_snapshots` and `dataset_snapshot_candles` rows;
- sealed snapshot integrity checks and content-hash uniqueness.

The Redis adapter owns only the latest-value keys defined in FR-MD-010. It
does not own candle history, snapshot state, or correctness decisions.

The repository MUST use a consistent read/transaction for snapshot creation.
The snapshot parent and child rows MUST commit together. A partial transaction
is not a visible snapshot.

### 6.8 Idempotency and versioning

- Candle writes are idempotent by canonical candle identity plus normalized
  content/state.
- Snapshot writes are idempotent by content hash. Identical sealed content
  returns the existing `DatasetSnapshotRef`.
- A changed normalized content hash creates a new snapshot identity; no sealed
  snapshot is overwritten.
- REST and WebSocket envelopes use explicit `schemaVersion` where the
  transport contract can evolve. Unknown versions are rejected or routed to a
  compatibility handler; they are never guessed.
- Snapshot hash version `1` uses UTF-8 lines with LF separators and no trailing
  LF, in this exact order: `version=market-data-snapshot-v1`, a length-prefixed
  `pair` line, a length-prefixed `timeframe` line, `fromEpochMicros`,
  `toEpochMicros`, `candleCount`, then one candle record per ascending
  timestamp. The lines are exactly `pair=<utf8ByteLength>:<pair>`,
  `timeframe=<utf8ByteLength>:<timeframe>`,
  `fromEpochMicros=<signedInteger>`, `toEpochMicros=<signedInteger>`,
  `candleCount=<positiveInteger>`, and
  `candle=<timestampEpochMicros>|<open>|<high>|<low>|<close>|<volume>`.
  Epoch values are signed decimal integers; numeric values are canonical plain
  decimal strings with no exponent, no leading zeroes, no trailing fractional
  zeroes, and `-0` normalized to `0`. The hash is SHA-256 of those exact bytes
  and excludes the snapshot UUID and `createdAt`.
- Market Data does not version domain candles by arbitrary application
  revisions. Identity, closure state, correction policy, and snapshot hash are
  the source of reproducibility.

## 5. Constraints

### 7.1 Provider connection state

| State | Meaning | Allowed next states |
|---|---|---|
| `DISCONNECTED` | No active provider stream, not yet connected, exhausted recovery, or intentionally stopped | `RECONNECTING`, `CONNECTED` for an explicit new start |
| `RECONNECTING` | Recovering or reconciling after a provider failure | `CONNECTED`, `RECONNECTING`, `DISCONNECTED` |
| `CONNECTED` | Stream established and required missed-data reconciliation completed | `RECONNECTING`, `DISCONNECTED` |

`CONNECTED` MUST NOT be published as the recovered state before reconciliation
has completed for every accepted subscription on that provider. The status is
provider-level; it is not a per-pair/per-timeframe health map.

### 7.2 Candle state

The live row has one identity and one current state. Forming updates may
replace OHLCV values. A normal close moves the identity to closed and persists
the final row. Normal duplicate messages are no-ops. A correction is a
closed-to-closed authoritative replacement and creates an audit signal, not a
state regression.

### 7.3 Numeric and temporal invariants

The invariants in FR-MD-012 apply at every ingress point: Binance REST,
Binance WebSocket, reconciliation, repository read-back before broadcast, and
snapshot creation. Database constraints and application validation SHOULD both
enforce them where practical.

### 7.4 Snapshot invariants

- Snapshot range is `[from, to)` and aligned to the timeframe.
- Snapshot contains only closed candles for exactly one pair/timeframe.
- `candleCount` equals the number of stored child rows.
- Child timestamps are unique and strictly increasing.
- Expected count equals the number of aligned intervals in the range.
- `sha256` matches canonical metadata/content serialization.
- A snapshot is sealed only after the parent/children/count/hash transaction
  commits; an intermediate transaction is not readable by snapshot ID.
- Sealed content is immutable and readable by snapshot ID only.
- A live correction never changes an existing snapshot.

### 7.5 Cache invariants

- Cache entries are never authoritative.
- Cache payloads include a schema discriminator and freshness watermark.
- Stale or invalid cache data is ignored, not partially trusted.
- Historical reads fall back to PostgreSQL.
- A latest-tick cache miss has no PostgreSQL fallback because ticks are not
  persisted by the accepted data model; the next provider tick is required.
- A corrected candle invalidates the affected latest-candle cache before
  repopulation.

### 7.6 Ordering guarantees and non-guarantees

The module guarantees identity-safe state convergence for persisted candles and
snapshots and the status prelude described in §6.2. It does not guarantee:

- global ordering across pairs, timeframes, ticks, and status messages;
- exactly-once WebSocket delivery;
- that a tick and a candle update arrive in the same order as provider arrival;
- that a provider stream alone contains every historical candle;
- that a cache contains data newer than PostgreSQL.

Consumers use timestamps, candle identity, `isClosed`, completeness metadata,
and connection status rather than transport arrival order.

### Non-functional requirements

### NFR-MD-001 - Reliability

The module MUST recover from transient provider disconnects through a bounded,
cancellable backoff policy and MUST reconcile missed closed candles before
declaring recovery. Provider failure MUST not erase or invalidate existing
PostgreSQL history.

### NFR-MD-002 - Data consistency

PostgreSQL MUST remain authoritative for closed candles and sealed snapshots.
Snapshot creation MUST be atomic and repeatable by content hash. Cache and
WebSocket delivery MUST occur after the relevant authoritative write where the
message represents a closed candle. A database failure MUST withhold that
closed delivery and surface a retryable module error without falsely changing
the provider connection status.

### NFR-MD-003 - Extensibility

Adding a provider MUST require an adapter, capability registration, and tests
for the canonical mapping. It MUST NOT require Frontend changes, Strategy
changes, Backtesting domain changes, or a new asynchronous messaging system.

### NFR-MD-004 - Bounded resources

Historical reads, cache windows, provider retry attempts, reconnect timers,
subscription collections, and snapshot reads MUST be bounded by configuration
or pagination. The module MUST reject unbounded ranges and MUST NOT retain an
unbounded in-memory tick/candle history.

### NFR-MD-005 - Observability

The module MUST expose structured logs and metrics for at least:

- provider request count, latency, result, and operation;
- connection state transitions, reconnect attempts, and reconnect outcome;
- last provider event age by provider;
- invalid payloads and validation reason;
- duplicate, out-of-order, gap, and correction counts;
- historical partial/failed responses;
- cache hit, miss, stale, invalid, and fallback results;
- snapshot create, deduplicate, seal, gap, interruption, and integrity failure;
- active subscriptions and provider stream health;
- PostgreSQL persistence failures, withheld closed deliveries, dropped realtime
  messages, and shutdown completion/failure.

Logs MUST include provider and safe pair/timeframe context where available,
but MUST NOT include credentials or unbounded raw payloads.

### NFR-MD-006 - Maintainability and boundary enforcement

Architecture checks MUST fail when:

- Market Data domain/application code imports a Binance SDK payload type;
- another module imports Market Data infrastructure/domain internals;
- Frontend code imports a provider adapter or Binance client;
- a non-market transport or domain event is added to the market WebSocket;
- Strategy or Backtesting reads Market Data tables directly instead of using the
  approved public API;
- `apps/backtest-worker` imports a Market Data repository/provider adapter
  instead of the approved read-only snapshot reader.

### NFR-MD-007 - Security boundary

Provider credentials and authenticated exchange-client details MUST remain in
infrastructure configuration and MUST never cross REST/WebSocket/public API
boundaries or appear in normal logs.

### Failure and edge-case matrix

| ID | Failure or edge case | Required behavior | Retryable? |
|---|---|---|---|
| FE-MD-001 | Binance REST unavailable | Keep database history readable; return partial data or `HISTORY_UNAVAILABLE` according to completeness mode; record provider failure. | Yes when provider policy allows. |
| FE-MD-002 | Binance WebSocket disconnects | Publish `RECONNECTING`, preserve last durable boundaries, reconnect with bounded backoff, then reconcile. | Yes. |
| FE-MD-003 | Reconnect succeeds but messages were missed | Reconcile every accepted subscription to adapter `closedThrough`; publish provider-level `CONNECTED` only after all succeed. | Yes if reconciliation can retry. |
| FE-MD-004 | Duplicate message | Treat identical observation as an idempotent no-op; do not duplicate rows or correction metrics. | No. |
| FE-MD-005 | Out-of-order forming message | Ignore if it would reopen/regress a closed candle; otherwise apply only when the opaque order key proves it is current; uncertain differences trigger reconciliation. | No; wait for reconciliation if data is uncertain. |
| FE-MD-006 | Malformed provider payload | Reject before normalization escapes adapter; log safe reason and increment invalid-payload metric. | Only if the provider response is transiently malformed and policy allows. |
| FE-MD-007 | Invalid OHLCV | Reject/quarantine; never persist or broadcast; do not fabricate values. | No for the payload; historical reconciliation may retry the range. |
| FE-MD-008 | Closed-candle correction | Apply only through explicit authoritative correction path, invalidate cache, audit, and keep sealed snapshots unchanged. | Usually no; provider fetch may retry. |
| FE-MD-009 | Unsupported pair | Return `UNSUPPORTED_PAIR` before provider I/O. | No. |
| FE-MD-010 | Unsupported timeframe | Return `UNSUPPORTED_TIMEFRAME` before provider I/O. | No. |
| FE-MD-011 | Empty historical range | Return `INVALID_RANGE` when `to <= from`; return `NO_DATA` for a valid range with no rows, and `404 NO_DATA` for an empty limit-only page. | No. |
| FE-MD-012 | Partial historical response | Persist validated rows, mark `complete=false` and `missingRanges`, or return `HISTORY_INCOMPLETE` for `REQUIRE_COMPLETE`. | Yes if provider can continue. |
| FE-MD-013 | Cache miss | Read authoritative PostgreSQL data for closed history; for latest ticks, report no cached tick because the accepted model does not persist ticks. | Not a cache failure. |
| FE-MD-014 | Stale/invalid cache | Ignore cache, record metric, and fall back to PostgreSQL. | No; cache repopulation may be asynchronous. |
| FE-MD-015 | Database unavailable | Do not claim closed-candle persistence or successful snapshot sealing; return a retryable availability error, withhold closed delivery, and keep provider status provider-level. | Yes. |
| FE-MD-016 | Snapshot creation interrupted | Roll back metadata/child rows; expose no snapshot reference; a later identical request may retry. | Yes. |
| FE-MD-017 | Provider future timestamp | Reject or quarantine the observation using the configured clock-skew policy; do not persist or broadcast. | No for the observation. |
| FE-MD-018 | Snapshot missing/unsealed/corrupt | Return the specific snapshot integrity error; never read mutable candles or fetch a replacement silently. | No without operator/data repair. |
| FE-MD-019 | Provider rate limited | Return `PROVIDER_RATE_LIMITED`, use adapter retry/backoff policy, preserve known history, and avoid a thundering herd. | Yes. |
| FE-MD-020 | Controlled shutdown during reconnect | Idempotent `shutdown()` cancels timers and provider connection, stops new subscriptions, flushes validated writes, and requires a new module instance before restart. | No after shutdown. |

## 6. Acceptance Criteria

The following scenarios are implementation-testable. Test doubles MUST inject
clock, provider adapter, backoff policy, repository, cache, and sink so that
the behavior can be verified deterministically without Binance network access.

### Canonical validation and normalization

1. **Valid pair/timeframe**
   - Given a registered provider that supports `BTCUSDT` and `5m`
   - When `readCandles` receives a valid UTC range
   - Then provider input is mapped internally, no raw payload escapes, and the
     returned `Candle` values use canonical pair/timeframe and UTC timestamps.

2. **Invalid pair rejected before I/O**
   - Given a pair containing whitespace or lowercase characters
   - When any public Market Data operation is called
   - Then it returns `INVALID_PAIR`, the provider is not called, and no row or
     cache entry is written.

3. **Unsupported timeframe rejected before I/O**
   - Given a timeframe outside the canonical union
   - When the caller requests history or a subscription
   - Then it returns `UNSUPPORTED_TIMEFRAME` and the provider is not called.

   - Given a non-string or malformed timeframe transport value
   - When the same operation is called
   - Then it returns `INVALID_TIMEFRAME` before provider I/O.

4. **Provider payload is normalized**
   - Given a Binance-specific raw payload
   - When the adapter maps it
   - Then only normalized internal observations and canonical
     `Candle`/`MarketTick`/status values reach application, REST, WebSocket, or
     cross-module APIs; no raw provider object or field crosses the adapter.

### Historical and candle lifecycle

5. **Historical bootstrap**
   - Given closed candles exist in PostgreSQL for a requested range
   - When `readCandles` is called
   - Then it returns ascending candles, `complete=true`, a UTC `asOf`, and no
     Binance-shaped fields.

6. **Partial history is explicit**
   - Given a valid range with a missing interval and `ALLOW_PARTIAL`
   - When `readCandles` is called
   - Then it returns valid rows, `complete=false`, and the exact missing range;
     it never presents the range as complete.

7. **Required completeness fails**
   - Given a valid range with a missing interval and `REQUIRE_COMPLETE`
   - When `readCandles` or snapshot creation is called
   - Then it returns `HISTORY_INCOMPLETE` or `DATASET_GAP` respectively and
     creates no sealed snapshot.

8. **Forming candle update**
   - Given a valid forming candle update
   - When it is ingested twice with different OHLCV values
   - Then the same candle identity has one current forming representation, the
     latest cache reflects the latest valid update, and no closed history row
     is created solely by the forming update.

9. **Close persists before broadcast**
   - Given a valid forming candle followed by a valid close update
   - When the close is ingested
   - Then PostgreSQL contains one closed row and the closed WebSocket message is
     delivered only after the repository commit succeeds.

10. **Closed candle never reopens**
    - Given a closed candle exists
    - When an older forming update arrives
    - Then the row remains closed, no forming message regresses the public state,
      and an out-of-order metric is recorded.

11. **OHLCV invariant rejection**
    - Given a payload with NaN, infinity, negative volume, non-positive price,
      `high < low`, or inconsistent high/low bounds
    - When it reaches normalization/application validation
    - Then it is not persisted or broadcast and the reason is observable.

### Realtime reliability

12. **Disconnect and reconnect**
    - Given a connected provider stream
    - When the provider disconnects
    - Then status becomes `RECONNECTING`, retries use the injected bounded
      policy, and shutdown cancellation prevents further attempts.

13. **Missed candle reconciliation**
    - Given a disconnect causes one or more closed intervals to be absent
    - When the stream reconnects
   - Then the module obtains the adapter's `closedThrough`, fetches the missing
     historical range, persists valid candles idempotently, and publishes
     provider-level `CONNECTED` only after every accepted subscription is
     complete.

14. **Reconciliation failure remains visible**
    - Given reconnect succeeds but historical reconciliation remains unavailable
    - When retry policy is exhausted
    - Then status is `RECONNECTING` or `DISCONNECTED`, the error is retryable and
      observable, and the module does not claim healthy recovery.

15. **Duplicate and correction behavior**
    - Given an identical closed update and then a changed `HISTORICAL_SYNC`
      observation for the same identity
    - When both are processed
    - Then the identical update is a no-op, the correction follows the explicit
      correction path, the live cache is invalidated, and a sealed snapshot is
      unchanged.

### Cache and snapshot behavior

16. **Cache fallback**
    - Given a missing, stale, invalid, or unavailable Redis cache
    - When a historical read is requested
    - Then PostgreSQL is used, the response does not claim cache authority, and
      a cache outcome metric is emitted.

17. **Snapshot is immutable and idempotent**
    - Given a complete aligned range of closed candles
    - When snapshot creation runs twice with unchanged content
   - Then one sealed content hash/reference is returned for both calls, the
     hash is computed from the exact version-1 canonical byte serialization,
     and all child rows are committed atomically.

18. **Snapshot correction isolation**
    - Given a sealed snapshot and a later correction to a live candle
    - When a new snapshot is created
    - Then the old snapshot remains byte/content identical and the new content
      receives a different hash/reference when its ordered values differ.

19. **Snapshot integrity**
    - Given a missing, unsealed, or hash-inconsistent snapshot ID
    - When a worker requests snapshot data
   - Then the public API returns a specific integrity error and never falls
     back to mutable live candles, Redis, or provider history; the worker uses
     the approved snapshot reader rather than a direct table query.

### Boundary and extensibility behavior

20. **Second provider without downstream changes**
    - Given a second provider adapter that maps into the canonical contracts
    - When it is registered and selected
    - Then the same REST/WebSocket/public module contracts work without Frontend,
      Strategy, Backtesting, Evaluation, Search, or Leaderboard source changes.

21. **No raw payload leakage**
    - Given architecture/import checks and serialized contract inspection
    - When the build checks Market Data boundaries
    - Then raw Binance types are limited to the adapter, other modules cannot
      deep-import Market Data internals, and no provider payload appears in a
      REST/WebSocket/public module response.

22. **No Event Bus behavior**
    - Given the repository's no-General-Event-Bus rule
    - When market data is delivered to the browser or consumed by another
      module
   - Then delivery uses the public Market Data API or market-only WebSocket;
     no `MarketPriceUpdated`, `CandleClosed`, or generic domain event is
     published.

23. **Range, limit, and cursor contract**
   - Given a request with only one range endpoint, an unaligned endpoint, a
     non-positive/over-limit `limit`, or a cursor bound to another query
   - When `readCandles` or `GET /market/candles` is called
   - Then it returns `INVALID_RANGE`, `RANGE_TOO_LARGE`, or `INVALID_CURSOR`
     respectively before provider I/O; a limit-only page has deterministic
     ascending ordering and an effective response range.

24. **Subscription acknowledgement and idempotency**
   - Given repeated `SUBSCRIBE` and `UNSUBSCRIBE` commands with the same
     `requestId`/subscription identity
   - When the market WebSocket processes them
   - Then each command receives a correlated acknowledgement, duplicate
     subscribe does not duplicate provider streams, duplicate unsubscribe is
     `ABSENT`, and an empty accepted set does not keep a provider stream alive.

25. **Database failure does not masquerade as provider failure**
   - Given a valid closed candle but a failed PostgreSQL commit
   - When the close is ingested
   - Then no closed message is broadcast, a retryable module error/metric is
     recorded, and provider connection status remains provider-level rather
     than being changed to `DISCONNECTED` solely for the database error.

26. **Future tick rejection**
   - Given a provider tick whose timestamp is beyond the injected clock-skew
     policy
   - When the adapter delivers it
   - Then it is rejected/quarantined, not cached or broadcast, and the invalid
     observation metric records the provider and safe pair context.

27. **Controlled shutdown**
   - Given reconnect timers, active subscriptions, and pending validated
     closed-candle writes
   - When `shutdown()` is called once or repeatedly
   - Then timers and provider streams stop, pending writes are flushed or
     reported before resolution, no new subscription is accepted, and no
     reconnect attempt occurs after resolution.

28. **Worker and cross-module boundary**
   - Given an implementation architecture check
   - When Backtesting or `apps/backtest-worker` reads a snapshot
   - Then it calls the public snapshot contract/reader only, never imports
     Market Data domain/infrastructure or reads PostgreSQL tables directly.

29. **Provider boundary and reconciliation evidence**
   - Given a second adapter with a different raw payload and a disconnect
   - When it is registered and reconnects
   - Then the adapter emits canonical observations plus an internal
     `closedThrough` boundary and, when the provider supplies reliable order,
     an order key/comparator; the same reconciliation rules apply, and no
     provider-specific field reaches REST, WebSocket, Strategy, or Backtesting.

30. **Historical page default**
    - Given a limit-only `readCandles`/`GET /market/candles` request with no
      explicit `limit`
    - When at least 1000 closed candles are available
    - Then the response selects the latest 1000 candles in ascending
      timestamp order. An explicit smaller limit, an explicit range, and
      snapshot reads retain their existing semantics.

### Traceability matrix

| PDF source | Classified requirement | Spec coverage | Acceptance coverage |
|---|---|---|---|
| Brief section 4, Realtime Market Data | MUST: Binance historical and realtime market data | FR-MD-004, FR-MD-005, UC-MD-001 to UC-MD-004 | AC 1, 5, 8, 9 |
| Brief section 5, architecture requirement | MUST: frontend must not depend on Binance shape | FR-MD-001, FR-MD-006, NFR-MD-006 | AC 4, 21 |
| Brief section 6, Multi-Timeframe Chart | MUST for dashboard: independent chart timeframe selection | FR-MD-003, UC-MD-002 | AC 3, 20 |
| Brief sections 32.3-32.4 | SHOULD: low-latency realtime and recovery after disconnect | FR-MD-016 to FR-MD-020, NFR-MD-001 | AC 12 to 15, 25, 27 |
| Brief section 35, database groups | MUST: candles with pair/timeframe/timestamp/OHLCV | FR-MD-009, FR-MD-012, Section 6.1, Section 7 | AC 5, 9, 11, 25 |
| Brief section 36 | MUST: reproducible versioned results | FR-MD-021, FR-MD-022, Section 7.4, Section 6.8 | AC 17 to 19, 28 |
| Brief section 37, MVP | MUST: Binance, candlestick, realtime, up to four dashboard timeframes | Section 2, FR-MD-004 to FR-MD-010 | AC 1, 5, 9, 20 |
| Brief section 40.3 | SHOULD: provider replacement without Frontend rewrite | FR-MD-001, FR-MD-006, FR-MD-023, UC-MD-010 | AC 20, 21, 29 |
| Brief section 40.7 | SHOULD: WebSocket disconnect recovery | FR-MD-016 to FR-MD-019 | AC 12 to 15 |
| Brief section 44 anti-patterns | SHOULD: no God Service, raw Binance coupling, frontend business logic | Scope, boundary, NFR-MD-006 | AC 21, 22 |
| Brief sections 39-43, central architecture questions | SHOULD: prove modifiability, reliability, maintainability, observability, and scalable boundaries rather than copy samples | Overview, NFR-MD-001 to NFR-MD-006, D-MD-001 to D-MD-016 | AC 20 to 29 |
| Brief sections 45-46 deliverables/demo | MUST for project delivery, not Market Data runtime behavior | This spec supplies the Market Data portion of architecture/demo/test evidence | AC 5, 9, 12, 20, 21, 28 |
| PDF sample `BTCUSDT`, exact four chart values, named events, exact exchange routes | ILLUSTRATIVE | Section 2 prevents hard-coding them as universal requirements | AC 3, 20, 22 |

### Decisions, assumptions, and open issues

### Decisions

#### D-MD-001 - Direct API plus market-only WebSocket, no Event Bus

The PDF presents event-driven architecture and names events as possible
examples. The accepted repository architecture explicitly rejects a General
Event Bus and restricts WebSocket to market delivery. This spec therefore uses
typed in-process APIs for module collaboration and a scoped transport envelope
for browser delivery. The named PDF events are not contracts; WebSocket
acknowledgements/errors are control responses, not domain events.

#### D-MD-002 - Historical REST bootstrap and realtime WebSocket

This follows ADR-001. Historical data is request/response and authoritative
reads come from PostgreSQL. Realtime ticks, candle updates, and provider status
are pushed through the market-only WebSocket.

#### D-MD-003 - Four charts are a UI limit, not a domain limit

The PDF's four-chart MVP is a dashboard use-case constraint. Market Data does
not constrain provider capabilities, snapshot size, or internal subscriptions
to four.

#### D-MD-004 - Extensible provider identifier

The existing `MarketDataConnectionStatus.provider` union lists Binance, OKX,
Bybit, and Coinbase, while the repository architecture requires future provider
addition without Frontend coupling. This spec retains the field and semantic
but treats its value as an extensible canonical `ProviderId` string. A future
transport version may add a formal provider capability catalog if the UI needs
display metadata.

#### D-MD-005 - Mutable live history, immutable snapshots

The live `candles` table can receive an explicit authoritative correction. A
sealed dataset snapshot can never be changed. This preserves operational data
quality and backtest reproducibility simultaneously.

#### D-MD-006 - Closed-candle persistence before closed delivery

The module persists a valid closed candle before broadcasting its closed state.
This makes PostgreSQL authoritative while allowing forming updates to remain
ephemeral or operationally persisted.

#### D-MD-007 - No invented retry numbers

The repository does not define a market-data retry SLA or fixed reconnect delay.
Backoff values, jitter, and maximum attempts are injected operational policy.
The normative requirement is bounded, cancellable, observable recovery.

#### D-MD-008 - Snapshot creation is a Market Data public boundary

The existing planning matrix names snapshot reading but the required behavior
also needs an explicit create/seal operation. This spec therefore adds
`createDatasetSnapshot` to the Market Data public API. Backtesting still owns
benchmark-scope orchestration; Market Data owns candle completeness, hashing,
sealing, and snapshot persistence.

#### D-MD-009 - Normalized provider port and closed boundary

Raw payloads stop inside each adapter. The application receives normalized
observations with only Market Data fields, an internal source marker, and an
optional opaque ordering key. Reconciliation uses the adapter's normalized
`closedThrough` boundary so a successful WebSocket handshake cannot be
mistaken for complete recovery.

#### D-MD-010 - Versioned hash and logical snapshot seal

The existing PostgreSQL snapshot tables do not need a new `sealed` column.
Commit of a verified parent/child transaction is the seal boundary. The
version-1 byte serialization in Section 6.8 makes the content address
reproducible without hashing a generated UUID or commit timestamp.

#### D-MD-011 - Explicit historical query semantics

`ALLOW_PARTIAL` is the default for chart reads. A caller supplies either an
aligned half-open range or a bounded latest page; cursors are query-bound and
invalid cursors fail before provider I/O. This removes the ambiguity between a
range completeness result and a page result without inventing an SLA.

#### D-MD-012 - Provider status is not database health

`MarketDataConnectionStatus` remains provider-level because the accepted
contract has no database-health message. A PostgreSQL failure withholds
closed-candle delivery and is reported through typed errors/observability; it
does not masquerade as an exchange disconnect.

#### D-MD-013 - Worker snapshot reader boundary

The separate worker may compose `createMarketDataSnapshotReader`, a read-only
public facade backed by PostgreSQL. It never imports Market Data internals,
queries snapshot tables directly, or instantiates exchange/realtime adapters.
This preserves the modular-monolith boundary while keeping the worker process
able to load the immutable input it was given by snapshot identity.

#### D-MD-014 - Forming and tick cache semantics

Forming candles may remain ephemeral and are never authoritative. Closed
history falls back from Redis to PostgreSQL. Ticks are intentionally not
persisted in the accepted data model, so a missing latest-tick cache has no
historical fallback and waits for the next provider observation.

#### D-MD-015 - Explicit module lifecycle

The module owns provider-stream shutdown because reconnect timers, subscriptions,
and pending closed-candle writes are Market Data resources. An idempotent
public `shutdown()` is therefore part of the module boundary; it does not turn
Market Data into a process-wide lifecycle manager.

#### D-MD-016 - Cache fallback follows data ownership

The repository-wide cache rule means closed historical candle reads fall back
to PostgreSQL. `MarketTick` is explicitly not persisted in the accepted data
model, so a missing or stale tick cache cannot be reconstructed from
PostgreSQL. The spec chooses an explicit no-tick result and waits for the next
provider observation instead of introducing an unauthorized tick table or
fabricating a value.

### Adjudicated review findings

| ID | Severity | Evidence | Problem | Consequence | Required refinement / decision |
|---|---|---|---|---|---|
| P1-MD-001 | P1 | §6.3 previously exposed `unknown` payload callbacks | Raw exchange values could cross the adapter/application seam | Provider coupling and boundary-test failure | Fixed by normalized observation types, source marker, and opaque order key; see D-MD-009. |
| P1-MD-002 | P1 | §§4.7-4.8 and §6.4 | Optional range, limit-only reads, cursor binding, and defaults were underspecified | Agents could return different pages or completeness flags | Fixed with explicit range/page rules, default `ALLOW_PARTIAL`, `RANGE_TOO_LARGE`, and `INVALID_CURSOR`; see D-MD-011. |
| P1-MD-003 | P1 | §§4.16-4.18 and §7.1 | Provider-level status was phrased as if it were per-stream health | Partial recovery could be reported as healthy | Fixed: `CONNECTED` requires all accepted subscriptions; status remains provider-level. |
| P1-MD-004 | P1 | §§4.21, 6.8, and 7.4 | Snapshot hash bytes and seal boundary were not exact and did not match the existing schema shape | Backtest reproducibility and interrupted-create behavior could diverge | Fixed with version-1 canonical serialization and logical commit seal; see D-MD-010. |
| P1-MD-005 | P1 | §1 actors vs `docs/design/project-structure.md` worker composition | Separate worker could be interpreted as direct table reader or in-process backend caller | Raw persistence coupling or impossible process integration | Fixed with explicit read-only public snapshot reader; see D-MD-013. |
| P1-MD-006 | P1 | §4.20 and §6.2 | Shutdown was required but absent from the public lifecycle contract | Reconnect timers and subscriptions could outlive application shutdown | Fixed with idempotent public `shutdown()` and acceptance test 27. |
| P1-MD-007 | P1 | §4.10 and existing `data-model.md` | Generic cache fallback wording conflicted with non-persisted ticks | Agent might fabricate a tick or write an unauthorized tick table | Fixed by limiting PostgreSQL fallback to closed history and making tick-cache miss explicit; see D-MD-014. |
| P1-MD-008 | P1 | ADR-001 plus §6.5 | Subscription acknowledgements/errors could be misread as an Event Bus or non-market push channel | WebSocket boundary could expand beyond the accepted transport decision | Fixed by classifying them as per-connection transport-control responses; only tick/candle/status are market pushes. |
| P2-MD-001 | P2 | §§4.3 and 6.6 | `INVALID_TIMEFRAME` existed without a malformed-input rule | HTTP validation mapping could diverge | Fixed by separating malformed from unsupported timeframe. |
| P2-MD-002 | P2 | §6.5 | Subscription acknowledgement did not identify action/state | Duplicate unsubscribe/subscribe behavior was not machine-verifiable | Fixed with correlated action/state acknowledgement and acceptance test 24. |

### Assumptions

- The Backend owns authentication and WebSocket connection admission. Market
  Data receives already-authorized subscription requests and does not define a
  user/tenant permission model here.
- Provider selection is composition/configuration in the Binance MVP. A module
  instance has one configured default provider; registering another adapter
  does not require a new Frontend field or provider-specific payload.
- Binance server-time synchronization and any clock-skew tolerance are supplied
  through infrastructure configuration. The Market Data domain still rejects
  timestamps outside that configured policy.
- Provider pagination, rate limits, and raw endpoint details are adapter
  concerns. Their values must be documented in adapter configuration and tests,
  not copied into canonical contracts.
- The existing `candles`, `dataset_snapshots`, and
  `dataset_snapshot_candles` ownership in `docs/design/data-model.md` remains
  the storage baseline; this spec does not authorize a migration.
- The existing cache freshness rules of `2 x timeframe interval` for candles
  and five seconds for ticks remain the MVP defaults until an accepted design
  change supersedes them.

### Open issues

These are implementation-stage P2 questions and do not block a first
implementation:

- Whether a future provider capability catalog should be persisted or remain
  bootstrap configuration is not required for the Binance MVP.
- Retention, partitioning, and TimescaleDB adoption are future operational
  decisions; they do not change the public Market Data contracts.

- The exact configured page-size maximum and provider clock-skew tolerance
  remain deployment policy values; their absence does not change contract
  behavior or permit unbounded reads.

- The existing project-structure export matrix predates the explicit
  `createMarketDataSnapshotReader` name. Before implementation, the public
  allowlist must expose that reader under the same Market Data API boundary;
  this is a reference-synchronization task, not a new runtime boundary.

There are no unresolved P0 or P1 findings in this spec.
