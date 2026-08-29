# ADR-010: Automated Local PostgreSQL Evidence and Deferred-Scope Checker

## Status

Accepted — 2026-08-29

- **Decision owners:** Instructor operational decision
- **Related decisions:** [DEC-008](../control/DECISIONS.md),
  [ADR-006](./ADR_006_local_backtest_execution.md),
  [ADR-007](./ADR_007_practical_reproducibility.md)
- **Canonical documents:** [Requirements](../requirements.md),
  [MVP program](../implementation/MVP_PLAN.md),
  [Task state](../implementation/TASKS.md)

## Context

`C-02` requires real migration up, down, remigrate, and constraint evidence. Its
first bounded attempt was blocked because no local `DATABASE_URL` was configured.
The existing deferred-scope validation command also rejects some vocabulary that
DEC-007 subsequently approved, while the underlying deferred boundaries remain
important safeguards.

## Decision

- Local PostgreSQL development and test evidence use Docker/Compose only. The
  repository tooling provisions health-checked development and test databases with
  separate persistent local volumes; it does not install PostgreSQL on the host or
  select a cloud database.
- A committed command surface provisions the services, waits for health, executes
  migration validation, and resets test data without affecting development data.
  If Docker is unavailable or its daemon cannot run, the result is `BLOCKED` with
  evidence rather than an installation attempt or a synthetic migration pass.
- Connection values are local process environment or ignored local files. Committed
  examples contain placeholders only. Tooling never logs generated passwords,
  connection strings, tokens, or other credentials.
- `scripts/check-deferred-scope.cjs` is the canonical executable owner of the
  deferred-scope policy, with `package.json` only exposing its command. The checker
  must use narrowly testable approved-profile exceptions for DEC-007 and continue
  rejecting all other deferred scope. It is not disabled, bypassed, or replaced by
  a permissive path exclusion.

## Consequences

- Real local migration evidence becomes reproducible without a user-managed
  database installation or chat-provided secret.
- Docker/daemon availability is an explicit environmental dependency and may block
  a packet honestly.
- This decision changes no business contract, migration semantics, runtime
  provider, application behavior, Auth behavior, or feature implementation.
- `ENV-01` must complete and receive Instructor review before a new C-02 attempt.

## Verification

`ENV-01` must prove Docker daemon availability before provisioning; health for both
local databases; isolated development/test reset behavior; secret-free tracked
files; real migration up/down/remigrate and constraint probes; and positive plus
negative deferred-scope checker fixtures. Its checkpoint must report unavailable
Docker/OpenSpec/environment evidence as `BLOCKED` or `UNVERIFIED`, never `PASS`.
