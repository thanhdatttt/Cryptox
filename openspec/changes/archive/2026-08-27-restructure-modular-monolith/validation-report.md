# Documentation Cross-Validation Report

- **Change:** `restructure-modular-monolith`
- **Review date:** 2026-08-14
- **Review mode:** Read-only; no code, runtime, migration, build, or schema changes
- **Original status (2026-08-14):** Final documentation gate PASS; implementation validation remains pending
- **Closure status (2026-08-27):** CLOSED AND ARCHIVED AS HISTORICAL; see `closure.md`

## 2026-08-27 closure update

This report is preserved as evidence of the earlier design review, not as a claim
about the current repository. TypeScript module/app scaffolding was later added,
while most product behavior remains unimplemented. Stage 2 established the
instructor assignment and reviewed requirements as higher authority, consolidated
the active design/specification corpus, superseded the mandatory distributed
Backtest topology through ADR-006, and replaced strict artifact replay through
ADR-007. Queue compatibility and runtime migration items remain incomplete or
superseded; the original PASS applies only to the historical docs-only gate.

Sections 3–7 preserve the pre-refinement audit baseline so the reasoning and evidence trail remain reviewable. They are not a statement that the current design still contains every listed issue. The current state is recorded in sections 8–10.

## 1. Executive conclusion

The documentation is coherent and sufficiently explicit to guide the planned structure/boundary migration, but it is **not implementation-verified** because the repository has no runtime implementation, tests, migrations, or executable OpenSpec specs for this change.

The following claims are currently consistent across the documentation set:

- `modules/` is an organizational namespace, not a deployable process boundary.
- `strategy-engine + composite-strategy` map to `modules/strategy`.
- `search-engine + continuous-loop` map to `modules/search`.
- REST handles commands/queries, the market-only WebSocket handles realtime market data, and BullMQ is the only asynchronous backend boundary.
- PostgreSQL is authoritative and there is no general Event Bus.
- `ExperimentResult` and the Completion Processor remain in `modules/backtesting` for the MVP.

The current refinement also makes Search/Backtesting Candidate access facade-only, queue wire types self-contained/versioned, definition version allocation explicit, sentiment snapshot alignment deterministic, Search `ERROR` terminal, and Completion/Leaderboard transaction scope explicit.

The ownership and boundary contradictions from the initial audit are resolved in the current design. Implementation work should begin in a later approved change only after adding the architecture/import, queue-compatibility, and runtime behavior tests listed in the implementation tasks.

## 2. Validation pipeline

```text
Stage 1: independent review
  ├── repository/document census and traceability
  ├── architecture/runtime consistency
  ├── contracts/data-model integrity
  ├── OpenSpec/ADR governance
  └── adversarial trustworthiness review

Stage 2: cross-examination
  └── reconcile repeated findings against the current files and classify
      confirmed contradiction vs. valid ambiguity vs. validation limit

Stage 3: local evidence sweep
  └── inspect current worktree, tracked/untracked documentation, stale paths,
      docs-only scope, and diff hygiene
```

All reviewers were instructed to read only and not modify files. The initial cross-examiner confirmed the key boundary findings; a subsequent final gate reviewer re-checked the refined state and returned PASS.

## 3. Pre-refinement confirmed contradictions (historical baseline)

### 3.1 Candidate ownership — High / blocker

`component-contracts.md` §5 places `CandidateStatus`, `CandidateStrategy`, `CandidateBase`, and `CandidateProgress` in the Search contract area. `project-structure.md` §3.1 and `data-model.md` §3.7 assign the Candidate lifecycle and `candidate_strategies` persistence to `modules/backtesting`. `component-contracts.md` §6 also treats Candidate as part of the Backtesting boundary.

This is a real ownership contradiction, not just terminology. It affects aggregate ownership, repositories, public APIs, imports, and the Search ↔ Backtesting boundary.

**Resolution adopted during refinement:** `modules/backtesting` owns Candidate lifecycle, persistence, and `CandidateProgress`; `modules/search` owns only Search Run/generator/slot orchestration.

Evidence:

- `docs/design/component-contracts.md` §5–§6
- `docs/design/project-structure.md` §3.1
- `docs/design/data-model.md` §3.7

### 3.2 Sentiment persistence and dependency direction — High

ADR-004 says the News workflow owns persistence of both the normalized News item and the returned `SentimentResult`. The data model assigns `sentiment_results` to `modules/sentiment`, while the structure document says Sentiment owns model provenance and snapshots. The Sentiment API also accepts `NewsItem`, a News-owned type, while News calls Sentiment.

The persistence ownership is contradictory. The type dependency is at least a coupling risk and may become a cycle if module APIs import each other's domain types directly.

**Resolution adopted during refinement:** Separate these concepts explicitly:

- News workflow orchestration;
- Sentiment result repository/table ownership;
- Sentiment input DTO ownership;
- sentiment snapshot creation and persistence ownership.

Evidence:

- `docs/adr/ADR_004_sentiment_isolated_module.md` §Decision
- `docs/design/component-contracts.md` §9
- `docs/design/project-structure.md` §3.1 and §5
- `docs/design/data-model.md` §3.12 and §3.1.2

### 3.3 Queue contract canonical location — High

The Backtesting contract examples show `BacktestQueueJob` and `BacktestQueueTerminalSignal` under `modules/backtesting/api`. Section 11 separately maps cross-process queue messages to `packages/contracts/queue/backtesting.ts`.

Both can be valid only if one is clearly the module-facing command/API and the other is the canonical wire schema with an explicit mapping. The current documents do not make that distinction.

**Resolution adopted during refinement:** Establish one canonical model:

```text
modules/backtesting/api
  = public in-process commands/facade contracts

packages/contracts/queue
  = canonical cross-process serialized wire schema

modules/backtesting/infrastructure/queue
  = BullMQ adapter and transport mapping
```

Evidence:

- `docs/design/component-contracts.md` §6 and §10–§11
- `docs/design/project-structure.md` §6.2
- `docs/adr/ADR_003_jobqueue.md`

## 4. Pre-refinement implementation-readiness gaps (historical baseline)

These were not all contradictions, but at the time of the initial audit they had to be resolved or explicitly deferred before implementation. The adopted resolutions and remaining implementation-only limits are recorded in §8–§9.

### 4.1 Public entrypoints are over-claimed as complete — High

`tasks.md` marks public entrypoints as defined, but the docs provide only a generic allowlisted-entrypoint rule and examples for `@cryptox/backtesting` and `@cryptox/strategy`. There is no per-module export matrix for `market-data`, `search`, `evaluation`, `leaderboard`, `news`, or `sentiment`, and no concrete rule for module bootstrap/factory exports.

The task should not be considered complete until the public surface is enumerated, or it should be moved back to pending.

### 4.2 Neutral input contracts are unresolved — High/Medium

`StrategyContext` directly uses `Candle[]` from Market Data and a sentiment shape whose field naming differs from the Sentiment result (`averageScore` versus `score`). The Sentiment API directly accepts `NewsItem` from News. `GeneratedCandidate` and Search submission also pass Strategy-owned definitions across the Search/Backtesting boundary.

The existing unchecked task correctly identifies this risk. It must remain pending until the ownership and shape of neutral input DTOs are decided.

### 4.3 Composition-root rule is ambiguous — Medium

`apps/backend` and `apps/backtest-worker` are composition roots that must wire module infrastructure, but the forbidden examples say `apps/backend` may not import module internal implementation files. No permitted bootstrap/factory surface is defined.

This is resolvable, but the docs must state whether apps import a public module bootstrap API, a composition-only entrypoint, or another explicit mechanism.

### 4.4 Cancellation and audit Trades lifecycle is underspecified — Medium

The flow and contract docs allow a worker that loses a cancellation race to close an Attempt and store Trades for audit. The data model describes Trades as produced by completed Attempts and defines Attempt states as `RUNNING`, `COMPLETED`, and `FAILED`, without a clear rule for a cancelled attempt that has persisted audit Trades.

The lifecycle needs an explicit invariant: whether cancelled Attempts can retain Trades, which Attempt status they use, and whether those Trades contribute to duration/attempt counters or are excluded from Experiment/ranking.

### 4.5 Aggregate versus persistence/read model is unclear — Medium

`ExperimentResult` is described as a persisted aggregate containing `trades: Trade[]`, while the data model stores `experiment_results` and `trades` in separate tables. This may be an intentional hydrated aggregate/read projection, but the write model and source-of-truth relationship are not stated precisely.

### 4.6 Other semantics needing explicit definitions — Medium/Low

- Search Run `FAILED`/`ERROR` transition and recovery behavior are not fully defined.
- `NO_IMPROVEMENT` lacks baseline, metric, tolerance, tie, and multiple-stop-condition precedence semantics.
- The Completion Processor/Leaderboard transaction boundary lacks an explicit unit-of-work contract.
- Redis cache read policy lacks cache-miss, staleness, fallback, and authoritative-read rules for chart data.
- Version increment requirements are documented, but the mechanism/constraint that guarantees per-family ordering is not explicit.
- `latest_sentiment` has no documented deterministic tie-breaker for equal timestamps.
- The data-flow participant `Scheduler or REST Command` has no documented owner or process composition.

## 5. Evidence and governance limitations

The following are limitations on trustworthiness, not necessarily design defects:

- The repository has no implementation, migrations, package manifest, dependency versions, tests, `openspec/specs/`, or `.github/workflows/` despite some being shown in planned trees.
- Many documents cite `brief §...`, but the referenced brief is not present in the repository. Those references cannot be independently verified from the current workspace.
- Retry, fencing, lock order, reconciliation, BullMQ behavior, cache consistency, snapshot immutability, and architecture boundaries are design claims only; ADR `Evidence` sections are proposed checks, not executed evidence.
- The OpenSpec CLI is unavailable, so `openspec validate` could not be run.
- ADR-005 is marked Accepted but has no explicit acceptance/evidence trail. Existing ADRs describe evidence plans rather than recorded validation results.
- The structure document calls ADRs immutable, while ADR-003 and ADR-004 have editorial path/terminology changes in the current worktree. Governance needs an explicit editorial-amendment policy or these changes should be represented as superseding ADRs.

## 6. Pre-refinement recommended planning order

1. Finalize ownership matrix for Candidate, CandidateProgress/LoopStatus, SentimentResult, sentiment snapshots, ExperimentResult, and Trades.
2. Define the per-module public API/export and composition/bootstrap matrix.
3. Define neutral input/wire contracts for Strategy context, Sentiment input, generated candidates, and queue messages.
4. Define cancellation, Search failure, stop-condition, and completion/leaderboard transaction semantics.
5. Define PostgreSQL/Redis authority and cache consistency rules.
6. Establish a repository-local requirements/spec source to replace unverifiable `brief §...` references, or add the missing brief to the repository.
7. Decide ADR editorial-amendment policy and correct the OpenSpec task status claims.
8. Only after the above decisions, update the architecture docs and create machine-checkable OpenSpec specs for the implementation migration.

## 7. Pre-refinement trust assessment

| Area | Assessment |
|---|---|
| Architectural direction | Coherent and well supported by repeated documentation |
| Module ownership | Not trustworthy until Candidate and Sentiment ownership are resolved |
| Cross-process contract placement | Not trustworthy until queue canonical location is resolved |
| Runtime semantics | Consistent as a design narrative, but not executablely verified |
| Implementation readiness | Not ready |
| Docs-only scope of the current change | Verified; no code/runtime/migration files were changed |

## 8. Decision resolution recorded in the docs-only refinement

The following decisions were adopted during the subsequent planning discussion and reflected in the design documents:

- `modules/backtesting` owns Candidate lifecycle, persistence, and `CandidateProgress`; `modules/search` owns Search Run/generator/slot orchestration.
- `modules/news` owns NewsItem persistence; `modules/sentiment` owns SentimentResult and sentiment snapshot persistence.
- Sentiment consumes neutral `SentimentInput`; Strategy consumes neutral `StrategyCandle` values rather than importing News or Market Data domain entities directly.
- `packages/contracts/queue` is the canonical serialized queue schema; Backtesting API contracts and the queue adapter are explicitly separated.
- Deployable apps use allowlisted module runtime/bootstrap facades and do not import module infrastructure/domain internals directly.
- A cancelled Candidate may retain an audit-completed Attempt and Trades, but it cannot create an Experiment or ranking entry.
- Public module API/bootstrap responsibilities are now enumerated in `docs/design/project-structure.md` §5.1.
- Search obtains Candidate counts/projections, submits Search candidates, and cancels Search candidates through Backtesting public facades; it never owns Candidate persistence.
- Queue wire contracts are self-contained under `packages/contracts/queue`, carry `schemaVersion`, and are mapped to in-process Backtesting contracts by the adapter.
- Strategy and Composite Definitions require stable logical-family keys with atomic per-family version allocation; immutable content/provenance changes create new versions.
- Sentiment snapshots use deterministic as-of alignment, canonical base-asset mapping, normalized scores, and explicit missing-window rejection for INFORMATION Candidates.
- Search `ERROR` is an immediate terminal `FAILED` transition with `lastError`/`endedAt`; callbacks cannot convert it to `COMPLETED`.
- Leaderboard `submit()` receives the Completion Processor's opaque unit-of-work and cannot open a separate transaction.

These decisions remove the three previously confirmed ownership/canonical-location contradictions and the later cross-review boundary findings. Remaining non-blocking limitations are recorded rather than hidden: no implementation evidence exists yet; the referenced brief and `openspec/specs/` are still absent; runtime architecture/import tests, full Search state-machine tests, queue schema compatibility tests, and runtime BullMQ behavior still require later implementation validation.

## 9. Refinement gate

The docs-only refinement is considered ready for another review cycle when all of the following remain true:

- no document assigns Candidate persistence to Search;
- no document assigns SentimentResult persistence to News;
- no document presents two competing canonical queue wire schemas;
- Search uses Backtesting public Candidate facades rather than Candidate tables/repositories;
- queue wire types are self-contained/versioned and do not import Backtesting API types;
- version-family allocation, sentiment as-of alignment, Search ERROR terminalization, and Leaderboard unit-of-work rules remain explicit;
- public API/bootstrap matrix and neutral input contracts remain synchronized with `openspec/config.yaml`;
- no code, runtime, migration, build, or schema files are changed by this planning work.

## 10. Final cross-review gate

The final pipeline completed with no active Critical or High findings:

1. Four independent reviewers checked ownership/API boundaries, contracts/data-flow/lifecycle, ADR/OpenSpec traceability, and adversarial stale references.
2. A cross-examiner found four blockers: Search facade scope, cancellation unit-of-work representation, a malformed Leaderboard contract fence, and a stale executive conclusion. All four were corrected and rechecked.
3. A final independent gate reviewer verified `removePendingJobs` as an allowlisted composition hook, `CancellationUnitOfWork`, balanced contract fences, the updated validation conclusion, and consistency of Candidate/Search, queue, ADR/OpenSpec, sentiment, Search `ERROR`, versioning, and docs-only scope. Result: **PASS**.
4. Local checks passed: Markdown fence parity and `git diff --check`. The worktree change set contains only README/docs/ADR/OpenSpec files. The OpenSpec CLI is unavailable, so official CLI validation and runtime/import tests remain implementation-stage checks.

Final assessment: the documentation is internally consistent and trustworthy for the agreed structure/boundary planning. It is not a claim that runtime behavior or future implementation has been verified.
