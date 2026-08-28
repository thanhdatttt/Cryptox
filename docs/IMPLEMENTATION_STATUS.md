# Implementation Status

## Current state

- Branch: `implement`
- Project status: **Live Binance Spot market-data integration implemented and validated on 2026-08-25**
- Current feature: **Environment-selected Binance REST klines, persisted history backfill, public trade/kline WebSocket union management, honest provider status, and explicit demo-only seed policy**
- Next feature: **none for this market-data integration; future providers remain behind the existing adapter contract**

## Live Binance market-data implementation (2026-08-25)

The Market Data module now composes Binance explicitly when `MARKET_DATA_PROVIDER=BINANCE`.
The backend-only `MARKET_DATA_BINANCE_REST_URL` and `MARKET_DATA_BINANCE_WS_URL`
variables default to Binance's public Spot endpoints `https://api.binance.com` and
`wss://stream.binance.com:9443`; no API key or secret is read or emitted.

- No-range candle reads calculate the latest aligned closed-candle window, fetch only missing ranges through Binance REST `/api/v3/klines`, persist normalized OHLCV rows, and avoid another request while the window is complete.
- Explicit ranges are gap-synced through the provider contract and preserve completeness errors; snapshots continue to use only persisted, non-forming sealed candles.
- Binance combined streams normalize `@trade` and `@kline_<interval>` payloads. One subscription manager maintains the complete union for all active panels, replaces forming candles by timestamp, appends new timestamps, rejects closed-candle regressions, and reconnects with bounded exponential backoff/resubscription.
- PostgreSQL rows carry `BINANCE:HISTORICAL_SYNC` or `BINANCE:REALTIME_STREAM` provenance. The deterministic `seed-dev-market` job is now `demo`-profile-only and requires `MARKET_DATA_SEED_MODE=DEMO`; normal Compose startup does not run it.
- `GET /market/pairs` exposes the active provider's supported pair/timeframe capabilities for controlled Market selectors. The browser persists the validated versioned Market layout (`cryptox.market-layout`) in parent UI state and local storage, including the 1–4 panel arrangement, pair/timeframe choices, realtime setting, and selected primary panel.
- Binance `@trade` payloads retain positive `q` quantity and derive the documented aggressor side from `m` (`m=true` means the buyer was the maker, therefore the trade is rendered as `SELL`; otherwise `BUY`). The public Socket.IO `MARKET_TICK` payload carries pair, price, timestamp, quantity, and side. A bounded five-second provider-clock skew is accepted so real Binance trades are not discarded while materially future timestamps remain invalid.
- The Market UI consumes backend connection-status messages and labels Binance as not connected until the upstream status is genuinely `CONNECTED`. Provider/network failures leave the chart empty/error or disconnected/reconnecting rather than fabricating candles.

The reference-aligned Market correction also removes the Candle update logic and Legend side cards, keeps the provider wording honest, renders bounded newest-first Recent Ticks with real quantity/side values, and uses an accessible red SVG Remove chart control that is disabled when only one panel remains. Chart-card text is enlarged without changing compact axis labels.

## Validation evidence (2026-08-25)

- Focused market-data tests passed: 16 tests covering recorded Binance REST/WebSocket payloads, REST pagination, latest no-range sync, explicit missing-range sync, provenance persistence, forming-candle replacement, closed-candle protection, panel-union resubscription, reconnect/backoff, and offline failure state.
- Backend WebSocket/controller tests passed: 9 tests, including authenticated subscription changes and normalized message forwarding. Frontend tests passed: 15 tests, including honest disconnected provider status.
- `npm test` passed: all workspace suites plus deterministic seed tests. `npm run build`, `npm run lint`, `npm run arch:check`, and `git diff --check` passed; the architecture check reported 773 modules and 1,077 dependencies with no violations.
- `docker compose -f infra/docker-compose.yml config --quiet` passed. A rebuilt normal Compose run completed with migration exit 0 and healthy PostgreSQL, Redis, backend, backtest-worker, and frontend services. The `seed-dev-market` service was not started because it is demo-profile gated.
- Authenticated live smoke against the rebuilt Compose backend passed: history returned three candles with `BINANCE:HISTORICAL_SYNC` source for BTCUSDT `1m`, `5m`, `15m`, and `1h`; the Socket.IO market stream reported `DISCONNECTED → RECONNECTING → CONNECTED` and delivered live kline updates for all four timeframes.
- PostgreSQL verification after the smoke found Binance history and realtime rows for all four timeframes, including `BINANCE:REALTIME_STREAM` forming-candle updates.

## Frontend integration audit (2026-08-25)

The former `apps/frontend/src/main.tsx` was a reference-screen presentation with hard-coded candles, strategies, trades, news, leaderboard rows, demo user text, and a `Demo transport` status. It has been replaced by a live integration shell. `apps/frontend/src/api.ts` is the only frontend transport boundary and persists the JWT in `localStorage`.

| Frontend surface | Backend contract | Status |
| --- | --- | --- |
| Register, login, session restore, logout | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | Implemented |
| Strategy plugins, definitions, composites | `GET /strategies`, `POST /strategies`, `GET/POST /strategies/definitions|composites` | Implemented |
| Market history, snapshots, live updates | `GET /market/candles`, `POST /market/snapshots`, authenticated Socket.IO `/market` | Implemented with 1–4 independent panels, bounded reconnect, and REST reconciliation |
| Scope and queued manual backtesting | `GET/POST /leaderboard-scopes`, `POST/GET /backtests/:candidateId` | Implemented with polling lifecycle |
| Experiment, replay, visualization | `GET /experiments/:id`, `POST .../replay`, `GET .../visualization` | Implemented |
| Search lifecycle and ranking | `POST/GET /search-runs`, `GET /search-runs/:id/leaderboard` | Implemented with polling |
| Leaderboard | `GET /leaderboard?scopeId=` | Implemented |
| News | `GET /news`, `POST /news/collect` | Implemented |

The frontend now also renders candidate history and authoritative Search pause/resume/cancel controls, Experiment metrics and paginated Trade Detail, sealed visualization markers, replay status, and explicit unavailable SL/TP values. Focused frontend transport tests cover bearer persistence, 401 clearing, empty 201/202 responses, and Socket.IO namespace framing.

### Realtime Market integration correction validation (2026-08-25)

- Focused validation passed: 20 frontend tests, 19 Market Data tests, and 9 backend tests. Coverage includes versioned layout storage/fallback, backend capabilities transport, bounded tick presentation, Binance quantity/side normalization, invalid payload rejection, provider-clock skew handling, closed-candle protection, and authenticated WebSocket forwarding.
- Full `npm test`, `npm run build`, `npm run lint`, `npm run arch:check`, and `git diff --check` passed after the correction. The architecture check reported no dependency violations.
- Rebuilt Docker Compose with migration gating. A fresh authenticated browser session rendered 1m/5m/15m/1h history from Binance REST, connected all four authenticated Socket.IO panel subscriptions, and Recent Ticks displayed genuine BTCUSDT rows with non-rounded quantities plus BUY/SELL sides. The backend/provider status remained honest and no mock market rows were used.

### Backend contract limitation

`POST /strategy-generations` is now implemented and authenticated. It validates text/HTTP(S) URL input and persists the generated definition through the existing strategy facade. The current adapter is intentionally deterministic (`LOCAL_DETERMINISTIC`, version `1.0.0`) and selects a registered plugin from source keywords; it does not yet fetch remote source content, call an external model, or persist a full generation-audit record. The frontend shows the returned provenance and backend errors instead of silently falling back to demo data.

The backend bootstrap now explicitly enables bearer-token CORS for the separately served Vite frontend, and the Market Gateway enables the matching Socket.IO origin policy. Without these narrow transport fixes, a browser could reach the API from the Compose/local frontend origin but the browser would block HTTP or WebSocket responses.

The previously open validation gaps are now closed: the browser-level Compose flow and the assignment-required worker-backed completed backtest flow both passed. The deterministic generation adapter limitation remains explicit below; it does not silently substitute frontend demo data.

### Frontend runtime evidence (local launcher, 2026-08-25)

- `npm run smoke:dev`: passed after wiring the isolated backend port into Vite.
- Browser flow against the local launcher: synthetic test account registration, login, authenticated Market screen, persisted-session reload, logout/protected-route return to sign-in, live Socket.IO state `CONNECTED`, independent second chart panel, backend descriptor-driven strategy selection, persisted MA definition, and persisted weighted composite all passed.
- The local in-memory runtime has no historical candle rows and no worker/Redis completion path, so the browser showed the honest Market empty state; it was not treated as backtest completion evidence.

### Frontend runtime evidence (Docker Compose, 2026-08-25)

Docker was available through Docker Desktop, but this shell did not inherit its PATH. Validation therefore used the absolute executable `C:\Users\Admin\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe`.

- `docker version`: passed — Docker Desktop 4.87.0, Docker Engine 29.7.2, `desktop-linux`, `linux/amd64`.
- `docker compose version`: passed — Docker Compose v5.4.0.
- `docker compose -f infra/docker-compose.yml up --build`: passed. PostgreSQL, Redis, backend, backtest-worker, and frontend became healthy; the migration service exited successfully. The final published endpoints were backend `http://localhost:3000` and frontend `http://localhost:5173`.
- Development Market seed: passed in the earlier demo validation. Migration `009_add_market_candle_source` adds explicit candle provenance; the deterministic `seed-dev-market` service is now gated behind the Compose `demo` profile and `MARKET_DATA_SEED_MODE=DEMO`. Seed rows use source `DEV_SEED:realtime-v1` and do not create users, credentials, backtests, or leaderboard data.
- API E2E against the containers: passed. A fresh user registered and logged in; protected identity, strategy definitions, composite creation, 8 historical market candles, input snapshot, benchmark scope, `202 QUEUED` manual backtest, worker-completed candidate/attempt, experiment, one trade, replay `MATCH`, 8-candle/1-marker visualization, leaderboard, Search `COMPLETED`, one Search candidate, and one Search leaderboard entry were all verified from the live responses.
- Browser E2E against `http://localhost:5173`: passed. The UI registered and logged in a fresh synthetic account, and logout returned to sign-in. In the authenticated Compose flow, the UI restored the session after reload, showed 12 backend candles and authenticated Socket.IO `CONNECTED` state, created a strategy and weighted composite, displayed persisted generation provenance, created a snapshot/scope, queued and observed a completed backtest, rendered experiment/trade detail, verified replay `MATCH`, loaded sealed visualization markers, ran Search through `COMPLETED`, and displayed real Leaderboard rows.
- Repeat scope validation after the final rebuild: passed. Creating another scope from the backend candle range no longer produced the duplicate canonical snapshot hash error; the newly returned scope was added to the selector and retained as the selected scope.
- Runtime contract fixes found during validation: Compose now exposes the browser-facing API as `VITE_BACKEND_URL=http://localhost:3000`; composite backtests send all component definition IDs; scopes use the live candle range; PostgreSQL Search IDs are generated with UUIDs; and canonical input snapshots are reused by SHA-256.

## Assignment and reference-image audit (2026-08-25)

Sources reviewed, in priority order: the 54-page assignment PDF, `crypto-strategy-lab-final-project.md`, and the supplied `realtime.jpg`, `strategy.jpg`, `disco.jpg`, `backtest.jpg`, and `news.jpg` reference screens. The audit distinguished source requirements from implementation notes and checked the running frontend against the authenticated public HTTP/WebSocket contracts.

### Genuine mismatches corrected

- The Market screen had only a basic single bar view at runtime. It now renders up to four independent backend OHLCV candlestick/volume panels, authenticated Socket.IO state, reconnect/loading/error/empty states, recent ticks, and forming-versus-closed candle handling.
- Backtest was a minimal scope-and-queue form. It now exposes pair, timeframe, date range, capital, transaction cost, slippage, saved scopes, queued/running/completed/failed lifecycle, persisted experiment metrics, trade detail, replay verification, and backend visualization markers.
- Search and Leaderboard rows previously exposed only candidate/rank state. They now enrich rows from persisted experiment results and show real return, win rate, drawdown, trade count, score, and status values while retaining honest empty states.
- Strategy Library now presents the backend plugin catalog, versioned saved definitions, weighted composite creation with valid normalized default weights, the Generate → Backtest → Evaluate → Rank → Leaderboard workflow, and generation provenance. News now exposes backend source/asset filters, collection state, persisted sentiment distribution/model provenance, and the actual collect → normalize → analyze → persist pipeline.
- Frontend fixtures and demo rows were removed from the runtime surfaces. Backend source/model labels are displayed explicitly so local providers cannot appear to be Binance or an external LLM.

Commits for the corrected frontend modules: `0c22960 feat(frontend): align live screens with assignment references` and `7d2c247 fix(frontend): default composite weights evenly`. Focused frontend validation passed with 11 tests, including chart bounds/formatting, sentiment aggregation, composite weight defaults, API transport, and state behavior.

### Strategy screen reference audit refinement (2026-08-25)

- The Strategy route now uses the same compact authenticated shell as Realtime and matches the supplied `strategy.jpg` workspace: prompt/URL input, backend-returned summary cards, readable JSON with copy action, validation/provenance/save state, and a persisted recent-library table. The catalog/manual definition and weighted-composite areas remain available below the reference workspace so existing live authoring behavior is preserved.
- Compose browser verification passed against the rebuilt frontend: prompt generation and URL generation both used authenticated `POST /strategy-generations`, rendered the returned definition and `LOCAL_DETERMINISTIC` provenance, refreshed `GET /strategies/definitions`, and saved a two-component `WEIGHTED_SCORE` composite through `POST /strategies/composites`.
- Empty, loading, validation, and backend-error states are rendered in the reference card language. The UI does not invent LONG/SHORT condition cards; the public Strategy contract returns plugin parameters and provenance, not condition expressions.
- Focused Strategy validation passed: 15 frontend tests, including API request/provenance mapping and generated-definition/composite helper behavior.

### Final live validation evidence

- Fresh browser registration/login, persisted-session reload, logout, and protected-route return to sign-in passed against the containers.
- Fresh browser registration/login against the seeded Compose stack passed. The authenticated Market screen returned and rendered non-empty backend history for all four default panels: `BTCUSDT · 1m`, `5m`, `15m`, and `1h`, each reporting `Historical candles: 1000` with authenticated Socket.IO `Connected` state.
- After the final `docker compose -f infra/docker-compose.yml up --build -d`, the browser created MA/RSI definitions and a weighted composite, created a snapshot/scope, observed a completed backtest with 2 trades (`-2.21%` return, `50%` win rate, `5.88%` max drawdown), verified replay `MATCH`, loaded a 12-candle/3-marker visualization, completed Random Search, and displayed two real Leaderboard rows.
- The final browser smoke also confirmed four market panels with authenticated `CONNECTED` WebSocket state and backend candlestick rendering, plus `LOCAL_DEMO` news records with persisted `LOCAL_LEXICON` sentiment fields.
- Final repository validation passed: `npm test` (67 tests), `npm run build`, `npm run lint`, `npm run arch:check` (763 modules / 1,050 dependencies, no violations), and `git diff --check`.
- Docker validation passed with Docker Desktop 4.87.0 / Engine 29.7.2 / Compose v5.4.0; backend, worker, PostgreSQL, Redis, and frontend all reached healthy status.

### Realtime chart-creation refinement (2026-08-25)

- The Market layout contract is now version `2`. New users and invalid/stale saved layouts start with zero panels, `BTCUSDT` selected for the next chart, and realtime enabled. Valid layouts retain panel order/count, per-panel pair/timeframe, realtime setting, and selected pair across tab navigation and refresh through parent state plus validated localStorage; version `1` layouts intentionally fall back to the empty state.
- The top pair selector is controlled by `/market/pairs` capabilities. Each supported timeframe button (`1m`, `5m`, `15m`, `1h`, `4h`, `1d`) creates a new independent panel using the selected pair; duplicate pair/timeframe panels are allowed until four panels exist. There is no Add chart or primary-panel action. At four panels the timeframe controls are disabled with an explicit maximum-limit message.
- The Market route retains backend REST history, authenticated Socket.IO candles/ticks, per-panel selectors, honest connection/loading/error/empty states, genuine normalized Recent Ticks, the reference-aligned connection/ticks sidebar, and the destructive Remove chart control (disabled at one remaining panel). Candle update ordering remains backend-contract driven: same timestamps merge and closed candles cannot regress.
- This refinement is frontend-only; no market database or provider behavior was changed. The legacy `features.tsx` Market export is not routed by `main.tsx`; the live route is `market.tsx` and remains the sole rendered Market implementation.

### Explicit remaining limitations and contract gaps

- Deterministic local market data is available only through the explicit development-only `demo` Compose profile. Normal Compose startup uses `MARKET_DATA_PROVIDER=BINANCE`; the seed is not a startup dependency or frontend fallback.
- The public Market contract returns OHLCV and backend markers, but no MA/Bollinger/support-resistance overlay series. The frontend does not duplicate strategy rules; those reference overlays remain unavailable until the backend contract exposes them.
- The public News contract supports collection, normalization, persistence, and sentiment, but does not expose the reference image's LLM HTML extraction-template/version/self-healing controls. The UI reports the available pipeline and does not fabricate those controls.
- Strategy generation remains the authenticated deterministic `LOCAL_DETERMINISTIC` adapter; URL content is not fetched and no external LLM is called. Search currently exercises the required Random Search path; advanced generators remain optional per the assignment.
- The backend may omit SL/TP fields for trades, so the frontend displays `Unavailable` rather than inventing risk values. These limitations are backend/provider contract boundaries, not frontend demo fallbacks.

## Audit summary

The previous final-validation claim did not establish the assignment-required product flow. The reopened audit findings for the Backtesting queue and for `undefined as never` News/Sentiment composition have now been repaired in features 4 and 5. Feature 6 now also repairs the ADR-003 completion gap: workers persist terminal simulation data only; a fenced completion processor durably evaluates, stages the experiment, scores/admit Top-K entries, and advances Search. BullMQ terminal events, startup reconciliation, and a periodic watchdog recover lost notifications. Feature 8 has now passed the real Docker-backed migration and end-to-end gate.

## Completed historical milestones (not evidence of full completion)

| Commit | Historical milestone | Current assessment |
| --- | --- | --- |
| `97bd4f6` | Strategy plugin runtime | Reusable domain implementation exists; not yet connected to a complete product flow. |
| `cd091a6`, `37fd18b` | Market-data contracts and optional Binance adapter | Partial: no durable/live end-to-end composed flow. |
| `0d8f1f8`, `9d9645e` | Evaluation and simulator | Domain logic exists; public durable worker path is incomplete. |
| `8f8364c`, `06b93e5` | Leaderboard and Search runtimes | Internal test runtimes exist; required public APIs are `NOT_IMPLEMENTED`. |
| `502e7e2` | News/Sentiment runtime | Boundary logic exists; concrete durable collection pipeline remains incomplete. |
| `da4ca1c`, `3e5d913`, `36bee80` | Auth, user persistence, initial facade routes | Partial: routes do not expose backtest/search/leaderboard flow. |
| `126e718` | Reference-screen frontend | Demo-only local presentation; must be replaced with live API flows. |
| `40f7e59`, `4e8d686` | Strategy authoring and library persistence | PostgreSQL strategy library exists; is an input to, not completion of, the pipeline. |
| `d9e9eaa` | Previous completion documentation | Superseded by this honest reopened status. |
| `2070778` | Cross-platform npm developer workflow | Completed: npm lockfile/workspace workflow, root development/start scripts, Node-based backend launcher, and focused smoke checks. |
| `4518930` | Durable manual Backtesting runtime and API | Completed and validated: authenticated benchmark scope/manual-run/read routes, deterministic simulator execution, PostgreSQL repositories/migration for all records created by this slice, and ownership/idempotency/audit behavior. The worker/queue path remains explicitly incomplete. |
| `745dc18` | Deterministic Search and Leaderboard flow | Completed and validated: authenticated bounded Search lifecycle/Top-K routes, offline deterministic generation over saved strategy definitions, Backtesting/Evaluation scoring handoff, durable Search runs and Leaderboard entries, and persisted Backtesting candidate/experiment scores. |
| `d168167` | Durable Backtesting BullMQ worker and recovery | Completed and validated: PostgreSQL dispatch/fence migration, transactional candidate-plus-dispatch persistence, Redis/BullMQ dispatch with bounded exponential retry, worker consumption, database claim fencing, worker-side result/retry persistence, restart reconciliation of pending dispatches, and portable worker startup. |
| `f7fc06e` | Durable Market Data, News, and Sentiment flows | Completed and validated: migration `007`, PostgreSQL repositories for normalized candles/snapshots, news, analyses, and sentiment snapshots; offline demo News provider; deterministic `LOCAL_LEXICON` Sentiment adapter with model/version provenance; authenticated Market, News, and Sentiment REST routes. |
| `956b1c5` | Durable Backtesting completion, ranking, and Search advancement | Completed and validated: migration `008`; a durable fenced completion processor; BullMQ terminal listener plus periodic recovery; idempotent evaluation/experiment/Leaderboard admission; and callback/recovery-driven bounded Search advancement. |
| `0649bb5` | Backend REST and Market transport completion | Completed and validated: owner-scoped strategy-library/scope reads, complete market query mapping, manual cancellation, Search candidate history, experiment visualization/replay reads, required `/leaderboard?scopeId=` and `/leaderboard-scopes` surfaces, concealed cross-owner 404 mapping, and authenticated normalized Market WebSocket subscription control/update messages. |
| `21eafd2` | Docker-backed backend completion | Completed and validated: Compose migration gating, runtime launcher packaging for backend/worker images, healthy PostgreSQL/Redis/backend/worker/frontend services, successful migrations, and a real authenticated strategy → market snapshot → Redis/BullMQ backtest → worker → evaluation → leaderboard plus deterministic Search flow. |

## Latest validation

- `npm install`: passed from the repository root with npm 11.17.0; removed the obsolete `cross-env` dependency chain and refreshed the committed npm lockfile. npm reported its informational allow-scripts warning, but installation, compilation, and Vite all completed successfully.
- `npm run test:workflow`: passed — 2 Node launcher tests validate compiled-entry resolution, platform-delimited `NODE_PATH`, and the pre-build error.
- `npm run smoke:backend`: passed — compiled backend launched through the Node-based launcher and returned `GET /health` with `{ "status": "ok" }` on an isolated port.
- `npm run smoke:dev`: passed — the root development launcher built the backend, served its health endpoint, served the Vite frontend on an isolated port, and stopped both processes cleanly.
- `npm test`: passed — all workspace tests completed successfully (including the existing placeholder-oriented tests, which do not satisfy the reopened product requirements).
- `npm run build`: passed — all workspaces compiled and the frontend production bundle was generated.
- `npm run lint`: passed — all workspace TypeScript no-emit checks completed successfully.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 470 modules and 551 dependencies.
- Historical Feature 1 note: Docker-backed validation was intentionally deferred at that point; it was completed in Feature 8 below.
- `npm test --workspace=@cryptox/backtesting`: passed — 7 tests: deterministic simulator behavior plus manual scope/candidate/attempt/trade/result/replay flow and PostgreSQL persistence/rehydration coverage.
- `npm test --workspace=@cryptox/backend`: passed — 5 tests, including authenticated scope, manual backtest, attempt, and experiment transport mappings.
- `npm test`: passed — 43 tests across all workspaces.
- `npm run build`: passed — all workspaces compile and the frontend production bundle completes.
- `npm run lint`: passed — all workspace TypeScript no-emit checks complete.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 519 modules and 681 dependencies.
- `npm test --workspace=@cryptox/search`: passed — 5 tests, including deterministic generate → Backtesting → Evaluation → Top-K flow and PostgreSQL Search-run repository SQL coverage.
- `npm test --workspace=@cryptox/leaderboard`: passed — 4 tests, including formula scoring, Top-K admission, rank ordering, and PostgreSQL Leaderboard-entry SQL coverage.
- `npm test --workspace=@cryptox/backend`: passed — 6 tests, including authenticated Search lifecycle and scoped Leaderboard REST mappings plus an actual controller-driven search/backtest/evaluate/rank flow.
- `npm test`: passed — 50 tests across all workspaces.
- `npm run build`: passed — all workspaces compile and the frontend production bundle completes.
- `npm run lint`: passed — all workspace TypeScript no-emit checks complete.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 536 modules and 738 dependencies.
- `npm run smoke:backend`: passed — compiled Nest backend started, registered Search and Leaderboard routes, and passed `GET /health`.
- `npm install bullmq@^5.70.2 --workspace=@cryptox/backtesting`: passed — installed the Backtesting-owned BullMQ dependency and updated `package-lock.json`. npm reported two moderate audit findings and informational pending install-script approvals; no scripts were approved or run for this feature.
- `npm test --workspace=@cryptox/backtesting`: passed — 7 tests, including durable queued submission, retry state, fenced worker execution, duplicate-delivery no-op, and PostgreSQL queue-dispatch SQL coverage.
- `npm test --workspace=@cryptox/backtest-worker`: passed — 2 tests; the worker requires explicit PostgreSQL/Redis configuration and exposes only the Backtesting public worker runtime.
- `npm test --workspace=@cryptox/backend`: passed — 6 tests; authenticated manual transport now returns `QUEUED` and is completed only through the worker public operation.
- `npm test --workspace=@cryptox/search`: passed — 5 tests; Search now asserts queued lifecycle behavior instead of an inline Backtesting shortcut.
- `npm test`: passed — 51 tests across all workspaces.
- `npm run build`: passed — all workspaces compile and the frontend production bundle completes.
- `npm run lint`: passed — all workspace TypeScript no-emit checks complete.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 709 modules and 920 dependencies.
- `npm run smoke:backend`: passed — compiled backend started and passed `GET /health`; startup queue reconciliation is safe when Redis is not configured.
- `npm test --workspace=@cryptox/market-data`: passed — 8 tests, including PostgreSQL candle/snapshot SQL coverage.
- `npm test --workspace=@cryptox/news`: passed — 5 tests, including deterministic local-news collection and provider failure behavior.
- `npm test --workspace=@cryptox/sentiment`: passed — 4 tests, including model-versioned result and sealed-snapshot SQL persistence.
- `npm test --workspace=@cryptox/backend`: passed — 6 tests, including authenticated Market snapshot, News collect, and Sentiment transport mappings.
- `npm test`: passed — 55 tests across all workspaces.
- `npm run build`: passed — all workspaces compile and the frontend production bundle completes.
- `npm run lint`: passed — all workspace TypeScript no-emit checks complete.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 746 modules and 995 dependencies.
- `npm run smoke:backend`: passed — compiled Nest backend registered the Market snapshot, News collect, and Sentiment routes and passed `GET /health`.
- `npm test --workspace=@cryptox/backtesting`: passed — 8 tests, including terminal completion forwarding, duplicate terminal notification idempotency, fenced durable completion, and exhausted-retry finalization.
- `npm test --workspace=@cryptox/search`: passed — 5 tests, including queued generate → worker → completion → evaluate → rank → next-slot completion through public module APIs.
- `npm test --workspace=@cryptox/backend`: passed — 6 tests, including composed startup reconciliation support.
- `npm test --workspace=@cryptox/backtest-worker`: passed — 2 tests; worker composition remains constrained to public Backtesting and Strategy APIs.
- `npm test`: passed — 55 tests across all workspaces.
- `npm run build`: passed — all workspaces compile and the frontend production bundle completes.
- `npm run lint`: passed — all workspace TypeScript no-emit checks complete.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 753 modules and 1,012 dependencies.
- `npm run smoke:backend`: passed — compiled Nest backend registered all current authenticated transport routes, initialized the recovery runtime safely without Redis, and passed `GET /health`.
- `npm test --workspace=@cryptox/backend`: passed — 8 tests, including owner-scoped library/scope reads, manual cancellation, candidate history, visualization/replay, required leaderboard query transport, full market query mapping, and authenticated normalized Market WebSocket messages.
- `npm test --workspace=@cryptox/backtesting`: passed — 8 tests, including bounded Candidate projections, scope persistence, visualization/replay API compatibility, and existing worker/completion behavior.
- `npm test --workspace=@cryptox/strategy`: passed — 5 tests, including owner-scoped strategy/composite library persistence and runtime behavior.
- `npm install @nestjs/websockets@^10.4.15 @nestjs/platform-socket.io@^10.4.15 socket.io@^4.8.1 --workspace=@cryptox/backend`: passed — declared WebSocket transport dependencies and refreshed `package-lock.json`; npm reported 10 audit findings and pending install-script notices, with no scripts approved.
- `npm test`: passed — 58 tests across all workspaces.
- `npm run build`: passed — all workspaces compile and the frontend production bundle completes.
- `npm run lint`: passed — all workspace TypeScript no-emit checks complete.
- `npm run arch:check`: passed — dependency-cruiser reported no violations across 757 modules and 1,033 dependencies.
- `npm run smoke:backend`: passed — compiled Nest backend registered `/leaderboard-scopes`, `/backtests/:candidateId/cancel`, `/search-runs/:searchRunId/candidates`, `/experiments/:experimentId/visualization`, `/experiments/:experimentId/replay`, `/leaderboard`, and the MarketGateway subscription handler; `GET /health` passed.
- Feature 8 local validation: `npm test` passed — 58 tests across all workspaces; `npm run build` passed; `npm run lint` passed; `npm run arch:check` passed with no violations across 757 modules and 1,033 dependencies; `npm run smoke:backend` passed with the full authenticated route inventory; `git diff --check` passed.
- Compose migration wiring: `infra/docker-compose.yml` now runs a one-shot `migrate` service and gates backend/worker startup on `service_completed_successfully`; `infra/docker/backend.Dockerfile` includes `infra/db/migrations` for the migration image.
- `docker --version`: passed — Docker Desktop 29.7.2; `docker compose version`: passed — Compose v5.4.0.
- `docker compose -f infra/docker-compose.yml config --quiet`: passed.
- `docker compose -f infra/docker-compose.yml up --build -d`: passed after adding the repository `scripts/` directory to both runtime images. PostgreSQL and Redis became healthy; the migration service exited 0; backend and backtest-worker became healthy; frontend became healthy. The first build exposed `MODULE_NOT_FOUND: /app/scripts/start-backend.mjs` and `/app/scripts/start-worker.mjs`, which was fixed within this feature before the successful rerun.
- Docker-backed E2E: passed against the live REST/Redis/PostgreSQL stack. Registered/logged in a user; created and persisted an MA definition and weighted composite; read 12 normalized PostgreSQL candles; created a durable snapshot/scope; submitted a `202 QUEUED` manual backtest; observed the BullMQ worker complete it; retrieved completed attempt, 2 trades, experiment, and leaderboard entry; replay returned `MATCH`; started deterministic Search with one candidate and observed `COMPLETED`, one candidate, and one Search leaderboard entry.
- Docker-backed durable row check: passed with 1 user, 1 strategy definition, 1 composite, 12 market candles, 1 market snapshot, 1 scope, 2 candidates, 2 queue dispatches, 2 attempts, 4 trades, 2 experiments, 1 search run, and 2 leaderboard entries. Redis was reachable and the worker log reported `backtest worker ready`.
- Final validation rerun (2026-08-25): `npm test` passed — 63 tests across all workspaces; `npm run build` passed; `npm run lint` passed; `npm run arch:check` passed with no violations across 761 modules and 1,044 dependencies; and `git diff --check` passed.
- Development Market seed validation (2026-08-25): focused seed tests and the full `npm test` passed (71 tests including seed coverage); `npm run build`, `npm run lint`, `npm run arch:check`, migration, Compose startup, repeat seed, PostgreSQL row counts, and fresh-user browser Market verification all passed. The seed remains development-only and explicitly provenance-marked.

## Current decisions and assumptions

- The PDF is authoritative; the Markdown companion and supplied images guide searchable details and visual acceptance respectively.
- npm is the supported developer package manager because the root declares npm workspaces and the user explicitly requires `npm install` from the repository root. `package-lock.json` is the committed lockfile.
- `ts-node` is not declared and will not be relied on. Shell-specific environment assignment is not an acceptable backend start mechanism.
- The root `npm run dev` script builds the backend once, starts it through a Node-based launcher, and starts the frontend’s declared Vite workspace dependency. Backend TypeScript changes require restarting that command; Vite continues to provide frontend development serving.
- The backend launcher sets `NODE_PATH` programmatically for its compiled child process using the operating system’s path delimiter. This keeps module-alias resolution portable across Windows, macOS, and Linux without relying on shell syntax.
- Existing code/tests that assert `NOT_IMPLEMENTED` are treated as placeholders to replace when their required feature is implemented, not as completion evidence.
- Manual submissions are durably queued in PostgreSQL and Redis/BullMQ completes them through the backtest-worker. The worker persists terminal simulation data, after which the fenced completion processor evaluates, stages the experiment, scores/admits leaderboard entries, and advances Search.
- Backtesting copies the sealed market dataset snapshot and its candles into Backtesting-owned persistence before executing. This preserves module boundaries (the source is read only through Market Data's public API) while making the replay input durable.
- Search defaults to a deterministic, offline `RANDOM` generator. It cycles sorted owner-visible strategy definitions into immutable composite candidates, so core Search functionality does not depend on LLM credentials or network access.
- Search owns durable run lifecycle state in `search_runs`; Backtesting continues to own candidate and experiment persistence, including the score written after Leaderboard evaluates the saved metrics. Leaderboard owns durable Top-K entries in `leaderboard_entries` and reads Backtesting records only through its public API adapters.
- Queue dispatch uses `jobId = candidateId`. A `backtest_queue_dispatches` row and `QUEUED` Candidate are committed in the same PostgreSQL transaction before BullMQ publication. If publication fails or the process dies before acknowledgement, backend and worker startup reconciliation re-enqueue the durable pending record using the same job ID.
- BullMQ uses the Candidate's bounded `maxAttempts` and a one-second exponential backoff. Each delivery takes a PostgreSQL fence/lease; late or duplicate deliveries cannot persist trades, experiments, or a candidate transition after the active fence has changed. Worker failures persist `RETRY_WAIT` or `TERMINAL_FAILURE_PENDING` before they are rethrown to BullMQ.
- The worker app imports only Backtesting and Strategy public APIs. Its Backtesting runtime processes persisted Backtesting snapshots and strategy definitions; it does not call scope creation or configure provider adapters. Backend composition owns the live Binance provider while preserving that worker boundary.
- Market Data, News, and Sentiment now compose concrete PostgreSQL repositories whenever `DATABASE_URL` is configured. With no configured News provider, News uses the explicit local `LOCAL_DEMO` provider; requesting an unsupported configured provider raises an explicit provider error rather than reporting a false success. Sentiment uses deterministic `LOCAL_LEXICON` version `1.0.0` with a stable model fingerprint, so core flows do not require LLM credentials.
- `MVP_MANUAL_V1` is the shared default score-formula identity for benchmark scopes and the deterministic Leaderboard formula, preventing an unscorable default scope.
- Workers only persist attempt/trade simulation outcomes and move a candidate to `PROCESSING_RESULT`. A completion claim with a database lease/fencing token then performs evaluation, immutable experiment staging, Leaderboard scoring/admission, final candidate state, and finally the best-effort Search callback. This ordering makes duplicate terminal signals and restarts safe.
- Queue events are advisory. `BullMqBacktestCompletionListener` verifies terminal job state before forwarding, while startup plus a one-second unref'd reconciliation watchdog repair missed QueueEvents and process due completion retries. Completion retries are capped at five claims with a deterministic one-second delay.
- Docker Compose uses the backend image for a one-shot migration service. PostgreSQL readiness is required before migrations, and backend/worker services require successful migration completion before starting, so container startup cannot race the schema application step.
- Search advancement is owned by Search: the Backtesting completion processor only invokes its public candidate-finished callback after durable finalization. Search startup/periodic reconciliation fills any unfinished active run, so an unavailable callback cannot permanently consume a bounded slot.
- Backend transport remains an adapter: controllers authenticate with Auth, validate transport primitives, and call module public APIs; they do not read PostgreSQL/Redis or calculate domain results. Candidate projections explicitly strip owner, strategy, composite, queue, and fence internals.
- Docker runtime images copy the repository `scripts/` directory because the npm workspace start scripts invoke cross-platform Node launchers from `/app/scripts`. Compose applies migrations as a successful one-shot dependency before backend and worker startup.
- The required persistent scope surface is `/leaderboard-scopes` (the earlier `/backtest-scopes` path remains an alias), and the required board read is `/leaderboard?scopeId=...` (the earlier path-style aliases remain for compatibility). Manual submission returns `202` and uses `5` bps when slippage is omitted.
- Market WebSocket messages use the repository's versioned `@cryptox/contracts/websocket/market-data` shape on the `/market` namespace and `market` event. The gateway authenticates the bearer token during connection, forwards only normalized tick/candle/status updates, and sends correlated subscription acknowledgements/errors.
- The repository’s OpenSpec apply skill was consulted, but the `openspec` CLI is not installed in this checkout. The durable plan/status documents remain the continuation record until that tooling is available.

## Reference-guided frontend continuation (2026-08-25)

The four newly supplied reference images were used as flexible visual guidance for Strategy, Backtest, Discovery, and News hierarchy, spacing, workflow labeling, and responsive card layout. Illustrative values, LLM extraction controls, and unavailable overlays were not copied into runtime state.

- Protected content now waits for `GET /auth/me` during refresh. Invalid restored tokens are cleared and return to sign-in; no fake authenticated shell is rendered.
- Settings now shows the verified user identity and live `GET /market/pairs` provider capabilities without hard-coded “backend connected” claims or secrets.
- Backtest submission accepts either one persisted strategy definition or one persisted composite, retains worker lifecycle states, and continues to render backend-owned metrics/trades/replay/visualization.
- Search and Leaderboard ranking rows now expose an Inspect action that loads the returned sealed experiment visualization and markers when an experiment identifier is available.
- `docs/REQUIREMENTS_MAP.md` contains a follow-up checklist covering these acceptance points and final validation evidence.

Validation evidence:

- Focused frontend tests: 22 passed. Full `npm test`: 94 tests passed across workspaces, including 4 seed tests.
- `npm run build`, `npm run lint`, `npm run arch:check`, and `git diff --check` passed. Architecture check: 781 modules / 1,088 dependencies, no violations.
- `docker compose -f infra/docker-compose.yml up --build -d` passed. PostgreSQL, Redis, backend, worker, and frontend were healthy; published endpoints were `http://localhost:3000` and `http://localhost:5173`.
- Fresh synthetic REST smoke passed: registration `201`, login, `/auth/me`, provider `BINANCE`, 7 pairs, 6 timeframes, and authenticated `/news` with 2 records.
- Validation was performed at existing HEAD `b4912c4`; no new commit was created so the pre-existing staged Market/user changes remain untouched.
- Browser-level E2E was attempted but not completed because the in-app browser runtime exited during initialization under the managed Windows ACL sandbox. No browser pass is claimed from this session.

## Unresolved decisions and blockers

- The npm install emitted 10 audit findings (8 moderate, 2 high) and pending install-script notices; these do not block compilation/tests but remain operational limitations to review.
- The local Codex runtime exposes Node but not `npm` on `PATH`; a system npm executable was located at `C:\Program Files\nodejs\npm.cmd` for validation. The repository commands themselves must remain normal `npm ...` commands for developers.

## Frontend completion audit and Compose evidence (2026-08-26)

The remaining non-Market frontend continuation was audited against the assignment, the public REST/WebSocket contracts, the frontend specification, and the current implementation. A contract gap found during that audit was corrected narrowly: `POST /backtests` now accepts one authenticated persisted strategy definition without requiring a separately persisted composite, while still requiring an explicit persisted composite for multi-definition submissions. The frontend now sends the optional composite ID, exposes manual cancellation, renders `QUEUED`, `BACKTESTING`, `RETRY_WAIT`, `PROCESSING_RESULT`, `COMPLETED`, `FAILED`, and `CANCELLED` outcomes, styles replay mismatches as errors, derives Search progress from the backend stop condition, shows the Generate → Backtest → Evaluate → Rank → Leaderboard pipeline, exposes News refresh, and displays weighted-composite totals before backend validation.

Validation evidence:

- Focused frontend validation: 23 tests passed; frontend production build passed.
- Focused backend validation: 10 controller/composition tests passed; backend TypeScript build passed, including the single-strategy backtest route regression.
- Full `npm test`: 96 tests passed (4 deterministic seed tests plus all workspace suites).
- `npm run build`, `npm run lint`, `npm run arch:check`, and `git diff --check` passed. Architecture check: 781 modules / 1,088 dependencies with no violations.
- Docker Desktop was started because its daemon was initially stopped. `docker compose -f infra/docker-compose.yml up --build -d` passed. PostgreSQL, Redis, backend, backtest-worker, and frontend were healthy; published endpoints were `http://localhost:3000` and `http://localhost:5173`.
- Authenticated Compose REST flow passed with a fresh account: register/login/me; descriptor-driven MA definition `strategy-definition-17885a49-0999-4939-ba94-1adcdedae901`; weighted composite `composite-strategy-20233673-d9bf-4b2d-b4b4-806366c7dc61`; live Binance BTCUSDT `1m` history with 120 candles; scope `03d7465a-f268-4591-8049-f40c4cd038e9`; queued candidate `42488511-c3d3-4314-9200-8fac5cae1393` completed with one attempt; experiment `443970e4-8c38-4488-89d2-85db2354dd93` returned 2 trades, 120 visualization candles, 3 markers, and replay `MATCH`; Search run `f09ebb75-bde4-4ee5-bc7c-adcad86e6dec` completed with one candidate and one ranking; the scope leaderboard returned 2 entries; News returned 2 records with 2 persisted sentiment rows; `/auth/me` re-verification passed.
- Browser-level E2E was attempted twice against `http://localhost:5173/` using the required in-app browser runtime. The runtime exited during initialization with the managed Windows ACL error `apply deny-read ACLs`, before a browser tab could be created. No browser UI pass is claimed; the Compose/API evidence above is the stronger available runtime evidence.

External-provider limitations remain explicit: strategy Prompt/URL generation uses the backend's `LOCAL_DETERMINISTIC` adapter (`1.0.0`), validates URLs but does not fetch remote content or call an external LLM; News uses the configured local provider when no external provider is configured; Binance history/realtime remains provider/network dependent. No frontend fallback fabricates strategy, candle, backtest, ranking, or sentiment state.

Commit evidence: current branch HEAD remains `b4912c4` (`feat(frontend): complete live realtime market integration`). No new commit was created in this continuation because the worktree already contained pre-existing staged and unstaged user changes; the continuation changes remain visible in the worktree and unrelated changes were preserved.

## Follow-up UI audit (2026-08-26)

- Added shared visible `:focus-visible` treatment for buttons, inputs, textareas, and selects, plus a responsive fallback for non-Market headings, toolbars, news, settings, search summaries, backtest fields, lifecycle rows, and pipeline steps at narrow widths.
- Focused frontend validation after the UI audit: 23 tests passed and the frontend production build passed.
- Browser verification was retried against the healthy Compose frontend; the managed browser runtime again exited before tab creation with `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`. Browser-level E2E remains unverified and is not claimed.

## Resumed frontend acceptance fixes (2026-08-26)

- Fixed session-expiry propagation: a backend 401 clears the persisted token and the application shell returns to sign-in through a session subscription.
- Experiment Detail now requests backend cursor pages with Previous/Next controls, preserves truthful loading/end-of-history states, and surfaces transient `TERMINAL_FAILURE_PENDING` as failure finalization in the manual backtest lifecycle.
- Added accessible live regions for loading, backend errors, and lifecycle updates, plus visible focus states and narrow responsive fallbacks for non-Market screens.
- Focused frontend validation after these fixes: 25 tests passed; the frontend production build passed.
- Browser-level E2E remains unverified because the managed browser runtime exits before tab creation with `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`; no visual-runtime pass is claimed.

## Final validation rerun after resumed frontend fixes (2026-08-26)

- Full `npm test`: 98 tests passed across all workspaces. `npm run build`, `npm run lint`, `npm run arch:check`, and `git diff --check` also passed; architecture remained 781 modules / 1,088 dependencies with no violations.
- `docker compose -f infra/docker-compose.yml up --build -d` and `docker compose -f infra/docker-compose.yml config --quiet` passed. PostgreSQL, Redis, backend, backtest-worker, and frontend were healthy at `http://localhost:3000` and `http://localhost:5173`.
- Fresh authenticated REST E2E against that rebuilt Compose stack passed: account `frontend-resumed-1787718719195@example.com`, user `aa5ddc47-d7be-4a85-bf3b-1aef8dc6a792`; four strategy descriptors; persisted MA/RSI definitions; weighted composite `composite-strategy-97887301-1843-42d7-9f16-d409f4d3c028`; `LOCAL_DETERMINISTIC` generation; 120 live Binance candles; input snapshot `05a0b0e7-6ddc-4947-b7b7-924c7709dc58`; scope `f8d21fb5-92bb-450f-9b1d-21f34ffde601`; `202 QUEUED` candidate `f5e28b33-8f91-450c-805c-23128faf1eea` completed; experiment `e83463c7-2ca0-401c-8155-3e1b6878dc03` returned 16 trades, 120 visualization candles, 31 backend markers, cursor page 2, and replay `MATCH`; the scope leaderboard returned 1 entry; Search run `b2d23cee-6bad-46f4-8b57-c2b9ed42ddfa` reached `COMPLETED` with 1 candidate and 1 ranking entry; News returned 2 records and both sentiment lookups were present; `/auth/me` re-verification passed.
- The browser-level sequence remains unverified. The required in-app browser runtime was retried after the rebuild but exited before creating a tab with `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`; no visual-runtime pass is claimed.
- External limitations remain explicit: generation is the backend `LOCAL_DETERMINISTIC` adapter (no remote URL fetch or external LLM), News/Sentiment use the configured local provider/model when no external provider is configured, and live Binance history/realtime remain provider/network dependent. No frontend state is fabricated for these limitations.
- Commit evidence is unchanged: current HEAD remains `b4912c4` (`feat(frontend): complete live realtime market integration`); no new commit was created so existing staged Market/user changes and unrelated worktree changes remain preserved.
