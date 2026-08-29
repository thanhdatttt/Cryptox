# News Capability

## Purpose and boundary

News collects, normalizes, stores, deduplicates, and queries market news through replaceable provider adapters. It owns normalized News Items and their persistence. After storing an eligible item, it requests Sentiment through Sentiment's neutral public boundary; it does not own or write Sentiment results.

## Requirements

### Requirement: Replaceable normalized collection

The capability MUST collect through provider adapters and normalize identity, title/content, source, publication time, crawl time, related coins, and URL before persistence. Adding a provider MUST NOT require changes to Sentiment or frontend business behavior.

Traceability: `CSL-R-NW-01`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`; ADR-004 and ADR-005.

### Requirement: Durable deduplication and query

Normalized items MUST be stored before auxiliary analysis, deduplicated by
canonical URL, provider identity when available, and normalized-content hash, and
queryable in deterministic order. Re-collecting the same provider item MUST NOT
create duplicate logical News Items.

Traceability: `CSL-R-NW-01`, `CSL-R-DM-01`.

### Requirement: Controlled external content and extraction lifecycle

Website, RSS, and HTML sources MUST be configuration-driven adapters. Imported
URLs are fetched by backend only: HTTPS plus configured allowlist/source-list,
no cookies or credentials, localhost/private/link-local and DNS-rebinding
protection, at most three revalidated redirects, a 20-second total timeout, and
a 1 MiB body maximum. LLM-assisted extraction uses a replaceable adapter.
Templates are versioned; refinement may create only a `DRAFT` template with a
reviewable diff and metrics, and user/administrator approval is required before
promotion. Earlier templates remain rollback targets. Auto-refresh is configurable
from one to five minutes and defaults to five.

Traceability: `CSL-R-NW-02`; ADR-009.

### Requirement: News retention and practical extraction provenance

News MUST retain normalized articles, extraction provenance, and template versions
for 90 days, while raw HTML is retained for audit/reprocess only for seven days
and then purged. Retention does not claim exact replay after an external source
or expired raw artifact changes. A Strategy may consume a selected News/Sentiment
derived input only through public module boundaries and must retain practical
provenance rather than reading News persistence directly.

Traceability: `CSL-R-NW-02`, `CSL-R-RP-02`; ADR-004, ADR-007, and ADR-009.

### Requirement: Sentiment isolation

News MUST invoke Sentiment for an eligible newly stored item only through a neutral input and bounded call. Sentiment timeout or failure MUST leave the stored News Item readable and represented without fabricated sentiment.

Traceability: `CSL-R-SN-01`, `CSL-R-OB-01`; ADR-004 as amended by ADR-007.

### Requirement: Real News final delivery

Fixtures MAY validate normalization, deduplication, provider failure, and frontend
decoupling. The delivered runtime and instructor demo MUST use a real configured
News provider/API/feed and MUST NOT silently substitute fixture News.

Traceability: `CSL-R-RD-01`, `CSL-R-NW-01`, `CSL-R-DM-01`.

## Approved behavior and invariants

- Provider-specific fields MUST remain inside provider adapters.
- Required normalized identity and time fields MUST be validated before persistence.
- Deduplication MUST be deterministic and safe under repeated collection.
- News MUST NOT import Sentiment persistence or a concrete model implementation.
- Provider and analysis failures MUST be observable independently.
- A draft extraction template is never automatically promoted, and unsafe or
  unconfigured URL fetches never contact a remote destination.

## Executable public API and status

The current executable public surface is [`modules/news/api/index.ts`](../../../modules/news/api/index.ts). It exposes `collect` and `readNews` and re-exports current News boundary types. Both functions currently throw `NOT_IMPLEMENTED`; the exact TypeScript contracts remain owned by the source barrel.

## Failure expectations

- Malformed provider items are rejected or quarantined with provider/context information and do not poison valid items in the same collection.
- A provider timeout or outage is observable and does not corrupt previously stored News.
- A duplicate collection is idempotent from the query consumer's perspective.
- Sentiment timeout, exception, or invalid result leaves News available with missing/degraded Sentiment state.
- Unsafe URL, redirect, DNS, timeout, or body-limit failure is observable and
  cannot persist untrusted raw content or a promoted template.

## Acceptance scenarios

#### Scenario: Provider item is normalized

- **Given** a valid item from a configured News provider
- **When** collection runs
- **Then** a provider-neutral News Item with required identity, content, source, time, coin, and URL fields is stored

#### Scenario: Duplicate is not inserted twice

- **Given** a News Item already stored under the deduplication policy
- **When** the provider returns it again
- **Then** query results contain one logical item

#### Scenario: Imported URL is safely bounded

- **Given** a configured allowlisted HTTPS source
- **When** it redirects to another validated public allowlisted destination within
  the redirect, time, and body limits
- **Then** the backend may collect it without cookies or credentials

#### Scenario: Unsafe imported URL is rejected

- **Given** a URL resolving to localhost, private, or link-local space, or one
  that fails destination revalidation
- **When** import is attempted
- **Then** no remote content is stored and the rejection is observable

#### Scenario: Template refinement needs approval

- **Given** quality metrics support a candidate extraction improvement
- **When** self-healing proposes a new template
- **Then** it is stored only as a diffable `DRAFT`; the prior version remains
  active until explicit approval promotes the draft

#### Scenario: Retention is bounded

- **Given** collected News with raw HTML, normalized content, provenance, and a
  template reference
- **When** the seven-day and 90-day retention thresholds are reached
- **Then** raw HTML is purged after seven days while the normalized/provenance/
  template records remain for 90 days

#### Scenario: Sentiment failure does not lose News

- **Given** a normalized News Item and an unavailable Sentiment implementation
- **When** collection stores and requests analysis
- **Then** the News Item remains readable, no sentiment is fabricated, and the failure is observable

#### Scenario: Provider is replaceable

- **Given** a second conforming provider adapter
- **When** it is configured
- **Then** normalized collection and reads work without changing Sentiment or frontend business logic

#### Scenario: Final mode uses a real News source

- **Given** final/demo configuration
- **When** News collection runs
- **Then** normalized items originate from the configured real provider and fixture-only configuration cannot satisfy final acceptance
