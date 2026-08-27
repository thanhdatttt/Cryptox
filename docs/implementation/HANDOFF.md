# MVP Implementation Checkpoint

## Resume here

- **Current stage:** A-00 governance reconciliation is complete; no implementation
  task was started.
- **Branch:** `MVP_IMPLEMENTATION`
- **Pre-change C-01 commit:** `d7136318ecc5ca98670db4c260974a64d0fcbbfe`
- **A-00 checkpoint HEAD:** The commit containing this file; resolve it with
  `git rev-parse HEAD` after checkout.
- **DONE:** P-00, C-01, A-00.
- **READY:** C-01A, E-01, F-01.
- **BLOCKED by C-01A:** D-01 and S-01. All other unfinished work remains blocked
  as recorded in [`TASKS.md`](TASKS.md).

Read [`AGENTS.md`](../../AGENTS.md), its complete authority chain, accepted
[`ADR-008`](../adr/ADR_008_simple_auth_and_per_user_ownership.md), the active
[`mvp-implementation` change](../../openspec/changes/mvp-implementation/), the
full [`MVP_PLAN.md`](MVP_PLAN.md), and the mutable [`TASKS.md`](TASKS.md) before
claiming one READY packet.

## Historical checkpoint truth

C-01 was correctly completed at `d7136318ecc5ca98670db4c260974a64d0fcbbfe`
under the then-authoritative baseline, which deferred authentication and ownership.
The instructor changed the assignment afterward. A-00 records that later change;
it does not rewrite C-01 history or claim the new contracts are already executable.

C-01 froze the original capability contracts, ports, REST/market-WebSocket DTOs,
generic visualization traces, deterministic Search identity, bounded execution
seams, replay provenance, and ranking configuration. A-00 changed documentation
and governance only. C-01A is the single contract-reconciliation gate for Auth,
trusted request identity, and ownership-sensitive contracts.

## Approved post-C-01 decisions

### Auth V1

- Real email/password registration, login, current-user lookup, absolute expiry,
  and logout are REQUIRED by `CSL-R-AU-01`.
- Passwords use Argon2id. Authentication uses cryptographically random opaque
  sessions persisted server-side in PostgreSQL; only a token digest is stored.
- Sessions have a fixed 24-hour absolute lifetime. V1 has no sliding renewal,
  access/refresh-token pair, or JWT authorization model.
- The cookie is HttpOnly, SameSite=Lax, Path=/, and has no Domain attribute.
  Secure is required for HTTPS/deployed environments and may be disabled only for
  explicit localhost HTTP development.
- The server derives `AuthenticatedUserId` from the validated session. A client
  `userId` is never authorization evidence. Unauthenticated private access is 401;
  another user's private resource is exposed as 404.

### Ownership V1

- Direct user-owned roots: StrategyDefinition, CompositeDefinition, SearchRun,
  Candidate, and LeaderboardScope.
- Inherited ownership: CompositeComponent through CompositeDefinition; Experiment
  and Trade through Candidate/Experiment; EvaluationResult through Experiment;
  LeaderboardEntry through LeaderboardScope.
- Shared system data: Candle, Market Dataset/provenance, NewsItem,
  SentimentResult, RankingConfiguration, and Strategy plugin descriptors.
- Search-created Candidates inherit the trusted SearchRun owner. Leaderboard
  scopes accept only same-owner Experiments. Owner filtering occurs before
  pagination, ranking, or mutation.
- Pure Strategy analysis, simulator, Evaluation, and scoring functions remain
  identity-agnostic; ownership is enforced at authenticated application boundaries.

### Real-data and chart policy

- Deterministic fakes and fixtures remain valid for unit, contract, development,
  failure, and reproducibility tests.
- Final/demo evidence must use real Binance history and realtime delivery, a real
  configured News source, real PostgreSQL application/Auth state, and application-
  generated Backtest/Leaderboard results. Mock-only final/demo configuration must
  fail clearly; unavailable external evidence is BLOCKED or UNVERIFIED, never PASS.
- The existing `lightweight-charts` 4.2.3 dependency is retained behind a frontend
  adapter. Do not build a custom candlestick engine or move business logic into it.
- The executable deferred-scope checker remains unchanged from the pre-A-00
  baseline. C-01A must update that narrow gate before adding approved Auth contracts;
  its legacy Auth wording is not product authority.

Enterprise identity features remain deferred: RBAC, organizations/teams, tenant or
workspace hierarchy, OAuth/SSO, 2FA, external identity providers, email
verification, password reset, and enterprise IAM.

## Current dependency order

The immediate critical sequence is:

```text
A-00 (DONE) -> C-01A (READY)
                  +-> D-01 + S-01 -> B-02 / Q-01 ownership work
                  +-> AU-01 fake-repository work --(D-01 DB gate)--+
                                                                  +-> AU-02
F-01 READY -------------------------------> F-AUTH -> F-02 -------+-> I-01 -> I-02
```

E-01 and F-01 are independently READY because their approved pure/foundation work
does not require the new owner-bearing contracts. Do not broaden either packet:
F-01 may build only the chart/client foundation, while Auth UI remains F-AUTH.

## A-00 validation evidence

- Only governance Markdown/OpenSpec artifacts changed, including OpenSpec authority
  context; no executable source, contract, migration, dependency, generated artifact,
  or executable scope/build tooling changed.
- Documentation links and authority/requirement traceability: PASS.
- Architecture, artifact, deferred-scope, and whitespace checks: PASS.
- Strict OpenSpec validation for `mvp-implementation`: PASS.
- Runtime tests were not required for this documentation-only checkpoint; the
  prior C-01 checkpoint's build, typecheck, lint, 49 tests, and reviews remain
  historical evidence rather than newly rerun A-00 claims.

## Fresh-agent restart procedure

1. Confirm branch `MVP_IMPLEMENTATION`, resolve the A-00 HEAD, and verify a clean
   worktree.
2. Read the full authority chain. Treat the later instructor change and reviewed
   `docs/requirements.md` baseline as governing the post-C-01 program.
3. Confirm TASKS shows only C-01A, E-01, and F-01 READY; D-01/S-01 must be BLOCKED.
4. For ownership-sensitive progress, claim C-01A first and follow only its packet.
   It may change canonical executable contracts/tests but may not implement Auth,
   persistence, or capability runtime behavior.
5. Preserve C-01's completed status and frozen pre-change behavior decisions.
   Record post-change additions as C-01A work instead of retroactively editing C-01.
6. Record owner, starting commit, changed paths, validation evidence, and checkpoint
   before changing task state. Report unavailable evidence honestly.
