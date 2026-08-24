# Implementation Plan

## Source precedence

1. `B:\Bao\Crypto Strategy Lab – Đồ án cuối kỳ.pdf` (authoritative assignment)
2. Supplied reference screens: `backtest.jpg`, `disco.jpg`, `news.jpg`, `realtime.jpg`, `strategy.jpg`
3. `docs/assignment/crypto-strategy-lab-final-project.md` and the OpenSpec/design documents
4. Existing implementation and tests

The PDF and Markdown companion agree on the core product goals. Where the repository specs add concrete API, persistence, ownership, reproducibility, or lifecycle rules, those rules are treated as the implementation detail of the assignment's architectural requirements.

## Ordered features

1. **Market data and normalized contracts** — historical closed candles, realtime tick/candle envelopes, adapter boundary, and deterministic merge/update behavior. Acceptance: market-data contracts and facade tests pass; no frontend/Binance coupling.
2. **Strategy plugin runtime** — indicator primitives, MA/RSI/Bollinger/Support-Resistance plugins, descriptor registry, and composite majority/weighted voting. Acceptance: plugin registration, signal, parameter, and composite tests pass.
3. **Backtesting and evaluation** — deterministic OHLCV simulation, fills/risk policy, trade audit records, and finite metrics. Acceptance: deterministic backtests and metric edge-case tests pass.
4. **Search and leaderboard** — bounded random/domain-guided generation, pause/resume/cancel lifecycle, ranking, and Top-K admission. Acceptance: stop conditions, lifecycle, ranking, and ownership tests pass.
5. **News and sentiment** — provider-neutral news normalization, extraction/template boundary, sealed sentiment snapshots, and degraded behavior. Acceptance: provider adapter, normalization, and unavailable-sentiment tests pass.
6. **Auth, persistence, and HTTP composition** — registration/login/JWT ownership, repositories/migrations, REST endpoints, queue boundaries, and websocket composition. Acceptance: module/API integration tests pass with user isolation.
7. **Frontend application** — responsive four-panel realtime dashboard, strategy authoring/discovery, backtest/detail/trades, leaderboard, and news views matching the supplied screens. Acceptance: frontend state/transport/component tests pass and build succeeds.
8. **Integration hardening** — architecture checks, full test/build/lint suite, reproducibility/security review, and final requirements traceability.

Each feature is implemented only after the preceding feature's relevant checks pass. Status, tests, decisions, and commit hashes are maintained in `docs/IMPLEMENTATION_STATUS.md`.
