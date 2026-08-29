# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-055`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-055 — C-03 seeded-discovery canonical contract reconciliation

This replaceable signal supersedes `INS-054 / HOLD` and authorizes exactly one
bounded contract-reconciliation packet: `C-03`. No Q-02 algorithm or other
feature packet is authorized.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `d6bd0a6870b2f3d60c04d1dd4cd57a91e8589919`, the committed
  `DEC-012` / C-03 governance checkpoint. The working tree is clean.
- `C-03` is defined in `MVP_PLAN.md`; `DEC-012` is approved in
  `DECISIONS.md`. `C-02` remains `DONE`, `ENV-03` is `REVIEW` with a passing
  deferred-scope gate, and Q-02 remains `BLOCKED` until C-03 is reviewed.
- B-03 remains `REVIEW` at source checkpoint
  `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`; M-03 and N-03 remain `REVIEW`;
  S-05/S-06 and ENV-02 remain `DONE`; M-02 remains `REVIEW/UNVERIFIED`.
  No other task state may change.
- Active-task inspection found no Cryptox Manager or worker. Historical tasks
  and workers must not be resumed, replaced, retried, or duplicated.

### Authorized packet: `C-03`

- **Requirement/decision IDs:** `CSL-R-SE-03`, `CSL-R-RP-02`,
  `CSL-R-LB-01`, `CSL-R-OB-01`, DEC-007, DEC-012, and the existing C-02
  contract boundary.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  fully, then verify this signal, checkpoint, DAG, dependencies, and write
  scope before dispatch.
- **Fresh worker:** delegate exactly one fresh Search-contract worker. Do not
  resume, replace, retry, or duplicate a historical worker. The worker may not
  edit control-plane files and may not create a commit, branch, or worktree.
- **Worker write scope:**
  `modules/search/api/contracts.ts`,
  `modules/search/api/contracts.spec.ts`,
  `modules/search/application/ports.ts`,
  `modules/search/application/ports.spec.ts` if needed,
  `packages/contracts/rest/search.ts`,
  `packages/contracts/rest/search.spec.ts` if needed,
  `scripts/check-deferred-scope.cjs`, and
  `scripts/check-deferred-scope.test.cjs` only. No other module, application
  lifecycle, generator implementation, persistence file, migration, frontend,
  provider, dependency, runtime, requirement, ADR, OpenSpec, or governance
  path is authorized.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for the C-03 row, valid transitions, worker
  review, evidence, limitations, checkpoint, and stop boundary. Do not edit
  `INSTRUCTOR.md`, `DECISIONS.md`, or `MVP_PLAN.md`.

### C-03 acceptance criteria

- The canonical Search generator type and public generator registry shape
  explicitly represent the approved `RANDOM`, `DOMAIN_GUIDED`, and `GENETIC`
  modes while preserving the existing one-candidate form and current RANDOM
  behavior.
- SearchRun command/status types and seeded-discovery provenance retain the
  approved bounded shape; client commands remain free of owner identity and
  finite stop conditions remain explicit. The generator port may expose slots
  for the approved modes without implementing their algorithms.
- Search REST request/status types and parser accept only the explicit approved
  generator values/profile IDs, reject unsupported values and client identity
  fields, and preserve existing RANDOM validation. No REST endpoint or Search
  lifecycle implementation is added.
- The deferred-scope checker recognizes the actual canonical Search REST path
  and continues to reject the profile identifiers outside their named
  boundaries. Focused checker tests preserve positive and negative behavior;
  no broad path exclusion, generic profile bypass, or deferred-scope weakening
  is allowed.
- No Q-02 generator, Search lifecycle/persistence behavior, migration, frontend,
  provider, queue/distributed, LLM, or other feature behavior is implemented or
  claimed. Q-02 remains separately authorized work.

### Required validation and stop condition

- Run the focused Search API/port and REST contract tests, checker tests, and
  `npm run test:scope-check`; run `npm run scope:check` against the current
  repository. Run applicable `npm run arch:check`,
  `npm run artifacts:check`, `npm run typecheck`, `npm run build`,
  `npm run lint`, and `git diff --check`.
- Verify the exact changed paths and that B-03 source, Backtesting contracts,
  migrations, and unrelated source remain unchanged. OpenSpec CLI and any
  unavailable environment check are `UNVERIFIED`/`BLOCKED`, never `PASS`.
- The Manager must independently review the worker result, move only C-03
  through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, commit one coherent
  C-03 checkpoint, and stop immediately. The Instructor will review it before
  authorizing Q-02; no automatic follow-on starts.
- Do not start or promote Q-02, B-03, M-03, N-03, S-04, E-02, L-02, F-03,
  I-03, M-02, AU-02, I-01, I-02, ENV-01, ENV-02, ENV-03, or any other packet
  under this signal.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Search capability spec](../../openspec/specs/search/spec.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
