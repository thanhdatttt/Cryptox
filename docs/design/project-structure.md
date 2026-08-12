# Cryptox - Project Structure

## 1. Design Principles Behind This Layout

1. **OpenSpec is the source of truth.** Every folder under `services/` must have a matching capability under `openspec/specs/`. If a change touches behavior, it goes through `openspec/changes/` (propose → apply → archive) before code is written — this applies to human and AI contributors equally.
2. **`services/` are internal modules, not independent microservices.** Per the Modular Monolith decision in `01-technical-design.md` §1.1, everything under `services/` is composed together inside `apps/backend` at the process level. The one exception is `backtesting`, which is also composed into a second, independently-deployable entrypoint (`apps/backtest-worker`) — see §4.
3. **Naming must match across the three places a concept appears**: `openspec/specs/<name>`, `services/<name>`, and any event/topic name in `event-bus`. A mismatch here is exactly the kind of drift that causes an AI agent to "invent" a slightly different shape for the same concept in two different sessions.
4. **Shared contracts live in one place (`packages/contracts`), shared infra clients live in one place (`packages/*-client`).** No service should hand-roll its own copy of a DTO or its own Redis/queue connection logic.

## 2. Top-Level Layout

```
cryptox/
├── README.md
├── openspec/
│   ├── project.md
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
| `openspec/project.md` | The constitution: architectural rules that must never be violated (e.g. "Strategy never touches the DB", "Combination Engine never inspects a strategy's internal state"). | Read by every AI agent session before generating code. |
| `openspec/specs/<capability>/` | Current, agreed behavior for one bounded context — the acceptance criteria an implementation must satisfy. | Source of truth for both human review and AI code generation. |
| `openspec/changes/` | A change goes here as a proposal first (new/modified spec), gets reviewed, then is applied to `specs/` and archived. | Prevents an agent from silently changing behavior without it being visible as a diff to the spec. |
| `docs/design/` | Architecture narrative and diagrams (`architecture.md`, `component-contracts.md`, `data-model.md`, `data-flow.md`, this file). | Read once per session for context; not meant to be re-derived from code. |
| `docs/adr/` | One immutable record per significant decision, with the alternatives considered and why they were rejected. | Prevents an agent from re-proposing a rejected alternative (e.g. suggesting Kafka mid-session). |
| `services/` | One folder per bounded context / OpenSpec capability — the actual implementation. | See §3 mapping table. |
| `apps/` | Deployable entrypoints that compose services together. | See §4. |
| `packages/` | Code shared across services/apps: DTOs and thin infra client wrappers. | See §5. |
| `infra/` | Local dev environment and DB migrations. | |
| `.github/workflows/` | CI: lint, test, and `openspec validate` (specs and code must not drift). | |


## 3. Final Structure

```
cryptox/
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
│       ├── ADR-001-websocket-for-realtime.md
│       ├── ADR-002-plugin-architecture-for-strategies.md
│       ├── ADR-003-job-queue-for-backtesting.md
│       └── ADR-004-sentiment-as-separate-service.md
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
│   ├── sentiment/
│   └── event-bus/
│
├── apps/
│   ├── backend/                      ← main deployable
│   ├── backtest-worker/               ← NEW — independently scalable deployable
│   └── frontend/
│
├── packages/
│   ├── contracts/                    ← Signal, Candle, TradeResult, ...
│   └── queue-client/                  ← NEW — shared BullMQ/Redis adapter
│
├── infra/
│   ├── docker-compose.yml            ← now needs a `backtest-worker` service entry too
│   └── db/migrations/
│
└── .github/workflows/                 ← lint, test, openspec validate
```