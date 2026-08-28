# Requirements Map

The assignment PDF is the authority. The Markdown companion is used for searchable wording; the supplied images are used for visual acceptance. References below name the original source files.

| ID | Testable requirement | Source reference | Planned verification |
|---|---|---|---|
| R-01 | Obtain historical and realtime crypto market data through a provider-neutral adapter; browser clients never consume raw Binance payloads. | PDF §4; `realtime.jpg` | Adapter, normalized envelope, boundary tests |
| R-02 | Show up to four independent candle charts; changing one timeframe does not reload or overwrite the others. | PDF §5; `realtime.jpg` | State/merge tests; frontend interaction test |
| R-03 | Render candlesticks, volume, signal state, MA/support/resistance context, and backtest entry/exit/risk/trade-detail presentation. Bollinger and other overlays remain generic plugin projections rather than frontend-side calculations. | PDF §§5,25-26; `realtime.jpg`, `backtest.jpg` | Simulator/indicator tests; chart-view build and screen-state tests |
| R-04 | Define a strategy contract returning BUY/SELL/HOLD (or normalized equivalent) with no transport, storage, UI, or notification coupling. | PDF §§6-12; `strategy.jpg` | Plugin contract and architecture tests |
| R-05 | Provide extensible MA, RSI, Bollinger, and Support/Resistance strategies; advanced strategies can be added by registration. | PDF §§7-12; `disco.jpg`, `strategy.jpg` | Descriptor/registry/plugin tests |
| R-06 | Combine strategies using majority voting and weighted score with configurable threshold. | PDF §§13-15; `disco.jpg` | Composite signal and validation tests |
| R-07 | Search bounded strategy combinations through generation → backtest → evaluate → rank, with explicit stop conditions and lifecycle controls. | PDF §§16-24; `disco.jpg` | Search lifecycle/stop/ranking tests |
| R-08 | Backtest historical candles with deterministic trades, transaction cost/slippage/risk handling, and trade detail. | PDF §§19-20,26; `backtest.jpg` | Simulator fixtures and trade audit tests |
| R-09 | Evaluate return, P/L, win rate, trade count, max drawdown, profit factor, and Sharpe (where defined), separate from strategy logic. | PDF §§20-22; `backtest.jpg` | Metric edge cases and determinism tests |
| R-10 | Maintain a sortable/ranked leaderboard with Top-K behavior and explicit ranking score. | PDF §§21-23; `disco.jpg`, `backtest.jpg` | Ranking/Top-K tests |
| R-11 | Collect normalized news from replaceable providers and associate items to assets/pairs. | PDF §§27-28; `news.jpg` | Provider normalization tests |
| R-12 | Analyze news sentiment via an isolated ML/LLM boundary, preserve template/version provenance, and degrade without disabling trading views. | PDF §§29-31; `news.jpg` | Sentiment boundary/failure tests |
| R-13 | Provide reviewable strategy authoring and a saved strategy library with validated, versioned, owner-isolated strategy/composite definitions. The Prompt/URL controls are reference-screen presentation elements; the PDF does not mandate an LLM or arbitrary-URL fetcher. | PDF §36; `strategy.jpg` | Definition-versioning, repository, and authenticated REST tests |
| R-14 | Use modular architecture so adapters, strategies, search algorithms, workers, and UI projections are replaceable without broad rewrites. | PDF §§4,12,24,35; all images | Dependency cruiser, module contract, integration tests |
| R-15 | Provide the visual dashboard areas shown in the references: realtime, strategy/discovery, backtest, news, settings/auth shell. | PDF §35; all five images | Frontend build and screen/state tests |

Important precedence note: `backtest.jpg` and the other images contain illustrative values and labels (for example, sample profits and dates). Tests must verify behavior and layout structure, not treat those sample numbers as live business constants.

Important conflict resolution: the original map overstated PDF §§32-34 as requiring prompt/URL generation. Those sections are architectural drivers and an end-to-end flow, not an LLM/URL feature requirement. The `strategy.jpg` reference requires that authoring UI to be presented, while the implemented backend requirement is the reviewable, versioned Strategy Library that the PDF explicitly requires in §36.

## Follow-up implementation checklist

The live frontend integration is present on `implement`; the remaining acceptance work is limited to honest runtime state and cross-screen navigation:

- [x] Authenticated shell waits for `/auth/me` before rendering protected content and returns to sign-in on an invalid restored token.
- [x] Settings presents the authenticated account plus backend/provider capability state without hard-coded connection claims.
- [x] Backtest accepts either one saved strategy definition or one saved composite, while preserving backend-owned metrics and lifecycle state.
- [x] Search and Leaderboard rows expose an experiment Inspect action when the backend returns an experiment identifier.
- [x] Final status records focused tests, build/lint/architecture checks, Docker Compose, and browser-flow evidence with explicit provider limitations.

## 2026-08-26 contract and state audit

- [x] Single persisted strategy backtest selection is accepted through the authenticated transport; multiple definitions still require a real persisted composite.
- [x] Backtest manual lifecycle exposes backend states including retry/finalization/cancellation and keeps missing experiment/replay data honest.
- [x] Replay `MATCH`/`MISMATCH` results, sealed visualization markers, paginated trade detail, and unavailable risk fields remain backend-owned.
- [x] Search progress uses the returned stop condition and explains Generate → Backtest → Evaluate → Rank → Leaderboard without frontend ranking logic.
- [x] News supports backend refresh/filtering and displays source, publication time, related assets, sentiment label/score, model provenance, and per-item missing sentiment.
- [x] Full tests/build/lint/architecture checks and healthy Compose/API evidence are recorded in `docs/IMPLEMENTATION_STATUS.md`.
- [ ] Browser-level UI E2E remains unverified because the managed in-app browser runtime exits during initialization with an ACL error; no visual-runtime pass is claimed.

## 2026-08-26 UI usability audit

- [x] Shared visible focus states cover interactive non-Market controls.
- [x] Narrow-width responsive fallback prevents the non-Market layouts from retaining multi-column clipping-prone arrangements.
- [ ] Browser-level UI E2E remains unverified because the managed browser runtime exits during initialization with an ACL error; no visual-runtime pass is claimed.

## Resumed frontend acceptance fixes (2026-08-26)

- [x] Expired authenticated sessions clear the shell state and return to sign-in when the backend returns 401.
- [x] Experiment trade detail uses the backend cursor contract with Previous/Next controls and honest loading/end states.
- [x] `TERMINAL_FAILURE_PENDING` is represented as failure finalization rather than an unlabelled lifecycle gap.
- [x] Loading/error/live lifecycle regions, visible focus states, and narrow responsive fallbacks are implemented for the non-Market screens.
- [ ] Browser-level UI E2E remains unverified because the managed browser runtime exits during initialization with an ACL error; no visual-runtime pass is claimed.

## Final validation rerun (2026-08-26)

- [x] Full `npm test` passed with 98 tests; build, lint, architecture, and diff checks passed.
- [x] Rebuilt Docker Compose services reached healthy status, and the authenticated REST flow passed through strategy/composite authoring, snapshot/scope, worker-backed backtest, cursor-paged trades, replay/visualization, Search, Leaderboard, News/Sentiment, and session re-verification.
- [x] Provider limitations remain explicit: deterministic local strategy generation and local News/Sentiment are surfaced as such; Binance data remains provider/network dependent.
- [ ] Browser-level UI E2E remains unverified because the managed in-app browser runtime exits before tab creation with `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`; no visual-runtime pass is claimed.
