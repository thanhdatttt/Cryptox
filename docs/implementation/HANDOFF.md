# INS-015 Execution Checkpoint

## Resume here

- **Level 2 control plane:** Active. INS-015 was applicable: its reviewed
  checkpoint `135aab7` matched the current `MVP_IMPLEMENTATION` branch and clean
  worktree before execution. `INSTRUCTOR.md` and `DECISIONS.md` were not edited.
- **Authorization exhausted:** Only B-02 packet-boundary closure, F-AUTH real
  AU-01 integration, and Q-01 real-port integration after B-02 DONE were in
  scope. No M-02 rework, AU-02, N-01/N-02, F-02, I-01/I-02, or other task was
  started.
- **B-02:** `REVIEW -> DONE` under DEC-006 in Manager commit `a24aa00`. The
  existing INS-014 implementation and evidence were independently rechecked:
  Backtesting 33/33, package typecheck/lint/build, Auth PostgreSQL 3/3,
  owner isolation, provenance, rollback, cancellation/saturation, and exactly
  one terminal outcome PASS. Cross-module Experiment/Leaderboard transaction
  atomicity remains `UNVERIFIED` and belongs to I-01.
- **F-AUTH:** `REVIEW -> IN_PROGRESS -> REVIEW`, delegated to worker
  `01a04b63-117d-7273-8ed5-db10730162eb` (Hypatia) in `apps/frontend/**`.
  Reviewed source commit `8abd6a8` wires the real session boundary, same-origin
  `/api` proxy, browser credentials, and regression coverage. Frontend 23/23
  plus typecheck/build/lint PASS; backend AU-01 PostgreSQL smoke 1/1 PASS.
  The bounded real browser/service probe produced no complete handoff, so
  protected navigation, reload restore, 401 recovery, cache isolation, and
  browser-observed HttpOnly-cookie behavior remain `UNVERIFIED`; F-AUTH is not
  DONE.
- **Q-01:** B-02 DONE was verified before delegation. Worker
  `01a04b64-bd80-77b3-95e0-0916cb90c11b` (Hubble) was assigned the disjoint
  `modules/search/**` real-port scope, but produced no reviewable handoff or
  source commit before the bounded stop. Q-01 remains REVIEW; real persistence,
  Backtesting/Leaderboard port integration, and DONE evidence are `UNVERIFIED`.
- **Other evidence/limitations:** M-02 remains REVIEW with live Binance
  evidence `UNVERIFIED` and was not reassigned. Formal OpenSpec CLI validation
  is `UNVERIFIED` because the CLI is unavailable. Missing services/providers
  are not counted as PASS; no credentials, passwords, cookies, or session
  values were logged.
- **Final checkpoint:** Source commit `8abd6a8` and Manager control checkpoint
  commit `a24aa00` plus this final reconciliation commit form the coherent
  INS-015 record. No downstream task was unlocked or started.

## INS-014 Historical Checkpoint

## Resume here

- **Level 2 control plane:** Active. Read `AGENTS.md`, current
  [`INSTRUCTOR.md`](../control/INSTRUCTOR.md), [`DECISIONS.md`](../control/DECISIONS.md),
  [`TASKS.md`](TASKS.md), and this checkpoint before acting.
- **Current instruction:** `INS-014` / `APPROVED_FOR_EXECUTION`, authorizing
  exactly the M-02 and B-02 review-closure phases. D-01, AU-01, M-01, and L-01
  remain DONE and are not reassigned or reworked.
- **INS-014 applicability:** PASS at execution start. Instructor-reviewed HEAD
  was `158e38f`; `9975a59` changed only the authorized signal, and the later
  `5b05404`/`f8c0d7d` commits changed only Manager-owned review-closure state.
  No source or business-state drift existed before the authorized workers ran.
- **Reconciliation:** M-02 and B-02 were REVIEW under exhausted INS-013. They
  are reconciled to READY solely for the bounded INS-014 review-closure phase;
  no downstream task is unlocked for execution by this checkpoint.
- **Delegation:** M-02 is assigned to the bounded worker task
  `01a04b38-10bd-7d21-9be0-598f311b80c6` in `modules/market-data/**`.
  B-02 is assigned to the separate bounded worker task
  `01a04b3d-5dd2-7df0-8be6-2ce393859c09` in `modules/backtesting/**`.
  Write scopes are disjoint and no worker may edit the control plane.
- **M-02 result:** The worker fixed socket-error recovery when no `close` event
  follows and added regression coverage. The focused realtime suite is 9/9
  PASS and the full Market Data suite is 23 PASS / 1 skipped; package
  typecheck/build/lint and whitespace checks PASS. The truthful Binance stream
  smoke is `UNVERIFIED` after provider failure and bounded reconnect exhaustion.
- **B-02 result:** The worker closed the finalization cancellation race, retained
  one terminal outcome, exposed executor timing/failure details, and corrected
  persisted replay reconstruction. The full Backtesting suite is 33/33 PASS;
  package typecheck/lint/build and whitespace checks PASS. Configured Auth
  PostgreSQL integration is 3/3 PASS; the worker's real Backtesting adapter
  probe verified same-owner reads and cross-user Experiment/Trade not-found with
  cleanup. Cross-module Experiment plus Leaderboard atomicity remains
  `UNVERIFIED` until a shared transaction-aware adapter is proven at I-01.
- **Independent review:** The final worker diffs remain within the disjoint
  Market Data and Backtesting scopes, preserve frozen contracts and migrations,
  and pass architecture/scope review. The cancellation window is explicitly
  non-cancellable once finalization begins; this does not establish cross-module
  atomicity. No external-provider limitation is reported as PASS.
- **Validation:** `verify:stage4a` PASS: workspace build, typecheck, tests,
  architecture, artifacts, deferred-scope, and runtime smoke. Runtime smoke is
  `/live=200`, `/ready=503`, `/health=404`; root integration tests retain their
  expected skips when `DATABASE_URL` is unset. Configured Auth integration
  passed separately. Formal OpenSpec CLI validation remains UNVERIFIED because
  the CLI is unavailable.
- **Current task state:** M-02 and B-02 are `REVIEW` under INS-014 after
  bounded review closure. They are not `DONE` because live Binance evidence
  and cross-module transaction proof remain unresolved. No downstream task was
  started. AU-02,
  Q-01 integration, F-AUTH integration,
  I-01, I-02, and all other unfinished tasks remain blocked or unauthorized.
- **Authorization status:** INS-014 is exhausted after the M-02/B-02 review
  closure attempts. Renewed Instructor review and a new Instruction ID are
  required before any further work, including I-01 or provider integration.
- **Safe checkpoint commits:** `5ac68b9` contains the scoped M-02/B-02 source
  and tests; `98f8bb5` and `158e38f` contain the prior INS-013 checkpoint;
  `9975a59` contains the INS-014 authorization; `5160c1c` contains the final
  INS-014 source, tests, and Manager control checkpoint. No downstream task was
  started.

## Historical checkpoints (prior to INS-012)
- **INS-010 applicability:** PASS at execution start. Instructor reviewed HEAD
  was `bc88f36`; the then-current `7cab605` commit changed only
  `docs/control/INSTRUCTOR.md`, which was the authorized instruction signal.
  The dedicated PostgreSQL 16.10 cluster at
  `postgres://cryptox@localhost:55432/cryptox` was reachable. The authorized
  D-01 and AU-01 source/control checkpoints now advance HEAD; no further work
  may be inferred from the original reviewed checkpoint.
- **Pre-execution reconciliation:** D-01 is reconciled from the prior partial
  `REVIEW` phase to `READY` for the authorized live migration/review packet.
  AU-01 remained `REVIEW` and gated until D-01 was independently reviewed and
  closed.
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
- **D-01 closure:** Dewey fixed only `infra/db/migrate.config.js` after the
  independent review found ignored flat config keys and an unsafe port-5432
  fallback. Manager review and integration commit `f5c5562` passed. The corrected
  config was exercised against `localhost:55432` with `down 2 -> up` exit 0/0;
  final inspection found 18 MVP tables, both migration records, `pgcrypto`, the
  five direct owner roots/FKs/indexes, no inherited/shared owner columns, and no
  deferred columns. Transactional uniqueness/FK/idempotency probes passed 13/13.
- **AU-01 gate:** D-01 was independently reviewed and closed before AU-01 was
  reconciled to `READY`. F-AUTH's fake/fixture boundary remains reviewed PASS.
  Kepler completed the authorized implementation in the disjoint Auth/backend
  transport scope; Banach completed review-fix cleanup. Godel and Cicero were
  interrupted before edits. Volta independently reviewed the final diff and
  returned PASS.
- **Validation inherited from INS-008:** Search and frontend fake/fixture
  focused suites, build/typecheck/lint, `verify:stage4a`, architecture,
  artifact, deferred-scope, backend smoke, root lint, and whitespace checks PASS.
  The formal OpenSpec CLI was unavailable and remains `UNVERIFIED`. INS-010
  live PostgreSQL evidence was completed under INS-010; the Instructor's prior
  dedicated-cluster evidence was independently reconciled.
- **Current task state:** D-01 and AU-01 are `DONE` for INS-010. M-01 and L-01
  are `READY` from DAG recomputation but are explicitly unauthorized and not
  started; Q-01 and F-AUTH remain `REVIEW`; all other unfinished tasks remain
  `BLOCKED`.
- **D-01 closure checkpoint:** `f5c5562` on `MVP_IMPLEMENTATION`.
- **AU-01 interruption checkpoint:** `eb23d7b`/`8e8fc61` on
  `MVP_IMPLEMENTATION`; Godel and Cicero changed no files and produced no
  implementation evidence. Kepler's implementation is recorded at the
  `0be1ca5` assignment checkpoint; Banach completed the final review corrections.
- **AU-01 integration checkpoint:** `a9b026b` on `MVP_IMPLEMENTATION`. Auth
  PostgreSQL integration 11/11 and backend E2E 9/9 passed on the dedicated DB;
  full `verify:stage4a` passed after resolving the public bootstrap architecture
  seam. The independent Auth review returned PASS, and no credentials were
  committed.
- **INS-010 completion:** Both authorized phases were reviewed, integrated, and
  closed. Authorization is exhausted; a new Instructor review and Instruction ID
  are required before any READY task starts.
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
