# I-02 Final Live/Demo Verification Checkpoint — INS-171 / DEC-092

## Authority and applicability

- Current Instructor signal: `INS-171 / APPROVED_FOR_EXECUTION`.
- Governing decision: `DEC-092 / APPROVED`.
- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`.
- Branch: `MVP_IMPLEMENTATION`.
- Authorization baseline and source/business checkpoint: `08d9167328befd28bce999ae7470f446c6620302`.
- Applicability check passed: no source, business-state, task-DAG, dependency, or active-change premise changed during this verification. The only tracked changes are the Manager-owned control files recorded by this checkpoint. Pre-existing untracked `.codex/config.toml` remains excluded.
- The operational board has 58 task rows: 57 `DONE`, and only I-02 is active. I-02 was re-entered exactly as `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; it is not `DONE`.
- No competing Cryptox Manager or worker was active. Workers were fresh, hidden, same-directory, strictly sequential, evidence-only, and were closed before the next lane started.

## Delegated evidence lanes

| Worker | Scope | Result | Files changed |
|---|---|---|---|
| `01a059cf-1379-7030-83ee-a0e5bd728e6e` / Confucius | PostgreSQL/Auth/ownership, Binance history/realtime/observability, News/Sentiment, generated Backtest/Evaluation/Leaderboard | Live Auth/ownership and Binance/market-observability evidence; News, generated results, upstream recovery, and browser remain blocked or unverified | None |
| `01a059de-0e80-75a0-9674-67b8d0bdabd3` / Kant | Configured `LLM_AUTHORING_V1`, authenticated REST/frontend lifecycle, failure/no-side-effect and provenance checks | No application request issued. Process configuration was unavailable; `.env` authoring values were present but `DATABASE_URL` was empty and network was restricted | None |
| `01a059e1-a5a9-7303-b010-df3ec6275d10` / Godel | Clean install/reprovision, validation scripts, README/traceability, architecture scenarios | `npm ci` failed with Rollup-binary `EPERM`; remaining validation and scenario review were not run. No repair was attempted | None |

All worker reports are sanitized. No secret, password, token, cookie, API key, provider response, or database URL was emitted.

## Fresh evidence and exact sanitized commands

### Worker A and runtime endpoints

- `npm run db:local:prepare` — worker result `BLOCKED` because its Docker Compose access was denied. A Manager-side elevated read-only check confirmed Docker Server `28.5.1`; `docker compose --env-file infra/db/local.env -f infra/docker-compose.yml ps` returned no running services. This does not establish fresh reprovisioning.
- Sanitized `node -` two-user E2E against the already-running `http://127.0.0.1:3000` — live PostgreSQL/Auth evidence: registration/login/current-user/logout `200`, revoked session `401`, unauthenticated private access `401`, client-supplied owner identity `400`, cross-user identifiers `404`, owner-filtered collections isolated. Cookie attributes were `HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age=86400`, with no `Domain`.
- `POST http://127.0.0.1:3000/market-data/history` for `BTCUSDT` at `1m`, `5m`, `15m`, and `1h` — real `binance` provenance, complete ordered finite normalized OHLCV responses.
- `ws://127.0.0.1:3000/market-data/ws` — unauthenticated `401`, authenticated `101`, four subscriptions accepted, 3,291 ticks, 68 candles, and 3,295 observability messages observed. Same-timestamp update/later-timestamp append behavior and no duplicate closed-candle emission were observed. Upstream disconnect/gap recovery was not induced: `UNVERIFIED`.
- `GET http://127.0.0.1:3000/live` — `200`; `GET http://127.0.0.1:3000/ready` — `200` on the carried running process; `GET http://127.0.0.1:3000/news?limit=5` — `503 CAPABILITY_UNAVAILABLE`; `GET http://127.0.0.1:5173/` — `200`. No browser visual/interactivity walkthrough was performed.
- Application-generated Backtest, Evaluation, Experiment/Trade, and Leaderboard requests were not issued; no fixture result was promoted to live evidence.

### Worker B authoring lane

- `git branch --show-current`, `git rev-parse --short HEAD`, `git status --short`, `git log --oneline --decorate -12`, and `rg --files -g 'package.json' -g '*.env*' -g '!node_modules'` were run with sanitized output.
- Process authoring/database variables were `UNAVAILABLE`. In the ignored `.env`, `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`, and `LLM_AUTHORING_API_KEY` were `SET`, while `DATABASE_URL` was `EMPTY`; values were never printed.
- No authoring endpoint was called. Draft creation, validation, explicit Save/Approve, immutable versioning, provenance, cross-user access, and failure/no-side-effect paths are `BLOCKED` or `UNVERIFIED`.

### Worker C and Manager validation

- `npm ci` — `exit 1`, `EPERM` unlinking an existing Rollup native binary; npm cache logging also hit permission denial. The install was not fresh and left the dependency environment incomplete. No retry or repair was authorized.
- Before `npm ci`, Manager ran `npm run arch:check` — `exit 0`, no dependency violations across 189 modules/644 dependencies; the checker reported 9 allowed forbidden-dependency fixtures. This is a fresh static gate from this turn, retained as evidence because source files did not change.
- Before and after the failed install, `npm run artifacts:check` — `exit 0`, no source-adjacent generated artifacts; `npm run scope:check` — `exit 0`, no deferred-scope leakage; `npm run test:scope-check` — `exit 0`, 15/15 tests passed.
- After the failed install, Manager ran `npm run build`, `npm run typecheck`, and `npm run lint` — `exit 1` because `tsc` was missing; `npm test` — `exit 1` because `vitest` was missing; `npm run arch:check` — `exit 1` because `dependency-cruiser` was missing; `npm run runtime:smoke` — `exit 1` because `reflect-metadata` was missing from the existing built runtime. These are environment failures, not source-fix evidence.
- `openspec` CLI lookup — unavailable. README truthfully states that the repository does not declare an OpenSpec CLI command and that unavailable validation is `UNVERIFIED`; no OpenSpec claim was refreshed here. The README’s Install/Run/Architecture/Demo sections and real-provider/no-silent-fixture boundary align with the current package scripts and runtime names, but final demo completeness remains unverified.
- `git diff --check` produced no whitespace error. No worker or Manager command edited source, dependency manifests, README, migrations, infra, specs, or active-change files.

## Eight architecture-change scenarios

All eight remain `UNVERIFIED` as executable final scenarios. Static seams are present, but no fresh scenario run can substitute for the required integrated evidence.

1. Localized MACD: generic Strategy factory/descriptor resolution is present; no dedicated MACD runtime change or fresh scenario execution.
2. Random to Genetic: Search resolves generator ports and contains `GENETIC_V1`; no fresh Search/Backtest/Leaderboard run.
3. OKX without frontend change: Market Data is behind a provider boundary; no OKX adapter or replacement run was performed.
4. Scale 100 to 100,000: bounded execution and in-flight controls are present; no load/performance evidence exists.
5. News failure preserving charts: News/Sentiment failures are isolated in source; live News was unavailable and no browser failure walkthrough was run.
6. Sentiment-model replacement: News consumes a Sentiment port; no replacement/integration run was performed.
7. Binance WebSocket recovery: reconnect/gap code and client reconnect behavior are present; upstream disconnect/recovery was not induced.
8. Exact strategy-version traceability: version/provenance fields and persistence seams are present; no application-generated Experiment/Leaderboard result was produced.

## REQUIRED-ID matrix

Status is an overall evidence label for the requirement, not a claim that a partial sub-path satisfies the complete acceptance gate. `PASS` is used only where this checkpoint has direct live or direct static-gate evidence; fixture-only, carried-only, unavailable, and unexecuted behavior is not promoted to `PASS`.

| Required ID | Status | Evidence / limiting condition |
|---|---|---|
| `CSL-R-AU-01` | `PASS` | Worker A live PostgreSQL-backed two-user registration, login, current-user, fixed-session, and logout flow. |
| `CSL-R-OW-01` | `PASS` | Worker A live owner filtering, cross-user negative references, client-identity rejection, and trusted server identity propagation. |
| `CSL-R-RD-01` | `BLOCKED` | Binance/Auth live, but real News is unavailable and no application-generated final data path was exercised. |
| `CSL-R-MD-01` | `PASS` | Live Binance normalized BTCUSDT history at four required timeframes. |
| `CSL-R-MD-02` | `UNVERIFIED` | Live update/append behavior observed; upstream disconnect and gap recovery not induced. |
| `CSL-R-MD-03` | `PASS` | Live market WebSocket timing, connection state, latency, and ephemeral 100-tick observability evidence. |
| `CSL-R-FE-01` | `UNVERIFIED` | Four timeframes were exercised at the backend; no authenticated browser/UI independence walkthrough. |
| `CSL-R-ST-01` | `UNVERIFIED` | Registry and pure domain plugin seams are present; fresh unit/integrated execution was unavailable after dependency loss. |
| `CSL-R-ST-02` | `UNVERIFIED` | Generic descriptor/factory seam is statically present; no fresh localized-MACD scenario. |
| `CSL-R-ST-03` | `UNVERIFIED` | Composite/combination code is present; no fresh live composite flow. |
| `CSL-R-ST-04` | `UNVERIFIED` | Versioned persistence fields are present; no generated experiment proving historical version retention. |
| `CSL-R-ST-05` | `BLOCKED` | No configured-process LLM request; Save/Approve and failure side-effect paths not exercised. |
| `CSL-R-ST-06` | `UNVERIFIED` | Weighted-vote implementation/contracts are present; no fresh execution/provenance proof. |
| `CSL-R-ST-07` | `UNVERIFIED` | Lite plugin source/contracts are present; no fresh strategy/demo execution. |
| `CSL-R-SE-01` | `UNVERIFIED` | Generator abstraction and Random registry are present; no fresh Search run. |
| `CSL-R-SE-02` | `UNVERIFIED` | Bounded stop/deadline controls are present; no fresh execution/observability proof. |
| `CSL-R-SE-03` | `UNVERIFIED` | Random/Domain/Genetic profiles and provenance code are present; no fresh deterministic run comparison. |
| `CSL-R-BT-01` | `UNVERIFIED` | Bounded local executor and port are present; no application-generated backtest. |
| `CSL-R-BT-02` | `UNVERIFIED` | Synthetic paper/SL-TP/fee/slippage contracts are present; no generated result/provenance. |
| `CSL-R-EV-01` | `UNVERIFIED` | Evaluator contract/source is present; no application-generated metrics. |
| `CSL-R-LB-01` | `UNVERIFIED` | User-scoped leaderboard persistence/source is present; no generated submission or Top-K read. |
| `CSL-R-VIS-01` | `UNVERIFIED` | Visualization contracts/source are present; no authenticated browser result view. |
| `CSL-R-NW-01` | `BLOCKED` | `/news?limit=5` returned `503 CAPABILITY_UNAVAILABLE`; no real source collection/storage evidence. |
| `CSL-R-NW-02` | `BLOCKED` | Safe-fetch/extraction source is present, but no configured Website/RSS/HTML or LLM-assisted extraction run. |
| `CSL-R-SN-01` | `BLOCKED` | Sentiment boundary/source exists, but real News/Sentiment persistence and degradation were not exercised. |
| `CSL-R-RP-01` | `UNVERIFIED` | Market provenance was observed; no end-to-end Experiment/Leaderboard provenance record. |
| `CSL-R-RP-02` | `BLOCKED` | Authoring and News extension provenance paths were unavailable; no persisted proof. |
| `CSL-R-AR-01` | `UNVERIFIED` | Architecture documents and static seams align; runtime reliability/performance/observability coverage is incomplete. |
| `CSL-R-AR-02` | `UNVERIFIED` | All eight change scenarios remain unexecuted as final scenarios. |
| `CSL-R-AR-03` | `PASS` | Manager’s fresh pre-install `npm run arch:check` exited 0 with no dependency violations; source remained unchanged afterward. |
| `CSL-R-OB-01` | `UNVERIFIED` | Market observability and readiness were seen; Search/Backtest/Leaderboard/News failure telemetry was not integrated-tested. |
| `CSL-R-DL-01` | `UNVERIFIED` | Required README/architecture artifacts exist and are truthful about unverified runtime state; complete live demo and clean validation are not proven. |
| `CSL-R-DM-01` | `BLOCKED` | No complete authenticated browser demo because News, generated results, LLM authoring, and fresh dependencies were unavailable. |

## Full MVP DoD decision

Full MVP DoD is **NOT PROVEN**. I-02 remains `REVIEW` because the final/demo gates require all of the following, and several are absent:

- real configured News/RSS plus isolated persisted Sentiment;
- application-generated Backtest, Evaluation, Experiment/Trade, and user-specific Leaderboard data;
- configured Gemini 3.6 through the existing OpenAI-compatible `LLM_AUTHORING_V1` boundary, including explicit Save/Approve, provenance, and failure/no-side-effect behavior;
- induced Binance WebSocket recovery/gap evidence and authenticated browser/UI verification;
- clean install/reprovision, build, typecheck, lint, full tests, and runtime smoke from a healthy dependency environment;
- fresh end-to-end evidence for the eight architecture scenarios.

The successful carried/historical OpenSpec and earlier repository gates remain historical context only; they do not close the missing live/demo evidence. No deferred feature or unapproved source delta was introduced. `artifacts:check`, `scope:check`, and `test:scope-check` pass in the current environment; the dependency-dependent checks are blocked by the failed `npm ci` state.

## Git/checkpoint and commit policy

- Before this checkpoint update, HEAD remained `08d9167328befd28bce999ae7470f446c6620302`; no worker changed it.
- Expected tracked delta before the one permitted commit attempt: only `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`. Pre-existing `?? .codex/config.toml` is excluded.
- Single permitted explicit-path attempt: `git add -- docs/implementation/TASKS.md docs/implementation/HANDOFF.md` was denied with `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No files were staged or committed, and no retry was made.
- I-02 is left at `REVIEW`; no downstream task is unlocked by this checkpoint.
