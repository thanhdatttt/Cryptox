# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-047`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-047 — Reconcile the N-03 checkpoint metadata

This replaceable signal supersedes `INS-046 / HOLD` and authorizes exactly one
governance-only checkpoint-reconciliation packet. It does not authorize source
implementation, N-03 promotion, M-03 recovery, S-04, or any downstream packet.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `84c25177439ddd42b80d67bf61c6d951c7f0cbdb`, the committed
  `INS-046 / HOLD` governance checkpoint; the working tree is clean.
- N-03 source and Manager checkpoint commit:
  `d4161ec458c869ff18fa89dd9732df260629c915`. N-03 remains `REVIEW`, not
  `DONE`. `M-03` remains `IN_PROGRESS` after its interrupted worker, and
  `M-02` remains `REVIEW/UNVERIFIED`.
- The only known inconsistency is factual checkpoint metadata: the committed
  N-03 `TASKS.md`/`HANDOFF.md` says `309 passed / 6 skipped`, while the
  independent root run at the same source checkpoint produced `310 passed / 6
  skipped`. No source, business-state, contract, migration, dependency, or
  runtime drift was found.
- No Cryptox Manager or worker is active. Historical Managers/workers and
  worktrees are not to be reused, removed, reset, or treated as active.

### Authorized packet: N-03 checkpoint reconciliation

- **Manager-only scope:** update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` to record the verified `310 passed / 6
  skipped` root result, the exact checkpoint hash above, and the fact that the
  six skips are environment-gated and not PASS. Preserve N-03=`REVIEW`,
  M-03=`IN_PROGRESS`, every other task state, worker/Manager IDs, and all
  limitations.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout, no worktree, using model `gpt-5.6-luna` with
  `xhigh` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` fully, verify this signal and
  the clean checkpoint, and inspect the control-plane diff before editing.
- **Workers:** none are authorized or needed. This is a Manager-owned
  governance correction, not a feature implementation packet.
- **Forbidden:** all source, tests, contracts, migrations, dependencies,
  runtime configuration, frontend, providers, OpenSpec, requirements, ADRs,
  `MVP_PLAN.md`, `DECISIONS.md`, `INSTRUCTOR.md`, task-state transitions, and
  any new or resumed Manager/worker.

### Acceptance and stop condition

- The two Manager-owned files contain the exact checkpoint hash
  `d4161ec458c869ff18fa89dd9732df260629c915` and the verified root result
  `310 passed / 6 skipped`; the six skips remain explicitly non-PASS.
- N-03 stays `REVIEW`, no packet is promoted, no source path changes, and no
  downstream work starts.
- Manager runs `git diff --check`, verifies exact changed paths and clean
  post-commit source state, commits the two control files, and stops. The next
  Instructor review must verify that commit before issuing feature authorization.

### Evidence carried into the reconciliation

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
