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
| C-02 | DONE | E0 | YES | Manager / exactly one contract-and-schema worker `01a04d53-6ab4-70c1-a926-f68464b0fc6a` (INS-034) | `MVP_IMPLEMENTATION` / containing INS-034 closure checkpoint | Contract/schema review, 254/254 workspace tests, PostgreSQL up/constraints/down/remigrate, architecture, artifacts, scope, deferred-scope, typecheck, build, lint, and diff checks PASS; OpenSpec CLI and link/DAG automation UNVERIFIED |
| C-03 | REVIEW | E1 contract reconciliation | YES | Fresh Manager under INS-055 / exactly one Search-contract worker Turing `01a04fed-36a2-76a2-b034-090c150c4873` | `MVP_IMPLEMENTATION` / containing this C-03 checkpoint commit | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; focused 9/9, checker 10/10, full workspace 332 passed / 6 environment-gated skips, scope/arch/artifacts/typecheck/build/lint/diff checks PASS; OpenSpec CLI UNVERIFIED |
| M-03 | REVIEW | E1 | YES | INS-049 Manager `01a04f6d-329f-7d00-a1f2-43339c5bd3e6` + fresh Market Data worker Chandrasekhar `01a04f70-3324-77d3-bdf1-79e1c5b93a01` | `MVP_IMPLEMENTATION` / Manager checkpoint at stop boundary | `IN_PROGRESS -> REVIEW`; Market Data 31 passed / 1 skipped; root 318 passed / 6 skipped; architecture, artifacts, scope, typecheck, build, lint, diff checks PASS; real Binance and PostgreSQL evidence UNVERIFIED/BLOCKED |
| S-04 | BLOCKED | E1 | YES | Future Strategy application worker | — | Not started; controlled LLM draft/approval evidence required |
| S-05 | DONE | E1 | YES | INS-036 fresh S-05 worker `01a04e66-d981-7e42-b75d-1bb3b7340c73` / Manager; INS-041 closure review | `MVP_IMPLEMENTATION` / containing INS-041 closure checkpoint | Focused 17/17 and Strategy 89/89 PASS; ENV-02 checker gate PASS; immutable weighted-composite evidence accepted |
| S-06 | DONE | E1 | YES | INS-036 fresh S-06 worker `01a04e66-e691-7a50-af2f-b1eecd39053b` / Manager; INS-041 closure review | `MVP_IMPLEMENTATION` / containing INS-041 closure checkpoint | Focused 20/20 and Strategy 89/89 PASS; ENV-02 checker gate PASS; deterministic Lite-plugin evidence accepted |
| Q-02 | REVIEW | E1 | YES | Fresh Search worker `01a0500c-2fa8-7a82-a4f0-0badf7479b01` under INS-057 / Manager review | `MVP_IMPLEMENTATION` / containing this Q-02 checkpoint commit | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; focused Q-02 12/12 and Search workspace 32 passed / 1 environment-gated skip; root workspace 341 passed / 6 environment-gated skips; arch, artifacts, typecheck, build, lint, and diff checks PASS; `scope:check` BLOCKED on the four approved Q-02 profile paths; OpenSpec CLI and real PostgreSQL evidence UNVERIFIED |
| B-03 | REVIEW | E1 | YES | Fresh Backtesting worker Pascal `01a04fa2-b515-74d3-a448-0ab605dfabab` under INS-051; Manager review | `MVP_IMPLEMENTATION` / containing this B-03 checkpoint commit | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; Backtesting 43/43 and root 327 passed / 6 skipped; architecture, artifacts, typecheck, build, lint, diff, scope-test PASS; deferred-scope check BLOCKED; real Binance UNVERIFIED and PostgreSQL BLOCKED |
| N-03 | REVIEW | E1 | YES | INS-045 Manager `01a04f09-60b5-7113-8901-bfb50ff23ecd` + exactly one fresh News-Sentiment boundary worker Singer `01a04f0e-de55-78a2-bf64-88b2ac7eb4db` (completed) | `MVP_IMPLEMENTATION` / N-03 source checkpoint `d4161ec458c869ff18fa89dd9732df260629c915` | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; News 30/30 and Sentiment 19/19 PASS; root 310 passed / 6 skipped (exit success; six skips are environment-gated PostgreSQL/integration/E2E checks and are not PASS); PostgreSQL, real News, auto-refresh scheduler, browser/runtime, OpenSpec, and link/DAG evidence UNVERIFIED or BLOCKED |
| E-02 | BLOCKED | E2 | Integration | Future Evaluation worker | — | Not started; decimal-boundary evaluation evidence required |
| L-02 | BLOCKED | E2 | YES | Future Leaderboard worker | — | Not started; extension-aware ranking/provenance evidence required |
| F-03 | BLOCKED | E3 | YES | Future Frontend worker | — | Not started; DEC-007 functional-state projections required |
| I-03 | BLOCKED | E4 | YES | Manager / future integration worker | — | Not started; final extension integration/reproducibility proof required |
| ENV-01 | DONE | E0a | YES | Manager / Infrastructure-and-tooling worker `01a04d08-19c8-76e1-ad32-57471e75f430` | `MVP_IMPLEMENTATION` / containing INS-030 ENV-01 checkpoint commit | Independent review PASS; Docker/migration/checker/root validation PASS; OpenSpec CLI UNVERIFIED |
| ENV-02 | DONE | E1 closure | YES | Manager `01a04ea7-b1bd-73c2-972a-7d67e6f551c9` / checker-tooling worker `01a04eae-367c-7fc3-8961-dccb9e760cf9` (Confucius) under `INS-039`; INS-041 closure review | `MVP_IMPLEMENTATION` / `d8c5bf3324cbee349e272cb177537fa6ed062df0` plus INS-041 closure checkpoint | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`; immutable checker evidence accepted; no worker created for closure |
| ENV-03 | REVIEW | E1 validation gate | YES | Fresh Manager under `INS-053` / exactly one fresh checker-tooling worker Tesla `01a04fd3-2a76-7132-a7f7-abdcbbe0c01b` | `MVP_IMPLEMENTATION` / containing this ENV-03 checkpoint commit | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; scope tests 9/9, scope, architecture, artifacts, typecheck, build, lint, diff checks PASS; OpenSpec UNVERIFIED |
| ENV-04 | DONE | E1 validation gate | YES | Manager closure review under `INS-061`; prior implementation under `INS-059` with exactly one fresh checker-tooling worker Mencius `01a05033-dd87-71d3-ac70-f0817286fc1b` | `MVP_IMPLEMENTATION` / `5032582` implementation checkpoint plus this INS-061 closure checkpoint | `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`; scope tests 13/13, scope, architecture, artifacts, typecheck, build, lint, workspace tests, and diff checks PASS; OpenSpec UNVERIFIED; PostgreSQL-gated tests skipped |

The `RB-01` row records the completed governance checkpoint. `ENV-01` is the
sole packet allocated by current `INS-030`; it is DONE at its authorized
boundary after one worker completed and the Manager independently reviewed it.
`C-02` is now DONE at its authorized contract/schema gate after one worker and
Manager review. M-03 was recovered under INS-049 by one fresh worker and is now
at `REVIEW`; its fixture/resilience evidence passes, but real Binance readiness
and PostgreSQL integration remain unavailable. B-03 is at `REVIEW` after one
fresh worker and independent Manager review; its fixture evidence passes, but
the deferred-scope checker and real-provider/database evidence remain blocked or
unverified. All other extension feature packets other than the now-completed
`S-05`/`S-06` remain `BLOCKED`; no downstream packet was authorized or started.
The existing legacy rows, including
`M-02` at `REVIEW`, `AU-02` at `BLOCKED`, and `I-01`/`I-02` at `BLOCKED`, retain
their states and evidence. DEC-007 feature behavior remains unimplemented in
the separately gated downstream packets.

`ENV-02` was the sole implementation packet named by `INS-039`; it was
persisted as `BLOCKED`, moved to `READY`, executed by exactly one scoped worker,
and reviewed at `REVIEW`. `INS-041` then authorized only the Manager-owned
closure review; `ENV-02`, `S-05`, and `S-06` are now `DONE` after the immutable
evidence and fresh validation gates remained valid. No downstream packet was
started and no worker was created for closure.

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
- **State / owner / wave:** DONE / Manager with exactly one contract-and-schema
  worker `01a04d53-6ab4-70c1-a926-f68464b0fc6a` under INS-034 / E0.
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
- **Checkpoint evidence:** The historical Pauli partial attempt remains
  rejected and was not retried. Under INS-034, the sole worker returned 32
  in-scope contract/schema/model/migration/test paths without a worker commit.
  Manager review covered every changed path, removed the invalid REST market
  observability projection so that observability remains WebSocket-only, and
  corrected the migration-harness profile probe after the deferred-scope
  checker identified a false-positive literal. Canonical ownership, additive
  compatibility, immutable weighted/Lite representation, safe LLM and
  URL/template state, seeded provenance, eight-place paper provenance, News
  extraction/retention, neutral Sentiment, unchanged ownership, and ephemeral
  market observability boundaries are recorded and validated.
- **Validation evidence:** Focused contract/boundary tests 27/27; full
  workspace tests 254 passed with 6 existing environment-gated skips;
  typecheck, build, lint, architecture, artifacts, deferred-scope, and
  whitespace checks PASS. Local Docker PostgreSQL migration up, applicable
  constraints, down, remigrate, and rollback-only edge probes PASS, including
  nested-secret, weighted NaN, missing Search provenance, and paper-accounting
  rejection. OpenSpec CLI and dedicated link/DAG automation are UNVERIFIED.
- **Current execution:** Applicability was independently proven at `3b1766e`
  against reviewed checkpoint `58885dd`; C-02 transitioned exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`. The coherent closure is
  committed in the containing INS-034 checkpoint. No downstream task was
  authorized or started; INS-034 is exhausted pending the next Instructor
  review signal.
- **Full packet:** [`MVP_PLAN.md#c-02--dec-007-contract-data-model-and-migration-reconciliation-gate`](MVP_PLAN.md#c-02--dec-007-contract-data-model-and-migration-reconciliation-gate)

### C-03 — Seeded-Discovery Canonical Contract Reconciliation

- **Requirement IDs / authority:** `CSL-R-SE-03`, `CSL-R-RP-02`,
  `CSL-R-LB-01`, `CSL-R-OB-01`, DEC-007, DEC-012, and the existing C-02
  contract boundary.
- **State / owner / wave:** REVIEW / Fresh Manager under INS-055 with exactly
  one Search-contract worker Turing `01a04fed-36a2-76a2-b034-090c150c4873` / E1
  contract reconciliation gate.
- **Start dependencies:** `C-02` DONE and `ENV-03` REVIEW with its clean
  deferred-scope gate; the current Instructor signal explicitly authorizes C-03.
  C-03 is not a retry or reopening of C-02.
- **Exact write scope:** Search API contracts/tests, Search application ports/
  focused tests, the canonical Search REST contract/focused tests, and the
  minimal deferred-scope checker recognition/tests for the actual Search REST
  path. The Manager may update only this task board and `HANDOFF.md`.
  No Search lifecycle, generator implementation, persistence, migration,
  frontend, provider, queue, or unrelated source is in scope.
- **Acceptance/validation:** Public generator types and registry shape represent
  `RANDOM`, `DOMAIN_GUIDED`, and `GENETIC`; seeded provenance and finite bounded
  stop concepts remain explicit; client commands remain owner-free; REST parsing
  accepts only the explicit approved values/profile IDs and rejects unsupported
  values and client identity fields; current RANDOM behavior remains unchanged;
  the checker recognizes the canonical Search REST file without broadening its
  policy; no Q-02 algorithm or Search lifecycle behavior is implemented.
- **Definition of Done:** Move only through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; exactly one fresh worker is
  delegated and independently reviewed; one coherent C-03 checkpoint is
  committed; Q-02 and all other packets remain unchanged and blocked as
  applicable.
- **Worker result / Manager review:** Turing changed only the eight authorized
  Search contract/REST/checker paths, created no commit or control-plane edit,
  and added no generator algorithm or lifecycle behavior. Independent review
  confirmed the three generator modes, typed future registry slots, bounded
  seeded provenance, strict REST unions/parser validation, owner-field
  rejection, and exact canonical REST checker boundary; Search runtime,
  persistence, migrations, and Q-02 paths remain unchanged.
- **Validation:** Focused Search/API/REST tests 9/9 PASS; checker tests 10/10
  PASS; `npm run scope:check`, `npm run arch:check`,
  `npm run artifacts:check`, `npm run typecheck`, `npm run build`,
  `npm run lint`, full workspace tests (332 passed / 6 environment-gated
  skips), and `git diff --check` PASS. OpenSpec CLI is UNVERIFIED because it
  is unavailable.
- **Full packet:** [`MVP_PLAN.md#c-03--seeded-discovery-canonical-contract-reconciliation`](MVP_PLAN.md#c-03--seeded-discovery-canonical-contract-reconciliation)

### M-03 — Amended Realtime Market Delivery and `MARKET_OBSERVABILITY_V1`

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-MD-03`, `CSL-R-RP-02`, `CSL-R-FE-01`,
  `CSL-R-OB-01`.
- **State / owner / wave:** REVIEW / fresh INS-049 Manager
  `01a04f6d-329f-7d00-a1f2-43339c5bd3e6` + fresh Market Data worker Chandrasekhar
  `01a04f70-3324-77d3-bdf1-79e1c5b93a01` / E1.
- **Dependencies:** `C-02=DONE`, `M-01=DONE`, and the `F-01` normalized chart
  input were verified. `M-02` remains `REVIEW/UNVERIFIED` and was not moved.
- **Exact write scope:** `modules/market-data/api/**` excluding
  `contracts.ts` and `contracts.spec.ts`, `modules/market-data/application/**`,
  `modules/market-data/infrastructure/**`, and focused tests in those areas.
  No frontend, transport contract, migration, dependency, runtime, event-bus,
  or other-module path was changed.
- **Recovery progression:** The interrupted Anscombe worker from INS-043
  (`01a04ef0-4cc6-78d3-af30-a393155b1953`) remains historical and was not
  resumed, replaced, or retried. The existing `IN_PROGRESS` state was retained
  while Chandrasekhar implemented the packet; after independent Manager review
  it transitioned exactly `IN_PROGRESS -> REVIEW`. It was not reset through
  `BLOCKED` or `READY`.
- **Worker result:** One fresh worker, no source commit and no control-plane
  edits. Binance realtime now subscribes to normalized kline and trade streams;
  the application normalizes same-timestamp/later candle updates, suppresses
  duplicate/unseen out-of-order closed candles, isolates up to four subscription
  scopes, exposes a capped in-memory observability projection, and bounds
  shutdown/reconnect/gap handling. Raw provider envelopes remain adapter-local.
- **Changed paths:**
  `modules/market-data/api/{bootstrap,index,index.spec}.ts`;
  `modules/market-data/application/{ports,observability,service,service.spec}.ts`;
  `modules/market-data/infrastructure/{binance-realtime,binance-realtime.spec}.ts`.
  Frozen `modules/market-data/api/contracts.ts` and `contracts.spec.ts` were
  unchanged.
- **Independent review:** Ephemeral observability is held in a dedicated
  in-memory service projection, capped at 100 ticks per pair, clone-read, and
  explicitly resettable; it is not wired to CandleRepository, snapshots,
  Backtesting, or replay. Provider failures are sanitized and isolated, closed
  candles do not regress to forming state, REST gap recovery excludes forming
  candles and is bounded, and subscription/candle state is keyed by pair and
  timeframe. The market WebSocket contract suite remains read-only and passes.
- **Validation:** Market Data package — PASS, 31 passed / 1 skipped across 6
  passed / 1 skipped files. Root workspace — PASS, 318 passed / 6 skipped; skips
  are environment-gated and not PASS evidence. `npm run test:scope-check` — PASS,
  7/7. `npm run arch:check`, `npm run artifacts:check`, `npm run scope:check`,
  `npm run typecheck`, `npm run build`, `npm run lint`, and `git diff --check` —
  PASS. The architecture check reported its expected nine forbidden-dependency
  fixtures while exiting successfully.
- **Unavailable evidence:** Real configured Binance historical/realtime smoke is
  `UNVERIFIED`; no live Binance runtime configuration was present on this host,
  so fixture evidence is not promoted to real-provider PASS. Market Data
  PostgreSQL integration is `BLOCKED/UNVERIFIED`; `DATABASE_URL` was absent and
  `infrastructure/postgres.integration.spec.ts` was skipped. OpenSpec CLI is
  `UNVERIFIED` because the command is unavailable. Browser/runtime and link/DAG
  automation were not run and remain `UNVERIFIED`; none is claimed as PASS.
- **Stop boundary:** M-03 remains `REVIEW`, not `DONE`, because the required
  real-provider evidence is unavailable. N-03 remains `REVIEW` at source/business
  checkpoint `d4161ec458c869ff18fa89dd9732df260629c915`; M-02 remains
  `REVIEW/UNVERIFIED`; every other task state and evidence is preserved. No
  downstream packet was started, promoted, or auto-unlocked. The coherent
  Manager checkpoint commit is reported at the stop boundary.
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
- **State / owner / wave:** DONE / INS-036 fresh S-05 worker `01a04e66-d981-7e42-b75d-1bb3b7340c73`, Manager, and INS-041 closure review / E1.
- **Dependencies:** `C-02`, S-01; downstream B-03/L-02/F-03/I-03.
- **Exact write scope:** Only new files under
  `modules/strategy/domain/composite/**` and
  `modules/strategy/application/composite/**`, including implementation and
  focused tests; no canonical contracts, migrations, shared registry, other
  plugins, frontend, or Backtesting.
- **Acceptance/validation:** Enabled BUY/HOLD/SELL map to +1/0/-1; finite
  non-negative enabled weights normalize to one; default +0.30/-0.30 inclusive
  thresholds make all other scores, including ties, HOLD; immutable enabled
  state, normalized weights, thresholds, and exact component versions; invalid,
  zero-total, non-finite, and cross-owner definitions fail before execution;
  pure deterministic behavior distinct from historical `MAJORITY_VOTE_V1`.
- **Review/checkpoint:** Worker produced the six in-scope files without a
  commit, registration, integration, or control-plane edit. Manager independently
  reviewed the files and made one readonly-test cast fix in the same authorized
  test path. Focused tests are 17/17; package Strategy tests are 89/89; package
  typecheck/lint/build and applicable root gates pass. The separately authorized
  `ENV-02` checker reconciliation now passes the four extension-directory
  boundaries and near-match negative cases, so the weighted-composite evidence
  was accepted under `INS-041` without source changes.
- **Full packet:** [`MVP_PLAN.md#s-05--immutable-weighted_vote_v1-composite`](MVP_PLAN.md#s-05--immutable-weighted_vote_v1-composite)

### S-06 — Deterministic `SMC_LITE_V1` and `WYCKOFF_LITE_V1` Plugins

- **Requirement IDs:** `CSL-R-ST-07`, `CSL-R-RP-02`.
- **State / owner / wave:** DONE / INS-036 fresh S-06 worker `01a04e66-e691-7a50-af2f-b1eecd39053b`, Manager, and INS-041 closure review / E1.
- **Dependencies:** `C-02`, S-01; downstream B-03/F-03/I-03.
- **Exact write scope:** Only new files under
  `modules/strategy/domain/plugins/smc-lite/**` and
  `modules/strategy/domain/plugins/wyckoff-lite/**`, including implementation
  and focused tests; no shared registry/contracts, existing plugins, apps,
  migrations, or frontend.
- **Acceptance/validation:** Confirmed pivot-window swing highs/lows and
  close-based BOS; fixed range/volume heuristics for accumulation,
  distribution, and breakout; explicit validation and insufficient-data
  behavior; pure finite deterministic closed-candle execution; truthful Lite
  descriptors and limitations; focused and Strategy/global gates.
- **Review/checkpoint:** Worker produced the six in-scope files without a
  commit, registration, integration, or control-plane edit. Manager independently
  reviewed the files. Focused tests are 20/20; package Strategy tests are 89/89;
  package typecheck/lint/build and applicable root gates pass. The separately
  authorized `ENV-02` checker reconciliation now passes the four
  extension-directory boundaries and near-match negative cases, so the
  deterministic Lite-plugin evidence was accepted under `INS-041` without
  source changes.
- **Full packet:** [`MVP_PLAN.md#s-06--deterministic-smc_lite_v1-and-wyckoff_lite_v1-plugins`](MVP_PLAN.md#s-06--deterministic-smc_lite_v1-and-wyckoff_lite_v1-plugins)

### ENV-02 — Post-Extension Approved-Profile Checker Boundary Reconciliation

- **Requirement IDs / authority:** `CSL-R-RP-02`, DEC-007, DEC-010, ADR-010;
  this is a post-extension validation/tooling gate and creates no product
  behavior or new profile.
- **State / owner / wave:** DONE / Manager `01a04ea7-b1bd-73c2-972a-7d67e6f551c9`
  with exactly one checker-tooling worker `01a04eae-367c-7fc3-8961-dccb9e760cf9`
  (Confucius) under `INS-039`, followed by the INS-041 Manager closure review /
  E1 closure gate.
- **Start dependencies:** `ENV-01` DONE, `C-02` DONE, and `S-05`/`S-06` at
  `REVIEW` with their source evidence available. The implementation ran under
  `INS-039`; the current `INS-041 / APPROVED_FOR_EXECUTION` signal authorized
  only the closure review. `ENV-02` is not a retry of `ENV-01`.
- **Integration dependencies:** The accepted checker gate is required before
  `S-05`/`S-06` can be promoted to `DONE`; no downstream feature packet is
  promoted by this packet.
- **Objective:** Reconcile the canonical deferred-scope checker with the exact
  extension-owned implementation boundaries already authorized for
  `WEIGHTED_VOTE_V1`, `SMC_LITE_V1`, and `WYCKOFF_LITE_V1`, while retaining
  rejection of every deferred or unapproved boundary.
- **Exact write scope:** `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs` only for the worker; the Manager alone
  owns the required `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` state/checkpoint updates. No module,
  package, app, migration, dependency, runtime, frontend, requirement, ADR,
  OpenSpec, or other governance file is in the worker scope.
- **Acceptance/validation:** Permit the approved profile identifiers at the
  existing canonical contract/port/REST/migration boundaries and only these
  implementation directories: `modules/strategy/application/composite/`,
  `modules/strategy/domain/composite/`,
  `modules/strategy/domain/plugins/smc-lite/`, and
  `modules/strategy/domain/plugins/wyckoff-lite/`. Focused tests must prove
  positive approved boundaries and negative unrelated paths. No path-wide
  exclusion, generic profile bypass, or weakening of deferred enterprise
  identity, distributed/queue, live-trading/generalized-risk,
  autonomous/unconfigured LLM, or strict-replay rejection is allowed.
  Required checks are `npm run test:scope-check`, `npm run scope:check`,
  applicable architecture/artifact/deferred-scope/typecheck/build/lint gates,
  and `git diff --check`; OpenSpec CLI or unavailable environments remain
  `UNVERIFIED`/`BLOCKED`, never `PASS`.
- **Checkpoint:** The row was inserted `BLOCKED`, moved through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` at `MVP_IMPLEMENTATION /
  e0198bb64bbd5fd4fb77b38bbcc345f20ab04363` after the Manager verified the
  signal, dependencies, clean canonical state, and non-material governance-only
  delta from reviewed source/business checkpoint
  `3aa0db528d7758788067348f70b5ea02d68bdb45`. The implementation checkpoint is
  `d8c5bf3324cbee349e272cb177537fa6ed062df0` (`checkpoint(ins-039): reconcile
  checker boundaries`). Exactly one worker,
  `01a04eae-367c-7fc3-8961-dccb9e760cf9` (Confucius), changed only the two
  checker files. Manager `01a04ea7-b1bd-73c2-972a-7d67e6f551c9` independently
  reviewed the diff and validation; the checkpoint commit is recorded. Under
  `INS-041`, the fresh Manager reverified the immutable evidence and promoted
  `ENV-02`, `S-05`, and `S-06` independently to `DONE`; no worker was created
  and no downstream packet was started.
- **Full packet:** [`MVP_PLAN.md#env-02--post-extension-approved-profile-checker-boundary-reconciliation`](MVP_PLAN.md#env-02--post-extension-approved-profile-checker-boundary-reconciliation)

### ENV-03 — B-03 Approved-Profile Checker Boundary Reconciliation

- **Requirement IDs / authority:** `CSL-R-RP-02`, DEC-007, DEC-011, ADR-010;
  this is a post-B-03 validation/tooling gate and creates no product
  behavior, contract, migration, or new profile.
- **State / owner / wave:** REVIEW / Fresh Manager under `INS-053` with exactly
  one fresh checker-tooling worker / E1 validation gate.
- **Start dependencies:** `ENV-02` DONE and `B-03` REVIEW with source
  checkpoint `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4` available. `ENV-03` is
  not a retry or reopening of `ENV-01` or `ENV-02`.
- **Integration dependencies:** The accepted checker gate is required before
  B-03 can be promoted to `DONE` and before its E2 consumers rely on a clean
  deferred-scope result. No downstream feature packet is promoted by this
  packet.
- **Objective:** Reconcile the canonical deferred-scope checker with the exact
  Backtesting implementation boundaries already authorized for
  `SYNTHETIC_SHORT_PAPER_V1` and `STOP_LOSS_WINS_V1`, while retaining rejection
  of every deferred or unapproved boundary.
- **Exact write scope:** Worker: `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs` only. Manager: this task board and
  `docs/implementation/HANDOFF.md` only for state and checkpoint evidence. No
  module, package, app, migration, dependency, runtime, frontend, requirement,
  ADR, OpenSpec, or other governance file is in scope.
- **Acceptance/validation:** The checker must permit the two B-03 profile
  identifiers at existing canonical Backtesting contract/port/REST/migration
  boundaries and only in `modules/backtesting/domain/`,
  `modules/backtesting/application/`, and
  `modules/backtesting/infrastructure/`. Directional paper vocabulary is
  permitted only in those same exact boundaries. Focused tests must prove
  positive approved boundaries and negative unrelated paths, while preserving
  all deferred enterprise identity, distributed/queue,
  live-trading/generalized-risk, autonomous/unconfigured LLM, strict-replay,
  operational-risk, and other unapproved-scope rejection.
- **Worker result / Manager review:** Exactly one fresh worker, Tesla
  `01a04fd3-2a76-7132-a7f7-abdcbbe0c01b`, changed only the two checker files and
  created no commit. The Manager independently reviewed the exact trailing-slash
  boundaries, the three implementation-directory positives, the unrelated and
  near-match negatives, and preservation of all prior tests/rejections. B-03,
  its contracts, migrations, and all unrelated source remain unchanged.
- **Validation:** `npm run test:scope-check` PASS (9/9), `npm run scope:check`
  PASS, `npm run arch:check` PASS, `npm run artifacts:check` PASS,
  `npm run typecheck` PASS, `npm run build` PASS, `npm run lint` PASS, and
  `git diff --check` PASS. OpenSpec CLI is UNVERIFIED because it is unavailable.
  Real PostgreSQL/Binance evidence is outside this tooling packet and no such
  evidence is claimed.
- **Definition of Done:** Moved only through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; exactly one fresh worker was
  delegated and independently reviewed; one coherent ENV-03 checkpoint is
  committed; B-03 remains `REVIEW` and no downstream work was started.
- **Full packet:** [`MVP_PLAN.md#env-03--b-03-approved-profile-checker-boundary-reconciliation`](MVP_PLAN.md#env-03--b-03-approved-profile-checker-boundary-reconciliation)

### ENV-04 — Q-02 Approved-Profile Checker Boundary Reconciliation

- **Requirement IDs / authority:** `CSL-R-RP-02`, `CSL-R-SE-03`, DEC-007,
  DEC-012, DEC-013, ADR-010; this is a post-Q-02 validation/tooling gate and
  creates no product behavior, new profile, contract, migration, or lifecycle.
- **State / owner / wave:** DONE / Manager closure review under `INS-061`; prior
  implementation under `INS-059` with exactly one fresh checker-tooling worker
  Mencius `01a05033-dd87-71d3-ac70-f0817286fc1b` / E1 validation gate.
- **Start dependencies:** Q-02 is `REVIEW` at source checkpoint
  `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`; ENV-03 is `REVIEW` with accepted
  checker evidence at `0bc215f5781a7a2860d439b3b4953104a99d9e3a`;
  `INS-059` explicitly authorized this packet.
- **Exact write scope:** Worker changed only `scripts/check-deferred-scope.cjs`
  and `scripts/check-deferred-scope.test.cjs`. Manager changed only this task
  board and `docs/implementation/HANDOFF.md` for the ENV-04 state/checkpoint.
  No Q-02 source, Search contracts/lifecycle, migrations, modules, packages,
  apps, dependencies, or other documentation changed.
- **Acceptance/validation:** `DOMAIN_GUIDED_V1` is permitted only in the
  existing canonical Search boundaries plus
  `modules/search/application/service.ts` and
  `modules/search/domain/generators/domain-guided/`; `GENETIC_V1` is permitted
  in the same canonical boundaries plus
  `modules/search/application/service.ts` and
  `modules/search/domain/generators/genetic/`. Matching is exact and
  path-aware; broad, near-match, and unrelated Search paths remain rejected.
  Prior approved-profile cases and deferred enterprise identity,
  distributed/queue, live-trading/generalized-risk, autonomous/unconfigured
  LLM, strict-replay, and forbidden-path rejections remain covered.
- **Worker result / Manager review:** Mencius created no commit, branch,
  worktree, worker, or governance change. Independent review verified the
  exact allowlist, canonical Search boundaries, both Q-02 implementation
  directories, `service.ts`, broad/near-match negatives, and preserved
  ENV-01/ENV-02/ENV-03/deferred-family cases.
- **Validation:** `npm run test:scope-check` PASS (13/13); `npm run scope:check`
  PASS; `npm run arch:check` PASS; `npm run artifacts:check` PASS;
  `npm run typecheck` PASS; `npm run build` PASS; `npm run lint` PASS;
  `npm test` PASS (341 passed, 6 environment-gated skips); `git diff --check`
  PASS. OpenSpec CLI is UNVERIFIED because it is unavailable. PostgreSQL-gated
  tests were skipped because `DATABASE_URL` is absent; no real database or
  provider evidence is claimed.
- **Definition of Done / stop boundary:** ENV-04 transitioned exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`. The implementation
  checkpoint is committed as `5032582`; this INS-061 closure checkpoint contains
  only the Manager-owned `TASKS.md` and `HANDOFF.md` updates. Q-02 remains
  `REVIEW`; no Q-02 closure, E-02, L-02, B-03, S-04, M-03, N-03, I-01/I-02/
  I-03, AU-02, or other downstream/newly unlocked packet was started or
  promoted.
- **Full packet:** [`MVP_PLAN.md#env-04--q-02-approved-profile-checker-boundary-reconciliation`](MVP_PLAN.md#env-04--q-02-approved-profile-checker-boundary-reconciliation)

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
- **State / owner / wave:** REVIEW / Fresh Backtesting worker Pascal `01a04fa2-b515-74d3-a448-0ab605dfabab` under INS-051 with Manager review / E1.
- **Dependencies:** `C-02`, B-01/B-02/M-01/S-01, S-05, S-06.
- **Exact write scope:** Backtesting domain/application/infrastructure and focused
  tests excluding canonical contracts/migrations/frontend/orders/risk.
- **Acceptance/validation:** Long/synthetic Short candle-only profile, dual-trigger
  Stop-Wins, 0.08% fees, adverse 5-bps fills, eight-place decimal P&L,
  immutable provenance, deterministic one-terminal-outcome/no-partial behavior,
  and Backtesting/DB/architecture/global checks.
- **Review checkpoint:** One fresh worker completed the scoped implementation
  without a commit or control-plane edit. Manager independently reviewed the
  diff, fixed one narrow application wiring defect so nested `paperExecution`
  reaches the simulator, and added the corresponding application assertion in
  the same authorized paths. B-03 remains `REVIEW`, not `DONE`, because
  `npm run scope:check` is blocked by the existing deferred-scope allowlist for
  approved B-03 vocabulary and real Binance/PostgreSQL evidence is unavailable.
- **Full packet:** [`MVP_PLAN.md#b-03--synthetic-directional-paper-execution-and-provenance`](MVP_PLAN.md#b-03--synthetic-directional-paper-execution-and-provenance)

### N-03 — Safe URL Import and Versioned News Extraction Refinement

- **Requirement IDs:** `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-SN-01`, `CSL-R-ST-05`,
  `CSL-R-OB-01`.
- **State / owner / wave:** REVIEW / INS-045 Manager `01a04f09-60b5-7113-8901-bfb50ff23ecd` + exactly one fresh News/Sentiment boundary worker Singer `01a04f0e-de55-78a2-bf64-88b2ac7eb4db` / E1.
- **Dependencies:** `C-02`, N-01, N-02; downstream S-04/F-03/I-03.
- **Exact write scope:** News and narrowly joined Sentiment API/application/
  infrastructure implementations and focused tests excluding canonical contracts,
  migrations, Strategy internals, frontend, and credentials.
- **Acceptance/validation:** Allowlisted HTTPS/DNS/redirect/time/body safety,
  Website/RSS/HTML adapters, dedupe, DRAFT-only versioned refinement/approval/
  rollback, retention, refresh, neutral Sentiment isolation, and provider/global
  checks.
- **Worker result and review:** Singer completed in the canonical same-directory
  checkout without a source commit or control-plane edits. The Manager reviewed
  the result and applied only narrow N-03 fixes: purge raw HTML, provenance,
  templates, then News; protect templates still referenced by provenance or
  superseders; conservatively protect News rows referenced by restricted
  Sentiment results or Strategy drafts; preserve approved URL-import template
  provenance and opaque imported identity; and pin the validated DNS address in
  the default HTTPS transport while retaining the hostname for TLS/SNI.
- **Evidence:** News focused tests 30/30 PASS; Sentiment focused tests 19/19
  PASS; root typecheck, build, lint, architecture, artifacts, scope, diff, and
  workspace tests PASS (310 passed, 6 skipped; exit success). The six skipped
  tests are environment-gated PostgreSQL/integration/E2E checks and are not PASS
  evidence. Frozen contracts and migrations were unchanged.
- **Limitations:** Local PostgreSQL validation is BLOCKED because this host has
  no working Docker Compose command; real configured News, PostgreSQL runtime,
  browser/runtime, OpenSpec, and link/DAG evidence are UNVERIFIED/BLOCKED.
  Auto-refresh is PARTIAL/UNVERIFIED: the 1–5 minute setting and five-minute
  default are validated and exposed, but no scheduler is in this packet.
- **Stop boundary:** N-03 is REVIEW after the retention correction was validated;
  no downstream packet was started or promoted at that checkpoint. The later
  INS-049 M-03 recovery is recorded in the current frontier above.
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
`C-02` is DONE. `S-05` and `S-06` transitioned exactly
`BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`: the implementation and
independent source review occurred under INS-036, the checker boundary was
reconciled under ENV-02, and the closure promotion was authorized by INS-041.
`M-03` is REVIEW after the INS-049 recovery, with real-provider evidence still
UNVERIFIED. B-03 is REVIEW under INS-051 after exactly one fresh scoped worker
completed and the Manager reviewed/fixed the application wiring and final
evidence; deferred-scope and real-provider/database gates remain blocked or
unverified. N-03 is REVIEW under INS-045 after exactly one fresh scoped worker
completed and the Manager reviewed the retention correction and final evidence;
`S-04` remains BLOCKED and `Q-02` remains REVIEW. `ENV-04` is DONE under
INS-061 after exactly one fresh checker-tooling worker completed, the Manager
independently reviewed the exact Search profile allowlist and preserved
deferred-scope rejection, and the committed implementation checkpoint `5032582`
was reconciled.
`E-02`, `L-02`, `F-03`, and `I-03` remain BLOCKED. No downstream packet was
authorized or started. AU-02 and
I-01/I-02 remain blocked; no legacy DONE packet is treated as evidence for an
unrelated DEC-007 requirement.
