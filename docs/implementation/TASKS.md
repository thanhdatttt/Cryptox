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
| A-00 | DONE | A | YES | Manager | `MVP_IMPLEMENTATION` / containing A-00 checkpoint commit | Documentation, authority, scope, and strict OpenSpec checks PASS |
| C-01A | DONE | 1A | YES | Manager / contract worker | `MVP_IMPLEMENTATION` / `9ca2d7c` | Independent review and all contract/global gates PASS |
| D-01 | DONE | 2 | YES — B-02 gate | Orchestrator / Dewey + independent DB reviewer | `MVP_IMPLEMENTATION` / `f5c5562` | Live down/up/remigrate, schema/constraint/ownership/deferred-scope probes, global gates PASS; config defect fixed |
| M-01 | DONE | 2 | Integration | Halley (Market Data worker) and Manager | `3c95063` | Focused 14/14, dedicated PostgreSQL 1/1, root gates PASS; live Binance UNVERIFIED |
| M-02 | REVIEW | 3 | Integration | M-02 review-closure worker (INS-014) | `MVP_IMPLEMENTATION` / `5160c1c` | Socket-error reconnect fix and regression coverage reviewed; focused realtime 9/9 and full Market Data 23 PASS / 1 skipped; live Binance remains UNVERIFIED |
| S-01 | DONE | 2 | YES | Manager / S-01 strategy | `MVP_IMPLEMENTATION` / containing INS-005 checkpoint commit | Strategy tests/workspace gates PASS; persistence and built-in plugin scopes untouched |
| S-02 | DONE | 3 | Integration | Manager / reviewed Strategy worker A | `MVP_IMPLEMENTATION` / `afbd88c` | Focused 15/15, independent review, and reproducible root workspace gate PASS |
| S-03 | DONE | 3 | Integration | Manager / reviewed Strategy worker B | `MVP_IMPLEMENTATION` / `afbd88c` | Focused 25/25, independent review, and reproducible root workspace gate PASS |
| E-01 | DONE | 2 | YES — B-02 gate | Manager / Evaluation worker | `MVP_IMPLEMENTATION` / `a20a7c5` | Independent review and Evaluation/global gates PASS |
| L-01 | DONE | 2 | YES — B-02 gate | Linnaeus (Leaderboard worker) and Manager | `3c95063` | Focused 16/16, adapter/initializer review, root gates PASS; persisted admission UNVERIFIED |
| B-01 | DONE | 3 | YES | Manager / reviewed Backtesting domain worker | `MVP_IMPLEMENTATION` / `afbd88c` | Focused 9/9, Backtesting 18/18, independent review, and reproducible root workspace gate PASS |
| B-02 | REVIEW | 4 | YES | B-02 review-closure worker (INS-014) | `MVP_IMPLEMENTATION` / `5160c1c` | Cancellation/provenance/timing fixes reviewed; full Backtesting 33/33 PASS; Auth PostgreSQL 3/3 PASS; cross-module atomicity remains UNVERIFIED |
| AU-01 | DONE | 2 | YES | Orchestrator / Kepler / Banach + independent Auth reviewer | `MVP_IMPLEMENTATION` / `a9b026b` | PostgreSQL Auth 11/11 and backend 9/9 PASS on dedicated PostgreSQL 16.10; independent review PASS; full `verify:stage4a` PASS; OpenSpec CLI UNVERIFIED |
| AU-02 | BLOCKED | 4 | YES | Manager / security integration worker | — | Blocked by private-resource implementations |
| Q-01 | REVIEW | 3–4 | Integration | Herschel (Q-01 worker; INS-008) | `MVP_IMPLEMENTATION` / `d226a4a` | Pure/fake-port phase reviewed PASS; real-port integration and DONE remain unauthorized |
| N-01 | BLOCKED | 2 | Integration | Unassigned News worker | — | Not started |
| N-02 | BLOCKED | 2 | Integration | Unassigned Sentiment worker | — | Not started |
| F-01 | DONE | 2 | Integration | Manager / Frontend worker | `MVP_IMPLEMENTATION` / `901065a` | Independent review, frontend/global gates, and browser interaction PASS |
| F-AUTH | REVIEW | 3 | Integration | Archimedes (F-AUTH worker; INS-008) | `MVP_IMPLEMENTATION` / `d226a4a` | Fake/fixture client and UI phase reviewed PASS; AU-01 integration and DONE remain unauthorized |
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

### A-00 — Persist Instructor Auth / Ownership / Real-Data Requirement Change

- **Requirement IDs:** `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01` and affected
  capability IDs.
- **State / owner / wave:** DONE / Manager / Governance wave A
- **Critical / parallelism:** YES / NO
- **Start dependencies:** C-01 checkpoint and the later instructor change
- **Integration dependencies:** None; this task changes documentation and governance only.
- **Objective:** Persist the new requirement authority, Auth V1/session choice,
  ownership model, real-data policy, retained chart library, and revised execution order.
- **Write scope:** Governance Markdown and OpenSpec artifacts only; no executable
  contract, runtime source, migration, generated artifact, or dependency changes.
- **Latest branch / commit:** `MVP_IMPLEMENTATION`; the commit containing this board
  is the A-00 checkpoint (`git log -1 --oneline`).
- **Validation:** Documentation/link/traceability, changed-path, architecture,
  artifact, scope, whitespace, and strict OpenSpec checks PASS.
- **Full packet:** [`MVP_PLAN.md#a-00--persist-instructor-auth--ownership--real-data-requirement-change`](MVP_PLAN.md#a-00--persist-instructor-auth--ownership--real-data-requirement-change)

### C-01A — Authentication & Ownership Contract Extension

- **Requirement IDs:** `CSL-R-AU-01`, `CSL-R-OW-01` and affected `CSL-R-ST-04`,
  `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-LB-01`, `CSL-R-OB-01`.
- **State / owner / wave:** DONE / Manager and contract worker / Wave 1A
- **Critical / parallelism:** YES / NO; one contract writer
- **Start dependencies:** A-00
- **Integration dependencies:** None
- **Objective:** Reconcile canonical Auth, trusted-context, owner-bearing module,
  and REST contracts before ownership-sensitive implementation begins.
- **Write scope:** Only the canonical contract owners and contract tests named in
  the full packet; no runtime implementation or migrations.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `9ca2d7c`.
- **Validation:** Explicit C-01A suite 35/35, root build/typecheck/lint/tests,
  architecture, artifact, deferred-scope, backend smoke, diff, and strict OpenSpec
  checks PASS. Independent review P1 was fixed and re-review PASS. Auth tests remain
  explicit rather than workspace-owned because Auth package metadata is outside C-01A scope.
- **Full packet:** [`MVP_PLAN.md#c-01a--authentication--ownership-contract-extension`](MVP_PLAN.md#c-01a--authentication--ownership-contract-extension)

### D-01 — Minimal MVP Persistence Foundation

- **Requirement IDs:** `CSL-R-MD-01`, `CSL-R-ST-04`, `CSL-R-SE-02`,
  `CSL-R-BT-01`, `CSL-R-EV-01`, `CSL-R-LB-01`, `CSL-R-NW-01`, `CSL-R-SN-01`,
  `CSL-R-RP-01`, `CSL-R-OB-01`, `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`
- **State / owner / wave:** DONE / Orchestrator, Dewey, and independent DB reviewer / Wave 2
- **Critical / parallelism:** YES, gates B-02 / YES, with one DB writer
- **Start dependencies:** C-01A
- **Integration dependencies:** None
- **Objective:** Add only approved physical entities, including User, AuthSession,
  and direct ownership columns, with reversible migrations and repository conventions.
- **Write scope:** `infra/db/**` and packet-assigned module PostgreSQL adapters/tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `f5c5562` source integration
  checkpoint; Dewey's config fix was independently reviewed and integrated.
- **Validation:** DONE under INS-010. Dedicated PostgreSQL 16.10 `down 2 -> up`
  through the corrected config PASS; final state has 18 MVP tables, both
  migration records, `pgcrypto`, five direct owner roots/FKs/indexes, no
  inherited/shared owner columns, and no deferred columns. Transactional
  constraint/idempotency probes PASS (13/13). `verify:stage4a` PASS.
- **Full packet:** [`MVP_PLAN.md#d-01--minimal-mvp-persistence-foundation`](MVP_PLAN.md#d-01--minimal-mvp-persistence-foundation)

### M-01 — Binance Historical Market Data

- **Requirement IDs:** `CSL-R-MD-01`, `CSL-R-RP-01`, `CSL-R-AR-02`, `CSL-R-RD-01`
- **State / owner / wave:** DONE / Halley (Market Data worker) and Manager / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** Live smoke before I-01
- **Objective:** Validate, paginate, normalize, persist, and identify real Binance
  historical candles while retaining deterministic fixtures for tests/development.
- **Write scope:** `modules/market-data/**` except frozen contracts; its repository/tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `3c95063`.
- **Validation:** Market Data 14/14 focused tests, dedicated PostgreSQL persistence 1/1, build/typecheck/lint, root gates, architecture, artifacts, scope, runtime smoke, and whitespace PASS. Live Binance historical smoke UNVERIFIED (`fetch failed`); OpenSpec CLI UNVERIFIED (unavailable).
- **Full packet:** [`MVP_PLAN.md#m-01--binance-historical-market-data`](MVP_PLAN.md#m-01--binance-historical-market-data)

### AU-01 — Simple Authentication and Session Runtime

- **Requirement IDs:** `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-OB-01`, `CSL-R-RD-01`
- **State / owner / wave:** DONE / Orchestrator, Kepler, Banach, and independent Auth reviewer / Wave 2
- **Critical / parallelism:** YES / YES after D-01 with exclusive Auth scope
- **Start dependencies:** C-01A
- **Integration dependencies:** D-01, F-AUTH, and I-01
- **Objective:** Implement email/password register, login, current-user, absolute
  session expiry, and logout using Argon2id and opaque PostgreSQL-backed sessions.
- **Write scope:** Auth module/runtime adapters, approved thin transport integration,
  and Auth tests; migrations remain under D-01 ownership.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `a9b026b` source
  integration commit; control checkpoints record the assignment, review, and
  closure under INS-010.
- **Validation:** PostgreSQL Auth integration 11/11 and backend controller/e2e
  9/9 PASS on the dedicated PostgreSQL 16.10 cluster at `localhost:55432`,
  including concurrent duplicate-email conflict, exact 24-hour expiry, opaque
  digest-only sessions, generic invalid login, idempotent logout, trusted
  identity propagation, and cookie policy. Independent review PASS after fixing
  the typed bootstrap export, deployed-HTTPS `Secure` enforcement, concurrent
  duplicate-registration evidence, and architecture resolution. Full
  `verify:stage4a` PASS: build, workspace typecheck/lint/tests, architecture,
  artifacts, deferred-scope, runtime smoke, and whitespace checks. Formal
  OpenSpec CLI remains UNVERIFIED because it is unavailable.
- **Full packet:** [`MVP_PLAN.md#au-01--simple-authentication-and-session-runtime`](MVP_PLAN.md#au-01--simple-authentication-and-session-runtime)

### M-02 — Realtime Market Delivery and Gap Recovery

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-FE-01`, `CSL-R-OB-01`,
  `CSL-R-AR-02`, `CSL-R-DM-01`, `CSL-R-RD-01`
- **State / owner / wave:** REVIEW / M-02 review-closure worker (INS-014) / Wave 3
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** M-01
- **Integration dependencies:** F-01 and I-01
- **Objective:** Deliver normalized market klines with bounded reconnect, gap fill,
  deduplication, and observable connection state.
- **Write scope:** Market Data application/infrastructure and market WebSocket tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `5160c1c`.
- **Validation:** REVIEW after INS-014 closure; realtime 9/9 and full Market Data 23 PASS / 1 skipped, package gates PASS; live Binance stream remains UNVERIFIED after provider failure and reconnect exhaustion.
- **Full packet:** [`MVP_PLAN.md#m-02--realtime-market-delivery-and-gap-recovery`](MVP_PLAN.md#m-02--realtime-market-delivery-and-gap-recovery)

### S-01 — Strategy Registry, Definitions and Composite Core

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-ST-04`,
  `CSL-R-AR-02`, `CSL-R-AR-03`, `CSL-R-RP-01`
- **State / owner / wave:** DONE / Manager / S-01 strategy / Wave 2
- **Critical / parallelism:** YES / YES after C-01
- **Start dependencies:** C-01A
- **Integration dependencies:** D-01 for persistence completion
- **Objective:** Implement registry, descriptors, owner-scoped immutable definitions,
  generic analysis output, and `MAJORITY_VOTE_V1` with fake plugins.
- **Write scope:** Strategy core/application/infrastructure/tests excluding built-in directories.
- **Latest branch / commit:** `MVP_IMPLEMENTATION`; containing INS-005 checkpoint
  commit.
- **Validation:** DONE under `INS-005`; Strategy tests and workspace gates PASS.
  Persistence paths and built-in strategy directories were not changed.
- **Full packet:** [`MVP_PLAN.md#s-01--strategy-registry-definitions-and-composite-core`](MVP_PLAN.md#s-01--strategy-registry-definitions-and-composite-core)

### S-02 — Moving Average and RSI

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-02`, `CSL-R-VIS-01`, `CSL-R-DM-01`
- **State / owner / wave:** DONE / Manager / reviewed Strategy worker A / Wave 3
- **Critical / parallelism:** Integration / YES with S-03 and B-01
- **Start dependencies:** S-01
- **Integration dependencies:** B-02 and I-01
- **Objective:** Implement the approved MA and RSI `TECHNICAL_PROFILES_V1` behavior.
- **Write scope:** Dedicated MA/RSI plugin directories and tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `afbd88c`.
- **Validation:** Focused suite 15/15, Strategy typecheck/build/lint, targeted architecture, scope, artifact, independent review, and reproducible root workspace gate PASS.
- **Full packet:** [`MVP_PLAN.md#s-02--moving-average-and-rsi`](MVP_PLAN.md#s-02--moving-average-and-rsi)

### S-03 — Bollinger Bands and Support/Resistance

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-02`, `CSL-R-VIS-01`, `CSL-R-DM-01`
- **State / owner / wave:** DONE / Manager / reviewed Strategy worker B / Wave 3
- **Critical / parallelism:** Integration / YES with S-02 and B-01
- **Start dependencies:** S-01
- **Integration dependencies:** B-02 and I-01
- **Objective:** Implement the approved Bollinger and rolling Support/Resistance profiles.
- **Write scope:** Dedicated Bollinger/Support-Resistance plugin directories and tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `afbd88c`.
- **Validation:** Focused suite 25/25, Strategy typecheck/build/lint, targeted architecture, scope, artifact, independent review, and reproducible root workspace gate PASS.
- **Full packet:** [`MVP_PLAN.md#s-03--bollinger-bands-and-supportresistance`](MVP_PLAN.md#s-03--bollinger-bands-and-supportresistance)

### E-01 — Independent Evaluation

- **Requirement IDs:** `CSL-R-EV-01`, `CSL-R-RP-01`, `CSL-R-AR-02`, `CSL-R-AR-03`
- **State / owner / wave:** DONE / Manager and Evaluation worker / Wave 2
- **Critical / parallelism:** YES, gates B-02 / YES
- **Start dependencies:** C-01
- **Integration dependencies:** B-02
- **Objective:** Compute deterministic Return, Win Rate, drawdown magnitude, and trade count.
- **Write scope:** `modules/evaluation/**` except frozen contracts.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `a20a7c5`.
- **Validation:** Evaluation build/typecheck/lint and 15/15 focused tests PASS;
  root/global gates PASS. Independent review found sparse-array validation and test
  typing issues; both were fixed and re-review PASS.
- **Full packet:** [`MVP_PLAN.md#e-01--independent-evaluation`](MVP_PLAN.md#e-01--independent-evaluation)

### L-01 — Configurable Reproducible Leaderboard

- **Requirement IDs:** `CSL-R-LB-01`, `CSL-R-RP-01`, `CSL-R-OB-01`, `CSL-R-OW-01`
- **State / owner / wave:** DONE / Linnaeus (Leaderboard worker) and Manager / Wave 2
- **Critical / parallelism:** YES, gates B-02 / YES
- **Start dependencies:** C-01A, D-01
- **Integration dependencies:** E-01 and B-02
- **Objective:** Implement versioned `LINEAR_REQUIRED_V1`, deterministic eligibility,
  ties, user-owned scopes, same-owner admission, and configurable Top-K.
- **Write scope:** `modules/leaderboard/**` except frozen contracts and migrations.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `3c95063`.
- **Validation:** Leaderboard 16/16 focused tests, module build/typecheck/lint, root gates, architecture, artifacts, scope, runtime smoke, and whitespace PASS. PostgreSQL adapter and initializer were verified against the dedicated DB; full persisted admission remains UNVERIFIED. Eviction deletes rows because the frozen schema has no active-entry flag, limiting duplicate detection after eviction/restart.
- **Full packet:** [`MVP_PLAN.md#l-01--configurable-reproducible-leaderboard`](MVP_PLAN.md#l-01--configurable-reproducible-leaderboard)

### B-01 — Deterministic Historical Simulator

- **Requirement IDs:** `CSL-R-BT-01`, `CSL-R-VIS-01`, `CSL-R-RP-01`, `CSL-R-AR-03`
- **State / owner / wave:** DONE / Manager / reviewed Backtesting domain worker / Wave 3
- **Critical / parallelism:** YES / YES
- **Start dependencies:** C-01, S-01 only
- **Integration dependencies:** M-01, S-02, and S-03 before I-01/I-02
- **Objective:** Implement the pure deterministic long-only simulator and traces
  using candle fixtures and fake strategies.
- **Write scope:** Backtesting simulator/domain runner/tests, excluding orchestration/executor.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `afbd88c`.
- **Validation:** Focused suite 9/9, Backtesting suite 18/18, Backtesting typecheck, lint, targeted architecture, scope, artifact, independent review, and reproducible root workspace gate PASS.
- **Full packet:** [`MVP_PLAN.md#b-01--deterministic-historical-simulator`](MVP_PLAN.md#b-01--deterministic-historical-simulator)

### B-02 — Candidate, Execution and Experiment Orchestration

- **Requirement IDs:** `CSL-R-BT-01`, `CSL-R-ST-04`, `CSL-R-RP-01`,
  `CSL-R-OB-01`, `CSL-R-AR-01`, `CSL-R-AR-02`, `CSL-R-OW-01`
- **State / owner / wave:** REVIEW / B-02 review-closure worker (INS-014) / Wave 4
- **Critical / parallelism:** YES / Limited
- **Start dependencies:** D-01, S-01, B-01, E-01, L-01
- **Integration dependencies:** M-01, S-02, and S-03 before I-01/I-02
- **Objective:** Connect owner-scoped Candidate persistence, bounded execution,
  simulation, Evaluation, inherited Experiment/Trades, and same-owner Leaderboard.
- **Write scope:** Backtesting application/infrastructure/API implementations/tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `5160c1c`.
- **Validation:** REVIEW after INS-014 closure; full Backtesting 33/33 PASS and package gates PASS; Auth PostgreSQL 3/3 PASS; cross-module Experiment/Leaderboard atomicity remains UNVERIFIED until a shared transaction-aware adapter is proven.
- **Full packet:** [`MVP_PLAN.md#b-02--candidate-execution-and-experiment-orchestration`](MVP_PLAN.md#b-02--candidate-execution-and-experiment-orchestration)

### AU-02 — Per-User Ownership Security Integration

- **Requirement IDs:** `CSL-R-OW-01`, `CSL-R-AU-01`, `CSL-R-ST-04`,
  `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-LB-01`, `CSL-R-OB-01`
- **State / owner / wave:** BLOCKED / Manager or security integration worker / Wave 4
- **Critical / parallelism:** YES / NO with active private-resource writers
- **Start dependencies:** AU-01, D-01, S-01, L-01, B-02, Q-01 real integration
- **Integration dependencies:** F-AUTH and I-01
- **Objective:** Prove trusted owner propagation and two-user isolation across Auth,
  Strategy, Search, Backtesting, and Leaderboard.
- **Write scope:** Cross-module security/integration tests and narrowly approved
  owner-scoped fixes; no unrelated capability implementation.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#au-02--per-user-ownership-security-integration`](MVP_PLAN.md#au-02--per-user-ownership-security-integration)

### Q-01 — Seeded Random Search and SearchRun Lifecycle

- **Requirement IDs:** `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-LB-01`,
  `CSL-R-OB-01`, `CSL-R-DM-01`, `CSL-R-AR-02`, `CSL-R-OW-01`
- **State / owner / wave:** REVIEW / Herschel (Q-01 worker; INS-008) / Waves 3–4
- **Critical / parallelism:** Integration / YES for fake-port phase
- **Start dependencies:** C-01A, S-01
- **Integration dependencies:** D-01, L-01, B-02
- **Objective:** Implement seeded Random generation, trusted owner propagation, and
  an owner-scoped finite SearchRun lifecycle, first against fakes and then real ports.
- **Write scope:** `modules/search/**` except frozen contracts and migrations.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `d226a4a`.
- **Validation:** Pure/fake-port phase reviewed PASS under INS-008; real-port/global
  completion remains gated. Cannot be DONE after fake-only validation.
- **Full packet:** [`MVP_PLAN.md#q-01--seeded-random-search-and-searchrun-lifecycle`](MVP_PLAN.md#q-01--seeded-random-search-and-searchrun-lifecycle)

### N-01 — News Collection, Deduplication and Query

- **Requirement IDs:** `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-OB-01`, `CSL-R-DM-01`,
  `CSL-R-RD-01`
- **State / owner / wave:** BLOCKED / Unassigned News worker / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** N-02 and I-01
- **Objective:** Build fixture-first provider-neutral News with a real configured
  final/demo source and explicit provider provenance.
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

- **Requirement IDs:** `CSL-R-FE-01`, `CSL-R-MD-02`, `CSL-R-AR-03`, `CSL-R-RD-01`
- **State / owner / wave:** DONE / Manager and Frontend worker / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01
- **Integration dependencies:** M-02 and I-01
- **Objective:** Build the app shell, typed clients, independent chart states, a
  `lightweight-charts` adapter, and a fixture market source for tests/development.
- **Write scope:** `apps/frontend/**`; frozen transport imports only.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `901065a`.
- **Validation:** Frontend build/typecheck/lint and 12/12 tests PASS; root/global
  gates PASS. Independent review findings were fixed and re-review PASS. Chrome
  rendered four LIVE charts and preserved independent timeframes on interaction.
- **Full packet:** [`MVP_PLAN.md#f-01--frontend-chart-and-client-foundation`](MVP_PLAN.md#f-01--frontend-chart-and-client-foundation)

### F-AUTH — Frontend Authentication and Protected Navigation

- **Requirement IDs:** `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-FE-01`, `CSL-R-DM-01`
- **State / owner / wave:** REVIEW / Archimedes (F-AUTH worker; INS-008) / Wave 3
- **Critical / parallelism:** Integration / Not with an active F-01 shell writer
- **Start dependencies:** C-01A, F-01
- **Integration dependencies:** AU-01
- **Objective:** Add register/login/session restoration/logout, protected navigation,
  401 recovery, and private-cache clearing using HttpOnly session cookies.
- **Write scope:** Frontend Auth clients, screens, state, navigation guards, and tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `d226a4a`.
- **Validation:** Fake/fixture client and UI phase reviewed PASS under INS-008;
  AU-01 remains an integration dependency and real integration is not authorized.
- **Full packet:** [`MVP_PLAN.md#f-auth--frontend-authentication-and-protected-navigation`](MVP_PLAN.md#f-auth--frontend-authentication-and-protected-navigation)

### F-02 — Frontend Strategy, Search, Result and Auxiliary Views

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-SE-01`,
  `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-EV-01`, `CSL-R-LB-01`,
  `CSL-R-VIS-01`, `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-DM-01`,
  `CSL-R-AU-01`, `CSL-R-OW-01`
- **State / owner / wave:** BLOCKED / Unassigned Frontend worker / Wave 3
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01A, F-01, F-AUTH
- **Integration dependencies:** All real APIs and AU-02 at I-01
- **Objective:** Build authenticated, owner-scoped Strategy/Search/Experiment/
  Leaderboard, visualization, News, and Sentiment views against typed fakes.
- **Write scope:** Frontend features and tests only.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#f-02--frontend-strategy-search-result-and-auxiliary-views`](MVP_PLAN.md#f-02--frontend-strategy-search-result-and-auxiliary-views)

### I-01 — Runtime, Transports and Observability Integration

- **Requirement IDs:** All capability integration IDs plus `CSL-R-AU-01`,
  `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-OB-01`, and `CSL-R-AR-01`–`CSL-R-AR-03`
- **State / owner / wave:** BLOCKED / Manager or integration worker / Wave 5
- **Critical / parallelism:** YES / NO
- **Start dependencies:** AU-01, AU-02, B-02; completed M-01/M-02, S-02/S-03
  registration, Q-01 integration, N-01/N-02, and F-01/F-AUTH/F-02
- **Integration dependencies:** Live Binance/CoinDesk availability for final smoke
- **Objective:** Compose Auth and real modules, trusted request identity, protected
  transports, final/demo provider configuration, readiness, degradation, and projections.
- **Write scope:** `apps/backend/**`, example configuration, thin transport mappers;
  module fixes only through owner review.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#i-01--runtime-transports-and-observability-integration`](MVP_PLAN.md#i-01--runtime-transports-and-observability-integration)

### I-02 — E2E Demo, Documentation and Final Verification

- **Requirement IDs:** Every REQUIRED ID, especially `CSL-R-AU-01`, `CSL-R-OW-01`,
  `CSL-R-RD-01`, `CSL-R-DL-01`, and `CSL-R-DM-01`
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

P-00, C-01, A-00, C-01A, E-01, F-01, S-01, D-01, AU-01, M-01, and L-01 are DONE.
M-02 and B-02 are REVIEW after their bounded INS-014 review closure. M-02's
live-provider evidence and B-02's cross-module transaction coupling remain
UNVERIFIED and are not DONE gates. Q-01 and F-AUTH remain in REVIEW for
their bounded fake/fixture phases; their real integration and DONE transitions
remain gated. All other unfinished tasks remain BLOCKED. No newly unlocked task
was started.
