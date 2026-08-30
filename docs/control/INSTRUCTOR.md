# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-108`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-108 — Public module bootstrap and persistence seam reconciliation

This signal supersedes `INS-107 / HOLD` after the Instructor's independent
review of the committed I-01 boundary. It authorizes exactly one fresh
same-directory Manager and only the bounded prerequisite packet `I-01R`.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `b20c5e6` (`chore(control): hold after I-01
  integration review`). The tracked tree is clean at this checkpoint; the
  untouched app-generated `.codex/config.toml` remains untracked, outside
  Cryptox scope, and must stay unstaged and undeleted.
- The authoritative task board at authorization is `41 DONE`, `1 REVIEW`
  (`I-01`), and `2 BLOCKED` (`I-02`, `I-03`). `I-01R` is a new plan packet in
  `MVP_PLAN.md`; the Manager must add its single operational row to
  `TASKS.md` and own its state transitions. `I-01` must remain `REVIEW` until
  a later fresh authorization.
- `INS-106` was independently reviewed and integrated at `0bab722`; its
  Manager and sole worker Volta are idle/closed. No competing Cryptox
  Manager, worker, retry, replacement, duplicate, or downstream execution is
  active. The public seams named below are concrete blockers from that review,
  not chat-only assumptions.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical checkout, same directory,
  no worktree and no historical Manager reuse, using model
  `gpt-5.6-luna` with reasoning `max`. The Manager must read `AGENTS.md`,
  `docs/control/prompts/ORCHESTRATOR_START.md`, the current signal, checkpoint,
  task DAG, requirements, accepted ADRs, architecture, data model, relevant
  capability specs, and the `I-01R` plan packet before acting.
- The Manager may create at most three fresh internal workers, one for each
  disjoint scope below, and no user-visible child tasks. Workers must not edit
  control-plane artifacts, commit, or change another worker's paths. No
  duplicate, replacement, retry, or unapproved parallel writer is allowed.
- Worker A — Backtesting public execution seam: only
  `modules/backtesting/api/**` excluding `contracts.ts`, plus focused tests
  within that authorized area. Expose a public bounded-local-executor
  composition helper/factory usable by `createBacktestingModule`; do not alter
  simulator behavior or import infrastructure from the backend.
- Worker B — Search public generator seam: only `modules/search/api/**`
  excluding `contracts.ts`, plus focused tests within that authorized area.
  Expose deterministic immutable composition for the already approved
  `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1` generators without copying
  algorithms or changing their behavior.
- Worker C — Owned persistence/public exports: only
  `modules/strategy/api/**`, a new or narrowly required
  `modules/strategy/infrastructure/postgres.ts` and its focused tests, plus
  `modules/sentiment/api/**` and focused tests. Provide owner-filtered,
  versioned Strategy definition/composite PostgreSQL repositories against the
  existing approved schema and expose the existing Sentiment PostgreSQL
  dependencies through its public entrypoint. No schema or migration change
  is authorized.
- The Manager alone may update the new `I-01R` row in
  `docs/implementation/TASKS.md` and replace
  `docs/implementation/HANDOFF.md`; all source implementation with an
  independent write scope must be delegated to the workers. The Manager may
  do only governance, review, integration glue, conflict resolution, or a
  tiny review fix clearly within these paths.

### Acceptance, validation, prohibitions and stop condition

- Prove through focused public-entrypoint tests that the Backtesting and
  Search seams are composable, deterministic, immutable, and free of
  duplicate algorithm source; prove Strategy owner filtering, pagination,
  version allocation/concurrency, composite component-version provenance,
  cross-owner no-leak behavior, and Sentiment public adapter export.
- Run focused module suites plus workspace build, typecheck, lint,
  architecture/dependency, artifact/source-sidecar, deferred-scope,
  test-scope, secret/log, whitespace, and exact-path checks. Fixture/fake
  tests may establish deterministic source behavior, but real PostgreSQL or
  provider evidence must be reported only when actually observed; unavailable
  tools/environments remain `UNVERIFIED`/`BLOCKED`.
- Do not change `packages/contracts/**`, migrations/schema, any module
  `application/**`, Strategy algorithms, existing provider implementations,
  `apps/backend/**`, `infra/**`, frontend, dependencies, OpenSpec artifacts,
  requirements, ADRs, deferred scope, queues, distributed protocols, or
  general event buses. Do not resume or promote `I-01`, start `I-02`/`I-03`,
  or claim final/demo integration. If the required seam cannot be implemented
  within the listed paths without contract/schema/application changes, stop at
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and report the exact blocker.
- The Manager may move only `I-01R` through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, and to `DONE` only when its
  bounded seam evidence passes. It must stop when I-01R is exhausted and must
  not automatically resume I-01 or start any downstream packet. One coherent
  commit attempt is allowed; if Git denies it, record the exact error and do
  not retry.

## Historical INS-107 — HOLD after INS-106 I-01 review

This signal supersedes `INS-106 / APPROVED_FOR_EXECUTION` after the
Instructor's independent review. It records the current safe checkpoint and
authorizes no implementation until the public composition/bootstrap blockers
and unavailable final-environment evidence are separately reconciled.

### Reviewed checkpoint and current state

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, with the exact audited I-01 source/checkpoint delta
  integrated at `0bab722` (`feat(backend): compose MVP runtime boundary`).
  The tracked tree is clean after that commit; the untouched app-generated
  `.codex/config.toml` remains untracked, outside Cryptox scope, and must stay
  unstaged and undeleted.
- The authoritative task board is `41 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). `I-01` remains `REVIEW`, not `DONE`; no task
  moved to `IN_PROGRESS` or `READY` under this HOLD.
- `INS-106` used exactly one fresh same-directory Manager and exactly one
  fresh sequential internal worker Volta. Both are idle/closed; no competing
  Cryptox Manager, worker, retry, replacement, duplicate, or downstream task
  is active.
- The accepted I-01 boundary is limited to `apps/backend/**` plus the two
  Manager-owned checkpoint files. No contracts, modules, migrations,
  infrastructure, frontend, dependency, generated, architecture,
  requirements, ADR, OpenSpec, or unrelated path changed. The backend
  exposes the approved Auth/capability REST and market-only WebSocket
  transport boundary with trusted server-side session identity and truthful
  readiness/failure projection.

### Independent review and blockers

- `PASS`: backend tests `15 passed / 1 skipped`; workspace tests `396 passed /
  6 environment-gated skips`; build; typecheck; lint; source-sidecar and
  artifact checks; deferred-scope; test-scope `13/13`; secret/log scan;
  whitespace; and exact changed-path review.
- `FAIL`: `arch:check` reports 71 existing dependency violations, with no
  I-01 backend path implicated. `runtime:smoke` reaches `/live=200` and
  truthful `/ready=503` but has a stale assertion for the prior three required
  dependency names; the smoke script is outside the authorized I-01 boundary.
- `BLOCKED`/`UNVERIFIED`: Docker/local PostgreSQL and real application
  persistence; configured Binance historical/realtime and CoinDesk evidence;
  manual production Backtest/SearchRun/Candidate/Experiment/Trade and
  application-generated Leaderboard composition; browser/final-demo evidence;
  and OpenSpec CLI evidence. The missing public Backtesting executor, Search
  generator, Strategy PostgreSQL, and Sentiment PostgreSQL bootstraps require
  explicit source-reconciliation authorization before any excluded module or
  bootstrap path is changed.

### Hold condition and next authorization gate

- No implementation is authorized by `INS-107`. The Manager must not start,
  promote, retry, or split any packet under this signal. `I-02` and `I-03`
  remain `BLOCKED`, and no deferred or excluded scope may be opened.
- A later Instructor review may issue a fresh bounded authorization only after
  reconciling the public module/bootstrap seams in the plan and decision ledger,
  proving disjoint write scope and dependencies, and rechecking Git,
  checkpoint consistency, and active writers. Real database/provider/browser
  evidence must remain explicitly `PASS`, `UNVERIFIED`, or `BLOCKED` according
  to actual evidence.

## Historical INS-106 — Runtime, transports and observability integration

This signal supersedes `INS-105 / HOLD` after the Instructor's fresh review
of the accepted I-01S seam. It authorizes exactly one fresh same-directory
Manager in the canonical checkout, configured as `gpt-5.6-luna` with
reasoning `max`, and exactly one fresh sequential internal worker for the sole
packet `I-01`. No I-02, I-03, extension, retry, replacement, duplicate,
worktree, or downstream execution is authorized.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `f656274` (`chore(control): hold after I-01S
  acceptance`). The tracked tree is clean at this checkpoint; the only
  working-tree item is the untouched app-generated `.codex/config.toml`,
  outside Cryptox scope, which must remain unstaged and undeleted.
- The authoritative task board is `41 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). `I-01S` is independently accepted `DONE` at
  `7d574e6`; the public `STRATEGY_FACTORIES` seam is now available through the
  Strategy package entrypoint and is proven compatible with
  `createStrategyModule`.
- I-01 start dependencies are verified `DONE`: `AU-01`, `AU-02`, `B-02`,
  `M-01`, `M-02`, `S-02`, `S-03`, `Q-01`, `N-01`, `N-02`, `F-01`, `F-AUTH`,
  and `F-02`. The prior I-01 attempt remains a historical
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` checkpoint, not a retry; this is a fresh
  resumption after the separately authorized I-01S reconciliation.
- The prior I-01 composition blocker is resolved without changing canonical
  contracts or Strategy algorithms. No competing Cryptox Manager,
  Orchestrator, worker, retry, replacement, duplicate, or downstream task is
  active. The Manager must revalidate all of these premises from Git and the
  control plane before assigning work.

### Exact Manager/worker scope

- Create exactly one fresh sequential internal worker. All bounded
  implementation work with an independent write scope must be delegated under
  `AGENTS.md`; the Manager may perform governance, review, integration glue,
  and checkpoint work only. Do not use a worktree or reuse any historical
  Manager/worker.
- The implementation boundary is `apps/backend/**`, including backend tests,
  thin REST and market-only WebSocket transport mappers, composition,
  readiness/failure projections, and a narrowly necessary example
  configuration. A single root `package-lock.json` update and matching
  `apps/backend/package.json` dependency entry are allowed only if one
  genuinely necessary market-WebSocket server runtime dependency is required;
  no other dependency expansion is allowed.
- Compose the approved public Auth and capability APIs through the backend,
  deriving trusted identity only from the server-side Auth session context.
  Preserve the frozen REST and market-WebSocket contracts and cover the
  existing Auth, market-history, Strategy, Search, Backtesting, Leaderboard,
  News, and local Sentiment surface with correct unauthenticated rejection and
  authenticated cross-owner no-leak behavior. Consume Strategy through the
  public `STRATEGY_FACTORIES` seam; do not deep-import Strategy domain plugins.
- Compose market history and realtime through the approved Binance adapters
  and narrow market-only WebSocket contract, including normalized candles,
  bounded connection/failure state, and `MARKET_OBSERVABILITY_V1`. Compose
  real configured PostgreSQL Auth/application state, the bounded local
  Backtest execution path, application-generated Leaderboard results, and a
  configured real News source with local `LEXICON_V1` sentiment. Fixtures are
  test/development inputs only and must never silently become final/demo
  runtime configuration.
- Keep readiness truthful: liveness is independent; missing required
  persistence/providers yields not-ready; provider failure remains visible;
  News/Sentiment failure does not break core market/strategy/backtest paths;
  mock-only final/demo configuration is rejected.

### Acceptance, validation, prohibitions and stop condition

- Prove the frozen backend contracts and market-only WebSocket behavior with
  Auth/session, 401 and 404 ownership, trusted-identity/spoof-resistance,
  manual Backtest, bounded SearchRun, Candidate/Experiment/Trade,
  application-generated Leaderboard, market history, News/Sentiment,
  readiness, provider-failure, and observability evidence.
- Run backend HTTP/WS integration tests; real process-local PostgreSQL Auth
  and application checks where configured; live Binance historical/realtime
  and a configured real News-source smoke; then build, typecheck, lint, full
  workspace tests, architecture/dependency, source-sidecar, artifact,
  deferred-scope, test-scope, runtime, secret/log, whitespace, and exact-diff
  gates. Every unavailable tool, provider, database, browser, or skipped test
  remains `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Do not change `packages/contracts/**`, any `modules/**` source,
  migrations/schema, `infra/**`, `apps/frontend/**`, architecture,
  requirements, ADRs, OpenSpec artifacts, or unrelated routes. Controllers
  remain thin mappers/delegators; no business logic, general event bus,
  non-market WebSocket, fake-ready status, mock fallback, Redis/BullMQ,
  distributed protocol, live trading, generalized risk, or deferred feature.
  If an essential fix requires an excluded path or contract change, stop at
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and report the exact blocker.
- The Manager may move only `I-01` through `BLOCKED -> READY ->
  IN_PROGRESS -> REVIEW`, and to `DONE` only after all applicable scoped
  evidence passes. Make one coherent commit attempt for the authorized source
  and Manager checkpoint files; if Git denies it, record the exact error and do
  not retry. Stop when I-01 is exhausted and do not start or promote I-02,
  I-03, or any downstream packet.

## Historical INS-105 — HOLD after I-01S acceptance

This signal supersedes `INS-104 / APPROVED_FOR_EXECUTION` after the Instructor's
independent audit of the completed I-01S Manager checkpoint. `I-01S` is
accepted at `DONE`; this signal authorizes no implementation, retry,
replacement, duplicate, downstream packet, extension, or resumed I-01.

### Reviewed checkpoint and acceptance

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `7d574e6` (`feat(strategy): expose public factory
  composition seam`). The parent Instructor integrated exactly the Manager's
  audited six-path source/checkpoint delta after the Manager's one staging
  attempt was denied by the repository `.git/index.lock` permission error.
  The unrelated app-generated `.codex/config.toml` remains untouched,
  unstaged, and untracked.
- The authoritative task board is `41 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). `I-01S` completed exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` under `INS-104`.
- The accepted source boundary is exactly
  `modules/strategy/application/registry.ts`,
  `modules/strategy/api/index.ts`,
  `modules/strategy/api/index.spec.ts`, and
  `modules/strategy/api/composition.spec.ts`; the Manager-owned checkpoint
  delta is in `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. No contract, plugin algorithm,
  persistence, migration, transport, backend, frontend, dependency,
  generated-artifact, or unrelated path changed.
- The Strategy-owned public factory collection reuses the approved four
  baseline registrations followed by `SMC_LITE_V1` and `WYCKOFF_LITE_V1`,
  preserves exact descriptors/profile IDs and factory identity, is immutable,
  and composes successfully through `createStrategyModule` without algorithm
  duplication or backend domain deep imports.
- Independent validation passed focused Strategy `119/119` and the complete
  workspace `verify:stage4a` run: build, typecheck, workspace tests (`389`
  passed), architecture/dependency, artifact/source-sidecar,
  deferred-scope, runtime-smoke, lint, test-scope (`13/13`), secret/log,
  whitespace, and exact-path checks. OpenSpec CLI is `UNVERIFIED`; six
  environment-gated PostgreSQL/integration/E2E tests and real provider,
  browser/demo, and final integration evidence remain `UNVERIFIED` or
  `BLOCKED`, never promoted to `PASS`.
- The `INS-104` Manager and its sole worker Mendel are idle/closed. No
  competing Cryptox Manager, Orchestrator, worker, retry, replacement,
  duplicate, or downstream execution is active.

### Current hold and next safe state

- No implementation is authorized by `INS-105`. `I-01` remains
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` until a fresh signal explicitly resumes
  it; `I-02` and `I-03` remain `BLOCKED`.
- A later Instructor review may authorize only a separately bounded fresh
  `I-01` Manager attempt after verifying that the public `STRATEGY_FACTORIES`
  seam at `7d574e6` resolves the previous composition blocker and that the
  current Git/checkpoint/DAG and active-writer preconditions still hold.

## Historical INS-104 — Strategy public composition seam reconciliation

This signal supersedes `INS-103 / APPROVED_FOR_EXECUTION` after the fresh
Instructor review of its completed Manager checkpoint. It authorizes exactly
one new source-reconciliation packet, `I-01S`, in one fresh same-directory
Manager and exactly one fresh sequential internal worker. `I-01S` is the only
authorized task. It does not authorize resumed I-01, I-02, I-03, any extension
packet, retry, replacement, duplicate, worktree, or downstream execution.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `7d686b6` (`chore(control): record INS-103 I-01
  review blocker`). The tracked tree is clean after that checkpoint commit;
  the only remaining working-tree delta is the untouched app-generated
  untracked `.codex/config.toml`, outside Cryptox scope; it must remain
  untouched, unstaged, and undeleted.
- The current operational board is `40 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). The Manager's checkpoint records the exact
  `I-01` transition `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` and no source
  implementation. The new `I-01S` packet is now durable in `MVP_PLAN.md`; the
  Manager must add and operate its row in `TASKS.md`, the sole operational
  state authority, before execution.
- The completed Strategy packets `C-02`, `S-01`, `S-02`, `S-03`, `S-04`,
  `S-05`, and `S-06` are the verified prerequisites for this seam review.
  `I-01` remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW` until this packet is
  independently accepted and a later signal explicitly resumes it.
- The fresh `INS-103` Manager is idle/closed, its sole worker Socrates is
  complete, and no competing Cryptox Manager, Orchestrator, worker, retry, or
  duplicate is active.

### Exact Manager/worker scope

- Create exactly one fresh sequential internal worker. All bounded Strategy
  implementation work must be delegated under `AGENTS.md`; the Manager may
  perform only governance/checkpoint work and narrow review/integration glue.
- The implementation boundary is `modules/strategy/api/**` and
  `modules/strategy/application/**`, including focused tests, limited to the
  public bootstrap/barrel and the Strategy-owned registry/composition helper
  needed to expose the already approved factories. The Manager may update
  only `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` for
  operational state and checkpoint evidence.
- Expose a typed, immutable public factory collection or equivalent helper
  using the existing `StrategyFactory` contract. It must provide the approved
  baseline registrations and the completed deterministic Lite registrations,
  preserve their exact descriptors/profile identifiers, avoid duplicate
  algorithm implementations, and be consumable by the existing
  `createStrategyModule` bootstrap through a public package entrypoint.
- Preserve the synchronous modular-monolith direction: registry ownership
  stays in Strategy, and backend consumers must not deep-import Strategy
  domain plugins. This is a composition seam for already approved behavior,
  not a new functional or UI requirement.

### Acceptance, validation, prohibitions and stop condition

- Focused public-entrypoint and composition tests must prove deterministic
  registration, exact descriptor/profile preservation, immutability, no
  duplicate algorithm source, and compatibility with the existing Strategy
  bootstrap. No REST or WebSocket contract changes are needed or authorized.
- Run focused Strategy tests, workspace tests, build, typecheck, lint,
  architecture/dependency, source-sidecar, artifact, deferred-scope,
  test-scope, runtime-smoke, secret-log, whitespace, and exact-diff checks.
  OpenSpec CLI or other unavailable checks remain `UNVERIFIED`/`BLOCKED`,
  never `PASS`.
- Do not change `modules/strategy/api/contracts.ts`, plugin algorithm files,
  persistence, migrations, REST/WebSocket contracts, Auth, Backtesting,
  Search, Evaluation, Leaderboard, News, Sentiment, backend composition,
  dependencies, frontend, architecture/requirements/ADR/OpenSpec artifacts,
  or any deferred scope. If the seam requires an excluded path or a contract
  change, stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may transition only `I-01S` through the normal operational
  states and may mark it `DONE` only with complete scoped evidence. Make one
  coherent commit attempt for the authorized source and checkpoint files; if
  Git denies it, record the exact error and do not retry. Stop when `I-01S`
  is exhausted. A later Instructor review must accept it before I-01 can be
  freshly authorized.

## Historical INS-103 — Runtime, transport and observability integration

This signal supersedes `INS-102 / HOLD` after a fresh Instructor review. It
authorizes exactly one new I-01 attempt: one fresh Manager in the canonical
same-directory checkout and one fresh sequential internal worker. I-01 is the
only authorized task; no extension packet, I-02, I-03, retry, replacement,
duplicate, worktree, or downstream execution is authorized.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `9f0841a83da6bd917185d3d692b5c9f27f07cdff`
  (`docs(control): hold after INS-101 AU-02 review`). The tracked tree is
  clean and `git diff --check` is clean. The only working-tree delta is the
  untouched app-generated untracked `.codex/config.toml`, outside Cryptox
  scope; it must remain untouched, unstaged, and undeleted.
- `TASKS.md` is authoritative at `40 DONE`, `0 REVIEW`, and `3 BLOCKED`
  (`I-01`, `I-02`, `I-03`). AU-02 is independently accepted `DONE` in
  `DEC-023`; no task is promoted by this signal before the Manager verifies
  the same state.
- I-01 start dependencies are verified `DONE`: AU-01, AU-02, B-02, M-01,
  M-02, S-02, S-03, Q-01 integration, N-01, N-02, F-01, F-AUTH, and F-02.
  The prior M-02 checkpoint contains public Binance realtime smoke evidence.
- Read-only provider preflight from this environment reached Binance public
  historical data with HTTP 200 and a two-item kline array, and reached the
  CoinDesk public RSS source with HTTP 200 and RSS items. The CoinDesk JSON
  API without an API key returned HTTP 401 and remains unavailable; no secret
  is requested or inferred. I-01 must use an actually configured real source
  and record any unavailable provider as `UNVERIFIED` or `BLOCKED`.
- No competing Cryptox Manager, Orchestrator, or worker is active. The prior
  INS-101 Manager is idle/closed and must not be reused.

### Exact Manager/worker scope

- Create exactly one fresh internal worker and run it sequentially. The
  Manager may perform governance/checkpoint work and narrow integration glue;
  all bounded implementation work with an independent write scope must be
  delegated under `AGENTS.md`.
- The implementation boundary is `apps/backend/**`, including backend tests,
  thin REST/market-WebSocket transport mappers, composition/readiness code,
  and an example configuration if needed. A single root `package-lock.json`
  update and the corresponding `apps/backend/package.json` dependency entry
  are allowed only if one narrowly necessary market-WebSocket server runtime
  dependency is genuinely required; no other dependency expansion is allowed.
- Compose the approved Auth and capability public APIs through the backend,
  derive identity only from the server-side Auth session context, and expose
  the existing frozen REST DTOs/parsers without changing contracts. The
  protected transport must cover the existing Auth, market-history, Strategy,
  Search, Backtesting, Leaderboard, and News client/API surface, with 401 for
  unauthenticated access and 404/no-leak for authenticated cross-owner access.
- Compose market history/realtime through the approved Binance adapters and
  the narrow market-only WebSocket contract, including normalized candles,
  connection/failure state, and `MARKET_OBSERVABILITY_V1`. Compose real
  PostgreSQL application/Auth state, the bounded local Backtest execution
  path, application-generated Leaderboard results, and a configured real News
  source (CoinDesk RSS is an available candidate) with local `LEXICON_V1`
  sentiment. Fixtures may remain test-only and must never silently become the
  final/demo runtime.
- Readiness and failure projections must be truthful: liveness remains
  independent, readiness does not report `ready` for missing required real
  providers or persistence, provider failures remain visible, and News /
  Sentiment failure does not break core market/strategy/backtest paths. The
  final/demo preflight must reject mock-only required configuration.

### Acceptance, validation, prohibitions and stop condition

- I-01 may become `DONE` only after the composed backend serves the frozen
  REST contracts and market-only WebSocket, passes Auth/session, 401/404
  ownership, trusted-identity/spoof-resistance, one manual Backtest, one
  bounded SearchRun, Candidate/Experiment/Trade, Leaderboard, market history,
  News/Sentiment, readiness, provider-failure, and observability evidence.
- Run backend HTTP/WS integration tests, real process-local PostgreSQL Auth
  and application checks where configured, live Binance historical/realtime
  and real News-source smoke where available, then build, typecheck, lint,
  all workspace tests, architecture/dependency, source-sidecar,
  deferred-scope, test-scope, runtime, secret-log, whitespace, and
  exact-diff gates. Every skip or unavailable tool/provider is
  `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Controllers must remain thin mappers/delegators; no business logic may be
  placed in controllers. Do not change `packages/contracts/**`, any module
  source under `modules/**`, migrations or database schema, `infra/**`,
  `apps/frontend/**`, architecture/requirements/ADR/OpenSpec artifacts, or
  any unrelated route. If an essential fix requires an excluded path, stop
  with `NEEDS_INSTRUCTOR_REVIEW` and leave I-01 at `REVIEW`/`BLOCKED`.
- Do not add a general event bus, non-market WebSocket, fake-ready status,
  mock fallback in final configuration, Redis/BullMQ/worker topology, live
  trading, deferred feature, contract drift, or frontend business logic.
- The Manager may transition only I-01 through `BLOCKED -> READY ->
  IN_PROGRESS -> REVIEW` and to `DONE` only when every gate passes. Make one
  coherent commit attempt for the authorized implementation and Manager
  checkpoint files; if Git denies it, record the exact error and do not retry.
  Stop when I-01 is exhausted and do not start or promote I-02/I-03.

## Historical INS-102 — Independent review after INS-101 AU-02 completion

This signal replaces `INS-101 / APPROVED_FOR_EXECUTION` after the Instructor's
independent review. It is a checkpoint only and authorizes no implementation,
retry, replacement, duplicate Manager/worker, or downstream packet.

### Reviewed checkpoint and acceptance

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at
  `422d47fad516f0e57930f91e3da88b22cb726183` (`fix(search): close AU-02
  ownership integration`). The commit contains exactly the five tracked paths
  produced by the INS-101 Manager: the three Search source/test paths and the
  Manager-owned `TASKS.md` and `HANDOFF.md`.
- The Instructor independently reviewed the source diff, the Search lifecycle
  regression, the real PostgreSQL integration, the ownership matrix, task
  transitions, and the Manager's exact one-commit boundary. No source,
  business-state, task-DAG, generated-artifact, or out-of-scope drift was
  found. `git diff --check` is clean.
- AU-02 is accepted as `DONE`. Its recorded transition is exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW -> DONE`. The board is now
  `40 DONE`, `0 REVIEW`, and `3 BLOCKED` (`I-01`, `I-02`, `I-03`).
- The fresh INS-101 Manager and its sole internal worker are idle/closed. No
  Cryptox Manager, Orchestrator, worker, retry, replacement, duplicate, or
  downstream packet is active.

### Independent validation

- **PASS:** Search application regression `13/13`.
- **PASS:** Real PostgreSQL Search integration `1/1`, including SearchRun
  persistence, Search -> Backtesting -> Leaderboard execution,
  `completedCandidateCount = 1`, and owner A/B isolation.
- **PASS:** Real PostgreSQL Auth integration `3/3` and backend Auth E2E `1/1`.
- **PASS:** Serial `npm run verify:stage4a`: build, typecheck, workspace tests
  (`386` passed with `6` environment-gated skips), architecture/dependency,
  source-sidecar, deferred-scope, and backend runtime smoke gates. Lint,
  test-scope check, secret-log review, exact changed-path review, and
  whitespace checks also pass.
- **UNVERIFIED:** Docker daemon/Compose and standalone `psql`; direct
  process-local Node PostgreSQL checks and application integrations were used.
- **UNVERIFIED:** OpenSpec CLI and local PDF text extraction because the host
  tools are unavailable. No requirement was inferred from either missing tool.
- The only remaining working-tree delta is the untouched app-generated
  untracked `.codex/config.toml`; it is outside Cryptox scope and must remain
  untouched, unstaged, and undeleted.

### HOLD boundary

- This `HOLD` authorizes no implementation. `I-01`, `I-02`, and `I-03` remain
  `BLOCKED`; completion of AU-02 does not automatically promote or start any
  downstream packet.
- A future authorization may review and, if all dependencies and evidence are
  still valid, authorize the next bounded packet from the repository plan.

## Historical INS-101 — AU-02 Search remediation and ownership matrix completion

This signal supersedes `INS-100 / HOLD` at `9d2d6d9` after a fresh Instructor
review. It authorizes exactly one new bounded AU-02 remediation/completion
attempt: exactly one fresh Manager and exactly one fresh internal worker. This
is an explicit new authorization after a concrete failure was identified, not
an automatic retry of `INS-099`; no duplicate, replacement, second worker,
downstream packet, or I-01/I-02/I-03 work is authorized.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `9d2d6d9` (`docs(control): hold after INS-099 AU-02
  review`). The tracked tree has no source, business-state, or task-DAG drift.
  The only working-tree delta is the app-generated untracked
  `.codex/config.toml`; it is outside Cryptox scope and must remain untouched,
  unstaged, and undeleted.
- `TASKS.md` is authoritative at `39 DONE`, `1 REVIEW` (`AU-02`), and
  `3 BLOCKED` (`I-01`, `I-02`, `I-03`). AU-02's prior transition was exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; no other task state changes are
  part of this authorization.
- AU-02 dependencies AU-01, D-01, S-01, L-01, B-02, Q-01 real integration,
  and F-AUTH are recorded `DONE`. I-01/I-02/I-03 remain blocked and are not
  authorized. No Cryptox Manager, Orchestrator, or worker is active.
- The concrete blocker is the real Search integration at
  `modules/search/application/integration.spec.ts:377`: PostgreSQL was
  reached, but `completedCandidateCount` was `0` instead of `1`. Real Auth
  PostgreSQL integration passed `3/3`; no source/test change was made by
  `INS-099`.
- Fresh redacted process-local Node `pg` checks pass against the documented
  `cryptox_development` (`55432`) and `cryptox_test` (`55433`) databases using
  `infra/db/local.env` without exposing its password. Docker daemon/Compose
  and standalone `psql` remain `UNVERIFIED`; no elevation, install, secret
  request, credential change, or volume reset is allowed.

### Exact Manager/worker scope

- Create exactly one fresh internal worker and run it sequentially. The worker
  may diagnose and fix the concrete Search integration lifecycle defect and
  add the complete AU-02 cross-module ownership/security evidence under only
  `modules/auth/**`, `modules/strategy/**`, `modules/search/**`,
  `modules/backtesting/**`, `modules/leaderboard/**`, and
  `apps/backend/src/**`.
- Use public module APIs across boundaries. The worker must cover Strategy
  Definition/Composite Definition, SearchRun/Candidate, Experiment/Trade, and
  Leaderboard Scope/Entry, including unauthenticated rejection, cross-user
  404/no-leak, same-owner success, trusted server identity, spoof resistance,
  SearchRun-to-Candidate propagation, same-owner admission, cross-owner
  rejection, approved shared-data visibility, and sensitive-log absence.
- The Search failure must be diagnosed from the implementation; do not weaken
  assertions, merely increase a timeout, make a test pass by changing the
  expected count, or replace real PostgreSQL evidence with fixtures. Preserve
  Auth independence for pure Strategy, Backtest, Evaluation, and ranking
  calculations.
- Contracts (including `packages/contracts/**`), migrations, dependencies,
  generated artifacts, News, Market Data, frontend, unrelated backend routes,
  architecture/data-model/policy files, pure algorithms, and every other
  packet are forbidden. If an essential fix requires an excluded path, stop
  with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, may transition only AU-02 through
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW` (and `DONE` only if every gate
  passes), and must independently review the worker diff. The worker may not
  edit control files, stage, or commit.

### Acceptance, validation, and stop condition

- AU-02 may become `DONE` only when the full resource-by-resource two-user
  matrix passes and the real Auth/Search/PostgreSQL path passes, including the
  SearchRun -> Candidate -> Backtesting -> Leaderboard flow and the concrete
  candidate completion invariant. Fixture-only or isolated package evidence
  cannot close the packet.
- Run focused changed-package tests, the real Auth/Search integration where
  configured, typecheck, build, lint, architecture/dependency,
  generated-artifact, deferred-scope, test-scope, runtime, whitespace, and
  exact-diff gates. Record every result as `PASS`, `BLOCKED`, or `UNVERIFIED`;
  skipped or unavailable checks are never PASS. Docker/Compose, standalone
  `psql`, and OpenSpec CLI remain explicitly `UNVERIFIED` if unavailable.
- Make one coherent Manager staging/commit attempt for the reviewed source/
  test changes and the two Manager-owned checkpoint files. If Git denies it,
  record the exact error and do not retry. Stop when this authorization is
  exhausted; do not start, promote, retry, replace, or duplicate any other
  work.

## Historical INS-100 — HOLD after INS-099 AU-02 completion attempt

This was the Instructor checkpoint after `INS-099 / APPROVED_FOR_EXECUTION`
was exhausted and was not an active authorization. The exact Manager checkpoint
was persisted at `49ca52e` after the Manager's one staging attempt was denied;
that commit contains only the Manager-produced `TASKS.md` and `HANDOFF.md`
content and no feature implementation.

### Independent review and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `49ca52e`. The tracked working tree has no source,
  business-state, or task-DAG drift. The only remaining working-tree delta is
  the app-generated untracked `.codex/config.toml`, which is outside Cryptox
  scope and remains untouched, unstaged, and undeleted.
- `TASKS.md` remains authoritative at `39 DONE`, `1 REVIEW` (`AU-02`), and
  `3 BLOCKED` (`I-01`, `I-02`, `I-03`). AU-02 recorded exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; no other task moved.
- The fresh INS-099 Manager and sole worker Dirac are idle/closed. Independent
  task inspection found no active Cryptox Manager, Orchestrator, or worker, no
  duplicate, and no competing writer.
- The Manager's source/diff review found no changed source or test path. The
  current checkpoint therefore proves neither a new ownership implementation
  nor the complete AU-02 matrix.

### Review result and validation

- Real Auth PostgreSQL integration passed `3/3` against the documented local
  `cryptox_development` database. The redacted process-local `pg` connectivity
  checks passed for both documented database names and ports.
- Real Search integration reached PostgreSQL but failed at
  `modules/search/application/integration.spec.ts:377` because
  `completedCandidateCount` was `0` instead of `1`. This is a concrete
  `BLOCKED` result, not a PASS; no source fix or test retry was authorized.
- The complete resource-by-resource two-user A/B matrix remains
  `UNVERIFIED`, including cross-module Strategy/Composite, SearchRun/Candidate,
  Experiment/Trade, Leaderboard admission/ranking, spoof resistance, and
  shared-data visibility. Existing isolated package tests are retained as
  partial evidence only.
- Workspace build/typecheck/tests, architecture/artifact/deferred-scope and
  runtime smoke, lint, scope tests `13/13`, sensitive-log review, and diff
  checks passed (`385` tests with `6` environment-gated skips). Those skips do
  not substitute for AU-02 acceptance. Docker daemon/Compose, standalone
  `psql`, and OpenSpec CLI remain `UNVERIFIED`.
- The Manager's single staging/commit attempt failed with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock':
  Permission denied`; it did not retry. The parent persisted the exact
  Manager checkpoint once at `49ca52e`, without changing its content.

### HOLD boundary

- AU-02 is not accepted as `DONE`. No retry, replacement, duplicate, worker,
  downstream packet, or I-01/I-02/I-03 work is authorized by this HOLD.
- A future authorization may address the concrete Search integration failure
  and the missing matrix only after a fresh Instructor review verifies the
  current Git checkpoint, task DAG, environment, and safe write scope. It must
  be a new explicit signal, not an automatic continuation of INS-099.

## Historical INS-099 — AU-02 Completion Ownership Matrix

This signal superseded `INS-098 / HOLD` at `8e73cb9` and was issued
after a fresh Instructor review found that the previously blocked host database
premise has changed. It authorizes exactly one fresh Manager and exactly one
fresh internal worker for one bounded AU-02 completion attempt. This is an
explicit new authorization after verified environment recovery, not an
automatic retry; no duplicate, replacement, second worker, or downstream work
is authorized.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, at `8e73cb9` (`docs(control): hold after AU-02
  attempt`). There is no tracked source, business-state, or control-plane
  drift. The only working-tree delta is the 33-byte app-generated
  `.codex/config.toml` (`model_reasoning_summary = "auto"`), which is outside
  Cryptox scope and must remain untouched, unstaged, and undeleted.
- `TASKS.md` is authoritative at `39 DONE`, `1 REVIEW` (`AU-02`), and
  `3 BLOCKED` (`I-01`, `I-02`, `I-03`). The previous AU-02 attempt under
  `INS-097` produced no source/test changes and was closed in `REVIEW` under
  `INS-098`; no other task was changed.
- AU-02 dependencies `AU-01`, `D-01`, `S-01`, `L-01`, `B-02`, Q-01 real
  integration, and F-AUTH are recorded `DONE`. I-01, I-02, and I-03 remain
  blocked and are not authorized here.
- Read-only environment revalidation found the local containers
  `cryptox-local-postgres-dev-1` and `cryptox-local-postgres-test-1` healthy,
  with ports `55432` and `55433` open. Using the documented
  `CRYPTOX_LOCAL_POSTGRES_PASSWORD` from `infra/db/local.env` without printing
  its value, host `pg` connections and `SELECT current_database()` succeeded
  for `cryptox_development` and `cryptox_test`. This restores the documented
  application-level PostgreSQL connectivity gate. The Docker Compose plugin
  itself remains unavailable and must stay `UNVERIFIED`; no credential change,
  extraction, volume reset, install, cloud database, or secret request is
  allowed.
- No competing Cryptox Manager or worker is active. The fresh Manager must use
  the same canonical checkout, model `gpt-5.6-luna`, and reasoning `max`, with
  no worktree, alternate checkout, branch, cloud task, or historical Manager.

### Exact Manager and worker scope

- Create exactly one fresh internal worker/subagent. The worker may edit only
  cross-module AU-02 ownership/security integration tests and narrowly
  necessary owner-scoped fixes under `modules/auth/**`, `modules/strategy/**`,
  `modules/search/**`, `modules/backtesting/**`, `modules/leaderboard/**`, and
  `apps/backend/src/**`.
- Canonical contracts, `packages/contracts/**`, migrations, dependencies,
  generated artifacts, News, Market Data, frontend, unrelated backend routes,
  architecture policy, pure algorithms, and I-01/I-02/I-03 or any other
  packet are excluded. If an essential change falls outside the allowed paths,
  stop and report `NEEDS_INSTRUCTOR_REVIEW`.
- Use public module APIs at cross-module boundaries and preserve Auth
  independence for pure Strategy, Backtest, Evaluation, and ranking
  calculations. Do not add enterprise identity, tenant/RBAC, JWT/refresh
  tokens, queues/distributed infrastructure, general risk, live trading, or
  sensitive logging.
- The Manager may update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, may transition only AU-02 through the
  normal operational states (including the explicit `REVIEW → READY` reopen
  for this fresh authorization), and must review the worker diff before
  integration. No Manager-side feature implementation or control-file edit is
  permitted.

### Acceptance and validation

- Prove the complete resource-by-resource A/B matrix: unauthenticated 401;
  cross-user 404/no-leak and same-owner success for applicable read, update,
  delete, cancel, list, submit, and rank operations; trusted server-derived
  identity; client `userId`/`ownerUserId` spoof resistance; SearchRun to
  Candidate owner propagation; same-owner Leaderboard admission and
  cross-owner rejection; approved shared-data visibility; and no password,
  raw credential, cookie, session-token, token-digest, or credential logging.
- Required evidence must cover the real host PostgreSQL/Auth/Search path now
  available, not only fixtures or in-memory adapters. AU-02 may be marked
  `DONE` only when the full matrix and applicable integration evidence pass.
- Run focused tests, affected package tests, typecheck, build, lint,
  architecture/dependency, generated-artifact, deferred-scope, test-scope,
  whitespace, exact-diff, and relevant global gates. Docker Compose/OpenSpec
  CLI and any unavailable external check remain `BLOCKED`/`UNVERIFIED`.
- Do not start or promote I-01, I-02, I-03, any downstream/deferred packet, or
  any retry/replacement/duplicate. Make one coherent Manager checkpoint
  staging/commit attempt only; if Git denies it, report the exact error and do
  not retry. Stop after this authorization is exhausted.

## Historical INS-098 — HOLD after AU-02 ownership-integration attempt

This historical signal superseded `INS-097 / APPROVED_FOR_EXECUTION` at
`7febd0f`. The exact Manager checkpoint is independently audited and persisted
at `6f83d3c`. This HOLD authorizes no worker, retry, replacement, downstream
packet, or final-MVP claim.

### Reviewed checkpoint and result

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, with the tracked repository state at `6f83d3c`
  (`docs(control): record AU-02 review checkpoint`). The only current
  untracked delta is the 33-byte app-generated `.codex/config.toml`
  (`model_reasoning_summary = "auto"`); it is outside Cryptox scope and
  remains untouched, unstaged, and undeleted. No source, business-state, or
  task-DAG drift is present.
- `TASKS.md` remains the sole operational authority and records `39 DONE`,
  `1 REVIEW` (`AU-02`), and `3 BLOCKED` (`I-01`, `I-02`, `I-03`). The Manager
  correctly recorded `BLOCKED → READY → IN_PROGRESS → REVIEW` for AU-02 and
  changed no other task state.
- Fresh Manager `01a05289-9805-72a3-b811-fda8a7d89eed` used the required
  same-directory checkout and `gpt-5.6-luna / max`. Bacon
  `01a0528f-4f6b-7ee3-be7f-5787c2b40005` was the sole internal worker. The
  worker returned no changed paths, no source/test implementation, and no
  commit; no replacement, duplicate, or retry occurred. Both are now idle or
  completed, with no active Cryptox Manager/worker remaining.
- Parent Instructor audit confirms the Manager diff contains only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`, and
  the Manager's single staging/commit attempt was denied by `.git/index.lock`
  permission. The exact checkpoint was then committed once by the parent;
  there was no Manager commit retry.

### Acceptance decision and blockers

- AU-02 is **not accepted as DONE**. Existing per-module/fixture evidence
  passes, but the required complete two-user cross-module A/B matrix and
  applicable real PostgreSQL/Auth/Search integration are not proven. The
  documented host database credential failed authentication and Docker
  Compose is unavailable; these remain `BLOCKED`/`UNVERIFIED`, never PASS.
- Independent validation remains truthful: workspace build/typecheck/tests,
  architecture/artifact/deferred-scope/runtime checks, lint, scope `13/13`,
  and `git diff --check` passed; environment-gated tests and unavailable
  OpenSpec CLI remain `UNVERIFIED` or `BLOCKED`. These gates do not substitute
  for AU-02 acceptance.
- No authorization is active. I-01, I-02, and I-03 remain blocked by the
  task DAG; no downstream work may start. A future authorization requires a
  fresh Instructor review of the missing matrix and real integration gate and
  must not treat this exhausted attempt as a retry permission.

## Historical INS-097 — AU-02 Per-User Ownership Security Integration

This historical signal superseded `INS-096 / HOLD` at `389db3b` and authorized
exactly one fresh Manager and exactly one internal worker for a bounded AU-02
implementation-and-evidence attempt. It is the fresh attempt permitted by
`DEC-018`; it does not authorize I-01, I-02, I-03, any downstream packet, or an
automatic retry.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, with the reviewed repository state clean at `389db3b`
  (`docs(control): hold after M-02 closure`). The M-02 closure is independently
  persisted at `4ba6f8a`; no source, business-state, or task-DAG drift is
  present. The only current untracked delta is the 33-byte app-generated
  `.codex/config.toml` (`model_reasoning_summary = "auto"`); it is outside the
  Cryptox change, is preserved untouched, and must not be staged or deleted.
- `TASKS.md` is authoritative at `39 DONE`, `0 REVIEW`, and `4 BLOCKED`:
  `AU-02`, `I-01`, `I-02`, and `I-03`. AU-02 is the only predecessor that can
  unlock the remaining integration chain; its prior INS-021 attempt produced
  no accepted ownership matrix and correctly stopped at
  `NEEDS_HUMAN_DECISION`.
- AU-02 start dependencies `AU-01`, `D-01`, `S-01`, `L-01`, `B-02`, and the
  real Q-01 integration are `DONE`; F-AUTH is also `DONE`. I-01, I-02, and I-03
  remain blocked and are not authorized here.
- Local PostgreSQL containers `cryptox-local-postgres-dev-1` and
  `cryptox-local-postgres-test-1` were observed healthy through the Docker
  daemon and accepted read-only `pg_isready`/`psql` checks internally.
  Application access through the documented host credential in
  `infra/db/local.env` is currently `UNVERIFIED` because authentication failed;
  Docker Compose plugin access is unavailable. This is an explicit validation
  risk, not permission to change credentials, reset volumes, request secrets,
  or use a cloud database.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning `max`,
  without a worktree, alternate checkout, branch, cloud task, or duplicate.

### Exact Manager and worker scope

- Create exactly one fresh internal worker. The worker owns the single
  disjoint AU-02 implementation scope: cross-module ownership/security tests
  and narrowly necessary owner-scoped fixes only under
  `modules/auth/**`, `modules/strategy/**`, `modules/search/**`,
  `modules/backtesting/**`, `modules/leaderboard/**`, and `apps/backend/src/**`.
  Canonical contracts, migrations, dependencies, generated artifacts, News,
  Market Data, frontend, unrelated backend routes, and architecture policy are
  excluded. If a change outside this scope is necessary, stop for Instructor
  review.
- The worker must implement/prove the resource-by-resource A/B matrix:
  unauthenticated rejection; cross-user 404/no-leak for read, update, delete,
  cancel, list, submit, and rank where applicable; same-owner success; trusted
  server identity; client `userId`/`ownerUserId` spoof resistance; Search
  Candidate owner propagation; same-owner Leaderboard admission; shared-data
  visibility; and absence of password, cookie, token, digest, or credential
  logs. It must use public module boundaries and preserve pure calculations'
  Auth independence.
- The Manager may update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, may move only AU-02 through the normal
  operational states, and must review the worker diff before integration.
  No Manager-side feature implementation is permitted. The Manager must not
  edit Instructor/decision/requirements/ADR/OpenSpec files or start/promote
  I-01, I-02, I-03, or any other packet.

### Acceptance and validation

- AU-02 may be marked `DONE` only when the complete A/B isolation matrix and
  trusted-identity evidence pass at the approved boundary, including the
  applicable PostgreSQL/Auth/Search integration. Fixture-only or in-memory
  evidence cannot close this packet.
- Run focused worker tests, affected package tests, typecheck/build/lint,
  architecture/artifact/deferred-scope/scope checks, `git diff --check`, and
  the relevant global gate. Unavailable Docker Compose, PostgreSQL application
  access, OpenSpec CLI, or other external checks must remain
  `BLOCKED`/`UNVERIFIED`, never PASS.
- The current host database credential failure may be diagnosed and recorded
  only. Do not extract credentials from container metadata, alter database
  passwords, reset volumes, install software, or broaden environment scope.
  If the required real DB gate cannot run, preserve AU-02 as `BLOCKED` or
  `REVIEW` with the exact limitation and list the remaining evidence.
- Preserve every unrelated task state, record exact changed paths/evidence and
  the worker/Manager identities, make at most one coherent Manager checkpoint
  staging/commit attempt, and stop when AU-02 is exhausted. No retry,
  replacement, duplicate, or downstream start is allowed.

## Historical INS-096 — HOLD after INS-095 M-02 evidence closure

This current signal supersedes `INS-095 / APPROVED_FOR_EXECUTION` at
`9127700`. The bounded M-02 review is complete and was independently audited
and persisted at `4ba6f8a`.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `4ba6f8a` (`docs(control): record M-02
  evidence closure`). No source or business-state drift is present.
- `TASKS.md` remains the sole operational-state authority and records `39 DONE`,
  `0 REVIEW`, and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). M-02 moved
  only from `REVIEW` to `DONE`; no downstream task was started or promoted.
- The M-02 source checkpoint remains `5160c1c`. The Manager's focused realtime
  suite, package/global gates, scope checks, and runtime smoke passed. The one
  bounded public Binance smoke connected, delivered a normalized BTCUSDT tick,
  and shut down cleanly. This closes M-02's packet boundary only; it does not
  claim final runtime, integration, or demo completion.
- The INS-095 Manager is idle. No Cryptox Manager or worker is active, and the
  temporary PDF-review render artifacts were removed without entering Git.
- `DEC-018` records the explicit user governance direction to continue the MVP
  loop autonomously. It permits the Instructor to consider one fresh bounded
  AU-02 authorization after revalidating dependencies and environment; it does
  not itself start AU-02, change requirements, relax deferred scope, or permit
  automatic retries.

### Current boundary and next review

- This HOLD authorizes nothing: no worker, AU-02, I-01, I-02, I-03, downstream
  promotion, source change, or final-demo claim.
- The next Instructor review must verify the local PostgreSQL/Auth environment,
  the AU-02 dependency chain, exact disjoint write scope, Git cleanliness, and
  absence of active Manager/worker tasks before issuing a separate signal.
  If those checks are not satisfied, preserve `NEEDS_HUMAN_DECISION` or
  `BLOCKED` honestly; do not convert fixture-only evidence into PASS.

## Historical INS-095 — M-02 Realtime Evidence Closure Review

This current signal supersedes `INS-094 / HOLD` at `8556c43` and authorizes
exactly one fresh Manager for a bounded M-02 review/evidence attempt. It is an
evidence-only authorization: no source rework is permitted, and no downstream
task may start.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `8556c43` (`docs(control): hold after F-03
  closure`). F-03 is accepted at its packet-local boundary in `b73d014`; the
  current operational board is `38 DONE`, `1 REVIEW` (`M-02`), and `4 BLOCKED`
  (`AU-02`, `I-01`, `I-02`, `I-03`).
- M-02 is the only current REVIEW task. Its existing implementation checkpoint
  is `5160c1c`; focused resilience and package evidence are recorded PASS, but
  the required real Binance realtime smoke remains `UNVERIFIED` after the
  prior bounded attempt. M-01 and F-01 dependencies are DONE; I-01 remains a
  later integration dependency.
- The source, contracts, architecture, and market-data spec require normalized
  market-only realtime delivery, bounded reconnect/gap behavior, and truthful
  real-provider final/demo evidence. Fixture evidence alone must not promote
  M-02 past its current review state.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning `max`,
  without a worktree, alternate checkout, branch, cloud task, or duplicate.

### Exact Manager-only scope

- The Manager may inspect the current M-02 source/tests and run the focused
  resilience suite, applicable package/global checks, and one bounded live
  Binance WebSocket smoke using the existing configured provider boundary.
  Public Binance access only; no secrets or credentials may be requested or
  logged.
- No source, test, contract, module, frontend, backend, migration, provider,
  configuration, dependency, or generated-file change is authorized. No worker
  is authorized because this packet has no independent write scope; the
  Manager owns review and the two control artifacts.
- The Manager may update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. It may transition M-02 only when the
  packet-local implementation/recovery evidence and the live smoke are both
  genuinely evidenced; otherwise it must retain `REVIEW` and record
  `UNVERIFIED` or `BLOCKED` with the exact observed limitation. It must not
  convert fixture tests or a failed/absent provider connection into PASS.
- The checkpoint must preserve all other task states, record the exact live
  attempt/transcript and provider outcome, and stop before AU-02, I-01, I-02,
  I-03, or any downstream work. Make at most one coherent checkpoint
  staging/commit attempt; on Git rejection, do not retry and report the exact
  error.

## Historical INS-094 — HOLD after F-03 closure review

This current signal supersedes `INS-093 / APPROVED_FOR_EXECUTION` and grants no
execution authority. The F-03 checkpoint reconciliation was independently
audited and committed at `b73d014`.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `b73d014` (`docs(control): reconcile F-03
  checkpoint state`). The only INS-093 delta was the Manager-owned
  `TASKS.md`/`HANDOFF.md` reconciliation; no source or business-state drift
  was present.
- `TASKS.md` is now internally consistent: F-03 is `DONE` at its approved
  packet-local frontend projection boundary, and the board is `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`).
  No other task moved and no downstream packet started.
- F-03 evidence is accepted only for its local scope: focused 3/3, frontend and
  root suites/static checks recorded PASS, runtime smoke is limited, Docker/
  PostgreSQL is `BLOCKED`, and OpenSpec CLI, live providers, real feature
  transport, and browser/demo evidence remain `UNVERIFIED` or `BLOCKED`.
  Final MVP/integration/demo completion is not claimed.
- The INS-093 Manager is idle, created no worker, and made no source change.
  Its single Git attempt was denied before staging; the Instructor preserved
  and audited the exact two-file result in `b73d014` without retrying the
  Manager.

### Current boundary

- This HOLD authorizes nothing: no worker, implementation packet, M-02, AU-02,
  I-01, I-02, I-03, downstream promotion, or final-demo claim.
- The next review must independently inspect M-02's current checkpoint and
  determine whether a separate bounded review/closure authorization is safe.
  M-02 must not start merely because its state is `REVIEW`; no live-provider
  evidence may be silently promoted to PASS.

## Historical INS-093 — F-03 Checkpoint Consistency Reconciliation

This current signal supersedes `INS-092 / HOLD` at `b50f8db` and authorizes
exactly one fresh governance-only Manager. It authorizes no worker, source
implementation, retry, replacement, duplicate, downstream packet, or change
to any task other than reconciling the already-recorded F-03 checkpoint.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `b50f8db` (`docs(control): hold for F-03
  checkpoint consistency`). The audited F-03 source/test implementation remains
  committed at `6a4e86e`; the INS-091 Manager checkpoint is preserved at
  `9ed13bc`.
- The top `TASKS.md` table records F-03 as `DONE` and the board as `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). The
  current “State derivation at this checkpoint” paragraph still says F-03 is
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`. This is a control-plane inconsistency,
  not permission to start downstream work.
- The packet-local evidence and its limitations are already independently
  reviewed: focused F-03 3/3, frontend/root suites and static checks pass;
  Docker/PostgreSQL is `BLOCKED`; OpenSpec CLI, live providers, real feature
  REST/market-WebSocket composition, and browser/demo evidence remain
  `UNVERIFIED` or `BLOCKED`.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning `max`,
  without a worktree, alternate checkout, branch, cloud task, or worker.

### Exact Manager-only scope

- The Manager may read the full repository authority, INS-091 checkpoint, and
  current task DAG, then edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`.
- It must reconcile every current F-03 state statement in both files to one
  consistent result. If the approved packet-local evidence is accepted, F-03
  may remain `DONE` and all current summaries/derivation text must agree; the
  handoff must explicitly record source checkpoint `6a4e86e`, the INS-091
  Manager commit denial, and that no retry occurred. If consistency or packet
  acceptance cannot be proven, it must set/retain F-03 as `REVIEW` and report
  `NEEDS_INSTRUCTOR_REVIEW` rather than claiming closure.
- It must not edit `INSTRUCTOR.md` or `DECISIONS.md`, source/contracts/modules/
  backend/migrations/providers, requirements/ADRs/OpenSpec policy, or any
  other task state. It must not start M-02, AU-02, I-01, I-02, I-03, or any
  downstream work. No worker, retry, replacement, duplicate, or implementation
  expansion is authorized.
- It must make at most one coherent staging/commit attempt for these two files.
  If Git rejects it, it must not retry and must report the exact error, then
  stop after the checkpoint reconciliation.

## Historical INS-092 — HOLD after INS-091 checkpoint consistency review

This current signal supersedes `INS-091 / APPROVED_FOR_EXECUTION` and grants no
execution authority. The INS-091 Manager checkpoint was preserved in commit
`9ed13bc` after its single staging/commit attempt was denied by the Git
environment, but F-03 closure is not accepted yet because `TASKS.md` contains
an internal state contradiction.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, with the exact INS-091 Manager-owned delta recorded in
  `9ed13bc` (`docs(control): record INS-091 F-03 closure checkpoint`). No source
  or business-state drift was introduced by that commit.
- The top operational table records F-03 as `DONE` and the board as `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`).
  However, the current `TASKS.md` “State derivation at this checkpoint” still
  says that F-03 remains `REVIEW` and requires `NEEDS_INSTRUCTOR_REVIEW`.
  Until those duplicated statements are reconciled by the Manager, the
  operational board is inconsistent and F-03 is not accepted as DONE.
- The INS-091 focused evidence remains packet-local and valid: F-03 tests
  3/3, frontend/root suites and static checks pass, while Docker/PostgreSQL is
  `BLOCKED` and OpenSpec/live-provider/feature-transport/browser-demo evidence
  remains `UNVERIFIED` or `BLOCKED`. These limitations do not authorize final
  integration or downstream work.
- The INS-091 Manager is idle and made no source change or worker dispatch.
  Its sole commit attempt failed before staging with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock':
  Permission denied`; no retry was made.

### Current boundary

- This HOLD authorizes nothing: no worker, implementation packet, F-03 retry,
  M-02, AU-02, I-01, I-02, I-03, downstream promotion, or duplicate Manager.
- A separate fresh governance-only Manager may be authorized to reconcile the
  contradictory F-03 state language in `TASKS.md` and the corresponding
  `HANDOFF.md` checkpoint to the already audited `6a4e86e` source boundary.
  That Manager must edit only those two Manager-owned files, create no worker,
  perform no source implementation, and stop after one commit attempt.

## Historical INS-091 — F-03 Packet Closure and Checkpoint Reconciliation

This current signal supersedes `INS-090 / HOLD` and authorizes exactly one fresh
Manager for a governance-only F-03 closure review. It authorizes no worker and no
source implementation: the bounded screen implementation was already audited
and committed at `6a4e86e`.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at the immediately preceding HOLD commit
  `1926142` (`docs(control): hold after F-03 review`). The F-03 source/test
  implementation is committed at `6a4e86e`; the current Manager-owned
  `TASKS.md`/`HANDOFF.md` records still describe that delta as uncommitted from
  the older starting HEAD and therefore require reconciliation.
- The board is authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and
  `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03 is `REVIEW` and its
  dependencies `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`,
  and `L-02` are `DONE`. M-02 and all blocked tasks remain outside this signal.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning
  `max`, without a worktree, alternate checkout, branch, cloud task, or worker.

### Exact Manager-only scope

- The Manager may read and independently verify the current authority, the
  committed F-03 source/test diff, the prior INS-089 evidence, and the current
  task DAG. It may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`.
- It must reconcile both files to committed source checkpoint `6a4e86e`, current
  HOLD/authorization history, exact worker and Manager identities, and the
  independently verified validation classifications. It may transition only
  F-03 from `REVIEW` to `DONE` if the approved packet boundary is fully
  evidenced; otherwise it must leave F-03 in `REVIEW` and report
  `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager must not create a worker, edit source/contracts/modules/backend/
  migrations/providers/manifests, change requirements/ADR/OpenSpec policy,
  change any other task state, update `INSTRUCTOR.md`/`DECISIONS.md`, or start
  M-02, AU-02, I-01, I-02, I-03, or any downstream work. No retry, replacement,
  duplicate, or implementation expansion is authorized.
- The Manager must preserve the distinction between packet-local PASS evidence
  and final integration evidence: Docker/PostgreSQL is `BLOCKED`; OpenSpec CLI,
  live providers, real feature REST/market-WebSocket composition, and
  browser/demo evidence are `UNVERIFIED` or `BLOCKED`, never PASS. Closure of
  F-03 does not close `CSL-R-RD-01`, final demo acceptance, I-03, I-01, AU-02,
  or I-02.
- The Manager must record the stop boundary and make at most one coherent
  checkpoint commit attempt. If Git rejects it, it must not retry and must
  report the exact error for Instructor audit. It must stop after the F-03
  reconciliation/closure decision.

## Historical INS-090 — Post-INS-089 F-03 Review HOLD

This current signal supersedes `INS-089 / APPROVED_FOR_EXECUTION`. It records the
Instructor review after the bounded F-03 screen projection run and grants no
execution authority while the Manager-owned checkpoint is reconciled.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `6a4e86e` (`feat(frontend): complete F-03
  screen projections`). The commit contains exactly the two authorized screen
  paths and the Manager-owned `TASKS.md`/`HANDOFF.md` checkpoint records.
- The fresh INS-089 Manager completed with exactly one internal Frontend worker
  (Darwin); both are inactive/closed. No competing Cryptox Manager or worker is
  active, and no retry, replacement, duplicate, worktree, branch, or downstream
  task was started.
- F-03 remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW` in the operational board until
  a fresh Manager reconciles the checkpoint to `6a4e86e` and, if the packet
  boundary is satisfied, performs the sole authorized `REVIEW -> DONE` state
  transition. The board is `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and `4
  BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`).

### Independent evidence review

- **PASS:** F-03 focused screen tests 3/3; Frontend 33/33; root tests 385 pass
  with 6 environment-gated skips; root/Frontend typecheck, build, and lint;
  architecture, artifacts, deferred-scope, scope tests 13/13, runtime smoke,
  and whitespace/diff checks.
- **BLOCKED/UNVERIFIED:** Docker/PostgreSQL validation is `BLOCKED` because
  Docker Compose is unavailable and Docker config access is denied. OpenSpec
  CLI, live Binance/News/provider traffic, real feature REST/market-WebSocket
  composition, and browser/demo evidence remain `UNVERIFIED` or `BLOCKED`.
  These limitations do not become PASS and remain integration/final-demo gates
  owned by later authorized work.
- The source review found no new transport, persistence, provider call,
  frontend business calculation, client-identity/cache bypass, hard-coded
  strategy-name branch, deferred-scope leakage, or forbidden-path change. The
  UI keeps unavailable state explicit and renders only supplied DTO/state.

### Current boundary

- This HOLD authorizes nothing: no worker, no implementation packet, no M-02,
  AU-02, I-01, I-02, I-03, no retry/replacement, and no downstream promotion.
- A separate fresh Manager may be authorized only for governance checkpoint
  reconciliation and packet-state closure against committed `6a4e86e`. That
  Manager must not create a worker or edit source. If the checkpoint is not
  internally consistent, it must leave F-03 in `REVIEW` and report
  `NEEDS_INSTRUCTOR_REVIEW`.

## Historical INS-089 — F-03 Residual Screen Projections

This current signal supersedes `INS-088 / HOLD` and authorizes exactly one
fresh Manager and exactly one internal Frontend worker to complete the
remaining screen-level portion of packet `F-03`. It is a bounded residual
execution, not a retry or replacement of the completed INS-085 worker. It
authorizes no second worker, parallel frontend writer, downstream packet,
M-02, AU-02, I-01, I-02, I-03, or unrelated source/control change.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at reviewed base `29464d3` (`docs(control): hold
  after checkpoint reconciliation`). The already audited market/cache source
  slice is committed at `122569c`; the reconciled Manager checkpoint is
  `43ae5d2`; the current HOLD is `INS-088` at `29464d3`.
- `TASKS.md` remains authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`),
  and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03 is
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; its dependencies `M-03`, `S-04`,
  `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, and `L-02` are `DONE`.
  The residual may reopen only F-03 through `REVIEW -> READY -> IN_PROGRESS ->
  REVIEW` and may reach `DONE` only if the bounded acceptance and packet tests
  are actually complete.
- The source/business state and task DAG were reviewed against the reconciled
  checkpoint. No active Cryptox Manager or worker exists. The historical
  INS-085 Manager and Descartes worker, and the INS-087 governance Manager,
  are idle/closed and must not be reused. The fresh Manager must run in the
  same canonical directory with model `gpt-5.6-luna` and reasoning `max`, with
  no worktree or alternate checkout.
- This packet uses the already committed `FeatureWorkspaceState.authoring`,
  frozen REST DTOs, frozen market WebSocket DTOs, and existing typed clients.
  No new transport is authorized. If a required state is absent from a frozen
  DTO or not composed by the current client, the UI must say
  `not supplied/not yet composed` or unavailable and the handoff must record
  `NEEDS_INSTRUCTOR_REVIEW`; it must not fabricate state or calculate business
  results in the browser.

### Exact residual write scope

- **Allowed implementation paths:**
  `apps/frontend/src/features/screens.tsx`,
  `apps/frontend/src/features/screens.spec.tsx`, and—only when needed to
  supply deterministic development evidence for those screen tests—
  `apps/frontend/src/features/fixture-data.ts` and
  `apps/frontend/src/features/fixture-client.ts`.
- Existing classes/dependencies should be reused. `apps/frontend/src/style.css`
  may be changed only if a directly required F-03 screen projection cannot be
  rendered accessibly with the existing styles; no unrelated visual redesign
  is allowed.
- **Forbidden:** `apps/frontend/src/market/**`,
  `apps/frontend/src/components/MarketChart.tsx`, auth/cache/state/types
  outside the already committed seam, `apps/frontend/src/features/clients.ts`,
  all `modules/**`, `apps/backend/**`, `packages/contracts/**`, migrations,
  providers/infrastructure, manifests/lockfiles, OpenSpec/ADR/requirements/
  architecture/data-model policy, new fields/endpoints, persistence, browser
  Binance/News/LLM calls, hard-coded strategy-name business branches, private
  cache or client-identity bypass, live-order/risk behavior, and any deferred
  scope.

### Required screen projections and acceptance

- **Authoring and Strategy:** render the existing authoring state distinctly.
  The current frozen contracts have no draft/validation/Save/Approve transport,
  so the unavailable/disabled state must be explicit rather than simulated.
  For supplied saved definitions, render `MANUAL`, `LLM_DRAFT`, and
  `APPROVED_NEWS_ITEM` origin metadata without exposing prompts or credentials.
  Render descriptor `behaviorProfileId`, implementation version, visualization
  metadata, and parameters generically. Render composite method/profile,
  component enabled/weight metadata, and supplied weighted thresholds and
  normalization; weighted and Lite profiles must be descriptor/metadata-driven,
  never selected by strategy-name branches.
- **Search:** present the three frozen generator types `RANDOM`,
  `DOMAIN_GUIDED`, and `GENETIC`. Render supplied seeded profile, seed,
  algorithm configuration, dataset identity, code provenance, finite stop
  condition, state, candidate counts, timing, errors, and ranking. If the
  existing client cannot start a seeded request because that transport is not
  exposed, keep the unsupported action disabled or label it not yet composed;
  do not silently convert it to RANDOM or invent provenance. Preserve REST
  request/response semantics and do not generate candidates in the browser.
- **Experiments/paper:** project only supplied Experiment/Trade fields,
  including search/candidate/market/code/ranking/replay provenance, execution
  profile, initial capital, fee/slippage, opaque paper-execution provenance,
  position mode, exit reason, and visualization markers/overlays/signals.
  Clearly distinguish synthetic paper Long versus Short when supplied, show
  SL/TP/stop-policy/decimal fields only when supplied, and otherwise show
  `not supplied/not yet composed`. Include an explicit no-live-order label;
  do not calculate metrics, P&L, or execution values in the frontend.
- **News/Sentiment:** keep stories usable when sentiment is absent. Render
  extraction source/canonical URL/hash/time/retention and template id/source/
  version/status (`DRAFT`, `APPROVED`, `RETIRED`) when supplied. Render
  sentiment as explicit `AVAILABLE`, `MISSING`, or `DEGRADED` with its reason
  when the DTO supplies it, without inferring a provider result from absent
  data. Do not add arbitrary URL fetching or LLM calls.
- **Privacy and tests:** preserve trusted server identity and private-cache
  isolation. Add packet-specific screen/component regression tests covering
  the available and unavailable paths above, including no fabricated state and
  no name-based business branch. Fixture data must remain clearly fixture-only
  and cannot be cited as final real-provider/demo evidence.

### Manager/worker procedure and validation

- The fresh Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then independently
  verify this signal, `DECISIONS.md`, `TASKS.md`, `HANDOFF.md`, the F-03 packet,
  requirements, accepted ADRs, active specs, frozen contracts, and current
  frontend source. It must create exactly one internal Frontend worker with a
  disjoint scope inside the allowed feature-screen/test paths. The worker must
  not edit control files or commit; the Manager alone updates TASKS/HANDOFF.
- The Manager must review the worker path-by-path, run focused frontend tests
  including the new packet tests, frontend typecheck/build/lint, applicable
  root tests, architecture/artifact/deferred-scope/scope/whitespace checks,
  and browser/real API evidence when available. OpenSpec CLI, Docker/
  PostgreSQL, live providers, real feature transport, and browser/demo checks
  must remain `UNVERIFIED`/`BLOCKED` when unavailable, never `PASS`.
- Only F-03 may transition under this instruction. The Manager must stop when
  the residual scope is exhausted, must not start downstream work, and must
  make at most one coherent checkpoint commit attempt. If Git rejects it, it
  must not retry and must report the exact error for Instructor audit. If any
  source/business/DAG drift or forbidden contract/backend need appears, stop
  with `NEEDS_INSTRUCTOR_REVIEW` rather than expanding scope.

## Historical INS-088 — Post-INS-087 Checkpoint Reconciliation HOLD

This current signal supersedes `INS-087 / APPROVED_FOR_EXECUTION`. The
governance-only reconciliation is complete and grants no execution authority.
No Manager, worker, residual F-03 implementation, downstream packet, retry,
replacement, duplicate, or user-facing child task is currently authorized.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `43ae5d2` (`docs(control): reconcile F-03
  checkpoint commit`). This commit contains only the Manager-owned TASKS and
  HANDOFF reconciliation authorized by INS-087. The audited F-03 source slice
  remains committed at `122569c`, and the prior Instructor partial-review HOLD
  is `INS-086` at `376dcbc`.
- TASKS/HANDOFF now consistently record the exact nine effective frontend
  source paths plus the two Manager-owned checkpoint files, the Instructor
  audit/commit at `122569c`, no uncommitted F-03 delta, and the current
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` outcome. The reconciliation did not change
  source, business state, task state, validation classifications, or scope.
- TASKS remains authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and
  `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). No downstream task was
  authorized, started, or promoted. The INS-087 Manager is complete/idle and
  no active Cryptox Manager or worker remains.
- The accepted partial source slice is limited to frozen market observability
  delivery/recovery display, private-cache revision protection, and honest
  unavailable authoring state. Frontend/global validation remains green, but
  the required F-03 screen projections and packet-specific tests are absent.
  Docker/PostgreSQL remains BLOCKED; OpenSpec CLI, live providers, real
  feature transport, and browser/demo evidence remain UNVERIFIED or BLOCKED.

### Next decision boundary

- A fresh residual F-03 authorization may be considered after this HOLD. It
  must use a fresh Manager and exactly one fresh internal worker with a
  narrower disjoint screen/test write scope, preserve frozen contracts, and
  not reopen or duplicate the already committed market slice. The residual
  may not mark F-03 DONE unless all applicable acceptance criteria and tests
  are evidenced; missing public transport must remain explicitly unavailable.
- This HOLD authorizes nothing. M-02, AU-02, I-01, I-02, and I-03 remain
  unauthorized, and no newly unlocked work may start.

## Historical INS-087 — F-03 Checkpoint Record Reconciliation

This current signal supersedes `INS-086 / HOLD` for one governance-only
reconciliation. It authorizes exactly one fresh Manager in the canonical
checkout to reconcile the stale Manager-owned `TASKS.md` and `HANDOFF.md`
records with already committed, Instructor-audited Git evidence. It authorizes
no source implementation, F-03 residual work, worker, downstream packet,
retry, replacement, duplicate, or user-facing child task.

### Reconciliation authority and boundary

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at current control signal commit `376dcbc`
  (`docs(control): hold after partial F-03 review`). The audited F-03 source
  checkpoint is `122569c` (`feat(frontend): add market observability projection
  seams`) and is an ancestor of the current HEAD; no source/business-state
  drift is present.
- The stale record is precise: `TASKS.md` F-03 and the top `HANDOFF.md`
  checkpoint still describe the audited source/control delta as uncommitted at
  `abc868c`, although the Instructor already committed the exact 11-path delta
  at `122569c`. The current `INS-086 / HOLD` is committed at `376dcbc`.
- `TASKS.md` remains authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`),
  and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03 remains
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; no task state may be promoted, reopened,
  or otherwise changed by this instruction.
- The completed INS-085 Manager and Descartes worker are closed. No active
  Cryptox Manager or worker competes in the canonical checkout. Create exactly
  one fresh Manager with model `gpt-5.6-luna` and reasoning `max`, same
  directory and no worktree. Because this is governance-only, no worker is
  required or permitted.

### Manager-only work

- Read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely,
  then verify Git, `INSTRUCTOR.md`, `DECISIONS.md`, `TASKS.md`, `HANDOFF.md`,
  the F-03 packet, and the committed `122569c`/`376dcbc` evidence.
- Update only Manager-owned `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` so they accurately state that the exact
  nine effective frontend source paths plus `TASKS.md`/`HANDOFF.md` were
  audited and committed at `122569c`, that the current Instructor HOLD is
  `INS-086` at `376dcbc`, and that no uncommitted F-03 delta remains. Preserve
  F-03 `REVIEW / NEEDS_INSTRUCTOR_REVIEW`, all validation classifications,
  missing projection coverage, and the stop boundary. Do not change any source,
  contract, plan, requirement, ADR, OpenSpec, or Instructor decision.
- The reconciliation must retain the actual evidence: frontend 31/31, root
  383 with 6 environment-gated skips, typecheck/build/lint, architecture,
  artifacts, deferred-scope, scope 13/13, runtime health smoke, and whitespace
  PASS; Docker/PostgreSQL BLOCKED; OpenSpec CLI, live providers, real feature
  transport, and browser/demo UNVERIFIED or BLOCKED. It must not claim F-03
  DONE or final real-provider evidence.
- Make at most one coherent Manager checkpoint commit attempt. If Git rejects
  it, do not retry; return the exact error and leave the Instructor to audit
  and commit. Stop immediately after the reconciliation checkpoint; do not
  create a worker or start F-03, M-02, AU-02, I-01, I-02, or I-03.

## Historical INS-086 — Post-INS-085 F-03 Partial Review HOLD

This current signal supersedes `INS-085 / APPROVED_FOR_EXECUTION` and grants no
execution authority. The F-03 execution is exhausted at a safe review
checkpoint; no Manager, worker, downstream packet, retry, replacement, or
duplicate is currently authorized.

### Review evidence

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean after the Instructor-audited checkpoint commit
  `122569c` (`feat(frontend): add market observability projection seams`). The
  prior authorization commit is `abc868c`; the reviewed base was
  `1c5b1cf9c250526990c1b4bc0da0b5d9bbec403d`.
- INS-085 used exactly one fresh Manager and exactly one internal Frontend
  worker, Descartes. Both are complete/closed; no active Cryptox Manager or
  worker remains, and no retry or replacement occurred. The Manager's single
  staging/commit attempt failed with `.git/index.lock: Permission denied`; the
  Instructor independently audited and committed the exact 11-path delta.
- `TASKS.md` is authoritative and now records `37 DONE`, `2 REVIEW`
  (`M-02`, `F-03`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03
  remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; it is not DONE. No downstream
  packet was started or promoted.
- The accepted bounded source slice is frontend-only: existing frozen
  `MARKET_OBSERVABILITY_V1` delivery is consumed and rendered with pair
  filtering, an at-most-100 ephemeral tick buffer, provider/received times,
  latency, recovery labels, and restart-loss wording. The private feature
  cache revision seam prevents stale async writes after logout, and the
  absent LLM transport is represented honestly as unavailable/disabled.
- Independent validation is PASS for frontend 31/31, root 383 with 6
  environment-gated skips, root/frontend typecheck, build, lint, architecture,
  artifacts, deferred-scope, scope tests 13/13, runtime health smoke, and
  whitespace. No frozen contract, backend/module source, migration, or
  deferred-scope path changed. Docker/PostgreSQL is BLOCKED; OpenSpec CLI,
  live Binance/News/provider, real feature transport, and browser/demo
  evidence are UNVERIFIED or BLOCKED and are not treated as PASS.

### Unresolved F-03 coverage

- The restored screens do not consume the new state or provide the required
  Search `RANDOM_V1`/`DOMAIN_GUIDED_V1`/`GENETIC_V1` provenance and stop
  presentation, weighted/Lite descriptor views, synthetic paper
  Long/Short/SL-TP/fee/slippage/decimal projections, News extraction/template
  state, explicit Sentiment `AVAILABLE`/`MISSING`/`DEGRADED` reasons, or
  distinct LLM draft/validation/Save/Approve presentation.
- The frozen public contracts expose only the states they currently model and
  expose no dedicated browser-safe LLM draft transport or typed SL/TP stop
  policy fields. No agent may invent fields, endpoints, persistence, browser
  network calls, or client-side business truth. Any residual implementation
  must remain an explicitly bounded frontend projection and report absent
  state honestly.
- A future residual F-03 authorization may be considered only after this HOLD
  review and a fresh applicability check. It must use a fresh Manager and
  fresh internal worker, with a narrower disjoint screen/test write scope;
  this HOLD itself authorizes nothing. M-02, AU-02, I-01, I-02, and I-03
  remain unauthorized.

## Historical INS-085 — DEC-007 Functional-State Frontend Projections

This current signal supersedes `INS-084 / HOLD` and authorizes exactly one fresh
Manager and exactly one internal Frontend worker to execute only packet `F-03`.
It authorizes no retry, replacement, duplicate, second worker, downstream
promotion, M-02/AU-02/I-01/I-02/I-03 work, or unrelated control/source change.

### Reviewed authority and applicability

- The reviewed base is `1c5b1cf9c250526990c1b4bc0da0b5d9bbec403d`
  (`docs(control): reconcile task board evidence`) on branch
  `MVP_IMPLEMENTATION`; Git is clean, `.git/index.lock` is absent, and no
  source or business-state drift is present. The only expected delta after this
  review is this committed Instructor authorization.
- `TASKS.md` is reconciled with the current checkpoints: `37 DONE`, `1 REVIEW`
  (`M-02`), and `5 BLOCKED` (`AU-02`, `F-03`, `I-01`, `I-02`, `I-03`). F-03's
  start dependencies `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`,
  `E-02`, and `L-02` are all `DONE`. F-03 is the sole packet authorized here;
  its downstream `I-03` and baseline `I-01` remain blocked and unauthorized.
- The authority chain reviewed for F-03 is `DEC-007`, `MVP_PLAN.md`,
  `TASKS.md`, `HANDOFF.md`, `docs/requirements.md`, accepted ADR-001,
  ADR-002, ADR-006, ADR-007, and ADR-009, the active frontend and related
  capability specifications, the frozen REST/WebSocket contracts, and the
  current frontend/backend source. The current frontend is fixture-first for
  private feature views and has typed remote clients; backend feature transport
  composition and final real-provider evidence remain later integration work.
- Existing public contracts already expose normalized chart data,
  `MARKET_OBSERVABILITY_V1` WebSocket messages, descriptor metadata, strategy
  authoring-origin fields, seeded Search provenance, paper-execution
  provenance, News extraction/template fields, Sentiment availability, and
  Experiment/Leaderboard provenance. These contracts are frozen for F-03.
  A required state that cannot be represented through an existing public
  contract must be reported honestly as unavailable and escalated as
  `NEEDS_INSTRUCTOR_REVIEW`; no worker may invent or expand a transport.
- No active Cryptox Manager or worker exists. The historical INS-083 Manager
  and worker are idle and must not be reused for implementation; no parallel
  frontend writer is authorized.

### Authorization

- Create exactly one fresh Orchestrator/Manager in the canonical checkout
  `D:/agy-cli-projects/AOS/Cryptox`, same directory, branch
  `MVP_IMPLEMENTATION`, with no worktree or alternate checkout. Use model
  `gpt-5.6-luna` with reasoning `max`. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then independently
  verify this signal, the reviewed base, task DAG, dependencies, active-task
  list, and clean Git before doing anything.
- The Manager must create exactly one internal Frontend worker/subagent using
  the repository-approved native mechanism. The worker must use the same
  canonical checkout, must not create a user-facing thread, branch, worktree,
  child agent, or commit, and must not edit any control-plane artifact. No
  second, replacement, retry, or duplicate worker is allowed.
- Only F-03 may move through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW ->
  DONE`. The Manager alone may update `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the worker returns scoped source, tests,
  and evidence. When F-03 is exhausted, the Manager must stop without starting
  I-03, I-01, M-02, AU-02, I-02, or any newly unlocked packet.

### Packet boundary

- **Requirement IDs:** `CSL-R-MD-03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-FE-01`, and
  `CSL-R-DM-01`.
- **Only writable implementation scope:** `apps/frontend/**`, excluding
  generated/build output and dependency directories. Frontend tests, fixtures,
  typed client adapters, state projections, and styling under that directory
  are allowed only when they serve F-03. Manager-only control updates remain
  limited to `TASKS.md` and `HANDOFF.md`.
- **Forbidden scope:** all module source, `apps/backend/**`,
  `packages/contracts/**`, migrations, providers, infrastructure, package
  manifests/lockfiles, OpenSpec/ADR/requirements/architecture/data-model
  policy changes, new REST/WebSocket fields, business calculations, persistence
  changes, LLM/network calls from the browser, and unrelated auth behavior.

### Acceptance criteria

- Up to four independently configurable charts use normalized market state,
  keep history-before-realtime ordering, preserve independent timeframe state,
  and render connection/recovery truthfully. The frontend consumes the existing
  market observability projection for provider event time, received time,
  latency, connection state, and the latest-tick buffer; it labels the buffer
  ephemeral, shows restart/loss honestly, and never treats it as historical or
  backtest input.
- Strategy and composite controls remain descriptor/public-contract driven. The
  UI renders weighted and Lite profile descriptors and provenance without
  name-based business branches. LLM draft, deterministic validation, failure or
  missing-configuration, and explicit Save/Approve states remain distinct; no
  draft is presented as persisted automatically, and unavailable backend state
  is not fabricated.
- Search presentation exposes the selected `RANDOM_V1`, `DOMAIN_GUIDED_V1`,
  or `GENETIC_V1` profile, finite budget/stop state, seed, algorithm
  configuration, dataset identity, code version, counts, failures, timing, and
  ranking through request/response state. It does not widen the market
  WebSocket or run generation in the client.
- Experiment/result views visibly distinguish synthetic Long versus Short
  paper execution, SL/TP and `STOP_LOSS_WINS_V1`, fee, adverse slippage,
  decimal scale/rounding, and practical replay/provenance limitations. They
  render required metrics, ranking configuration, selected-strategy overlays,
  Buy/Sell and Entry/Exit markers, and do not imply live exchange orders.
- News displays source/refresh and extraction provenance, template `DRAFT` /
  `APPROVED` review state where supplied, and keeps News usable when Sentiment
  is missing/degraded. Sentiment failure must remain visibly limited to that
  panel and must not block chart, strategy, Search, result, or leaderboard
  views.
- No private data is retained in a client cache across owner changes or logout,
  no client-supplied identity authorizes access, no frontend business rule
  replaces backend authority, and fixture-only evidence is never reported as
  final real-provider/demo evidence.

### Validation and stop conditions

- The Manager must review the worker diff path-by-path and run the focused
  frontend component/state/client/browser tests available in the environment,
  frontend typecheck/build/lint, and applicable root tests plus architecture,
  artifacts, deferred-scope, scope, and whitespace checks. Browser and real API
  evidence are required when available; fixture-only evidence remains limited
  and final-mode real-provider evidence is `UNVERIFIED` or `BLOCKED` when the
  integrated runtime/environment is unavailable.
- If the current frozen contracts do not carry a required F-03 state, if a
  backend/module/contract/schema change is needed, if scope or task-DAG drift
  appears, or if any active competing Manager/worker is found, stop safely and
  report `NEEDS_INSTRUCTOR_REVIEW` without widening scope. Unavailable tools,
  PostgreSQL/Docker, OpenSpec CLI, live providers, and browser/demo checks must
  be recorded as `UNVERIFIED` or `BLOCKED`, never `PASS`.
- The Manager must record the exact Instruction ID, worker, state transitions,
  changed paths, evidence, limitations, and newly ready/remaining blocked
  tasks in `HANDOFF.md`/`TASKS.md`, make at most one coherent commit attempt for
  the completed bounded checkpoint, and stop when F-03 is done or blocked. No
  downstream work starts under INS-085.

## Historical INS-084 — Post-L-02 Independent Audit HOLD

- Branch is `MVP_IMPLEMENTATION`; the reviewed source/control checkpoint is
  `32ed9321f9f22f858fdd2458351b531e8807db7d` (`feat(leaderboard): reconcile
  provenance-aware ranking`), whose parent is the INS-083 authorization commit
  `a201afe001b22bab8bc018f73ca5bb3485a424dc`. The working tree is clean after
  the parent Instructor independently audited and committed the exact twelve
  path L-02 delta following the Manager's single denied staging attempt.
- `TASKS.md` is internally reconciled and records `37 DONE`, `1 REVIEW`
  (`M-02`), and `5 BLOCKED` (`AU-02`, `F-03`, `I-01`, `I-02`, `I-03`). L-02
  alone moved under INS-083 through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW
  -> DONE`; no downstream packet was promoted or started.
- L-02 source scope was limited to Leaderboard. The frozen
  `modules/leaderboard/api/contracts.ts` hash remains
  `702130a2c2469024668f77493f832993d005d916`; no migration, dependency, other
  module, frontend, backend-composition, or deferred-scope file entered the
  checkpoint. The Manager and exactly one internal worker are idle; no active
  Cryptox Manager or worker remains.
- Independent evidence is PASS for the Leaderboard suite (`22/22`), root
  tests, workspace typecheck/build/lint, architecture, artifacts,
  deferred-scope, 13-test scope suite, runtime smoke, exact-scope review, and
  `git diff --check`. Docker/Compose PostgreSQL validation is BLOCKED on this
  host; OpenSpec CLI, live Binance/News, browser/demo, and final cross-module
  runtime evidence remain UNVERIFIED. These limitations do not become PASS by
  fixture or fake-pool coverage.
- L-02 explicitly records that Leaderboard retains Experiment and
  ranking-configuration references and reads the frozen optional extension
  provenance without duplicating upstream strategy/Search/Backtesting storage
  or claiming exact replay. PostgreSQL's existing delete-on-eviction schema has
  no tombstone; that persistence limitation is outside the exhausted L-02
  authorization and is documented in `HANDOFF.md`.

### HOLD conditions and next review

- The next nominal technical frontier is `F-03`, whose start dependencies are
  now satisfied according to `MVP_PLAN.md` and `TASKS.md`. It remains BLOCKED
  until this Instructor reviews the exact frontend packet, current REST/public
  contracts, backend-derived projection boundaries, and safe write scope, then
  issues a separate `INS-* / APPROVED_FOR_EXECUTION`.
- `M-02` remains `REVIEW/UNVERIFIED`; `AU-02` remains blocked pending its
  required human decision; `I-01`, `I-02`, and `I-03` remain blocked. No new
  Manager, worker, or parallel packet may be created while this HOLD is current.
- Before any next authorization, re-check clean Git/source-business state,
  active-task status, the current task DAG, the F-03 authority chain, and the
  unavailable evidence above. The next authorized Manager must use
  `gpt-5.6-luna` with reasoning `max`, same-directory canonical checkout, and
  internal subagents only for its bounded worker delegation.

## Historical INS-083 — Extension-Aware Ranking and Provenance Admission

This historical signal superseded `INS-082 / HOLD` and authorized exactly one fresh
Manager to execute and close only packet `L-02`. It authorizes no other packet,
worker thread, retry, replacement, duplicate, downstream promotion, or
unrelated control/source change.

### Reviewed checkpoint and applicability

- Reviewed base: `ebb890df75f8d081aa5e15c1532fe0d626a51671` (`docs(control):
  hold after E-02 audit`) on branch `MVP_IMPLEMENTATION`; the working tree was
  clean before this authorization and no source/business-state drift was found.
- The operational board is `36 DONE`, `1 REVIEW` (`M-02`), and `6 BLOCKED`
  (`AU-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`). `C-02`, `Q-02`, `B-03`,
  `E-02`, and completed legacy `L-01` are DONE and satisfy L-02's documented
  start dependencies. `F-03`, baseline `I-01`, and `I-03` are integration
  dependencies and must remain blocked.
- `MVP_PLAN.md` defines L-02 as the E2 extension-aware Leaderboard join with
  requirements `CSL-R-LB-01`, `CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-RP-02`,
  `CSL-R-OB-01`, and `CSL-R-OW-01`. It requires finite successfully evaluated
  same-owner admission, deterministic Top-K/ties/idempotency, and traceable
  discovery/paper/definition/metric/ranking provenance without mutation or
  cross-user leakage.
- The public Leaderboard contract in `modules/leaderboard/api/contracts.ts`
  and the additive C-02 `RankableExperiment.extensionProvenance` shape are
  frozen for this packet. L-02 must work through those existing public
  boundaries; it may not edit canonical contracts, migrations, or other module
  source. If the approved behavior cannot be proven without a contract/schema
  expansion, the Manager must stop with `NEEDS_INSTRUCTOR_REVIEW` rather than
  widening this authorization.
- Active-task inspection found no active Cryptox Manager or worker. No historical
  Manager or worker will be resumed, retried, replaced, or reused.

### Authorization

- Create exactly one fresh Orchestrator/Manager in the same canonical checkout
  `D:\agy-cli-projects\AOS\Cryptox`, on branch `MVP_IMPLEMENTATION`, with no
  worktree or alternate branch, using model `gpt-5.6-luna` and reasoning
  `max`. Do not reuse a historical Manager and do not create a duplicate.
- The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify the
  current signal, reviewed base, branch/status, task DAG, dependencies,
  checkpoint, and active-task list before acting. If any material premise has
  changed, it must stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may create exactly one internal Leaderboard worker/subagent using
  the repository-approved internal subagent mechanism. It must not create a
  user-facing worker task, worktree worker, second worker, retry, replacement,
  or duplicate. The Manager must stop when this authorization is exhausted.
- The authorized packet is **L-02 — Extension-Aware Ranking and Provenance
  Admission** only. The Manager alone may transition L-02 through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` and may update
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  Workers must not edit those files or any Instructor/decision artifact.
- Authorized source/write scope is limited to `modules/leaderboard/**`,
  excluding `modules/leaderboard/api/contracts.ts`, migrations, other modules,
  frontend, dependencies, and backend composition. Focused Leaderboard tests,
  module documentation, and module-owned adapters are allowed only when needed
  to prove this packet. No canonical contract or schema expansion is authorized.

### Required behavior and acceptance

- Admit only `SUCCEEDED` Experiments with finite required Evaluation metrics,
  and preserve trusted owner-scoped scope/entry/search-run reads and mutations.
  Unauthenticated access must reject; cross-user guessed identifiers and
  client-supplied identity fields must not read or mutate private data.
- Preserve `LINEAR_REQUIRED_V1` scoring, configurable positive K, deterministic
  Top-K ordering and ties, duplicate/idempotent submission behavior, and
  rejection of incomplete, failed, invalid, or non-finite results. Do not mutate
  historical Experiments or Evaluation data and do not add risk, live-trading,
  queue, or generalized score scope.
- Make the existing extension provenance traceable through the public
  Leaderboard/Experiment boundary: strategy or composite version, Search
  profile/seed/configuration/dataset/code where supplied by the approved
  projection, paper execution/decimal profile, finite Evaluation metrics, and
  ranking-configuration identity. Preserve provenance as read-only; do not
  fabricate unavailable replay evidence or duplicate another module's storage.
  Any persistence limitation must be explicit in the Manager checkpoint.
- Keep module ownership and dependency direction intact. Leaderboard may consume
  only public ports/projections; it must not deep-import Strategy, Search,
  Backtesting, or Evaluation internals, edit their contracts, recompute metrics,
  simulate trades, or change migrations.

### Validation and stop condition

- The Manager must independently review the one worker's diff and evidence,
  including Leaderboard domain/application, public-boundary, owner-isolation,
  provenance, idempotency, deterministic ranking, and persistence-adapter tests.
- Run the relevant root workspace tests and gates: architecture, artifacts,
  deferred-scope, scope tests, typecheck, build, lint, and `git diff --check`.
  Record unavailable OpenSpec CLI, PostgreSQL/Docker, live-provider,
  browser/demo, or other environment evidence as `UNVERIFIED` or `BLOCKED`,
  never `PASS`.
- Verify the exact module-only write scope, frozen contract/schema, no
  deferred-scope leakage, no source/business-state drift, and TASKS/HANDOFF
  consistency before accepting. A missing provenance boundary, scope breach,
  unexpected contract/schema change, or failed check requires `REVIEW`/`BLOCKED`
  and Instructor review rather than broadening the packet.
- Record `INS-083` and the reviewed base in the checkpoint, attempt at most one
  coherent Manager checkpoint commit, report any permission failure truthfully,
  and stop. Do not start F-03, I-03, I-01, I-02, M-02, AU-02, or any other
  downstream/deferred work.

### Concurrency rationale

- No safe second implementation packet is available under this signal. F-03 and
  I-03 depend on L-02, baseline I-01/AU-02 remain gated, and the `M-02`
  `REVIEW/UNVERIFIED` closure shares the same canonical control plane. One
  internal Leaderboard worker is therefore the maximum quality-preserving
  concurrency for INS-083.

### Historical INS-081 authorization (exhausted)

- Create exactly one fresh Orchestrator/Manager in the same canonical checkout
  `D:\agy-cli-projects\AOS\Cryptox`, on branch `MVP_IMPLEMENTATION`, with no
  worktree or alternate branch, using model `gpt-5.6-luna` and reasoning
  `max`. Do not reuse a historical Manager and do not create a duplicate.
- The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify the
  current signal, reviewed base, branch/status, task DAG, dependencies,
  checkpoint, and active-task list before acting. If any material premise has
  changed, it must stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may create exactly one internal Evaluation worker/subagent using
  the repository-approved internal subagent mechanism. It must not create a
  user-facing worker task, worktree worker, second worker, retry, replacement,
  or duplicate. The Manager must stop when this authorization is exhausted.
- The authorized packet is **E-02 — Extension Evaluation and Decimal-Boundary
  Reconciliation** only. The Manager alone may transition E-02 through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` and may update
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  Workers must not edit those files or any Instructor/decision artifact.
- Authorized source/write scope is limited to
  `modules/evaluation/**`, excluding frozen
  `modules/evaluation/api/contracts.ts`, and focused Evaluation tests or
  module documentation required to prove the packet. API bootstrap/index,
  application, and domain files are allowed only when needed for the approved
  public Evaluation boundary. No other module or root source may change.

### Historical INS-081 acceptance

- Consume the completed decimal-normalized paper result produced by B-03
  through the public Evaluation boundary. Preserve independence from Strategy
  and Backtesting implementation details.
- Prove deterministic, finite `REQUIRED_METRICS_V1` outputs: Return, Win Rate,
  Maximum Drawdown, and Number of Trades, including decimal/fixed-point fixture
  cases, zero trades, flat/zero equity curves, and valid Long/Short paper
  results.
- Do not recompute fills, fees, slippage, rounding, entry/exit behavior, or
  simulation inside Evaluation. Do not introduce optional metrics, risk,
  ranking/score, persistence, queues, providers, or business logic outside
  this packet.
- Reject invalid, sparse, non-finite, non-positive-denominator, or otherwise
  malformed input deterministically without emitting ranking output; preserve
  input immutability and explicit finite-output guarantees.
- Keep the frozen API contract and module ownership boundaries intact. Do not
  edit migrations, dependencies, Strategy, Backtesting, Leaderboard,
  frontend, backend composition, provider code, or any deferred scope.

### Historical INS-081 validation

- The Manager must review the one worker's diff and evidence independently,
  including focused Evaluation decimal-boundary tests and the complete
  Evaluation package suite, typecheck, build, and lint.
- Run the relevant root workspace tests and gates: architecture, artifacts,
  deferred-scope, scope tests, typecheck, build, lint, and `git diff --check`.
  Record unavailable OpenSpec CLI, live-provider, PostgreSQL, browser/demo, or
  other environment evidence as `UNVERIFIED` or `BLOCKED`, never `PASS`.
- Verify exact write scope, no deferred-scope leakage, no source/business-state
  drift, and consistency of TASKS/HANDOFF before accepting. A failed check,
  scope breach, unexpected contract change, or missing decimal-boundary proof
  requires `REVIEW`/`BLOCKED` and Instructor review rather than broadening the
  packet.
- Record `INS-081` and the reviewed base in the checkpoint, attempt at most
  one coherent Manager checkpoint commit, report any permission failure
  truthfully, and stop. Do not start L-02, F-03, I-03, M-02, AU-02, I-01,
  I-02, or any other downstream/deferred work.

### Historical INS-081 concurrency rationale

- No safe second implementation packet is available under this signal: L-02
  is a critical downstream join that depends on E-02, while F-03/I-03 and the
  baseline integration packets are gated by additional dependencies. One
  internal worker is therefore the maximum quality-preserving concurrency for
  INS-081.

## INS-079 — Reconcile the committed INS-077 checkpoint

This current signal supersedes `INS-078 / HOLD` and authorizes exactly one
fresh Manager for a control-plane-only reconciliation. It authorizes no worker,
feature implementation, retry, replacement, duplicate, downstream promotion,
or task-state transition.

### Reviewed checkpoint and exact authority

- Branch: `MVP_IMPLEMENTATION`; reviewed base is
  `2c69732ec2ed92be7084ca59175b49c48963cc71` (`docs(control): hold after
  INS-077 audit`). The working tree is clean, and active-task inspection found
  no Cryptox Manager or worker.
- The S-04 source and Manager-owned checkpoint delta were independently
  accepted and committed at `01db873`. The Manager's one staging/commit denial
  remains historical evidence and must not be rewritten as a successful
  Manager commit.
- `TASKS.md` and the top `HANDOFF.md` checkpoint still describe the accepted
  S-04 source/control changes as uncommitted at `3184d7a`. This is a stale
  checkpoint statement, not a source or business-state change, and must be
  reconciled before any new implementation authorization.
- Current operational states must remain unchanged: `35 DONE`, `1 REVIEW`
  (`M-02`), and `7 BLOCKED` (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`,
  `I-03`). `TASKS.md` remains the sole task-state authority.

### Exact Manager authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal
  and base from Git, inspect TASKS/HANDOFF consistency and active tasks, and
  stop if any material source/business/DAG drift is found.
- This authorization is Manager-owned governance reconciliation only. Create
  no worker or subagent; do not use a user-facing thread for a worker, and do
  not create a branch or worktree.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. It may update the current S-04 latest
  commit/checkpoint references from “uncommitted at `3184d7a`” to the accepted
  `01db873` checkpoint and preserve the historical staging denial. It must not
  change any task state, dependency, validation claim, source, contract,
  migration, dependency, frontend, backend, OpenSpec, ADR, or other file.

### Acceptance, validation, and stop condition

- Reconcile only the stale S-04 commit/checkpoint language, preserve all other
  task rows and historical evidence, and ensure the top HANDOFF and S-04 row
  agree with `01db873`.
- Verify the exact two-file diff, `git diff --check`, and applicable control
  consistency checks. Unavailable checks remain `UNVERIFIED`/`BLOCKED`, never
  `PASS`.
- Attempt exactly one coherent Manager checkpoint commit. If Git staging or
  commit is denied, report the exact error once and do not retry; the parent
  Instructor may independently audit/commit the exact control delta.
- After that attempt and report, stop immediately. No packet or downstream
  work is authorized by INS-079, including `M-02`, `E-02`, `L-02`, `F-03`,
  `AU-02`, `I-01`, `I-02`, or `I-03`.

## INS-078 — Post-INS-077 independent audit HOLD

This current signal supersedes `INS-077 / APPROVED_FOR_EXECUTION`. The
authorized S-04 implementation is accepted at its bounded packet boundary and
the control plane is now held pending the next Instructor frontier review. It
authorizes no Manager, worker, retry, replacement, duplicate, downstream
promotion, or other task-state transition.

### Verified checkpoint and acceptance

- Branch: `MVP_IMPLEMENTATION`; the reviewed S-04 source/control checkpoint is
  committed at `01db873` (`feat(strategy): implement controlled LLM authoring`)
  on top of `3184d7a` (`INS-077 / APPROVED_FOR_EXECUTION`). The working tree is
  clean after the parent Instructor committed the exact Manager-reported delta
  that Git refused to stage for the Manager.
- Manager `01a050e8-b340-7df1-8724-0e52e00f234d` used exactly one internal
  Strategy worker, Helmholtz `01a050f1-73b9-7c51-975b-19d6247ef96d`, in the
  canonical same-directory checkout. No competing Cryptox Manager/worker is
  active; the Manager was archived after completion. No downstream packet was
  started.
- Only `S-04` moved through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW ->
  DONE`. The current board is `35 DONE`, `1 REVIEW` (`M-02`), and `7 BLOCKED`
  (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`).
- The exact source delta is limited to the eight authorized Strategy
  API/application/infrastructure source/test paths; the Manager-owned control
  delta is limited to `TASKS.md` and `HANDOFF.md`. Frozen contracts/ports,
  News, migrations, dependencies, frontend, backend composition, domain/plugin
  code, and unrelated files are unchanged.
- Independent validation PASS: Strategy `15` test files / `116` tests, root
  workspace tests, root build/typecheck/lint, architecture, artifacts,
  deferred-scope, `test:scope-check` `13/13`, and `git diff --check`.
  Environment-gated tests remain skips, not passes.
- Truthful limitations remain: OpenSpec CLI is unavailable (`UNVERIFIED`),
  live configured provider and browser/demo evidence are `UNVERIFIED`, and
  Docker/PostgreSQL validation is `BLOCKED`/`UNVERIFIED` because this host
  lacks usable `docker compose` access. No fixture or skipped test is promoted
  to live evidence.

### HOLD conditions and next review

- Re-read the current `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, requirements,
  accepted ADRs, architecture, data model, active capability/change specs, and
  the source/tests for the selected frontier before any new signal.
- Verify Git cleanliness, the absence of active Manager/worker tasks, current
  dependency satisfaction, and a disjoint write scope. Do not infer authority
  from a `READY` row or from S-04 completion.
- The next review may consider `E-02` because its recorded start dependencies
  (`C-02`, `B-03`, `E-01`) are `DONE`; it must not be treated as authorized by
  this HOLD. `L-02`, `F-03`, `I-01`, `I-02`, `I-03`, `AU-02`, and the
  `M-02` review state remain separately gated.
- Any next implementation authorization must name its packet, requirement IDs,
  exact write scope, acceptance criteria, validation, dependencies,
  prohibitions, and stop condition. A fresh same-directory Manager must use
  `gpt-5.6-luna` with `max` reasoning and internal subagents only; no
  user-facing `create_thread` dispatch is permitted for workers.

## INS-077 — S-04 controlled LLM authoring

This current signal supersedes `INS-076 / HOLD` and authorizes exactly one
bounded `S-04` implementation. It authorizes no other packet, retry,
replacement, duplicate, or downstream promotion.

### Reviewed checkpoint and authority

- Branch: `MVP_IMPLEMENTATION`; reviewed base is
  `723d1700bd39c4417cbfe13ca6a56bdb8a4ce378` (`docs(control): hold after
  INS-075 audit`). The working tree was clean at review and no Cryptox Manager
  or worker was active.
- The authority chain agrees: `DEC-007`, `ADR-009`, the approved
  `CSL-R-ST-05`/`CSL-R-RP-02` requirements and safe-content join
  `CSL-R-NW-02`, `openspec/specs/strategy/spec.md`, and the `S-04` packet in
  `MVP_PLAN.md`/`TASKS.md` define the same controlled authoring boundary.
- Start dependencies are verified from `TASKS.md`: `C-02`, `S-01`, and the
  URL-origin prerequisite `N-03`/`N-03A` are `DONE`. `S-05`, `S-06`, `Q-02`,
  `B-03`, and `M-03` are also `DONE`. `F-03`, `AU-02`, and `I-03` are
  integration dependencies only and remain blocked; they are not authorized by
  this signal.
- The operational board remains `34 DONE`, `1 REVIEW` (`M-02`), and
  `8 BLOCKED`. `TASKS.md` remains the sole operational-state authority.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal
  and base checkpoint from Git, check the DAG/dependencies and active-task list,
  and stop if any material premise or source/business state drifted.
- The Manager may create exactly one fresh Strategy application worker for
  `S-04`, with a disjoint source write scope. No second worker, retry,
  replacement, worktree, branch, or duplicate Manager is allowed.
- The Manager alone may update `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the worker must not edit any control-plane
  artifact. The Manager must stop after the S-04 review/checkpoint.

### Packet, requirements, and exact write scope

- Packet: `S-04 — Controlled LLM_AUTHORING_V1 Strategy Drafts`.
- Requirement IDs: `CSL-R-ST-05`, `CSL-R-RP-02`, and the safe imported-content
  join in `CSL-R-NW-02`.
- Allowed implementation scope: `modules/strategy/api/**` excluding
  `contracts.ts` and contract-only tests; `modules/strategy/application/**`
  for authoring implementation/repositories excluding the canonical
  `ports.ts`; `modules/strategy/infrastructure/**` for the provider adapter;
  and focused Strategy authoring tests. Existing frozen contracts may be read
  and consumed but not changed.
- Forbidden scope: `modules/strategy/api/contracts.ts`,
  `modules/strategy/application/ports.ts`, canonical REST contracts,
  `modules/strategy/domain/**`, `modules/news/**`, direct URL fetching or News
  persistence, migrations, dependencies, frontend, backend composition,
  credentials/secrets, queues/distributed execution, automatic approval, and
  every unrelated source or control-plane file.

### Acceptance, validation, and stop condition

- Implement a provider-neutral, configured OpenAI-compatible demo adapter that
  makes at most one request per prompt or approved-News-item submission, has a
  hard 45-second timeout, performs no retry/queue behavior, and never exposes
  or persists provider secrets, raw prompts, or raw completions.
- Produce a structured draft only; deterministic schema/domain validation must
  precede any persistence. Missing configuration, timeout, provider failure,
  malformed draft, rejected validation, and rejected approval must have no
  persistence side effect.
- Require an explicit authenticated Save/Approve action to create exactly one
  immutable owner-scoped Strategy Definition version with safe authoring origin
  metadata. Cross-user reads/mutations must have the approved not-found
  behavior. An URL-origin submission may use only the existing safe News public
  boundary and approved News item; Strategy must never fetch the URL directly.
- Add focused unit/contract/owner-approval/no-write/timeout/provenance tests,
  then run applicable Strategy tests and package typecheck/build/lint plus
  repository scope, architecture, artifact, deferred-scope, and diff checks.
  Configured real-provider or PostgreSQL/browser evidence is recorded as
  `PASS` only when actually run; unavailable evidence remains `UNVERIFIED` or
  `BLOCKED`, never inherited from fixtures or skipped tests.
- Move only `S-04` through the normal operational sequence
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` when evidence warrants
  it. Do not start or promote `F-03`, `AU-02`, `I-01`, `I-02`, `I-03`, `E-02`,
  `L-02`, `M-02`, or any other packet. After one Manager checkpoint commit
  attempt and report, stop for independent Instructor review.

## Historical INS-076 — Post-INS-075 independent audit hold

This historical signal recorded the independent Instructor review after `INS-075`.
It authorizes no Manager, worker, implementation, retry, replacement, closure
review, downstream promotion, or other task-state transition.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`; the reviewed HEAD is
  `19164a65d89b51215f031dd99619726f34271353` (`docs(control): reconcile
  INS-073 checkpoint`). The working tree was clean before this signal, and no
  competing Cryptox Manager or worker was active.
- `INS-075` completed its control-only authorization. Its Manager changed only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`;
  independent review confirmed the diff and `git diff --check`. The Manager's
  own staging failure remains recorded as historical evidence; the parent
  Instructor persisted the reviewed control delta at `19164a6` after the
  environment denied the Manager's Git staging attempt.
- `TASKS.md` remains the sole operational-state authority: 43 rows total,
  `34 DONE`, `1 REVIEW` (`M-02`), and `8 BLOCKED` (`AU-02`, `S-04`, `E-02`,
  `L-02`, `F-03`, `I-01`, `I-02`, `I-03`). `N-03A` and its existing `N-03`
  closure are `DONE` and point to the integrated News checkpoint
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
- The `MVP_PLAN.md` DAG still requires the remaining E1/E2/E3 work and the
  baseline/security gates before `I-03` and final `I-02`. `AU-02` retains its
  `NEEDS_HUMAN_DECISION` boundary, and no unavailable PostgreSQL, real-provider,
  browser/demo, OpenSpec CLI, or link/DAG evidence is promoted to `PASS`.

### HOLD conditions and next review

- Keep the repository at this safe checkpoint. Do not infer authorization from
  any `READY` row or from the fact that `N-03`/`N-03A` are now `DONE`.
- The next Instructor review must re-read the current `MVP_PLAN.md`,
  `TASKS.md`, `HANDOFF.md`, requirements, accepted ADRs, architecture, data
  model, active specs, and the source/tests for a selected frontier. It must
  verify Git cleanliness, the absence of active Manager/worker tasks, current
  dependencies, and a disjoint write scope before issuing a new signal.
- Any future implementation authorization must name its packet, requirement
  IDs, exact write scope, acceptance evidence, validation, dependencies,
  prohibitions, and stop condition. A fresh same-directory Manager must use
  `gpt-5.6-luna` with `max` reasoning, and any independent implementation must
  be delegated to an authorized worker.

## Historical INS-075 — Reconcile the audited INS-073 checkpoint

This historical signal superseded `INS-074 / HOLD` and authorized exactly one
fresh Manager for a control-plane-only reconciliation. It does not authorize a
worker, feature implementation, retry, replacement, duplicate, or downstream
start.

### Reviewed checkpoint and reason for reconciliation

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base: `6727122` (`docs(control): hold after N-03A audit`); the
  working tree was clean at that checkpoint and no Cryptox Manager or worker
  was active.
- The independently reviewed N-03A source and tests, together with the
  Manager-owned task/checkpoint changes, are integrated at
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd` (`feat(news): complete N-03A
  refresh scheduler`). The latest `HANDOFF.md` was written before that narrow
  integration and therefore still says the reviewed worker paths remain
  uncommitted. That statement must be reconciled by the Manager who owns the
  handoff artifact.
- Current task facts to preserve: `N-03A=DONE`, `N-03=DONE`, `M-02` is
  `REVIEW/UNVERIFIED`, and `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, and `I-03` are `BLOCKED`. No other task state may change.

### Exact Manager authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, recover the current
  signal from Git, and verify the reviewed base, actual integration commit,
  task board, handoff, and absence of competing active tasks.
- This is Manager-owned governance reconciliation; no worker or subagent is
  authorized or needed. Do not create any worker, retry, replacement, branch,
  worktree, or duplicate task.
- **Exact write scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. The Manager must not edit
  `INSTRUCTOR.md`, `DECISIONS.md`, `MVP_PLAN.md`, requirements, ADRs,
  architecture, data model, OpenSpec artifacts, source, tests, migrations,
  dependencies, frontend, backend composition, providers, or infrastructure.

### Acceptance and validation

- Reconcile the N-03A row and the latest INS-073 checkpoint so they identify
  the actual integrated checkpoint `f320b5f` and no longer claim the reviewed
  worker paths are uncommitted. Preserve the recorded Manager staging failure
  as historical evidence; do not rewrite it as a successful Manager commit.
- Preserve the exact `N-03A` and `N-03` `DONE` states and every unrelated task
  state, dependency, and stop boundary. Do not promote or start any other
  packet.
- Verify the final control-only diff contains no path outside the two allowed
  files, run `git diff --check` and applicable control-plane consistency checks,
  and record any unavailable check as `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Attempt exactly one coherent Manager checkpoint commit containing only
  `TASKS.md` and `HANDOFF.md`. If Git staging/commit is denied, report the
  exact error once and do not retry; the parent Instructor will independently
  audit any remaining control delta.

### Stop condition

After the reconciliation and one commit attempt, stop immediately. This
signal authorizes no `M-02`, `S-04`, `E-02`, `L-02`, `F-03`, `AU-02`, `I-01`,
`I-02`, `I-03`, or any other implementation/closure packet. The next step is
an independent Instructor audit and a new `HOLD` signal.

### Evidence limitations

Real configured News/Binance, PostgreSQL/Docker runtime, browser/demo runtime,
OpenSpec CLI, and link/DAG automation remain `UNVERIFIED` or `BLOCKED` where
applicable. Fixtures and skipped tests are not promoted to `PASS`.

## Historical INS-074 — Independent post-INS-073 audit hold

This is the current Instructor signal and supersedes `INS-073 /
APPROVED_FOR_EXECUTION`. The N-03A implementation and N-03 closure passed
independent review and were integrated at commit `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
Execution is now on HOLD because the latest Manager checkpoint still contains
one stale statement about the worker paths being uncommitted.

### Verified checkpoint

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
- The working tree was clean after the audited integration commit. The commit
  contains only the three reviewed N-03A News paths and the Manager-owned
  `TASKS.md`/`HANDOFF.md` checkpoint changes; the Instructor did not implement
  feature code.
- `TASKS.md` records `N-03A=DONE` and `N-03=DONE`; `M-02` remains
  `REVIEW/UNVERIFIED`; `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, and `I-03` remain `BLOCKED`.
- The INS-073 Manager and its single News worker are complete and archived;
  no Cryptox Manager, worker, duplicate, or retry is active.

### Independent evidence

- N-03A scheduler `5/5`, News `35/35`, Sentiment `19/19`, and public News API
  `3/3` passed.
- Root workspace tests passed `346` with `6` environment-gated skips; skips
  are not PASS evidence. Root/package typecheck, build, lint, architecture,
  artifacts, deferred-scope/checker, and diff checks exited successfully.
- The worker changed only `modules/news/application/scheduler.ts`,
  `modules/news/application/scheduler.spec.ts`, and the minimal scheduler
  export in `modules/news/api/bootstrap.ts`. No contracts, infrastructure,
  migration, dependency, or unrelated source path changed.

### Reconciliation required before the next feature authorization

- The latest `HANDOFF.md` correctly records the Manager's one staging failure,
  but its final sentence still says the reviewed worker paths remain
  uncommitted. That is stale after `f320b5f`.
- The Instructor will not edit `TASKS.md` or `HANDOFF.md`. A fresh Manager must
  receive a separate control-only authorization to reconcile those two files
  with the actual integrated commit, then stop. No feature implementation,
  retry, replacement, downstream promotion, `M-02`, `AU-02`, `I-01`, `I-02`,
  or deferred packet is authorized under this HOLD.

### Evidence limitations

Real configured News/Binance, PostgreSQL/Docker runtime, browser/demo runtime,
OpenSpec CLI, and link/DAG automation remain `UNVERIFIED` or `BLOCKED` where
applicable. Fixtures and skipped tests are not promoted to PASS.

## Historical INS-073 — N-03A News auto-refresh completion and N-03 closure

This replaceable signal supersedes `INS-072 / HOLD` and authorizes exactly one
fresh Manager and exactly one fresh News worker for the residual `N-03A`
completion packet. It authorizes no retry of the completed N-03 worker, no
other implementation, and no downstream start.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `1fda6ad`
  (`docs(control): approve N-03A refresh completion`). The parent Instructor
  reviewed the governance-only plan/decision delta and Git is clean.
- The operational board currently contains 32 `DONE`, 2 `REVIEW` (`M-02`,
  `N-03`), and 8 `BLOCKED` (`AU-02`, `S-04`, `I-01`, `I-02`, `E-02`, `L-02`,
  `F-03`, `I-03`) rows, 42 existing rows total. `N-03A` is newly planned in
  `MVP_PLAN.md` and must be added as a separate operational row by the Manager
  before it is executable.
- M-03 is `DONE` under INS-071 at `280b280`; C-02, C-03, Q-02, B-03,
  ENV-03, and ENV-04 remain `DONE`. N-03 source/business state remains at
  `d4161ec458c869ff18fa89dd9732df260629c915`; its safe-fetch, extraction,
  retention, provenance, and neutral Sentiment evidence is preserved, but its
  checkpoint explicitly records that only the 1–5 minute setting/default exists
  and no scheduler is implemented.
- `DEC-014` and `MVP_PLAN.md` now define N-03A as completion of the approved
  `CSL-R-NW-02` behavior. They do not expand product scope, reopen N-03 source
  history, or authorize downstream tasks. Real PostgreSQL, configured Binance
  and News providers, browser/demo runtime, link/DAG automation, and OpenSpec
  CLI evidence remain `UNVERIFIED` or `BLOCKED` where recorded. No unavailable
  check, fixture, or skipped test is treated as `PASS`.

### Authorized packet and delegation

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, with model
  `gpt-5.6-luna` and `xhigh` reasoning. It must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify this
  signal, the new N-03A plan/decision, Git, TASKS, HANDOFF, the DAG,
  dependencies, and active tasks.
- The Manager must add exactly one `N-03A` operational row to `TASKS.md` in
  `READY` state, with the packet's requirement IDs, dependencies, exact scope,
  and stop evidence. It must then move only N-03A through
  `READY -> IN_PROGRESS` before dispatching the worker. Existing N-03 remains
  `REVIEW` until the residual acceptance is proven; it must not be retried or
  moved to another state before then.
- Delegate exactly one fresh News worker after the READY/dependency check. The
  worker must use the canonical same-directory checkout, must not create a
  thread/worker, branch, worktree, commit, or control-plane edit, and must not
  edit `TASKS.md`, `HANDOFF.md`, `INSTRUCTOR.md`, `DECISIONS.md`,
  `MVP_PLAN.md`, requirements, ADRs, or OpenSpec artifacts. No retry,
  replacement, duplicate, or second worker is authorized.
- **Worker write scope:** `modules/news/api/**` excluding `contracts.ts` and
  contract-only tests; `modules/news/application/**`; and focused News
  scheduler tests in those boundaries. No infrastructure change is authorized;
  if the implementation genuinely requires one, stop and report
  `NEEDS_INSTRUCTOR_REVIEW`. No Sentiment, Strategy, frontend, backend
  composition root, contract, migration, dependency, credential, arbitrary
  URL, queue, distributed, or unrelated source change is authorized.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for the N-03A row, N-03 closure, review,
  and checkpoint. The Manager must preserve every unrelated task state and
  stop before S-04, E-02, L-02, F-03, I-01, I-02, I-03, AU-02, M-02, or any
  other packet.

### Acceptance and validation

- Implement a provider-neutral, application-owned, testable scheduler that
  accepts the existing configured 1–5 minute interval and five-minute default,
  invokes the existing public News collection at each interval, prevents
  overlapping collection runs, isolates a failed refresh so later ticks remain
  possible, and shuts down idempotently so no future tick runs. It must not
  perform direct remote fetching, persist timer state, log secrets, or create a
  queue/distributed worker protocol.
- Tests must cover cadence, default and invalid intervals, non-overlap, failure
  continuation, and shutdown using injected timer/clock seams. The public API
  must remain contract-compatible and later runtime integration must be able to
  consume the scheduler through the News boundary.
- The Manager must review exact changed paths and re-run the original N-03
  focused News/Sentiment tests plus N-03A tests, relevant public API tests,
  current checker and `scope:check`, architecture, artifacts, typecheck, build,
  lint, and `git diff --check`. Real configured News, PostgreSQL, browser/demo,
  OpenSpec CLI, and link/DAG automation remain `UNVERIFIED`/`BLOCKED` when
  unavailable; fixtures and skips are not live-provider evidence.
- If the residual evidence is complete, move N-03A through
  `IN_PROGRESS -> REVIEW -> DONE`, then move the existing N-03 exactly
  `REVIEW -> DONE` under this authorization and record both transitions. If a
  material premise is false, keep N-03A/N-03 at the safe state, record the
  exact blocker, and stop. Attempt one coherent Manager checkpoint commit
  containing only TASKS/HANDOFF; if Git staging/commit is denied, report it once
  and do not retry or broaden scope.
- The Manager must stop immediately after the N-03A review and optional N-03
  closure. No downstream promotion is implied by this instruction.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [ADR-009](../adr/ADR_009_controlled_llm_and_external_content.md)
- [News capability spec](../../openspec/specs/news/spec.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
