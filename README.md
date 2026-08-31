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
Copy-Item .env.example .env       # PowerShell; use cp on POSIX shells
```

The second command creates the ignored, user-owned root `.env`. Edit that
local copy for the run mode you need. The example contains public defaults and
empty server-only credential fields; no value from the local file belongs in
Git. The built backend's `start` script optionally loads this root file
through Node 22's supported env-file flag. A host-run backend needs a local
`DATABASE_URL`; the example intentionally does not contain a database
connection string. Docker Compose composes its own internal database URL and
does not require a Docker-host `DATABASE_URL` entry.

## Run

The declared built-backend path is:

```text
npm run db:local:prepare
npm run build
npm run start --workspace @cryptox/backend
```

For this host-run path, set `DATABASE_URL` in the ignored root `.env` to the
local development database before starting the backend. The backend keeps
provider credentials and database values server-side.

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

After `prepare`, the complete local Compose stack can be started from the
repository root with the generated password file later in the interpolation
order:

```text
docker compose --env-file .env --env-file infra/db/local.env -f infra/docker-compose.yml up --build
```

Compose passes the ignored root `.env` only to `backend` at runtime. The
backend's `DATABASE_URL` is explicitly composed as the `postgres-dev` service
URL from the generated password, so it overrides any manually supplied
Docker-host value. `backend` waits for the healthy `postgres-dev` service;
`postgres-test` remains separate and is used by the explicit helper validation
and reset flow. Compose does not run hidden migrations: run `prepare` or
`validate` explicitly before the application stack.

The frontend image receives only explicit public `VITE_*` build/runtime
settings. It does not receive the root `.env` wholesale, database credentials,
or provider credentials. The local Compose defaults use the same-origin REST
proxy and the host-mapped backend WebSocket.

Docker/daemon availability is an explicit environmental dependency. If it is
unavailable, these commands are `BLOCKED`; no synthetic migration pass should
be reported. The helper's local database configuration is not a substitute for
providing a host-run `DATABASE_URL`, and its generated credential must not be
printed, copied, or committed. The helper passes the optional root `.env`
interpolation file and the generated `infra/db/local.env` to Compose when the
root file exists; it never prints their contents.

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
- a real configured News source. The approved no-API-key path is CoinDesk RSS;
  the existing CoinDesk JSON adapter remains an explicit compatibility path;
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

The complete placeholder set is in [.env.example](.env.example). Copy it to
the ignored root `.env` and supply values there, or through a secret manager.
Values below are names and behavior only; no credential value is documented.

### Server-only backend and providers

| Name | Used for |
|---|---|
| `NODE_ENV` | Backend environment selection, including deployed cookie behavior. |
| `PORT` | Selecting the backend listener port. |
| `AUTH_COOKIE_SECURE` | Optional local/deployed Auth cookie Secure override. |
| `DATABASE_URL` | PostgreSQL-backed backend Auth/application runtime and host-run migrations where applicable; Compose overrides it internally. |
| `GIT_COMMIT` | Optional application/code provenance value. |
| `BACKTEST_MAX_IN_FLIGHT` | Optional bound for concurrent local backtest executions. |
| `LEADERBOARD_SCOPE_ID` | Optional backend fallback for the public Leaderboard read. |
| `BINANCE_API_BASE_URL` | Optional Binance historical API base override. |
| `BINANCE_WS_URL` | Optional Binance realtime WebSocket URL override. |
| `COINDESK_API_KEY` | Credential name for the explicitly selected legacy CoinDesk JSON provider. |
| `COINDESK_BASE_URL` | Existing CoinDesk JSON API base configuration read by the runtime. |
| `COINDESK_RSS_URL` | Configured CoinDesk RSS feed URL. |
| `COINDESK_RSS_ALLOWED_HOSTS` | Comma/newline-separated HTTPS host allowlist for that RSS source. |
| `COINDESK_RSS_ALLOWED_URL_PREFIXES` | Optional HTTPS URL-prefix allowlist for that RSS source. |
| `COINDESK_RSS_ALLOWED_URLS` | Optional exact HTTPS URL allowlist for that RSS source. |
| `NEWS_REFRESH_INTERVAL_MINUTES` | Optional News refresh interval; accepted range is 1–5 minutes and the default is five. |
| `LLM_AUTHORING_ENDPOINT` | Provider-neutral OpenAI-compatible authoring endpoint. |
| `LLM_AUTHORING_MODEL` | Configured authoring model identifier. |
| `LLM_AUTHORING_API_KEY` | Server-side credential name for the controlled authoring adapter. |

The RSS URL must use HTTPS and be covered by at least one explicit host,
prefix, or exact-URL allowlist entry. The safe backend adapter sends no
credentials. The official CoinDesk RSS configuration in `.env.example` is a
configuration template, not live-provider evidence. The legacy JSON path is
selected only when its existing `COINDESK_*` configuration is explicitly
present; an unconfigured or unsafe source does not select fixtures.

Gemini compatibility is provider-neutral: put Google's OpenAI-compatible
endpoint in `LLM_AUTHORING_ENDPOINT`, its model identifier in
`LLM_AUTHORING_MODEL`, and the local credential in `LLM_AUTHORING_API_KEY`.
`GEMINI_*` is not a repository alias, and no native Gemini SDK or automatic
provider fallback is configured.

### Public frontend variables

Only the following public `VITE_*` names may influence the frontend:

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
| `VITE_BACKEND_URL` | Vite proxy fallback when the proxy override is absent. |

`apps/frontend/vite.config.ts` loads the repository-root `.env` with the
`VITE_` prefix only and keeps the Vite public prefix explicit. The Docker
frontend build and runtime pass only the public settings above; server-only
names such as `LLM_AUTHORING_API_KEY`, `DATABASE_URL`, and local PostgreSQL
credentials are not frontend build arguments, container environment, bundle
inputs, or browser runtime values.

Remote market mode requires its REST and WebSocket URL variables. The example
uses `/api` for REST and the host-mapped backend WebSocket; adjust only public
`VITE_*` values for another local topology. Fixture selection is
development-only and must not be silently used for final/demo evidence.

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
live Binance/CoinDesk run, PostgreSQL/Auth demo, configured LLM/Gemini call,
browser demo, Docker daemon run, or consolidated architecture scenarios.
Environment-gated or unavailable checks must remain `BLOCKED`/`UNVERIFIED`,
never an inherited PASS. The repository does not declare an OpenSpec CLI
command; unavailable OpenSpec validation is `UNVERIFIED`. This configuration
packet makes no live CoinDesk, Gemini, browser, Docker, or OpenSpec claim.

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
