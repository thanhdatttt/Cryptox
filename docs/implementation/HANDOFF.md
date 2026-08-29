# INS-030 Execution Checkpoint

## Resume here

- **Authorization:** `INS-030 / APPROVED_FOR_EXECUTION`, exactly `ENV-01 — Local
  Docker PostgreSQL Evidence and Deferred-Scope Checker Reconciliation`. This
  authorization is exhausted by this checkpoint and authorizes no C-02 retry,
  downstream packet, or feature implementation.
- **Starting checkpoint:** `MVP_IMPLEMENTATION` /
  `6d89753ac39ebb2361616a6d41ed8430c75a52c6` (`docs(control): authorize local
  postgres reconciliation`). The reviewed governance baseline was
  `43f92b0d258a24706f51d5847263c83270a0bd85`; the only later commit before
  execution was the expected `INS-030` update to `docs/control/INSTRUCTOR.md`.
- **Applicability:** Before allocation, `INS-030` was current and
  `APPROVED_FOR_EXECUTION`; the canonical checkout was clean; Docker Engine
  client/server `28.5.1` and Compose `v2.40.3` were reachable with elevated
  read-only access; and no other active Cryptox Manager or worker was found.
- **Worker:** exactly one same-directory Infrastructure-and-tooling worker,
  `01a04d08-19c8-76e1-ad32-57471e75f430`. Its resumed turn completed without a
  worker commit or emitted final text report; the Manager independently reviewed
  the resulting scoped working-tree output and evidence.
- **Task transitions:** `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`.
  `TASKS.md` and this checkpoint were changed only by the Manager.

## ENV-01 result

Accepted and complete at the environment/checker packet boundary. The worker
output changed only the following implementation paths, plus the Manager-owned
task board:

- `infra/docker-compose.yml`
- `infra/db/local-postgres.cjs`
- `infra/db/local-migration-validation.cjs`
- `scripts/check-deferred-scope.cjs`
- `scripts/check-deferred-scope.test.cjs`
- `package.json`
- `.gitignore`
- `docs/implementation/TASKS.md` (Manager-only state/evidence)

Compose now provisions separate `postgres-dev` and `postgres-test` PostgreSQL
17 services with health checks, ports `55432`/`55433`, and separate persistent
named volumes. The local command surface is:

- `npm run db:local:prepare` — provisions/waits for health and runs validation;
- `npm run db:local:validate` — proves real test-database migration up,
  constraints, down, and remigrate;
- `npm run db:local:reset-test` — resets only the test schema and proves a
  temporary development sentinel survives.

The helper creates only the ignored `infra/db/local.env` when needed. The
generated password and process-local database URLs are never printed or
committed. No `.env.example` was added and no usable credential is tracked.

The deferred-scope checker remains canonical at
`scripts/check-deferred-scope.cjs`. It narrowly permits approved DEC-007
profiles at their named API/application/transport boundaries, keeps
`MARKET_OBSERVABILITY_V1` ephemeral and market-WebSocket-only, and preserves
global rejection of enterprise identity, queue/distributed mechanisms,
live-trading/generalized-risk, autonomous or unconfigured LLM, and strict-replay
scope. Explicit synthetic-paper prohibition/exclusion vocabulary is allowed only
in its narrow contract context; actual risk use remains rejected there. Focused
positive/negative tests cover these boundaries.

## Independent review findings

- The first worker draft removed global rejection for some risk vocabulary. The
  Manager rejected that relaxation; the same worker corrected it to a narrow,
  context-aware synthetic-paper prohibition/exclusion exception and added a
  negative test proving an actual use still fails.
- The Manager then required and accepted the correction that
  `MARKET_OBSERVABILITY_V1` is rejected in REST and migration paths and allowed
  only on Market Data API/application contracts and market WebSocket contracts.
- The Manager also required Strategy application-port boundaries for
  `WEIGHTED_VOTE_V1`, `SMC_LITE_V1`, and `WYCKOFF_LITE_V1`; focused coverage was
  added.
- Final changed-path review found no C-02 contracts, ports, DTOs,
  `docs/data-model.md`, business migrations, runtime/application/provider/
  frontend/Auth/exchange behavior, dependency, cloud, requirement, decision,
  ADR, architecture, OpenSpec, or downstream task changes.

## Validation evidence

- Docker/Compose: both local PostgreSQL services reported `healthy`; Compose
  syntax validation passed; separate volumes
  `cryptox-local_cryptox_pgdata_development` and
  `cryptox-local_cryptox_pgdata_test` exist.
- `npm run db:local:prepare`: PASS.
- `npm run db:local:validate`: PASS — real up, constraint probes, down, and
  remigrate against the local test database.
- `npm run db:local:reset-test`: PASS — test reset completed and development
  data was preserved.
- `npm run test:scope-check`: PASS — 5 focused tests.
- `npm run scope:check`: PASS.
- `npm run build`: PASS.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS — 251 tests passed, 6 environment-dependent tests skipped.
- `npm run arch:check`: PASS (exit 0); it reports the repository's existing nine
  forbidden-dependency fixtures, unchanged by ENV-01.
- `npm run artifacts:check`: PASS.
- `git diff --check`: PASS.
- Tracked-secret scan: PASS; `infra/db/local.env` is ignored and untracked.
- Strict OpenSpec CLI validation: `UNVERIFIED` because `openspec` is not
  available on this host. No strict OpenSpec PASS is claimed.

## Preserved frontier and blockers

- `ENV-01` is `DONE` at its authorized boundary.
- `C-02` remains `BLOCKED` and was not retried, reclassified, or promoted.
- `M-02` remains `REVIEW/UNVERIFIED`; `AU-02`, `I-01`, `I-02`, and all DEC-007
  feature packets remain unchanged and blocked.
- A fresh Instructor review/signal is required before any C-02 attempt. No
  downstream work starts automatically from this checkpoint.

## Checkpoint disposition

The coherent ENV-01 checkpoint is committed on `MVP_IMPLEMENTATION`. The
authorization returns to Instructor review/HOLD after this commit. No
implementation beyond ENV-01 started.
