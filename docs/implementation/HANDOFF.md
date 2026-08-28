# MVP Implementation Checkpoint

## Resume here

- **Level 2 control plane:** Active. Read `AGENTS.md`, current
  [`INSTRUCTOR.md`](../control/INSTRUCTOR.md), [`DECISIONS.md`](../control/DECISIONS.md),
  [`TASKS.md`](TASKS.md), and this checkpoint before acting.
- **Current instruction:** `INS-010` / `APPROVED_FOR_EXECUTION`, authorizing only
  the D-01 live PostgreSQL migration/review phase followed by real PostgreSQL-
  backed AU-01 Auth/session integration. D-01 must be reviewed and closed before
  AU-01 starts. M-01, Q-01 real-port integration, F-AUTH real integration, and
  all other unfinished packets remain unauthorized.
- **INS-010 applicability:** PASS. Instructor reviewed HEAD is `bc88f36`; the
  current `7cab605` commit changes only `docs/control/INSTRUCTOR.md`, which is
  the authorized instruction signal. The working tree is clean, the task DAG
  and business/source premises are unchanged, and the dedicated PostgreSQL
  16.10 cluster at `postgres://cryptox@localhost:55432/cryptox` is reachable.
- **Pre-execution reconciliation:** D-01 is reconciled from the prior partial
  `REVIEW` phase to `READY` for the authorized live migration/review packet.
  AU-01 remains `REVIEW` and gated; it may be reconciled to `READY` only after
  D-01 is independently reviewed and closed.
- **Delegation and state transitions:** Q-01 was assigned to Herschel and F-AUTH
  to Archimedes in disjoint scopes. Both followed `READY -> IN_PROGRESS -> REVIEW`.
  The bounded implementation work was delegated; the Manager performed review,
  integration, and validation only. Neither task is `DONE` because fake-only work
  does not satisfy the later real-port/integration gates.
- **Q-01 result:** Seeded deterministic Random generation, canonical distinct
  candidate keys, owner-scoped SearchRun persistence and scope validation, bounded
  in-flight orchestration, max-candidate/max-duration/no-improvement stopping,
  pause/resume/cancellation handling, and delayed-port race coverage were added
  within `modules/search/**`. The Leaderboard dependency was reconciled through
  its canonical application port.
- **F-AUTH result:** Development-only fixture Auth and REST client seams, register/
  login/session restoration/logout state, protected navigation, reusable protected
  request 401 recovery, private-cache clearing, and logout transport-failure
  recovery were added within `apps/frontend/**`. Cookies remain the browser
  credential boundary; client-selected identity and raw session tokens are not
  accepted.
- **Review result:** The independent review found deadline enforcement while a
  fake port was awaiting, cancellation races, owner validation, protected-request
  wiring, and truthful non-401 logout state as actionable risks. Workers fixed all
  findings within their assigned scopes. The Manager re-reviewed the final diff,
  confirmed no unauthorized paths changed, and reran the affected suites and
  repository gates.
- **Validation inherited from INS-008:** Search and frontend fake/fixture
  focused suites, build/typecheck/lint, `verify:stage4a`, architecture,
  artifact, deferred-scope, backend smoke, root lint, and whitespace checks PASS.
  The formal OpenSpec CLI was unavailable and remains `UNVERIFIED`. INS-010
  live PostgreSQL evidence is pending worker execution/review; the Instructor
  recorded prior dedicated-cluster migrate/rollback/remigrate evidence as PASS.
- **Current task state:** D-01 is `READY` for INS-010; AU-01 is `REVIEW` and
  gated on D-01; Q-01 and F-AUTH remain `REVIEW`; all other unfinished tasks
  remain `BLOCKED`. No unauthorized task has been started.
- **Pre-execution checkpoint:** `7cab605` on `MVP_IMPLEMENTATION`; the control
  reconciliation in this file is pending the Manager's checkpoint commit.
- **Active delegation:** D-01 is `IN_PROGRESS` with worker Dewey in the disjoint
  `infra/db/**` and packet-assigned PostgreSQL adapter/test scope. The Manager is
  reviewing evidence and integration only; AU-01 remains unassigned and gated.
- **Historical implementation checkpoint:** `INS-002` /
  `APPROVED_FOR_EXECUTION`, starting at branch `MVP_IMPLEMENTATION`, HEAD
  `29544eac0e91e0c566ea75b830aa2ceea4069fdd`, clean working tree.
- **INS-002 authorization applicability:** PASS. The sole commit after the Instructor's
  reviewed HEAD `e9ab1b3bc832f91c975d39a8d4324d455ee5a91e` was `29544ea`, whose
  complete diff changed only `docs/control/INSTRUCTOR.md` as the instruction allowed.
- **Historical completed frontier before INS-005:** C-01A, E-01, and F-01 were
  DONE; the preceding authorization was exhausted.
- **Post-INS-005 next authorization:** REQUIRED before any newly READY task starts.

## Historical task results (INS-004 and earlier)

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

## Historical independent review

- C-01A initial review found owner-less direct-root mutation ports. The worker made
  Strategy/Composite insert, SearchRun save, and Candidate save owner-first and
  strengthened cross-owner fixtures. Re-review: PASS, no remaining findings.
- E-01 initial review found sparse-array validation bypass and then a test-only
  TypeScript cast error. Both were fixed. Re-review: PASS, no remaining findings.
- F-01 initial review found late-subscription readiness, unbounded open/close retry,
  obsolete recovery ownership, and rendered-evidence gaps. All were fixed with
  regressions and browser evidence. Re-review: PASS, no remaining findings.

## Historical manager validation

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

## Historical INS-004 governance reconciliation

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

## Historical task-state transitions and recomputed DAG

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

## Historical Git checkpoint and recovery

- Source commits: `9ca2d7c` (C-01A), `a20a7c5` (E-01), `901065a` (F-01).
- Final control-plane checkpoint: the commit containing this file and the matching
  `TASKS.md` update; resolve with `git rev-parse HEAD` after checkout.
- Expected final working tree: clean on `MVP_IMPLEMENTATION`.
- Do not execute D-01, S-01, AU-01, F-AUTH, or any other task until a fresh current
  Instructor instruction explicitly authorizes the next frontier.
