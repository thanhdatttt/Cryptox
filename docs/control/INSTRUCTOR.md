# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-029`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Safety hold after the blocked `C-02` attempt

Reason: `The bounded C-02 attempt at 7f774ed505f45d927b650ccefcd76d9e4f8611d2 produced no accepted implementation. Its required migration evidence lacked a configured local database, and scope:check correctly blocked now-approved DEC-007 vocabulary until its canonical policy can be reconciled without weakening deferred-scope protection.`

`INS-028` is exhausted. `C-02` remains `BLOCKED`; it is not retried by this
signal. No Manager, worker, subagent, worktree, retry, or extension feature work
is authorized while this hold is current.

## Reviewed checkpoint

- Reviewed branch/HEAD: `MVP_IMPLEMENTATION` /
  `7f774ed505f45d927b650ccefcd76d9e4f8611d2`
  (`docs(control): checkpoint blocked C-02 worker`); the working tree was clean.
- The C-02 worker produced no accepted commit. Its partial contract output was
  rejected and restored. Contract/type/scope checks failed; migration up/down/
  remigrate and constraint evidence was `BLOCKED/UNVERIFIED` because
  `DATABASE_URL` was unset.
- `scripts/check-deferred-scope.cjs`, invoked by `npm run scope:check` from the
  root `package.json`, is the canonical deferred-scope checker owner. It must not
  be bypassed, disabled, broadly excluded, or made permissive.
- Docker Desktop's local daemon was independently reachable during this review
  (`28.5.1`). That is evidence for planning only; availability must be rechecked
  by any environment packet and is never assumed as a PASS after a restart.

## Approved recovery baseline

- `DEC-008` and `ADR-010` establish Codex-operated Docker/Compose PostgreSQL
  development and test databases, ignored local credentials, health/volume/reset
  behavior, and real migration evidence. No manual host installation, cloud
  database, chat-provided secret, or secret-bearing commit is allowed.
- `ENV-01` is added to the implementation plan as the sole pre-`C-02`
  environment/tooling reconciliation gate. It also owns the narrow DEC-007
  reconciliation of the canonical scope checker and its positive/negative tests.
- `C-02` and every downstream extension packet remain `BLOCKED`. `M-02` stays
  `REVIEW/UNVERIFIED`; `AU-02`, `I-01`, and `I-02` remain blocked and
  unauthorized.

## Conditions before an environment execution signal

A later standalone `ENV-01` signal must be limited to the plan's exact
Compose/local-environment, migration-validation, checker-owner/test,
placeholder/ignore, and control-plane scope. It must require one dedicated
Infrastructure-and-tooling worker, forbid C-02 contracts/migrations and every
feature behavior, report Docker/daemon/OpenSpec gaps truthfully as `BLOCKED` or
`UNVERIFIED`, and stop for a fresh Instructor review without retrying C-02.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [ADR-010](../adr/ADR_010_local_postgres_environment_and_scope_checker.md)
- [Requirements](../requirements.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
