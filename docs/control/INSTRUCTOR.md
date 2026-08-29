# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-023`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Safety hold

Reason: `Instructor functional amendment from five supplied screenshots is under review/re-baselining`

- This is a system-functional scope amendment only. The supplied screenshots
  are evidence for behavior, not authorization to reproduce layout, color,
  visual styling, or pixel-perfect frontend details.
- Every prior implementation authorization, including the exhausted `INS-021`
  retry and the no-execution `INS-022` signal, is suspended by this hold.
- No Orchestrator may assign new work, start a retry, create a worker, or
  continue implementation until a new `APPROVED_FOR_EXECUTION` signal is
  issued after re-baselining.
- No feature implementation, runtime-contract change, migration, frontend
  implementation, `TASKS.md` update, `HANDOFF.md` update, or competing active
  OpenSpec change is authorized by `INS-023`.

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- HEAD at HOLD: `92fcb0a8e28a77667ca5a2bcbf1dacab7bb0bac6`
  (`docs(control): pause after INS-021 blocker`)
- Working tree at HOLD: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 61 local commits.
- Current pre-amendment signal: `INS-022 / NEEDS_HUMAN_DECISION`, with no
  execution frontier. The current Manager checkpoint remains the `INS-021`
  AU-02 blocked checkpoint in `docs/implementation/HANDOFF.md`.
- `TASKS.md` remains the operational source of truth: AU-02 is
  `BLOCKED/UNVERIFIED`, M-02 is `REVIEW/UNVERIFIED`, I-01 and I-02 are
  `BLOCKED`, and completed packets remain at their approved baseline
  boundaries. No task-state or handoff edit was made for this HOLD.

## Automation stop observation

At the time of this signal, the Codex thread inventory showed no running
Orchestrator or worker execution for Cryptox:

- Manager/Orchestrator `01a04adc-d425-7970-8a04-5bf8ed314fd0`: `idle`; its
  latest INS-021 turn is completed and no new work was requested.
- Prior specification-review thread `01a04bf1-0364-72b0-a9cd-6563c67b4222`:
  `idle`; read-only review completed, no implementation ownership.
- AU-02 worker Gibbs `01a04bf2-c013-7e73-a2b7-0b7781ac0a52`: safely stopped
  under the INS-021 checkpoint; no source commit or accepted matrix was
  produced.
- Earlier AU-02 worker threads `01a04bd0-2e0a-7320-b0be-f6755c484a66`
  (`idle`), `01a04bd5-8608-70c3-abae-94176723da39` (`notLoaded`), and
  `01a04be0-cc57-7c10-be30-5a845615eb88` (`notLoaded`) are not running; no
  duplicate output is accepted.
- M-02 review worker `01a04b38-10bd-7d21-9be0-598f311b80c6` is `notLoaded`
  after its bounded review checkpoint. No active worker could be asked to
  stop, and no worker was found whose safe stop was incomplete.
- The currently active thread is the Instructor review context, not an
  implementation Orchestrator or worker. No new thread was created for this
  amendment.

## Scope-review state

The five supplied screenshots are now treated as a proposed functional delta
against the reviewed baseline. The delta includes realtime multi-timeframe
market delivery, prompt/URL strategy authoring with LLM analysis, HTML/RSS/news
extraction with versioned templates and controlled refinement, Long/Short
backtesting with transaction cost/slippage and OHLC SL/TP behavior, and
expanded strategy/discovery capabilities. These requirements are not yet
approved executable scope; the Instructor must complete the authority-ordered
re-baseline and obtain the required human/instructor decisions first.

## Explicitly not authorized

- Any Orchestrator or worker creation, assignment, retry, implementation, or
  downstream integration.
- Reassignment or rework of completed packets, including D-01, AU-01, M-01,
  L-01, B-02, Q-01, F-AUTH, F-02, N-01, and N-02.
- AU-02 retry, M-02 probe/rework, I-01, I-02, or any other unfinished packet.
- Changes to application source, executable contracts, migrations, frontend
  implementation, `TASKS.md`, `HANDOFF.md`, or the active change/specs before
  the requirement delta is approved through the authority order.

## Required next authority sequence

1. Review and approve the functional delta, add requirement IDs and acceptance
   criteria in `docs/requirements.md`.
2. Record durable decisions in `docs/control/DECISIONS.md` and amend accepted
   ADRs, `docs/architecture.md`, and `docs/data-model.md` where warranted.
3. Amend the existing active `mvp-implementation` change and affected
   capability specifications; do not create a competing cross-cutting change.
4. Only after those approvals, have the Manager reconcile `MVP_PLAN.md`, the
   task DAG, and `TASKS.md` with new extension/reconciliation packets while
   preserving historical `DONE` evidence.
5. Issue a new Instructor execution signal with explicit bounded scope.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Instructor bootstrap](./prompts/INSTRUCTOR_START.md)
- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Accepted ADRs](../adr/)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is the current Instructor safety signal. It is governance only;
no feature implementation or task-state mutation is performed under `INS-023`.
