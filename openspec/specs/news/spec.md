# News Capability

## Purpose and boundary

News collects, normalizes, stores, deduplicates, and queries market news through replaceable provider adapters. It owns normalized News Items and their persistence. After storing an eligible item, it requests Sentiment through Sentiment's neutral public boundary; it does not own or write Sentiment results.

## Requirements

### Requirement: Replaceable normalized collection

The capability MUST collect through provider adapters and normalize identity, title/content, source, publication time, crawl time, related coins, and URL before persistence. Adding a provider MUST NOT require changes to Sentiment or frontend business behavior.

Traceability: `CSL-R-NW-01`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`; ADR-004 and ADR-005.

### Requirement: Durable deduplication and query

Normalized items MUST be stored before auxiliary analysis, deduplicated by a documented stable identity policy, and queryable in deterministic order. Re-collecting the same provider item MUST NOT create duplicate logical News Items.

Traceability: `CSL-R-NW-01`, `CSL-R-DM-01`.

### Requirement: Sentiment isolation

News MUST invoke Sentiment for an eligible newly stored item only through a neutral input and bounded call. Sentiment timeout or failure MUST leave the stored News Item readable and represented without fabricated sentiment.

Traceability: `CSL-R-SN-01`, `CSL-R-OB-01`; ADR-004 as amended by ADR-007.

## Approved behavior and invariants

- Provider-specific fields MUST remain inside provider adapters.
- Required normalized identity and time fields MUST be validated before persistence.
- Deduplication MUST be deterministic and safe under repeated collection.
- News MUST NOT import Sentiment persistence or a concrete model implementation.
- Provider and analysis failures MUST be observable independently.

## Executable public API and status

The current executable public surface is [`modules/news/api/index.ts`](../../../modules/news/api/index.ts). It exposes `collect` and `readNews` and re-exports current News boundary types. Both functions currently throw `NOT_IMPLEMENTED`; the exact TypeScript contracts remain owned by the source barrel.

## Failure expectations

- Malformed provider items are rejected or quarantined with provider/context information and do not poison valid items in the same collection.
- A provider timeout or outage is observable and does not corrupt previously stored News.
- A duplicate collection is idempotent from the query consumer's perspective.
- Sentiment timeout, exception, or invalid result leaves News available with missing/degraded Sentiment state.

## Acceptance scenarios

#### Scenario: Provider item is normalized

- **Given** a valid item from a configured News provider
- **When** collection runs
- **Then** a provider-neutral News Item with required identity, content, source, time, coin, and URL fields is stored

#### Scenario: Duplicate is not inserted twice

- **Given** a News Item already stored under the deduplication policy
- **When** the provider returns it again
- **Then** query results contain one logical item

#### Scenario: Sentiment failure does not lose News

- **Given** a normalized News Item and an unavailable Sentiment implementation
- **When** collection stores and requests analysis
- **Then** the News Item remains readable, no sentiment is fabricated, and the failure is observable

#### Scenario: Provider is replaceable

- **Given** a second conforming provider adapter
- **When** it is configured
- **Then** normalized collection and reads work without changing Sentiment or frontend business logic
