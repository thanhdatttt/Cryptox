# Cryptox - Crypto Strategy Lab

Cryptox is a university project for experimenting with extensible crypto-trading
strategies. The grading focus is software architecture: provider isolation,
strategy extensibility, bounded search, reproducible backtesting, evaluation,
ranking, visualization, news, and sentiment—not real-money profitability.

## Current status

The repository contains a TypeScript monorepo scaffold, public API/type surfaces,
placeholder tests, and architecture/specification material. Most business APIs
still throw `NOT_IMPLEMENTED`, the frontend is a placeholder, and there is no
verified end-to-end demo. Documentation describes the approved target while
explicitly distinguishing it from the current implementation.

The instructor assignment is the highest authority. Start here:

1. [Reviewed requirements](docs/requirements.md)
2. [Architecture](docs/architecture.md)
3. [Conceptual data model](docs/data-model.md)
4. [Architectural decisions](docs/adr/)
5. [Active capability specifications](openspec/specs/)
6. [Contributor rules](AGENTS.md)

## Approved architecture

The target is a **Synchronous Modular Monolith**. Business modules collaborate
through public in-process APIs. REST handles commands and queries; WebSocket is
restricted to realtime market delivery. Backtests target a bounded local executor
behind a replaceable execution port. Distributed queue/worker infrastructure is a
future evolution option, not an MVP requirement.

See [docs/architecture.md](docs/architecture.md) for module responsibilities,
dependency directions, flows, failure isolation, observability, and evolution.

## Repository navigation

| Path | Purpose |
|---|---|
| `apps/` | Backend, frontend, and historical worker composition scaffolds |
| `modules/` | Business modules and their public APIs |
| `packages/` | Shared transport/technical contracts |
| `infra/` | Current database and local runtime scaffolding; not the approved MVP topology definition |
| `docs/` | Assignment, requirements, architecture, data model, ADRs, and later-stage backlog |
| `openspec/specs/` | Concise active capability specifications |
| `openspec/changes/archive/` | Historical, non-authoritative change records |

## Install and repository checks

Prerequisite: a current Node.js/npm environment compatible with the checked-in
lockfile.

```bash
npm install
npm run build
npm test
npm run lint
npm run arch:check
```

These are the commands declared by the repository manifests. They validate the
current scaffold; they do not prove that the product capabilities are implemented.
Stage 2 did not repair or change dependencies, scripts, tests, or architecture-check
configuration. Any unavailable or failing command must be reported as
`BLOCKED`/`UNVERIFIED`, never treated as a pass.

The frontend manifest currently exposes:

```bash
npm run dev --workspace @cryptox/frontend
```

Backend and worker entrypoints are scaffolds, not a functional Crypto Strategy Lab
demo. Functional run and demo instructions must be added only when verified behavior
exists.

## Approved MVP and deferred work

The exact approved scope is maintained in [docs/requirements.md](docs/requirements.md).
The approved MVP includes simple local email/password Auth V1 and per-user
ownership, controlled `LLM_AUTHORING_V1`, synthetic Long/Short paper execution
with bounded SL/TP, and bounded deterministic `RANDOM_V1`, `DOMAIN_GUIDED_V1`,
and `GENETIC_V1` discovery. These are scope statements, not claims of verified
implementation. Deferred scope includes enterprise identity/tenancy,
generalized risk and live trading, autonomous or unconfigured LLM use, arbitrary
URL retrieval, full discretionary SMC/Wyckoff, Bayesian or unbounded search,
Redis/BullMQ and distributed execution, microservices, Kafka, CQRS, and Event
Sourcing. Historical documents may discuss deferred work only as history or
future evolution.

Implementation/tooling inconsistencies discovered during documentation refinement
are recorded in
[docs/post-harness-source-reconciliation.md](docs/post-harness-source-reconciliation.md).
They are intentionally not implemented during Stage 2.

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
