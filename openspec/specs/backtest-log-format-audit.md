# Backtest Log Format Audit

Status: completed against `main` and the current Backtest Log working tree

This document records the documentation-format comparison requested for
`openspec/specs/backtest-log-spec.md`. It is an audit log, not a runtime
contract. The `main` versions of the five neighboring specs are the baseline;
the Backtest Log is intentionally allowed to contain more operational detail
when that detail makes implementation and verification unambiguous.

## 1. Audit scope and pipeline

The comparison covered:

- `main:openspec/specs/market-data-spec.md`
- `main:openspec/specs/news-spec.md`
- `main:openspec/specs/search-spec.md`
- `main:openspec/specs/sentiment-specs.md`
- `main:openspec/specs/strategy-spec.md`
- the current `openspec/specs/backtest-log-spec.md`

The review pipeline used independent comparison roles for Market Data, News,
Search, Sentiment, Strategy, cross-spec formatting, and future-agent
implementation readiness. Findings were consolidated locally and verified
against the source files before editing the Backtest Log.

## 2. Shared baseline format

The compact module-spec convention used by News, Search, Sentiment, and
Strategy is:

1. `## 1. Overview` — Purpose, Scope, Actors, and optional source precedence.
2. `## 2. Requirements` — functional table, business rules, NFRs.
3. `## 3. Behavior` — numbered workflows and an Error / edge cases subsection.
4. `## 4. Contracts` — public API, domain/port contracts, data model, events,
   and dependency direction.
5. `## 5. Constraints` — technical constraints, business constraints, and
   out of scope.
6. `## 6. Acceptance Criteria` — grouped, implementation-testable checkboxes.

All five baselines use an H1 spec title, numbered H2 sections, Markdown pipe
tables, language-tagged fenced examples, and a final acceptance-criteria
section. Market Data is an expanded variant: it adds terminology, use cases,
state/invariants, a failure matrix, traceability, and decisions. The Backtest
Log adopts the compact six-section skeleton while using a few of Market Data's
expanded techniques where queue/audit state requires them.

## 3. Pairwise differences

### 3.1 Market Data versus Backtest Log

| Format area | `main` Market Data convention | Backtest Log difference and decision |
|---|---|---|
| Opening | Status line and an unnumbered audited preamble precede Overview. | Retained this optional metadata/preamble pattern; status now records that this file was format-audited. |
| Hierarchy | Expanded H2 sections `1` through `12`, including Terminology, Use cases, State and invariants, Traceability, and Decisions. | Uses the compact `1`–`6` module layout. Candidate state, failures, traceability, and decisions remain embedded in the Backtest-specific sections. |
| Requirements | `FR-MD-*` are individual `####` headings and use uppercase normative keywords. | Uses a two-column `FR-BL-*` table and lowercase `must`, matching the other four compact specs. The module-prefixed IDs remain useful and stable. |
| Contracts | More granular contract, state, cache, and snapshot subsections. | Keeps richer persistence, queue, provenance, and Trade Detail contracts; `4.2.1` is now a true nested `####` heading. |
| Verification | Dedicated failure matrix, acceptance criteria, traceability, and decisions. | Acceptance criteria include replay/fencing/recovery checks; this audit supplies the cross-document format traceability. |

### 3.2 News versus Backtest Log

| Format area | `main` News convention | Backtest Log difference and decision |
|---|---|---|
| Opening | Title followed immediately by Overview; no status line or preamble. | Adds the Market Data-style status/preamble because the Backtest Log is an audited implementation baseline. |
| Requirements | Short `FR-1`…`FR-11` rows; compact plain-label business/NFR bullets. | Has `FR-BL-001`…`FR-BL-027`, longer rows, and detailed audit rules. The table shape is identical; the extra density is domain-driven. |
| Behavior | Small provider/sentiment workflows and `Error / edge cases`. | Five larger coordinator/worker/completion workflows; the error heading now uses the same `Error / edge cases` wording. |
| Contracts | Public runtime/composition API, domain contracts, data model, events, and dependency direction. | Adds REST, queue, persistence, provenance, and replay contracts; explicit composition, Events, and Module dependency direction subsections were added. |
| Examples | Mostly Mermaid, TypeScript, text, and SQL with small single-purpose blocks. | Also has HTTP/SQL/queue sketches. The REST block is explicitly labeled pseudocode and uses a `text` fence. |

### 3.3 Search versus Backtest Log

| Format area | `main` Search convention | Backtest Log difference and decision |
|---|---|---|
| Opening | No status line or unheaded preamble. | Optional status/preamble retained as an intentional Market Data-style extension. |
| Requirements | Compact functional table, business rules, NFRs. | Adds the Candidate state-transition contract as `2.3`, so NFRs are `2.4`; the state contract is needed for coding agents. |
| Contracts | Explicit Events and Module dependency direction sections. | Now has `4.5 Events` and `4.6 Module dependency direction`; queue signals are documented as wake-ups, not domain events. |
| Boundaries | Search consumes Backtesting only through public APIs. | Backtesting documents the reciprocal queue/application boundary and its composition facade. |
| Acceptance | Groups start/configuration, concurrency, stop conditions, pause/resume/cancel, errors, observability, and architecture. | Groups Candidate/Attempt, Trades/completion, recovery, reproducibility/traceability, and boundary/architecture; the grouping follows Backtesting lifecycle concerns. |

### 3.4 Sentiment versus Backtest Log

| Format area | `main` Sentiment convention | Backtest Log difference and decision |
|---|---|---|
| Title/fences | Title path is unquoted; examples use `~~~` fences. | Uses the majority repository style: backtick fences and a backticked module path. This is a logged style variance, not a Markdown defect. |
| Structure | Compact six-section layout with flat `4.1`–`4.7` contract headings. | Same top-level layout, with an intentional `2.3` state contract and nested `#### 4.2.1` persistence detail. |
| Requirements | Short functional rows and concise snapshot rules. | Longer rows cover retries, fencing, cancellation audit, metrics, and replay. These details are retained for implementation readiness. |
| Events/data | Explicit events and snapshot contracts. | Explicitly states that no Backtesting domain events exist in the MVP and names the durable data-model subsection. |
| Verification | Acceptance checkboxes for analysis, snapshot immutability, replay, and boundaries. | Adds deterministic test-seam guidance for queue, clock, lease, repository, and cross-module adapters. |

### 3.5 Strategy versus Backtest Log

| Format area | `main` Strategy convention | Backtest Log difference and decision |
|---|---|---|
| Opening | Title followed by Overview; no status/preamble. | Status/preamble is retained as the audited-baseline extension. |
| Requirements | Short Strategy-specific FR rows, business rules, and NFRs. | Uses the `FR-BL-*` namespace and adds lifecycle/queue rules; Strategy execution remains referenced through its public API. |
| Contracts | Public runtime/composition API, core domain, registry, data model, events, dependency direction. | Backtest has public progress/result API, durable data mapping, provenance, queue contract, events, and dependency direction. |
| Examples | Mostly Mermaid and TypeScript. | Adds HTTP pseudocode, SQL migration constraints, and a provenance text graph because audit persistence needs them. |
| Acceptance | Plugin registry, definitions, composites, resolution, reproducibility. | Candidate history, Trade Detail, recovery/fencing, replay, and architecture boundaries; all remain checkable under the shared final section. |

## 4. Adjustments applied to the Backtest Log

- Removed stray one-space indentation from the source-precedence paragraph and
  business-rule bullet starts.
- Corrected `#### 4.2.1` so its Markdown heading level matches its nested
  numbering.
- Renamed `3.5 Error and edge cases` to `3.5 Error / edge cases`.
- Corrected the invalid lifecycle-transition cross-reference from `§2.4` to
  `§2.3` and standardized `§` references in the compatibility paragraph.
- Added the documented `createBacktestingModule` composition/bootstrap
  boundary and clarified that consumers cannot import Backtesting internals.
- Added explicit `4.5 Events` and `4.6 Module dependency direction` coverage.
- Retagged the schematic REST exchange as `text` and labeled it pseudocode,
  preventing invalid shorthand from being mistaken for literal JSON.
- Added deterministic test-seam guidance before the acceptance checklist and
  renamed the final groups for reproducibility and architecture clarity.

## 5. Intentional differences retained

The following are deliberate Backtesting extensions rather than format defects:

- `FR-BL-*` IDs and the two-column requirement table.
- Candidate state transitions, separate Attempt/completion lifecycles, queue
  fencing, cancellation audit, and reconciliation/watchdog behavior.
- Detailed persistence mappings, runtime provenance, Trade Detail, replay, and
  exact fill/accounting rules.
- Additional Mermaid, TypeScript, SQL, and text examples.
- Status/preamble metadata, which matches the expanded Market Data spec and
  makes the document's audit/implementation-baseline status explicit.

Future agents should preserve these extensions unless a later repository-wide
spec-format decision standardizes all modules on the expanded Market Data
template or on the compact template.

## 6. Verification checklist

- [x] One H1 title and six numbered top-level sections are present.
- [x] Overview, Requirements, Behavior, Contracts, Constraints, and Acceptance
  Criteria are discoverable by the shared heading pattern.
- [x] Functional requirements, tables, code fences, and checkbox acceptance
  criteria remain parseable Markdown.
- [x] Nested `4.2.1` uses an H4 heading; no stale `§§`, `§2.4`, or `branch-main`
  references remain.
- [x] The five `main` baseline specs and the Backtest Log are compared above,
  with domain expansions separated from actual formatting deviations.
