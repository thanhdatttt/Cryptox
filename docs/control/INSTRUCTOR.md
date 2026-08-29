# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-046`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-046 — Hold after independent N-03 review

This replaceable signal supersedes `INS-045 / APPROVED_FOR_EXECUTION`. No
packet is currently authorized. The N-03 implementation checkpoint is
reviewable, but its operational evidence and checkpoint metadata require
reconciliation before another authorization is issued.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- N-03 source and Manager checkpoint commit:
  `d4161ec458c869ff18fa89dd9732df260629c915`.
- The canonical working tree is clean after the checkpoint commit; no source,
  business-state, contract, migration, dependency, or runtime drift was found
  after review.
- N-03 remains `REVIEW`, not `DONE`. `M-03` remains `IN_PROGRESS` after its
  interrupted worker. `M-02` remains `REVIEW/UNVERIFIED`.
- The N-03 Manager and its single worker are no longer active. Historical
  Managers/workers and worktrees were not reused, removed, reset, or treated as
  active.

### Independent evidence

- News focused tests: `30/30 PASS`.
- Sentiment focused tests: `19/19 PASS`.
- Root workspace run: `310 passed / 6 skipped`, exit success. The six skipped
  tests are environment-gated PostgreSQL, integration, or E2E checks and are
  not treated as PASS.
- Root typecheck, build, lint, architecture, artifacts, deferred-scope, and
  `git diff --check`: `PASS`.
- PostgreSQL migration/runtime validation: `BLOCKED`; this host has Docker but
  no working `docker compose` command.
- Real configured News smoke, browser/runtime smoke, OpenSpec CLI, and link/DAG
  automation: `UNVERIFIED` or `BLOCKED`.
- Auto-refresh is `PARTIAL / UNVERIFIED`: the 1–5 minute configuration and
  five-minute default are present, but a scheduler was not implemented in
  N-03. The frozen canonical public News contract still exposes only its
  existing public barrel, so import/template exposure requires explicit
  contract-boundary reconciliation rather than silent scope expansion.

### Required reconciliation before the next signal

- Manager-owned `TASKS.md` and `HANDOFF.md` currently record the root result as
  `309 passed / 6 skipped`, while the independent root run at the committed
  checkpoint is `310 passed / 6 skipped`. Reconcile this factual metadata and
  record the exact checkpoint hash `d4161ec...` in the matching handoff.
- Re-review N-03 retention/provenance, safe-fetch DNS pinning, restricted
  foreign-key purge guards, frozen public-contract boundary, and the
  unavailable runtime evidence. Do not promote N-03 to `DONE` from fixture or
  fake-provider evidence alone.
- Before any new authorization, verify the reconciliation commit, clean Git,
  consistent TASKS/HANDOFF/checkpoint, no active Cryptox Manager/worker, and a
  newly bounded packet with an explicit write scope. No downstream packet is
  authorized by this HOLD.

### Deferred and prohibited scope

`M-03`, `S-04`, `Q-02`, `B-03`, `E-02`, `L-02`, `F-03`, `I-03`, `M-02`,
`AU-02`, `I-01`, `I-02`, and all deferred enterprise identity, queue/distributed,
risk, autonomous-LLM, strict-replay, cloud-database, secrets, or unrelated
scope remain unauthorized. No worker may infer authorization from `READY`.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
