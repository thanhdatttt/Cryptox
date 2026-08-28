# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-007`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `a52d928093e5107ddab43017fcdea1584b03e5ef`
- Working tree at review: clean. The branch is
  `MVP_IMPLEMENTATION`, ahead of `origin/MVP_IMPLEMENTATION` only by the
  current Instructor/Orchestrator checkpoint commits.
- `INS-006` was executed and exhausted at this checkpoint. Its three authorized
  packets were delegated, independently reviewed, and integrated in `8a8d5f8`.
- Current task derivation: P-00, C-01, A-00, C-01A, E-01, F-01, and S-01 are
  DONE; D-01 and AU-01 are REVIEW; S-02, S-03, and B-01 are REVIEW pending a
  green reproducible root gate; Q-01 and F-AUTH are READY but unauthorized; all
  other unfinished tasks remain BLOCKED by recorded start dependencies.
- The authorized focused suites pass: S-02 15/15, S-03 25/25, B-01 9/9,
  Backtesting 18/18, and the integrated authorized total is 49/49. Build,
  typecheck, lint, architecture, artifact, deferred-scope, runtime smoke, and
  whitespace checks pass.
- Root `verify:stage4a` is not reproducible: the existing S-01
  `modules/strategy/application/service.spec.ts` test intermittently fails
  because it expects creation order while the repository returns deterministic
  `createdAt`/UUID order. This was reproduced in the current review (4 passes,
  1 failure) and is outside the INS-006 feature packets. Formal OpenSpec CLI
  validation remains `UNVERIFIED` because the CLI is unavailable. Live
  PostgreSQL evidence remains BLOCKED/UNVERIFIED for the earlier D-01/AU-01
  checkpoint.

This instruction is valid only after the Orchestrator verifies immediately
before the reconciliation that the reviewed HEAD and task/business premises
remain unchanged, the working tree is clean, and the change is limited to the
single authorized test reconciliation plus revalidation. Any material source,
business-state, requirement, task-DAG, task-state, write-scope, or authority
change makes this instruction stale and requires a fresh Instructor review.

## Execution authorization

Approved reconciliation frontier, and no more:

1. Fix the nondeterministic baseline assertion in
   `modules/strategy/application/service.spec.ts` so it asserts the approved
   deterministic repository ordering rather than random UUID creation order.
2. Re-run the S-01 test repeatedly and re-run the complete applicable root
   validation. If the root gate is green and reproducible, the Manager may
   close the existing `REVIEW` states for `S-02`, `S-03`, and `B-01` only after
   confirming their already-recorded focused and independent-review evidence.

This is a test-only reconciliation and checkpoint-closure authorization, not a
new feature frontier. It does not authorize any new capability implementation.

Authorization ends after review and integration of this frontier. A new Instructor
review and Instruction ID are required for the next frontier.

## Packet constraints

### S-01 baseline test reconciliation

- The only permitted source edit is the assertion in
  `modules/strategy/application/service.spec.ts` that incorrectly assumes
  random UUID creation order.
- Preserve the existing S-01 application behavior and deterministic ordering
  implementation. Do not change production Strategy code, contracts, registry,
  persistence, or any feature packet.
- The Manager may apply this exceptionally small review fix directly under the
  repository's Manager-side review-fix allowance; no feature worker may broaden
  the scope.
- Revalidation must demonstrate the focused test is stable across repeated runs,
  the root workspace gate is green/reproducible, and the previously reviewed
  S-02/S-03/B-01 evidence remains valid.

## Explicitly not authorized

- All feature implementation, including `S-02`, `S-03`, `B-01`, `Q-01`, and
  `F-AUTH`; only the single test reconciliation and revalidation are allowed.
- `D-01`/`AU-01` PostgreSQL integration or completion, and every blocked task
  (`M-01`, `M-02`, `L-01`, `N-01`, `N-02`, `B-02`, `AU-02`, `F-02`, `I-01`,
  `I-02`).
- No new task assignment, dependency/DAG change, packet-scope change, contract
  reopening, or implementation outside the single test file. The Manager may
  transition only the already-REVIEW `S-02`, `S-03`, and `B-01` packets to `DONE`
  after the required green/reproducible validation.
- Any deferred scope, including enterprise identity, tenancy, queues/distributed
  execution, generalized risk, AI/LLM authoring or crawling, strict replay, CQRS,
  Event Sourcing, or a general event bus.

## Required execution and checkpoint rules

- The Orchestrator alone assigns owners, changes `TASKS.md` state, reviews and
  integrates worker output, records validation, and replaces `HANDOFF.md`.
- Every bounded implementation packet must be delegated to a worker/subagent;
  the Orchestrator must not implement feature packets directly. This explicitly
  bounded review fix is the repository-permitted exceptional small review fix.
  Workers do not
  edit `INSTRUCTOR.md`, `DECISIONS.md`, `TASKS.md`, or `HANDOFF.md`.
- Before acting, prove the current instruction is not stale, confirm a clean
  working tree, and verify the edit is limited to the named test assertion.
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
