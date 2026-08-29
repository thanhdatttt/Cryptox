# ADR-007: Use Practical Experiment Provenance for MVP Reproducibility

- **Status:** Accepted
- **Decision date:** 2026-08-27
- **Decision owners:** Cryptox team
- **Partially supersedes for MVP:** [ADR-002](./ADR_002_plugin_architecture.md) exact executable-artifact requirements and [ADR-004](./ADR_004_sentiment_isolated_module.md) mandatory sealed sentiment-snapshot mechanics
- **Related decisions:** [ADR-005](./ADR_005_module_first_structure.md), [ADR-006](./ADR_006_local_backtest_execution.md)
- **Canonical documents:** [Requirements](../requirements.md), [Architecture](../architecture.md), [Data model](../data-model.md)

## Context

Cryptox must make an Experiment understandable, comparable, and reasonably reproducible. Earlier design work expanded that goal into exact content hashes, retained executable artifacts, sealed copies of intermediate data, and indefinite replay guarantees. Those mechanisms can support strict archival replay, but they are disproportionate for the MVP and can create an artifact repository project of their own.

The MVP needs honest traceability: a reviewer must be able to identify what strategy, input, code, evaluation, and scoring configuration produced a result. It must not claim byte-for-byte replay when the exact historical code or data was not retained.

## Decision

Every completed Experiment records or can resolve the following provenance:

- strategy definition ID, strategy type/name, definition version, and normalized parameters;
- composite definition ID/version, combination method, components, weights, and thresholds when a composite is used;
- pair, timeframe, and historical range;
- dataset identity/version where practical, otherwise explicit data-source provenance for the recorded range;
- application/code version or Git commit where practical;
- evaluation results and the Trades that produced them; and
- scoring/ranking configuration or its stable version/reference when ranking is relevant.

Additional rules:

- Strategy and Composite Definitions are immutable. Changing behavior-bearing parameters, components, weights, thresholds, or method creates a new definition/version.
- Parameters and scoring configuration use a stable normalized representation so equivalent experiments can be compared.
- Dataset and code identifiers describe what is known; they do not imply that every byte or executable artifact is retained forever.
- The system never silently substitutes current code or data and describes the result as an exact replay of older inputs.
- User-facing and technical documentation distinguish traceability from exact replay and state the available guarantee honestly.
- When sentiment contributes to an Experiment, the relevant sentiment result retains model name/version provenance. Mandatory sealed sentiment time series and content hashes are deferred until an approved capability needs them.
- The MVP does not require indefinite binary/plugin retention, a dedicated artifact repository, hashes for every intermediate object, or duplicate sealed datasets.

### 2026-08-29 extension provenance amendment

The following extension inputs join practical provenance and must be inspectable
where they influence a result: Strategy Definition authoring origin without
credentials; Composite enabled components, `WEIGHTED_VOTE_V1` weights and
thresholds; Search algorithm profile/configuration and persisted seed; dataset
identity; code version; Backtest execution profile including decimal/rounding,
fee, slippage, position mode, and SL/TP policy; and normalized News extraction
source/template version when a permitted News/Sentiment-derived input is used.

`RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1` must generate the same candidate
sequence and ranking for the same input, seed, dataset identity, code version, and
configuration. Retaining normalized News records, extraction provenance, and
template version for 90 days (and raw HTML for only seven audit/reprocess days)
does not assert byte-for-byte replay after those artifacts or an external source
change. Secrets, raw credentials, cookies, and provider API keys are never
provenance.

## Consequences

### Positive

- Experiments remain explainable and comparable without excessive storage and release machinery.
- Immutable definitions prevent parameter edits from silently changing history.
- A Git commit or application version gives useful code provenance when available.
- The recorded guarantee remains truthful when exact replay inputs are unavailable.

### Trade-offs

- Some old Experiments may be traceable but not byte-for-byte replayable.
- Dataset providers or code builds may need additional retention later if stronger guarantees become a requirement.
- A future strict-replay capability must define its own retention, hashing, canonicalization, and compatibility policy.

## Alternatives considered

1. **Retain every executable and seal/hash every input and intermediate.** Rejected for the MVP as disproportionate archival infrastructure.
2. **Store only final metrics.** Rejected because it cannot explain or compare how a result was produced.
3. **Use current code/data when older inputs are missing.** Rejected because it would create a misleading replay claim.

## Verification

An Experiment read model must make the provenance above inspectable. Tests must show that changing a strategy/composite definition produces a new version and that missing historical code/data is reported honestly rather than substituted. Physical storage design remains implementation-specific and is governed by [the canonical data model](../data-model.md).
