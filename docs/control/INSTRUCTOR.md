# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-081`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-081 — Extension Evaluation and Decimal-Boundary Reconciliation

This current signal supersedes `INS-080 / HOLD` and authorizes exactly one
fresh Manager to execute and close only packet `E-02`. It authorizes no other
packet, worker thread, retry, replacement, duplicate, downstream promotion, or
unrelated control/source change.

### Reviewed checkpoint and applicability

- Reviewed base: `856f0973acf7066149777c566bef847180cc270d`
  (`docs(control): hold after INS-079 audit`) on branch
  `MVP_IMPLEMENTATION`. Git status is clean and the source/business tree has
  not drifted since the accepted S-04 reconciliation.
- The current operational board is `35 DONE`, `1 REVIEW` (`M-02`), and
  `7 BLOCKED` (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`).
  `C-02`, `B-03`, and the completed legacy `E-01` evidence required to start
  E-02 are DONE. E-02 is the documented E2 frontier; L-02 is downstream and
  depends on it.
- `MVP_PLAN.md` defines E-02 as the decimal Evaluation boundary join from
  B-03 to L-02. The exact packet requirements are
  `CSL-R-BT-02`, `CSL-R-RP-02`, and `CSL-R-EV-01`. Its integration dependencies
  `L-02`, `F-03`, and `I-03` are not start dependencies and must remain
  blocked.
- The current Evaluation public contracts are frozen in
  `modules/evaluation/api/contracts.ts`; the existing evaluator is the exact
  source evidence for the already-approved baseline metric surface. E-02 may
  reconcile the implementation within its module boundary but may not edit
  that canonical contract file.
- Active-task inspection found only this Instructor task. There is no active
  Cryptox Manager or worker, so a fresh Manager can be created without a
  duplicate or concurrency conflict.

### Authorization

- Create exactly one fresh Orchestrator/Manager in the same canonical checkout
  `D:\agy-cli-projects\AOS\Cryptox`, on branch `MVP_IMPLEMENTATION`, with no
  worktree or alternate branch, using model `gpt-5.6-luna` and reasoning
  `max`. Do not reuse a historical Manager and do not create a duplicate.
- The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify the
  current signal, reviewed base, branch/status, task DAG, dependencies,
  checkpoint, and active-task list before acting. If any material premise has
  changed, it must stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may create exactly one internal Evaluation worker/subagent using
  the repository-approved internal subagent mechanism. It must not create a
  user-facing worker task, worktree worker, second worker, retry, replacement,
  or duplicate. The Manager must stop when this authorization is exhausted.
- The authorized packet is **E-02 — Extension Evaluation and Decimal-Boundary
  Reconciliation** only. The Manager alone may transition E-02 through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` and may update
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  Workers must not edit those files or any Instructor/decision artifact.
- Authorized source/write scope is limited to
  `modules/evaluation/**`, excluding frozen
  `modules/evaluation/api/contracts.ts`, and focused Evaluation tests or
  module documentation required to prove the packet. API bootstrap/index,
  application, and domain files are allowed only when needed for the approved
  public Evaluation boundary. No other module or root source may change.

### Required behavior and acceptance

- Consume the completed decimal-normalized paper result produced by B-03
  through the public Evaluation boundary. Preserve independence from Strategy
  and Backtesting implementation details.
- Prove deterministic, finite `REQUIRED_METRICS_V1` outputs: Return, Win Rate,
  Maximum Drawdown, and Number of Trades, including decimal/fixed-point fixture
  cases, zero trades, flat/zero equity curves, and valid Long/Short paper
  results.
- Do not recompute fills, fees, slippage, rounding, entry/exit behavior, or
  simulation inside Evaluation. Do not introduce optional metrics, risk,
  ranking/score, persistence, queues, providers, or business logic outside
  this packet.
- Reject invalid, sparse, non-finite, non-positive-denominator, or otherwise
  malformed input deterministically without emitting ranking output; preserve
  input immutability and explicit finite-output guarantees.
- Keep the frozen API contract and module ownership boundaries intact. Do not
  edit migrations, dependencies, Strategy, Backtesting, Leaderboard,
  frontend, backend composition, provider code, or any deferred scope.

### Validation and stop condition

- The Manager must review the one worker's diff and evidence independently,
  including focused Evaluation decimal-boundary tests and the complete
  Evaluation package suite, typecheck, build, and lint.
- Run the relevant root workspace tests and gates: architecture, artifacts,
  deferred-scope, scope tests, typecheck, build, lint, and `git diff --check`.
  Record unavailable OpenSpec CLI, live-provider, PostgreSQL, browser/demo, or
  other environment evidence as `UNVERIFIED` or `BLOCKED`, never `PASS`.
- Verify exact write scope, no deferred-scope leakage, no source/business-state
  drift, and consistency of TASKS/HANDOFF before accepting. A failed check,
  scope breach, unexpected contract change, or missing decimal-boundary proof
  requires `REVIEW`/`BLOCKED` and Instructor review rather than broadening the
  packet.
- Record `INS-081` and the reviewed base in the checkpoint, attempt at most
  one coherent Manager checkpoint commit, report any permission failure
  truthfully, and stop. Do not start L-02, F-03, I-03, M-02, AU-02, I-01,
  I-02, or any other downstream/deferred work.

### Concurrency rationale

- No safe second implementation packet is available under this signal: L-02
  is a critical downstream join that depends on E-02, while F-03/I-03 and the
  baseline integration packets are gated by additional dependencies. One
  internal worker is therefore the maximum quality-preserving concurrency for
  INS-081.

## INS-079 — Reconcile the committed INS-077 checkpoint

This current signal supersedes `INS-078 / HOLD` and authorizes exactly one
fresh Manager for a control-plane-only reconciliation. It authorizes no worker,
feature implementation, retry, replacement, duplicate, downstream promotion,
or task-state transition.

### Reviewed checkpoint and exact authority

- Branch: `MVP_IMPLEMENTATION`; reviewed base is
  `2c69732ec2ed92be7084ca59175b49c48963cc71` (`docs(control): hold after
  INS-077 audit`). The working tree is clean, and active-task inspection found
  no Cryptox Manager or worker.
- The S-04 source and Manager-owned checkpoint delta were independently
  accepted and committed at `01db873`. The Manager's one staging/commit denial
  remains historical evidence and must not be rewritten as a successful
  Manager commit.
- `TASKS.md` and the top `HANDOFF.md` checkpoint still describe the accepted
  S-04 source/control changes as uncommitted at `3184d7a`. This is a stale
  checkpoint statement, not a source or business-state change, and must be
  reconciled before any new implementation authorization.
- Current operational states must remain unchanged: `35 DONE`, `1 REVIEW`
  (`M-02`), and `7 BLOCKED` (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`,
  `I-03`). `TASKS.md` remains the sole task-state authority.

### Exact Manager authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal
  and base from Git, inspect TASKS/HANDOFF consistency and active tasks, and
  stop if any material source/business/DAG drift is found.
- This authorization is Manager-owned governance reconciliation only. Create
  no worker or subagent; do not use a user-facing thread for a worker, and do
  not create a branch or worktree.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. It may update the current S-04 latest
  commit/checkpoint references from “uncommitted at `3184d7a`” to the accepted
  `01db873` checkpoint and preserve the historical staging denial. It must not
  change any task state, dependency, validation claim, source, contract,
  migration, dependency, frontend, backend, OpenSpec, ADR, or other file.

### Acceptance, validation, and stop condition

- Reconcile only the stale S-04 commit/checkpoint language, preserve all other
  task rows and historical evidence, and ensure the top HANDOFF and S-04 row
  agree with `01db873`.
- Verify the exact two-file diff, `git diff --check`, and applicable control
  consistency checks. Unavailable checks remain `UNVERIFIED`/`BLOCKED`, never
  `PASS`.
- Attempt exactly one coherent Manager checkpoint commit. If Git staging or
  commit is denied, report the exact error once and do not retry; the parent
  Instructor may independently audit/commit the exact control delta.
- After that attempt and report, stop immediately. No packet or downstream
  work is authorized by INS-079, including `M-02`, `E-02`, `L-02`, `F-03`,
  `AU-02`, `I-01`, `I-02`, or `I-03`.

## INS-078 — Post-INS-077 independent audit HOLD

This current signal supersedes `INS-077 / APPROVED_FOR_EXECUTION`. The
authorized S-04 implementation is accepted at its bounded packet boundary and
the control plane is now held pending the next Instructor frontier review. It
authorizes no Manager, worker, retry, replacement, duplicate, downstream
promotion, or other task-state transition.

### Verified checkpoint and acceptance

- Branch: `MVP_IMPLEMENTATION`; the reviewed S-04 source/control checkpoint is
  committed at `01db873` (`feat(strategy): implement controlled LLM authoring`)
  on top of `3184d7a` (`INS-077 / APPROVED_FOR_EXECUTION`). The working tree is
  clean after the parent Instructor committed the exact Manager-reported delta
  that Git refused to stage for the Manager.
- Manager `01a050e8-b340-7df1-8724-0e52e00f234d` used exactly one internal
  Strategy worker, Helmholtz `01a050f1-73b9-7c51-975b-19d6247ef96d`, in the
  canonical same-directory checkout. No competing Cryptox Manager/worker is
  active; the Manager was archived after completion. No downstream packet was
  started.
- Only `S-04` moved through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW ->
  DONE`. The current board is `35 DONE`, `1 REVIEW` (`M-02`), and `7 BLOCKED`
  (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`).
- The exact source delta is limited to the eight authorized Strategy
  API/application/infrastructure source/test paths; the Manager-owned control
  delta is limited to `TASKS.md` and `HANDOFF.md`. Frozen contracts/ports,
  News, migrations, dependencies, frontend, backend composition, domain/plugin
  code, and unrelated files are unchanged.
- Independent validation PASS: Strategy `15` test files / `116` tests, root
  workspace tests, root build/typecheck/lint, architecture, artifacts,
  deferred-scope, `test:scope-check` `13/13`, and `git diff --check`.
  Environment-gated tests remain skips, not passes.
- Truthful limitations remain: OpenSpec CLI is unavailable (`UNVERIFIED`),
  live configured provider and browser/demo evidence are `UNVERIFIED`, and
  Docker/PostgreSQL validation is `BLOCKED`/`UNVERIFIED` because this host
  lacks usable `docker compose` access. No fixture or skipped test is promoted
  to live evidence.

### HOLD conditions and next review

- Re-read the current `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, requirements,
  accepted ADRs, architecture, data model, active capability/change specs, and
  the source/tests for the selected frontier before any new signal.
- Verify Git cleanliness, the absence of active Manager/worker tasks, current
  dependency satisfaction, and a disjoint write scope. Do not infer authority
  from a `READY` row or from S-04 completion.
- The next review may consider `E-02` because its recorded start dependencies
  (`C-02`, `B-03`, `E-01`) are `DONE`; it must not be treated as authorized by
  this HOLD. `L-02`, `F-03`, `I-01`, `I-02`, `I-03`, `AU-02`, and the
  `M-02` review state remain separately gated.
- Any next implementation authorization must name its packet, requirement IDs,
  exact write scope, acceptance criteria, validation, dependencies,
  prohibitions, and stop condition. A fresh same-directory Manager must use
  `gpt-5.6-luna` with `max` reasoning and internal subagents only; no
  user-facing `create_thread` dispatch is permitted for workers.

## INS-077 — S-04 controlled LLM authoring

This current signal supersedes `INS-076 / HOLD` and authorizes exactly one
bounded `S-04` implementation. It authorizes no other packet, retry,
replacement, duplicate, or downstream promotion.

### Reviewed checkpoint and authority

- Branch: `MVP_IMPLEMENTATION`; reviewed base is
  `723d1700bd39c4417cbfe13ca6a56bdb8a4ce378` (`docs(control): hold after
  INS-075 audit`). The working tree was clean at review and no Cryptox Manager
  or worker was active.
- The authority chain agrees: `DEC-007`, `ADR-009`, the approved
  `CSL-R-ST-05`/`CSL-R-RP-02` requirements and safe-content join
  `CSL-R-NW-02`, `openspec/specs/strategy/spec.md`, and the `S-04` packet in
  `MVP_PLAN.md`/`TASKS.md` define the same controlled authoring boundary.
- Start dependencies are verified from `TASKS.md`: `C-02`, `S-01`, and the
  URL-origin prerequisite `N-03`/`N-03A` are `DONE`. `S-05`, `S-06`, `Q-02`,
  `B-03`, and `M-03` are also `DONE`. `F-03`, `AU-02`, and `I-03` are
  integration dependencies only and remain blocked; they are not authorized by
  this signal.
- The operational board remains `34 DONE`, `1 REVIEW` (`M-02`), and
  `8 BLOCKED`. `TASKS.md` remains the sole operational-state authority.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal
  and base checkpoint from Git, check the DAG/dependencies and active-task list,
  and stop if any material premise or source/business state drifted.
- The Manager may create exactly one fresh Strategy application worker for
  `S-04`, with a disjoint source write scope. No second worker, retry,
  replacement, worktree, branch, or duplicate Manager is allowed.
- The Manager alone may update `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the worker must not edit any control-plane
  artifact. The Manager must stop after the S-04 review/checkpoint.

### Packet, requirements, and exact write scope

- Packet: `S-04 — Controlled LLM_AUTHORING_V1 Strategy Drafts`.
- Requirement IDs: `CSL-R-ST-05`, `CSL-R-RP-02`, and the safe imported-content
  join in `CSL-R-NW-02`.
- Allowed implementation scope: `modules/strategy/api/**` excluding
  `contracts.ts` and contract-only tests; `modules/strategy/application/**`
  for authoring implementation/repositories excluding the canonical
  `ports.ts`; `modules/strategy/infrastructure/**` for the provider adapter;
  and focused Strategy authoring tests. Existing frozen contracts may be read
  and consumed but not changed.
- Forbidden scope: `modules/strategy/api/contracts.ts`,
  `modules/strategy/application/ports.ts`, canonical REST contracts,
  `modules/strategy/domain/**`, `modules/news/**`, direct URL fetching or News
  persistence, migrations, dependencies, frontend, backend composition,
  credentials/secrets, queues/distributed execution, automatic approval, and
  every unrelated source or control-plane file.

### Acceptance, validation, and stop condition

- Implement a provider-neutral, configured OpenAI-compatible demo adapter that
  makes at most one request per prompt or approved-News-item submission, has a
  hard 45-second timeout, performs no retry/queue behavior, and never exposes
  or persists provider secrets, raw prompts, or raw completions.
- Produce a structured draft only; deterministic schema/domain validation must
  precede any persistence. Missing configuration, timeout, provider failure,
  malformed draft, rejected validation, and rejected approval must have no
  persistence side effect.
- Require an explicit authenticated Save/Approve action to create exactly one
  immutable owner-scoped Strategy Definition version with safe authoring origin
  metadata. Cross-user reads/mutations must have the approved not-found
  behavior. An URL-origin submission may use only the existing safe News public
  boundary and approved News item; Strategy must never fetch the URL directly.
- Add focused unit/contract/owner-approval/no-write/timeout/provenance tests,
  then run applicable Strategy tests and package typecheck/build/lint plus
  repository scope, architecture, artifact, deferred-scope, and diff checks.
  Configured real-provider or PostgreSQL/browser evidence is recorded as
  `PASS` only when actually run; unavailable evidence remains `UNVERIFIED` or
  `BLOCKED`, never inherited from fixtures or skipped tests.
- Move only `S-04` through the normal operational sequence
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` when evidence warrants
  it. Do not start or promote `F-03`, `AU-02`, `I-01`, `I-02`, `I-03`, `E-02`,
  `L-02`, `M-02`, or any other packet. After one Manager checkpoint commit
  attempt and report, stop for independent Instructor review.

## Historical INS-076 — Post-INS-075 independent audit hold

This historical signal recorded the independent Instructor review after `INS-075`.
It authorizes no Manager, worker, implementation, retry, replacement, closure
review, downstream promotion, or other task-state transition.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`; the reviewed HEAD is
  `19164a65d89b51215f031dd99619726f34271353` (`docs(control): reconcile
  INS-073 checkpoint`). The working tree was clean before this signal, and no
  competing Cryptox Manager or worker was active.
- `INS-075` completed its control-only authorization. Its Manager changed only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`;
  independent review confirmed the diff and `git diff --check`. The Manager's
  own staging failure remains recorded as historical evidence; the parent
  Instructor persisted the reviewed control delta at `19164a6` after the
  environment denied the Manager's Git staging attempt.
- `TASKS.md` remains the sole operational-state authority: 43 rows total,
  `34 DONE`, `1 REVIEW` (`M-02`), and `8 BLOCKED` (`AU-02`, `S-04`, `E-02`,
  `L-02`, `F-03`, `I-01`, `I-02`, `I-03`). `N-03A` and its existing `N-03`
  closure are `DONE` and point to the integrated News checkpoint
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
- The `MVP_PLAN.md` DAG still requires the remaining E1/E2/E3 work and the
  baseline/security gates before `I-03` and final `I-02`. `AU-02` retains its
  `NEEDS_HUMAN_DECISION` boundary, and no unavailable PostgreSQL, real-provider,
  browser/demo, OpenSpec CLI, or link/DAG evidence is promoted to `PASS`.

### HOLD conditions and next review

- Keep the repository at this safe checkpoint. Do not infer authorization from
  any `READY` row or from the fact that `N-03`/`N-03A` are now `DONE`.
- The next Instructor review must re-read the current `MVP_PLAN.md`,
  `TASKS.md`, `HANDOFF.md`, requirements, accepted ADRs, architecture, data
  model, active specs, and the source/tests for a selected frontier. It must
  verify Git cleanliness, the absence of active Manager/worker tasks, current
  dependencies, and a disjoint write scope before issuing a new signal.
- Any future implementation authorization must name its packet, requirement
  IDs, exact write scope, acceptance evidence, validation, dependencies,
  prohibitions, and stop condition. A fresh same-directory Manager must use
  `gpt-5.6-luna` with `max` reasoning, and any independent implementation must
  be delegated to an authorized worker.

## Historical INS-075 — Reconcile the audited INS-073 checkpoint

This historical signal superseded `INS-074 / HOLD` and authorized exactly one
fresh Manager for a control-plane-only reconciliation. It does not authorize a
worker, feature implementation, retry, replacement, duplicate, or downstream
start.

### Reviewed checkpoint and reason for reconciliation

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base: `6727122` (`docs(control): hold after N-03A audit`); the
  working tree was clean at that checkpoint and no Cryptox Manager or worker
  was active.
- The independently reviewed N-03A source and tests, together with the
  Manager-owned task/checkpoint changes, are integrated at
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd` (`feat(news): complete N-03A
  refresh scheduler`). The latest `HANDOFF.md` was written before that narrow
  integration and therefore still says the reviewed worker paths remain
  uncommitted. That statement must be reconciled by the Manager who owns the
  handoff artifact.
- Current task facts to preserve: `N-03A=DONE`, `N-03=DONE`, `M-02` is
  `REVIEW/UNVERIFIED`, and `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, and `I-03` are `BLOCKED`. No other task state may change.

### Exact Manager authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, recover the current
  signal from Git, and verify the reviewed base, actual integration commit,
  task board, handoff, and absence of competing active tasks.
- This is Manager-owned governance reconciliation; no worker or subagent is
  authorized or needed. Do not create any worker, retry, replacement, branch,
  worktree, or duplicate task.
- **Exact write scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. The Manager must not edit
  `INSTRUCTOR.md`, `DECISIONS.md`, `MVP_PLAN.md`, requirements, ADRs,
  architecture, data model, OpenSpec artifacts, source, tests, migrations,
  dependencies, frontend, backend composition, providers, or infrastructure.

### Acceptance and validation

- Reconcile the N-03A row and the latest INS-073 checkpoint so they identify
  the actual integrated checkpoint `f320b5f` and no longer claim the reviewed
  worker paths are uncommitted. Preserve the recorded Manager staging failure
  as historical evidence; do not rewrite it as a successful Manager commit.
- Preserve the exact `N-03A` and `N-03` `DONE` states and every unrelated task
  state, dependency, and stop boundary. Do not promote or start any other
  packet.
- Verify the final control-only diff contains no path outside the two allowed
  files, run `git diff --check` and applicable control-plane consistency checks,
  and record any unavailable check as `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Attempt exactly one coherent Manager checkpoint commit containing only
  `TASKS.md` and `HANDOFF.md`. If Git staging/commit is denied, report the
  exact error once and do not retry; the parent Instructor will independently
  audit any remaining control delta.

### Stop condition

After the reconciliation and one commit attempt, stop immediately. This
signal authorizes no `M-02`, `S-04`, `E-02`, `L-02`, `F-03`, `AU-02`, `I-01`,
`I-02`, `I-03`, or any other implementation/closure packet. The next step is
an independent Instructor audit and a new `HOLD` signal.

### Evidence limitations

Real configured News/Binance, PostgreSQL/Docker runtime, browser/demo runtime,
OpenSpec CLI, and link/DAG automation remain `UNVERIFIED` or `BLOCKED` where
applicable. Fixtures and skipped tests are not promoted to `PASS`.

## Historical INS-074 — Independent post-INS-073 audit hold

This is the current Instructor signal and supersedes `INS-073 /
APPROVED_FOR_EXECUTION`. The N-03A implementation and N-03 closure passed
independent review and were integrated at commit `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
Execution is now on HOLD because the latest Manager checkpoint still contains
one stale statement about the worker paths being uncommitted.

### Verified checkpoint

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
- The working tree was clean after the audited integration commit. The commit
  contains only the three reviewed N-03A News paths and the Manager-owned
  `TASKS.md`/`HANDOFF.md` checkpoint changes; the Instructor did not implement
  feature code.
- `TASKS.md` records `N-03A=DONE` and `N-03=DONE`; `M-02` remains
  `REVIEW/UNVERIFIED`; `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, and `I-03` remain `BLOCKED`.
- The INS-073 Manager and its single News worker are complete and archived;
  no Cryptox Manager, worker, duplicate, or retry is active.

### Independent evidence

- N-03A scheduler `5/5`, News `35/35`, Sentiment `19/19`, and public News API
  `3/3` passed.
- Root workspace tests passed `346` with `6` environment-gated skips; skips
  are not PASS evidence. Root/package typecheck, build, lint, architecture,
  artifacts, deferred-scope/checker, and diff checks exited successfully.
- The worker changed only `modules/news/application/scheduler.ts`,
  `modules/news/application/scheduler.spec.ts`, and the minimal scheduler
  export in `modules/news/api/bootstrap.ts`. No contracts, infrastructure,
  migration, dependency, or unrelated source path changed.

### Reconciliation required before the next feature authorization

- The latest `HANDOFF.md` correctly records the Manager's one staging failure,
  but its final sentence still says the reviewed worker paths remain
  uncommitted. That is stale after `f320b5f`.
- The Instructor will not edit `TASKS.md` or `HANDOFF.md`. A fresh Manager must
  receive a separate control-only authorization to reconcile those two files
  with the actual integrated commit, then stop. No feature implementation,
  retry, replacement, downstream promotion, `M-02`, `AU-02`, `I-01`, `I-02`,
  or deferred packet is authorized under this HOLD.

### Evidence limitations

Real configured News/Binance, PostgreSQL/Docker runtime, browser/demo runtime,
OpenSpec CLI, and link/DAG automation remain `UNVERIFIED` or `BLOCKED` where
applicable. Fixtures and skipped tests are not promoted to PASS.

## Historical INS-073 — N-03A News auto-refresh completion and N-03 closure

This replaceable signal supersedes `INS-072 / HOLD` and authorizes exactly one
fresh Manager and exactly one fresh News worker for the residual `N-03A`
completion packet. It authorizes no retry of the completed N-03 worker, no
other implementation, and no downstream start.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `1fda6ad`
  (`docs(control): approve N-03A refresh completion`). The parent Instructor
  reviewed the governance-only plan/decision delta and Git is clean.
- The operational board currently contains 32 `DONE`, 2 `REVIEW` (`M-02`,
  `N-03`), and 8 `BLOCKED` (`AU-02`, `S-04`, `I-01`, `I-02`, `E-02`, `L-02`,
  `F-03`, `I-03`) rows, 42 existing rows total. `N-03A` is newly planned in
  `MVP_PLAN.md` and must be added as a separate operational row by the Manager
  before it is executable.
- M-03 is `DONE` under INS-071 at `280b280`; C-02, C-03, Q-02, B-03,
  ENV-03, and ENV-04 remain `DONE`. N-03 source/business state remains at
  `d4161ec458c869ff18fa89dd9732df260629c915`; its safe-fetch, extraction,
  retention, provenance, and neutral Sentiment evidence is preserved, but its
  checkpoint explicitly records that only the 1–5 minute setting/default exists
  and no scheduler is implemented.
- `DEC-014` and `MVP_PLAN.md` now define N-03A as completion of the approved
  `CSL-R-NW-02` behavior. They do not expand product scope, reopen N-03 source
  history, or authorize downstream tasks. Real PostgreSQL, configured Binance
  and News providers, browser/demo runtime, link/DAG automation, and OpenSpec
  CLI evidence remain `UNVERIFIED` or `BLOCKED` where recorded. No unavailable
  check, fixture, or skipped test is treated as `PASS`.

### Authorized packet and delegation

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, with model
  `gpt-5.6-luna` and `xhigh` reasoning. It must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify this
  signal, the new N-03A plan/decision, Git, TASKS, HANDOFF, the DAG,
  dependencies, and active tasks.
- The Manager must add exactly one `N-03A` operational row to `TASKS.md` in
  `READY` state, with the packet's requirement IDs, dependencies, exact scope,
  and stop evidence. It must then move only N-03A through
  `READY -> IN_PROGRESS` before dispatching the worker. Existing N-03 remains
  `REVIEW` until the residual acceptance is proven; it must not be retried or
  moved to another state before then.
- Delegate exactly one fresh News worker after the READY/dependency check. The
  worker must use the canonical same-directory checkout, must not create a
  thread/worker, branch, worktree, commit, or control-plane edit, and must not
  edit `TASKS.md`, `HANDOFF.md`, `INSTRUCTOR.md`, `DECISIONS.md`,
  `MVP_PLAN.md`, requirements, ADRs, or OpenSpec artifacts. No retry,
  replacement, duplicate, or second worker is authorized.
- **Worker write scope:** `modules/news/api/**` excluding `contracts.ts` and
  contract-only tests; `modules/news/application/**`; and focused News
  scheduler tests in those boundaries. No infrastructure change is authorized;
  if the implementation genuinely requires one, stop and report
  `NEEDS_INSTRUCTOR_REVIEW`. No Sentiment, Strategy, frontend, backend
  composition root, contract, migration, dependency, credential, arbitrary
  URL, queue, distributed, or unrelated source change is authorized.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for the N-03A row, N-03 closure, review,
  and checkpoint. The Manager must preserve every unrelated task state and
  stop before S-04, E-02, L-02, F-03, I-01, I-02, I-03, AU-02, M-02, or any
  other packet.

### Acceptance and validation

- Implement a provider-neutral, application-owned, testable scheduler that
  accepts the existing configured 1–5 minute interval and five-minute default,
  invokes the existing public News collection at each interval, prevents
  overlapping collection runs, isolates a failed refresh so later ticks remain
  possible, and shuts down idempotently so no future tick runs. It must not
  perform direct remote fetching, persist timer state, log secrets, or create a
  queue/distributed worker protocol.
- Tests must cover cadence, default and invalid intervals, non-overlap, failure
  continuation, and shutdown using injected timer/clock seams. The public API
  must remain contract-compatible and later runtime integration must be able to
  consume the scheduler through the News boundary.
- The Manager must review exact changed paths and re-run the original N-03
  focused News/Sentiment tests plus N-03A tests, relevant public API tests,
  current checker and `scope:check`, architecture, artifacts, typecheck, build,
  lint, and `git diff --check`. Real configured News, PostgreSQL, browser/demo,
  OpenSpec CLI, and link/DAG automation remain `UNVERIFIED`/`BLOCKED` when
  unavailable; fixtures and skips are not live-provider evidence.
- If the residual evidence is complete, move N-03A through
  `IN_PROGRESS -> REVIEW -> DONE`, then move the existing N-03 exactly
  `REVIEW -> DONE` under this authorization and record both transitions. If a
  material premise is false, keep N-03A/N-03 at the safe state, record the
  exact blocker, and stop. Attempt one coherent Manager checkpoint commit
  containing only TASKS/HANDOFF; if Git staging/commit is denied, report it once
  and do not retry or broaden scope.
- The Manager must stop immediately after the N-03A review and optional N-03
  closure. No downstream promotion is implied by this instruction.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [ADR-009](../adr/ADR_009_controlled_llm_and_external_content.md)
- [News capability spec](../../openspec/specs/news/spec.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
