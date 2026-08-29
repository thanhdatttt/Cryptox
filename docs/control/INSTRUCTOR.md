# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-022`

Status: `NEEDS_HUMAN_DECISION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `5b9018f` (`docs(control): checkpoint INS-021 AU-02 decision blocker`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 60 local commits.
- INS-021 is exhausted at a truthful blocked checkpoint. Q-01 and F-02 remain
  DONE at their approved packet boundaries, and D-01, AU-01, M-01, L-01,
  B-02, F-AUTH, N-01, and N-02 remain DONE; none may be reassigned or
  reworked.
- AU-02 start dependencies are satisfied: AU-01, D-01, S-01, L-01, B-02,
  Q-01 real integration, and F-AUTH are DONE. The INS-019 worker stalled
  during setup; INS-020 restored dependencies but produced no matrix; and the
  INS-021 worker again produced no matrix source/test diff, accepted evidence,
  or commit within its bounded window. AU-02 remains BLOCKED/UNVERIFIED.
- M-02 remains REVIEW/UNVERIFIED. Its realtime resilience suite is 9/9 and
  full Market Data is 23 passed / 1 skipped, but two bounded live Binance
  attempts ended with socket failure/reconnect exhaustion, zero normalized
  candles, and no live recovery evidence. No source or configuration rework is
  authorized until the provider/environment premise changes.
- `verify:stage4a` passed for the completed source tree. Formal OpenSpec CLI
  validation remains `UNVERIFIED` because the CLI is unavailable. Cross-module
  Experiment/Leaderboard transaction atomicity, real frontend API/browser
  integration, live CoinDesk, and real News/Sentiment PostgreSQL evidence remain
  later I-01/final-demo concerns.
- No source, business-state, or task-DAG drift was found after INS-021. The
  current TASKS/HANDOFF checkpoint is authoritative and clean.

## Current decision

No execution frontier is authorized under INS-022.

The repeated bounded AU-02 attempts did not produce the required security
matrix even after dependency setup succeeded. The repository therefore cannot
truthfully advance AU-02 or start I-01/I-02. M-02 also remains REVIEW/UNVERIFIED
after its prior live Binance failures and is not a valid retry frontier.

## Human decision required

Before another Orchestrator execution signal can be issued, decide and record
the recovery path:

1. Provide a working PostgreSQL/Auth/Search integration environment, including
   a configured `DATABASE_URL`, and confirm that one further bounded AU-02
   implementation attempt is wanted; or
2. Explicitly approve a different, requirement-compliant recovery plan for
   the missing AU-02 security evidence.

Until that decision and the required environment/plan are available, keep
AU-02 `BLOCKED/UNVERIFIED`, M-02 `REVIEW/UNVERIFIED`, and I-01/I-02 `BLOCKED`.
Do not start workers, retry AU-02, probe M-02, or perform downstream work.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, L-01, B-02, Q-01, F-AUTH,
  F-02, N-01, or N-02.
- M-02 source changes or live re-probes, I-01, I-02, or any unfinished packet
  while INS-022 is awaiting the human decision.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

No authorization is active. A fresh Instructor review and new Instruction ID
are required after the human decision and any approved recovery premise.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [ADR-001](../adr/ADR_001_websocket.md)
- [ADR-005](../adr/ADR_005_module_first_structure.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_practical_reproducibility.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is the current execution signal, not a task board or implementation
handoff. No feature implementation is performed by this Instructor update.
