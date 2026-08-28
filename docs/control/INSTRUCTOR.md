# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-005`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `753a1ec3fc932fa73bc1ec5961473ed01b04cf78`
- Working tree at review: clean.
- `INS-004` / GOV-R1 was completed in the reviewed HEAD. Its authorization was
  governance-only and expired after that reconciliation checkpoint.
- Preserved completed implementation: `9ca2d7c` (C-01A), `a20a7c5` (E-01), and
  `901065a` (F-01), with the validated evidence preserved in `HANDOFF.md`.
- Current task derivation: P-00, C-01, A-00, C-01A, E-01, and F-01 are DONE;
  D-01, S-01, AU-01, and F-AUTH are READY; all other unfinished tasks remain
  BLOCKED by recorded start dependencies.
- Current repository validation was reproduced: `npm run verify:stage4a` PASS,
  including 84 workspace tests, build/typecheck, architecture, source-artifact,
  deferred-scope, and backend smoke checks. `git diff --check` PASS.

This instruction is valid only when the Orchestrator verifies immediately before
assignment that the branch is still at this reviewed checkpoint or that every
intervening change is limited to this Instructor control update. Any material
source, business-state, requirement, task-DAG, task-state, write-scope, or
authority change makes this instruction stale and requires a fresh Instructor
review before assignment or execution.

## Execution authorization

Approved execution frontier, and no more:

1. `D-01` — Minimal MVP Persistence Foundation.
2. `S-01` — Strategy Registry, Definitions and Composite Core.
3. `AU-01` — Simple Authentication and Session Runtime, limited initially to its
   approved fake-repository phase.

The Orchestrator may assign these three packets in parallel only after rechecking
READY state, satisfied start dependencies, disjoint write scopes, and the maximum
useful concurrency of one Manager plus three workers. Completion of one packet,
or a newly unlocked task, does not expand this authorization.

Authorization ends after review and integration of this frontier. A new Instructor
review and Instruction ID are required for the next frontier.

## Packet constraints

### D-01 — Minimal MVP Persistence Foundation

- Owns the approved physical persistence entities, User/AuthSession schema,
  direct owner-root references, reversible migrations, and assigned PostgreSQL
  adapter/test paths.
- Is the sole migration/DB writer. No queue/distributed, risk, strict-replay,
  LLM, or unrelated schema scope is authorized.
- Any PostgreSQL adapter/test paths assigned to D-01 are exclusive to D-01 while
  this frontier is active.

### S-01 — Strategy Registry, Definitions and Composite Core

- Implements only the Strategy registry, descriptors, immutable owner-scoped
  definitions/composites, generic analysis/overlay output, and
  `MAJORITY_VOTE_V1` using fake plugins.
- Must remain pure and infrastructure-independent at execution time: no exchange
  or database I/O, no identity branching, and no edits to D-01 persistence paths
  or built-in strategy directories.
- Persistence-backed integration waits for the D-01 checkpoint.

### AU-01 — Simple Authentication and Session Runtime

- May implement the Auth runtime, tests, and approved thin Auth transport against
  fake repositories before D-01 completes.
- Migration edits and Auth repository adapter work are forbidden until the D-01
  checkpoint; those paths remain under D-01's DB ownership until then.
- Only approved email/password Auth V1 is in scope: Argon2id, opaque PostgreSQL
  sessions, fixed 24-hour expiry, HttpOnly cookie handling, trusted identity, and
  sanitized observability. No JWT/refresh tokens, RBAC, tenancy, OAuth/SSO, 2FA,
  password reset, or enterprise IAM.

## Explicitly not authorized

- `F-AUTH`, although currently READY; it remains scheduled for Wave 4 after the
  Wave 2 frontier and is not part of `INS-005`.
- `M-01`, `M-02`, `S-02`, `S-03`, `E-01`, `L-01`, `B-01`, `B-02`, `AU-02`,
  `Q-01`, `N-01`, `N-02`, `F-01`, `F-02`, `I-01`, `I-02`, or any other task not
  listed above.
- Any task state transition, assignment, dependency/DAG change, packet-scope
  change, contract reopening, or implementation outside the three packets.
- Any deferred scope, including enterprise identity, tenancy, queues/distributed
  execution, generalized risk, AI/LLM authoring or crawling, strict replay, CQRS,
  Event Sourcing, or a general event bus.

## Required execution and checkpoint rules

- The Orchestrator alone assigns owners, changes `TASKS.md` state, reviews and
  integrates worker output, records validation, and replaces `HANDOFF.md`.
- Before assignment, prove the current instruction is not stale and that the
  three packet write scopes do not overlap. Stop on uncommitted material changes,
  overlapping writes, changed premises, or authority drift.
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
