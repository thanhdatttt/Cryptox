# Crypto Strategy Lab Requirements Baseline

## Authority, classification, and status

The highest-authority sources are the protected instructor assignment **“Crypto Strategy Lab – Đồ án cuối kỳ”**, 54 pages, at `docs/assignment/Crypto Strategy Lab – Đồ án cuối kỳ.pdf`, and explicit later instructor requirement changes supplied and approved by the project owner. The PDF's verified SHA-256 is `A7D877F4614AE4E78BBEFB3F271BF2022B50AFD5CB6C9CB0CAA16EF80845771B`; provenance is recorded in `docs/assignment/README.md`. The Authentication, per-user ownership, and real-data requirements below were approved on 2026-08-28 after C-01 had correctly frozen contracts against the earlier baseline. This baseline interprets normative wording as follows:

- **REQUIRED**: explicit minimum/MVP, “phải”, “bắt buộc”, “cần”, or prohibition.
- **SUGGESTED**: “nên”, “có thể”, “gợi ý/đề xuất”, and illustrative designs.
- **OPTIONAL-DEFERRED**: explicit extension/non-mandatory content or scope deferred by the approved architecture baseline.

Examples do not become requirements unless the assignment explicitly makes the behavior mandatory. Current repository inspection shows module/API scaffolding with widespread `NOT_IMPLEMENTED` paths and a placeholder frontend; therefore no product capability below is marked implemented. Statuses are:

- **SCAFFOLDED**: a boundary/type/test skeleton exists, but behavior is not implemented.
- **NOT IMPLEMENTED**: no working behavior was verified.
- **UNVERIFIED**: evidence is insufficient to claim implementation.
- **DEFERRED**: intentionally outside the active MVP.

Acceptance categories: **UNIT** domain behavior; **CONTRACT** public/adapter compatibility; **INTEGRATION** collaborating modules or providers; **E2E** user-visible flow; **RESILIENCE** recovery/isolation; **ARCH** dependency/extensibility; **REPRO** deterministic provenance; **OBS** operational visibility.

## Required baseline

| ID | Requirement | Assignment source | Target capability spec | Acceptance/test category | Current status |
|---|---|---|---|---|---|
| CSL-R-AU-01 | Support simple email/password registration, login, current authenticated-user lookup, fixed session expiry, and logout. Private user capabilities must derive identity from trusted authenticated server request context and reject unauthenticated access. | Later instructor change approved 2026-08-28 | `auth` (`openspec/specs/auth/spec.md`), `frontend` | CONTRACT, INTEGRATION, E2E, RESILIENCE, OBS | NOT IMPLEMENTED; C-01A contract extension required |
| CSL-R-OW-01 | Isolate Strategy Definitions, Composite Definitions, Search Runs, Backtest Candidates/Experiments, and Leaderboard scopes/results by authenticated user. A user must not read, mutate, submit, or rank another user's private resources through guessed identifiers or client-supplied identity fields. | Later instructor change approved 2026-08-28 | `auth`, `strategy`, `search`, `backtesting`, `leaderboard`, `frontend` | CONTRACT, INTEGRATION, E2E, ARCH, REPRO | NOT IMPLEMENTED; C-01A contract extension required |
| CSL-R-RD-01 | The delivered runtime and instructor demo must use real configured Binance historical/realtime integrations, a real configured News source, real persisted application data, and real registration/login. Mocks, fixtures, and fakes may support development and deterministic/resilience testing but must not silently become final/demo runtime data sources. | Later instructor change approved 2026-08-28 | `market-data`, `news`, `auth`, `frontend`, runtime integration | CONTRACT, INTEGRATION, E2E, REPRO | NOT IMPLEMENTED; final/demo acceptance gate required |
| CSL-R-MD-01 | Acquire Binance historical candlestick data for backtesting and analysis through a provider-neutral boundary; raw Binance shapes must not reach the frontend. | §4, pp. 4–6; MVP §37, p. 40 | `market-data` (`openspec/specs/market-data/spec.md`) | CONTRACT, INTEGRATION, ARCH | SCAFFOLDED; provider behavior not implemented |
| CSL-R-MD-02 | Deliver realtime market updates without repeated price polling, using a narrow market WebSocket; recover from disconnects and reconcile missing candles. | §§4, 32.3–32.4, 40.7; pp. 5–6, 33–34, 44 | `market-data`, `frontend` | CONTRACT, E2E, RESILIENCE | NOT IMPLEMENTED |
| CSL-R-FE-01 | Display candlestick charts for up to four independently configurable timeframes; changing one chart changes only that chart's data. | §5, pp. 6–8; MVP §37, p. 40 | `frontend` (`openspec/specs/frontend/spec.md`), `market-data` | E2E, CONTRACT | NOT IMPLEMENTED; placeholder UI only |
| CSL-R-ST-01 | Provide a pure Strategy abstraction and registration/registry extension seam with at least MA, RSI, Bollinger Bands, and Support/Resistance. Strategy logic must not perform exchange, database, rendering, or notification I/O. | §§6–12, pp. 8–13; MVP §37, p. 40 | `strategy` (`openspec/specs/strategy/spec.md`) | UNIT, ARCH, CONTRACT | SCAFFOLDED; runtime methods not implemented |
| CSL-R-ST-02 | Add a new strategy such as MACD through localized implementation/registration changes without redesigning Backtester, Evaluator, Leaderboard, or frontend core. | §§11–12, 40.1, 41; pp. 12–13, 43–45 | `strategy` | ARCH, CONTRACT, UNIT | UNVERIFIED |
| CSL-R-ST-03 | Create composite strategies and resolve conflicting component signals through a documented combination policy. | §§13–14, pp. 13–16; MVP §37, p. 40 | `strategy` | UNIT, E2E | SCAFFOLDED; behavior not implemented |
| CSL-R-ST-04 | Version strategy definitions without overwriting old results so each experiment identifies the exact strategy/version used. | §36 and §40.8, pp. 39–40, 45 | `strategy`, `backtesting` | REPRO, INTEGRATION | SCAFFOLDED; persistence/replay unverified |
| CSL-R-SE-01 | Expose a stable strategy-generator abstraction, implement Random Search for MVP, and keep future generators replaceable without redesigning Backtester, Evaluator, Leaderboard, or Visualization. | §§15–17, 32.6, 40.2, 42; pp. 16–19, 34, 44–46; MVP §37, p. 41 | `search` (`openspec/specs/search/spec.md`) | UNIT, CONTRACT, ARCH | SCAFFOLDED; generator behavior not implemented |
| CSL-R-SE-02 | Run search with explicit finite stop conditions and bounded execution; an uncontrolled infinite loop is prohibited. | §23, pp. 23–25 | `search` | UNIT, INTEGRATION, OBS | SCAFFOLDED; loop not implemented |
| CSL-R-BT-01 | Simulate trades deterministically over historical data through a stable backtest execution abstraction. MVP execution is a bounded local executor; callers must remain independent of a future distributed adapter. | §19, p. 20; §§24, 43, pp. 25–26, 46–47; MVP §37, p. 41 | `backtesting` (`openspec/specs/backtesting/spec.md`) | UNIT, CONTRACT, INTEGRATION, ARCH | SCAFFOLDED; execution not implemented |
| CSL-R-EV-01 | Evaluate independently of Strategy implementation and provide at minimum Return, Win Rate, Maximum Drawdown, and Number of Trades. | §20, pp. 20–21; MVP §37, pp. 40–41 | `evaluation` (`openspec/specs/evaluation/spec.md`) | UNIT, CONTRACT | SCAFFOLDED; calculations not implemented |
| CSL-R-LB-01 | Maintain a configurable user-specific Top-K leaderboard from that authenticated user's evaluated backtests. K=10 may be a UI/default value, not an architectural invariant; any overall score must be explained and reproducible. | §§21–22, pp. 21–23; MVP §37, p. 41; later instructor ownership change | `leaderboard` (`openspec/specs/leaderboard/spec.md`) | UNIT, INTEGRATION, E2E, REPRO | SCAFFOLDED; ownership and implementation not present |
| CSL-R-VIS-01 | Visualize candlesticks plus Buy/Sell and Entry/Exit markers for a selected strategy; support relevant selected-strategy overlays. | §§25–26, pp. 26–27; MVP §37, p. 41 | `frontend`, `strategy`, `backtesting` | E2E, CONTRACT | NOT IMPLEMENTED |
| CSL-R-NW-01 | Collect, normalize, store, and query news through replaceable provider adapters, with a real configured source in the delivered runtime/demo. The normalized record covers identity, title/content, source, publication/crawl times, related coins, and URL. | §§27–28, pp. 27–29; MVP §37, p. 41; later instructor real-data change | `news` (`openspec/specs/news/spec.md`) | CONTRACT, INTEGRATION, E2E | SCAFFOLDED; collection/storage not implemented |
| CSL-R-SN-01 | Analyze and store POSITIVE/NEUTRAL/NEGATIVE sentiment with a score behind a replaceable Sentiment boundary, separate from News collection. A sentiment failure must not stop charts or core strategy/backtest flows. | §§29–30, pp. 29–31; §40.5–40.6, p. 44; MVP §37, p. 41 | `sentiment` (`openspec/specs/sentiment/spec.md`), `news` | UNIT, CONTRACT, INTEGRATION, RESILIENCE | SCAFFOLDED; inference/storage not implemented |
| CSL-R-RP-01 | Preserve practical experiment provenance: strategy definition/type/version/normalized parameters, pair, timeframe, historical range, dataset identity/version where practical, code version/commit where practical, results, trades, and ranking configuration when relevant. | §§35–36, pp. 38–40; §40.8, p. 45 | `backtesting`, `strategy`, `market-data`, `evaluation`, `leaderboard` | REPRO, INTEGRATION | SCAFFOLDED; end-to-end traceability unverified |
| CSL-R-AR-01 | Satisfy the explicit architectural drivers: modifiability, scalability, realtime latency, reliability, performance, maintainability, and observability. | §32, pp. 32–35 | All active capabilities; `docs/architecture.md` | ARCH, RESILIENCE, OBS | DOCUMENTATION ALIGNED; implementation unverified |
| CSL-R-AR-02 | Defend the architecture against all eight assignment change scenarios: localized MACD addition, replaceable search, replaceable exchange, scale evolution, News-failure containment, sentiment-model independence, WebSocket recovery, and exact strategy-version traceability. | §40, pp. 43–45 | All active capabilities; `docs/architecture.md` | ARCH, CONTRACT, RESILIENCE | DOCUMENTATION ALIGNED; implementation unverified |
| CSL-R-AR-03 | Prohibit the assignment anti-patterns: a God Service, hard-coded strategy branching, frontend business logic, direct strategy database access, and direct crawler-to-model coupling. | §44, pp. 47–48 | All active capabilities; `docs/architecture.md` | ARCH | DOCUMENTATION ALIGNED; implementation unverified |
| CSL-R-OB-01 | Expose at least search running/stopped state, candidate count, failures, processing timing, current leaderboard state, and major provider failures. | §32.7, pp. 34–35 | `search`, `backtesting`, `leaderboard`, `market-data`, `news`, `sentiment` | OBS, INTEGRATION | NOT IMPLEMENTED |
| CSL-R-DL-01 | Deliver a complete repository; README with Install/Run/Architecture/Demo; architecture document with context, decomposition, responsibilities and key flows; architectural decisions; and a minimum demo whose required external integrations cannot silently select mock providers. | §45, pp. 49–50; later instructor real-data change | Repository documentation, `frontend`, and all active capabilities | ARCH, E2E | DOCUMENTATION REFINED; source implementation and demo incomplete |
| CSL-R-DM-01 | Minimum demo covers real registration/login, authenticated per-user isolation, realtime chart, multi-timeframe behavior, strategy add/select, combination generation, backtest, user-specific leaderboard, trade visualization, real-source news, and sentiment. | §45, p. 50; later instructor Auth/ownership/real-data change | `frontend` plus all active capabilities | E2E | NOT IMPLEMENTED |

## Suggested behavior and design guidance

| ID | Guidance | Assignment source | Disposition |
|---|---|---|---|
| CSL-S-01 | Composite policies may use majority vote or weighted scoring with thresholds. | §§13–14, pp. 14–16 | Candidate policies; choose and test explicitly. |
| CSL-S-02 | Evaluation may additionally expose Profit/Loss, Profit Factor, and Sharpe Ratio and allow sorting by several metrics. | §§20–21, pp. 20–22 | Useful after the four required metrics. |
| CSL-S-03 | Domain-guided search may combine strategy categories such as Trend, Momentum, Structure, and Information; explain how domain knowledge constrains generation. | §17, pp. 18–19 | Future generator behind the required abstraction. |
| CSL-S-04 | A queue/worker topology illustrates future scale, retry, pause/resume, and algorithm replacement. | §24 and §43, pp. 25–26, 46–47 | Evolution path only; MVP uses bounded local execution. |
| CSL-S-05 | Assignment event names illustrate decoupling, but do not require a general event bus. | §34, p. 37 | Keep synchronous module calls; use only justified narrow asynchronous/realtime boundaries. |
| CSL-S-06 | Additional chart overlays, trade-detail table/highlighting, configurable sorting, and the ten-step demo sequence improve explainability. | §§25–26, 46, pp. 26–27, 50–53 | Presentation enhancement after minimum visualization. |

## Optional and project-deferred scope

| ID | Optional/deferred capability | Assignment source or project decision | MVP disposition |
|---|---|---|---|
| CSL-O-01 | Full SMC and Wyckoff implementations. | §11, p. 12: explicitly not required | DEFERRED; architecture must merely permit later plugins. |
| CSL-O-02 | Genetic, evolutionary, Bayesian, reinforcement-learning, LLM-generated, agent-based, or AlphaEvolve-style search. | §18, p. 19; §38, pp. 41–42 | DEFERRED; Random Search is MVP. |
| CSL-O-03 | Long/Short, Stop Loss, Take Profit, Trailing Stop, Position Sizing, and broader risk-policy systems. | §38, p. 42 | DEFERRED. |
| CSL-O-04 | Multiple coins and multiple exchanges. | §38, p. 42 | DEFERRED; keep provider boundary replaceable. |
| CSL-O-05 | Price prediction, market-regime detection, advanced sentiment models, and sentiment as a search strategy. | §§30, 38, pp. 30–31, 42 | DEFERRED beyond the required sentiment pipeline. |
| CSL-O-06 | Redis/BullMQ, worker pools, microservices, Kafka/RabbitMQ, CQRS, Event Sourcing, leases, fencing, watchdogs, and distributed reconciliation/retry protocols. | §38, pp. 42–43 plus approved Stage 2 decision | DEFERRED; not mandatory MVP infrastructure. Preserve historical ADR rationale. |
| CSL-O-07 | RBAC, organization/team models, tenant/workspace hierarchy, OAuth, SSO, 2FA, email verification, password reset, external identity providers, enterprise IAM, AI/LLM strategy authoring, and mandatory LLM news crawling. | Approved project scope after the 2026-08-28 instructor change | DEFERRED; simple Auth and approved per-user ownership are active, but these broader identity/product capabilities remain outside MVP. |

## Authentication, ownership, and real-data interpretation

- Auth V1 is local email/password authentication using a PostgreSQL-backed opaque server-side session in an HttpOnly cookie. JWT and refresh-token infrastructure are not MVP requirements.
- Direct user-owned roots are StrategyDefinition, CompositeDefinition, SearchRun, Candidate, and LeaderboardScope. CompositeComponent, Experiment, Trade, EvaluationResult, and LeaderboardEntry inherit ownership from the stated parent/root relationship.
- Candle, Market Dataset/provenance, NewsItem, SentimentResult, RankingConfiguration, and Strategy plugin descriptors remain shared system data.
- Client `userId` or `ownerUserId` fields are never authorization evidence. Unauthenticated private access returns 401; an authenticated cross-user private-resource lookup returns 404; collections are owner-filtered before pagination/counting.
- Test/dev fakes remain valid evidence for deterministic behavior and failure handling. Final/demo acceptance separately proves real Binance history/realtime, a real configured News source, PostgreSQL-backed application/Auth state, and application-generated Backtest/Leaderboard results.
- Strategy analysis, Backtest simulation, Evaluation, Leaderboard scoring, and `LEXICON_V1` Sentiment remain local computations over approved inputs; real input data does not require external calculation APIs.

## Required architecture defenses and change acceptance

Requirement `CSL-R-AR-02` requires the architecture report/demo to answer the eight questions in §40 (pp. 43–45): localized MACD addition; replacement of Random with Genetic Search without Backtester redesign; addition of OKX without frontend change; evolution from 100 to 100,000 backtests; chart survival during News failure; Strategy independence from sentiment-model replacement; Binance WebSocket recovery; and exact strategy-version traceability for leaderboard results.

The concrete assessment scenarios in §§41–43 (pp. 45–47) are acceptance drivers:

1. Add MACD through the Strategy abstraction/registry and show only localized changes.
2. Add `DomainGuidedStrategyGenerator` behind the generator contract while downstream consumers continue to receive the same candidate form.
3. Explain and preserve an adapter-based evolution from bounded local execution to a queue/multiple workers without redesigning Search, Backtester, Evaluator, or Leaderboard.

## Explicit prohibitions

Requirement `CSL-R-AR-03`, from §44 (pp. 47–48), prohibits a God Service, hard-coded strategy identity/combination branches, frontend trading/backtest/ranking logic, direct database access from strategies, and direct coupling between a news crawler and a concrete sentiment model. Also prohibited are direct frontend dependence on Binance (§4, p. 6), an uncontrolled infinite search loop (§23, pp. 24–25), and overwriting versioned historical strategy results (§36, pp. 39–40).

## Traceability maintenance

Capability specs must reference these IDs and contain concise acceptance scenarios rather than copied TypeScript interfaces. Tests should name the relevant requirement ID where practical. Status may move to **IMPLEMENTED** only with passing acceptance evidence; unavailable tooling yields **BLOCKED** or **UNVERIFIED**, never **PASS**. Any mismatch between this approved baseline and executable contracts must be handled through an explicitly approved source-reconciliation or implementation change and must not be repaired implicitly as part of an unrelated task.
