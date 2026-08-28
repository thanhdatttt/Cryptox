# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-006`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `6da688452c18a3d8d914325ff57e8fe3f7c5b1d3`
- Working tree at review: dirty only in `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md`. These are pre-existing
  governance-only changes adding the mandatory worker-delegation policy; they do
  not change source, business state, task DAG, packet write scopes, or approved
  capability behavior. The Orchestrator must reconcile and commit or otherwise
  resolve these changes before assignment and must not execute with unresolved
  material working-tree changes.
- `INS-005` was executed and exhausted at this checkpoint. Its integrated
  implementation result is preserved in `6da6884`.
- Current task derivation: P-00, C-01, A-00, C-01A, E-01, F-01, and S-01 are
  DONE; D-01 and AU-01 are REVIEW; S-02, S-03, B-01, Q-01, and F-AUTH are
  READY; all other unfinished tasks remain BLOCKED by recorded start
  dependencies.
- Current review reproduced `npm run verify:stage4a`: PASS. This includes
  build, typecheck, all workspace tests, architecture, source-artifact,
  deferred-scope, and backend smoke checks. `git diff --check`: PASS.
- Focused checkpoint evidence remains PASS for Auth 8/8 and Strategy 11/11.
  Migration JavaScript/static invocation checks PASS. Live PostgreSQL
  migrate/rollback/remigrate evidence remains BLOCKED/UNVERIFIED because no
  valid local credentials or running Docker daemon are available. Formal
  OpenSpec CLI validation remains UNVERIFIED because the CLI is unavailable.

This instruction is valid only after the Orchestrator verifies immediately
before assignment that the reviewed HEAD and task/business premises remain
unchanged, that the two pre-existing governance diffs are non-material to the
authorized source state and have been reconciled, and that the three packets'
start dependencies and write scopes remain safe. Any material source, business-
state, requirement, task-DAG, task-state, write-scope, or authority change makes
this instruction stale and requires a fresh Instructor review.

## Execution authorization

Approved execution frontier, and no more:

1. `S-02` — Moving Average and RSI.
2. `S-03` — Bollinger Bands and Support/Resistance.
3. `B-01` — Deterministic Historical Simulator.

The Orchestrator may assign these three packets in parallel, with one delegated
worker per packet, only after verifying that each is still `READY`, its start
dependencies are satisfied, and the maximum useful concurrency is one Manager
plus three workers. `S-02` and `S-03` have separate dedicated Strategy plugin
directories; `B-01` owns only the Backtesting simulator/domain/test paths. No
packet may edit another packet's paths.

Completion of one packet, a review result, or a newly unlocked task does not
expand this authorization.

Authorization ends after review and integration of this frontier. A new Instructor
review and Instruction ID are required for the next frontier.

## Packet constraints

### S-02 — Moving Average and RSI

- Implement only the approved `TECHNICAL_PROFILES_V1` Moving Average and RSI
  behavior, descriptors/factories, deterministic overlays, and focused tests.
- Preserve the frozen Strategy contracts and S-01 registry/application seams.
- Write only the dedicated MA/RSI plugin directories and their tests. Do not
  edit shared registration/bootstrap, contracts, migrations, apps, or other
  plugins; the Manager handles later registration/integration.
- Keep execution pure and infrastructure-independent: no database, exchange,
  network, Auth, frontend business logic, or persistence.
- Cover cross/equality/warm-up, Wilder thresholds, flat/no-gain/no-loss,
  invalid-parameter, purity, and descriptor behavior required by the packet.

### S-03 — Bollinger Bands and Support/Resistance

- Implement only the approved `TECHNICAL_PROFILES_V1` Bollinger Bands and
  rolling Support/Resistance behavior, descriptors/factories, deterministic
  overlays, and focused tests.
- Write only the dedicated Bollinger/Support-Resistance plugin directories and
  their tests. Do not edit shared registration/bootstrap, contracts, migrations,
  apps, MA/RSI plugins, or persistence paths; the Manager handles later
  registration/integration.
- Keep execution pure and infrastructure-independent.
- Cover population deviation, zero variance, equality, rolling extrema/current
  exclusion, proximity, overlap/tie/breakout HOLD, warm-up, invalid parameters,
  and purity behavior required by the packet.

### B-01 — Deterministic Historical Simulator

- Implement only the pure deterministic long-only simulator/domain runner and
  visualization traces over candle fixtures and fake strategies.
- Preserve the Backtest Execution Port boundary; do not implement Candidate,
  executor orchestration, Evaluation, Leaderboard, Search, providers, or apps.
- Write only the assigned Backtesting simulator/domain/test paths. No database,
  migration, Auth, strategy plugin, frontend, or shared transport changes.
- Enforce the approved bounded simulation behavior: one full-capital long
  position, signal at `t` executes at `t+1` open, configurable capital/fee/zero
  slippage defaults, and range-end close without lookahead.
- Cover repeated signals, fees/slippage, no trades, range-end exit,
  deterministic rerun, and contained fake-Strategy failure.

## Explicitly not authorized

- `D-01` and `AU-01` integration/repository completion while they remain in
  `REVIEW`; live PostgreSQL evidence remains a checkpoint blocker and is not
  silently promoted to PASS.
- `Q-01` and `F-AUTH`, although READY; they are deferred from this three-worker
  frontier and require a later or renewed authorization.
- `M-01`, `M-02`, `L-01`, `N-01`, `N-02`, `B-02`, `AU-02`, `F-02`, `I-01`,
  `I-02`, or any other task not listed above.
- Any task state transition, assignment, dependency/DAG change, packet-scope
  change, contract reopening, shared Strategy registration outside the packet,
  or implementation outside the three packets.
- Any deferred scope, including enterprise identity, tenancy, queues/distributed
  execution, generalized risk, AI/LLM authoring or crawling, strict replay, CQRS,
  Event Sourcing, or a general event bus.

## Required execution and checkpoint rules

- The Orchestrator alone assigns owners, changes `TASKS.md` state, reviews and
  integrates worker output, records validation, and replaces `HANDOFF.md`.
- Every bounded implementation packet must be delegated to a worker/subagent;
  the Orchestrator must not implement these packets directly. Workers do not
  edit `INSTRUCTOR.md`, `DECISIONS.md`, `TASKS.md`, or `HANDOFF.md`.
- Before assignment, prove the current instruction is not stale, reconcile the
  pre-existing governance diffs, verify READY/dependencies, and prove disjoint
  write scopes.
- Each packet must satisfy its focused acceptance tests plus applicable build,
  typecheck, workspace tests, architecture, artifact, deferred-scope, database,
  and diff checks. Unavailable evidence is `BLOCKED` or `UNVERIFIED`, never PASS.
- The next checkpoint must record packet owners, state transitions, commits,
  validation evidence, failures/blockers, exact remaining frontier, and that no
  newly READY task was started without a later Instructor authorization.

Pending human decisions: none.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [ADR-005](../adr/ADR_005_module_first_structure.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_practical_reproducibility.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is the current execution signal, not a task board or implementation
handoff. No feature implementation is performed by this Instructor update.
