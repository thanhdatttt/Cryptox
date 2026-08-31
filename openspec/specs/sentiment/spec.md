# Sentiment Capability

## Purpose

Sentiment analyzes neutral text inputs and stores provider-neutral Sentiment Results separately from News. It owns sentiment labels, scores, model/version provenance, and its persistence. News may call its public analysis/read boundary, but neither module accesses the other's internals.

## Requirements

### Requirement: Replaceable sentiment analysis

The capability MUST expose a replaceable analysis boundary that returns `POSITIVE`, `NEUTRAL`, or `NEGATIVE` with a finite normalized score. A successful result MUST identify its input and record model name/version provenance.

Traceability: `CSL-R-SN-01`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-AR-03`; ADR-004 and ADR-007.

### Requirement: Separate persistence and reads

Sentiment MUST own storage and retrieval of successful results. News MAY request analysis and compose a read response but MUST NOT write Sentiment-owned data or depend on a concrete analyzer.

Traceability: `CSL-R-SN-01`; ADR-004.

### Requirement: Failure isolation

Timeout, exception, or invalid inference output MUST be observable and represented as missing sentiment. Such failure MUST NOT stop News persistence, charts, Strategy, Search, or Backtesting.

Traceability: `CSL-R-SN-01`, `CSL-R-OB-01`, `CSL-R-DM-01`.

## Approved behavior and invariants

- Labels are limited to `POSITIVE`, `NEUTRAL`, and `NEGATIVE`.
- Scores MUST be finite, use one documented normalized range, and have a deterministic label mapping.
- A successful stored result MUST retain input/news reference, analysis time, and model provenance.
- A model implementation MUST be substitutable without changing News or Strategy contracts.
- When Sentiment contributes to an Experiment, it enters Strategy only through a
  public neutral input selected by the Backtest configuration. Practical
  provenance MUST identify the relevant result, model/version, and News extraction
  provenance where applicable; exact sealed time-series replay is not an active
  MVP requirement.

## Executable public API and status

The current executable public surface is [`modules/sentiment/api/index.ts`](../../../modules/sentiment/api/index.ts). The approved relevant operations are `analyze` and `readLatestForNews`, with `SentimentAnalysisService` and result types re-exported by the barrel. These functions currently throw `NOT_IMPLEMENTED`. Existing snapshot operations are non-normative source-reconciliation items under the practical-provenance decision in ADR-007.

## Failure expectations

- Empty or invalid input is rejected without storing a result.
- Timeout, analyzer exception, or non-finite/out-of-range score produces no fabricated Sentiment Result.
- Missing result reads return an explicit absence rather than a neutral value.
- A provider/model failure is logged or measured with useful context while unrelated capabilities continue.

## Acceptance scenarios

#### Scenario: Valid analysis is stored with provenance

- **Given** valid neutral sentiment input and a conforming analyzer
- **When** analysis succeeds
- **Then** a valid label and finite normalized score are stored with input reference and model/version provenance

#### Scenario: Model is replaceable

- **Given** a second conforming analysis implementation
- **When** it replaces the first
- **Then** News and Strategy public contracts remain unchanged and new results identify the new model/version

#### Scenario: Timeout is isolated

- **Given** an analyzer that exceeds its bounded call time
- **When** News requests sentiment
- **Then** no fabricated result is stored, the failure is observable, and News plus core trading flows remain available

#### Scenario: Missing sentiment is honest

- **Given** a News Item with no successful sentiment result
- **When** its sentiment is read
- **Then** the response represents absence rather than inventing `NEUTRAL`
