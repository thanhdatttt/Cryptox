<p align="center"><h1 align="center">CRYPTOX</h1></p>
<p align="center">
<em>SOFTWARE ARCHITECTURE & DESIGN — CRYPTO STRATEGY LAB</em>
</p>
<br>

## 🔗 Table of Contents

- [📍 Overview](#-overview)
- [▶️ Run locally](#-run-locally)
- [👥 Team members](#-team-members)
- [📁 Target Project Structure](#-target-project-structure)
- [👾 Features](#-features)
- [🧭 Architecture Principles](#-architecture-principles)
- [🧰 OpenSpec - AI-driven Development](#-openspec---ai-driven-development)
- [📜 License](#-license)
---

# 📍 Overview

This project builds a platform to **add, combine, backtest, rank, and continuously search** crypto trading strategies, with news/sentiment as an auxiliary input signal. The grading target is the **software architecture** itself - extensibility, decoupling, scalability, and reproducibility - not the profitability of any strategy.

The chosen style is a **synchronous Modular Monolith with an asynchronous Backtest Worker Pool**. The frontend uses REST for commands and queries, a dedicated WebSocket only for realtime market data, and BullMQ only for dispatching/completing backtest work. There is no general domain Event Bus.

Architectural Decision Records (ADRs) capture the reasoning behind the key design choices: a module-first layered structure, a market-only WebSocket, Plugin Architecture for strategies, a Job Queue as the only asynchronous backend boundary, and an isolated Sentiment module.

---

## ▶️ Run locally

### Prerequisites

- [Node.js](https://nodejs.org/) 22 LTS or newer (npm is included)
- Git
- Docker Desktop or Docker Engine with Compose v2, when running the durable stack or Docker smoke workflow

No Binance API key or secret is required: Market Data uses Binance's public REST and WebSocket endpoints only. Durable `DEVELOPMENT` and `PRODUCTION` profiles require PostgreSQL, Redis, a strong `JWT_SECRET`, and the configured strategy model endpoint/name/key. `TEST` and `DEMO` are explicit non-durable compositions; there is no implicit JWT or persistence fallback in durable runtime.

The backend uses CoinDesk's official RSS News provider by default. Durable runtime uses the configured OpenAI-compatible strategy/sentiment adapter; deterministic `LOCAL_LEXICON` sentiment is restricted to explicit `TEST`/`DEMO` composition. Normal Compose mode explicitly selects the live Binance market provider. Market-data snapshots are created from persisted normalized and sealed candles. For a local launcher, set the provider and the documented public endpoints before starting the backend (internet access is required):

```powershell
$env:MARKET_DATA_PROVIDER = "BINANCE"
$env:MARKET_DATA_BINANCE_REST_URL = "https://api.binance.com"
$env:MARKET_DATA_BINANCE_WS_URL = "wss://stream.binance.com:9443"
```

`MARKET_DATA_BINANCE_REST_URL` and `MARKET_DATA_BINANCE_WS_URL` default to those same public Binance Spot URLs. They are backend-only variables; never expose them through `VITE_*` frontend configuration and never add API credentials.

### Install dependencies

From the repository root:

```bash
npm install
```

This repository supports **npm workspaces only**. Keep the committed `package-lock.json`; do not use pnpm or Yarn for this project.

### Development

Start the backend and Vite frontend together from the repository root:

```bash
npm run dev
```

For an offline presentation shell, opt into the explicit non-durable demo profile before starting:

```powershell
$env:RUNTIME_PROFILE = "DEMO"
npm run dev
```

The backend listens on `http://localhost:3000` and Vite prints its local URL (normally `http://localhost:5173`). The backend is compiled before it starts; rerun `npm run dev` after changing backend TypeScript. To run either process separately, use `npm run dev:backend` or `npm run dev:frontend` from the root.

### Build and start the backend

Build all workspaces and then start the backend from the repository root:

```bash
npm run build
npm start
```

The same commands work in Windows PowerShell, Command Prompt, macOS, and Linux. The launcher sets the compiled module resolution path in Node itself, not through shell-specific environment-variable syntax.

### Run the durable stack with Docker

Docker is the supported fresh-clone path for the durable runtime. PostgreSQL,
Redis, the backend, the backtest worker, and the production frontend run inside
Compose. Copy the template to the one root `.env` file, fill in private values,
and start the complete stack:

```bash
docker compose --env-file .env -f infra/docker-compose.yml up --build -d
```

`.env` is ignored by Git and `.env.example` contains placeholders only. The
Compose migration service applies all database migrations before the backend
and worker start. To stop the stack, use `docker compose --env-file .env -f
infra/docker-compose.yml down`; add `--volumes` only when intentionally
discarding the local PostgreSQL volume.

For host-process development, the same root `.env` must provide the durable
`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and strategy model settings; the
worker requires the first two. This is an advanced alternative to the
Docker-first setup above.

The durable path creates the users, versioned Strategy Library, normalized
market candle/snapshot, Backtesting input-snapshot/scope/candidate/attempt/
trade/experiment, durable queue-dispatch/fence, Search-run, Leaderboard, News,
Sentiment-result, and Sentiment-snapshot tables. A manual backtest first
commits its candidate and dispatch record to PostgreSQL, then publishes one
BullMQ job with `jobId = candidateId`. The independently runnable worker claims
the delivery under a database fence, persists retries and result records, and
returns a duplicate-safe terminal result. Search exposes bounded deterministic
`RANDOM`, `DOMAIN_GUIDED`, and `GENETIC` generators, with stable fingerprints
and lineage persisted in the Search Run/Candidate audit path and no LLM credentials required. News defaults to the concrete
`COINDESK_RSS` provider; durable Sentiment uses the configured model adapter and
persists its provenance.

The optional semantic HTML crawler is enabled only with `NEWS_PROVIDER=CRAWLER_LLM`. It requires `CRAWLER_SOURCE_URLS`, an OpenAI-compatible `CRAWLER_MODEL_ENDPOINT`, `CRAWLER_MODEL_NAME`, and `CRAWLER_LLM_API_KEY`; all request, HTML, output, candidate, and field bounds are validated at startup. The interpreter sends a strict JSON schema request with no tools and persists nothing when the model output is malformed. RSS remains independently usable when crawler settings are absent.

Browser clients never consume Binance payloads directly: they use authenticated REST and Socket.IO messages from the backend. If Binance is unavailable, the Market screen reports unavailable history and a disconnected/reconnecting upstream state instead of creating synthetic candles.

For deterministic offline/demo data, use the explicit Compose profile and provider override; it is not part of normal live startup:

```powershell
$env:MARKET_DATA_PROVIDER = "DEMO"
docker compose -f infra/docker-compose.yml --profile demo up --build -d
```

The `seed-dev-market` service requires `MARKET_DATA_SEED_MODE=DEMO` and is profile-gated. Return to live mode by setting `MARKET_DATA_PROVIDER=BINANCE` and starting Compose without the demo profile.

### Verify the project

Run these commands from the repository root before contributing:

```bash
npm test
npm run build
npm run lint
npm run arch:check
npm run check:generated
npm exec openspec -- validate --all --strict
npm run test:workflow
npm run smoke:backend
npm run smoke:dev
```

Run the isolated durable Docker workflow with:

```bash
npm run docker:smoke
```

The workflow allocates unused host ports, builds the complete Compose stack,
waits for service health, verifies PostgreSQL migrations and Redis, confirms the
backtest worker is queue-ready, exercises registration/login and one protected
Market Data request, loads the production-built frontend, and then removes only
its uniquely named containers, network, and volume. It uses non-secret model
configuration but does not invoke an external model or fetch market/news data.
Set `DOCKER_SMOKE_KEEP=1` to retain the isolated stack for troubleshooting.

The same workflow runs in `.github/workflows/docker-smoke.yml` for pushes and
pull requests.

The architecture check enforces the module boundaries described below. TypeScript
is canonical: source-tree JavaScript/declaration sidecars are not tracked, and
builds emit compiled output only under ignored `dist/` directories.
`npm run check:generated` rejects both tracked and untracked `.js`/`.d.ts`
sidecars beside module sources. If a package install becomes inconsistent,
remove only `node_modules`, run `npm install` again, then rerun the verification
commands.

---

# 👥 Team members

| Fullname | Student ID | Role |
|---|---|---|
| Pham Thanh Dat | 23127170 | Developer |
| Tran Khon Chi | 23127032 | Developer |
| Mai Xuan Hung | 23127372 | Developer |
| Nguyen Van Minh | 23127422 | Developer |
| Giao Thai Bao | 23127526 | Developer |

---

# 📁 Target Project Structure

The repository contains the completed implementation alongside its architecture/OpenSpec documents. The tree below shows the module layout and deployable composition roots.

```
cryptox/                               ← Repository root
├── README.md
├── openspec/
│   ├── config.yaml
│   ├── specs/
│   └── changes/                         ← Proposed changes (propose → apply → archive)
│
├── docs/
│   ├── design/                          ← Architecture, database design, data-flow docs
│   │   ├── architecture.md
│   │   ├── component-contracts.md
│   │   ├── data-model.md
│   │   ├── data-flow.md
│   │   └── tech-stack.md
│   │   └── project-structure.md
│   └── adr/                             ← Architectural Decision Records
│       ├── ADR_001_websocket.md
│       ├── ADR_002_plugin_architecture.md
│       ├── ADR_003_jobqueue.md
│       ├── ADR_004_sentiment_isolated_module.md
│       └── ADR_005_module_first_structure.md
│
├── modules/                          ← Business modules; not deployable processes
│   ├── market-data/                  ← Exchange adapter + market WebSocket boundary
│   ├── strategy/                     ← Strategy, registry, plugins, composites
│   ├── search/                       ← Generators + bounded search orchestration
│   ├── backtesting/                  ← Coordinator, worker runtime, completion
│   ├── evaluation/                   ← Return, Win Rate, MDD, Sharpe, Profit Factor
│   ├── leaderboard/                  ← Ranking of experiment results
│   ├── news/                         ← Provider abstraction (RSS, NewsAPI, ...)
│   └── sentiment/                    ← ML inference behind an explicit interface
│
├── apps/
│   ├── backend/                        ← Composes modules; exposes REST + market-only WS
│   ├── backtest-worker/                ← Independently scalable deployable
│   └── frontend/                       ← Charts, strategy builder, leaderboard, news tab
│
├── packages/
│   └── contracts/                      ← REST, WebSocket, and queue protocol contracts
│
├── infra/
│   ├── docker-compose.yml              ← DB, queue, and deployable apps
│   └── db/migrations/
│
└── .github/workflows/                  ← CI: quality gates plus Docker smoke
```

---

# 👾 Features

- 🔌 **Plugin-based strategies** — new indicator strategies (e.g. MACD) register via `StrategyRegistry.register(...)` without edits to the Backtester, Evaluator, Leaderboard, or frontend core.
- 📡 **Realtime market data** — exchange adapters normalize `MarketTick`/`Candle` contracts, streamed to the dashboard over WebSocket instead of polling `GET /price` in a loop.
- 🧩 **Composable strategies** — a Composite Strategy layer combines multiple signals (majority vote / weighted score) without any single strategy knowing about the others.
- 🔍 **Pluggable search engine** — bounded random, domain-guided, and genetic strategy-space generators behind a common `StrategyGenerator` interface.
- 🧪 **Independent evaluation** — Return, Win Rate, Max Drawdown, Profit Factor, Sharpe Ratio computed by a dedicated Evaluation module, never inline in a strategy or the backtester.
- 🏆 **Scoped Leaderboard & reproducibility** — every non-cancelled Candidate whose pipeline succeeds becomes a permanent scored Experiment; rank-eligible results appear in the Search Run ranking, while a persistent Top-10 compares Manual and Search Experiments only inside the same immutable benchmark scope and pins strategy/formula/data plus worker/evaluation runtime versions. Zero-trade results remain auditable but are not ranked.
- ♻️ **Bounded continuous loop** — the generate → backtest → evaluate → rank pipeline runs with an explicit stop condition, not an unbounded `while(true)`.
- ⚙️ **Focused asynchronous boundary** — only backtest dispatch/completion uses BullMQ; ordinary backend collaboration uses explicit in-process calls.
- 📰 **Fault-isolated news & sentiment** — the News Collector invokes Sentiment behind an explicit timeout/error boundary; if inference fails, realtime charts and core trading flows are unaffected.
- 🖥️ **Business-logic-free dashboard** — the frontend renders data and dispatches commands only. It uses REST for search progress, experiments, Leaderboard, and news; only market data uses WebSocket.

---

# 🧭 Architecture Principles

The following rules (defined in `openspec/config.yaml`) govern every change to
this codebase:

1. Strategies are pure — no I/O, no exchange calls, no DB, no rendering.
2. No hard-coded branching on strategy identity; new strategies self-register.
3. The frontend contains no business logic.
4. External systems (exchanges, news providers) are reached only through adapters behind ports.
5. Backend modules collaborate through explicit in-process interfaces. Asynchronous messaging is restricted to backtest job submission and completion/failure delivery.
6. Strategy definitions are versioned and never overwritten.
7. Search/backtesting at scale uses workers with bounded stop conditions.
8. Evaluation is separate from strategy and backtester implementation.
9. A failing auxiliary module (e.g. sentiment) must not take down core flows.
10. Inside each module, dependencies point `api → application → domain`; infrastructure implements application ports.
11. Modules collaborate through public APIs only; no deep imports into another module's domain or infrastructure.
12. `apps/` composes deployable processes, `packages/` contains reusable protocol/technical code, and `infra/` contains operational setup.
13. `backtesting` owns Candidate lifecycle/persistence; `search` owns Search Run orchestration only.
14. `news` owns News items, `sentiment` owns sentiment results/snapshots, and cross-module inputs use neutral contracts.
15. `packages/contracts/queue` is the canonical serialized Backtest wire schema; the BullMQ adapter remains inside Backtesting infrastructure.
16. Search consumes Backtesting Candidate projections and cancellation/submission facades; it never owns or writes Candidate persistence directly.

---

# 🧰 OpenSpec - AI-driven Development

This project is built spec-first with [OpenSpec](https://github.com/Fission-AI/OpenSpec):

```bash
openspec list            # active change proposals
openspec show <change>   # inspect a proposal
openspec validate <change>
```

Flow for any new feature: `/opsx:propose` → review `openspec/changes/<change>/proposal.md`, `design.md`,
and `tasks.md` → `/opsx:apply` → verify → `/opsx:archive` (merges the delta spec
into `openspec/specs/`).

---

# 📜 License

This project is developed for educational purposes only.

Copyright © 2026
All rights reserved by the project team.

This software may not be copied, modified, or distributed for commercial purposes without permission from the authors.
