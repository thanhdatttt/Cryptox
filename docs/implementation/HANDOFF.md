# I-02 Transaction Seam Checkpoint — INS-187 / DEC-108

## Authority and applicability

Checkpoint date: 2026-09-01.

- Current Instructor signal: `INS-187 / APPROVED_FOR_EXECUTION`.
- Governing decision: `DEC-108 / APPROVED`.
- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`.
- Starting branch and authorization HEAD: `MVP_IMPLEMENTATION / 989dfac`.
- Reviewed source/business checkpoint: `f86ab93`. The diff from `f86ab93` to
  `989dfac` was governance-only; no source or business-state drift was found.
- The board started with 58 rows, 57 `DONE`, and only `I-02` `REVIEW`.
  No other task state changed. The pre-existing `.codex/config.toml` remains
  untracked and excluded.
- The packet was limited to the already-approved Backtest -> Leaderboard
  transaction-aware completion seam. No final MVP or `I-02 DONE` decision was
  authorized.

## Execution and worker review

- Manager state transition: `I-02 REVIEW -> READY -> IN_PROGRESS -> REVIEW`.
- Exactly one fresh hidden worker was created in the canonical checkout:
  Kierkegaard, agent `01a05aca-c849-7b80-bcf3-eb147f6d5ad6`.
- The worker was restricted to the six paths authorized by `INS-187`; it did
  not edit control-plane files, stage, commit, retry, or spawn a replacement.
- The worker did not return a final report before its bounded waits expired. Its
  scoped edits materialized in the checkout; the Manager closed the still-
  `running` worker once, observed `previous_status: running`, and did not retry
  or replace it.
- The reviewed worker diff changes exactly these five authorized implementation
  paths; the optional focused backend regression file was not needed:
  `modules/backtesting/infrastructure/postgres.ts`,
  `modules/backtesting/infrastructure/postgres.spec.ts`,
  `modules/leaderboard/infrastructure/postgres.ts`,
  `modules/leaderboard/infrastructure/postgres.spec.ts`, and
  `apps/backend/src/runtime.ts`.
- Backtesting now exposes an infrastructure-only accessor for its active
  `AsyncLocalStorage` transaction client. Leaderboard accepts that accessor and
  routes initialization, configuration, scope, authoritative-entry, ranking,
  insertion, duplicate lookup, and deactivation queries through the active
  client, falling back to the pool only outside a completion transaction.
  Runtime composition passes the Backtesting accessor to the PostgreSQL
  Leaderboard adapter. Public module contracts and database schema are unchanged.
- The source diff is within scope and contains no migration, REST/WebSocket,
  provider, frontend, deferred-scope, credential, or unrelated cleanup change.

## Validation results

| Gate | Exact command/check | Result |
|---|---|---|
| Focused infrastructure tests | `npm exec vitest -- run modules/backtesting/infrastructure/postgres.spec.ts modules/leaderboard/infrastructure/postgres.spec.ts` | PASS, 14/14 |
| Backtesting workspace | `npm test --workspace @cryptox/backtesting` | PASS, 47/47 |
| Leaderboard workspace | `npm test --workspace @cryptox/leaderboard` | PASS, 23/23 |
| Backend workspace | `npm test --workspace @cryptox/backend` | PASS, 43; 1 Auth E2E skip |
| Full workspace tests | `npm test` | PASS, 464; 9 environment-gated skips |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Build | `npm run build` | PASS; existing Vite CJS/dynamic-import/large-chunk warnings only |
| Architecture | `npm run arch:check` | PASS, 189 modules / 644 dependencies; 9 configured forbidden fixtures |
| Generated artifacts | `npm run artifacts:check` | PASS; no source-adjacent generated artifacts |
| Deferred scope | `npm run scope:check` | PASS; no deferred leakage |
| Scope tests | `npm run test:scope-check` | PASS, 15/15 |
| Runtime smoke | `npm run runtime:smoke` | PASS for `/live=200`, `/ready=503`, `/health=404`; not live provider/DB acceptance |
| Whitespace | `git diff --check` | PASS; only Git LF/CRLF warnings |
| Exact tracked scope | `git diff --name-only` compared with the authorized five source/test paths plus Manager control files | PASS; `.codex/config.toml` excluded |
| Secret literal scan | credential-shaped literal scan over `apps modules packages scripts infra` | PASS; no match |
| Secret/log scan | credential-bearing logging-call scan over `apps modules packages scripts infra` | PASS; no match |
| OpenSpec | `openspec list --json` | `UNVERIFIED`; CLI is unavailable in this context. Committed active artifacts were read and unchanged. |
| Docker Compose | `docker compose version` | `BLOCKED`; Docker reports unknown command and a local config access warning. `docker-compose version` is installed (`v2.40.2-desktop.1`), but the repository validator invokes `docker compose`. |
| PostgreSQL/live completion | No safe live completion rerun was possible after the Docker check | `BLOCKED/UNVERIFIED`; no real generated Experiment/Leaderboard/rollback claim is promoted. |

The focused same-transaction regressions use a controlled transaction-client
adapter and verify that no Leaderboard persistence query falls back to the pool
while the Backtesting transaction is active. Existing adapter regressions cover
completion rollback and duplicate/idempotent Experiment and Leaderboard paths.
Because real PostgreSQL was unavailable in this Manager context, those live
database behaviors remain `BLOCKED/UNVERIFIED` for Instructor revalidation.

## Acceptance and stop boundary

- Packet-level source review and all available deterministic/static gates pass.
- The implementation preserves owner-filtered queries, trusted owner inputs,
  authoritative Experiment metric/provenance checks, duplicate admission
  behavior, and transaction rollback handling in the existing application
  orchestration.
- Real PostgreSQL transaction visibility, generated application data, provider
  behavior, authenticated browser/demo, and final MVP Definition of Done remain
  Instructor-owned evidence and are not accepted by this checkpoint.
- `I-02` is `REVIEW`, not `DONE`. No downstream work, final promotion, retry,
  replacement, branch, worktree, second Manager/worker, or unrelated task-state
  change was started.
- The single authorized `git add` attempt for the reviewed seven-file checkpoint
  failed with `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`.
  No retry was attempted, no commit exists, and the reviewed changes remain
  uncommitted and intact. This is the repository's safe checkpoint under the
  current filesystem permission boundary.
- Stop after this single INS-187 checkpoint. Independent Instructor review is
  required before any further authorization or final I-02 decision.
