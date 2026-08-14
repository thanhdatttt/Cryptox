# Cryptox - Tech Stack

## 1. Decision Drivers

- Contracts (`packages/contracts`) are TypeScript-native and shared across REST, WebSocket, and BullMQ payloads → one language end-to-end avoids drift.
- Modular monolith (`services/*` composed into `apps/backend`) needs enforced module boundaries, not just convention.
- A separately deployable, horizontally-scalable worker (`apps/backtest-worker`) must reuse the same pure domain code as the backend → monorepo.
- Heavy transactional correctness: row locks, `SELECT ... FOR UPDATE SKIP LOCKED`, fencing generations, append-only tables with triggers → the data layer must not fight raw SQL.
- BullMQ + Redis is already the specified async boundary (`architecture.md` §1.1).
- Frontend needs OHLCV candlestick charts + REST polling, no domain event subscriptions.

## 2. Chosen Stack

| Layer | Choice |
|---|---|
| Language | TypeScript everywhere (backend, worker, frontend) |
| Backend framework | NestJS — DI enforces module boundaries from `project-structure.md` |
| Backtest worker | Same Node/NestJS runtime, separate entrypoint, imports `services/backtesting` + `services/strategy-engine` as libraries |
| Database | PostgreSQL |
| Data access | Knex + hand-written repositories — this schema's correctness lives in hand-written transactions (composite FKs, `SELECT ... FOR UPDATE SKIP LOCKED`, fencing tokens); Knex gives direct control over every lock statement instead of an ORM abstraction layer |
| Queue | BullMQ on Redis |
| Cache | ioredis (latest-tick/candle/connection-status keys) |
| Realtime transport | Raw `ws` — market data only, no Socket.IO rooms/broadcast/event-bus semantics |
| Frontend | React + Vite |
| Charting | TradingView Lightweight Charts |
| Data fetching | TanStack Query (React Query) for REST polling |
| Validation | Zod (REST payloads + BullMQ `returnvalue`/`attemptsMade` parsing) |
| Monorepo tooling | pnpm workspaces + Turborepo |
| Testing | Vitest + Testcontainers (real Postgres/Redis in CI) |
| Local infra | Docker Compose (Postgres, Redis, backend, backtest-worker, frontend) |
| Migrations | node-pg-migrate