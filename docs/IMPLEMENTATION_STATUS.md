# Implementation Status

## Current state — 2026-08-31

- Branch: `implement`
- `MISSING_FEATURE_2.md`: implementation phases complete; final repository validation is recorded below.
- Authority: OpenSpec specifications first, then the assignment/reference material. The assignment PDF is not present in this checkout; its checked-in Markdown companion and supplied images remain secondary evidence.
- Runtime boundary: `TEST`/`DEMO` are explicit non-durable compositions. `DEVELOPMENT`/`PRODUCTION` require PostgreSQL, Redis, `JWT_SECRET`, and configured strategy model settings. Durable Compose now passes those settings through explicit environment interpolation.
- Secrets: no `.env` file, JWT secret, model API key, or other credential is committed. `.env.example` contains only safe templates and commented credential slots.

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

- `npm test`: PASS — 193 tests, including the four deterministic seed tests.
- `npm run build`: PASS across all workspaces, including the Vite production build.
- `npm run lint`: PASS — all workspace TypeScript checks.
- `npm run arch:check`: PASS — 740 modules and 1,294 dependencies, with no violations.
- `npm run test:workflow`: PASS — 2 launcher tests.
- `npm run smoke:backend`: PASS — compiled backend health and complete route registration under explicit DEMO composition.
- `npm run smoke:dev`: PASS — backend plus Vite launcher health under explicit DEMO composition.

The required local checks are:

```text
npm test
npm run build
npm run lint
npm run arch:check
npm run test:workflow
npm run smoke:backend
npm run smoke:dev
```

The production-source audit covers default secrets, `OPENAI_API_KEY`, static
fake hashes, epoch timestamps, unsupported provider placeholders, deterministic
Search stubs, silent durable fallbacks, and unavailable UI controls.

`docker compose -f infra/docker-compose.yml config --quiet` passes with
non-secret validation environment values. A live `docker compose up --build -d`
attempt was blocked because the Docker Desktop Linux engine named pipe was not
available in this environment; Docker Desktop was launched once and the engine
remained unavailable. Therefore no claim is made here for a new PostgreSQL,
Redis, migration, backend, or worker container run. The Compose graph and all
non-container repository checks remain verifiable independently.

## Focused commit ledger

The implementation commits are recorded in `docs/IMPLEMENTATION_PLAN.md`. The
latest code hardening commits are `f39ed8f` (`fix(provenance): remove
production placeholders`) and `6500d6f` (`fix(search): remove fallback
identifier`). Documentation and Compose reconciliation is kept in the final
documentation commits after the full validation pass.

## Known non-blocking constraints

- The assignment PDF is unavailable in this checkout; the Markdown companion and images were used for secondary traceability.
- Docker Desktop is installed but its Linux engine was unavailable during the final container attempt.
- Dependency audit findings, if reported by npm, are separate from the implementation contract and should be reviewed during dependency maintenance.
