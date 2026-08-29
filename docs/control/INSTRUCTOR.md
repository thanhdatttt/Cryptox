# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-034`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: `C-02 — DEC-007 Contract, Data-Model and Migration Reconciliation Gate`

Reason: `RB-01/RB-02 planning, accepted ENV-01 local PostgreSQL evidence, and
accepted RB-03 operational DAG reconciliation establish the first extension gate.
C-02 reconciles representations and validation only; it does not implement any
runtime feature behavior or unlock downstream work automatically.`

This signal authorizes exactly one fresh Manager in the canonical
`MVP_IMPLEMENTATION` checkout. The Manager must delegate all implementation to
exactly one separate contract-and-schema worker in that same checkout. No other
Manager, worker, subagent, worktree, retry, or downstream task is authorized.

## Reviewed checkpoint and dependencies

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `58885ddd4ab8019e435c0f04a70e040c794044d5`
  (`docs(control): reconcile C-02 operational DAG dependencies`); the worktree
  was clean and the RB-03 Manager is idle.
- Accepted authority: re-baseline `496d5a34b76841b9f5b142fa512225f502f5fa26`,
  DEC-007, DEC-008, ADR-010, accepted RB-01/RB-02, and ENV-01.
- C-02 is `BLOCKED` with recorded dependencies: `ENV-01 DONE` plus this separate
  Instructor review; completed `C-01A`, `D-01`, `M-01`, `S-01`, `Q-01`, `B-02`,
  `E-01`, `L-01`, `N-01`, and `N-02`; `M-02 REVIEW/UNVERIFIED` is review input
  only, not a retry or completion dependency.

Before transition or assignment, the Manager MUST prove current `INS-034`, the
exact reviewed checkpoint plus only this signal as later drift, clean Git state,
all recorded C-02 dependencies, Docker/Compose availability and the accepted local
migration command surface, and no active Cryptox Manager/worker. If any premise
cannot be proved, make no changes and report `NEEDS_INSTRUCTOR_REVIEW`.

## Exact work and write scope

The Manager may first transition C-02 only as `BLOCKED -> READY -> IN_PROGRESS`
after applicability is proven. It delegates all implementation to exactly one
worker whose scope is limited to:

- canonical contracts in `modules/{market-data,strategy,search,backtesting,news,
  sentiment,evaluation,leaderboard}/api/contracts.ts`;
- corresponding existing application ports in those modules;
- extension REST DTOs under `packages/contracts/rest/**` and market-WebSocket
  DTOs under `packages/contracts/websocket/**`;
- `docs/data-model.md`;
- approved schema/migration-validation files under `infra/db/**`; and
- tightly scoped contract serialization, boundary, schema, and migration tests.

The worker must not edit control artifacts. The Manager may update only
`docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` for truthful
C-02 state/evidence, and may make narrowly mechanical merge-conflict corrections
inside accepted worker output.

## Required contract and schema evidence

Prove canonical ownership and backward compatibility; immutable weighted/Lite
configuration; safe LLM draft/approval and URL/template-refinement state without
secrets; seeded Search provenance; eight-place decimal synthetic-paper execution
provenance; News extraction/template/version/retention state; neutral Sentiment
joins; unchanged ownership semantics; and ephemeral Market observability excluded
from persistence and historical/backtest/replay inputs.

Run contract serialization/boundary tests; local PostgreSQL migration up, down,
remigrate, and applicable constraint probes; architecture, scope, deferred-scope,
link/DAG, and whitespace checks. OpenSpec CLI validation is `UNVERIFIED` unless it
is actually available and succeeds. Any unavailable Docker, daemon, OpenSpec, or
required environment is `BLOCKED` or `UNVERIFIED`, never `PASS`.

## Explicit prohibitions

- No runtime/application/provider/frontend/Auth/exchange behavior or feature
  implementation; no dependencies, runtime configuration, requirements,
  decisions, ADRs, architecture, or OpenSpec changes.
- Do not start, retry, or reclassify `M-02`, `AU-02`, `I-01`, `I-02`, `M-03`,
  `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`, `F-03`, or
  `I-03`.
- Do not automatically promote or assign any downstream packet after C-02.

## Stop condition

The Manager independently reviews and integrates only accepted worker output,
commits the coherent checkpoint, and stops. `INS-034` is exhausted whether C-02
is integrated or truthfully blocked. The system returns to Instructor review in
`HOLD`; a later signal is required for every downstream packet.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
