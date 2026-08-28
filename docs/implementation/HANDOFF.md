# MVP Implementation Checkpoint

## Resume here

- **Level 2 control plane:** Active. Read the current
  [`INSTRUCTOR.md`](../control/INSTRUCTOR.md) and durable
  [`DECISIONS.md`](../control/DECISIONS.md) before using this execution checkpoint.
- **Current Instructor signal:** `INS-001` / `HOLD`, reviewed against source/business
  HEAD `791a50031955a39756d41884bd1876d5840aab5e`. No implementation task is
  authorized by the Level 2 bootstrap.
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

Read [`AGENTS.md`](../../AGENTS.md), the Level 2 control artifacts, the complete
authority chain, accepted [`ADR-008`](../adr/ADR_008_simple_auth_and_per_user_ownership.md), the active
[`mvp-implementation` change](../../openspec/changes/mvp-implementation/), the
full [`MVP_PLAN.md`](MVP_PLAN.md), and the mutable [`TASKS.md`](TASKS.md) before
considering any READY packet. READY is not execution authorization.

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

1. Follow the fresh-role startup order in `AGENTS.md`; confirm branch, HEAD, status,
   recent commits, and the complete intervening diff from the Instructor's reviewed
   checkpoint.
2. Read `INSTRUCTOR.md`, `DECISIONS.md`, this checkpoint, `TASKS.md`, the relevant
   `MVP_PLAN.md` packets, and their governing authority.
3. Confirm TASKS shows only C-01A, E-01, and F-01 READY; D-01/S-01 must be BLOCKED.
4. The current `INS-001` status is HOLD. An Orchestrator must not claim, delegate,
   implement, or advance any READY task until a fresh Instructor replaces it with
   a current `APPROVED_FOR_EXECUTION` instruction.
5. After approval, verify that every authorized task is still READY, dependencies
   and write scopes are safe, and the instruction is not stale. Preserve C-01's
   completed history and use C-01A only for the later contract additions.
6. The Orchestrator records the Instruction ID, owner, starting commit, changed
   paths, validation evidence, final task transitions, and latest checkpoint.
   Report unavailable evidence honestly.
