# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-053`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-053 — ENV-03 B-03 checker-boundary reconciliation

This replaceable signal supersedes `INS-052 / HOLD` and authorizes exactly one
bounded tooling packet: `ENV-03 — B-03 Approved-Profile Checker Boundary
Reconciliation`. No feature packet or downstream join is authorized.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `0c4bbb7e540bc93afa113992cfa0aa882912394a`, the committed
  `DEC-011` / `ENV-03` governance checkpoint after independent B-03 review.
  The working tree is clean.
- `MVP_PLAN.md` now contains the distinct `ENV-03` packet and `DECISIONS.md`
  contains approved `DEC-011`. `ENV-02` remains `DONE`; it must not be
  reopened. B-03 remains `REVIEW` at checkpoint
  `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4` and is not promoted by this
  signal.
- The current task board is otherwise internally consistent: M-03 and N-03
  remain `REVIEW`; S-05 and S-06 remain `DONE`; M-02 remains
  `REVIEW/UNVERIFIED`; downstream feature packets remain `BLOCKED`. The
  Manager must add the authorized `ENV-03` row to `TASKS.md` as `BLOCKED` and
  move it only through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` under this
  signal. The absence of that new row before Manager bootstrap is the expected
  governance delta; no other task state may change.
- Active-task inspection found no Cryptox Manager or worker. Historical tasks
  and workers must not be resumed, replaced, retried, or duplicated.

### Authorized packet: `ENV-03`

- **Requirement/decision IDs:** `CSL-R-RP-02`, DEC-007, DEC-011, and ADR-010.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  fully, then verify this signal, checkpoint, DAG, dependencies, and write
  scope before dispatch.
- **Fresh worker:** the Manager must delegate exactly one fresh checker-tooling
  worker with a disjoint bounded write scope. Do not resume, replace, retry, or
  duplicate any historical worker. The worker may not edit control-plane
  artifacts.
- **Worker write scope:** `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs` only. The worker may not edit source
  modules, packages, apps, migrations, dependencies, runtime configuration,
  requirements, ADRs, OpenSpec artifacts, or any other file.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for the ENV-03 row, valid state transitions,
  worker review, validation evidence, limitations, checkpoint, and stop
  boundary. The Manager may not edit `INSTRUCTOR.md`, `DECISIONS.md`, or
  `MVP_PLAN.md`.

### ENV-03 acceptance criteria

- Extend the existing `approvedProfileBoundaries` policy so
  `SYNTHETIC_SHORT_PAPER_V1` and `STOP_LOSS_WINS_V1` are allowed only at the
  existing canonical Backtesting contract/port/REST/migration boundaries and
  in these exact implementation directories: `modules/backtesting/domain/`,
  `modules/backtesting/application/`, and
  `modules/backtesting/infrastructure/`.
- Extend the directional-paper vocabulary boundary only to those same exact
  Backtesting boundaries. Do not add a generic Backtesting root exclusion or a
  broad path prefix that permits unrelated scope.
- Add focused positive tests for each approved implementation boundary and
  negative tests for the same profile identifiers and directional vocabulary in
  unrelated paths. Preserve existing positive/negative tests and all existing
  deferred rejection behavior.
- Continue rejecting deferred enterprise identity, distributed/queue,
  live-trading/generalized-risk, autonomous/unconfigured LLM, strict-replay,
  operational risk, and every other unapproved profile or path. No checker
  disablement, generic profile bypass, path-wide exclusion, product behavior,
  contract change, migration change, or runtime change is authorized.

### Required validation and stop condition

- Run `npm run test:scope-check` and prove the new positive/negative cases;
  run `npm run scope:check` and require it to pass against the current B-03
  source. Also run applicable `npm run arch:check`,
  `npm run artifacts:check`, `npm run typecheck`, `npm run build`,
  `npm run lint`, and `git diff --check`.
- Verify exact changed paths, frozen contracts/migrations, and all unrelated
  source are unchanged. OpenSpec CLI and any unavailable environment check are
  `UNVERIFIED`/`BLOCKED`, never `PASS`.
- The Manager must independently review the worker result, move only ENV-03
  through the valid state sequence, commit one coherent ENV-03 checkpoint, and
  stop immediately. The Instructor will separately review the checkpoint and
  B-03 promotion; no downstream work starts automatically.
- Do not start or promote B-03, M-03, N-03, S-04, Q-02, E-02, L-02, F-03,
  I-03, M-02, AU-02, I-01, I-02, or any other feature/deferred packet under
  this signal. Do not reopen ENV-01 or ENV-02.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [ADR-010](../adr/ADR_010_local_postgres_environment_and_scope_checker.md)
- [Backtesting capability spec](../../openspec/specs/backtesting/spec.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
