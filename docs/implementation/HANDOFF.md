# I-02 Final E2E/Demo Verification — INS-128

## Result and authority

- Final disposition: `REVIEW` — `NEEDS_INSTRUCTOR_REVIEW`. I-02 is not `DONE`
  because required real configured runtime and demo evidence is unavailable or
  unverified. The authorization is exhausted at this safe checkpoint; no
  downstream task was promoted.
- Current Instructor signal: `INS-128 / APPROVED_FOR_EXECUTION`, authorized by
  `DEC-049`; it supersedes `INS-127 / HOLD` and authorizes exactly I-02.
- Canonical checkout: `D:\agy-cli-projects\AOS\Cryptox`, branch
  `MVP_IMPLEMENTATION`.
- Starting committed HEAD was verified as
  `c6b9690885e02e042c4f3e22a25e4637ad601517` (`chore(control): authorize I-02
  final verification`). Its parent was the reviewed
  `a58530fa037ae0d46a2d76a9ce1674166aacd137`; the authorization commit changed
  only `INSTRUCTOR.md` and `DECISIONS.md`.
- Before execution the board was verified as exactly 49 rows, 48 `DONE`, I-02
  `BLOCKED`, with I-01 and I-03 `DONE`, dependencies satisfied, and no
  competing Cryptox Manager, worker, reviewer, retry, replacement, duplicate,
  or downstream task active. The final board remains exactly 49 rows, 48
  `DONE`, and only I-02 non-`DONE` at `REVIEW`.
- The app-generated `.codex/config.toml` remains untouched, untracked, and is
  not part of the checkpoint.

## Scope, delegation, and state transition

- Authorized packet: `I-02 — E2E Demo, Documentation and Final Verification`.
  Governing acceptance includes every REQUIRED requirement ID, especially
  `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-DL-01`, and
  `CSL-R-DM-01`, plus the DEC-007 behavior represented by accepted dependency
  packets.
- Manager transition: `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` for I-02
  only. No other task state changed.
- Exactly three bounded internal children were used, with disjoint scopes:
  backend Confucius `01a0569d-e77c-7362-b5a9-f1ca425e9453` changed only
  `apps/backend/src/i02.backend.e2e.spec.ts`; frontend Fermat
  `01a0569d-e8c2-72b3-bdb4-9cb19843f4d2` changed only
  `apps/frontend/src/i02.frontend.e2e.spec.tsx`; setup/traceability Heisenberg
  `01a0569d-ea63-78e0-bfed-b11ca1ddbce0` changed only `README.md`. Each used
  `gpt-5.6-luna`, reasoning `max`, and the available `priority` service tier.
  All completed; none created a task, branch, worktree, commit, retry, or
  replacement. No child touched control files, contracts, migrations, module
  business logic, secrets, or generated artifacts.
- Fixtures are deterministic boundary evidence only. They cannot satisfy final
  configured PostgreSQL, Binance, News, or browser/demo acceptance.

## Evidence ledger

### PASS

- Clean reinstall: `npm ci --ignore-scripts --no-audit --no-fund` completed and
  added 330 packages. The npm deprecation warning for `glob@11.0.3` did not
  fail the install.
- Backend I-02 focused suite passed twice, five tests each:
  `npm --workspace @cryptox/backend exec vitest run
  src/i02.backend.e2e.spec.ts`. It covers HTTP Auth cookie boundaries and
  trusted identity propagation, unauthenticated/cross-owner private reads,
  owner-filtered collections and commands, provider-error sanitization,
  market-only WebSocket behavior, ephemeral observability, and fail-closed
  configured-mode preflight. This is fixture-only evidence.
- Frontend I-02 focused suite passed twice, five tests each:
  `npm --workspace @cryptox/frontend exec vitest run
  src/i02.frontend.e2e.spec.tsx`. It covers explicit remote-configuration
  guarding, explicit fixture labels, owner/session cache separation, four
  independent chart projections, bounded Search/Top-K/result/trade/metric/
  provenance projections, and degraded News state. This is fixture/SSR-only
  evidence.
- Final clean-install workspace test: `npm test` exited 0 with `425 passed` and
  `8 skipped`. The skips are environment-gated PostgreSQL tests, including the
  real Auth E2E; they are not completion evidence. A first cold Argon2 run hit
  its default timeout, an explicit longer diagnostic passed, and the final
  clean-install workspace run passed without changing that test.
- `npm run build`, `npm run typecheck`, and `npm run lint`: PASS, exit 0.
- `npm run arch:check`: PASS — no dependency violations; 184 modules and 615
  dependencies cruised, with the expected nine forbidden dependency fixtures
  detected.
- `npm run artifacts:check`: PASS — no source-adjacent generated module
  artifacts.
- `npm run scope:check`: PASS — no deferred-scope leakage. The frontend test
  keeps approved profile values assembled at runtime so the existing checker
  does not mistake `.spec.tsx` fixture literals for production scope.
- `npm run test:scope-check`: PASS, all 13/13 checker tests.
- `npm run runtime:smoke`: PASS — `/live=200`, truthful `/ready=503`,
  `/health=404`. The `503` is evidence of missing required runtime
  configuration, not final-demo readiness.
- `git diff --check`: PASS; only line-ending warnings were emitted.
- Requirement/traceability audit: all 33 requirement IDs are present in
  `docs/requirements.md`, authoritative `TASKS.md`, and active capability
  specs. The requirement text names all eight assignment architecture-change
  scenarios (localized MACD, replaceable Search, replaceable exchange, scale
  evolution, News-failure containment, sentiment-model independence, WebSocket
  recovery, and exact strategy-version traceability). This confirms textual
  traceability, not fresh functional proof of each scenario.
- Fresh local browser check: the frontend opened at `http://127.0.0.1:4173/`
  and visibly rendered the BTC/USDT workspace with four independent chart
  states and an explicit `Deterministic fixture` badge. Browser console output
  contained only the React DevTools informational message; no secret, token,
  cookie, or credential was logged. This is fixture evidence, not configured
  real-data demo evidence.
- `README.md` received one concrete traceability correction: it now identifies
  approved simple Auth/ownership, controlled LLM authoring, synthetic
  Long/Short paper execution, and bounded deterministic discovery while
  retaining deferred enterprise identity, generalized risk/live trading,
  unconfigured/autonomous LLM, distributed execution, and other deferred
  scope. It makes no implementation claim.

### BLOCKED / UNVERIFIED

- Real PostgreSQL/Auth/session acceptance is `BLOCKED`: `DATABASE_URL` is
  absent, and `npm run db:local:validate` failed because Docker Compose is not
  available (`docker: unknown command: docker compose`) and Docker config access
  is denied. Current up/constraints/down/remigrate evidence cannot be recreated;
  real register/login/current-user/absolute expiry/logout, opaque persisted
  session state, trusted identity, and live two-user persistence isolation are
  therefore not proven. Existing skipped integration tests and historical
  evidence are not promoted to current PASS.
- Real Binance history/realtime acceptance is `BLOCKED/UNVERIFIED`:
  `BINANCE_API_BASE_URL` and `BINANCE_WS_URL` are absent. The browser and test
  chart paths use deterministic fixtures only; no mock provider is promoted as
  final configuration.
- Real News import/normalization and provider-failure/degraded final demo is
  `BLOCKED/UNVERIFIED`: `COINDESK_API_KEY` and `COINDESK_BASE_URL` are absent.
  Local `LEXICON_V1` behavior and injected failure projections are test
  evidence only.
- Configured frontend/browser acceptance is `UNVERIFIED`: all
  `VITE_MARKET_SOURCE`, `VITE_MARKET_REST_URL`, `VITE_MARKET_WS_URL`,
  `VITE_AUTH_SOURCE`, and `VITE_FEATURE_SOURCE` variables are absent. The
  browser check therefore proves only the explicitly labelled fixture path.
- OpenSpec CLI is `UNAVAILABLE`; active specs/change files were read directly,
  and no CLI was installed or invented. Active
  `openspec/changes/mvp-implementation/tasks.md` retains unchecked
  high-level milestones while authoritative `TASKS.md` records completed
  packets. It is explicitly non-operational, but the mismatch is a material
  traceability inconsistency outside this packet's README-only allowance.
- Governing requirements, architecture, and several active specs still carry
  historical `NOT_IMPLEMENTED`/scaffolding status text while current runtime
  source has implemented paths. Reconciling that source/document status is
  outside I-02's bounded permission and requires Instructor-authorized source
  reconciliation; it is not silently repaired here.
- Because the required real providers, persistence, migration evidence,
  configured browser demo, and status-document reconciliation are missing, the
  eight architecture scenarios and full final MVP acceptance remain
  `UNVERIFIED` as a current integrated demonstration even though unit and
  boundary evidence passes.

## Changed paths and stop boundary

- Authorized integrated paths are exactly `README.md`,
  `apps/backend/src/i02.backend.e2e.spec.ts`,
  `apps/frontend/src/i02.frontend.e2e.spec.tsx`, this I-02 row in
  `docs/implementation/TASKS.md`, and this latest
  `docs/implementation/HANDOFF.md`.
- No module algorithm, business logic, contract, schema, migration,
  infrastructure, queue, distributed protocol, or unrelated source changed.
  `.codex/config.toml` is untracked and must remain unstaged.
- The stop condition is met: I-02 is at `REVIEW`, no downstream task is
  started, and `NEEDS_INSTRUCTOR_REVIEW` is required for the missing real
  environment/provider/browser evidence and the documented reconciliation
  inconsistencies.
