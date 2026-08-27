# MVP Implementation Task Board

This is the only mutable operational status board for the MVP program. Detailed
acceptance criteria and worker instructions remain in
[`MVP_PLAN.md`](MVP_PLAN.md). Only the Manager changes task state, ownership,
checkpoint commit, or validation status.

Valid states: `BLOCKED`, `READY`, `IN_PROGRESS`, `REVIEW`, `DONE`.

## Current frontier

| Task | State | Wave | Critical | Owner | Latest branch / commit | Validation |
|---|---|---:|---|---|---|---|
| P-00 | DONE | 0 | YES | Manager | `MVP_IMPLEMENTATION` / containing P-00 checkpoint commit | Repository/documentation checks PASS; OpenSpec CLI UNVERIFIED |
| C-01 | DONE | 1 | YES | Manager | `MVP_IMPLEMENTATION` / `d7136318ecc5ca98670db4c260974a64d0fcbbfe` | Reviews and all C-01 gates PASS |
| D-01 | READY | 2 | YES — B-02 gate | Unassigned persistence specialist | — | Ready after C-01 |
| M-01 | BLOCKED | 2 | Integration | Unassigned Market Data worker | — | Not started |
| M-02 | BLOCKED | 3 | Integration | Unassigned Market Data worker | — | Not started |
| S-01 | READY | 2 | YES | Unassigned Strategy core worker | — | Ready after C-01 |
| S-02 | BLOCKED | 3 | Integration | Unassigned Strategy worker A | — | Not started |
| S-03 | BLOCKED | 3 | Integration | Unassigned Strategy worker B | — | Not started |
| E-01 | READY | 2 | YES — B-02 gate | Unassigned Evaluation worker | — | Ready after C-01 |
| L-01 | BLOCKED | 2 | YES — B-02 gate | Unassigned Leaderboard worker | — | Not started |
| B-01 | BLOCKED | 3 | YES | Unassigned Backtesting domain worker | — | Not started |
| B-02 | BLOCKED | 4 | YES | Unassigned Backtesting application worker | — | Not started |
| Q-01 | BLOCKED | 3–4 | Integration | Unassigned Search worker | — | Not started |
| N-01 | BLOCKED | 2 | Integration | Unassigned News worker | — | Not started |
| N-02 | BLOCKED | 2 | Integration | Unassigned Sentiment worker | — | Not started |
| F-01 | READY | 2 | Integration | Unassigned Frontend worker | — | Ready after C-01 |
| F-02 | BLOCKED | 3 | Integration | Unassigned Frontend worker | — | Not started |
| I-01 | BLOCKED | 5 | YES | Manager / integration worker | — | Not started |
| I-02 | BLOCKED | 6 | YES | Manager plus independent reviewers | — | Not started |

## Task records

### P-00 — Durable Program Bootstrap

- **Requirement IDs:** `CSL-R-DL-01`, `CSL-R-AR-01`
- **State / owner / wave:** DONE / Manager / Wave 0
- **Critical / parallelism:** YES / NO
- **Start dependencies:** Human Stage 5 review
- **Integration dependencies:** None
- **Objective:** Persist the approved decisions, complete packets, mutable board,
  checkpoint, and OpenSpec governance needed for context-free continuation.
- **Write scope:** `docs/implementation/**`, `openspec/changes/**`
- **Latest branch / commit:** `MVP_IMPLEMENTATION`; the commit containing this
  board is the P-00 checkpoint (`git log -1 --oneline`).
- **Validation:** Documentation links, task/dependency/state checks, diff scope,
  whitespace, architecture, artifact, and deferred-scope checks PASS. Formal
  OpenSpec CLI validation is UNVERIFIED because the CLI is unavailable.
- **Full packet:** [`MVP_PLAN.md#p-00--durable-program-bootstrap`](MVP_PLAN.md#p-00--durable-program-bootstrap)

### C-01 — Executable Contract and Behavior Freeze

- **Requirement IDs:** `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-ST-01`–`04`,
  `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-EV-01`, `CSL-R-LB-01`,
  `CSL-R-VIS-01`, `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-RP-01`, `CSL-R-OB-01`
- **State / owner / wave:** DONE / Manager / Wave 1
- **Critical / parallelism:** YES / NO
- **Start dependencies:** P-00
- **Integration dependencies:** None
- **Objective:** Freeze executable module, port, transport, overlay, metric, ranking,
  search, and provenance contracts before implementation fans out.
- **Write scope:** Canonical module API contracts and ports; REST DTOs; market WS
  mappings only when necessary; contract tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` /
  `d7136318ecc5ca98670db4c260974a64d0fcbbfe`.
- **Validation:** Three independent read-only reviews PASS. Root build, typecheck
  (including contract fixtures), lint, 49 tests, architecture, artifact,
  deferred-scope, and diff checks PASS. OpenSpec strict validation PASS.
- **Full packet:** [`MVP_PLAN.md#c-01--executable-contract-and-behavior-freeze`](MVP_PLAN.md#c-01--executable-contract-and-behavior-freeze)

### D-01 — Minimal MVP Persistence Foundation

- **Requirement IDs:** `CSL-R-MD-01`, `CSL-R-ST-04`, `CSL-R-SE-02`,
  `CSL-R-BT-01`, `CSL-R-EV-01`, `CSL-R-LB-01`, `CSL-R-NW-01`, `CSL-R-SN-01`,
  `CSL-R-RP-01`, `CSL-R-OB-01`
- **State / owner / wave:** READY / Unassigned persistence specialist / Wave 2
- **Critical / parallelism:** YES, gates B-02 / YES, with one DB writer
- **Start dependencies:** C-01
- **Integration dependencies:** None
- **Objective:** Add only approved physical entities, reversible migrations, and
  repository conventions.
- **Write scope:** `infra/db/**` and packet-assigned module PostgreSQL adapters/tests.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started; PostgreSQL/Docker availability may block DB evidence.
- **Full packet:** [`MVP_PLAN.md#d-01--minimal-mvp-persistence-foundation`](MVP_PLAN.md#d-01--minimal-mvp-persistence-foundation)

### M-01 — Binance Historical Market Data

- **Requirement IDs:** `CSL-R-MD-01`, `CSL-R-RP-01`, `CSL-R-AR-02`
- **State / owner / wave:** BLOCKED / Unassigned Market Data worker / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** Live smoke before I-01
- **Objective:** Validate, paginate, normalize, persist, and identify historical candles.
- **Write scope:** `modules/market-data/**` except frozen contracts; its repository/tests.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#m-01--binance-historical-market-data`](MVP_PLAN.md#m-01--binance-historical-market-data)

### M-02 — Realtime Market Delivery and Gap Recovery

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-FE-01`, `CSL-R-OB-01`,
  `CSL-R-AR-02`, `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Unassigned Market Data worker / Wave 3
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** M-01
- **Integration dependencies:** F-01 and I-01
- **Objective:** Deliver normalized market klines with bounded reconnect, gap fill,
  deduplication, and observable connection state.
- **Write scope:** Market Data application/infrastructure and market WebSocket tests.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#m-02--realtime-market-delivery-and-gap-recovery`](MVP_PLAN.md#m-02--realtime-market-delivery-and-gap-recovery)

### S-01 — Strategy Registry, Definitions and Composite Core

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-ST-04`,
  `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-RP-01`
- **State / owner / wave:** READY / Unassigned Strategy core worker / Wave 2
- **Critical / parallelism:** YES / YES after C-01
- **Start dependencies:** C-01
- **Integration dependencies:** D-01 for persistence completion
- **Objective:** Implement registry, descriptors, immutable definitions, generic
  analysis output, and `MAJORITY_VOTE_V1` with fake plugins.
- **Write scope:** Strategy core/application/infrastructure/tests excluding built-in directories.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#s-01--strategy-registry-definitions-and-composite-core`](MVP_PLAN.md#s-01--strategy-registry-definitions-and-composite-core)

### S-02 — Moving Average and RSI

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-02`, `CSL-R-VIS-01`, `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Unassigned Strategy worker A / Wave 3
- **Critical / parallelism:** Integration / YES with S-03 and B-01
- **Start dependencies:** S-01
- **Integration dependencies:** B-02 and I-01
- **Objective:** Implement the approved MA and RSI `TECHNICAL_PROFILES_V1` behavior.
- **Write scope:** Dedicated MA/RSI plugin directories and tests.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#s-02--moving-average-and-rsi`](MVP_PLAN.md#s-02--moving-average-and-rsi)

### S-03 — Bollinger Bands and Support/Resistance

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-02`, `CSL-R-VIS-01`, `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Unassigned Strategy worker B / Wave 3
- **Critical / parallelism:** Integration / YES with S-02 and B-01
- **Start dependencies:** S-01
- **Integration dependencies:** B-02 and I-01
- **Objective:** Implement the approved Bollinger and rolling Support/Resistance profiles.
- **Write scope:** Dedicated Bollinger/Support-Resistance plugin directories and tests.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#s-03--bollinger-bands-and-supportresistance`](MVP_PLAN.md#s-03--bollinger-bands-and-supportresistance)

### E-01 — Independent Evaluation

- **Requirement IDs:** `CSL-R-EV-01`, `CSL-R-RP-01`, `CSL-R-AR-02`, `CSL-R-AR-03`
- **State / owner / wave:** READY / Unassigned Evaluation worker / Wave 2
- **Critical / parallelism:** YES, gates B-02 / YES
- **Start dependencies:** C-01
- **Integration dependencies:** B-02
- **Objective:** Compute deterministic Return, Win Rate, drawdown magnitude, and trade count.
- **Write scope:** `modules/evaluation/**` except frozen contracts.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#e-01--independent-evaluation`](MVP_PLAN.md#e-01--independent-evaluation)

### L-01 — Configurable Reproducible Leaderboard

- **Requirement IDs:** `CSL-R-LB-01`, `CSL-R-RP-01`, `CSL-R-OB-01`
- **State / owner / wave:** BLOCKED / Unassigned Leaderboard worker / Wave 2
- **Critical / parallelism:** YES, gates B-02 / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** E-01 and B-02
- **Objective:** Implement versioned `LINEAR_REQUIRED_V1`, deterministic eligibility,
  ties, scopes, and configurable Top-K.
- **Write scope:** `modules/leaderboard/**` except frozen contracts and migrations.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#l-01--configurable-reproducible-leaderboard`](MVP_PLAN.md#l-01--configurable-reproducible-leaderboard)

### B-01 — Deterministic Historical Simulator

- **Requirement IDs:** `CSL-R-BT-01`, `CSL-R-VIS-01`, `CSL-R-RP-01`, `CSL-R-AR-03`
- **State / owner / wave:** BLOCKED / Unassigned Backtesting domain worker / Wave 3
- **Critical / parallelism:** YES / YES
- **Start dependencies:** C-01, S-01 only
- **Integration dependencies:** M-01, S-02, and S-03 before I-01/I-02
- **Objective:** Implement the pure deterministic long-only simulator and traces
  using candle fixtures and fake strategies.
- **Write scope:** Backtesting simulator/domain runner/tests, excluding orchestration/executor.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#b-01--deterministic-historical-simulator`](MVP_PLAN.md#b-01--deterministic-historical-simulator)

### B-02 — Candidate, Execution and Experiment Orchestration

- **Requirement IDs:** `CSL-R-BT-01`, `CSL-R-ST-04`, `CSL-R-RP-01`,
  `CSL-R-OB-01`, `CSL-R-AR-01`, `CSL-R-AR-02`
- **State / owner / wave:** BLOCKED / Unassigned Backtesting application worker / Wave 4
- **Critical / parallelism:** YES / Limited
- **Start dependencies:** D-01, S-01, B-01, E-01, L-01
- **Integration dependencies:** M-01, S-02, and S-03 before I-01/I-02
- **Objective:** Connect Candidate persistence, bounded execution, simulation,
  Evaluation, Experiment/Trades, and Leaderboard.
- **Write scope:** Backtesting application/infrastructure/API implementations/tests.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#b-02--candidate-execution-and-experiment-orchestration`](MVP_PLAN.md#b-02--candidate-execution-and-experiment-orchestration)

### Q-01 — Seeded Random Search and SearchRun Lifecycle

- **Requirement IDs:** `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-LB-01`,
  `CSL-R-OB-01`, `CSL-R-DM-01`, `CSL-R-AR-02`
- **State / owner / wave:** BLOCKED / Unassigned Search worker / Waves 3–4
- **Critical / parallelism:** Integration / YES for fake-port phase
- **Start dependencies:** C-01, S-01
- **Integration dependencies:** D-01, L-01, B-02
- **Objective:** Implement seeded Random generation and a finite SearchRun lifecycle,
  first against fakes and then against real approved ports.
- **Write scope:** `modules/search/**` except frozen contracts and migrations.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started; cannot be DONE after fake-only validation.
- **Full packet:** [`MVP_PLAN.md#q-01--seeded-random-search-and-searchrun-lifecycle`](MVP_PLAN.md#q-01--seeded-random-search-and-searchrun-lifecycle)

### N-01 — News Collection, Deduplication and Query

- **Requirement IDs:** `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-OB-01`, `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Unassigned News worker / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** N-02 and I-01
- **Objective:** Build fixture-first provider-neutral News with a CoinDesk live adapter.
- **Write scope:** `modules/news/**` except frozen contracts and migrations.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started; API credentials affect live smoke only.
- **Full packet:** [`MVP_PLAN.md#n-01--news-collection-deduplication-and-query`](MVP_PLAN.md#n-01--news-collection-deduplication-and-query)

### N-02 — `LEXICON_V1` Sentiment

- **Requirement IDs:** `CSL-R-SN-01`, `CSL-R-OB-01`, `CSL-R-AR-02`,
  `CSL-R-AR-03`, `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Unassigned Sentiment worker / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** N-01 and I-01
- **Objective:** Implement deterministic local lexicon/rule sentiment with normalized
  score, provenance, persistence, and failure isolation.
- **Write scope:** `modules/sentiment/**` except frozen contracts and migrations.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started; hosted services and downloaded model runtimes are forbidden.
- **Full packet:** [`MVP_PLAN.md#n-02--lexicon_v1-sentiment`](MVP_PLAN.md#n-02--lexicon_v1-sentiment)

### F-01 — Frontend Chart and Client Foundation

- **Requirement IDs:** `CSL-R-FE-01`, `CSL-R-MD-02`, `CSL-R-AR-03`
- **State / owner / wave:** READY / Unassigned Frontend worker / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01
- **Integration dependencies:** M-02 and I-01
- **Objective:** Build the app shell, typed clients, independent chart states, and
  fixture market source.
- **Write scope:** `apps/frontend/**`; frozen transport imports only.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#f-01--frontend-chart-and-client-foundation`](MVP_PLAN.md#f-01--frontend-chart-and-client-foundation)

### F-02 — Frontend Strategy, Search, Result and Auxiliary Views

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-SE-01`,
  `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-EV-01`, `CSL-R-LB-01`,
  `CSL-R-VIS-01`, `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Unassigned Frontend worker / Wave 3
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, F-01
- **Integration dependencies:** All real APIs at I-01
- **Objective:** Build descriptor-driven Strategy/Search/Experiment/Leaderboard,
  visualization, News, and Sentiment views against typed fakes.
- **Write scope:** Frontend features and tests only.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#f-02--frontend-strategy-search-result-and-auxiliary-views`](MVP_PLAN.md#f-02--frontend-strategy-search-result-and-auxiliary-views)

### I-01 — Runtime, Transports and Observability Integration

- **Requirement IDs:** All capability integration IDs plus `CSL-R-OB-01` and
  `CSL-R-AR-01`–`CSL-R-AR-03`
- **State / owner / wave:** BLOCKED / Manager or integration worker / Wave 5
- **Critical / parallelism:** YES / NO
- **Start dependencies:** B-02; completed M-01/M-02, S-02/S-03 registration,
  Q-01 integration, N-01/N-02, and F-01/F-02
- **Integration dependencies:** Live Binance/CoinDesk availability for final smoke
- **Objective:** Compose real modules, thin transports, configuration, readiness,
  optional-provider degradation, and operational projections.
- **Write scope:** `apps/backend/**`, example configuration, thin transport mappers;
  module fixes only through owner review.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#i-01--runtime-transports-and-observability-integration`](MVP_PLAN.md#i-01--runtime-transports-and-observability-integration)

### I-02 — E2E Demo, Documentation and Final Verification

- **Requirement IDs:** Every REQUIRED ID, especially `CSL-R-DL-01` and `CSL-R-DM-01`
- **State / owner / wave:** BLOCKED / Manager plus independent reviewers / Wave 6
- **Critical / parallelism:** YES / Reviewer and test work only
- **Start dependencies:** I-01
- **Integration dependencies:** Live-provider smoke where required
- **Objective:** Prove the full MVP, architecture defense, clean setup, demo,
  traceability, and final handoff.
- **Write scope:** E2E tests, README, acceptance/checkpoint evidence, and narrowly
  reviewed fixes.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#i-02--e2e-demo-documentation-and-final-verification`](MVP_PLAN.md#i-02--e2e-demo-documentation-and-final-verification)

## State derivation at this checkpoint

P-00 and C-01 are DONE. Strict recomputation from start dependencies makes D-01,
S-01, E-01, and F-01 READY. Every other unfinished task remains BLOCKED by at
least one unfinished start dependency. No newly READY task was started at this
checkpoint.
