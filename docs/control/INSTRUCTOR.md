# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-035`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Hold after accepted `C-02` review

Reason: `C-02 — DEC-007 Contract, Data-Model and Migration Reconciliation Gate`
was completed at `ed761e36c5ab2293d08c0a3aef5889ab675e772a` and independently
reviewed. `INS-034` is exhausted. This completion establishes representations,
schema constraints, and boundary evidence only; it does not authorize runtime
implementation or promote any extension packet.

The system remains in `HOLD`. No Manager, worker, subagent, worktree, retry, or
downstream implementation may be created or started until a later, separately
bounded `APPROVED_FOR_EXECUTION` signal explicitly names its packet and scope.

## Accepted checkpoint

- Branch/HEAD: `MVP_IMPLEMENTATION` /
  `ed761e36c5ab2293d08c0a3aef5889ab675e772a`
  (`feat(contracts): reconcile DEC-007 contract and schema boundary`).
- Git status was clean at review; the C-02 Manager and its sole worker
  `01a04d53-6ab4-70c1-a926-f68464b0fc6a` are idle. No active Cryptox
  Manager/worker was found.
- Scope is confined to the authorized canonical module contracts and ports,
  REST/market-WebSocket DTOs, `docs/data-model.md`, approved `infra/db/**`
  validation/migration files, focused tests, and Manager-owned C-02 task/handoff
  evidence. No runtime/provider/frontend/Auth/exchange behavior, general runtime
  configuration, requirement, decision, ADR, architecture, or OpenSpec drift was
  detected. Market observability has no REST or persistence projection and remains
  explicitly ephemeral and excluded from historical, backtest, and replay inputs.
- Independent review validation passed: workspace typecheck, lint, build,
  architecture, artifact, deferred-scope, whitespace, and test gates (`254`
  passing tests; `6` existing environment-gated skips); local Docker PostgreSQL
  migration up, constraint probes, down, remigrate, and test-data reset also
  passed. OpenSpec CLI and dedicated link/DAG automation remain `UNVERIFIED`
  because the executables are unavailable; they were not represented as passing.
- `TASKS.md`, `MVP_PLAN.md`, and `HANDOFF.md` agree that C-02 is `DONE`, its
  historical prerequisite evidence is preserved, and every new feature packet
  remains `BLOCKED`.

## Current extension frontier (not authorized)

The next technically eligible E1 packets remain `BLOCKED`: `M-03`, `S-05`,
`S-06`, `Q-02`, and `N-03`; `S-04` is eligible only for its prompt-authoring
path, while its URL-origin completion remains gated by `N-03`. `B-03` remains
blocked until both `S-05` and `S-06` are done. `E-02`, `L-02`, `F-03`, `I-03`,
`AU-02`, `M-02`, `I-01`, and `I-02` remain unauthorized.

Any future authorization must first re-check the current signal, Git checkpoint
and cleanliness, task dependencies and write-scope isolation, relevant local
PostgreSQL evidence, absence of active Cryptox work, and the governing
DEC-007/requirements/ADR/architecture/OpenSpec boundaries. It must name one
bounded packet (or an explicitly safe, coordinated set), require a fresh Manager
and the mandated scoped worker delegation, specify acceptance/validation, and
stop without automatic downstream promotion.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
