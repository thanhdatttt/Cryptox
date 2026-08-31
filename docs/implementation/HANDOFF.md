# I-01 Runtime, Transports and Observability Integration — INS-120

## Applicability

- This is the single fresh same-directory Manager attempt authorized by
  `INS-120 / APPROVED_FOR_EXECUTION`, limited to the existing `I-01` packet.
- Canonical checkout: `D:\agy-cli-projects\AOS\Cryptox`, branch
  `MVP_IMPLEMENTATION`, authorization HEAD
  `c7dc015dc76a1b6fabfb4e34190b009897106128`.
- Reviewed source/business checkpoint: `2462f18`. The authorization delta was
  governance-only in `docs/control/INSTRUCTOR.md` and
  `docs/control/DECISIONS.md`; the only pre-existing untracked path is the
  untouched app-generated `.codex/config.toml`.
- Before dispatch, the board was verified at 49 rows: 46 `DONE`, `I-01`
  `REVIEW`, and `I-02`/`I-03` `BLOCKED`. `I-01R` and `ENV-05`/`06`/`07`/`08`
  are `DONE`; all recorded I-01 dependencies are satisfied; no other active
  Cryptox Manager, worker, retry, replacement, duplicate, or downstream writer
  was present.

## Execution and review

- `I-01` transitioned `REVIEW → READY → IN_PROGRESS → REVIEW`.
- Exactly one fresh sequential implementation worker was used: Halley
  (`01a055ca-ced6-7890-83ec-3289df017659`), `gpt-5.6-luna`, reasoning `max`,
  service tier `priority`. The worker did not stage, commit, create a child,
  edit control-plane files, or touch `.codex/config.toml`.
- Worker-changed paths, and only worker-changed paths:
  - `apps/backend/src/auth.runtime.ts`
  - `apps/backend/src/compose.ts`
  - `apps/backend/src/runtime.ts`
  - `apps/backend/src/module-paths.ts`
  - `apps/backend/src/backend.capabilities.integration.spec.ts`
- The Manager changed only this handoff and the existing `I-01` row in
  `docs/implementation/TASKS.md`. No package manifest or lockfile changed.
- Review found public bootstrap composition for Auth, Strategy, Search,
  Backtesting, Market Data, Evaluation, Leaderboard, News, and Sentiment;
  shared PostgreSQL adapter wiring when configured; bounded local execution;
  trusted server-side session identity; real Binance adapter configuration;
  local `LEXICON_V1`; truthful liveness/readiness and provider-failure
  projections; and no mock/fixture final-runtime fallback.
- Exact-path review found no frozen REST or market-only WebSocket contract
  change, module-internal deep import, deferred-scope leakage, general event
  bus, non-market WebSocket, or unrelated change.

## Validation evidence

- Backend HTTP/WebSocket and capability tests: PASS; 17 tests passed and 1
  PostgreSQL-gated Auth E2E test skipped. The new capability suite covers
  trusted identity, unauthenticated/ownership/404/spoof behavior, strategy
  definitions/composites, manual and SearchRun backtests, candidates,
  experiments, trades, generated leaderboard results, and `LEXICON_V1`.
- Root `npm test`: PASS, 411 tests passed and 9 PostgreSQL-gated tests skipped.
- `npm run build`, `npm run typecheck`, and `npm run lint`: PASS.
- `npm run arch:check`: PASS (the checker reports its expected nine forbidden
  dependency fixtures).
- `npm run artifacts:check`, `npm run scope:check`, and
  `node --test scripts/check-deferred-scope.test.cjs`: PASS (`13/13`).
- `npm run runtime:smoke`: PASS (`/live=200`, `/ready=503`, `/health=404`).
- Secret/log, exact changed-path/deep-import, whitespace, and `git diff
  --check` review: PASS; no credentials, session tokens, or cookies are
  logged or exposed.
- OpenSpec CLI validation: `UNVERIFIED`; the CLI is unavailable, while the
  active `mvp-implementation` artifacts were reviewed directly.
- Real PostgreSQL Auth/application integration and local migration validation:
  `BLOCKED/UNVERIFIED`; `DATABASE_URL` is unset and
  `npm run db:local:validate` cannot run because Docker Compose is unavailable
  (`docker: unknown command: docker compose`, with Docker config access denied).
  The skipped PostgreSQL tests are not counted as PASS.
- Read-only live Binance historical validation: `BLOCKED/UNVERIFIED: fetch
  failed` in the available runtime environment. Realtime Binance validation is
  `UNVERIFIED`. No configured real News source was available (`COINDESK`,
  `BINANCE`, and `NEWS` environment names were absent), so the News smoke is
  `UNVERIFIED`. Browser/demo evidence is `UNVERIFIED` and was not claimed.

## Closure boundary

- `I-01` remains `REVIEW`, not `DONE`, because required real
  PostgreSQL/migration and provider/demo evidence is unavailable or unverified.
- `I-02` and `I-03` remain unchanged and `BLOCKED`. No downstream, extension,
  retry, replacement, duplicate, or final/demo task was started.
- The one explicit-path staging/commit attempt for the five backend paths plus
  the existing `I-01` `TASKS.md` row and this handoff was denied before staging:
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock':
  Permission denied`. No retry was made; `.codex/config.toml` remains unstaged.
