# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-027`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Accepted `RB-02` planning-baseline review

Reason: `RB-02 corrected the RB-01 Handoff DAG summary to the human-approved detailed dependency order. The DEC-007 planning baseline is now internally consistent, but no extension implementation gate is authorized by this review.`

`INS-026` is exhausted. Its sole Manager-owned documentation packet,
`RB-02 — RB-01 DAG Consistency Correction`, committed at
`3b861c851fdd2a9a93d3bb6b6c93e29a12b335ea`. No Manager, worker, subagent,
worktree, retry, or implementation task is authorized by this signal.

## Accepted checkpoint

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `3b861c851fdd2a9a93d3bb6b6c93e29a12b335ea`
  (`docs(control): correct RB-02 DAG handoff`); the working tree was clean.
- The `RB-02` diff changes only `docs/implementation/HANDOFF.md`, the exact
  path authorized by `INS-026`; whitespace validation passed.
- No requirements, DEC-007 decision, ADR, architecture, data model, active
  OpenSpec, source, executable contract, migration, runtime configuration, or
  implementation path drifted since the re-baseline
  `496d5a34b76841b9f5b142fa512225f502f5fa26`.
- The corrected Handoff matches the detailed `MVP_PLAN.md` and `TASKS.md`
  dependencies: `C-02` fans out to `M-03`, `S-05`, `S-06`, `Q-02`, and `N-03`;
  `S-04` has a prompt-only path after `C-02` and its URL-origin completion is
  gated by `N-03`; `B-03` follows `S-05` plus `S-06`; then `E-02`, `L-02`,
  `F-03`, `I-03`, and `I-02` follow in the approved order.
- `C-02`, `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`,
  `L-02`, `F-03`, and `I-03` remain `BLOCKED`. `M-02` remains
  `REVIEW/UNVERIFIED`; `AU-02`, `I-01`, and `I-02` remain blocked. Historical
  `DONE` packets remain baseline evidence only.

## Current extension frontier

`C-02` is the sole earliest *possible* extension gate. It remains `BLOCKED` and
is not authorized. No task may become `READY` or start from this review.

## Required conditions for a later standalone `C-02` authorization

A future Instructor signal may consider only `C-02` after all of these conditions
are independently verified:

1. Git is clean at a reviewed checkpoint with no unreviewed source,
   business-state, authority, or task-DAG drift; the signal is current; and no
   other Cryptox Manager or worker is active.
2. `RB-01` and `RB-02` remain accepted, `C-02` remains `BLOCKED`, and its
   baseline seam inputs remain as documented: `C-01A`, `D-01`, `M-01`, `S-01`,
   `Q-01`, `B-02`, `E-01`, `L-01`, `N-01`, and `N-02`. `M-02` remains a
   `REVIEW/UNVERIFIED` input only and must not be retried or moved.
3. The authorization is limited to the planned reconciliation scope:
   canonical extension module contracts and corresponding ports for
   Market Data, Strategy, Search, Backtesting, News, Sentiment, Evaluation, and
   Leaderboard; REST and market-WebSocket DTOs; `docs/data-model.md`; and
   approved `infra/db/**` migration/schema validation. Runtime implementations,
   providers, frontend behavior, and Auth behavior remain out of scope.
4. Acceptance proves canonical ownership for each extension contract; ephemeral
   market observability remains excluded from historical inputs; LLM
   draft/approval and safe URL/refinement state are representable without
   secrets; weighted/Lite configurations are immutable; all Search profiles
   retain seed/configuration/dataset/code provenance; paper execution preserves
   eight-place decimal provenance; News extraction/template/retention and
   neutral Sentiment joins are representable; inherited/shared ownership is
   unchanged; and existing public contracts remain compatible unless explicitly
   extended.
5. Validation includes contract serialization and boundary tests, migration
   down/up/remigrate and constraint checks, architecture/deferred-scope/scope
   checks, link/DAG checks, `git diff --check`, and strict OpenSpec validation
   when available. Unavailable checks must be `BLOCKED` or `UNVERIFIED`, never
   `PASS`.
6. A new signal has an explicit bounded stop condition, does not authorize
   downstream packets or automatic promotion, and specifies compliant Manager/
   worker delegation for this implementation gate.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Accepted ADRs](../adr/)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
