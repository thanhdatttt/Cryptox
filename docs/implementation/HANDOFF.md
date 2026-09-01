# I-02 Backtesting Trade-ID Correction Checkpoint — INS-189 / DEC-110

## Authority and applicability

Checkpoint date: 2026-09-01.

- Current Instructor signal: `INS-189 / APPROVED_FOR_EXECUTION`.
- Governing decision: `DEC-110 / APPROVED`.
- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`.
- Branch: `MVP_IMPLEMENTATION`.
- Reviewed source/business checkpoint: `00eb4a8`. The authorization commit
  `428779f` changes only `docs/control/INSTRUCTOR.md` and
  `docs/control/DECISIONS.md`; no source or business-state drift was found.
- The board contains 58 rows: 57 `DONE` and only `I-02` in `REVIEW`.
  No other task state changed. The pre-existing `.codex/config.toml` remains
  untracked and excluded.
- This packet corrects Trade-ID generation inside the approved Backtesting
  simulator. It does not authorize final MVP acceptance or `I-02 DONE`.

## Execution and worker review

- Manager state transition: `I-02 REVIEW -> READY -> IN_PROGRESS -> REVIEW`.
- Exactly one fresh hidden worker was created in the canonical checkout:
  Raman, agent `01a05af9-8439-7352-9654-9dcec48dd2b6`. It completed and was
  closed after returning its report.
- The worker was restricted to exactly these two implementation paths:
  `modules/backtesting/domain/simulator.ts` and
  `modules/backtesting/domain/simulator.spec.ts`. It did not edit control
  artifacts, stage, commit, create another worker, retry, or use a branch or
  worktree.
- The simulator now derives deterministic UUID-compatible Trade IDs from the
  experiment/candidate identity, execution profile and position mode where
  applicable, plus Trade sequence. The IDs use canonical UUID formatting with
  valid version and variant bits. The normal and synthetic-paper entry markers
  and exit Trades use the same ID; sequence, accounting, ownership inputs,
  public contracts, and experiment behavior remain unchanged.
- Focused regressions cover valid unique UUID IDs and marker alignment for the
  normal Long path and for paper Long plus synthetic Short paths.
- Independent Manager review found no change outside the authorized source/test
  paths and the Manager-owned control artifacts.

## Validation results

| Gate | Exact command/check | Result |
|---|---|---|
| Focused simulator tests | `npm exec vitest -- run modules/backtesting/domain/simulator.spec.ts` | PASS, 17/17 |
| Backtesting workspace | `npm test --workspace @cryptox/backtesting` | PASS, 49/49 |
| Full workspace tests | `npm test` | PASS, 466 passed; 9 environment-gated skips |
| Typecheck | `npm run typecheck` | PASS |
| Lint | `npm run lint` | PASS |
| Build | `npm run build` | PASS; existing Vite CJS/dynamic-import/large-chunk warnings only |
| Architecture | `npm run arch:check` | PASS, 189 modules / 645 dependencies; 9 configured forbidden fixtures |
| Generated artifacts | `npm run artifacts:check` | PASS; no source-adjacent generated module artifacts |
| Deferred scope | `npm run scope:check` | PASS; no deferred leakage |
| Scope tests | `npm run test:scope-check` | PASS, 15/15 |
| Runtime smoke | `npm run runtime:smoke` | PASS for `/live=200`, `/ready=503`, `/health=404`; not live provider/DB acceptance |
| Whitespace | `git diff --check` | PASS |
| Exact tracked scope | Compared changed paths with the two worker paths plus `TASKS.md` and `HANDOFF.md` | PASS; `.codex/config.toml` excluded |
| Secret/log scan | High-confidence scan of the authorized added lines | PASS; no credential-shaped literal or credential-bearing logging call added |
| OpenSpec | `openspec status --change "mvp-implementation" --json` | UNVERIFIED; the CLI is unavailable in this context. Committed active artifacts were read and unchanged. |
| PostgreSQL/Docker/provider/browser | Privileged live/demo verification | BLOCKED/UNVERIFIED in this Manager context; Instructor-owned revalidation remains required |

The nine test skips are environment-gated PostgreSQL/integration/Auth E2E
cases. They are not live acceptance evidence. Existing repository test fixtures
that contain placeholder credential vocabulary were not treated as secrets or
as live-provider evidence.

## Acceptance and stop boundary

- INS-189 packet acceptance is supported by the source review, UUID/uniqueness
  regressions, marker-linkage assertions, focused/full tests, and applicable
  static/formal gates above.
- The Manager did not run or claim real PostgreSQL completion, configured
  Binance/News provider, authenticated browser/demo, generated live
  Experiment/Trade/Evaluation/Leaderboard, or final MVP evidence. Those
  remain `BLOCKED`/`UNVERIFIED` and Instructor-owned.
- `I-02` is `REVIEW`, not `DONE`. No downstream task, final promotion,
  retry, replacement, duplicate Manager/worker, branch, worktree, or unrelated
  task-state change was started.
- The single explicit-path Manager staging attempt for this four-file checkpoint
  failed with `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`.
  No retry was attempted and no Manager checkpoint commit exists; the reviewed
  changes remain intact and uncommitted.

## Latest Git checkpoint

- Latest committed HEAD: `428779f`.
- Current tracked changes are limited to the two authorized simulator files and
  Manager-owned `docs/implementation/TASKS.md`/`HANDOFF.md`.
- The only untracked path is the pre-existing `.codex/config.toml`, excluded
  from the packet.
- Stop after this one Manager checkpoint attempt at `I-02 REVIEW`; independent
  Instructor live/demo review is required before any further authorization or
  final I-02 decision.
