# Cryptox - Project Structure

## 1. Design Principles Behind This Layout

1. **OpenSpec is the target behavior source of truth.** The current repository contains design documents plus `openspec/config.yaml`; the `openspec/specs/`, implementation, and CI folders shown below are planned. As implementation begins, each backend capability maps to `services/<name>`, while `dashboard` maps to `apps/frontend`, and behavior changes go through `openspec/changes/<change>/` (propose → apply → archive).
2. **`services/` are internal modules/shared domain code, not independent microservices.** Per `docs/design/architecture.md` §1.1, backend modules are composed in `apps/backend`. `services/backtesting` contains queue-facing application ports/coordinator plus pure simulator code; cross-process payload DTOs remain only in `packages/contracts`. The backend composes the coordinator, while `apps/backtest-worker` composes the simulator together with the pure Strategy/Composite runtime. The API process never executes the simulation workload.
3. **Naming must match across capability, module, and contract boundaries.** A concept under `openspec/specs/<name>` normally uses the same language in `services/<name>` and `packages/contracts`. Two intentional UI/composition mappings are documented: `strategy-plugins` maps to `services/strategy-engine/plugins`, and `dashboard` maps to `apps/frontend`. Backtest queue payload names must also match between `apps/backend` and `apps/backtest-worker`.
4. **Shared contracts live in one place (`packages/contracts`), shared infra clients live in one place (`packages/*-client`).** No module should hand-roll a DTO or Redis/queue connection. Only the backend Backtest Coordinator and `apps/backtest-worker` use `queue-client`; the Coordinator owns QueueEvents adaptation, enqueue/completion reconciliation, terminal watchdog, and waiting-job cleanup. Search Loop submits work and requests post-cancel cleanup through the typed Coordinator interface, never through Redis/BullMQ directly. There is no general-purpose Event Bus client.

## 2. Target Top-Level Layout

```
cryptox/
├── README.md
├── openspec/
│   ├── config.yaml
│   ├── specs/
│   └── changes/
├── docs/
│   ├── design/
│   └── adr/
├── services/
├── apps/
├── packages/
├── infra/
└── .github/workflows/
```

| Folder | Purpose | Who/what reads it |
|---|---|---|
| `openspec/config.yaml` | Repository context and architectural guardrails (e.g. "Strategy never touches the DB", "no general Event Bus"). | Read before proposing or applying behavior changes. |
| `openspec/specs/<capability>/` | Current, agreed behavior for one bounded context — the acceptance criteria an implementation must satisfy. | Source of truth for both human review and AI code generation. |
| `openspec/changes/` | A change goes here as a proposal first (new/modified spec), gets reviewed, then is applied to `specs/` and archived. | Prevents an agent from silently changing behavior without it being visible as a diff to the spec. |
| `docs/design/` | Architecture narrative and diagrams (`architecture.md`, `component-contracts.md`, `data-model.md`, `data-flow.md`, this file). | Read once per session for context; not meant to be re-derived from code. |
| `docs/adr/` | One immutable record per significant decision, with the alternatives considered and why they were rejected. | Prevents an agent from re-proposing a rejected alternative (e.g. a general Event Bus without a new driver). |
| `services/` | Backend modules and pure domain logic. Most backend capabilities map here; the `dashboard` capability maps to `apps/frontend`. | See §3 layout. |
| `apps/` | Deployable entrypoints that compose services together. | See §4. |
| `packages/` | Code shared across services/apps: DTOs and thin infra client wrappers. | See §5. |
| `infra/` | Local dev environment and DB migrations. | |
| `.github/workflows/` | CI: lint, test, and `openspec validate` (specs and code must not drift). | |


## 3. Target Implementation Structure

```
cryptox/
├── README.md
├── openspec/
│   ├── config.yaml
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
│   │   └── dashboard/
│   └── changes/
│
├── docs/
│   ├── design/
│   │   ├── architecture.md
│   │   ├── component-contracts.md
│   │   ├── data-model.md
│   │   ├── data-flow.md
│   │   └── project-structure.md
│   └── adr/
│       ├── ADR_001_websocket.md
│       ├── ADR_002_plugin_architecture.md
│       ├── ADR_003_jobqueue.md
│       └── ADR_004_sentiment_isolated_module.md
│
├── services/
│   ├── market-data/
│   ├── strategy-engine/
│   │   └── plugins/                  ← MA, RSI, Bollinger, SR
│   ├── composite-strategy/           ← renamed from combination-engine
│   ├── search-engine/
│   ├── backtesting/
│   ├── evaluation/
│   ├── leaderboard/
│   ├── continuous-loop/
│   ├── news-ingestion/
│   └── sentiment/
│
├── apps/
│   ├── backend/                      ← main deployable
│   ├── backtest-worker/               ← independently scalable target deployable
│   └── frontend/
│
├── packages/
│   ├── contracts/                    ← Signal, Candle, Trade, BacktestResult, ...
│   └── queue-client/                  ← BullMQ adapter, used only for backtesting
│
├── infra/
│   ├── docker-compose.yml            ← target includes backend + independently scalable backtest-worker entries
│   └── db/migrations/
│
└── .github/workflows/                 ← lint, test, openspec validate
```
