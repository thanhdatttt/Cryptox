# INS-034 Execution Checkpoint

## Resume here

- **Authorization:** `INS-034 / APPROVED_FOR_EXECUTION`, exactly `C-02 — DEC-007
  Contract, Data-Model and Migration Reconciliation Gate`.
- **Starting checkpoint:** `MVP_IMPLEMENTATION` /
  `58885ddd4ab8019e435c0f04a70e040c794044d5` (`docs(control): reconcile C-02
  operational DAG dependencies`). The only later commit is the expected sole
  Instructor control commit `3b1766eb2a1af515d9d283d25e1290926027fe6a`;
  `git diff 58885dd..3b1766e` contains only `docs/control/INSTRUCTOR.md`.
- **Applicability:** PASS — current `INS-034` is `APPROVED_FOR_EXECUTION`; HEAD
  is `3b1766e`; the canonical checkout was clean; C-02 dependencies match the
  reviewed record; no other active Cryptox Manager or worker was found; Docker
  Compose/daemon are usable; and `npm run db:local:validate` passed local
  PostgreSQL up, constraints, down, and remigrate.
- **Task transition:** C-02 moved exactly `BLOCKED -> READY -> IN_PROGRESS`.
- **Manager/workers:** One Manager is active in the canonical checkout. Exactly
  one contract-and-schema worker is authorized and is pending creation. No
  worktree, retry, second worker, or downstream task is authorized.

## Current execution boundary

- C-02 dependencies: `ENV-01 DONE` plus separate Instructor review; completed
  `C-01A`, `D-01`, `M-01`, `S-01`, `Q-01`, `B-02`, `E-01`, `L-01`, `N-01`, and
  `N-02`; `M-02 REVIEW/UNVERIFIED` is review input only.
- The worker may touch only the authorized canonical contracts, existing
  application ports, extension REST/market-WebSocket DTOs, `docs/data-model.md`,
  approved `infra/db/**` schema/migration-validation files, and tightly scoped
  contract/boundary/schema/migration tests. Control files remain Manager-only.
- No runtime/application/provider/frontend/Auth/exchange behavior, dependency,
  configuration, requirement, decision, ADR, architecture, OpenSpec, or
  downstream feature work is in scope.

## Validation status

- Applicability and control-plane checks: **PASS**.
- Local PostgreSQL migration prerequisite: **PASS** via `npm run
  db:local:validate`.
- OpenSpec CLI: **UNVERIFIED** — executable not available in the environment.

This is an in-progress INS-034 checkpoint. The sole worker must return scoped
changes and evidence for independent Manager review before final state and commit
are recorded.
