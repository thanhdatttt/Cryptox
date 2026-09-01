# Implementation Status

## Current state — 2026-09-01

- Branch: `implement`
- `MISSING_FEATURE_2.md`: implementation phases complete; final repository validation is recorded below.
- Authority: OpenSpec specifications first, then the assignment/reference material. The assignment PDF is not present in this checkout; its checked-in Markdown companion and supplied images remain secondary evidence.
- Runtime boundary: `TEST`/`DEMO` are explicit non-durable compositions. `DEVELOPMENT`/`PRODUCTION` require PostgreSQL, Redis, `JWT_SECRET`, and configured strategy model settings. Durable Compose now passes those settings through explicit environment interpolation.
- Secrets: no `.env` file, JWT secret, model API key, or other credential is committed. `.env.example` contains only safe templates and commented credential slots.
- Generated artifacts: TypeScript is canonical; source-tree JavaScript/declaration sidecars are removed and compiled output is emitted only beneath ignored `dist/` directories. The generated-artifact check covers both tracked and untracked sidecars.

## Completed implementation

### Runtime and composition

Runtime profiles validate required infrastructure and bounded operational settings
without exposing values. Durable backend composition uses PostgreSQL repositories,
Redis latest-value/cache and BullMQ, while explicit TEST/DEMO composition owns
deterministic adapters and in-memory test doubles. The worker is an independent
PostgreSQL/Redis process and does not own completion or ranking business logic.

### Strategy, generation, and provenance

The Strategy Registry exposes versioned MA, RSI, Bollinger, Support/Resistance,
and INFORMATION/Sentiment plugins. Parameters, history requirements, composites,
visualization overlays, owner scope, and exact retained-artifact resolution are
validated through the public Strategy API. Durable generation uses the configured
OpenAI-compatible model adapter with bounded public-source loading, schema and
domain validation, typed failures, and atomic definition/composite/audit writes.
Schema-invalid model output is classified separately from model availability/timeouts;
retryable 429/5xx failures use bounded exponential backoff with jitter and one total
request deadline.
Plugin hashes are derived from the executable factory artifact rather than a
manually embedded identity string.

### Market Data, News, and Sentiment

Market Data normalizes Binance REST/WebSocket data, persists closed candles and
content-hashed snapshots, keeps Redis non-authoritative, and exposes backend-owned
pair/timeframe capabilities and connection state. News defaults to the concrete
CoinDesk RSS adapter; unsupported or incompletely configured providers fail at
composition instead of returning a throwing placeholder. Durable Sentiment uses
the configured model adapter; deterministic `LOCAL_LEXICON` is limited to
TEST/DEMO composition. News failures do not fabricate records, and immutable
Sentiment results/snapshots retain model and content provenance.

### Backtesting, Evaluation, Leaderboard, and Search

Manual and Search Candidates are durable asynchronous jobs. PostgreSQL records
sealed inputs, immutable scopes and execution-policy snapshots, dispatch state,
attempt leases/fences, retries, terminal recovery, trades, completion claims,
Experiments, evaluation metrics, ranking, and replay-verification results.
Evaluation handles edge cases with finite metrics. Runtime fingerprints are
derived from the loaded simulator, evaluator, and backtest service artifacts.
Search has distinct bounded `RANDOM`, `DOMAIN_GUIDED`, and `GENETIC` generators,
durable lifecycle controls, owner-scoped pagination, and cancellation/recovery.
INFORMATION runs pin and replay the exact aligned Sentiment snapshot.

### Frontend

The frontend is a presentation/transport client. It validates REST DTOs, owns
session/query/socket state, follows backend capabilities for pairs, timeframes,
signals, policy defaults, and provenance, and contains no strategy, ranking,
backtest, or sentiment inference. Market panels update candles incrementally and
reconcile authoritative REST history before bounded reconnect completion. Deep
links cover authenticated experiment and Search views. Search ranking is kept
distinct from persistent scope Top-10; Experiment and Trade views expose
economics, risk, policy, benchmark, runtime, strategy, and replay provenance.

## Traceability

`docs/REQUIREMENTS_MAP.md` marks R-01 through R-15 as implemented and identifies
their test evidence. `docs/design/data-model.md` documents ownership, immutable
provenance, queue state, replay inputs, and the runtime capability-default
boundary. `docs/IMPLEMENTATION_PLAN.md` records the ordered feature ledger and
focused commits. OpenSpec remains the normative behavior specification.

## Validation evidence

Final local validation passed as follows:

- `npm test`: PASS — 218 tests, including the four deterministic seed tests.
- `npm run build`: PASS across all workspaces, including the Vite production build.
- `npm run lint`: PASS — all workspace TypeScript checks.
- `npm run arch:check`: PASS — 655 modules and 1,174 dependencies, with no violations.
- `npm run check:generated`: PASS — no source-tree `.js`/`.d.ts` sidecars.
- `npm exec openspec -- validate --all --strict`: PASS — both completed changes validate.
- `npm audit --audit-level=high`: PASS — zero vulnerabilities after compatible dependency updates.
- `npm run test:workflow`: PASS — 3 launcher tests.
- `npm run smoke:backend`: PASS — compiled backend health and complete route registration under explicit DEMO composition.
- `npm run smoke:dev`: PASS — backend plus Vite launcher health under explicit DEMO composition.
- `npm run docker:smoke`: PASS — a fresh Compose stack brought up PostgreSQL, Redis, migrations 001–019, backend, worker, and frontend; durable registration/login/me and a protected Market Data request succeeded; the isolated containers, network, and volume were then removed.

The required local checks are:

```text
npm test
npm run build
npm run lint
npm run arch:check
npm run check:generated
npm exec openspec -- validate --all --strict
npm audit --audit-level=high
npm run test:workflow
npm run smoke:backend
npm run smoke:dev
npm run docker:smoke
```

The production-source audit covers default secrets, `OPENAI_API_KEY`, static
fake hashes, epoch timestamps, unsupported provider placeholders, deterministic
Search stubs, silent durable fallbacks, and unavailable UI controls.

`docker compose --env-file .env -f infra/docker-compose.yml config --quiet` passes,
and the complete isolated Docker smoke run succeeds with non-production test
values. It verifies all 19 migrations, durable authentication, Redis, worker
readiness, frontend serving, and cleanup without invoking an external model or
fetching live market/news data.

## Focused commit ledger

The historical implementation commits are recorded in `docs/IMPLEMENTATION_PLAN.md`.
No commit or push was performed during this completion pass; the current
worktree changes are intentionally left available for review.

## Known non-blocking constraints

- The assignment PDF is unavailable in this checkout; the Markdown companion and images were used for secondary traceability.
- The Vite toolchain still emits its non-blocking CJS Node API deprecation warning during tests and builds.
- The OpenSpec CLI reports a non-blocking telemetry flush warning when outbound network access is restricted.
- The built-in live browser connection could not initialize on this Windows host because its sandbox helper failed before a page could be inspected; desktop/mobile auth QA therefore remains a manual follow-up.
