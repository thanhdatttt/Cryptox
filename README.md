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

No environment file or external API credential is currently required for the local frontend and the composition-shell backend. Before deploying the backend, set a strong `JWT_SECRET`; a development-only fallback is used locally so the Auth routes can run without a `.env` file.

### Install dependencies

From the repository root:

```bash
npm install
```

### Start the frontend

```bash
npm run dev --workspace=@cryptox/frontend
```

Vite prints the local URL when it starts (normally `http://localhost:5173`). Use `npm run start --workspace=@cryptox/frontend` for the same server command without Vite's development alias.

### Build and start the backend

First build every workspace:

```bash
npm run build
```

On macOS or Linux, start the backend with:

```bash
npm run start --workspace=@cryptox/backend
```

The backend package's start script uses POSIX environment-variable syntax. On Windows PowerShell, use the following equivalent after the build:

```powershell
Set-Location apps/backend
$env:NODE_PATH = (Resolve-Path dist)
node .\dist\apps\backend\src\main.js
```

The application is still being implemented feature by feature. At this stage the frontend is a Vite shell and the backend is the Nest composition shell; live Binance/news integrations and the assignment screens are not yet complete.

### Verify the project

Run these commands from the repository root before contributing:

```bash
npm test
npm run build
npm run lint
npm run arch:check
```

The architecture check enforces the module boundaries described below. If a package install becomes inconsistent, remove only `node_modules`, run `npm install` again, then rerun the verification commands.

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

The repository contains the implementation in progress alongside its architecture/OpenSpec documents. The tree below shows the intended module layout; some adapters, endpoints, and assignment screens remain to be completed.

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
└── .github/workflows/                  ← CI: lint, test, openspec validate
```

---

# 👾 Features

- 🔌 **Plugin-based strategies** — new indicator strategies (e.g. MACD) register via `StrategyRegistry.register(...)` without edits to the Backtester, Evaluator, Leaderboard, or frontend core.
- 📡 **Realtime market data** — exchange adapters normalize `MarketTick`/`Candle` contracts, streamed to the dashboard over WebSocket instead of polling `GET /price` in a loop.
- 🧩 **Composable strategies** — a Composite Strategy layer combines multiple signals (majority vote / weighted score) without any single strategy knowing about the others.
- 🔍 **Pluggable search engine** — random and domain-guided strategy-space search behind a common `StrategyGenerator` interface, swappable for genetic/Bayesian search later.
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
