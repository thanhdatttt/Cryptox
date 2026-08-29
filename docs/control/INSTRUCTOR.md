# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-030`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Authorization: `ENV-01 — Local Docker PostgreSQL Evidence and Deferred-Scope Checker Reconciliation`

Reason: `The reviewed blocked C-02 checkpoint has no accepted implementation. ENV-01 is the separately approved prerequisite for Codex-operated local PostgreSQL migration evidence and a truthful DEC-007-aware deferred-scope checker; it does not retry C-02 or implement any product behavior.`

This signal authorizes exactly one fresh Manager in the canonical
`MVP_IMPLEMENTATION` checkout and requires exactly one separate
Infrastructure-and-tooling worker. No other Manager, worker, subagent, worktree,
retry, or downstream task is authorized. The Manager owns `TASKS.md` and
`HANDOFF.md`; the worker must not edit either control artifact.

## Reviewed checkpoint and applicability

- Reviewed governance checkpoint: `MVP_IMPLEMENTATION` /
  `43f92b0d258a24706f51d5847263c83270a0bd85`
  (`docs(control): plan local postgres and scope reconciliation`), following the
  blocked C-02 checkpoint `7f774ed505f45d927b650ccefcd76d9e4f8611d2`.
- The reviewed worktree was clean. The previous C-02 Manager and worker are no
  longer active. Docker's local daemon was reachable during planning, but must be
  tested again at execution.
- `DEC-008`, `ADR-010`, and the accepted `RB-01`/`RB-02` baseline govern this
  packet. `ENV-01` is the sole pre-`C-02` gate; `C-02` and every extension
  feature packet remain `BLOCKED`.

Before transition or assignment, the Manager MUST prove current `INS-030`,
a clean worktree, the exact reviewed governance checkpoint plus only this
Instructor signal as later drift, Docker/daemon status, and no other active
Cryptox Manager/worker. If any premise cannot be proved, make no change and
report `NEEDS_INSTRUCTOR_REVIEW`.

## Exact work and write scope

The Manager may first allocate `ENV-01` in `TASKS.md` and move it
`BLOCKED → READY → IN_PROGRESS` only after applicability is proven. It then
delegates all implementation to one worker whose write scope is only:

- `infra/docker-compose.yml`;
- new environment-only helpers under `infra/db/local-*`, never
  `infra/db/migrations/**` or `infra/db/migrate.config.js`;
- local migration-validation helper/test files;
- `scripts/check-deferred-scope.cjs` and tightly scoped checker test/helper files;
- root `package.json` command wiring;
- `.gitignore`; and
- optional `.env.example` containing placeholders only.

The Manager may update only `docs/implementation/TASKS.md` and
`docs/implementation/HANDOFF.md` for ENV-01 state, worker evidence, validation,
blockers, and next frontier. It may make narrowly mechanical merge-conflict fixes
inside the accepted worker diff; it must not substitute for the required worker.

## Required behavior and evidence

The worker must provide local-only Docker/Compose PostgreSQL development and test
databases with separate persistent named volumes and health checks. It must expose:

- `npm run db:local:prepare` to provision, wait for health, and run the real
  migration-validation sequence;
- `npm run db:local:validate` to prove migration up, down, remigrate, and
  applicable constraints against the test database; and
- `npm run db:local:reset-test` to reset test data without touching development
  data.

The commands may create an ignored local environment file and generate a local
secret without printing it. No `DATABASE_URL`, test connection string, password,
token, or usable credential may be committed or logged; `.env.example`, if
needed, must contain placeholders only. Docker absence, daemon failure, or Compose
failure is `BLOCKED` with evidence. Do not install host software, use a cloud
database, or request secrets in chat.

The canonical checker owner is `scripts/check-deferred-scope.cjs`. Reconcile it
through narrow, tested DEC-007 profile allowances only. Positive and negative
evidence must show approved bounded vocabulary works while enterprise identity,
queue/distributed, live trading/generalized risk, autonomous/unconfigured LLM,
and strict-replay scope remain rejected. The checker may not be disabled, bypassed,
excluded from active paths, or broadly relaxed.

## Explicit prohibitions

- Do not change C-02 contracts, ports, DTOs, `docs/data-model.md`, business
  migrations, or migration semantics.
- Do not implement runtime/application/provider/frontend/Auth/exchange behavior,
  cloud operations, dependencies, requirements, decisions, ADRs, architecture,
  OpenSpec, or downstream feature scopes.
- Do not start, retry, or reclassify `C-02`, `M-02`, `AU-02`, `I-01`, `I-02`,
  `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`,
  `F-03`, or `I-03`.

## Validation and stop condition

The Manager independently reviews the worker output and runs Docker/Compose
health, development/test isolation/reset, tracked-secret scan, real migration
up/down/remigrate/constraint probes, focused checker positive/negative tests,
root `scope:check`, architecture/artifact/scope/deferred-scope checks, link/DAG
checks, and `git diff --check`. Strict OpenSpec validation is `UNVERIFIED` unless
the CLI is actually available and succeeds. Any unavailable Docker/daemon/OpenSpec
or required environment is `BLOCKED` or `UNVERIFIED`, never `PASS`.

Integrate only accepted worker output, commit the coherent checkpoint, update
`TASKS.md` and `HANDOFF.md`, and stop. This authorization is exhausted whether
ENV-01 is integrated or truthfully blocked. The system returns to Instructor
review in `HOLD`; C-02 is not automatically promoted, retried, or authorized.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [ADR-010](../adr/ADR_010_local_postgres_environment_and_scope_checker.md)
- [Requirements](../requirements.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
