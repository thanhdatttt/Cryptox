# INS-108 Manager Checkpoint — I-01R Public Module Bootstrap and Persistence Seam Reconciliation

## Authorization and applicability

- **Instruction:** The current Instructor signal is exactly
  `INS-108 / APPROVED_FOR_EXECUTION`. It authorizes only the fresh prerequisite
  packet `I-01R`; `I-01` remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW`, and no
  `I-02`, `I-03`, extension, retry, replacement, duplicate, or downstream
  packet is authorized.
- **Reviewed starting checkpoint:** `b20c5e6` (`chore(control): hold after
  I-01 integration review`) on `MVP_IMPLEMENTATION`. The authorization commit
  `4e62101` is governance-only, changing only `INSTRUCTOR.md`,
  `DECISIONS.md`, and `MVP_PLAN.md`; no source, business-state, or task-state
  drift was found between the reviewed checkpoint and authorization.
- **Repository:** Work is in the canonical checkout
  `D:/agy-cli-projects/AOS/Cryptox` on `MVP_IMPLEMENTATION`. The tracked tree
  was clean at authorization. The app-generated untracked `.codex/config.toml`
  remains untouched, unstaged, and undeleted.
- **Board at authorization:** `41 DONE`, `1 REVIEW` (`I-01`), and `2 BLOCKED`
  (`I-02`, `I-03`). I-01R was added as the sole new operational row and moved
  to `REVIEW / NEEDS_INSTRUCTOR_REVIEW` after bounded implementation and review;
  all named I-01R start dependencies were DONE, including the accepted `I-01S`
  seam.
- **Active writers:** The app task inventory showed this fresh Manager and the
  Instructor source task only; historical Cryptox Managers/workers were idle or
  not loaded. No competing Cryptox Manager or worker was active before dispatch,
  and no worker retry, replacement, duplicate, or user-visible child task was
  created.

## Execution and scope

- **State transition:** I-01R moved exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`. The Manager alone made the
  transitions; `DONE` was not entered because required global gates did not
  pass.
- **Workers:** Exactly three fresh internal workers were dispatched in the same
  canonical directory with no worktrees and no commits:
  - Euler (`01a053ee-d398-7463-b291-3da26a1d4f83`) — Worker A,
    `modules/backtesting/api/**` except `contracts.ts`, plus focused API tests.
  - Erdos (`01a053ee-d47e-7eb1-8544-0efbd12a2e87`) — Worker B,
    `modules/search/api/**` except `contracts.ts`, plus focused API tests.
  - Chandrasekhar (`01a053ee-d5c3-74e2-aa98-c56eddc0e1fe`) — Worker C,
    `modules/strategy/api/**` except `contracts.ts`, the narrowly required new
    Strategy PostgreSQL adapter and focused tests, and `modules/sentiment/api/**`
    except `contracts.ts` with focused tests.
- **Worker rules:** Workers were instructed to read the authority chain, stay in
  their disjoint scopes, avoid all control-plane files, not commit, preserve
  existing algorithms/contracts/application/provider/schema behavior, and
  return scoped diffs, tests, and checkpoint evidence. All three returned final
  checkpoints and were closed after independent Manager review.
- **Manager edits:** The Manager edited only this checkpoint and `TASKS.md`,
  plus one genuinely tiny review cleanup removing an unused import from the
  worker-owned Strategy adapter. The cleanup was followed by Strategy 125/125
  package validation; no feature implementation was written by the Manager.
- **Accepted changed paths:** `modules/backtesting/api/bootstrap.ts`,
  `modules/backtesting/api/index.ts`,
  `modules/backtesting/api/composition.ts`,
  `modules/backtesting/api/composition.spec.ts`,
  `modules/search/api/bootstrap.ts`, `modules/search/api/index.ts`,
  `modules/search/api/index.spec.ts`, `modules/search/api/registry.ts`,
  `modules/search/api/composition.spec.ts`,
  `modules/strategy/api/bootstrap.ts`,
  `modules/strategy/api/bootstrap.spec.ts`,
  `modules/strategy/infrastructure/postgres.ts`,
  `modules/strategy/infrastructure/postgres.spec.ts`,
  `modules/strategy/infrastructure/postgres.integration.spec.ts`,
  `modules/sentiment/api/bootstrap.ts`, and
  `modules/sentiment/api/bootstrap.spec.ts`, plus this file and `TASKS.md`.
- **Authorized source boundary:** Only the explicitly listed Backtesting API,
  Search API, Strategy API/adapter, Sentiment API, and focused tests may enter
  this checkpoint. `packages/contracts/**`, all `contracts.ts` files,
  migrations/schema, all module `application/**`, existing providers and
  algorithms, backend/frontend/infra, dependencies, generated artifacts,
  OpenSpec artifacts, requirements, ADRs, and unrelated paths remain excluded.

## Acceptance target

The review proved through public-entrypoint tests that the bounded Backtesting
executor is composable, all three approved deterministic Search profiles are
exposed immutably without duplicate algorithm source, Strategy
definitions/composites are owner-filtered, paginated, versioned with a
database-safe insert/retry mechanism and exact component-version provenance,
and Sentiment's existing PostgreSQL dependencies are publicly exportable.
Fixture or fake tests establish deterministic behavior only; unavailable
PostgreSQL or provider evidence remains `UNVERIFIED`/`BLOCKED`. Worker C's
adapter currently proves the executable `MAJORITY_VOTE_V1` persistence path;
weighted-vote persistence is not claimed at this boundary.

## Validation checkpoint

- **PASS:** Backtesting 46/46; Search 36 passed / 1 PostgreSQL-gated skip;
  Strategy 125 passed / 2 PostgreSQL-gated skips; Sentiment 20/20; workspace
  build, typecheck, lint, full workspace tests, artifact/source-sidecar,
  test-scope (13/13), focused secret/log scan, whitespace, exact-path, and
  `git diff --check`.
- **FAIL:** `npm run scope:check` rejects `DOMAIN_GUIDED_V1` and `GENETIC_V1`
  in the authorized `modules/search/api/registry.ts`; the checker allowlist
  does not include this required public boundary. `npm run arch:check` reports
  71 dependency violations, including public API/infrastructure boundary
  findings. `npm run runtime:smoke` fails its readiness dependency assertion
  because the excluded backend exposes additional persistence/composition
  dependencies.
- **BLOCKED:** `npm run db:local:validate` cannot reach Docker Compose (Docker
  config access denied and `docker compose` is unavailable); `DATABASE_URL` is
  unset, so the two live Strategy PostgreSQL integration tests are skipped.
- **UNVERIFIED:** OpenSpec CLI status/instruction evidence; the executable is not
  available on this host.
- **Not claimed:** This packet does not provide final backend composition,
  PostgreSQL/provider/browser/demo, or final integration evidence and does not
  change the state or authorization of I-01/I-02/I-03.

## Review, stop boundary, and commit

- Workers finished with exact changed paths and test results, and the Manager
  reviewed each diff independently. I-01R stops at `REVIEW /
  NEEDS_INSTRUCTOR_REVIEW`: repairing the deferred-scope allowlist, architecture
  boundary/checker, or excluded backend smoke expectation would require paths
  outside this packet. Live PostgreSQL evidence also remains unavailable.
- `I-01` remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; `I-02` and `I-03` remain
  `BLOCKED`. No downstream work is started automatically.
- **Commit checkpoint:** One coherent staging/commit attempt was made for the
  explicit authorized paths plus `TASKS.md` and `HANDOFF.md`. Git denied staging
  with the verbatim error `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`.
  `git diff --cached --name-only` remained empty; no retry was made and no
  commit exists. `.codex/config.toml` remained outside the attempt.
