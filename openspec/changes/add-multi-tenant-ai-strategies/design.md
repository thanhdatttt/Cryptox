## Context

Cryptox is a modular monolith whose durable experiment objects are currently addressable without a consistently documented owner boundary. The existing `auth-spec.md` already chooses bcrypt plus one-hour HS256 JWTs, but the Strategy, Search, Ranking, data-model, and REST contracts do not consistently derive and enforce the current user. Separately, Strategy creation is manual/search-driven only; Trade omits risk prices; Market Data leaves its default page size configurable; and the crawler contract treats all providers as already-normalized without defining semantic HTML interpretation.

This design affects `modules/auth`, `modules/strategy`, `modules/search`, `modules/leaderboard`, `modules/backtesting`, `modules/market-data`, and the crawler adapter in `modules/news`. PostgreSQL remains authoritative. Core module collaboration remains synchronous and in-process; the existing BullMQ boundary remains backtesting-only.

The canonical documentation to update during application is:

| Item | Primary files | Downstream files |
|---|---|---|
| 1. Authentication and ownership | `openspec/specs/auth-spec.md`, `docs/design/data-model.md`, `docs/design/component-contracts.md` | `strategy-spec.md`, `search-spec.md`, `ranking-spec.md` |
| 2. AI-generated Strategy | `openspec/specs/strategy-spec.md`, `docs/design/component-contracts.md`, `docs/design/data-model.md` | `search-spec.md` only to distinguish user-requested generation from Search candidate generation |
| 3. Trade risk fields | `docs/design/component-contracts.md`, `docs/design/data-model.md` | Backtesting queue/result and Experiment REST projections documented there |
| 4. Historical candle default | `openspec/specs/market-data-spec.md`, `docs/design/component-contracts.md` | None; snapshot/range semantics remain unchanged |
| 5. LLM crawler parsing | `openspec/specs/news-spec.md`, `docs/design/component-contracts.md` | Sentiment contract is unchanged because it still receives normalized News |

## Goals / Non-Goals

**Goals:**

- Identify the current user using a minimal bearer JWT and make ownership mandatory at every user-owned command/query boundary.
- Prevent cross-user reads, mutation, composition, backtesting, Search, and ranking, including indirect access by guessed IDs.
- Turn either text or one website URL into a validated, immutable Strategy Definition or Composite Strategy Definition and persist it for that user.
- Make LLM usage replaceable and bounded; LLM output is an untrusted proposal that must pass existing Strategy Registry/schema/composite validation.
- Add the three smaller contract changes without altering unrelated lifecycle, snapshot, scoring, or provider behavior.
- Preserve existing modular ownership and avoid new deployables, queues, or generalized event infrastructure.

**Non-Goals:**

- OAuth/SSO, MFA, RBAC, organizations, invitations, API keys, refresh tokens, token rotation, revocation/session stores, or production-grade account recovery.
- Executing LLM-produced source code, dynamically installing plugins, or letting an LLM bypass the registered plugin catalog.
- A conversational strategy editor, streaming generation, prompt history UI, background generation jobs, or model-provider failover.
- Live-money order execution or enforcement of stop-loss/take-profit at an exchange.
- LLM processing for RSS/News API providers that already return structured content.

## Decisions

### 1. Extend the existing Auth module and propagate an explicit `AuthContext`

`modules/auth` remains the single owner of users, password verification, and token verification. `apps/backend` middleware maps `Authorization: Bearer <JWT>` to `{ userId }`. Protected REST handlers pass that value to public module commands/queries; domain/application code never parses JWTs. Client-supplied `userId` fields are rejected or ignored and are never authorization evidence.

The public registration/login endpoints remain `POST /auth/register` and `POST /auth/login`; `GET /auth/me` is protected. The existing bcrypt and HS256/one-hour-token choices remain. Authentication failures return `401`; an authenticated attempt to address another user's object returns `404` to avoid confirming its existence. Ownership conflicts discovered while composing same-user resources return `400 OWNERSHIP_MISMATCH`.

Alternative considered: server-side sessions or a dedicated identity service. Rejected because it adds state and deployment complexity without helping the MVP ownership requirement.

### 2. Store ownership only on aggregate roots that the request identifies

Add `user_id UUID NOT NULL REFERENCES users(id)` to:

- `strategy_definitions`
- `composite_strategy_definitions`
- `search_runs`
- `leaderboard_scopes`

Owner-aware uniqueness becomes `(user_id, logical_family_key, version)` for Strategy and Composite definitions and `(user_id, name, version)` for Leaderboard Scopes. Add indexes beginning with `user_id` for list/lookup paths. A Composite may reference only Strategy Definitions with the same `user_id`. A Search Run may use only a Leaderboard Scope owned by the same user.

Candidates, Attempts, Trades, Experiment Results, and Leaderboard Entries do not duplicate `user_id` in this MVP. Their authorization is derived by joining through their immutable owning chain (`search_run_id` and/or `leaderboard_scope_id`, plus composite definition). This avoids denormalized ownership drift. Repository queries SHALL include the owner predicate or use an owner-aware parent lookup before returning a child.

Existing rows require an explicit migration owner. For an academic deployment, create one migration user (for example `legacy@local.invalid`) and backfill all current user-owned rows before making columns `NOT NULL`. This is a one-time data migration, not a runtime shared account.

Alternative considered: PostgreSQL row-level security. Rejected for MVP complexity; application repository predicates plus foreign keys and same-owner validation are sufficient.

### 3. Ranking is private per user even when benchmark inputs match

`rankSearchRun(userId, searchRunId)` and `topK(userId, scopeId)` first resolve an owner-matching run/scope. The persistent Top-10 remains fixed at `K = 10`, but a scope is user-owned, so entries from different users never compete. Search Run ranking remains confined to one owner-matching run. `submit()` verifies that the Experiment's scope and definition chain share the scope owner before admission.

This is breaking for current APIs that accept only `scopeId`/`searchRunId`, and for any UI assumption that a scope leaderboard is globally shared. Score formula rows and immutable candle/sentiment snapshots remain global reusable reference data because they contain no user configuration and are selected through a user-owned scope.

### 4. Add a synchronous, constrained strategy-generation application flow

Add `POST /strategy-generations` as an authenticated command. Exactly one source is accepted:

```typescript
type GenerateStrategyRequest =
  | { sourceType: "TEXT"; text: string }
  | { sourceType: "URL"; url: string };

interface GenerateStrategyResponse {
  generationId: string;
  kind: "SINGLE" | "COMPOSITE";
  strategyDefinition?: StrategyDefinition;
  compositeStrategyDefinition?: CompositeStrategyDefinition;
}
```

The Strategy application service obtains the authenticated user's source, the registered `StrategyPluginDescriptor[]`, and a versioned prompt. For URL input, a narrow source-loader port fetches one public HTTP(S) page with redirect, timeout, and response-size bounds and converts it to readable text. Private, loopback, link-local, and unsupported schemes are rejected. The LLM adapter receives only source text and the registered plugin descriptors and must return a schema-constrained proposal referencing existing plugin names and parameters.

The proposal is mapped through the existing `defineStrategy(userId, ...)` and `defineComposite(userId, ...)` APIs. Existing parameter, implementation provenance, component, weight, threshold, versioning, and idempotency rules remain authoritative. No model output becomes executable code.

Persist a minimal `strategy_generation_requests` audit row:

| Field | Purpose |
|---|---|
| `id`, `user_id`, `source_type` | Identity and ownership |
| `source_text` / `source_url` | Exactly one original input; no fetched raw HTML |
| `model_name`, `model_version`, `prompt_version` | Generation provenance |
| `output_kind`, `strategy_definition_id`, `composite_definition_id` | Exactly one successful result reference |
| `created_at` | Audit timestamp |

Only successful generations are persisted in the MVP. Invalid input, fetch failure, model timeout, malformed output, unknown plugin, or Strategy validation failure returns an error and writes no definitions or generation row. Definitions/components and the audit row are committed atomically.

Alternative considered: placing generation in Search. Rejected because Search generates bounded optimization candidates, while this flow is a direct user command that may create one reusable definition without starting a Search Run.

### 5. Add nullable stop-loss and take-profit execution prices to Trade

Add `stop_loss NUMERIC NULL CHECK (stop_loss > 0)` and `take_profit NUMERIC NULL CHECK (take_profit > 0)` to `trades`, exposed as `stopLoss?: number` and `takeProfit?: number`. They are the risk-trigger price selected for that trade at entry, not percentages. Both are optional so legacy trades and strategies without these controls remain valid. When present, the worker's deterministic simulator uses the pinned strategy/simulator rules and stores the chosen prices with the completed Attempt; Trade detail reads return them unchanged.

The Backtesting in-process result type and any serialized/persisted Trade representation must be versioned or updated together. Queue terminal signals still carry references only, so no larger queue result payload is introduced.

### 6. Make 1000 the historical page default, not a snapshot rule

For `GET /market/candles` and `readCandles` page queries without an explicit range and without `limit`, Market Data uses exactly `limit = 1000`. An explicit valid `limit` keeps existing bounded behavior. Range queries, completeness modes, provider pagination, cache freshness, and sealed snapshot counts do not change. Responses remain oldest-to-newest within the selected latest page.

Alternative considered: always forcing every request to exactly 1000. Rejected because explicit smaller pages and range reads are established contracts.

### 7. Put semantic HTML extraction inside the crawler adapter

Only the crawler adapter changes. It fetches HTML, applies basic safety/size limits, and sends the bounded HTML (or a lossless-enough cleaned representation that retains meaningful tag/text relationships) to an `HtmlNewsInterpreter` LLM port. The structured response contains candidate title, content, publication time, source, related coins, and canonical URL. The adapter validates this output and returns canonical `NewsItem[]`; provider-specific HTML and model output do not cross into the News Collector.

Pure CSS/XPath/DOM selectors may be used only for safety preprocessing (removing scripts/styles, size reduction, URL resolution), not as the sole extraction mechanism. The LLM has no tools and HTML instructions are treated as untrusted data. A fetch/model/schema failure yields a crawler-provider failure and persists no malformed News item; other providers and already-persisted News remain available. Sentiment still receives the same normalized `SentimentInput` after News persistence.

Alternative considered: move interpretation into the News Collector. Rejected because it would make canonical collection depend on crawler-specific HTML concerns and violate provider replaceability.

## Risks / Trade-offs

- [JWT theft remains valid until expiry] -> Keep the one-hour expiry, TLS deployment guidance, and no sensitive claims beyond `sub`; accept re-login rather than adding refresh/revocation infrastructure.
- [A repository forgets an owner predicate] -> Require owner-aware repository signatures and acceptance tests for guessed IDs across every user-owned and derived route.
- [Legacy rows have no natural owner] -> Use one explicit migration owner and document it; do not leave nullable/shared runtime ownership.
- [LLM output is nondeterministic or invalid] -> Constrain the output schema and registered catalog, validate through Strategy, record model/prompt provenance, and fail atomically.
- [URL fetching enables SSRF or oversized content] -> Allow only public HTTP(S), validate redirects, block non-public addresses, and enforce time/byte limits.
- [Synchronous LLM calls increase latency] -> Use one bounded call and timeout; background jobs are deferred until usage justifies their lifecycle complexity.
- [LLM crawler cost/latency] -> Invoke only for crawler HTML pages and bound input size; RSS/API paths stay unchanged.
- [Nullable Trade fields have ambiguous historical meaning] -> Define them as entry-time trigger prices and return `null`/absent for legacy trades.
- [1000 candles increases response size] -> Retain existing explicit smaller limits and cache/database pagination behavior.

## Migration Plan

1. Add or identify the legacy migration user; backfill ownership columns, then add `NOT NULL`, foreign keys, owner-aware indexes, and owner-aware unique constraints.
2. Add nullable Trade columns and the successful-generation audit table. These schema changes are backward-compatible until application contracts switch.
3. Update Auth middleware and public module APIs to require `userId`; update owner-scoped repositories and same-owner validations before exposing protected routes.
4. Update Search and Ranking reads/admission, then derived Candidate/Experiment authorization, so no interval exists where guessed IDs cross owners.
5. Add the strategy-generation endpoint and LLM/source-loader ports behind configuration; generation is unavailable if the model is not configured, while manual Strategy creation remains usable.
6. Switch Market Data's omitted-limit default to 1000 and replace crawler structural extraction with the LLM interpreter.
7. Update canonical specs/design docs and run OpenSpec validation plus documentation consistency checks.

Rollback may disable the generation endpoint and crawler LLM adapter and restore the prior candle default without dropping data. Ownership columns must not be made nullable or ignored after deployment; application rollback requires retaining owner-aware route/repository behavior. Nullable Trade columns and generation audit rows can remain harmlessly in place.

## Open Questions

- Choose the concrete LLM provider/model and exact timeout/HTML byte limit in implementation configuration; the contracts intentionally remain provider-neutral.
- Decide the legacy migration user's deployment-specific email before applying the schema migration.
