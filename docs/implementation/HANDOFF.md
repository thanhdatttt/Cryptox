# I-03 Recovery Closure — INS-126

## Applicability and authority

- Current Instructor signal: `INS-126 / APPROVED_FOR_EXECUTION`, authorized by
  `DEC-047`. It supersedes `INS-125 / HOLD` for one bounded recovery review of
  the preserved INS-124 output; it authorizes no retry, replacement,
  reimplementation, downstream task, or I-02 work.
- Canonical checkout: `D:\agy-cli-projects\AOS\Cryptox`, branch
  `MVP_IMPLEMENTATION`, recovery starting HEAD `9d0ee08bb5a8ba2114527049916f12fde3f1bf0d`.
- Reviewed source/business checkpoint: `5e06fdfbc7e959e10c7d7b8f06efa1d36f0fe93b`;
  it is unchanged. The starting working-tree delta was exactly the existing
  I-03 row in `TASKS.md`, preserved
  `apps/backend/src/i03.boundary.integration.spec.ts`, and untouched
  app-generated `.codex/config.toml`.
- The starting authoritative board had exactly 49 task rows: `47 DONE`, `I-03
  IN_PROGRESS`, and `I-02 BLOCKED`. I-03 dependencies `C-02`, `M-03`, `S-04`,
  `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`, `F-03`, `I-01`, and
  `AU-02` were all `DONE`. No prior I-03 Manager or worker remained active;
  the prior INS-124 Manager was terminal with system error.

## Scope and review ownership

- Authorized packet: `I-03 — DEC-007 Boundary Integration and Reproducibility
  Proof` under all DEC-007 extension requirements plus `CSL-R-MD-02`,
  `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-OB-01`, and
  `CSL-R-AR-01`–`03`.
- The preserved artifact was reviewed without modification. It imports only
  public module APIs/bootstrap facades and the approved REST/market-WebSocket
  transport mappers. It uses in-memory fixtures only for deterministic test
  evidence; it does not claim those fixtures are final/demo providers.
- No new implementation worker or verifier was created. The Manager changed
  only the existing I-03 row and this latest handoff; `.codex/config.toml`
  remains unstaged.

## Review result

The preserved artifact is accepted. I-03 transition: `IN_PROGRESS -> REVIEW ->
DONE`. The preserved four-test artifact proves the following public-boundary
joins:

- Allowlisted HTTPS URL import uses bounded safe fetching without credentials,
  creates reviewable extraction provenance/raw-HTML retention, keeps failed
  Sentiment as missing, and passes only normalized News into controlled
  `LLM_AUTHORING_V1`. One bounded provider request, no URL/secret leakage, no
  definition before validation/explicit approval, and cross-owner draft denial
  are asserted.
- Seeded Search uses the public generator registry and submits through the
  public Backtest Execution Port to bounded local paper execution, Evaluation,
  and Leaderboard. Generated Candidates, synthetic Short paper execution
  profile, decimal/provenance fields, Trades, metrics, ranking, and owner
  propagation are asserted. Cross-owner Search, Candidate, Experiment, Trade,
  and Leaderboard reads are rejected. Generator sequence determinism and all
  three approved profile registrations are checked.
- Authenticated market delivery uses the narrow market-only WebSocket. It
  normalizes subscriptions, emits normalized ticks/connection status and
  `MARKET_OBSERVABILITY_V1`, labels the state ephemeral, rejects unauthenticated
  and unknown routes, and emits no Leaderboard or secret-bearing messages.
  Historical REST mapping remains separate from ephemeral delivery.
- Missing final persistence/provider composition fails closed: required
  capabilities are unavailable, readiness is `not-ready`, and provider failure
  details are sanitized from the composition projection.

The final board has exactly 49 task rows: `48 DONE` and `I-02 BLOCKED`. No other
task was started, readied, promoted, or modified, and no downstream task was
started. I-02 remains explicitly blocked even though I-03 is now complete.

## Validation evidence

### PASS

- Focused I-03 suite: `4/4` tests passed.
- Backend typecheck: `npm run typecheck` passed, including
  `tsconfig.auth-e2e.json`.
- Workspace build, typecheck, and lint: PASS.
- Full workspace tests: `415 passed / 8 expected PostgreSQL-gated skips`;
  skips are not live-provider or completion evidence.
- Architecture/dependency checks: PASS — `182 modules, 579 dependencies`
  cruised, no violations; the expected nine forbidden fixtures were detected.
- Source-adjacent artifact check: PASS — no generated module artifacts found.
- Deferred-scope checker and focused suite: PASS; `13/13` cases passed.
- Runtime smoke: PASS — `/live=200`, truthful `/ready=503`, `/health=404`.
- `git diff --check` and preserved-artifact trailing-whitespace scan: PASS.
- Prior independently reviewed real evidence retained from `INS-122`/`DEC-043`
  because the source/business checkpoint is unchanged: Auth/application
  PostgreSQL `18/18`, Strategy PostgreSQL `2/2`, migration up/constraints/down/
  remigrate, configured runtime `/live=200` and `/ready=200`, and read-only
  Binance historical normalization plus realtime `CONNECTED`/`TICK`.

### BLOCKED / UNVERIFIED

- Current `DATABASE_URL` is absent. `npm run db:local:validate` is
  `BLOCKED`: Docker Compose is unavailable (`docker: unknown command: docker
  compose`) and Docker config access is denied. Current PostgreSQL/migration
  evidence is therefore not re-created in this environment.
- Current sandbox direct Binance history and CoinDesk RSS probes failed with
  network `TypeError`; direct Binance realtime also reported unavailable.
  `BINANCE_API_BASE_URL`, `BINANCE_WS_URL`, `COINDESK_API_KEY`, and
  `COINDESK_BASE_URL` are absent. CoinDesk real News and current live-provider
  evidence remain `BLOCKED/UNVERIFIED`; no mock provider is promoted.
- OpenSpec CLI is unavailable and remains `UNVERIFIED`; active artifacts were
  reviewed directly.
- Browser/final-demo evidence is `UNVERIFIED` and is not claimed.
- The eight workspace skips are environment-gated PostgreSQL tests, not PASS
  evidence. The carry-forward PASS items above are explicitly prior evidence,
  not a claim that current unavailable services were rerun.

## Changed paths and stop boundary

- Intended integrated paths are exactly:
  `apps/backend/src/i03.boundary.integration.spec.ts` (preserved artifact),
  the existing I-03 row in `docs/implementation/TASKS.md`, and this latest
  `docs/implementation/HANDOFF.md`.
- No module algorithm, persistence, migration, contract, frontend, queue,
  distributed protocol, general event bus, unrelated source, or governance
  artifact changed. `.codex/config.toml` is untouched and must not be staged.
- The final task transition is `IN_PROGRESS -> REVIEW -> DONE` for I-03 only;
  `I-02` remains `BLOCKED`, and no downstream task is authorized by this
  checkpoint.
