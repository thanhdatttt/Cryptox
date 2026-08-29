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
| R-13 | Provide reviewable strategy authoring and a saved strategy library with validated, versioned, owner-isolated strategy/composite definitions. OpenSpec additionally confirms an authenticated, bounded generation path from exactly one text or public HTTP(S) URL source; this is constrained model assistance, not arbitrary code execution. | PDF §36; `strategy.jpg`; OpenSpec `ai-strategy-generation` | Definition-versioning, generation/schema/source-loader, repository, and authenticated REST tests |
| R-14 | Use modular architecture so adapters, strategies, search algorithms, workers, and UI projections are replaceable without broad rewrites. | PDF §§4,12,24,35; all images | Dependency cruiser, module contract, integration tests |
| R-15 | Provide the visual dashboard areas shown in the references: realtime, strategy/discovery, backtest, news, settings/auth shell. | PDF §35; all five images | Frontend build and screen/state tests |

Important precedence note: `backtest.jpg` and the other images contain illustrative values and labels (for example, sample profits and dates). Tests must verify behavior and layout structure, not treat those sample numbers as live business constants.

Important conflict resolution: the original map overstated PDF §§32-34 as requiring prompt/URL generation. Those sections are architectural drivers and an end-to-end flow, not an LLM/URL feature requirement. The `strategy.jpg` reference requires that authoring UI to be presented, while the implemented backend requirement is the reviewable, versioned Strategy Library that the PDF explicitly requires in §36.

OpenSpec precedence note: the confirmed change makes constrained AI generation
an implemented backend capability even though the PDF treats prompt/URL controls
as a presentation/reference element. Frontend controls remain subject to the
user's explicit UI-approval boundary.

Ownership matrix: `AuthContext.userId` owns Strategy/Composite Definitions,
Benchmark Scopes, and Search Runs. Candidate, Attempt, Trade, Experiment, and
Leaderboard reads derive authorization through immutable parent chains; equal
benchmark inputs under different owners never share rankings.
