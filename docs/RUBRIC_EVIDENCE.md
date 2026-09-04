# Evidence map — rubric criteria 18 to 20

> **Submission reference:** `MXH`. These GitHub links resolve to the current shared commit at the time this document was written. After committing this documentation change, push it to the same submission branch before pasting the document links into the assessment sheet.

## 18. Source code + README

| What the rubric asks for | Evidence link |
| --- | --- |
| Complete repository | [Repository root](https://github.com/thanhdatttt/Cryptox/tree/MXH) |
| Install and run | [README — Install and run](https://github.com/thanhdatttt/Cryptox/blob/MXH/README.md#install-and-run) |
| Architecture entry point | [README — Architecture at a glance](https://github.com/thanhdatttt/Cryptox/blob/MXH/README.md#architecture-at-a-glance) |
| Demo procedure | [README — Demo scenario](https://github.com/thanhdatttt/Cryptox/blob/MXH/README.md#demo-scenario) |
| Verification commands and boundaries | [README — Verification commands](https://github.com/thanhdatttt/Cryptox/blob/MXH/README.md#verification-commands) |

## 19. Architecture Document

| What the rubric asks for | Evidence link |
| --- | --- |
| System Context | [Architecture §1](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#1-system-context) |
| Container/module decomposition and responsibilities | [Architecture §2](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#2-containers-and-module-decomposition) |
| Communication and component responsibilities | [Architecture §§3–4](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#3-communication-model) |
| Realtime Flow | [Architecture — Realtime market flow](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#realtime-market-flow) |
| Strategy Flow | [Architecture — Strategy flow](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#strategy-flow) |
| Search/Backtest Flow | [Architecture — Manual backtest flow](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#manual-backtest-flow), [Search and backtest flow](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/architecture.md#search-and-backtest-flow) |
| Detailed data-flow appendix | [Data-flow appendix](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/design/data-flow.md) |
| Backend module composition | [Backend composition source](https://github.com/thanhdatttt/Cryptox/blob/MXH/apps/backend/src/compose.ts) |
| Market WebSocket boundary | [Gateway source](https://github.com/thanhdatttt/Cryptox/blob/MXH/apps/backend/src/market.gateway.ts), [wire contract](https://github.com/thanhdatttt/Cryptox/blob/MXH/packages/contracts/websocket/market-data.ts) |

## 20. Architectural Decision Records

| Architectural decision | Evidence link |
| --- | --- |
| Why WebSocket is restricted to realtime market data | [ADR-001](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/adr/ADR_001_websocket.md) |
| Why strategies use Plugin + Registry | [ADR-002](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/adr/ADR_002_plugin_architecture.md) |
| Why BullMQ is the only asynchronous boundary | [ADR-003](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/adr/ADR_003_jobqueue.md) |
| Why Sentiment is isolated as a module | [ADR-004](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/adr/ADR_004_sentiment_isolated_module.md) |
| Why the project is module-first and remains a modular monolith | [ADR-005](https://github.com/thanhdatttt/Cryptox/blob/MXH/docs/adr/ADR_005_module_first_structure.md) |
| Strategy registry source | [plugins.ts](https://github.com/thanhdatttt/Cryptox/blob/MXH/modules/strategy/domain/plugins.ts) |
| Queue boundary source | [queue contract](https://github.com/thanhdatttt/Cryptox/blob/MXH/packages/contracts/queue/backtesting.ts), [BullMQ adapter](https://github.com/thanhdatttt/Cryptox/blob/MXH/modules/backtesting/infrastructure/queue/adapter.ts) |

## What not to claim without new evidence

- Realtime Binance/WebSocket stability requires an observed browser demo.
- Multi-worker throughput and average backtest duration require a recorded benchmark; they are not proven by the worker/queue source alone.
- The current built-in registry does **not** include MACD. MACD is only a valid example of a future plugin-extension test.
