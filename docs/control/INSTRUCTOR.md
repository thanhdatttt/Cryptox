# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-036`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-036 — E1 pure Strategy extensions: `S-05` and `S-06`

This signal supersedes `INS-035 / HOLD` only for the two explicitly named
packets below. It does not promote any downstream task or authorize any other
packet.

### Instructor review and starting checkpoint

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `c0e255f59557f70b682f07c0062f3564920130c2`
  (`docs(control): clarify amendment authority precedence`).
- The accepted C-02 source/business checkpoint remains
  `ed761e36c5ab2293d08c0a3aef5889ab675e772a`.
- The intervening `157a31f5baacb73597b7e237eb32df7b443aa076` commit adds only
  the README and five amendment screenshots under
  `docs/assignment/amendment-2026-08-29/`; all five recorded SHA-256 values
  match the README. `c0e255f` adds only the governance clarification `DEC-009`.
  Review of `ed761e3..c0e255f` found no runtime source, package, migration,
  infrastructure, or business-state drift.
- The canonical checkout was clean before this signal edit. `git diff --check`
  passed. The task list and execution checkpoint remain consistent with
  `C-02 = DONE`, while `S-05` and `S-06` are still `BLOCKED` and therefore are
  not being treated as READY without this signal.
- No active Cryptox Manager, Orchestrator, or worker was found. Historical
  tasks/threads and preserved worktrees are not reused or deleted.
- `DEC-007` and `DEC-009` authorize and clarify the amendment profiles; the
  requirements, accepted ADR amendments, architecture, data model, and active
  OpenSpec specifications remain the detailed executable authority.

### Authorized packets and dependencies

The Manager may execute exactly `S-05` and `S-06`, in parallel only because
their implementation write scopes are disjoint. Both packets depend on completed
`C-02` and `S-01`, which were verified as `DONE`. The Manager may move only
these two task rows through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`
when the evidence supports each transition. `M-02` remains `REVIEW` with live
provider evidence `UNVERIFIED`; it is not to be reopened or repaired here.

#### `S-05` — Immutable `WEIGHTED_VOTE_V1` composite

- Requirement IDs: `CSL-R-ST-03`, `CSL-R-ST-06`, `CSL-R-RP-02`.
- Objective: implement the immutable weighted composite policy over exact
  same-owner component versions without identity-branching.
- Exact implementation and test scope: new files only under
  `modules/strategy/domain/composite/**` and
  `modules/strategy/application/composite/**`.
- Acceptance: enabled BUY/HOLD/SELL signals map to `+1/0/-1`; weights are
  finite and non-negative and normalize to one; thresholds `+0.30` and
  `-0.30` produce BUY and SELL, with all other scores—including ties—producing
  HOLD; enabled state, weights, thresholds, and exact component versions are
  immutable provenance; invalid, zero-total, non-finite, or cross-owner
  definitions fail before execution; results are deterministic and pure; tests
  explicitly distinguish this policy from historical `MAJORITY_VOTE_V1`.

#### `S-06` — Deterministic `SMC_LITE_V1` and `WYCKOFF_LITE_V1` plugins

- Requirement IDs: `CSL-R-ST-07`, `CSL-R-RP-02`.
- Objective: add two bounded, documented, deterministic Strategy plugins with
  no claim of full discretionary or professional SMC/Wyckoff behavior.
- Exact implementation and test scope: new files only under
  `modules/strategy/domain/plugins/smc-lite/**` and
  `modules/strategy/domain/plugins/wyckoff-lite/**`.
- Acceptance: SMC Lite uses confirmed pivot-window swing highs/lows and
  close-based Break of Structure; Wyckoff Lite uses fixed range/volume
  heuristics for accumulation, distribution, and breakout; validation and
  insufficient-data behavior are explicit; execution is pure, finite, and
  deterministic for closed-candle input; descriptors truthfully use the Lite
  labels and state the bounded limitations; focused tests provide determinism,
  purity, validation, descriptor, and insufficient-data evidence.

### Prohibitions and boundary conditions

- Do not edit canonical contracts or shared boundaries, including
  `modules/strategy/api/contracts.ts`, `modules/strategy/application/ports.ts`,
  `modules/strategy/domain/contracts.ts`, REST/WebSocket packages,
  `modules/strategy/api/index.ts`, or `modules/strategy/api/bootstrap.ts`.
- Do not edit existing Strategy plugins, shared registry/barrel files, package
  manifests, migrations, apps, frontend, or any module outside the two exact
  scopes. Do not edit Backtesting, Evaluation, Leaderboard, Search, Market
  Data, News, Sentiment, Auth, infrastructure, runtime configuration, or
  generated artifacts.
- Registration/integration is a later join and is not authorized here. Do not
  start `M-03`, `S-04`, `Q-02`, `N-03`, `B-03`, `E-02`, `L-02`, `F-03`, `I-03`,
  `M-02`, `AU-02`, `I-01`, `I-02`, or any deferred packet. Do not change
  requirements, ADRs, architecture, data model, OpenSpec, `DECISIONS.md`, or
  this file.
- No live trading, generalized risk, autonomous/unconfigured LLM behavior,
  unrestricted external fetch, general event bus, professional SMC/Wyckoff
  claim, or persistence/ownership expansion may enter the diff.

### Manager topology and worker rules

- Create exactly one fresh Manager/Orchestrator after rechecking this signal,
  the current checkpoint, task dependencies, write-scope isolation, Git
  cleanliness, and active-task list. Use the canonical saved project and
  same-directory checkout at `D:\agy-cli-projects\AOS\Cryptox` on
  `MVP_IMPLEMENTATION`; do not create or use a worktree or a new branch.
- The Manager must use model `gpt-5.6-luna` with reasoning `max`, read
  `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely, and
  use the full authorization in this signal as its only implementation scope.
- The Manager must create exactly one fresh worker for `S-05` and exactly one
  fresh worker for `S-06`, with disjoint write scopes above. No duplicate,
  retry, historical Manager/worker reuse, or additional subagent is allowed.
  Workers may not edit any control-plane file. The Manager alone may update
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` for
  these packets and may perform only narrow review/integration work within the
  authorized implementation result.
- The Manager must stop after both packets are accepted or after a genuine
  scope/dependency/validation blocker is recorded. It must not auto-start
  downstream work.

### Validation gates

- Run and record focused pure Strategy tests for both packets, then the
  `@cryptox/strategy` package `test`, `typecheck`, `lint`, and `build` gates.
- Run applicable root `build`, `typecheck`, `lint`, `test`, `arch:check`,
  `artifacts:check`, `scope:check`, `test:scope-check`, and `git diff --check`
  gates. Prove that the final changed paths remain inside this signal plus the
  Manager-owned task/checkpoint files.
- Verify dependency direction, no canonical-contract/shared-registry edits,
  deterministic fixtures, truthful provenance/descriptor behavior, and the
  distinction from S-01 majority evidence. PostgreSQL, live provider, browser,
  and migration evidence are not made applicable by this pure extension scope;
  if any required environment or tool is nevertheless needed and unavailable,
  record `BLOCKED` or `UNVERIFIED`, never `PASS`.
- OpenSpec CLI and dedicated link/DAG automation remain `UNVERIFIED` unless
  actually available and run. A skipped test is not a passing gate.

### Stop condition

When the two authorized packets have been independently reviewed with truthful
evidence, the Manager must update only their task/checkpoint records, commit a
coherent checkpoint, report it, and stop. The Instructor will then review Git,
diff, tests, task state, and checkpoint independently and replace this signal
with `HOLD` before any later authorization. If the signal/checkpoint is stale,
the task state or dependency evidence mismatches, a shared/canonical scope is
needed, or a required acceptance test would require a forbidden edit, stop with
`NEEDS_INSTRUCTOR_REVIEW` and make no silent repair or downstream start.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Amendment evidence](../assignment/amendment-2026-08-29/README.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
