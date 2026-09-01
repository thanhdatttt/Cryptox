# Tasks: Module-First Layered Structure

## Planning and documentation

> This apply is intentionally documentation-only. The implementation migration tasks below remain pending until a later approved change.

- [x] Confirm the module ownership matrix, especially `ExperimentResult` and Completion Processor ownership.
- [x] Update `docs/design/project-structure.md` with the `modules/` namespace, layer definitions, and dependency rules.
- [x] Update `docs/design/architecture.md` module table, diagrams, composition roots, and process boundaries.
- [x] Update `docs/design/component-contracts.md` to distinguish domain types, public module APIs, and wire contracts.
- [x] Update `docs/design/data-model.md` table ownership and repository/adaptor placement without changing schema semantics.
- [x] Update `docs/design/data-flow.md` participants and module calls while preserving REST/WebSocket/BullMQ behavior.
- [x] Update `README.md` target structure and terminology.
- [x] Add or update an ADR documenting the module-first layered structure and its rejected alternatives.
- [x] Extend `openspec/config.yaml` with layer dependency, public module API, and cross-module import rules.

## Contract and boundary preparation

- [x] Classify current contracts into module-local domain types, public in-process APIs, REST DTOs, WebSocket messages, and queue messages.
- [x] Define the public entrypoint for each module and prohibit deep imports from consumers.
- [x] Decide whether the Backtest queue adapter is fully absorbed into `modules/backtesting/infrastructure/queue`.
- [x] Define neutral input contracts where current types create unwanted module coupling, especially `SentimentInput` and `StrategyCandle`.
- [x] Resolve Candidate ownership: lifecycle/persistence/projection in `modules/backtesting`; Search owns Search Run orchestration.
- [x] Resolve News/Sentiment persistence ownership and Sentiment snapshot ownership.
- [x] Define `packages/contracts/queue` as the canonical serialized queue schema and separate it from Backtesting in-process APIs.
- [x] Define the allowlisted module bootstrap facade used by deployable apps.
- [x] Define cancellation audit semantics: a Candidate remains `CANCELLED`; an in-flight Attempt may complete for audit, but no Experiment/ranking is created.
- [x] Close Search/Backtesting boundary: Search uses Backtesting Candidate summary/submission/cancellation facades and never touches Candidate persistence directly.
- [x] Make queue wire contracts self-contained and versioned with `schemaVersion`.
- [x] Define Strategy/Composite logical-family version allocation and Composite validation invariants.
- [x] Define Search `ERROR` terminal state semantics and deterministic stop-condition precedence.
- [x] Define deterministic sentiment snapshot as-of alignment and missing-window behavior.
- [x] Define the Completion Processor unit-of-work contract required by Leaderboard `submit()`.

## Implementation migration preparation

- [x] Create module skeletons with only required layers; do not add empty layer directories for symmetry.
- [x] Create `apps/backend` and `apps/backtest-worker` composition roots without moving business logic into them.
- [x] Add TypeScript path aliases/workspace references for module public APIs.
- [x] Add architecture tests for forbidden imports and allowed module dependency direction.
- [x] Add contract tests for Backend/Worker queue payload compatibility.
- [x] Migrate modules in dependency order while preserving current transport, persistence, retry, fencing, and reconciliation behavior.
- [x] Run documentation/path/reference checks and code-level import verification (`npm run arch:check`).
