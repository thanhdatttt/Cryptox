# I-02 Final Evidence Checkpoint — INS-183 / DEC-104

## Authority and scope

Checkpoint date: 2026-09-01.

- Current Instructor signal: INS-183 / APPROVED_FOR_EXECUTION.
- Governing decision: DEC-104 / APPROVED.
- Canonical checkout: D:/agy-cli-projects/AOS/Cryptox.
- Branch and authorization HEAD: MVP_IMPLEMENTATION / dc6af3138bea6272202aefb2efa653e1f81942f3.
- Reviewed source/business checkpoint: f86ab93, containing the accepted configured-News UUID correction.
- The dispatch premise was verified: TASKS.md had 58 rows, 57 DONE, and only I-02 REVIEW. I-01 and I-03 were DONE.
- The diff from f86ab93 to authorization HEAD contained only docs/control/DECISIONS.md and docs/control/INSTRUCTOR.md. No source or business-state drift was found.
- The only pre-existing untracked path is .codex/config.toml and it was excluded.
- I-02 transitioned exactly REVIEW -> READY -> IN_PROGRESS -> REVIEW. No other task state changed.
- The Instructor-carried one-time Compose/backend rebuild and restart from f86ab93 was not repeated. It reported healthy services, /live=200, /ready=200, /news=200, and local PostgreSQL counts of 25 coindesk-rss News rows, 25 valid UUID item IDs, 25 linked Sentiment rows, and zero News rows without Sentiment. This remains carried runtime evidence, not a new Manager rebuild claim.

## Hidden evidence workers and closure

| Worker | Lane and unique marker | Result | Writes and cleanup |
|---|---|---|---|
| Carson, 01a05a89-e12d-71c1-af45-7ed57f14af25 | A, I02A-20260901-7C4E; infrastructure/providers | Completed sanitized report | Repository write scope none. No temporary business records were created. Auth user cleanup was unavailable because no public account-deletion route exists, so the two-user matrix was not attempted. |
| Hypatia, 01a05a89-e23d-7bc2-8480-b3a2b5b923a1 | B, I02B-20260901-91AD; configured Gemini authoring | Completed sanitized report | Repository write scope none. No temporary business records were created. Temporary backend process and temporary logs were stopped/deleted and read-verified absent. No provider fallback or fixture substitution. |
| Harvey, 01a05a89-e47d-7361-b251-5e630549756b | C, I02C-20260901-DB62; generated data/browser/eight scenarios | Interrupted after bounded waits and one stop request, then shut down | No final report was received. No C evidence, record creation, or cleanup claim is promoted; the lane remains UNVERIFIED. No repository write was authorized. |

No worker was retried or replaced. All three workers are closed.

## Lane A evidence

Carson used only public boundaries and sanitized all payloads.

- GET http://127.0.0.1:3000/live returned 200 with status live: LIVE.
- GET /ready returned 200 and ready with zero unavailable required or optional dependencies: LIVE.
- GET /health returned 404: LIVE.
- GET /news?schemaVersion=1&order=PUBLISHED_AT_DESC_PROVIDER_ID_ASC_PROVIDER_ITEM_ID_ASC&limit=25 returned 25 rows, 25 unique valid UUIDs, 25 unique provider item IDs, 25 coindesk-rss rows, zero missing Sentiment values, and 25 structurally valid linked Sentiment results: LIVE read corroboration. The collection claim remains CARRIED.
- The News DTO did not include extraction metadata for these rows; RSS extraction provenance was not independently observed.
- GET /auth/current-user returned 401 UNAUTHENTICATED: LIVE.
- POST /auth/register with an empty object returned 400 INVALID_REQUEST with no row created: LIVE.
- POST /auth/logout without a cookie returned 200: LIVE.
- GET /strategy/definitions with a client-supplied non-authoritative identity returned 401 UNAUTHENTICATED: LIVE negative boundary.
- POST /market-data/history for BTCUSDT, 1h, a bounded five-hour aligned range, and REQUIRE_COMPLETE returned 200 with 5/5 normalized closed candles, complete=true, zero missing ranges, and provider classified as Binance: LIVE bounded history.
- An unauthenticated market WebSocket handshake returned HTTP 401: LIVE negative boundary.
- Authenticated realtime subscription, disconnect/recovery, market observability, and News/Sentiment failure injection were not safely inducible.
- No raw titles, content, URLs, provider payloads, candles, credentials, headers, cookies, or environment values were printed.

## Lane B evidence

Hypatia inspected the existing public authoring sequence POST /strategy/authoring/drafts, then validation, then approval.

- An isolated process-scoped runtime liveness probe returned /live=200.
- Its readiness probe returned /ready=503 because persistent database configuration was unavailable in that process.
- Unauthenticated draft creation and definition reads were rejected at the Auth boundary.
- No authenticated PROMPT draft, deterministic validation, Save/Approve, immutable version, provenance, owner-isolation, unsafe-input, or provider-failure/no-side-effect flow was exercised.
- No exact public delete or retire route exists for temporary users, drafts, or definitions. The lane therefore created no temporary business records and did not substitute fixtures.
- Lane B live acceptance is BLOCKED/UNVERIFIED.

## Lane C evidence

Harvey did not return a report before the bounded stop. Generated Search, Backtest, Evaluation, Experiment, Trade, Leaderboard, authenticated browser/demo, and all-eight-scenario evidence is therefore UNVERIFIED. No claim about temporary-data cleanup is made for this lane.

## Manager validation gates

| Gate | Exact command or check | Result and classification |
|---|---|---|
| Build | npm run build | PASS; existing Vite CJS, dynamic-import, and large-chunk warnings only. |
| Typecheck | npm run typecheck | PASS. |
| Lint | npm run lint | PASS. |
| Workspace tests | npm test | FAIL: 461 passed, 1 failed, 9 environment-gated skips. The failure was modules/auth/infrastructure/argon2id.spec.ts timing out at the 5,000 ms test limit. Skips are not PASS evidence. |
| Architecture | npm run arch:check | PASS; 189 modules and 644 dependencies cruised, with 9 configured forbidden-dependency fixtures reported. |
| Artifacts | npm run artifacts:check | PASS; no source-adjacent generated module artifacts. |
| Deferred scope | npm run scope:check | PASS; no deferred enterprise-Auth, queue/distributed, risk, autonomous-LLM, or strict-replay leakage. |
| Scope tests | npm run test:scope-check | PASS, 15/15. |
| Scripted runtime smoke | npm run runtime:smoke | PASS for /live=200, /ready=503, /health=404 in the isolated smoke process. This is not live provider or PostgreSQL acceptance. |
| Requirement traceability | Read-only ID scan across docs/requirements.md, docs/implementation/MVP_PLAN.md, and docs/implementation/TASKS.md | PASS; all 33 REQUIRED CSL-R-* IDs were found in all three sources. |
| Documentation link/path check | Read-only relative-target scan across README.md and six governing documents | PASS; no missing relative targets. |
| Secret literal scan | Read-only scan for credential-shaped provider keys, bearer tokens, and hard-coded PostgreSQL passwords | PASS; no credential-shaped literal matched. |
| Secret/log scan | Read-only scan for logging calls containing password, token, cookie, authorization, API key, database URL, or secret fields | PASS; no matching logging call. |
| Whitespace | git diff --check | PASS; Git emitted only the repository LF-to-CRLF warning. |
| Exact path and staging | git diff --name-only and git diff --cached --name-only before final checkpoint write | PASS; only the Manager control scope was modified and no paths were staged. |
| Source/business drift | git diff --name-only f86ab93 -- modules apps packages infra scripts README.md package.json docs/architecture.md docs/data-model.md openspec | PASS; no tracked source/business drift. |
| OpenSpec CLI | openspec list --json | UNVERIFIED; openspec is not available in this Manager context. Instructor-carried @fission-ai/openspec 1.11.0 validation 11/11 is carried only, not a fresh Manager PASS. |
| Docker/Compose | docker compose version | BLOCKED; Docker reports unknown command: docker compose, with a local Docker config access warning. No Compose rebuild, restart, migration validation, or database reset was repeated. |
| Clean-install evidence | No clean-install command was available in the authorized read-only pass | UNVERIFIED. |

## Sanitized REQUIRED-ID matrix

The dispositions below separate narrow live observations from fixture/static evidence and carried claims. No fixture, skipped test, HTTP 200 alone, or carried claim is promoted to final MVP acceptance.

| REQUIRED ID | Evidence in this pass | Disposition |
|---|---|---|
| CSL-R-AR-01 | Static architecture gate passed; final live reliability, scale, and observability proof is incomplete. | PARTIAL / UNVERIFIED |
| CSL-R-AR-02 | Static architecture checks passed; Lane C returned no evidence for the eight change scenarios. | UNVERIFIED |
| CSL-R-AR-03 | Static dependency and deferred-scope checks passed; final integrated scenario evidence is incomplete. | UNVERIFIED |
| CSL-R-AU-01 | Live unauthenticated current-user, invalid-registration, and logout-boundary checks passed; full persisted registration/login/current-user/expiry/logout lifecycle was not proven. | PARTIAL LIVE / BLOCKED |
| CSL-R-BT-01 | Backtesting unit and boundary tests passed in the workspace; no application-generated live backtest was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-BT-02 | Synthetic paper and decimal/profile tests passed in the workspace; no live generated Experiment was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-DL-01 | Traceability, links, build, and repository gates passed; clean install and final demo instructions were not live-verified. | PARTIAL / UNVERIFIED |
| CSL-R-DM-01 | No authenticated browser/demo or complete real-data demonstration was returned. | UNVERIFIED |
| CSL-R-EV-01 | Evaluation tests passed; no live application-generated result was returned. | FIXTURE/STATIC ONLY |
| CSL-R-FE-01 | Frontend tests and build passed; no live browser chart or four-timeframe demo was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-LB-01 | Leaderboard tests passed; no application-generated owner-scoped leaderboard was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-MD-01 | Lane A returned a bounded live Binance historical response with 5/5 normalized complete candles. | LIVE BOUNDED PASS |
| CSL-R-MD-02 | Unauthenticated WebSocket rejection was live; authenticated realtime continuity, duplicate handling, and gap recovery were not induced. | PARTIAL LIVE / UNVERIFIED |
| CSL-R-MD-03 | No authenticated realtime observability or restart-ephemeral proof was induced. | BLOCKED / UNVERIFIED |
| CSL-R-NW-01 | Lane A read 25 persisted coindesk-rss rows with valid UUIDs and linked Sentiment; fresh collection is only Instructor-carried. | PARTIAL LIVE / CARRIED |
| CSL-R-NW-02 | The live News DTO omitted extraction metadata and no controlled extraction flow was exercised. | UNVERIFIED |
| CSL-R-OB-01 | Live readiness and provider/read boundaries were observed; search, backtest, leaderboard, and major-failure telemetry was not fully evidenced. | PARTIAL LIVE / UNVERIFIED |
| CSL-R-OW-01 | Live negative client-identity rejection was observed; two-user isolation and generated private-resource checks were not attempted because exact cleanup was unavailable. | PARTIAL LIVE / BLOCKED |
| CSL-R-RD-01 | Live Binance history and News/Sentiment reads plus carried runtime/DB evidence exist; real Auth, configured LLM, generated results, and complete demo are missing. | PARTIAL / UNVERIFIED |
| CSL-R-RP-01 | Static/fixture provenance and live history metadata were observed; no live Experiment provenance was produced. | FIXTURE/STATIC ONLY |
| CSL-R-RP-02 | Provenance contracts/tests were inspected and passed where covered; no live immutable authoring/result provenance was produced. | STATIC ONLY / UNVERIFIED |
| CSL-R-SE-01 | Search unit/public-boundary tests passed; no generated live Search run was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-SE-02 | Bounded-search tests passed; no live Search lifecycle was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-SE-03 | Seeded profile tests and scope checks passed; no generated live Search sequence/ranking was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-SN-01 | Lane A read 25 linked Sentiment results; independent failure isolation was not induced. | PARTIAL LIVE / UNVERIFIED |
| CSL-R-ST-01 | Strategy unit and boundary tests passed; no live authenticated strategy workflow was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-ST-02 | Static registry/architecture evidence exists; Lane C did not return the localized-MACD scenario evidence. | STATIC ONLY / UNVERIFIED |
| CSL-R-ST-03 | Composite tests passed; no live generated composite was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-ST-04 | Version/provenance tests passed; no live immutable version used by a generated result was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-ST-05 | Public draft route shape and unauthenticated rejection were observed; authenticated configured Gemini lifecycle was blocked by missing persistent runtime configuration. | BLOCKED / UNVERIFIED |
| CSL-R-ST-06 | Weighted-vote tests passed; no live generated weighted composite was evidenced. | FIXTURE/STATIC ONLY |
| CSL-R-ST-07 | Lite SMC/Wyckoff tests passed; no live demo or all-eight architecture evidence was returned. | FIXTURE/STATIC ONLY |
| CSL-R-VIS-01 | Frontend projection tests/build passed; no live selected-strategy markers/overlay demo was evidenced. | FIXTURE/STATIC ONLY |

## Final DoD and stop boundary

- Full MVP Definition of Done: NOT PROVEN.
- The decisive gaps are the failed full workspace test gate, missing clean-install evidence, unavailable Docker/Compose and OpenSpec CLI, incomplete persisted Auth/ownership lifecycle, no authenticated configured Gemini lifecycle, no application-generated result records, no browser/demo report, incomplete realtime recovery/failure isolation, and interrupted Lane C.
- I-02 remains REVIEW and is not DONE. The final board remains 58 rows with 57 DONE and only I-02 REVIEW.
- No source, config, dependency, migration, schema, contract, provider-protocol, frontend, fixture, deferred-scope, downstream, or OpenSpec path was changed or authorized.
- The Manager checkpoint is intentionally uncommitted at authorization HEAD dc6af31; no staging or commit was attempted under INS-183. The expected tracked Manager delta is limited to docs/implementation/TASKS.md and docs/implementation/HANDOFF.md. The pre-existing .codex/config.toml remains untracked and excluded.
- No downstream work, final promotion, or new authorization was started. Independent Instructor review is required next.

