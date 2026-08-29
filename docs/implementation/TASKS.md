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
| B-02 | DONE | 4 | YES | Manager / B-02 review-closure worker | `MVP_IMPLEMENTATION` / `a24aa00` | Packet-boundary DoD proven: Backtesting 33/33, package typecheck/lint/build, Auth PostgreSQL 3/3, owner isolation, provenance, rollback, cancellation/saturation, and one-terminal-outcome evidence PASS; cross-module Experiment/Leaderboard atomicity remains UNVERIFIED for I-01 |
| AU-01 | DONE | 2 | YES | Orchestrator / Kepler / Banach + independent Auth reviewer | `MVP_IMPLEMENTATION` / `a9b026b` | PostgreSQL Auth 11/11 and backend 9/9 PASS on dedicated PostgreSQL 16.10; independent review PASS; full `verify:stage4a` PASS; OpenSpec CLI UNVERIFIED |
| AU-02 | BLOCKED | 4 | YES | Manager (INS-021 worker Gibbs `01a04bf2-c013-7e73-a2b7-0b7781ac0a52` stopped) | `MVP_IMPLEMENTATION` / containing INS-021 control checkpoint (no AU-02 source commit) | INS-021 final retry stopped after the bounded window: no early matrix source/test diff or accepted evidence; observed package-test attempts yielded no accepted result; no source changes; `NEEDS_HUMAN_DECISION` |
| Q-01 | DONE | 3–4 | Integration | Ohm (`01a04bab-a02c-7221-9382-acf9a9a7d192`) | `MVP_IMPLEMENTATION` / `317ca0d` | Persisted SearchRun writes serialized with delayed-write regression; Search 22 passed / 1 skipped, package/global gates PASS; real PostgreSQL public Search→Backtesting→Leaderboard integration passed twice with terminal-state and ownership evidence |
| N-01 | DONE | 2 | Integration | Manager / Plato (`01a04b84-e18e-7d82-ac56-14f20939bdee`) | `MVP_IMPLEMENTATION` / `04bf234` | News 14/14, typecheck/lint/build, architecture and scope gates PASS; live CoinDesk and real PostgreSQL remain UNVERIFIED |
| N-02 | DONE | 2 | Integration | Manager / Sagan (`01a04b85-d5d2-7c81-95cd-08cb04249e04`) | `MVP_IMPLEMENTATION` / `04bf234` | Sentiment 16/16, typecheck/lint/build, architecture and scope gates PASS; real PostgreSQL remains UNVERIFIED |
| F-01 | DONE | 2 | Integration | Manager / Frontend worker | `MVP_IMPLEMENTATION` / `901065a` | Independent review, frontend/global gates, and browser interaction PASS |
| F-AUTH | DONE | 3 | Integration | Manager / Descartes (`01a04b84-de45-74a2-8b9e-cab4a0d6ff48`) | `MVP_IMPLEMENTATION` / `04bf234` | Frontend 25/25, typecheck/build/lint, real AU-01 PostgreSQL 3/3, backend 1/1, and local browser flow PASS; deployed HTTPS/private business endpoint evidence remains UNVERIFIED |
| F-02 | DONE | 3 | Integration | Mendel (`01a04bab-a123-7bd2-855b-c02a6ab30f1c`) | `MVP_IMPLEMENTATION` / `84209b0` | Fixture-first Strategy/Search/result/auxiliary views and typed clients; frontend 31/31 across 12 files, typecheck/lint/build and global gates PASS; real API/browser integration remains I-01 |
| I-01 | BLOCKED | 5 | YES | Manager / integration worker | — | Not started |
| I-02 | BLOCKED | 6 | YES | Manager plus independent reviewers | — | Not started |
| RB-01 | DONE | E0 | YES | Manager | `MVP_IMPLEMENTATION` / containing INS-024 RB-01 checkpoint | Documentation-only DEC-007 reconciliation planning committed; no feature implementation started |
| C-02 | IN_PROGRESS | E0 | YES | Manager / exactly one contract-and-schema worker (INS-034; pending creation) | `MVP_IMPLEMENTATION` / start checkpoint pending | Applicability PASS; worker assignment and contract/schema evidence in progress |
| M-03 | BLOCKED | E1 | YES | Future Market Data worker | — | Not started; amended MD-02/MD-03 evidence required |
| S-04 | BLOCKED | E1 | YES | Future Strategy application worker | — | Not started; controlled LLM draft/approval evidence required |
| S-05 | BLOCKED | E1 | YES | Future Strategy composite worker | — | Not started; weighted-vote evidence required |
| S-06 | BLOCKED | E1 | YES | Future Strategy plugin worker | — | Not started; Lite SMC/Wyckoff evidence required |
| Q-02 | BLOCKED | E1 | YES | Future Search worker | — | Not started; Domain-guided/Genetic seeded evidence required |
| B-03 | BLOCKED | E1 | YES | Future Backtesting worker | — | Not started; synthetic paper/decimal/provenance evidence required |
| N-03 | BLOCKED | E1 | YES | Future News/Sentiment boundary worker | — | Not started; safe URL/extraction/refinement evidence required |
| E-02 | BLOCKED | E2 | Integration | Future Evaluation worker | — | Not started; decimal-boundary evaluation evidence required |
| L-02 | BLOCKED | E2 | YES | Future Leaderboard worker | — | Not started; extension-aware ranking/provenance evidence required |
| F-03 | BLOCKED | E3 | YES | Future Frontend worker | — | Not started; DEC-007 functional-state projections required |
| I-03 | BLOCKED | E4 | YES | Manager / future integration worker | — | Not started; final extension integration/reproducibility proof required |
| ENV-01 | DONE | E0a | YES | Manager / Infrastructure-and-tooling worker `01a04d08-19c8-76e1-ad32-57471e75f430` | `MVP_IMPLEMENTATION` / containing INS-030 ENV-01 checkpoint commit | Independent review PASS; Docker/migration/checker/root validation PASS; OpenSpec CLI UNVERIFIED |

The `RB-01` row records the completed governance checkpoint. `ENV-01` is the
sole packet allocated by current `INS-030`; it is DONE at its authorized
boundary after one worker completed and the Manager independently reviewed it.
`C-02` and every other feature packet remain `BLOCKED`; no
other packet is authorized or may start. The existing legacy rows, including
`M-02` at `REVIEW`, `AU-02` at `BLOCKED`, and `I-01`/`I-02` at `BLOCKED`, retain
their states and evidence. DEC-007 extension requirements are not satisfied by
any legacy `DONE` row.

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
- **Validation:** REVIEW after INS-014 closure; realtime 9/9 and full Market
  Data 23 PASS / 1 skipped, package gates PASS. INS-018 made one bounded live
  Binance WebSocket attempt using the existing provider; it ended with
  reconnect-limit exhaustion and is UNVERIFIED. No M-02 source/configuration
  changes were made.
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
- **State / owner / wave:** DONE / Manager and B-02 review-closure worker / Wave 4
- **Critical / parallelism:** YES / Limited
- **Start dependencies:** D-01, S-01, B-01, E-01, L-01
- **Integration dependencies:** M-01, S-02, and S-03 before I-01/I-02
- **Objective:** Connect owner-scoped Candidate persistence, bounded execution,
  simulation, Evaluation, inherited Experiment/Trades, and same-owner Leaderboard.
- **Write scope:** Backtesting application/infrastructure/API implementations/tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `a24aa00`.
- **Validation:** Packet-boundary DoD proven under INS-015: full Backtesting 33/33 PASS; package typecheck/lint/build PASS; Auth PostgreSQL 3/3 PASS; owner isolation, provenance, rollback, cancellation/saturation, and exactly-one-terminal-outcome evidence PASS. Cross-module Experiment/Leaderboard atomicity remains UNVERIFIED until a shared transaction-aware adapter is proven at I-01.
- **Full packet:** [`MVP_PLAN.md#b-02--candidate-execution-and-experiment-orchestration`](MVP_PLAN.md#b-02--candidate-execution-and-experiment-orchestration)

### AU-02 — Per-User Ownership Security Integration

- **Requirement IDs:** `CSL-R-OW-01`, `CSL-R-AU-01`, `CSL-R-ST-04`,
  `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-LB-01`, `CSL-R-OB-01`
- **State / owner / wave:** BLOCKED / Manager (INS-021 worker Gibbs `01a04bf2-c013-7e73-a2b7-0b7781ac0a52` stopped) / Wave 4
- **Critical / parallelism:** YES / NO with active private-resource writers
- **Start dependencies:** AU-01, D-01, S-01, L-01, B-02, Q-01 real integration
- **Integration dependencies:** F-AUTH and I-01
- **Objective:** Prove trusted owner propagation and two-user isolation across Auth,
  Strategy, Search, Backtesting, and Leaderboard.
- **Write scope:** Cross-module security/integration tests and narrowly approved
  owner-scoped fixes; no unrelated capability implementation.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / containing INS-021 control checkpoint; no AU-02 source commit.
- **Validation:** INS-021 verified AU-01, D-01, S-01, L-01, B-02, Q-01 real integration, and F-AUTH DONE. AU-02 reached BLOCKED→READY→IN_PROGRESS for the one final implementation-first retry owned by Gibbs, then was stopped after the bounded window. The worker produced no early matrix source/test diff, accepted security evidence, or commit; `DATABASE_URL` was absent and real PostgreSQL/Auth/Search integration is UNVERIFIED. The current tree has no allowed source changes. No further retry is authorized under INS-021; `NEEDS_HUMAN_DECISION` is required.
- **Full packet:** [`MVP_PLAN.md#au-02--per-user-ownership-security-integration`](MVP_PLAN.md#au-02--per-user-ownership-security-integration)

### Q-01 — Seeded Random Search and SearchRun Lifecycle

- **Requirement IDs:** `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-LB-01`,
  `CSL-R-OB-01`, `CSL-R-DM-01`, `CSL-R-AR-02`, `CSL-R-OW-01`
- **State / owner / wave:** DONE / Ohm (`01a04bab-a02c-7221-9382-acf9a9a7d192`) / Waves 3–4
- **Critical / parallelism:** Integration / YES for fake-port phase
- **Start dependencies:** C-01A, S-01
- **Integration dependencies:** D-01, L-01, B-02
- **Objective:** Implement seeded Random generation, trusted owner propagation, and
  an owner-scoped finite SearchRun lifecycle, first against fakes and then real ports.
- **Write scope:** `modules/search/**` except frozen contracts and migrations.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `317ca0d`.
- **Validation:** Pure/fake-port and Search adapter suites pass with
  typecheck/lint/build and global gates PASS. INS-018 repair serializes
  persisted snapshots per SearchRun and adds a delayed-write regression. Full
  Search is 22 passed / 1 skipped; the real public Search→Backtesting→
  Leaderboard PostgreSQL integration passed twice against
  `postgres://cryptox@localhost:55432/cryptox`, including persisted terminal
  state, ownership isolation, Backtesting completion, and Leaderboard admission.
- **Full packet:** [`MVP_PLAN.md#q-01--seeded-random-search-and-searchrun-lifecycle`](MVP_PLAN.md#q-01--seeded-random-search-and-searchrun-lifecycle)

### N-01 — News Collection, Deduplication and Query

- **Requirement IDs:** `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-OB-01`, `CSL-R-DM-01`,
  `CSL-R-RD-01`
- **State / owner / wave:** DONE / Manager and Plato (`01a04b84-e18e-7d82-ac56-14f20939bdee`) / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** N-02 and I-01
- **Objective:** Build fixture-first provider-neutral News with a real configured
  final/demo source and explicit provider provenance.
- **Write scope:** `modules/news/**` except frozen contracts and migrations.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `04bf234`.
- **Validation:** News 14/14, typecheck/lint/build, architecture, artifact,
  deferred-scope, and whitespace gates PASS. Normalization, provider-GUID
  deduplication, deterministic queries, malformed/provider failure isolation,
  bounded CoinDesk access, PostgreSQL adapter mapping, and Sentiment degradation
  are covered. Live CoinDesk is `UNVERIFIED` because no API key was configured;
  real PostgreSQL is also `UNVERIFIED` in the Manager environment.
- **Full packet:** [`MVP_PLAN.md#n-01--news-collection-deduplication-and-query`](MVP_PLAN.md#n-01--news-collection-deduplication-and-query)

### N-02 — `LEXICON_V1` Sentiment

- **Requirement IDs:** `CSL-R-SN-01`, `CSL-R-OB-01`, `CSL-R-AR-02`,
  `CSL-R-AR-03`, `CSL-R-DM-01`
- **State / owner / wave:** DONE / Manager and Sagan (`01a04b85-d5d2-7c81-95cd-08cb04249e04`) / Wave 2
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01, D-01
- **Integration dependencies:** N-01 and I-01
- **Objective:** Implement deterministic local lexicon/rule sentiment with normalized
  score, provenance, persistence, and failure isolation.
- **Write scope:** `modules/sentiment/**` except frozen contracts and migrations.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `04bf234`.
- **Validation:** Sentiment 16/16, typecheck/lint/build, architecture,
  artifact, deferred-scope, and whitespace gates PASS. Positive/neutral/negative
  fixtures, finite normalized deterministic scores, negation/intensifier policy,
  provenance, invalid/exception/timeout no-write, persistence mapping, and
  missing reads are covered. Real PostgreSQL is `UNVERIFIED` because
  `DATABASE_URL` was not configured; no hosted/model-download runtime was used.
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
- **State / owner / wave:** DONE / Manager and Descartes (`01a04b84-de45-74a2-8b9e-cab4a0d6ff48`) / Wave 3
- **Critical / parallelism:** Integration / Not with an active F-01 shell writer
- **Start dependencies:** C-01A, F-01
- **Integration dependencies:** AU-01
- **Objective:** Add register/login/session restoration/logout, protected navigation,
  401 recovery, and private-cache clearing using HttpOnly session cookies.
- **Write scope:** Frontend Auth clients, screens, state, navigation guards, and tests.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `04bf234`.
- **Validation:** Frontend tests 25/25 plus typecheck/build/lint PASS. Real
  AU-01 PostgreSQL persistence is 3/3 and backend HTTP smoke is 1/1; the local
  browser flow proved protected redirect, register/login, reload restoration,
  logout, server-revocation 401 recovery, re-login, HttpOnly/SameSite=Lax/
  Path=/24-hour host-only cookie behavior, and no token in JSON. Frontend state
  tests prove private-cache clearing/isolation. A real private business endpoint
  and deployed HTTPS `Secure` behavior do not exist in this phase and remain
  `UNVERIFIED`.
- **Full packet:** [`MVP_PLAN.md#f-auth--frontend-authentication-and-protected-navigation`](MVP_PLAN.md#f-auth--frontend-authentication-and-protected-navigation)

### F-02 — Frontend Strategy, Search, Result and Auxiliary Views

- **Requirement IDs:** `CSL-R-ST-01`, `CSL-R-ST-03`, `CSL-R-SE-01`,
  `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-EV-01`, `CSL-R-LB-01`,
  `CSL-R-VIS-01`, `CSL-R-NW-01`, `CSL-R-SN-01`, `CSL-R-DM-01`,
  `CSL-R-AU-01`, `CSL-R-OW-01`
- **State / owner / wave:** DONE / Mendel (`01a04bab-a123-7bd2-855b-c02a6ab30f1c`) / Wave 3
- **Critical / parallelism:** Integration / YES
- **Start dependencies:** C-01A, F-01, F-AUTH
- **Integration dependencies:** All real APIs and AU-02 at I-01
- **Objective:** Build authenticated, owner-scoped Strategy/Search/Experiment/
  Leaderboard, visualization, News, and Sentiment views against typed fakes.
- **Write scope:** Frontend features and tests only.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / `84209b0`.
- **Validation:** Initial fixture implementation reviewed within
  `apps/frontend/**`; Auth files are unchanged. Frontend tests are 31/31 across
  12 files, including six packet-scoped F-02 tests; typecheck/lint/build,
  architecture, artifact, deferred-scope, runtime, and whitespace gates PASS.
  Evidence is fixture/fake-client only; no browser or real API/I-01 evidence is
  claimed. Real APIs and AU-02 remain later I-01 dependencies.
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
- **Start dependencies:** I-01 and the future DEC-007 integration proof I-03;
  live-provider smoke where required.
- **Integration dependencies:** Live-provider smoke where required
- **Objective:** Prove the full MVP, architecture defense, clean setup, demo,
  traceability, and final handoff.
- **Write scope:** E2E tests, README, acceptance/checkpoint evidence, and narrowly
  reviewed fixes.
- **Latest branch / commit:** —; record when work starts.
- **Validation:** Not started.
- **Full packet:** [`MVP_PLAN.md#i-02--e2e-demo-documentation-and-final-verification`](MVP_PLAN.md#i-02--e2e-demo-documentation-and-final-verification)

## DEC-007 reconciliation packet records

These records are allocated by `RB-01`. Only `RB-01` was authorized by `INS-024`.
All future extension and reconciliation packets below are `BLOCKED`; their full
acceptance criteria and handoff requirements are in the linked packets in
[`MVP_PLAN.md`](MVP_PLAN.md).

### RB-01 — DEC-007 Documentation Reconciliation Planning

- **Requirement IDs:** `CSL-R-MD-02`/`03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`; `DEC-007`.
- **State / owner / wave:** DONE / Manager / E0.
- **Dependencies:** `INS-024` and reviewed `496d5a3`; no implementation dependency.
- **Exact write scope:** `docs/implementation/MVP_PLAN.md`,
  `docs/implementation/TASKS.md`, `docs/implementation/HANDOFF.md` only.
- **Acceptance/validation:** Complete requirement-to-packet traceability,
  C-02-first extension DAG, blocked future frontier, preserved legacy evidence,
  changed-path proof, documentation/link checks, state/DAG consistency, and
  `git diff --check`; formal OpenSpec is `UNVERIFIED` if unavailable.
- **Full packet:** [`MVP_PLAN.md#rb-01--dec-007-documentation-reconciliation-planning`](MVP_PLAN.md#rb-01--dec-007-documentation-reconciliation-planning)

### ENV-01 — Local Docker PostgreSQL Evidence and Deferred-Scope Checker Reconciliation

- **Requirement IDs / authority:** `CSL-R-RD-01`, DEC-007, DEC-008, ADR-010;
  this is a pre-`C-02` operational/tooling gate, not a product requirement or
  feature implementation.
- **State / owner / wave:** DONE / Manager plus one Infrastructure-and-tooling
  worker / Extension wave E0a
- **Critical / parallelism:** YES / NO; exactly one worker, no worktree
- **Start dependencies:** Accepted `RB-01`/`RB-02`; reviewed blocked `C-02`
  checkpoint `7f774ed505f45d927b650ccefcd76d9e4f8611d2`; current `INS-030`;
  clean canonical checkout; Docker Engine and Compose reachable; no other
  active Cryptox Manager/worker. All applicability premises were proven before
  allocation.
- **Integration dependencies:** Unblocks only a later, separately reviewed and
  Instructor-authorized `C-02`; it unlocks no E1 feature packet.
- **Objective:** Provide Codex-operated Docker/Compose PostgreSQL development and
  test databases with real migration proof, and reconcile the canonical
  `scope:check` owner to narrowly recognize approved DEC-007 profiles without
  weakening deferred-scope enforcement.
- **Exact write scope:** `infra/docker-compose.yml`; new environment-only
  helpers under `infra/db/local-*` (never `infra/db/migrations/**` or
  `infra/db/migrate.config.js`); local migration-validation helper/test files;
  `scripts/check-deferred-scope.cjs` and tightly scoped checker test/helper files;
  root `package.json` command wiring; `.gitignore`; and optional placeholder-only
  `.env.example`. The Manager alone owns `TASKS.md` and `HANDOFF.md`.
- **Forbidden:** C-02 contracts, ports, DTOs, `docs/data-model.md`, business
  migration semantics, runtime/application/provider/frontend/Auth/exchange
  behavior, cloud operations, dependencies, requirements, decisions, ADRs,
  architecture, OpenSpec, and every downstream packet.
- **Acceptance/validation:** Health-checked separate local development and test
  PostgreSQL services with persistent named volumes; prepare/validate/reset-test
  commands; secret-free tracked and logged output; real test-database migration
  up/down/remigrate/constraint probes; focused checker positive/negative tests;
  root and relevant architecture/artifact/scope/deferred-scope/link/DAG checks;
  `git diff --check`; and truthful OpenSpec status.
- **Latest branch / commit:** `MVP_IMPLEMENTATION` / containing INS-030 ENV-01
  checkpoint commit; worker produced no commit.
- **Review result:** Accepted after independent changed-path review and the
  validation evidence recorded in [`HANDOFF.md`](HANDOFF.md).
- **Full packet:** [`MVP_PLAN.md#env-01--local-docker-postgresql-evidence-and-deferred-scope-checker-reconciliation`](MVP_PLAN.md#env-01--local-docker-postgresql-evidence-and-deferred-scope-checker-reconciliation)

### C-02 — DEC-007 Contract, Data-Model and Migration Reconciliation Gate

- **Requirement IDs:** All DEC-007 extension IDs and amended `CSL-R-MD-02`.
- **State / owner / wave:** IN_PROGRESS / Manager with exactly one contract-and-schema worker under INS-034 (pending creation) / E0.
- **Dependencies:** `ENV-01` DONE and separately Instructor-reviewed; baseline
  inputs are `C-01A`, `D-01`, `M-01`, `S-01`, `Q-01`, `B-02`, `E-01`, `L-01`,
  `N-01`, and `N-02`. `M-02` is `REVIEW/UNVERIFIED` review input only and is
  neither retried nor a completion dependency.
- **Exact write scope:** Canonical extension contracts/ports, REST/market-WS DTOs,
  `docs/data-model.md`, and `infra/db/**` schema/migration validation only;
  no runtime behavior.
- **Acceptance/validation:** Canonical ownership, provenance, ephemeral state,
  safe-content, profile, decimal, and retention representations plus contract,
  migration, architecture, scope, link, diff, and OpenSpec checks.
- **Checkpoint evidence:** Pauli produced no final report or worker commit. The
  partial contract-only working-tree output was independently rejected because
  it omitted the required ports, conceptual data model, migrations, and tests,
  failed workspace typecheck and contract tests, and triggered deferred-scope
  findings. No implementation output is accepted.
- **Current execution:** Applicability was independently proven at `3b1766e`
  against reviewed checkpoint `58885dd`; C-02 transitioned `BLOCKED -> READY ->
  IN_PROGRESS`. Exactly one fresh contract-and-schema worker remains to be
  created in this canonical checkout. No downstream task is authorized or
  started.
- **Full packet:** [`MVP_PLAN.md#c-02--dec-007-contract-data-model-and-migration-reconciliation-gate`](MVP_PLAN.md#c-02--dec-007-contract-data-model-and-migration-reconciliation-gate)

### M-03 — Amended Realtime Market Delivery and `MARKET_OBSERVABILITY_V1`

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-RP-02`, `CSL-R-FE-01`,
  `CSL-R-OB-01`.
- **State / owner / wave:** BLOCKED / Market Data worker / E1.
- **Dependencies:** `C-02`, M-01, F-01 input; M-02 remains REVIEW/UNVERIFIED and
  is not moved.
- **Exact write scope:** `modules/market-data/api/**` excluding contracts,
  application/infrastructure implementations and focused tests; no frontend,
  transport contracts, migration, or event-bus changes.
- **Acceptance/validation:** Re-prove amended realtime continuity, gap recovery,
  100-tick ephemeral observability, restart loss, and honest real-Binance status
  with focused/resilience/architecture/scope/global checks.
- **Full packet:** [`MVP_PLAN.md#m-03--amended-realtime-market-delivery-and-market_observability_v1`](MVP_PLAN.md#m-03--amended-realtime-market-delivery-and-market_observability_v1)

### S-04 — Controlled `LLM_AUTHORING_V1` Strategy Drafts

- **Requirement IDs:** `CSL-R-ST-05`, `CSL-R-RP-02`, URL join `CSL-R-NW-02`.
- **State / owner / wave:** BLOCKED / Strategy application worker / E1.
- **Dependencies:** `C-02`, S-01; URL-origin path joins after N-03.
- **Exact write scope:** Strategy API/application/infrastructure implementation
  and authoring tests excluding canonical contracts; no URL fetch, News storage,
  frontend, or pure-plugin I/O.
- **Acceptance/validation:** One bounded request, deterministic draft validation,
  explicit Save/Approve, immutable owner-scoped version, no-write failures/no
  secrets, public News boundary, and Strategy/contract/owner/global checks.
- **Full packet:** [`MVP_PLAN.md#s-04--controlled-llm_authoring_v1-strategy-drafts`](MVP_PLAN.md#s-04--controlled-llm_authoring_v1-strategy-drafts)

### S-05 — Immutable `WEIGHTED_VOTE_V1` Composite

- **Requirement IDs:** `CSL-R-ST-03`, `CSL-R-ST-06`, `CSL-R-RP-02`.
- **State / owner / wave:** BLOCKED / Strategy composite worker / E1.
- **Dependencies:** `C-02`, S-01; downstream B-03/L-02/F-03/I-03.
- **Exact write scope:** New Strategy composite implementation/adapter/test
  directories only; no canonical contracts, migrations, shared registry, other
  plugins, frontend, or Backtesting.
- **Acceptance/validation:** Enabled +1/0/-1 weighted normalization, thresholds,
  ties, immutable exact component versions, same-owner validation, deterministic
  unit/contract/architecture/scope evidence.
- **Full packet:** [`MVP_PLAN.md#s-05--immutable-weighted_vote_v1-composite`](MVP_PLAN.md#s-05--immutable-weighted_vote_v1-composite)

### S-06 — Deterministic `SMC_LITE_V1` and `WYCKOFF_LITE_V1` Plugins

- **Requirement IDs:** `CSL-R-ST-07`, `CSL-R-RP-02`.
- **State / owner / wave:** BLOCKED / Strategy plugin worker / E1.
- **Dependencies:** `C-02`, S-01; downstream B-03/F-03/I-03.
- **Exact write scope:** New `smc-lite` and `wyckoff-lite` plugin directories and
  focused tests only; no shared registry/contracts, existing plugins, apps,
  migrations, or frontend.
- **Acceptance/validation:** Confirmed pivot/BOS and fixed range-volume heuristics,
  deterministic fixtures, insufficient-data behavior, purity, descriptors,
  truthful Lite labeling, and Strategy/global gates.
- **Full packet:** [`MVP_PLAN.md#s-06--deterministic-smc_lite_v1-and-wyckoff_lite_v1-plugins`](MVP_PLAN.md#s-06--deterministic-smc_lite_v1-and-wyckoff_lite_v1-plugins)

### Q-02 — Seeded `DOMAIN_GUIDED_V1` and `GENETIC_V1` Discovery

- **Requirement IDs:** `CSL-R-SE-03`, `CSL-R-RP-02`, `CSL-R-OB-01`, `CSL-R-LB-01`.
- **State / owner / wave:** BLOCKED / Search worker / E1.
- **Dependencies:** `C-02`, S-01, Q-01 boundary; B-02/L-01 are integration inputs.
- **Exact write scope:** New Search generator profiles, Search application/
  infrastructure profile projections excluding contracts, and focused tests;
  no simulation, scoring, or LLM.
- **Acceptance/validation:** Seed/config/dataset/code provenance, identical
  sequence/ranking, declared categories, Genetic defaults, 500/five-minute bound,
  capacity/lifecycle observability, and public-boundary/reproducibility gates.
- **Full packet:** [`MVP_PLAN.md#q-02--seeded-domain_guided_v1-and-genetic_v1-discovery`](MVP_PLAN.md#q-02--seeded-domain_guided_v1-and-genetic_v1-discovery)

### B-03 — Synthetic Directional Paper Execution and Provenance

- **Requirement IDs:** `CSL-R-BT-02`, `CSL-R-RP-02`, `CSL-R-BT-01`, `CSL-R-OB-01`.
- **State / owner / wave:** BLOCKED / Backtesting worker / E1.
- **Dependencies:** `C-02`, B-01/B-02/M-01/S-01, S-05, S-06.
- **Exact write scope:** Backtesting domain/application/infrastructure and focused
  tests excluding canonical contracts/migrations/frontend/orders/risk.
- **Acceptance/validation:** Long/synthetic Short candle-only profile, dual-trigger
  Stop-Wins, 0.08% fees, adverse 5-bps fills, eight-place decimal P&L,
  immutable provenance, deterministic one-terminal-outcome/no-partial behavior,
  and Backtesting/DB/architecture/global checks.
- **Full packet:** [`MVP_PLAN.md#b-03--synthetic-directional-paper-execution-and-provenance`](MVP_PLAN.md#b-03--synthetic-directional-paper-execution-and-provenance)

### N-03 — Safe URL Import and Versioned News Extraction Refinement

- **Requirement IDs:** `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-SN-01`, `CSL-R-ST-05`,
  `CSL-R-OB-01`.
- **State / owner / wave:** BLOCKED / News/Sentiment boundary worker / E1.
- **Dependencies:** `C-02`, N-01, N-02; downstream S-04/F-03/I-03.
- **Exact write scope:** News and narrowly joined Sentiment API/application/
  infrastructure implementations and focused tests excluding canonical contracts,
  migrations, Strategy internals, frontend, and credentials.
- **Acceptance/validation:** Allowlisted HTTPS/DNS/redirect/time/body safety,
  Website/RSS/HTML adapters, dedupe, DRAFT-only versioned refinement/approval/
  rollback, retention, refresh, neutral Sentiment isolation, and provider/global
  checks.
- **Full packet:** [`MVP_PLAN.md#n-03--safe-url-import-and-versioned-news-extraction-refinement`](MVP_PLAN.md#n-03--safe-url-import-and-versioned-news-extraction-refinement)

### E-02 — Extension Evaluation and Decimal-Boundary Reconciliation

- **Requirement IDs:** `CSL-R-BT-02`, `CSL-R-RP-02`, `CSL-R-EV-01`.
- **State / owner / wave:** BLOCKED / Evaluation worker / E2.
- **Dependencies:** `C-02`, B-03, E-01; downstream L-02/F-03/I-03.
- **Exact write scope:** `modules/evaluation/**` excluding canonical contracts,
  migrations, providers, and other module/frontend code.
- **Acceptance/validation:** Required finite deterministic metrics over decimal
  Long/Short results, no fill recomputation, no ranking on invalid inputs,
  immutability/zero-trade behavior, and Evaluation/public/global checks.
- **Full packet:** [`MVP_PLAN.md#e-02--extension-evaluation-and-decimal-boundary-reconciliation`](MVP_PLAN.md#e-02--extension-evaluation-and-decimal-boundary-reconciliation)

### L-02 — Extension-Aware Ranking and Provenance Admission

- **Requirement IDs:** `CSL-R-LB-01`, `CSL-R-SE-03`, `CSL-R-BT-02`,
  `CSL-R-RP-02`, `CSL-R-OB-01`, `CSL-R-OW-01`.
- **State / owner / wave:** BLOCKED / Leaderboard worker / E2.
- **Dependencies:** `C-02`, Q-02, B-03, E-02, L-01; downstream F-03/I-03.
- **Exact write scope:** `modules/leaderboard/**` excluding canonical contracts,
  migrations, Strategy/Search generation, Backtesting simulation, and frontend.
- **Acceptance/validation:** Same-owner finite Top-K admission, deterministic
  ties/idempotency, discoverable Search/paper/decimal/definition/ranking
  provenance without mutation/leakage, and Leaderboard/DB/global checks.
- **Full packet:** [`MVP_PLAN.md#l-02--extension-aware-ranking-and-provenance-admission`](MVP_PLAN.md#l-02--extension-aware-ranking-and-provenance-admission)

### F-03 — DEC-007 Functional-State Frontend Projections

- **Requirement IDs:** `CSL-R-MD-03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-FE-01`, `CSL-R-DM-01`.
- **State / owner / wave:** BLOCKED / Frontend worker / E3.
- **Dependencies:** M-03, S-04, S-05, S-06, Q-02, B-03, N-03, E-02, L-02;
  downstream I-03 and baseline I-01.
- **Exact write scope:** `apps/frontend/**` only; no backend/module/contract/
  migration/provider/business-calculation changes.
- **Acceptance/validation:** Backend-derived observability, draft approval,
  weighted/Lite descriptors, discovery/paper/extraction/provenance state, four
  chart independence, degraded Sentiment, and frontend/browser/global checks.
- **Full packet:** [`MVP_PLAN.md#f-03--dec-007-functional-state-frontend-projections`](MVP_PLAN.md#f-03--dec-007-functional-state-frontend-projections)

### I-03 — DEC-007 Boundary Integration and Reproducibility Proof

- **Requirement IDs:** All DEC-007 IDs, amended `CSL-R-MD-02`, and integration
  drivers `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-OB-01`, `CSL-R-AR-01`–`03`.
- **State / owner / wave:** BLOCKED / Manager or integration worker / E4.
- **Dependencies:** C-02, all E1/E2/E3 packets, baseline I-01, and AU-02; the
  latter two remain blocked and unauthorized by INS-024.
- **Exact write scope:** `apps/backend/**`, thin REST/market-WS mappers, and
  extension integration/E2E tests; no module algorithms, migrations, frontend,
  queue, or general event bus.
- **Acceptance/validation:** Public cross-module joins, real providers/PostgreSQL,
  ownership, no-secret logs, market-only WS, ephemeral exclusion from backtests,
  seeded reproducibility, paper labeling, final preflight, full global/runtime/
  E2E checks; unavailable evidence is BLOCKED/UNVERIFIED.
- **Full packet:** [`MVP_PLAN.md#i-03--dec-007-boundary-integration-and-reproducibility-proof`](MVP_PLAN.md#i-03--dec-007-boundary-integration-and-reproducibility-proof)

## State derivation at this checkpoint

P-00, C-01, A-00, C-01A, E-01, F-01, S-01, D-01, AU-01, M-01, L-01, and B-02
are DONE. B-02 is closed only at its DEC-006 packet boundary; cross-module
Experiment/Leaderboard transaction coupling remains UNVERIFIED for I-01.
M-02 remains REVIEW because live-provider evidence is UNVERIFIED. Q-01 and
F-02 are DONE at their authorized packet boundaries; F-02 is fixture/fake-client
evidence only and real API/browser integration remains for I-01. F-AUTH, N-01,
and N-02 remain DONE. `RB-01` is DONE as the current governance checkpoint.
`C-02`, `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`,
`F-03`, and `I-03` are newly allocated and remain BLOCKED. AU-02 and I-01/I-02
remain blocked; no feature packet was started by this checkpoint. No legacy DONE
packet is treated as evidence for a DEC-007 requirement.
