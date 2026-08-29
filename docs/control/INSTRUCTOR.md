# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-052`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-052 — Independent hold after B-03 review

This replaceable signal supersedes `INS-051 / APPROVED_FOR_EXECUTION`. It
authorizes no implementation packet. The Instructor independently reviewed the
completed B-03 checkpoint and is holding the frontier until the blocked
validation boundary is reconciled through a separate authorization.

### Reviewed checkpoint and repository state

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD: `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`, the exact eight-path
  B-03 checkpoint commit `checkpoint(ins-051): review B-03 paper execution`.
- Git status is clean. The checkpoint contains only Manager-owned
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`, plus
  the authorized Backtesting implementation and focused test paths.
- The task board is internally consistent: B-03 is `REVIEW`; M-03 and N-03
  remain `REVIEW`; S-05, S-06, and ENV-02 remain `DONE`; M-02 remains
  `REVIEW/UNVERIFIED`; no downstream packet was promoted. No Cryptox Manager or
  worker remains active in the task inspection.
- Frozen `modules/backtesting/api/contracts.ts`, its contract tests, all
  migrations, frontend, providers, and unrelated modules are unchanged by the
  B-03 checkpoint.

### Independent B-03 review result

- Focused Backtesting suite: `PASS` — 43 tests passed across 7 files.
- Root workspace suite: `PASS` — 327 tests passed and 6 environment-gated tests
  skipped. The skips are not PASS evidence.
- `npm run test:scope-check`: `PASS` — 7/7 checker-policy tests.
- `npm run arch:check`, `npm run artifacts:check`, `npm run typecheck`,
  `npm run build`, `npm run lint`, and `git diff --check`: `PASS`.
- `npm run scope:check`: `BLOCKED` — the existing checker rejects the approved
  `SYNTHETIC_SHORT_PAPER_V1`, `STOP_LOSS_WINS_V1`, and directional-paper
  vocabulary in the authorized Backtesting implementation directories. This is
  a real checker-boundary mismatch, not permission to bypass the gate; checker
  source and tests were outside INS-051 and were not modified.
- Real local PostgreSQL validation: `BLOCKED` — Docker Compose is unavailable
  on this host. Fixture/query-adapter persistence evidence must not be promoted
  to real PostgreSQL PASS.
- Real configured Binance historical/provider evidence: `UNVERIFIED`; OpenSpec
  CLI, browser/runtime, and link/DAG automation evidence remain `UNVERIFIED`.
  No unavailable check is treated as PASS.

### State and next authorization boundary

- B-03 remains `REVIEW`, not `DONE`, because the required deferred-scope gate
  and real PostgreSQL/provider evidence are not satisfied.
- The B-03 implementation is accepted as a reviewed source checkpoint for
  dependency analysis only. No downstream task may start under this signal.
- Any checker-boundary reconciliation must be a distinct, narrowly scoped
  authorization naming its exact tooling/test paths, approved B-03 boundaries,
  negative deferred-scope cases, acceptance criteria, and stop condition. It
  must not reopen ENV-01/ENV-02, weaken the checker, or broadly allow terms.
- PostgreSQL/provider validation, M-03/N-03 closure, S-04, Q-02, E-02, L-02,
  F-03, I-03, M-02, AU-02, I-01, I-02, and every other downstream/deferred
  packet remain unauthorized. No Manager or worker may be created under
  `INS-052`.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_practical_reproducibility.md)
- [Backtesting capability spec](../../openspec/specs/backtesting/spec.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
