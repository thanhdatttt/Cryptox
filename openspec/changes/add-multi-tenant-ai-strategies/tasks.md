## 1. Canonical Documentation Synchronization

- [x] 1.1 Update `auth-spec.md`, `strategy-spec.md`, `search-spec.md`, and `ranking-spec.md` with the owner-aware requirements, behavior, contracts, constraints, and acceptance criteria from this change.
- [x] 1.2 Repair and update the ownership/table sections in `docs/design/data-model.md`, including one coherent ERD and definitions for `users`, the four owner columns, owner-aware constraints/indexes, and the legacy-owner migration.
- [x] 1.3 Update `docs/design/component-contracts.md` with `AuthContext`, breaking owner-aware API signatures, protected REST mappings, derived-resource authorization, and private ranking behavior.
- [x] 1.4 Update `strategy-spec.md`, `data-model.md`, and `component-contracts.md` with the generation endpoint, ports, audit table, atomic sequence, and Search/AI-generation distinction.
- [x] 1.5 Update Trade, Market Data, and News canonical documentation with the three lower-risk deltas, then run cross-file terminology and ownership-matrix checks.

## 2. Authentication and Ownership Foundation

- [x] 2.1 Add the legacy migration user and migrate the four owner columns, foreign keys, owner-aware unique constraints, and lookup indexes before enforcing `NOT NULL`.
- [x] 2.2 Complete bcrypt registration/login and one-hour HS256 JWT verification, then add Backend middleware that creates `AuthContext` for protected routes.
- [x] 2.3 Change Strategy Definition and Composite Definition commands/queries to require `userId` and reject mixed-owner components.
- [x] 2.4 Change Leaderboard Scope and Search Run commands/queries to require `userId` and reject cross-owner scope references.
- [x] 2.5 Add owner-aware authorization for Candidates, Backtests, Experiments, Trade Detail, Search controls, and all user-owned list/read routes through immutable parent chains.
- [x] 2.6 Add isolation tests covering forged body owners, guessed direct/derived IDs, mixed-owner composites/scopes, and same logical names under different users.

## 3. Owner-Scoped Ranking and Search

- [x] 3.1 Update `rankSearchRun` and Search leaderboard/status projections to resolve an owner-matching Search Run before querying results.
- [x] 3.2 Update `topK`, Leaderboard Scope listing, and admission verification so the fixed Top-10 is private to one user-owned scope.
- [x] 3.3 Test that equal immutable benchmark inputs under two owners still produce separate Search rankings and persistent Top-10 lists.

## 4. AI-Generated Strategy

- [x] 4.1 Add the `strategy_generation_requests` migration with owner, exclusive source/result checks, provenance fields, and same-owner result validation.
- [x] 4.2 Add request/output schemas, `StrategyGenerationAdapter`, and bounded public-URL source-loader ports without exposing provider SDK types.
- [x] 4.3 Implement the synchronous generation application flow through `listStrategies`, `defineStrategy`, and `defineComposite` in one atomic persistence unit.
- [x] 4.4 Add authenticated `POST /strategy-generations` transport mapping and the documented validation/source/model error responses.
- [x] 4.5 Test text and URL success, single/composite output, unsafe redirects, timeout, malformed schema, unknown plugin, invalid parameters, same-owner persistence, and zero partial writes.

## 5. Trade Risk Fields

- [x] 5.1 Add nullable positive `stop_loss` and `take_profit` columns to `trades`.
- [x] 5.2 Propagate optional price fields through worker persistence, Backtesting `Trade`, Experiment hydration, and REST Trade Detail while keeping queue signals reference-only.
- [x] 5.3 Test positive values, legacy null values, invalid values, and unchanged entry-time trigger prices after completion.

## 6. Market Data Default

- [x] 6.1 Set the omitted-limit historical page constant to 1000 in the REST and `readCandles` page path.
- [x] 6.2 Test omitted limit, explicit smaller limit, fewer-than-1000 history, chronological ordering, and unchanged explicit-range/snapshot behavior.

## 7. LLM News Crawler

- [x] 7.1 Add the tool-free `HtmlNewsInterpreter` port and a schema-constrained provider adapter behind the crawler infrastructure boundary.
- [x] 7.2 Replace selector-only crawler extraction with bounded HTML safety preprocessing, LLM interpretation, canonical normalization, and validation.
- [x] 7.3 Add observability and tests for layout variation, prompt-like page content, malformed/hallucinated fields, timeout, provider isolation, exact-URL deduplication, and News-before-Sentiment ordering.

## 8. Validation

- [x] 8.1 Run strict OpenSpec validation and verify every canonical spec follows Overview → Requirements → Behavior → Contracts → Constraints → Acceptance Criteria.
- [x] 8.2 Run authentication/ownership integration tests and regression suites for Search lifecycle, ranking, Backtesting completion, Market Data reads/WebSocket reconnect, News/Sentiment failure isolation, and existing evaluation edge cases.
