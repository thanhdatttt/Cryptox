# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-048`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-048 — Hold after N-03 checkpoint reconciliation

This replaceable signal supersedes `INS-047 / APPROVED_FOR_EXECUTION`. The
governance-only N-03 checkpoint reconciliation is accepted; no feature packet
is currently authorized.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `9d7f4e86947ac9261cc89cfc0592b54806ca3b85`, the committed
  `INS-047` reconciliation checkpoint; the working tree is clean.
- N-03 source and Manager checkpoint commit:
  `d4161ec458c869ff18fa89dd9732df260629c915`. N-03 remains `REVIEW`, not
  `DONE`. `M-03` remains `IN_PROGRESS` after its interrupted worker, and
  `M-02` remains `REVIEW/UNVERIFIED`.
- The reconciliation Manager changed only `TASKS.md` and `HANDOFF.md`; it
  recorded `310 passed / 6 skipped` with the six environment-gated skips
  explicitly non-PASS and recorded the exact N-03 source checkpoint hash.
- No source, business-state, contract, migration, dependency, or runtime drift
  was found. No Cryptox Manager or worker is active; historical
  Managers/workers and worktrees were not reused, removed, reset, or treated as
  active.

### Accepted evidence

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

### Current hold and next authorization gate

- N-03 remains `REVIEW` because PostgreSQL migration/runtime, real configured
  News, browser/runtime, OpenSpec CLI, link/DAG automation, and a real
  auto-refresh scheduler remain unavailable or partial. The frozen public News
  contract boundary still requires explicit reconciliation before any exposure
  expansion.
- Before the next authorization, reverify clean Git, the latest TASKS/HANDOFF
  checkpoint, no active Manager/worker, and a bounded packet. A future M-03
  recovery authorization must not change M-02 or start downstream work.

### Deferred and prohibited feature scope

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
