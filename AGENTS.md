# Cryptox Contributor Rules

## Purpose and required reading

Cryptox is a university Crypto Strategy Lab whose primary deliverable is a defensible, extensible software architecture. Before changing the repository, read in this order:

1. The instructor assignment identified in `docs/requirements.md`.
2. `docs/requirements.md` for the reviewed, traceable baseline and approved/deferred scope.
3. Accepted ADRs in `docs/adr/`, following explicit supersession relationships.
4. The primary architecture and data-model documents once established at `docs/architecture.md` and `docs/data-model.md`.
5. Approved active capability specs under `openspec/specs/`.
6. An approved active change under `openspec/changes/`, when one exists.
7. This file for working rules.

Current source is evidence of implementation status and is authoritative for the exact shape of an already-approved executable contract. It cannot create product scope.

## Authority and ambiguity

Authority descends in this order: instructor assignment; reviewed requirements baseline; accepted ADRs (including supersession); approved architecture; approved capability specs; approved active change; this file; generated harnesses; temporary notes. README is navigation, not requirement authority. Archived OpenSpec changes are historical and non-authoritative.

When sources conflict, follow the higher authority and record the lower-level inconsistency. Do not turn examples into requirements, infer optional scope, or silently choose between materially different interpretations. If the assignment remains ambiguous after review, mark the point unresolved and request a decision before implementation.

## Approved architecture and scope

- The active architecture is a **Synchronous Modular Monolith**. Business modules live under `modules/`; `apps/` are composition roots; `packages/` contain transport/technical contracts; `infra/` owns operations.
- Normal application coordination is synchronous through public module APIs. Consumers must not deep-import another module's domain or infrastructure. Within a module, dependencies point `api -> application -> domain`; infrastructure implements application ports.
- Strategies are infrastructure-independent and extensible through registration. External exchanges, news sources, sentiment models, and backtest execution sit behind replaceable ports.
- WebSocket is restricted to realtime market delivery. It is not a general event bus.
- MVP backtesting targets `Search -> BacktestExecutionPort -> Bounded Local Executor -> Backtester -> Evaluator -> Leaderboard`. Callers must not depend on local versus future distributed execution.
- Approved MVP requirements are in `docs/requirements.md`. Authentication, users/ownership, multi-tenancy, AI/LLM authoring, optional trading/risk features, mandatory Redis/BullMQ, distributed protocols, microservices, Kafka, CQRS, and Event Sourcing are deferred there and must not become active requirements without approval.

Stage 2 documentation refinement is complete. Application/runtime source, executable contracts, migrations, infrastructure, generated artifacts, and tooling may be modified only through a separately approved change with explicit scope, governing requirements, acceptance criteria, and validation. Do not infer implementation scope from historical scaffolding, archived OpenSpec changes, or stale source assumptions. Repository inconsistencies discovered outside the current approved change must be reported rather than silently repaired.

## Contract authority

Markdown explains behavior and links to contracts; it must not copy complete TypeScript interfaces or SQL schemas. Each executable contract must have one canonical owner. Target owners are:

- Module API contracts: `modules/{strategy,search,backtesting,market-data,news,sentiment,evaluation,leaderboard}/api/contracts.ts`.
- Replaceable ports: `modules/{backtesting,market-data,news,sentiment}/application/ports.ts`.
- REST DTOs: `packages/contracts/rest/**`; market WebSocket DTOs: `packages/contracts/websocket/**`.

Where the current tree differs from these target owners, treat it as an unverified reconciliation item and resolve it only through an explicitly approved source-reconciliation or implementation change, never as an implicit repair within an unrelated task.

## OpenSpec role

OpenSpec is a concise capability/change mechanism, not the highest authority and not mandatory for every small task. An unapproved delta must never enter canonical specs. Archived changes remain history only. Normally keep at most one cross-cutting active change; an empty active set is valid. Specs should state purpose, boundary, approved behavior, acceptance scenarios, requirement IDs, failure expectations, and links to executable contracts—not repeat the architecture book, full interfaces, schemas, or product-wide infrastructure policy.

## Validation and Definition of Done

Before completion, identify the governing requirement IDs and acceptance criteria, keep the diff within approved scope, and verify no deferred feature or unrelated change leaked in. As relevant, require domain unit tests, boundary integration/contract tests, architecture dependency checks, typecheck, lint, build, test suites, acceptance evidence, reproducibility/provenance, observability, truthful status documentation, and an ADR/document update for architectural changes. Generated source artifacts must not be committed unless an approved workflow explicitly owns and verifies them; do not manually edit generated files.

A change is done only when all applicable checks pass and the diff is reviewable and reversible. If a required tool or environment is unavailable, report the check as **BLOCKED** or **UNVERIFIED**—never **PASS**.
