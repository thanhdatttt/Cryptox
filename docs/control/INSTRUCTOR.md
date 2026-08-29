# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-031`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Safety hold after `ENV-01` review

Reason: `ENV-01 completed at its authorized boundary and its local PostgreSQL and
deferred-scope-checker evidence was independently rechecked. However, the C-02
task record in TASKS.md still omits the accepted ENV-01 DONE plus Instructor-review
start dependency recorded in MVP_PLAN.md. TASKS.md is the operational
state/dependency authority, so the conflicting C-02 DAG must be reconciled before
any new implementation authorization.`

`INS-030` is exhausted. No Manager, worker, subagent, worktree, C-02 retry, or
downstream packet is authorized while this hold is current.

## Accepted `ENV-01` checkpoint

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `3df0b1e188635df5b217371bdb2efbc57695a844`
  (`docs(control): complete ENV-01 local postgres evidence`); the worktree is
  clean.
- The authorized `ENV-01` paths are scoped to Compose/local database helpers,
  root command wiring, the canonical deferred-scope checker and its focused test,
  ignore handling, and Manager-owned `TASKS.md`/`HANDOFF.md`. No C-02 contract,
  DTO, data-model, business-migration, runtime, provider, frontend, Auth,
  requirement, ADR, architecture, or OpenSpec drift was found.
- Independent review re-ran `test:scope-check`, `scope:check`, build, architecture,
  artifact, diff, and tracked-secret checks. Docker PostgreSQL development and
  test services are healthy; `db:local:validate` proved up/constraint/down/
  remigrate; `db:local:reset-test` proved test reset preserves development data.
  The ignored `infra/db/local.env` is not tracked. Strict OpenSpec validation is
  `UNVERIFIED` because its CLI is unavailable.
- The `ENV-01` Manager and its sole worker are idle. `ENV-01` is `DONE`; all
  feature packets, including `C-02`, remain `BLOCKED`.

## Required reconciliation before restarting the loop

- `MVP_PLAN.md` defines C-02 start dependencies as `ENV-01 DONE` and separate
  Instructor review, followed by the listed completed baseline inputs. Its
  `TASKS.md` record instead retains the pre-ENV-01 dependency summary. This is a
  material operational-DAG inconsistency even though ENV-01 itself is now done.
- A separately authorized documentation-only Manager reconciliation must update
  only the C-02 operational dependency/evidence record in `TASKS.md` (and its
  matching handoff summary if necessary) to the already-approved plan. It must
  not change requirements, decisions, ADRs, architecture, data model, OpenSpec,
  source, contracts, migrations, task scope, task state, or feature behavior.
- After that correction is reviewed and the checkout is clean, a new bounded
  `C-02` signal may authorize exactly one fresh Manager and one contract-and-schema
  worker. `C-02` itself stays `BLOCKED` until that later signal; no downstream
  packet may be promoted automatically.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [ADR-010](../adr/ADR_010_local_postgres_environment_and_scope_checker.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
