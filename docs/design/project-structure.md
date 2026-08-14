# Cryptox - Project Structure

## 1. Design Principles Behind This Layout

1. **OpenSpec is the target behavior source of truth.** The current repository contains architecture/OpenSpec documents; the implementation layout below is the planned structure. Behavior changes go through `openspec/changes/<change>/` (propose → apply → archive) before implementation.
2. **Business modules live under `modules/`.** Cryptox is a synchronous Modular Monolith, not a collection of deployable microservices. Each module owns a business boundary and is composed inside `apps/backend`. The `backtesting` module is the only module with a second deployable composition in `apps/backtest-worker`.
3. **Layers make dependency direction explicit inside a module.** A module may contain `api`, `application`, `domain`, and `infrastructure`. These are logical layers, not a requirement to create empty folders. Domain code remains pure; infrastructure implements application ports; API adapters remain thin.
4. **Module boundaries are enforced by public APIs, not by folder names alone.** A module exposes an allowlisted runtime facade from `api/index` and an explicit composition/bootstrap facade from `api/bootstrap` when a process must wire its infrastructure. Other modules and apps may call those facades but may not import another module's `domain` or `infrastructure` internals directly.
5. **Deployables, reusable packages, and operations remain separate from business modules.** `apps/` contains process composition, `packages/` contains reusable protocols/technical libraries without business ownership, and `infra/` contains runtime/deployment setup and migrations.
6. **Shared contracts are deliberately narrow.** Domain entities remain in their owning module. `packages/contracts` contains REST, WebSocket, and queue protocol contracts that cross a process or public transport boundary. The Backtest queue adapter belongs to `modules/backtesting/infrastructure/queue` unless later evidence makes it a genuinely reusable technical package.

## 2. Target Top-Level Layout

```text
cryptox/
├── modules/                         ← business modules; not deployable processes
├── apps/                            ← deployable process composition
├── packages/                        ← reusable protocols and technical libraries
├── infra/                           ← local environment, migrations, operations
├── docs/                            ← architecture and ADRs
├── openspec/                        ← behavior source of truth and changes
└── README.md
```

| Folder | Purpose | Who/what reads it |
|---|---|---|
| `modules/<name>/` | One bounded business module with explicit layers and a public API. | Backend composition and other modules through the public API only. |
| `modules/<name>/api/` | Inbound adapters, the module's public facade/API contracts, and the allowlisted composition/bootstrap facade. | `apps/backend`, `apps/backtest-worker`, and permitted module consumers. |
| `modules/<name>/application/` | Use cases, module orchestration, transactions, and inbound/outbound ports. | Module API and composition roots. |
| `modules/<name>/domain/` | Entities, value objects, policies, invariants, and pure domain services. | The owning module's application layer and pure worker runtime where relevant. |
| `modules/<name>/infrastructure/` | Concrete repositories and external-system adapters implementing module ports. | The owning module's composition root only. |
| `apps/` | Deployable entrypoints that compose modules and start processes. | Deployment/runtime tooling. |
| `packages/` | Reusable code with no business ownership, especially wire contracts and technical libraries. | Multiple modules or deployable processes. |
| `infra/` | Docker, PostgreSQL migrations, seeds, deployment configuration, and observability setup. | Local development and operations. |
| `docs/design/` | Architecture narrative, diagrams, data model, flows, contracts, and this structure. | Human and AI contributors. |
| `docs/adr/` | Records of significant architectural decisions. Decision history is immutable; editorial path/terminology synchronization is allowed only when it does not change the decision. A semantic change requires a new accepted ADR that explicitly amends or supersedes the affected decision. | Human and AI contributors before proposing alternatives. |
| `openspec/config.yaml` | Project context and architectural guardrails. | OpenSpec proposal/apply workflows. |
| `openspec/specs/` | Agreed behavior for bounded capabilities once implementation begins. | Human review and AI code generation. |
| `openspec/changes/` | Proposals and implementation plans for behavior/architecture changes. | Review and later apply/archive workflows. |

## 3. Target Business Modules

```text
modules/
├── market-data/
├── strategy/                         ← strategy-engine + composite-strategy
├── search/                           ← search-engine + continuous-loop
├── backtesting/
├── evaluation/
├── leaderboard/
├── news/                             ← news-ingestion
└── sentiment/
```

### 3.1 Module ownership

| Module | Owns | Boundary rule |
|---|---|---|
| `market-data` | Candles, market ticks, dataset snapshots, exchange normalization | Raw exchange payloads never leave its infrastructure adapter. |
| `strategy` | Strategy Definitions, registry, plugin descriptors/artifacts, Composite Definitions, combination policies | Strategies are pure; composite logic sees normalized signals only. |
| `search` | Search Runs, generators, stop conditions, slot reservation, pause/resume/cancel | Submits work through `backtesting/api`; never touches BullMQ directly. |
| `backtesting` | Candidate aggregate/lifecycle, Candidate projections, Attempts, Trades, queue boundary, worker simulation/completion lifecycle, MVP Experiment completion | The only module allowed to own BullMQ integration; Search consumes Candidate APIs and never owns Candidate persistence. |
| `evaluation` | Metric calculation and finite/edge-case policy | Pure evaluator; no strategy or infrastructure dependency. |
| `leaderboard` | Score formulas, benchmark scopes, Top-10 admission, ranking reads | Owns `LeaderboardScope` persistence, scope locking, and ranking invariants. |
| `news` | News providers, normalized News Items, News collection and NewsItem persistence | Invokes Sentiment through a neutral input; Sentiment failure does not discard collected news. |
| `sentiment` | Sentiment input/result API, result persistence, model provenance, and sealed sentiment snapshots | Owns `sentiment_results` and snapshot persistence; called by News through a typed interface with timeout/error isolation. |

`ExperimentResult` and the Completion Processor remain in `backtesting` for the MVP. This keeps the completion transaction near the asynchronous boundary while Evaluation and Leaderboard expose pure/public services. A dedicated `experiment` module may be introduced later if the aggregate grows beyond this responsibility.

## 4. Layer Rules

```text
api → application → domain

infrastructure → implements application ports
```

### `api`

Contains inbound adapters and the module's public facade. REST controllers, the market WebSocket adapter, and typed in-process interfaces belong here. API code translates input into application commands/queries and remains thin.

### `application`

Contains use cases, module-level orchestration, transaction boundaries, and ports. It may depend on the module's domain and on public APIs of other modules, but not on concrete infrastructure implementations.

### `domain`

Contains entities, value objects, policies, invariants, pure domain services, and plugin/runtime logic. It must not depend on HTTP, PostgreSQL, Redis, BullMQ, exchange SDKs, framework code, or UI code.

### `infrastructure`

Contains concrete adapters for repositories, exchanges, Redis, sentiment models, queue clients, and runtime artifact resolution. Other modules must not import this layer directly.

Not every module needs all four layers. Do not create empty folders for symmetry.

## 5. Module Dependency Rules

Allowed examples:

```text
search/application
  → backtesting/api

backtesting/application
  → strategy/api
  → evaluation/api
  → leaderboard/api
  → market-data/api (snapshot read contract)

news/application
  → sentiment/api
```

Forbidden examples:

```text
search → backtesting/infrastructure
leaderboard → evaluation/infrastructure
any domain → PostgreSQL/Redis/BullMQ/HTTP
apps/backend → modules/*/infrastructure/* or modules/*/domain/*
```

Each module exposes an allowlisted runtime facade and, when required by a deployable process, an allowlisted bootstrap facade. Consumers import those entrypoints or an approved API contract, never deep paths into another module's domain or infrastructure.

### 5.1 Public API and composition matrix

The following is the planning-level export matrix. Names describe the intended public surfaces; implementation may choose equivalent TypeScript symbols only if the boundary and responsibility remain unchanged.

| Module | Runtime public API | Composition/bootstrap API | Primary consumers |
|---|---|---|---|
| `market-data` | `readCandles`, `readDatasetSnapshot`, `subscribeMarketData` | `createMarketDataModule` | Backend API/WebSocket, Backtesting |
| `strategy` | `listStrategies`, `resolveStrategy`, `combineSignals` | `createStrategyModule` | Backend API, Search, Backtesting, Worker |
| `search` | `start`, `pause`, `resume`, `cancel`, `status`, `leaderboard` | `createSearchModule` | Backend API/composition |
| `backtesting` | `startManual`, `createBenchmarkScope`, `submitSearchCandidate`, `status`, `cancelSearchCandidates`, `cancelManualCandidate` | `createBacktestingModule`, `processTerminalSignal`, `reconcile`, `removePendingJobs` | Backend API, Search, Worker composition |
| `evaluation` | `evaluate` | `createEvaluationModule` when infrastructure/provenance is needed | Backtesting completion |
| `leaderboard` | `score`, `submit`, `readScope`, `readSearchRunRanking` | `createLeaderboardModule` when repositories are wired | Backtesting completion, Backend API |
| `news` | `collect`, `readNews` | `createNewsModule` | Backend API/composition |
| `sentiment` | `analyze`, `createSnapshot`, `readSnapshot` | `createSentimentModule` | News, Backtesting scope composition |

`apps/backend` and `apps/backtest-worker` may import only these public facades/bootstrap APIs and transport contracts. The bootstrap facade is the module-owned exception that constructs or receives concrete infrastructure adapters; apps never reach into `infrastructure/*` directly. `backtesting.createBenchmarkScope` owns the scope-composition workflow: it requests an optional sealed snapshot from Sentiment and asks Leaderboard to persist the immutable `LeaderboardScope`; Leaderboard remains the owner of the scope aggregate/table and locking rules. The matrix is a boundary contract, not an implementation file mandate.

## 6. Deployables, Packages, and Infrastructure

### 6.1 `apps/`

```text
apps/
├── backend/
├── backtest-worker/
└── frontend/
```

- `apps/backend` starts HTTP/WebSocket, calls each module's public bootstrap facade, and starts reconciliation. It contains no business use cases and does not import module infrastructure directly.
- `apps/backtest-worker` calls the Backtesting and Strategy bootstrap facades, wires the worker handler, pure Strategy/Composite runtime, and queue transport. It does not import module infrastructure directly.
- `apps/frontend` renders the UI and talks to Backend through REST and the market WebSocket.

### 6.2 `packages/`

```text
packages/
└── contracts/
    ├── rest/
    ├── websocket/
    └── queue/
```

Only reusable code without business ownership belongs here. Domain entities remain in their owning module. The canonical serialized Backtest queue schema belongs under `packages/contracts/queue`; the BullMQ adapter belongs under `modules/backtesting/infrastructure/queue`.

### 6.3 `infra/`

```text
infra/
├── docker-compose.yml
└── db/migrations/
```

`infra/` contains environment and operations setup. Runtime repositories and external-system adapters remain under each module's `infrastructure` layer.

## 7. Process Composition

```text
apps/backend
  ├── compose market-data
  ├── compose strategy
  ├── compose search
  ├── compose backtesting coordinator/completion
  ├── compose evaluation
  ├── compose leaderboard
  ├── compose news/sentiment
  └── expose REST + market WebSocket

apps/backtest-worker
  ├── compose backtesting worker handler
  ├── compose strategy/composite pure runtime
  └── consume BullMQ jobs
```

The runtime semantics remain unchanged: REST handles commands/queries, the market WebSocket handles market realtime only, BullMQ is the only asynchronous backend boundary, and PostgreSQL remains authoritative.

## 8. OpenSpec and Implementation Order

The planned OpenSpec capabilities should map to business modules. `strategy-plugins` maps to `modules/strategy/domain/plugins`; `dashboard` maps to `apps/frontend`; queue payloads must match between `apps/backend` and `apps/backtest-worker` through the canonical `packages/contracts/queue` schema and Backtesting transport adapter.

When implementation starts, establish public module entrypoints and architecture tests first. Then migrate in dependency order: Market Data/Strategy foundations, Evaluation/Leaderboard policies, Backtesting, Search, News/Sentiment, and finally application composition/integration wiring.
