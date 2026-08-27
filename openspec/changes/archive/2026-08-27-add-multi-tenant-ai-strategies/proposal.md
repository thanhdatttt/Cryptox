## Why

Cryptox currently lacks a complete ownership boundary for user-created experiments and a safe, explicit path from natural-language or web input to persisted strategy definitions. The same change also closes three smaller contract gaps in trade risk metadata, historical candle defaults, and crawler interpretation while keeping the solution proportional to an MVP/academic system.

## What Changes

- Add simple email/password authentication with bcrypt password hashes and stateless JWT bearer tokens, then require ownership checks for Strategy Definitions, Composite Strategy Definitions, Search Runs, Leaderboard Scopes, and their derived reads.
- **BREAKING**: add `userId` ownership to strategy/composite definition creation, Search Run creation and lookup, and Leaderboard Scope creation/query; IDs alone no longer authorize cross-user access.
- Add an LLM-assisted strategy-generation application flow accepting either natural language or one HTTP(S) website URL, producing a validated single or composite definition and persisting it under the authenticated user.
- Extend persisted and public `Trade` data with nullable `stopLoss` and `takeProfit` prices so existing historical trades remain representable.
- Pin the default historical candle page size to 1000 closed candles when a page request omits `limit`; explicit bounded limits remain supported.
- Require crawler adapters to use an LLM-backed semantic extraction step over fetched HTML, with validation and failure isolation before normalized News persistence.
- Update architectural data-model and component-contract documentation so the ownership, API, boundary, and sequence rules agree across modules.

## Capabilities

### New Capabilities

- `multi-tenant-auth-ownership`: Minimal registration/login/JWT behavior plus authenticated user ownership and isolation across definitions, Search Runs, Leaderboard Scopes, rankings, and derived resources.
- `ai-strategy-generation`: Natural-language or website-source generation, constrained LLM output, Strategy-module validation, persistence, provenance, and failure behavior.
- `trade-risk-fields`: Optional stop-loss and take-profit fields on persisted and returned Trade records.
- `market-data-default-load`: A fixed default of 1000 closed historical candles per page request when `limit` is omitted.
- `llm-news-crawling`: LLM-backed semantic extraction of normalized News items from crawler-fetched HTML.

### Modified Capabilities

None. The repository's current canonical specs are flat `openspec/specs/*-spec.md` documents and are not registered as OpenSpec capability directories; this change supplies explicit delta capabilities and maps each one back to the affected canonical files.

## Impact

- Primary canonical specs: `openspec/specs/auth-spec.md`, `strategy-spec.md`, `search-spec.md`, `ranking-spec.md`, `market-data-spec.md`, and `news-spec.md`.
- Cross-cutting design docs: `docs/design/data-model.md` and `docs/design/component-contracts.md`.
- Data contracts: `users`; new `user_id` columns and owner-aware uniqueness/indexing on strategy definitions, composite definitions, Search Runs, and Leaderboard Scopes; nullable `trades.stop_loss` and `trades.take_profit`; AI-generation provenance fields/table as described in design.
- REST contracts: `/auth/*`, protected strategy/search/scope/ranking/experiment routes, and a new `POST /strategy-generations` endpoint.
- Downstream breaking impact: Search must derive ownership from JWT rather than request bodies; Ranking must partition both Search Run rankings and persistent Top-10 by owner; Backtesting and Experiment reads must authorize through the owning definition/run/scope chain.
- Dependencies/configuration: bcrypt, JWT signing secret, and one server-side LLM adapter/configuration shared only through explicit application ports; no OAuth, RBAC, refresh-token store, session store, or general identity infrastructure.
