# Cryptox — Crypto Strategy Lab

Cryptox is a university Crypto Strategy Lab. The project demonstrates how
market data, strategies, bounded search, backtesting, evaluation, ranking,
News, Sentiment, Auth, and a frontend can fit into a defensible architecture;
it is not a real-money trading system.

This README is setup and navigation guidance. It does not turn a specification,
fixture, skipped test, or documentation statement into runtime evidence.

## Current status

The checkout contains TypeScript modules, application composition, REST and
market WebSocket contracts, a React/Vite frontend projection, PostgreSQL/Docker
helpers, and deterministic test/development fixtures. Some provider, database,
browser, and final integration evidence remains environment-dependent or
unverified. The backend can expose liveness while required dependencies are
missing, so this repository does not claim a verified consolidated final
end-to-end demo.

Start with the authority chain:

- [Reviewed requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [Conceptual data model](docs/data-model.md)
- [Accepted ADRs](docs/adr/)
- [Active capability specifications](openspec/specs/)
- [MVP implementation plan](docs/implementation/MVP_PLAN.md)
- [Contributor rules](AGENTS.md)

## Install and prerequisites

Use a Node.js/npm installation compatible with the checked-in
`package-lock.json`. The container definitions use Node 22, but the root
manifest does not pin a host Node.js version.

Docker Desktop or Docker Engine with Compose and a running daemon is required
for the local PostgreSQL helpers. Network and image availability are also
environment-dependent. A live/instructor run additionally needs access to real
Binance historical/realtime data and a configured real News provider. Keep all
credentials in the local environment or a secret manager; no credential value
belongs in this file.

From the repository root:

```text
npm install
```

## Run

The declared built-backend path is:

```text
npm run build
npm run start --workspace @cryptox/backend
```

The declared frontend development path is:

```text
npm run dev --workspace @cryptox/frontend
```

The backend also declares `npm run dev --workspace @cryptox/backend`, but that
script invokes `ts-node`, which is not declared by the backend manifest; treat
it as environment-dependent. The built start path above is the reproducible
repository path.

The backend exposes `/live` for process liveness and `/ready` for dependency
readiness. `/ready` is not-ready until required PostgreSQL, provider, and
application seams are available; an unavailable News provider is reported as
an optional degraded dependency. `/health` is not a current backend endpoint.
The [backend smoke script](scripts/smoke-backend.cjs) checks this boundary; it
is not a live-provider or final-demo proof.

## Local Docker/PostgreSQL setup

Use the repository helpers rather than inventing a separate database setup:

```text
npm run db:local:prepare
npm run db:local:validate
npm run db:local:reset-test
```

These commands are declared in the root manifest and call
[infra/db/local-postgres.cjs](infra/db/local-postgres.cjs). `prepare` creates
the ignored local database configuration when needed, starts the development
and test PostgreSQL services, waits for health, and runs migration validation.
`validate` repeats the migration up/constraint/down/remigrate validation.
`reset-test` resets test data while preserving the development database.

Docker/daemon availability is an explicit environmental dependency. If it is
unavailable, these commands are `BLOCKED`; no synthetic migration pass should
be reported. The helper's local database configuration is not a substitute for
providing `DATABASE_URL` to a separately started backend process, and its
generated credential must not be printed, copied, or committed.

## Architecture

Cryptox is a **synchronous modular monolith**:

| Location | Responsibility |
|---|---|
| `apps/` | Backend and frontend composition roots. |
| `modules/` | Business modules such as Auth, Market Data, Strategy, Search, Backtesting, Evaluation, Leaderboard, News, and Sentiment. Consumers use public module APIs. |
| `packages/` | Shared transport and technical contracts; `packages/contracts` owns REST and market WebSocket shapes. |
| `infra/` | Docker, PostgreSQL migrations, and operational/local-runtime helpers. |

Within a module, dependencies point from `api` to `application` to `domain`;
infrastructure implements application ports. Modules coordinate synchronously
through public APIs. Consumers must not deep-import another module's domain or
infrastructure.

REST handles Auth and frontend commands/queries, including historical market
data, progress/results, and News. The WebSocket boundary is market-only: it
delivers normalized realtime ticks, candles, and connection status. It is not a
general Event Bus. The frontend is a presentation projection: it renders
normalized state and sends commands, but does not own strategy signals,
backtest simulation, evaluation, or ranking logic.

The MVP backtest path is:

```text
Search or manual submission
  -> Backtest Execution Port
  -> Bounded Local Executor
  -> Backtester
  -> Evaluator
  -> Leaderboard
```

## Demo expectations and fixture boundaries

Fixtures and fakes are valid for deterministic unit/contract tests,
development, frontend decoupling, and failure/reconnect testing. The frontend
source contains development-only fixture modes; a fixture result must remain
labelled as fixture evidence.

Final/instructor-demo evidence must use all of the following:

- real configured Binance historical and realtime integrations;
- a real configured News source, currently the CoinDesk adapter;
- real PostgreSQL-backed application and Auth state; and
- Backtest and Leaderboard results generated by the application.

The final/demo configuration must not silently select fixtures. Missing
CoinDesk, PostgreSQL, LLM, browser, or other external evidence remains
`BLOCKED` or `UNVERIFIED`, as applicable; it is not a live PASS. The controlled
LLM authoring path is optional and provider-neutral: `LLM_AUTHORING_V1` requires
configuration, deterministic validation, and explicit user Save/Approve before
an immutable Strategy Definition is stored. It does not authorize autonomous
LLM behavior.

## Configuration names

Only names are listed here; supply values outside the README.

### Backend and providers

| Name | Used for |
|---|---|
| `DATABASE_URL` | PostgreSQL-backed backend Auth/application runtime and migrations where applicable. |
| `PORT` | Selecting the backend listener port. |
| `BINANCE_API_BASE_URL` | Optional Binance historical API base override. |
| `BINANCE_WS_URL` | Optional Binance realtime WebSocket URL override. |
| `COINDESK_API_KEY` | Credential name for the configured real CoinDesk News provider. |
| `COINDESK_BASE_URL` | Existing CoinDesk API base configuration read by the runtime. |
| `NEWS_REFRESH_INTERVAL_MINUTES` | Optional News refresh interval; accepted range is 1–5 minutes and the default is five. |
| `LLM_AUTHORING_ENDPOINT` | Configured OpenAI-compatible authoring endpoint. |
| `LLM_AUTHORING_MODEL` | Configured authoring model identifier. |
| `LLM_AUTHORING_API_KEY` | Server-side credential name for the controlled authoring adapter. |
| `BACKTEST_MAX_IN_FLIGHT` | Optional bound for concurrent local backtest executions. |
| `LEADERBOARD_SCOPE_ID` | Optional backend fallback for the public Leaderboard read. |

The three `LLM_AUTHORING_*` names are required together to compose the existing
controlled authoring provider. `GEMINI_*` is not a repository contract and is
not mapped to these names. Never place a key, password, token, connection
string, or other credential value in this README.

### Frontend variables used by current source

The frontend reads only the following `VITE_*` source/base/market and proxy
names:

| Name | Used for |
|---|---|
| `VITE_MARKET_SOURCE` | Development fixture or configured remote market mode. |
| `VITE_MARKET_REST_URL` | Remote market history REST base. |
| `VITE_MARKET_WS_URL` | Remote market WebSocket URL. |
| `VITE_AUTH_SOURCE` | Development fixture or remote Auth mode. |
| `VITE_AUTH_BASE_URL` | Auth REST base; the source defaults to a same-origin base when absent. |
| `VITE_FEATURE_SOURCE` | Development fixture or remote feature mode. |
| `VITE_FEATURE_BASE_URL` | Same-origin feature REST base. |
| `VITE_AUTH_PROXY_TARGET` | Vite development proxy target override. |
| `VITE_BACKEND_URL` | Vite proxy fallback used when the proxy override is absent. |

Remote market mode requires its REST and WebSocket URL variables. Fixture
selection is development-only. The browser never receives backend provider
credentials.

## Validation

The following root commands are declared by `package.json`:

```text
npm run build
npm run typecheck
npm test
npm run lint
npm run arch:check
npm run artifacts:check
npm run scope:check
npm run test:scope-check
npm run runtime:smoke
npm run verify:stage4a
```

`verify:stage4a` composes the root build, typecheck, test, architecture,
artifact, deferred-scope, and runtime-smoke gates. These commands validate the
current repository and declared boundaries; they do not by themselves prove a
live Binance/CoinDesk run, PostgreSQL/Auth demo, configured LLM call, browser
demo, or consolidated architecture scenarios. Environment-gated or unavailable
checks must remain `BLOCKED`/`UNVERIFIED`, never an inherited PASS. The
repository does not declare an OpenSpec CLI command; unavailable OpenSpec
validation is `UNVERIFIED`.

For this documentation change, also run `git diff --check` and review README
links, paths, and secret literals without reading any local secret-bearing
environment file.

## Approved scope and deferred scope

The approved MVP includes simple local email/password Auth V1 with a
PostgreSQL-backed opaque session, per-user ownership of private roots, pure and
registry-based strategies, bounded deterministic search, bounded local
backtesting, independent Evaluation and Leaderboard, normalized Market
Data/News with isolated Sentiment, and a frontend projection. Approved
extension profiles remain bounded and explicit: controlled
`LLM_AUTHORING_V1`, allowlisted backend News extraction with human-approved
templates, `WEIGHTED_VOTE_V1`, deterministic `SMC_LITE_V1` and
`WYCKOFF_LITE_V1`, seeded `RANDOM_V1`/`DOMAIN_GUIDED_V1`/`GENETIC_V1`,
synthetic Long/Short paper execution with bounded SL/TP, and ephemeral market
observability.

The following remain deferred and must not be inferred from historical source
or design material:

- enterprise identity or tenancy: RBAC, organizations/teams, tenant hierarchy,
  OAuth/SSO, 2FA, external identity providers, password reset, and enterprise
  IAM;
- live trading or generalized risk: exchange orders, leverage, margin, funding,
  liquidation, trailing stops, position sizing, portfolio optimization, or
  other live-risk behavior;
- autonomous or unconfigured LLM use, LLM-driven trading/search, arbitrary URL
  retrieval, and automatic extraction-template promotion;
- full professional/discretionary SMC or Wyckoff methodologies;
- unbounded, ML, Bayesian, reinforcement-learning, or agent-based search;
- Redis/BullMQ, separate distributed execution workers, leases/fencing,
  distributed reconciliation, or distributed retry protocols; and
- microservices, Kafka, a general Event Bus, CQRS, or Event Sourcing.

## Team

| Full name | Student ID | Role |
|---|---:|---|
| Pham Thanh Dat | 23127170 | Developer |
| Tran Khon Chi | 23127032 | Developer |
| Mai Xuan Hung | 23127372 | Developer |
| Nguyen Van Minh | 23127422 | Developer |
| Giao Thai Bao | 23127526 | Developer |

## License

Developed for educational purposes. Copyright © 2026 by the project team. The
software may not be copied, modified, or distributed commercially without the
team's permission.
