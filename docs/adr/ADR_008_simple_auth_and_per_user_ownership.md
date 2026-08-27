# ADR-008: Use Simple Local Authentication and Per-User Ownership

- **Status:** Accepted
- **Decision date:** 2026-08-28
- **Decision owners:** Cryptox team, following the later instructor requirement
- **Related decisions:** [ADR-001](./ADR_001_websocket.md), [ADR-005](./ADR_005_module_first_structure.md), [ADR-006](./ADR_006_local_backtest_execution.md), [ADR-007](./ADR_007_practical_reproducibility.md)
- **Canonical documents:** [Requirements](../requirements.md), [Architecture](../architecture.md), [Data model](../data-model.md)

## Context

After C-01 correctly froze executable contracts against the earlier approved MVP
baseline, the instructor required simple Authentication and isolation of each
user's Strategies, Backtests/Experiments, and Leaderboard. The change must protect
private resources without turning the educational modular monolith into an
enterprise identity or general multi-tenant platform.

## Decision

- Add an Auth module that owns User credentials, password verification, opaque
  server-side sessions, session expiry/revocation, and authenticated identity.
- Use email/password with Argon2id hashes and a PostgreSQL-backed opaque session.
  Store only a secure digest of a cryptographically random token. Sessions expire
  absolutely after 24 hours, do not slide, and have no refresh token.
- Deliver the session in an HttpOnly, `SameSite=Lax`, path-rooted cookie with no
  Domain attribute. Deployed HTTPS uses `Secure=true` and a host-only cookie name
  where practical. Localhost HTTP development/demo may disable `Secure`; the MVP
  does not require building TLS infrastructure solely for a local demo.
- Registration, login, current-user lookup, expiry, and logout are the complete V1
  Auth capability. Login throttling is recommended hardening, not an instructor
  acceptance blocker.
- Resolve authenticated identity at the server request boundary and pass trusted
  `AuthenticatedUserId` separately from client DTOs. Client `userId` or
  `ownerUserId` fields never establish authority.
- StrategyDefinition, CompositeDefinition, SearchRun, Candidate, and
  LeaderboardScope are direct user-owned roots. CompositeComponent, Experiment,
  Trade, EvaluationResult, and LeaderboardEntry inherit ownership from their
  required parent/root relationship.
- Candle, Market Dataset/provenance, NewsItem, SentimentResult,
  RankingConfiguration, and Strategy plugin descriptors remain shared system data.
- Private repositories scope reads and mutations by owner. Missing Authentication
  returns 401; authenticated cross-user private-resource access returns 404;
  collections filter by owner before pagination/counting.
- Auth verifies identity but does not orchestrate business modules. Pure Strategy
  execution, Backtest simulation, and Evaluation calculations remain user-agnostic.

## Alternatives considered

1. **Short-lived JWT with refresh tokens.** Rejected because refresh/revocation
   infrastructure is unnecessary for the local MVP and complicates real logout.
2. **General tenant/RBAC identity platform.** Rejected because the instructor asks
   for per-user ownership, not organizations, roles, or enterprise IAM.
3. **Duplicate owner identity on every child table.** Rejected because required
   parent relationships provide safe inherited ownership and avoid redundant data.

## Consequences

- Positive: logout and expiry are enforceable server-side without Redis or an
  external identity provider.
- Positive: private reads/mutations have one consistent owner-scoped security rule.
- Positive: shared public-source data remains normalized once and reusable.
- Trade-off: authenticated requests require a PostgreSQL session lookup.
- Trade-off: ownership-sensitive C-01 contracts and D-01 persistence must be
  extended before affected implementation begins.

## Verification

- Register, login, current-user, expiry, and logout tests pass against real
  PostgreSQL-backed User/session state.
- Two users cannot read, mutate, submit, or rank each other's private resources;
  client identity fields cannot bypass server context.
- Search-created Candidate ownership comes from SearchRun/user context and a
  LeaderboardScope ranks only same-owner Experiments.
- Architecture tests keep Auth infrastructure out of pure Strategy, simulator,
  Evaluation, Market Data, News, and Sentiment calculations.
- Logs contain no passwords, raw credentials, cookies, session tokens, or token
  digests.
