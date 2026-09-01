# I-02 News PostgreSQL Review-Fix Checkpoint — INS-177 / DEC-098

## Authority and applicability

- Current Instructor signal: INS-177 / APPROVED_FOR_EXECUTION.
- Governing decision: DEC-098 / APPROVED.
- Canonical checkout: D:/agy-cli-projects/AOS/Cryptox.
- Branch: MVP_IMPLEMENTATION.
- Starting control checkpoint: 445dea8cc694502fe0cba28b5dee7f72213099bd.
- Reviewed source/business checkpoint: f32e19a1507810fa43725b209f437944d85d2cf7.
- Applicability check: PASS. The source/business checkpoint, approved requirements, accepted ADRs, active OpenSpec change, and implementation frontier were unchanged at dispatch; the only pre-existing untracked path is .codex/config.toml. The accepted implementation delta is limited to the two authorized News source/test paths plus Manager-owned control files.
- The board has 58 task rows: 57 DONE and only I-02 active. I-02 has been transitioned exactly REVIEW -> READY -> IN_PROGRESS -> REVIEW; it is not DONE and no downstream task started.
- This is one fresh same-directory Manager execution under INS-177 / DEC-098, not a retry or duplicate execution. The sole worker was 01a05a4b-2bfb-7673-ab41-ac32a5ddc8c8 / Nietzsche, dispatched strictly sequentially with the two authorized News infrastructure paths as its only write scope and then closed.
- The Manager did not edit source, dependencies, README, migrations, infrastructure, specifications, active-change files, generated artifacts, or business implementation files.

## Final INS-177 execution checkpoint

- Worker outcome: completed successfully; diagnosis confirmed. The joined PostgreSQL `read()` query had unqualified News-item columns colliding with overlapping provenance/template column names, producing the live sanitized 42702 error.
- Exact changed implementation paths: `modules/news/infrastructure/postgres.ts` and `modules/news/infrastructure/postgres.spec.ts`. The worker qualified the News-item projection, related-coin/publication filters, cursor predicates, and deterministic ordering with `news_items`, preserved aliases/joins/pagination/behavior, and added SQL/projection/filter/order regression coverage.
- Independent exact-path review: PASS. No provider, safe-fetch, runtime composition, contract, migration, schema, sentiment, frontend, dependency, README, OpenSpec, or unrelated path changed. The sole worker did not stage or commit.

### Validation results

- Worker: `npm exec vitest run modules/news/infrastructure/postgres.spec.ts` PASS, 4/4; News workspace typecheck PASS; worker diff whitespace PASS.
- Manager focused regression: PASS, 4/4. News workspace suite: PASS, 36/36. Backend workspace suite: PASS, 43/43 with 1 environment-gated skip. Root `npm test`: PASS, 462 passed with 9 environment-gated skips; skipped tests are not live evidence.
- `npm run build`: PASS; existing Vite CJS deprecation, dynamic-import, and large-chunk warnings only.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run arch:check`: PASS; no dependency violations across 189 modules and 644 dependencies; 9 forbidden-dependency fixtures recognized.
- `npm run artifacts:check`: PASS; no source-adjacent generated artifacts.
- `npm run scope:check`: PASS; no deferred-scope leakage.
- `npm run test:scope-check`: PASS, 15/15.
- `npm run runtime:smoke`: PASS; scripted `/live=200`, `/ready=503`, `/health=404`.
- `git diff --check`: PASS.
- Exact-path review: PASS; tracked working-tree paths are only `docs/implementation/HANDOFF.md`, `docs/implementation/TASKS.md`, `modules/news/infrastructure/postgres.spec.ts`, and `modules/news/infrastructure/postgres.ts`. Pre-existing `.codex/config.toml` remains untracked and excluded.
- Active OpenSpec change `mvp-implementation` was read from repository artifacts; the `openspec` CLI is unavailable in this Manager context, so CLI validation is BLOCKED/UNVERIFIED. No OpenSpec file was changed.

### Runtime /news result

- Before the correction, the already-running public request `GET http://127.0.0.1:3000/news?schemaVersion=1&limit=1&order=PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC` returned HTTP 400 with response content containing sanitized PostgreSQL code 42702.
- After the corrected repository was built and the focused/backend tests passed, the same already-running service still returned HTTP 400 with response content containing 42702 and no News items. The service ports are forwarded by the existing Docker/WSL process; no Docker/Compose invocation or process restart was authorized in this pass. The public correction is therefore BLOCKED/UNVERIFIED, not PASS; this is not classified as an upstream provider outage. The corrected repository path itself is exercised by the focused SQL regression and build/typecheck gates.

### Task, commit, and stop checkpoint

- Authorization: `INS-177 / APPROVED_FOR_EXECUTION`, governed by committed `DEC-098`; dispatch HEAD `445dea8cc694502fe0cba28b5dee7f72213099bd`; source/business baseline `f32e19a1507810fa43725b209f437944d85d2cf7`; branch `MVP_IMPLEMENTATION`.
- Transition: `I-02 REVIEW -> READY -> IN_PROGRESS -> REVIEW`, and no other task state changed. Final board remains 58 rows, 57 DONE, 1 REVIEW. No downstream/deferred/pending OpenSpec packet started.
- One explicit-path staging/commit attempt was executed once with only `docs/implementation/TASKS.md`, `docs/implementation/HANDOFF.md`, `modules/news/infrastructure/postgres.ts`, and `modules/news/infrastructure/postgres.spec.ts`. `git add` exited 128 with `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`; `git commit` was not invoked. No retry was made.
- Final branch/HEAD/status: branch `MVP_IMPLEMENTATION`, HEAD `445dea8cc694502fe0cba28b5dee7f72213099bd`, tracked paths `M docs/implementation/HANDOFF.md`, `M docs/implementation/TASKS.md`, `M modules/news/infrastructure/postgres.spec.ts`, `M modules/news/infrastructure/postgres.ts`, and pre-existing untracked `?? .codex/config.toml`. The accepted checkpoint remains uncommitted because Git could not create `.git/index.lock`.

### Remaining final I-02 evidence gaps

Full MVP DoD remains NOT PROVEN. The final-I-02 gaps are real configured News/RSS and isolated persisted Sentiment (the public `/news` correction is not live-proven here); application-generated Backtest/Evaluation/Experiment/Trade/Leaderboard data; configured Gemini 3.6 `LLM_AUTHORING_V1` draft/validation/Save/Approve/provenance/failure evidence; induced Binance WebSocket recovery/gap behavior; authenticated browser/demo verification; clean install/Docker/Compose reprovision; and fresh integrated evidence for all eight architecture scenarios. OpenSpec CLI validation remains BLOCKED/UNVERIFIED in this context.

## Prior INS-175 evidence (historical)

The three evidence workers were dispatched strictly sequentially, with write scope NONE. Each was closed before the next lane started.

| Worker | Scope | Sanitized result | Files changed | Final state |
|---|---|---|---|---|
| 01a05a2a-09ee-7252-8003-d70c4b6d918d / Volta | Runtime/provider/data: Auth and ownership, Binance, News/Sentiment, generated result data | /live, /ready, catalog, ranking configuration, and frontend reachability were checked. Auth two-user flow, Binance history/WebSocket/recovery, News/Sentiment, and generated results were not executed. The live News request returned 400 with sanitized error code 42702. | None | Closed |
| 01a05a2e-e153-7851-aa1f-febb18bd76df / Carson | Configured Gemini 3.6 through LLM_AUTHORING_V1, authoring lifecycle, authenticated browser/demo, failure/no-side-effect | Contract preflight and runtime reachability completed. No authoring request, draft/validate/Save/Approve/version/provenance test, cross-user test, failure test, authenticated browser flow, or screenshot was completed. | None | Closed |
| 01a05a31-ade5-7771-9637-9da2812e923a / Nietzsche | Build/typecheck/lint/tests, static checks, artifacts, traceability, OpenSpec, and eight architecture scenarios | Governing sources and static seams were reviewed. The worker stopped before formal subprocess execution; the Manager ran the formal validation gates afterward. Frontend observation showed four chart controls with feeds reconnecting/stale. | None | Closed |

All worker reports were sanitized. No password, session token, cookie value, API key, provider secret, or database password was emitted. No worker or Manager created temporary records in this pass; no cleanup or deletion was needed. No retry or replacement worker was created.

## Runtime and provider evidence

### Reachability and private-boundary probe

- GET http://127.0.0.1:3000/live returned 200.
- GET http://127.0.0.1:3000/ready returned 200 on the already-running process.
- GET http://127.0.0.1:3000/strategy/catalog returned 200 with 6 items.
- GET http://127.0.0.1:3000/strategy/ranking-configurations returned 200 with 1 item.
- GET http://127.0.0.1:5173/ returned 200 HTML.
- Unauthenticated GET /strategy/definitions, GET /search/runs, and GET /leaderboard returned 401.
- No registration, login, current-user, logout, cookie-expiry wait, or cross-user mutation was executed in this fresh pass. The Auth and ownership PASS rows below are carried from the prior live checkpoint and are explicitly marked carried.

### Auth and ownership carried evidence

The prior live checkpoint carried by this execution demonstrated PostgreSQL-backed email/password Auth V1, server-derived identity, owner-filtered user-owned collections, unauthenticated rejection, and cross-user negative reads/mutations. It also inspected the session cookie without exposing its value: HttpOnly, SameSite=Lax, Path=/, 24-hour Max-Age/Expires, Secure according to environment, and no Domain. No fresh two-user evidence is claimed here.

### Binance and frontend

- History endpoint: POST http://127.0.0.1:3000/market-data/history.
- Realtime endpoint: WebSocket path /market-data/ws.
- Carried live evidence covered normalized BTCUSDT history for 1m, 5m, 15m, and 1h plus market observability. No fresh history request, WebSocket disconnect, gap, reconnect, or recovery was induced.
- The frontend was observed at http://127.0.0.1:5173/. Four independent chart controls were present. The observed feeds were RECONNECTING or stale; this is partial UI evidence, not an authenticated demo. No screenshot was captured in this pass.

### News, Sentiment, and configuration

- Fresh request: GET http://127.0.0.1:3000/news?schemaVersion=1&limit=1&order=PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC.
- Result: 400 with sanitized error code 42702. No News collection or retry path was proven.
- No real News/RSS/Website/HTML collection, isolated persisted Sentiment, controlled LLM-assisted extraction, or provider-degradation walkthrough was executed.
- Safe set/unset inspection printed names only: BINANCE_API_BASE_URL SET, BINANCE_WS_URL SET, COINDESK_API_KEY UNSET, COINDESK_BASE_URL UNSET, COINDESK_RSS_URL SET, COINDESK_RSS_ALLOWED_HOSTS SET, COINDESK_RSS_ALLOWED_URL_PREFIXES SET, COINDESK_RSS_ALLOWED_URLS UNSET, LLM_AUTHORING_ENDPOINT SET, LLM_AUTHORING_MODEL SET, and LLM_AUTHORING_API_KEY SET. Values were never printed; this does not prove the running process loaded them.

### LLM authoring and generated application data

- The approved public authoring routes are POST /strategy/authoring/drafts, POST /strategy/authoring/drafts/:draftId/validate, and POST /strategy/authoring/drafts/:draftId/approve.
- No configured Gemini 3.6 request was made through LLM_AUTHORING_V1.
- No draft, validation result, explicit Save/Approve, immutable strategy version, provenance record, unsafe-input rejection, provider-failure/no-side-effect result, or cross-user authoring isolation was proven.
- No application-generated Search/Backtest/Evaluation/Experiment/Trade/Leaderboard records were created. Fixtures and deterministic tests were not promoted to live evidence.

## Fresh formal validation gates

The Manager ran these read-only or validation commands after the existing dependency environment was available. No npm install, clean reprovision, Docker/Compose invocation, source repair, or dependency change was performed.

| Command | Result | Exact result and limitation |
|---|---|---|
| npm run build | PASS | Exit 0. Workspace TypeScript and frontend Vite builds completed. Existing warnings only: Vite CJS API deprecation, dynamic-import chunking, and a chunk above 500 KB. |
| npm run typecheck | PASS | Exit 0. |
| npm run lint | PASS | Exit 0. |
| npm test | PASS | Exit 0: 462 passed and 9 environment-gated skips. Suite totals: Auth 8 passed/3 skipped; Backtesting 46; Evaluation 19; Leaderboard 22; Market 31/1 skipped; News 36; Search 36/1 skipped; Sentiment 20; Strategy 129/3 skipped; Backend 43/1 skipped; Frontend 50; Contracts 22. |
| npm run runtime:smoke | PASS | Exit 0: Backend smoke passed: /live=200, /ready=503, /health=404. This is the scripted simulated result; the already-running process independently returned /live=200 and /ready=200. |
| npm run arch:check | PASS | Exit 0: no dependency violations across 189 modules and 644 cruised dependencies; 9 forbidden-dependency fixtures were explicitly recognized by the checker. |
| npm run artifacts:check | PASS | Exit 0: No source-adjacent generated module artifacts found. |
| npm run scope:check | PASS | Exit 0: no deferred enterprise-Auth, queue/distributed, risk, autonomous-LLM, or strict-replay leakage found. |
| npm run test:scope-check | PASS | Exit 0: 15/15 tests passed. |
| README traceability/link check, rerun with Select-String -SimpleMatch | PASS | required_ids=33 missing_required_ids=0; readme_headings_missing=0; readme_local_links=10 missing_local_links=0. |
| Targeted secret/log scan | PASS with limitation | tracked_runtime_files=261 and secret_log_pattern_files=0; tracked_env_paths=1 (.env.example). This was a targeted scan, not standardized secret-scanner certification. No secret values were printed. |
| git diff --check | PASS | No whitespace errors; existing line-ending warnings only. |
| git diff --quiet f32e19a -- modules apps packages infra package.json package-lock.json README.md openspec docs/requirements.md docs/architecture.md docs/data-model.md docs/adr docs/implementation/MVP_PLAN.md | PASS | Source, business, governing, and active-change paths were unchanged from the reviewed checkpoint. |
| openspec | BLOCKED | The CLI was not available. The carried Instructor result @fission-ai/openspec@1.11.0, 11/11, remains carried evidence only; no installation or lookup retry was made. |
| Docker/Compose clean reprovision | BLOCKED | No Docker call was made in this pass. The prior checkpoint's Docker server/config access-denied result is carried; clean migration and reprovision are not proven. |

The fresh formal gates do not close the missing external-provider, generated-data, recovery, authenticated-demo, clean-reprovision, or scenario evidence.

## Eight architecture-change scenarios

All eight remain UNVERIFIED as fresh integrated scenarios:

1. Localized MACD — tests/docs contain MACD references, but no production MACD change or runtime scenario was executed.
2. Random to Genetic — generator ports and profiles are present, but no fresh Search/Backtest/Leaderboard run was executed.
3. OKX without frontend change — the provider boundary is present, but no second adapter or replacement-provider run was executed.
4. Scale 100 to 100,000 — bounded controls are present, but no load or performance evidence was collected.
5. News failure preserves charts — isolation is present in source, but live News returned 400 and no authenticated failure walkthrough was completed.
6. Sentiment-model replacement — the Sentiment port exists, but no replacement/integration run was executed.
7. Binance WebSocket recovery — reconnect/gap seams exist, but no upstream disconnect/recovery was induced.
8. Exact strategy-version traceability — version/provenance fields and persistence seams exist, but no generated Experiment/Leaderboard result was produced.

## REQUIRED-ID matrix

Status is an evidence label for this checkpoint. Evidence class distinguishes fresh, carried, fixture/static, unverified, and blocked work; partial or carried evidence does not satisfy a missing final integrated acceptance gate.

| Required ID | Status / evidence class | Limitation |
|---|---|---|
| CSL-R-AU-01 | PASS / CARRIED LIVE | Prior live checkpoint covered PostgreSQL Auth V1 registration, login, current-user, session cookie, logout, and unauthenticated rejection; no fresh two-user run or fixed-expiry wait here. |
| CSL-R-OW-01 | PASS / CARRIED LIVE | Prior live checkpoint covered trusted server identity, owner filtering, cross-user negative reads/mutations, and client identity rejection; no fresh run here. |
| CSL-R-RD-01 | BLOCKED / FRESH GAP | News is unavailable and no complete generated-data/demo path was exercised. |
| CSL-R-MD-01 | PASS / CARRIED LIVE | Prior live checkpoint covered normalized BTCUSDT 1m, 5m, 15m, and 1h history; no fresh request here. |
| CSL-R-MD-02 | UNVERIFIED / CARRIED STATIC | Update/append and recovery seams exist, but no disconnect/gap recovery was induced. |
| CSL-R-MD-03 | PASS / CARRIED LIVE | Prior market observability and WebSocket evidence is carried; current frontend reconnecting/stale state prevents a complete demo claim. |
| CSL-R-FE-01 | UNVERIFIED / CARRIED/PARTIAL UI | Four chart controls were observed, but the flow was unauthenticated, stale/reconnecting, and no screenshot was captured. |
| CSL-R-ST-01 | UNVERIFIED / CARRIED STATIC/FIXTURE | Strategy seams and deterministic tests exist; no final integrated strategy runtime flow was executed. |
| CSL-R-ST-02 | UNVERIFIED / FRESH STATIC | Descriptor/factory seams and tests exist; no localized-MACD scenario was executed. |
| CSL-R-ST-03 | UNVERIFIED / CARRIED STATIC/FIXTURE | Composite contracts/tests exist; no fresh live composite flow was executed. |
| CSL-R-ST-04 | UNVERIFIED / CARRIED STATIC | Version fields/tests exist; no generated result proves historical version retention. |
| CSL-R-ST-05 | UNVERIFIED / FRESH UNVERIFIED | No configured LLM request, explicit Save/Approve, unsafe-input, or provider-failure/no-side-effect path was executed. |
| CSL-R-ST-06 | UNVERIFIED / CARRIED STATIC/FIXTURE | Weighted-vote implementation/contracts/tests exist; no fresh execution or provenance proof. |
| CSL-R-ST-07 | UNVERIFIED / CARRIED STATIC/FIXTURE | Lite plugin source/contracts/tests exist; no fresh strategy/demo execution. |
| CSL-R-SE-01 | UNVERIFIED / CARRIED STATIC/FIXTURE | Generator abstraction and profiles exist; no fresh Search run. |
| CSL-R-SE-02 | UNVERIFIED / CARRIED STATIC/FIXTURE | Bounded stop/deadline controls exist; no fresh execution or observability proof. |
| CSL-R-SE-03 | UNVERIFIED / CARRIED STATIC/FIXTURE | Random/Domain/Genetic profiles and provenance code exist; no deterministic run comparison. |
| CSL-R-BT-01 | UNVERIFIED / CARRIED STATIC/FIXTURE | Bounded local executor and port exist; no application-generated Backtest. |
| CSL-R-BT-02 | UNVERIFIED / CARRIED STATIC/FIXTURE | Synthetic paper, SL-TP, fee, and slippage contracts/tests exist; no generated result/provenance. |
| CSL-R-EV-01 | UNVERIFIED / CARRIED STATIC/FIXTURE | Evaluator source/tests exist; no application-generated metrics. |
| CSL-R-LB-01 | UNVERIFIED / CARRIED STATIC/FIXTURE | User-scoped leaderboard source/tests exist; no generated submission or Top-K read. |
| CSL-R-VIS-01 | UNVERIFIED / CARRIED/PARTIAL UI | Chart controls/candles were observed, but no authenticated selected-strategy result view was completed. |
| CSL-R-NW-01 | BLOCKED / FRESH LIVE FAILURE | The live News request returned 400 error code 42702; no real collection/storage evidence. |
| CSL-R-NW-02 | BLOCKED / CARRIED STATIC | Safe-fetch/extraction seams exist, but no configured Website/RSS/HTML or controlled LLM-assisted extraction run. |
| CSL-R-SN-01 | BLOCKED / CARRIED STATIC/FIXTURE | Sentiment boundary exists, but real News/Sentiment persistence and degradation were not exercised. |
| CSL-R-RP-01 | UNVERIFIED / CARRIED STATIC/FIXTURE | Market provenance is present, but no end-to-end Experiment/Leaderboard provenance record. |
| CSL-R-RP-02 | BLOCKED / CARRIED STATIC | Authoring and News extension provenance paths were not available for a persisted proof. |
| CSL-R-AR-01 | UNVERIFIED / CARRIED STATIC | Architecture and seams align, but runtime reliability, provider coverage, performance, and full demo remain incomplete. |
| CSL-R-AR-02 | UNVERIFIED / FRESH GAP | None of the eight scenarios has fresh integrated final-run evidence. |
| CSL-R-AR-03 | PASS / FRESH STATIC | npm run arch:check exited 0 with no dependency violations. |
| CSL-R-OB-01 | UNVERIFIED / CARRIED/PARTIAL LIVE | Market observability/readiness evidence exists, but Search/Backtest/Leaderboard/News failure telemetry was not integrated-tested. |
| CSL-R-DL-01 | UNVERIFIED / FRESH STATIC | README structural traceability passed; complete live demo and clean reprovision evidence are not proven. |
| CSL-R-DM-01 | BLOCKED / FRESH GAP | Complete authenticated demo remains blocked by News, generated result data, LLM authoring, recovery, and Docker/reprovision gaps. |

## Full MVP DoD decision

Full MVP DoD is NOT PROVEN. I-02 remains REVIEW because the final/demo evidence still lacks:

- real configured News/RSS plus isolated persisted Sentiment;
- application-generated Backtest, Evaluation, Experiment/Trade, and user-specific Leaderboard data;
- a configured Gemini 3.6 request through LLM_AUTHORING_V1, including explicit Save/Approve, provenance, and failure/no-side-effect behavior;
- induced Binance WebSocket recovery/gap evidence and authenticated browser/UI verification;
- clean install/reprovision and Docker/Compose evidence; and
- fresh integrated evidence for all eight architecture scenarios.

No deferred feature or unapproved source delta was introduced. The fresh build, typecheck, lint, test, runtime-smoke, architecture, artifact, scope, test-scope, traceability, secret/log, and whitespace gates passed where executable, but they do not promote the missing provider, generated-data, recovery, or full-demo evidence.

## Task state, cleanup, and Git checkpoint

- I-02 transition: REVIEW -> READY -> IN_PROGRESS -> REVIEW under INS-175 / DEC-096.
- Final board counts: 58 rows, 57 DONE, 1 REVIEW (I-02), and no other active task.
- All three delegated workers are closed. No downstream task was started. No newly READY task was started or auto-promoted.
- No temporary records were created in this pass; no deletion or cleanup was required. No Docker/Compose process, dependency installation, source edit, migration, or infrastructure change was performed.
- Expected final Git status before the single commit attempt: M docs/implementation/TASKS.md, M docs/implementation/HANDOFF.md, and pre-existing ?? .codex/config.toml. The expected source/business paths remain unchanged from f32e19a.
- The single permitted explicit-path staging/commit attempt was executed once:
  git add -- docs/implementation/TASKS.md docs/implementation/HANDOFF.md
  git commit -m chore(control): checkpoint final I-02 evidence
- Staging failed and the commit was not invoked. Exact result: fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied.
- No files were staged or committed, and no retry was made. The final known working tree remains M docs/implementation/TASKS.md, M docs/implementation/HANDOFF.md, and pre-existing ?? .codex/config.toml.
