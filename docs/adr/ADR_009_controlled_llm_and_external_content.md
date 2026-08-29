# ADR-009: Control LLM Authoring and External Content Acquisition

## Status

Accepted — 2026-08-29

- **Decision owners:** Instructor functional amendment
- **Related decisions:** [ADR-002](./ADR_002_plugin_architecture.md), [ADR-004](./ADR_004_sentiment_isolated_module.md), [ADR-007](./ADR_007_practical_reproducibility.md)
- **Canonical documents:** [Requirements](../requirements.md), [Architecture](../architecture.md), [Data model](../data-model.md)

## Context

The academic MVP needs controlled prompt/URL strategy authoring and Website, RSS,
and HTML News collection. A direct model call from pure domain code, a browser-like
server-side fetch of arbitrary user URLs, or automatic promotion of machine output
would violate the existing modularity, security, and truthful-provenance
requirements.

## Decision

### LLM authoring

- `LLM_AUTHORING_V1` uses a provider-neutral Strategy application port. The first
  demo adapter is OpenAI-compatible only when runtime configuration supplies its
  endpoint/model/key; secrets are neither committed nor returned to consumers.
- One submission causes at most one LLM request with a 45-second timeout. The
  provider returns a structured draft, never executable code or an automatically
  persisted Strategy Definition.
- Deterministic schema and domain validation precede an explicit user
  Save/Approve action. Only that approval creates a new immutable definition
  version. Missing configuration, timeout, provider error, or invalid draft has
  no persistence side effect.

### External content and extraction templates

- Only backend adapters fetch imported URLs. A request requires HTTPS and a
  configured allowlist/source list, sends no cookies or credentials, blocks
  localhost/private/link-local destinations and DNS rebinding, permits at most
  three redirects with revalidation at each hop, has a 20-second total timeout,
  and accepts at most 1 MiB of body content.
- Website, RSS, and HTML adapters are configured sources. CoinDesk remains the
  demo source; a new source requires public access and terms review.
- LLM-assisted extraction is an adapter/application concern. Every template is
  versioned. Self-healing may produce only a `DRAFT` template with a reviewable
  diff and metrics; an authorized user/administrator must approve promotion.
  Older templates remain available for rollback.
- News deduplicates by canonical URL, provider identity when available, and
  normalized-content hash. Normalized articles, extraction provenance, and
  template versions retain for 90 days; raw HTML retains for seven days for audit
  or reprocessing and is then purged. Auto-refresh is configurable from one to
  five minutes and defaults to five.

## Consequences

- Generative output and fetched content remain observable, bounded, and under
  explicit human control.
- Strategy plugins stay pure; News/Sentiment module ownership and their neutral
  boundary remain intact.
- The MVP gains no authorization for arbitrary network retrieval, autonomous
  template promotion, LLM-driven trading, or retention of secrets.
- Safe fetch controls require deterministic validation and failure evidence in
  future implementation and tests.

## Verification

Future implementation must demonstrate no call when unconfigured, a single
bounded authoring request, draft validation before persistence, explicit approval,
safe URL rejection/revalidation, draft-only template refinement, retention/purge
behavior, and continued News availability when extraction or sentiment fails.
