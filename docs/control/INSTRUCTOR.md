# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-028`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: `C-02 — DEC-007 Contract, Data-Model and Migration Reconciliation Gate`

Reason: `The accepted RB-01/RB-02 planning baseline identifies C-02 as the sole earliest extension gate. This authorization is limited to reconciling canonical extension contracts, conceptual data-model representation, and physical schema/migration validation before any feature implementation fan-out.`

This is exactly one bounded implementation gate. It authorizes one fresh Manager
in the canonical `MVP_IMPLEMENTATION` checkout and requires that Manager to
delegate all implementation work to exactly one separate contract-and-schema
worker. The Manager independently reviews and integrates that worker output,
owns `TASKS.md` and `HANDOFF.md`, and makes no feature implementation except
narrow merge/conflict-resolution glue. No second Manager, worker, subagent, or
worktree is authorized.

## Reviewed checkpoint and applicability

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `04d6fa82c59bf6a9e99b185fa5e3c71a4b68f1f7`
  (`docs(control): hold after RB-02 review`); the working tree was clean.
- `INS-027 / HOLD` is current at that checkpoint. There is no later Git delta,
  no material source, business-state, authority, or task-DAG drift, and no
  Cryptox Manager or worker is active.
- `RB-01` and `RB-02` are accepted. The corrected Handoff, `MVP_PLAN.md`, and
  `TASKS.md` agree on the extension DAG; `C-02` remains `BLOCKED` and every
  downstream extension packet remains blocked.
- Baseline seam inputs are present as recorded: `C-01A`, `D-01`, `M-01`,
  `S-01`, `Q-01`, `B-02`, `E-01`, `L-01`, `N-01`, and `N-02`. `M-02` remains
  `REVIEW/UNVERIFIED` evidence only and must not be retried or moved.

Before any task transition or assignment, the Manager MUST recheck the current
signal, exact reviewed checkpoint, clean worktree, baseline/task applicability,
and absence of another active Cryptox Manager/worker. Failure to prove any
premise requires no change and `NEEDS_INSTRUCTOR_REVIEW`.

## Exact authorized scope

The single worker may change only the following for `C-02`, plus tightly scoped
contract/boundary and migration tests that exercise those changed boundaries:

- `modules/{market-data,strategy,search,backtesting,news,sentiment,evaluation,leaderboard}/api/contracts.ts`;
- the corresponding `application/ports.ts` canonical port owners;
- extension DTOs under `packages/contracts/rest/**` and
  `packages/contracts/websocket/**`;
- `docs/data-model.md`; and
- approved schema/migration and schema-validation files under `infra/db/**`.

The Manager may update only `docs/implementation/TASKS.md` and
`docs/implementation/HANDOFF.md` for truthful C-02 state, integration, evidence,
blocker, and next-frontier control. It may resolve narrowly mechanical merge
conflicts within the authorized worker diff, but must not substitute for the
required worker implementation.

## Required acceptance and validation

C-02 must prove all of the following:

1. Every extension contract and port has one canonical owner and preserves
   backward compatibility unless explicitly extended.
2. The data-model/migration representation covers immutable strategy and
   weighted/Lite configuration; lifecycle, safe LLM draft/approval and URL/import
   refinement states; Search seed/configuration/dataset/code provenance; paper
   execution profile and eight-place decimal provenance; News extraction/template
   version, provenance, retention; and neutral Sentiment joins.
3. `MARKET_OBSERVABILITY_V1` is explicitly ephemeral, is excluded from
   historical/backtest/replay inputs, and represents no persistence obligation.
4. LLM draft, safe URL/import, and extraction-template representations contain no
   credentials or secrets; inherited/shared ownership semantics remain unchanged.
5. Contract serialization and boundary tests, migration up/down/remigrate and
   constraint checks, architecture, scope, deferred-scope, DAG/link, and
   whitespace checks pass.
6. Strict OpenSpec validation runs if available. If the CLI or any required
   environment is unavailable, the result is `UNVERIFIED` or `BLOCKED`, never
   `PASS`.

## Explicit prohibitions and state control

- Do not implement runtime/application behavior, providers, frontend, Auth
  behavior, exchange behavior, queues, or general event infrastructure.
- Do not edit requirements, `DECISIONS.md`, ADRs, architecture, active OpenSpec
  specifications/change artifacts, runtime configuration, dependencies, or
  unrelated source.
- Do not start, retry, or reclassify `M-02`, `AU-02`, `I-01`, or `I-02`.
- `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`,
  `F-03`, and `I-03` remain `BLOCKED` and unauthorized. C-02 completion does
  not promote or start any of them automatically.

## Stop condition

The Manager stops after C-02 is independently reviewed and integrated, or is
truthfully recorded `BLOCKED` with its exact evidence. It commits the coherent
authorized checkpoint, updates `TASKS.md` and `HANDOFF.md`, and returns control
to an Instructor review. `INS-028` is exhausted at that point; no later packet
is authorized without a new explicit Instructor signal.

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
