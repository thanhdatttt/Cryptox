# I-02 Final Live/Demo Verification Checkpoint — INS-173 / DEC-094

## Authority and applicability

- Current Instructor signal: `INS-173 / APPROVED_FOR_EXECUTION`.
- Governing decision: `DEC-094 / APPROVED`.
- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`.
- Branch: `MVP_IMPLEMENTATION`.
- Current committed source/business checkpoint: `f95238704f4de65b9a5c5d6df5bb05cf11676e84`.
- Applicability check: the current checkout was compared with the reviewed control-plane premise. Source, business state, task DAG, dependencies, and the active OpenSpec change remained unchanged; the only intended tracked edits are the Manager-owned `TASKS.md` and this `HANDOFF.md`. Pre-existing untracked `.codex/config.toml` remains excluded.
- The operational board has 58 task rows: 57 `DONE`, and only I-02 is active. I-02 was transitioned exactly `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; it is not `DONE` and no downstream task started.
- No competing Cryptox Manager or worker was active. Three fresh hidden evidence workers ran in the same directory, strictly sequentially, and each was closed before the next lane started.
- No source, dependency manifest, README, migration, infrastructure, specification, active-change, generated artifact, or business implementation file was edited by a worker or by the Manager.

## Delegated evidence lanes

| Worker | Scope | Result | Files changed | Final state |
|---|---|---|---|---|
| `01a059fa-e694-7d40-8f7a-4dab4e6be2f1` / Socrates | PostgreSQL/Auth/ownership, Binance history/realtime/observability, News/Sentiment, generated Backtest/Evaluation/Leaderboard | Fresh live Auth/ownership evidence was obtained. News/Sentiment, generated result data, upstream recovery, and full browser/demo evidence remained blocked or unverified. | None | Closed |
| `01a05a04-0d67-7dd2-bb9c-a1f1598723bc` / Ptolemy | Configured `LLM_AUTHORING_V1`, authenticated REST/frontend lifecycle, failure/no-side-effect and provenance checks | Strategy catalog was reachable and ignored authoring configuration names were present without exposing values. No configured LLM request or authoring lifecycle was executed. | None | Closed |
| `01a05a0a-6c31-7f50-a6c7-8e7f47f3befe` / Darwin | Clean install/reprovision, validation scripts, README/traceability, architecture scenarios | Static source inventory and authority review completed. The worker began the build lane and was then instructed to close; the Manager ran the formal validation gates afterward. | None | Closed |

All reports were sanitized. No password, session token, cookie value, API key, provider secret, or database password was emitted. Worker A created temporary local Auth/strategy/leaderboard records through the public flow; the public API had no delete route, so the Manager verified the exact two test users and their cascaded records and removed only that verified ephemeral scope. Final verification found zero remaining records for those test users.

## Fresh evidence and exact sanitized commands

### Runtime, Auth, and ownership

- `GET http://127.0.0.1:3000/live` returned `200` JSON.
- `GET http://127.0.0.1:3000/ready` returned `200` JSON on the running process. The scripted smoke check also passed with its expected simulated result `/live=200, /ready=503, /health=404`; that script's `503` is not evidence that the running process was ready.
- `GET http://127.0.0.1:5173/` returned `200` HTML.
- Worker A exercised two unique PostgreSQL-backed users: registration, login, current-user, logout, and revoked-session behavior. The live path returned successful responses for valid operations and `401` after logout or for unauthenticated private access.
- Client-supplied `ownerUserId` was rejected with `400`; server-derived identity was used for resource ownership. Owner-filtered Strategy Definition and Leaderboard Scope collections were isolated. Cross-user Leaderboard reads and Composite mutations returned `404`.
- The session cookie was inspected without exposing its value: `HttpOnly`, `SameSite=Lax`, root `Path`, 24-hour `Max-Age`, and no `Domain`. A fixed-expiry wait was not induced in this run.
- Targeted local cleanup was performed only after read-only verification of the two Worker A test-user IDs and their exact child counts. A transaction deleted those two users and relied on the approved cascade; the final read-only check reported `users_remaining=0`, `strategies_remaining=0`, and `scopes_remaining=0` for the targeted test scope.

### Market data and frontend browser probe

- Worker A's fresh Auth lane did not issue a Binance history or WebSocket request. The earlier carried checkpoint remains the source of the live Binance history and market-observability evidence; no new recovery claim is made here.
- The Manager used the in-app browser against `http://127.0.0.1:5173/`. The genuine rendered page contained four independent BTCUSDT chart articles with default timeframes `5m`, `15m`, `1h`, and `4h`.
- The Manager changed only chart 1 from `5m` to `1m`. The browser DOM showed chart 1 loading/disconnected while charts 2–4 retained `15m`, `1h`, and `4h`; a full-page screenshot was captured. This is partial chart-control evidence, not a full authenticated demo: the current feed showed `DISCONNECTED`, stale-history/recovery messaging, and no authenticated result workflow.
- No upstream Binance disconnect/gap was induced, so recovery remains `UNVERIFIED`.

### News, Sentiment, authoring, and generated application data

- The running readiness response reported the optional `news-provider` as degraded. No real `/news` collection was available; a provider probe returned `503 CAPABILITY_UNAVAILABLE`.
- No real News/Sentiment persistence path was exercised, and no configured Website/RSS/HTML or controlled LLM-assisted extraction request was issued.
- Worker B did not call an authoring endpoint. Ignored `.env` inspection showed only that `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`, and `LLM_AUTHORING_API_KEY` were set; values were never printed and this does not prove the running process loaded them. No draft, validation, explicit Save/Approve, immutable version, provenance, cross-user, or failure/no-side-effect path was proven.
- No application-generated Backtest, Evaluation, Experiment/Trade, or user-specific Leaderboard data was created. No fixture result was promoted to live evidence.

### Fresh formal validation gates

The Manager ran these commands after restoring the already-present dependency environment. They are source/static validation for the current checkout; they do not replace the missing provider and live-demo evidence.

| Command | Result | Evidence / limitation |
|---|---|---|
| `npm run build` | `PASS` | Exit 0. Workspace TypeScript builds and frontend Vite build completed; only existing Vite/CJS, dynamic-import, and chunk-size warnings appeared. |
| `npm run typecheck` | `PASS` | Exit 0. |
| `npm run lint` | `PASS` | Exit 0; repository lint scripts are TypeScript no-emit checks. |
| `npm test` | `PASS` | Exit 0: 462 passed, 9 skipped. Skips are environment-gated and do not close external-provider or full-demo gaps. |
| `npm run runtime:smoke` | `PASS` | Exit 0; simulated smoke reported `/live=200, /ready=503, /health=404`. Live endpoint checks above independently returned `/live=200` and `/ready=200`. |
| `npm run arch:check` | `PASS` | Exit 0; no dependency violations across 189 modules and 644 cruised dependencies. Nine forbidden-dependency fixtures were explicitly allowed by the checker. |
| `npm run artifacts:check` | `PASS` | Exit 0; no source-adjacent generated module artifacts. |
| `npm run scope:check` | `PASS` | Exit 0; no deferred enterprise Auth, queue/distributed, risk, autonomous-LLM, or strict-replay leakage. |
| `npm run test:scope-check` | `PASS` | Exit 0; 15/15 scope tests passed. |
| Targeted secret/log scan | `PASS` with caveat | 156 source runtime files scanned; zero secret-bearing log-pattern findings; two harmless internal runtime-token constants were classified as false positives; only `.env.example` is tracked among env files. This was a targeted scan, not a standardized secret-scanner certification. |
| README structural traceability check | `PASS` | All 33 REQUIRED IDs were present in requirements; required README headings and keywords were present; 10 local README links resolved. |
| `openspec` CLI lookup | `BLOCKED` | `openspec` was not found. The Instructor-carried `@fission-ai/openspec@1.11.0` 11/11 result remains carried evidence only; no fresh CLI check was possible. |
| Docker/Compose recheck | `BLOCKED` | Docker server/config access was denied; Compose invocation was unavailable and returned an access-denied/unsupported-flag failure. Clean reprovision and migration were not proven. |

No retry of the failed Docker/Compose access or OpenSpec installation was made. The earlier Worker C install attempt was not treated as a source failure; the Manager's existing dependency environment supported the formal gates above.

## Eight architecture-change scenarios

The static seams and unit tests are useful evidence, but none of the eight scenarios has fresh integrated final-run evidence in this checkpoint.

1. Localized MACD — `UNVERIFIED`: generic Strategy factory/descriptor resolution and tests exist; no dedicated runtime change and final scenario run.
2. Random to Genetic — `UNVERIFIED`: generator ports and `GENETIC_V1` profile are present; no fresh Search/Backtest/Leaderboard run.
3. OKX without frontend change — `UNVERIFIED`: Market Data is behind a provider boundary; no OKX adapter or replacement run.
4. Scale 100 to 100,000 — `UNVERIFIED`: bounded execution/in-flight controls are present; no load or performance evidence.
5. News failure preserves charts — `UNVERIFIED`: isolation is present in source, but the live News provider was degraded and no browser failure walkthrough was completed.
6. Sentiment-model replacement — `UNVERIFIED`: News consumes a Sentiment port; no replacement/integration run.
7. Binance WebSocket recovery — `UNVERIFIED`: reconnect/gap code and client behavior are present; no upstream disconnect/recovery was induced.
8. Exact strategy-version traceability — `UNVERIFIED`: version/provenance fields and persistence seams are present; no application-generated Experiment/Leaderboard result was produced.

## REQUIRED-ID matrix

Status is an overall evidence label for this checkpoint, not a claim that a partial sub-path satisfies the complete acceptance gate. `PASS` is limited to direct live or direct static-gate evidence; carried-only, fixture-only, unavailable, and unexecuted behavior remains `UNVERIFIED` or `BLOCKED`.

| Required ID | Status | Evidence / limiting condition |
|---|---|---|
| `CSL-R-AU-01` | `PASS` | Fresh live PostgreSQL-backed two-user registration, login, current-user, session cookie, and logout evidence; fixed-expiry wait not induced. |
| `CSL-R-OW-01` | `PASS` | Fresh live owner filtering, cross-user negative reads/mutations, client-identity rejection, and trusted server identity propagation; temporary test records were cleaned. |
| `CSL-R-RD-01` | `BLOCKED` | Auth and market runtime are available, but real News is unavailable and no generated final data path was exercised. |
| `CSL-R-MD-01` | `PASS` | Carried live Binance evidence covered normalized BTCUSDT history at `1m`, `5m`, `15m`, and `1h`; no new request was issued in this lane. |
| `CSL-R-MD-02` | `UNVERIFIED` | Carried update/append behavior exists, but upstream disconnect/gap recovery was not induced in this checkpoint. |
| `CSL-R-MD-03` | `PASS` | Carried live market WebSocket observability evidence; current browser feed disconnection prevents treating the whole frontend demo as complete. |
| `CSL-R-FE-01` | `UNVERIFIED` | Fresh browser evidence shows four charts and independent timeframe selection, but the session was unauthenticated and the current feed was disconnected/stale. |
| `CSL-R-ST-01` | `UNVERIFIED` | Fresh deterministic tests/static seams pass, but no final integrated strategy runtime flow was exercised. |
| `CSL-R-ST-02` | `UNVERIFIED` | Generic descriptor/factory seam is present; no fresh localized-MACD scenario. |
| `CSL-R-ST-03` | `UNVERIFIED` | Composite unit/source evidence exists; no fresh live composite flow. |
| `CSL-R-ST-04` | `UNVERIFIED` | Version fields/tests exist; no generated experiment proving historical version retention. |
| `CSL-R-ST-05` | `BLOCKED` | No configured-process LLM request; Save/Approve and failure/no-side-effect paths were not exercised. |
| `CSL-R-ST-06` | `UNVERIFIED` | Weighted-vote implementation/contracts and tests exist; no fresh execution/provenance proof. |
| `CSL-R-ST-07` | `UNVERIFIED` | Lite plugin source/contracts and tests exist; no fresh strategy/demo execution. |
| `CSL-R-SE-01` | `UNVERIFIED` | Generator abstraction and Random registry are present; no fresh Search run. |
| `CSL-R-SE-02` | `UNVERIFIED` | Bounded stop/deadline controls are present; no fresh execution/observability proof. |
| `CSL-R-SE-03` | `UNVERIFIED` | Random/Domain/Genetic profiles and provenance code are present; no fresh deterministic run comparison. |
| `CSL-R-BT-01` | `UNVERIFIED` | Bounded local executor and port are present; no application-generated backtest. |
| `CSL-R-BT-02` | `UNVERIFIED` | Synthetic paper/SL-TP/fee/slippage contracts and tests exist; no generated result/provenance. |
| `CSL-R-EV-01` | `UNVERIFIED` | Evaluator source/tests exist; no application-generated metrics. |
| `CSL-R-LB-01` | `UNVERIFIED` | User-scoped leaderboard source/tests exist; no generated submission or Top-K read. |
| `CSL-R-VIS-01` | `UNVERIFIED` | Fresh browser candles and timeframe controls were observed; no authenticated selected-strategy result view. |
| `CSL-R-NW-01` | `BLOCKED` | News capability probe returned `503 CAPABILITY_UNAVAILABLE`; no real source collection/storage evidence. |
| `CSL-R-NW-02` | `BLOCKED` | Safe-fetch/extraction source exists, but no configured Website/RSS/HTML or controlled LLM-assisted extraction run. |
| `CSL-R-SN-01` | `BLOCKED` | Sentiment boundary/source exists, but real News/Sentiment persistence and degradation were not exercised. |
| `CSL-R-RP-01` | `UNVERIFIED` | Market provenance was carried; no end-to-end Experiment/Leaderboard provenance record. |
| `CSL-R-RP-02` | `BLOCKED` | Authoring and News extension provenance paths were unavailable; no persisted proof. |
| `CSL-R-AR-01` | `UNVERIFIED` | Architecture documents and static seams align; runtime reliability, performance, and provider coverage remain incomplete. |
| `CSL-R-AR-02` | `UNVERIFIED` | All eight architecture scenarios remain unexecuted as final integrated scenarios. |
| `CSL-R-AR-03` | `PASS` | Fresh `npm run arch:check` exited 0 with no dependency violations; source remained unchanged afterward. |
| `CSL-R-OB-01` | `UNVERIFIED` | Market observability/readiness evidence exists, but Search/Backtest/Leaderboard/News failure telemetry was not integrated-tested. |
| `CSL-R-DL-01` | `UNVERIFIED` | README structural traceability passed; complete live demo and clean reprovision evidence are not proven. |
| `CSL-R-DM-01` | `BLOCKED` | Complete authenticated demo is blocked by News, generated result data, LLM authoring, recovery, and Docker/reprovision gaps. |

## Full MVP DoD decision

Full MVP DoD is **NOT PROVEN**. I-02 remains `REVIEW` because the final/demo gates still lack:

- real configured News/RSS plus isolated persisted Sentiment;
- application-generated Backtest, Evaluation, Experiment/Trade, and user-specific Leaderboard data;
- a configured Gemini 3.6 request through the approved `LLM_AUTHORING_V1` boundary, including explicit Save/Approve, provenance, and failure/no-side-effect behavior;
- induced Binance WebSocket recovery/gap evidence and an authenticated browser/UI verification;
- clean install/reprovision and Docker/Compose evidence; and
- fresh integrated evidence for all eight architecture scenarios.

The fresh build, typecheck, lint, test, runtime-smoke, architecture, artifact, scope, test-scope, targeted secret/log, and README structural gates passed where executable. Their success does not promote the missing provider, generated-data, recovery, or full-demo evidence. No deferred feature or unapproved source delta was introduced.

## Task state, integrity, and Git checkpoint

- I-02 state transition: `REVIEW -> READY -> IN_PROGRESS -> REVIEW`, authorized by `INS-173 / DEC-094`.
- Final task counts: 58 rows, 57 `DONE`, 1 `REVIEW` (I-02), and no other active task.
- All three delegated workers are closed. No downstream task was started or unlocked by this checkpoint.
- Before the control edits, HEAD was `f95238704f4de65b9a5c5d6df5bb05cf11676e84`; the expected tracked delta is only `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`. Pre-existing `?? .codex/config.toml` is excluded.
- `git diff --check` reported no whitespace errors. Git emitted only the existing global-ignore permission warning and line-ending warning.
- The single permitted explicit-path staging/commit attempt was made with `git add -- docs/implementation/TASKS.md docs/implementation/HANDOFF.md`. Git denied creation of `.git/index.lock` with `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No files were staged or committed, and no retry was made.
- I-02 is intentionally left at `REVIEW`; the next action requires a new authorized review or execution instruction.
