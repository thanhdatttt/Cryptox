<p align="center"><h1 align="center">CRYPTOX</h1></p>
<p align="center">
<em>SOFTWARE ARCHITECTURE & DESIGN — CRYPTO STRATEGY LAB</em>
</p>
<br>

## 🔗 Table of Contents

- [📍 Overview](#-overview)
- [👥 Team members](#-team-members)
- [📁 Project Structure](#-project-structure)
- [👾 Features](#-features)
- [🧭 Architecture Principles](#-architecture-principles)
- [🧰 OpenSpec - AI-driven Development](#-openspec---ai-driven-development)
- [📜 License](#-license)
---

# 📍 Overview

This project builds a platform to **add, combine, backtest, rank, and continuously search** crypto trading strategies, with news/sentiment as an auxiliary input signal. The grading target is the **software architecture** itself - extensibility, decoupling, scalability, and reproducibility - not the profitability of any strategy.

A set of Architectural Decision Records (ADRs) documents the reasoning behind the key design choices (WebSocket for realtime, Plugin Architecture for strategies, Job Queue for backtesting, Sentiment as a separate service).

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

# 📁 Project Structure

```
cryptox/                               ← Repository root
├── README.md
├── openspec/
│   ├── project.md
│   ├── specs/
│   │   ├── market-data/
│   │   ├── strategy-engine/
│   │   ├── strategy-plugins/
│   │   ├── composite-strategy/
│   │   ├── search-engine/
│   │   ├── backtesting/
│   │   ├── evaluation/
│   │   ├── leaderboard/
│   │   ├── continuous-loop/
│   │   ├── news-ingestion/
│   │   ├── sentiment/
│   │   ├── event-bus/
│   │   └── dashboard/
│   └── changes/                         ← Proposed changes (propose → apply → archive)
│
├── docs/
│   ├── design/                          ← Architecture, database design, data-flow docs
│   │   ├── architecture.md
│   │   ├── component-contracts.md
│   │   ├── database-design.md
│   │   ├── data-flow.md
│   │   └── project-structure.md
│   └── adr/                             ← Architectural Decision Records
│       ├── ADR-001-websocket-for-realtime.md
│       ├── ADR-002-plugin-architecture-for-strategies.md
│       ├── ADR-003-job-queue-for-backtesting.md
│       └── ADR-004-sentiment-as-separate-service.md
│
├── services/                         ← One folder per bounded context
│   ├── market-data/                  ← Exchange adapter + WebSocket fan-out
│   ├── strategy-engine/              ← Strategy interface, registry
│   │   └── plugins/                  ← MA, RSI, Bollinger, SR
│   ├── composite-strategy/           ← Vote/weighted composite strategies
│   ├── search-engine/                ← Random / domain-guided generators
│   ├── backtesting/                  ← Simulator + worker pool
│   ├── evaluation/                   ← Return, Win Rate, MDD, Sharpe, Profit Factor
│   ├── leaderboard/                  ← Ranking of experiment results
│   ├── continuous-loop/              ← generate→backtest→evaluate→rank orchestration
│   ├── news-ingestion/               ← Provider abstraction (RSS, NewsAPI, ...)
│   ├── sentiment/                    ← ML inference, isolated from crawler
│   └── event-bus/                    ← Event definitions + broker adapter                   
│
├── apps/
│   ├── backend/                        ← Composes services, exposes REST + WS
│   ├── backtest-worker/                ← Independently scalable deployable
│   └── frontend/                       ← Charts, strategy builder, leaderboard, news tab
│
├── packages/
│   ├── contracts/                      ← Signal, Candle, TradeResult, ...
│   └── queue-client/                   ← shared BullMQ/Redis adapter
│
├── infra/
│   ├── docker-compose.yml              ← DB, queue, all services
│   └── db/migrations/
│
└── .github/workflows/                  ← CI: lint, test, openspec validate
```

---

# 👾 Features

- 🔌 **Plugin-based strategies** — new indicator strategies (e.g. MACD) register via `StrategyRegistry.register(...)` with zero edits to existing engine code, proven end-to-end in `openspec/changes/0001-add-macd-strategy/`.
- 📡 **Realtime market data** — exchange adapter behind a `MarketDataPort`, streamed to the dashboard over WebSocket instead of polling `GET /price` in a loop.
- 🧩 **Composable strategies** — a Composite Strategy layer combines multiple signals (majority vote / weighted score) without any single strategy knowing about the others.
- 🔍 **Pluggable search engine** — random and domain-guided strategy-space search behind a common `StrategyGenerator` interface, swappable for genetic/Bayesian search later.
- 🧪 **Independent evaluation** — Return, Win Rate, Max Drawdown, Profit Factor, Sharpe Ratio computed by a dedicated Evaluation module, never inline in a strategy or the backtester.
- 🏆 **Leaderboard & reproducibility** — every ranked entry stores the exact strategy id, version, and parameters that produced it.
- ♻️ **Bounded continuous loop** — the generate → backtest → evaluate → rank pipeline runs with an explicit stop condition, not an unbounded `while(true)`.
- 📰 **Fault-isolated news & sentiment** — a separate sentiment service consumes news via a provider abstraction; if it fails, realtime charts and core trading flows are unaffected.
- 🖥️ **Business-logic-free dashboard** — the frontend renders data and dispatches commands only; all trading/backtesting/scoring logic stays server-side.

---

# 🧭 Architecture Principles

The following rules (defined in `openspec/project.md`) govern every change to
this codebase:

1. Strategies are pure — no I/O, no exchange calls, no DB, no rendering.
2. No hard-coded branching on strategy identity; new strategies self-register.
3. The frontend contains no business logic.
4. External systems (exchanges, news providers) are reached only through adapters behind ports.
5. Modules that don't own each other communicate via events, not direct calls.
6. Strategy definitions are versioned and never overwritten.
7. Search/backtesting at scale uses workers with bounded stop conditions.
8. Evaluation is separate from strategy and backtester implementation.
9. A failing auxiliary module (e.g. sentiment) must not take down core flows.

---

# 🧰 OpenSpec - AI-driven Development

This project is built spec-first with [OpenSpec](https://github.com/Fission-AI/OpenSpec):

```bash
openspec list            # active change proposals
openspec show <change>   # inspect a proposal
openspec validate <change>
```

Flow for any new feature: `/opsx:propose` → review `proposal.md` / `design.md`
/ `tasks.md` → `/opsx:apply` → verify → `/opsx:archive` (merges the delta spec
into `openspec/specs/`). See `openspec/changes/0001-add-macd-strategy/` for a
worked example.

---

# 📜 License

This project is developed for educational purposes only.

Copyright © 2026
All rights reserved by the project team.

This software may not be copied, modified, or distributed for commercial purposes without permission from the authors.