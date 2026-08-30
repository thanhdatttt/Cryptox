# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-057`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-057 — Q-02 seeded Domain-Guided and Genetic discovery

This replaceable signal supersedes `INS-056 / HOLD` and authorizes exactly one
bounded implementation packet: `Q-02`. It does not reopen C-02 or C-03 and does
not authorize any other feature or validation packet.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base is `72b357d358217a2b57b7d4fc29edfec4d1cac595`, the committed
  post-C-03 Instructor HOLD. The working tree is clean before this governance
  update; the Manager must verify the final authorization commit and current
  HEAD from Git.
- C-02 is `DONE`; C-03 is `REVIEW` with its independently accepted contract
  checkpoint at `51e98f9d5edd545831007dc6ce105701384bfd44`; S-01 and Q-01 are
  `DONE`. ENV-03 is `REVIEW` with a passing checker gate. Q-02 is `BLOCKED`
  and is not being treated as executable merely because it is next in the plan.
- B-02 and L-01 are completed integration inputs. B-03, M-03, N-03, M-02,
  S-04, E-02, L-02, F-03, I-01, I-02, and I-03 retain their recorded states;
  none is promoted or started by this signal.
- Active-task inspection found no Cryptox Manager or worker. No historical
  Manager or worker may be resumed, replaced, retried, or duplicated.

### Authorized packet: `Q-02`

- **Requirement IDs:** `CSL-R-SE-03`, `CSL-R-RP-02`, `CSL-R-OB-01`,
  `CSL-R-LB-01`; approved Q-02 plan and the reconciled C-03/DEC-012 public
  contract boundary.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  fully, then verify this signal, checkpoint, DAG, dependencies, active-task
  list, and write scopes before dispatch.
- **Fresh worker:** delegate exactly one fresh Search worker for Q-02. Do not
  resume, replace, retry, or duplicate a historical worker. The worker may
  not edit Instructor/decision/task/handoff governance, create a commit,
  branch, or worktree, or start another worker.
- **Worker write scope:**
  `modules/search/domain/generators/domain-guided/**`,
  `modules/search/domain/generators/genetic/**`, Search profile wiring and
  persistence projections under `modules/search/application/**` and
  `modules/search/infrastructure/**`, and focused tests under those Q-02
  implementation areas only. Canonical contract files, migrations, frontend,
  providers, queues, Backtesting, Evaluation, Leaderboard, and unrelated
  source are excluded.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for Q-02 state, worker review, evidence,
  limitations, checkpoint, and stop boundary. The Manager must not edit
  `INSTRUCTOR.md`, `DECISIONS.md`, or `MVP_PLAN.md`.

### Q-02 acceptance criteria

- Implement deterministic `DOMAIN_GUIDED_V1` and `GENETIC_V1` generators
  behind the reconciled public Search contracts while retaining the existing
  one-candidate form and Random behavior. Domain-guided generation may use
  only explicitly declared categories; it must not invent categories.
- Preserve algorithm configuration, seed, dataset identity, and code version
  in the approved bounded provenance and make identical inputs reproduce the
  candidate sequence and ranking.
- Genetic defaults are population 50, maximum 10 generations, elite 10%, and
  mutation 20%. Both profiles stop at the earlier of 500 candidates or five
  minutes and never exceed configured capacity or in-flight bounds.
- Search state, failures, timing, cancellation, and ranking remain observable
  through existing public Search/Backtesting/Leaderboard boundaries. Do not
  redesign those modules or add a second lifecycle.
- Do not implement LLM behavior, generalized risk, live trading, queues,
  distributed execution, microservices, or any deferred capability.

### Required validation and stop condition

- Move only Q-02 through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; do not
  mark it `DONE` under this authorization. Record INS-057 and the reviewed
  base in one coherent HANDOFF checkpoint.
- Run focused Domain-guided/Genetic and Search lifecycle tests, reproducibility
  and boundedness tests, persistence/projection tests in the authorized scope,
  `npm run arch:check`, `npm run artifacts:check`, `npm run typecheck`,
  `npm run build`, `npm run lint`, `npm run scope:check`, relevant workspace
  tests, and `git diff --check`.
- The current deferred-scope checker is not authorized to be weakened or
  broadened by Q-02. If Q-02 profile identifiers in actual implementation
  paths cause `scope:check` to fail, record **BLOCKED** with exact paths and
  stop; a separate Instructor authorization is required for checker-boundary
  reconciliation. Do not hide the failure with a generic exclusion.
- OpenSpec CLI, real PostgreSQL/provider/runtime, or any unavailable check is
  `UNVERIFIED`/`BLOCKED`, never `PASS`. No downstream packet may start when
  this authorization is exhausted.

### Prohibitions and references

- Do not touch C-03 canonical contracts, migrations, REST transport, frontend,
  Binance/News providers, Backtesting/Evaluation/Leaderboard source, or any
  packet outside Q-02. Do not start B-03, S-04, E-02, L-02, F-03, I-01,
  I-02, I-03, M-02, M-03, N-03, AU-02, or any checker reconciliation.
- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [C-03 checkpoint](../implementation/HANDOFF.md)
