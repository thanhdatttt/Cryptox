# MVP Implementation Checkpoint

## Resume here

- **Level 2 control plane:** Active. Read `AGENTS.md`, current
  [`INSTRUCTOR.md`](../control/INSTRUCTOR.md), [`DECISIONS.md`](../control/DECISIONS.md),
  [`TASKS.md`](TASKS.md), and this checkpoint before acting.
- **Current instruction:** `INS-004` / `APPROVED_FOR_EXECUTION`, limited to the
  governance-only `GOV-R1` reconciliation. Authorization expires after the
  reconciliation checkpoint; renewed Instructor review is required before any
  READY feature task starts.
- **INS-004 starting checkpoint:** branch `MVP_IMPLEMENTATION`, HEAD
  `471a3899234022d273fed49a72541acc7f94f848`, clean working tree.
- **Historical implementation checkpoint:** `INS-002` /
  `APPROVED_FOR_EXECUTION`, starting at branch `MVP_IMPLEMENTATION`, HEAD
  `29544eac0e91e0c566ea75b830aa2ceea4069fdd`, clean working tree.
- **INS-002 authorization applicability:** PASS. The sole commit after the Instructor's
  reviewed HEAD `e9ab1b3bc832f91c975d39a8d4324d455ee5a91e` was `29544ea`, whose
  complete diff changed only `docs/control/INSTRUCTOR.md` as the instruction allowed.
- **Completed frontier:** C-01A, E-01, and F-01 are DONE. Authorization is exhausted.
- **Renewed Instructor review:** REQUIRED before any newly READY task starts.

## Executed task results

| Task | Worker scope | Result | Source commit |
|---|---|---|---|
| C-01A | Auth/ownership contracts, affected owner-aware APIs/ports, private REST DTOs/tests, narrow gates | DONE | `9ca2d7c` |
| E-01 | `modules/evaluation/**` excluding frozen public contracts | DONE | `a20a7c5` |
| F-01 | `apps/frontend/**` and read-only frozen transport imports | DONE | `901065a` |

C-01A added trusted authenticated context separately from client DTOs; the five
direct ownership roots; inherited/shared ownership constants; owner-first repository
reads, lists, and mutations; Auth V1 session contracts; 401/404 semantics; and
additive private REST projections. Runtime Auth, persistence, migrations, controllers,
and frontend Auth remain unimplemented. The market WebSocket and frozen pure
Strategy/simulator/Evaluation/ranking contracts were not changed.

E-01 implements only deterministic Return, Win Rate, maximum drawdown magnitude,
and trade count under `REQUIRED_METRICS_V1`, including zero/flat/non-finite,
overflow, sparse-input, determinism, and immutability cases. It adds no scoring,
optional metrics, or persistence.

F-01 implements the app shell, typed market clients, one-to-four independent chart
controllers, the retained `lightweight-charts` adapter, explicit stale/reconnect
state, bounded reconnect, history-first delivery, unsubscribe cleanup, recovery
gap replacement, and a development-only fixture source. Real provider/backend
integration remains M-02/I-01; Auth UI remains F-AUTH.

## Independent review

- C-01A initial review found owner-less direct-root mutation ports. The worker made
  Strategy/Composite insert, SearchRun save, and Candidate save owner-first and
  strengthened cross-owner fixtures. Re-review: PASS, no remaining findings.
- E-01 initial review found sparse-array validation bypass and then a test-only
  TypeScript cast error. Both were fixed. Re-review: PASS, no remaining findings.
- F-01 initial review found late-subscription readiness, unbounded open/close retry,
  obsolete recovery ownership, and rendered-evidence gaps. All were fixed with
  regressions and browser evidence. Re-review: PASS, no remaining findings.

## Manager validation

- `npm run verify:stage4a`: PASS — root build, typecheck, 84 workspace tests,
  architecture (42 modules / 88 dependencies and 9 rule fixtures), source-artifact,
  deferred-scope, and backend smoke gates all exited 0.
- Root lint: PASS.
- Explicit C-01A contract suite: PASS, 14 files / 35 tests. This explicit evidence
  is required because C-01A did not have authority to add Auth workspace package
  metadata; Auth's own tests are not independently discovered by root workspace tests.
- Evaluation focused suite: PASS, 15/15 tests.
- Frontend focused suite: PASS, 12/12 tests; production build/typecheck/lint PASS.
- Chrome interaction: PASS — four `lightweight-charts` instances mounted LIVE;
  changing chart 1 from 5m to 1m preserved `[1m, 15m, 1h, 4h]` and produced no
  browser warnings/errors.
- Strict OpenSpec validation for `mvp-implementation`: PASS. Progress is 4/8
  approval milestones; the full module/frontend milestone remains incomplete.
- Full diff/whitespace check and frozen market-WebSocket/Evaluation-contract audit: PASS.

## INS-004 governance reconciliation

- **Instruction executed:** `INS-004` / `APPROVED_FOR_EXECUTION` — `GOV-R1`
  control-plane reconciliation only.
- **Reconciliation checkpoint:** the single coherent GOV-R1 commit containing
  this HANDOFF; resolve its commit with `git rev-parse HEAD` after checkout.
- **Changed governance paths:** `AGENTS.md`, `docs/implementation/TASKS.md`,
  `docs/implementation/MVP_PLAN.md`, and `docs/implementation/HANDOFF.md`.
- **Scope result:** corrected the deferred-scope checker description, reconciled
  current task derivation and authorization annotations, clarified baseline-state
  packet metadata, and corrected the reproduced workspace-test count. No task
  state, owner, dependency, write scope, feature source, or implementation result
  changed.
- **Unchanged implementation commits:** `9ca2d7c` (C-01A), `a20a7c5` (E-01),
  and `901065a` (F-01), with the validated INS-002 evidence preserved above.
- **Next authorization:** renewed Instructor review and a new Instruction ID are
  required before any READY feature task starts. D-01, S-01, AU-01, and F-AUTH
  remain READY but unauthorized for feature execution.

The Vite CJS deprecation notice is informational. Real Binance/CoinDesk,
PostgreSQL, ownership-security integration, and end-to-end demo evidence belong to
later packets and were not claimed here.

## Task-state transitions and recomputed DAG

- `C-01A`: READY -> IN_PROGRESS -> REVIEW -> DONE.
- `E-01`: READY -> IN_PROGRESS -> REVIEW -> DONE.
- `F-01`: READY -> IN_PROGRESS -> REVIEW -> DONE.
- Newly READY after strict start-dependency recomputation: D-01, S-01, AU-01
  (fake-repository phase; D-01 gates DB integration), and F-AUTH (AU-01 gates
  integration). None is authorized by `INS-002`, so none was started.
- All other unfinished tasks remain BLOCKED as recorded in `TASKS.md`.

The revised critical join is:

```text
{ D-01 -> L-01 | S-01 -> B-01 | E-01 DONE } -> B-02 -> Q-01 integration
{ AU-01 | Q-01 integration } -> AU-02
{ AU-02 | F-01 DONE -> F-AUTH -> F-02 | real-provider lanes } -> I-01 -> I-02
```

## Git checkpoint and recovery

- Source commits: `9ca2d7c` (C-01A), `a20a7c5` (E-01), `901065a` (F-01).
- Final control-plane checkpoint: the commit containing this file and the matching
  `TASKS.md` update; resolve with `git rev-parse HEAD` after checkout.
- Expected final working tree: clean on `MVP_IMPLEMENTATION`.
- Do not execute D-01, S-01, AU-01, F-AUTH, or any other task until a fresh current
  Instructor instruction explicitly authorizes the next frontier.
