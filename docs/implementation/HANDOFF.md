# INS-106 Manager Checkpoint — I-01 Runtime, Transports and Observability Integration

## Authorization and applicability

- **Authorization:** The current Instructor signal is exactly
  `INS-106 / APPROVED_FOR_EXECUTION`. The reviewed starting checkpoint is
  `f656274`; the authorization checkpoint is `984a4bd`, whose material delta
  is governance-only in `docs/control/INSTRUCTOR.md` and
  `docs/control/DECISIONS.md`. The signal authorizes I-01 only.
- **Repository and board:** Work was performed directly in
  `D:/agy-cli-projects/AOS/Cryptox` on `MVP_IMPLEMENTATION`. The board at
  authorization was verified as 41 `DONE`, 1 `REVIEW` (`I-01`), and 2
  `BLOCKED` (`I-02`, `I-03`). All I-01 start dependencies and the accepted
  `I-01S` seam at `7d574e6` were verified. No source, business-state, or task
  DAG drift was found from the reviewed checkpoint. The untracked
  `.codex/config.toml` remains untouched.
- **Applicability:** No competing Cryptox Manager or worker was active. No
  downstream packet was started or unlocked by this authorization.

## Execution and scope

- **State transition:** I-01 moved exactly `REVIEW → READY → IN_PROGRESS →
  REVIEW`. The final state is `REVIEW / NEEDS_INSTRUCTOR_REVIEW`, not `DONE`.
- **Worker:** Exactly one fresh sequential internal worker was used: Volta
  `01a0539c-3372-71e3-acb6-d27a0239f4b6`. The worker used the canonical
  same-directory checkout, changed only the authorized backend scope, did not
  edit control-plane files, did not commit, and was closed after its bounded
  pass. A same-worker stop instruction was used to obtain the final checkpoint;
  no replacement, retry, duplicate, parallel worker, or user-visible child was
  created.
- **Manager review:** The Manager made one narrow test-only review correction
  in `apps/backend/src/market.gateway.spec.ts` so its bounded client frame
  helper correctly encodes the frozen WebSocket payload length forms. No
  implementation assertion was weakened.
- **Allowed paths:** Only `apps/backend/**` plus the Manager-owned
  `docs/implementation/TASKS.md` and this handoff changed. No
  `packages/contracts/**`, `modules/**`, `infra/**`, migrations/schema,
  frontend, dependency, generated, architecture, requirements, ADR, OpenSpec,
  or unrelated route path changed. No `package.json` or lockfile update was
  necessary.

## Implemented backend boundary

- AppModule now composes a single backend runtime, exposes `/live` and truthful
  `/ready`, wires Auth, capability REST controllers, and attaches a market-only
  WebSocket gateway.
- Auth registration/login/current-user/logout preserve the approved opaque
  HttpOnly session cookie. Private requests resolve identity only through
  server-side session context; client `userId`/`ownerUserId` values are not
  authorization evidence.
- REST mappers cover the existing public surface for market history, Strategy
  catalog/definitions/composites, Search lifecycle, Backtesting candidate /
  Experiment / Trade reads, Leaderboard scopes/ranking/top-K, News, and the
  local Sentiment projection embedded in normalized News. Shared market,
  catalog, News, and ranking-configuration reads remain public; user-owned
  operations are protected and owner-filtered.
- The gateway authenticates the opaque session during upgrade and emits only
  normalized market tick/candle/connection-status, subscription ACK/error, and
  `MARKET_OBSERVABILITY_V1` messages. Observability is explicitly ephemeral and
  bounded to the approved in-memory projection.
- Runtime configuration consumes public module barrels/bootstrap seams and the
  public Strategy registry; no Strategy domain/plugin deep import is present.
  Missing required persistence or capability composition remains not-ready;
  News/Sentiment degradation is optional and isolated. Provider and persistence
  failures are projected without exposing implementation details.

## Acceptance evidence

| Area | Evidence | Result |
|---|---|---|
| Backend HTTP/WS composition | `backend.integration.spec.ts` 5/5; market gateway 2/2; existing Auth/controller and readiness tests included in the backend suite | **PASS** for fixture/fake composition evidence |
| Trusted identity and isolation | Unauthenticated private access returns 401; owner-filtered Strategy collections, cross-owner Leaderboard scope returns 404, and client identity spoof is rejected | **PASS** for fixture/fake boundary evidence |
| Frozen transport mapping | REST DTO mapping and market-only WebSocket parser/frames are covered; no non-market event message is emitted | **PASS** |
| Readiness/failure projections | Liveness is independent; missing required dependencies return not-ready; News/Sentiment failures remain optional; provider details are redacted | **PASS** for deterministic failure evidence |
| Manual Backtest, bounded SearchRun, Candidate/Experiment/Trade, generated Leaderboard | Production runtime cannot compose the bounded executor or Search generator through the current public bootstraps; required module export/reconciliation work is outside I-01 scope | **BLOCKED** |
| Real PostgreSQL Auth/application state | `DATABASE_URL` is unset; `npm run db:local:validate` is blocked because Docker Compose is unavailable; PostgreSQL-gated tests remain skipped | **BLOCKED / UNVERIFIED** |
| Live Binance history/realtime | Historical probe ended `UNVERIFIED: fetch failed`; realtime probe ended `UNVERIFIED: Binance realtime reconnect limit was reached` | **UNVERIFIED** |
| Configured real News source | `COINDESK_API_KEY`/`COINDESK_BASE_URL` are unset; direct source probe ended `UNVERIFIED` at `fetch failed` | **UNVERIFIED** |
| Browser/final demo | Not run; real runtime configuration and the authorized backend-only boundary are incomplete | **UNVERIFIED** |

The remaining composition blockers are concrete public-seam gaps, not a reason
to fabricate readiness: the bounded local executor is not exported for backend
composition, Search does not export its required generator composition, Strategy
does not expose a PostgreSQL bootstrap, and Sentiment does not expose its
PostgreSQL bootstrap. Resolving those requires excluded module/bootstrap work or
new authorization.

## Validation and gate results

- **PASS:** `npm --workspace @cryptox/backend run build`.
- **PASS:** `npm --workspace @cryptox/backend run typecheck` and `lint`.
- **PASS:** `npm --workspace @cryptox/backend test` — 15 passed, 1
  environment-gated PostgreSQL Auth E2E skipped.
- **PASS:** `npm run build`, `npm run typecheck`, `npm run lint`.
- **PASS:** `npm test` — 396 passed, 6 environment-gated PostgreSQL/integration
  skips. Skips are not real-runtime acceptance evidence.
- **PASS:** `npm run artifacts:check`, `npm run scope:check`, and
  `npm run test:scope-check` (13/13).
- **PASS:** `git diff --check`, trailing-whitespace review for new backend
  files, exact changed-path review, deferred-scope review, and targeted
  secret/log review. No password, raw credential, session token, token digest,
  cookie, or provider secret is logged.
- **FAIL:** `npm run arch:check` reports 71 dependency violations in existing
  module paths. No I-01 backend path is listed among those violations; the
  excluded architecture/source inconsistencies were not altered.
- **FAIL:** `npm run runtime:smoke` starts the backend and confirms liveness /
  not-ready behavior, then fails because the existing smoke script expects the
  old four-dependency readiness list while I-01 truthfully projects seven
  required dependencies. The script is outside the authorized write scope and
  was not changed.
- **BLOCKED:** Local PostgreSQL validation because Docker Compose failed with
  `WARNING: Error loading config file: open C:\\Users\\admin\\.docker\\config.json: Access is denied.`
  followed by `docker: unknown command: docker compose`.
- **UNVERIFIED:** OpenSpec CLI; `openspec status` and `openspec instructions`
  are unavailable on this host. No install or network fallback was attempted.

## Changed paths

- `apps/backend/src/app.module.ts`
- `apps/backend/src/auth-context.ts`
- `apps/backend/src/auth.controller.ts`
- `apps/backend/src/auth.runtime.ts`
- `apps/backend/src/backend.integration.spec.ts`
- `apps/backend/src/capabilities.controller.ts`
- `apps/backend/src/compose.ts`
- `apps/backend/src/main.spec.ts`
- `apps/backend/src/main.ts`
- `apps/backend/src/market.gateway.spec.ts`
- `apps/backend/src/market.gateway.ts`
- `apps/backend/src/rest-errors.ts`
- `apps/backend/src/runtime.ts`
- `apps/backend/src/transport.ts`
- `docs/implementation/TASKS.md`
- `docs/implementation/HANDOFF.md`

## Stop boundary and commit

- `I-02` and `I-03` remain `BLOCKED`; no downstream or newly unlocked packet
  was started. I-01 stops at `REVIEW / NEEDS_INSTRUCTOR_REVIEW` pending a new
  Instructor decision for the excluded public-bootstrap gaps and unavailable
  real-environment evidence.
- **Commit result:** The one coherent Manager staging/commit attempt for the
  listed authorized source and checkpoint paths was denied during staging with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`.
  No commit was created and no staging/commit retry was made. The source and
  checkpoint delta remains uncommitted; `.codex/config.toml` remains untracked,
  untouched, and unstaged.
