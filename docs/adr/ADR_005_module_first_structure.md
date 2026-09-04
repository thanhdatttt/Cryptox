# ADR-005: Use a module-first modular-monolith structure

## Status

Accepted — implemented.

## Context

Cryptox has business capabilities with distinct ownership—Market Data, Strategy, Search, Backtesting, Evaluation, Leaderboard, News, and Sentiment—while the backend and backtest worker are deployable compositions. A flat `services/` directory or top-level technical layers would blur these responsibilities and encourage deep imports. Creating a microservice per module would conflict with the chosen synchronous core.

## Decision

- Keep business capabilities under `modules/` with public APIs and optional `api`, `application`, `domain`, and `infrastructure` layers.
- Keep deployable compositions in `apps/`, shared transport contracts in `packages/contracts/`, and operational assets in `infra/`.
- Permit cross-module collaboration only through public APIs; disallow imports of another module's domain/infrastructure internals.
- Keep the backend as one synchronous modular monolith. The Backtest Worker Pool is the only separate process boundary.

## Alternatives considered

1. Flat `services/` directory — rejected because it obscures business ownership and sounds like deployment topology.
2. Technical-layer-first root layout — rejected because it scatters one capability across the repository.
3. Microservice per module — rejected because it adds network/event consistency cost without a demonstrated scaling need.

## Consequences

- Module ownership, test seams, and external adapter boundaries are visible from the repository tree.
- Public entry points and architecture tests must remain maintained as modules evolve.
- Shared-looking types may need neutral projections rather than a global domain model.

## Evidence and verification

- [`apps/backend/src/compose.ts`](../../apps/backend/src/compose.ts) composes modules through bootstrap/public APIs.
- [`modules`](../../modules), [`apps`](../../apps), [`packages/contracts`](../../packages/contracts), and [`infra`](../../infra) implement the stated ownership structure.
- Run `npm run arch:check` as the structural verification gate.
