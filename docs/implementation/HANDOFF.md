# INS-101 Manager Checkpoint — AU-02 Search remediation and ownership matrix

## Authorization and execution

- **Authorization / applicability:** The current Instructor signal is exactly
  `INS-101 / APPROVED_FOR_EXECUTION`, committed at
  `90f533f8471571b91c6a1c73136a660d65a493f0`, after the `INS-100 / HOLD`
  checkpoint. The reviewed checkpoint is `9d2d6d9`; the only material delta
  from that checkpoint to the authorization commit was the committed
  Instructor change in `docs/control/DECISIONS.md` and
  `docs/control/INSTRUCTOR.md`. No source, business-state, or task-DAG drift
  was found before execution.
- **Manager and checkout:** Manager `01a052f7-aef4-7e50-af7c-39eff3156e4f`
  worked directly in `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`. The app-generated `.codex/config.toml` remained
  unmodified, unstaged, and undeleted.
- **Worker:** Exactly one fresh sequential internal worker was created:
  Archimedes `01a052ff-2bd6-7873-8df2-5186d8718bdc`. It edited only the
  authorized Search source/test paths, did not stage or commit, and was closed
  after its bounded pass. No second worker, retry, replacement, duplicate,
  user-visible child, or downstream packet was created. After the worker
  stopped, the Manager made only a narrow review addition to the existing
  cross-module integration test to complete the requested matrix assertions.
- **State transition:** AU-02 moved exactly `REVIEW → READY → IN_PROGRESS →
  REVIEW → DONE`. `I-01`, `I-02`, and `I-03` remain `BLOCKED`; no other task
  state changed.
- **Scope:** The reviewed diff is limited to `modules/search/application/**`
  plus the Manager-owned `TASKS.md` and this checkpoint. No contracts,
  migrations, dependencies, generated files, News, Market Data, frontend,
  unrelated routes, pure algorithms, or policy files were changed.

## AU-02 remediation

The concrete failure was a Search lifecycle race: `drive()` reached
`MAX_CANDIDATES` immediately after accepting an asynchronous candidate and
terminalized the SearchRun while Backtesting still reported that candidate as
active. The persisted SearchRun could therefore report
`completedCandidateCount: 0` instead of `1`.

`modules/search/application/service.ts` now treats `MAX_CANDIDATES` and
`NO_IMPROVEMENT` as submission bounds. When accepted candidates remain active,
Search keeps its run `RUNNING`, schedules its existing bounded poll, refreshes
Backtesting progress, and terminalizes only after the accepted candidates have
published terminal states. `MAX_DURATION` retains its cancellation behavior.
`service.spec.ts` adds a delayed-candidate regression. The real integration
now passes the same Backtesting experiment repository into the Leaderboard
adapter, so admission and ranking use the authoritative completed Experiment
created by the public Backtesting boundary. No assertion was weakened, no
timeout was used as a fix, and the expected completed count remains `1`.

## Complete two-user ownership/security matrix

The matrix below is evidenced by the real PostgreSQL-backed Search integration
(`modules/search/application/integration.spec.ts`), the public module APIs it
composes, the existing owner-focused application suites, and the real backend
Auth smoke. Isolated tests are supporting evidence only; the real SearchRun
database path is the AU-02 integration gate.

| Resource / behavior | A/B evidence and applicable operation | Result |
|---|---|---|
| Backend private boundary / unauthenticated access | Real backend Auth E2E returns HTTP 401 for `/auth/current-user` without a session; controller contract also passes the 401 assertion. | **PASS** |
| Private business REST routes | No Strategy/Search/Backtesting/Leaderboard business REST controllers are composed in the current backend; their public application APIs are tested below, and no nonexistent HTTP route is claimed. | **N/A** |
| Trusted identity and client spoof resistance | Backend passes a server-derived context separately; the real Search command carries a spoofed `ownerUserId: ownerB` under owner A's context but persists the run and Candidate as owner A; a Leaderboard submission carrying owner A's identity is rejected under owner B's context. | **PASS** |
| StrategyDefinition read/list/ownership | Public integration: owner A reads its definition, owner B receives `NOT_FOUND`; the Strategy application suite also proves owner-filtered collections and reads. | **PASS** |
| CompositeDefinition ownership | Public integration: owner A reads its CompositeDefinition, owner B receives `NOT_FOUND`, and owner B cannot compose owner A's components. | **PASS** |
| SearchRun start/status/list | Real PostgreSQL SearchRun is created and completed for owner A; owner A's list contains it and owner B's owner-filtered list is empty; owner B status is `NOT_FOUND`; unauthenticated status is `UNAUTHENTICATED`. | **PASS** |
| SearchRun pause/resume/cancel/rank | Owner B receives `NOT_FOUND` for pause, resume, and cancel; owner A ranks the completed run; owner B receives `NOT_FOUND` for the private Search ranking and unauthenticated ranking is rejected. | **PASS** |
| SearchRun update/delete | No update or delete operation exists on the approved public SearchRun API; lifecycle is append-only/state-machine controlled. | **N/A** |
| SearchRun → Candidate submit/propagation | Search submits through the public Backtesting API with the trusted owner context; the real Candidate is owner A, owner B's guessed submit is `NOT_FOUND`, and owner B's Candidate collection is empty. | **PASS** |
| Candidate read/status/list | Owner A reads the completed Candidate and lists one item; owner B receives `NOT_FOUND` for status and an empty owner-filtered list; unauthenticated status is rejected. | **PASS** |
| Candidate cancel | Owner B's guessed Candidate cancellation is `NOT_FOUND`; same-owner active cancellation and terminal guards pass in the Search/Backtesting application suites. | **PASS** |
| Candidate update/delete | No update or delete operation exists on the approved Candidate public API. | **N/A** |
| Candidate → Experiment inheritance | Owner A reads one completed Experiment and lists it for the SearchRun; owner B receives `NOT_FOUND` for the guessed Experiment and an empty SearchRun Experiment list. | **PASS** |
| Experiment → Trade inheritance | Owner A lists the Experiment's Trades; owner B receives `NOT_FOUND` for the same guessed Experiment's Trades. | **PASS** |
| LeaderboardScope read/create ownership | Owner A reads its scope; owner B receives `NOT_FOUND`; unauthenticated scope read is rejected; scope creation derives owner from context in the application suite. | **PASS** |
| LeaderboardEntry admission | The completed owner-A Experiment is admitted through the same-owner completion path and a same-owner duplicate submit is admitted idempotently; owner B's guessed submission is `NOT_FOUND`. | **PASS** |
| Leaderboard top-K/rank | Owner A sees one top-K entry and one ranked Search result; owner B receives `NOT_FOUND` for the private scope and an empty owner-filtered Search ranking. | **PASS** |
| Approved shared-data visibility | RankingConfiguration, Market Data snapshots, and Strategy plugin descriptors remain shared; the integration uses shared ranking configuration/market input and the architecture/dependency gate passes without user ownership on those shared roots. | **PASS** |
| Auth independence of pure work | Pure Strategy execution, Backtest simulation, Evaluation, and ranking tests pass without Auth infrastructure; architecture/dependency validation remains clean. | **PASS** |
| Sensitive logging | Reviewed active source has only safe module/readiness logs; no password, raw credential, cookie, session token, token digest, or credential-bearing expression is logged. Auth controller redaction tests pass. | **PASS** |

## Validation and environment status

- **PASS:** Process-local PostgreSQL checks returned the expected databases:
  `cryptox_development` on `127.0.0.1:55432` and `cryptox_test` on
  `127.0.0.1:55433`. Password and connection strings were never printed.
- **PASS:** Real Auth PostgreSQL integration — 3/3 tests.
- **PASS:** Real backend Auth E2E — 1/1 test, including HTTP 401, registration,
  current-user restoration, invalid-login equivalence, and logout revocation.
- **PASS:** Real Search integration — 1/1 test against `cryptox_test`, including
  PostgreSQL persistence, public Search → Backtesting → Leaderboard execution,
  completed count `1`, owner A success, and owner B isolation.
- **PASS:** Search application regression — 13/13 tests; full Search package —
  33 passed with its no-URL PostgreSQL test skipped.
- **BLOCKED / superseded attempt:** An initial concurrent package fan-out hit
  the Auth Argon2 test's 5-second timeout under CPU contention. The isolated
  Auth rerun passed, and the final serial `npm run verify:stage4a` passed; the
  transient contention result is not used as final gate evidence.
- **PASS:** `npm run verify:stage4a` — build, typecheck, 386 workspace tests
  passed with 6 environment-gated skips, architecture/dependency validation,
  source-sidecar validation, deferred-scope validation, and backend runtime
  smoke (`/live=200`, `/ready=503`, `/health=404`). The architecture helper
  reported its 9 expected forbidden-dependency fixtures while exiting 0.
- **PASS:** `npm run lint`, `npm run test:scope-check` (13/13), and
  `git diff --check`.
- **PASS:** Secret-log review, exact changed-path review, and generated-artifact
  review. The only untracked path is the untouched app-generated
  `.codex/config.toml`.
- **UNVERIFIED:** Docker daemon, Docker Compose, and standalone `psql`; direct
  process-local Node PostgreSQL checks and the application integrations were
  used instead. No elevated retry, install, credential change, volume reset,
  cloud database, or secret request was made.
- **UNVERIFIED:** OpenSpec CLI; the host command is unavailable and no install
  or network fallback was attempted.
- **UNVERIFIED:** PDF text extraction; the assignment PDF exists and its
  repository-recorded hash is present, but local `pypdf`/`pdfplumber` modules
  are unavailable. No assignment detail was inferred from this missing tool.

## Changed paths and commit boundary

- `modules/search/application/service.ts`
- `modules/search/application/service.spec.ts`
- `modules/search/application/integration.spec.ts`
- `docs/implementation/TASKS.md`
- `docs/implementation/HANDOFF.md`

One coherent Manager staging/commit attempt for exactly these five tracked
paths was made. Git denied staging with
`fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`;
no commit was created and no staging/commit retry was made. The
`.codex/config.toml` path remains untracked, untouched, and unstaged.
# Historical INS-099 Manager Checkpoint — AU-02 Completion Ownership Matrix

## Authorization and execution

- **Authorization:** `INS-099 / APPROVED_FOR_EXECUTION` is committed at
  `ad755c4cb62522f533b5a503de0c77ae248453e6` and supersedes the reviewed
  `INS-098 / HOLD` checkpoint at `8e73cb9`. It authorized exactly one fresh
  internal worker for one bounded AU-02 attempt. No retry, replacement,
  duplicate, downstream packet, or I-01/I-02/I-03 work was authorized.
- **Manager and checkout:** Manager `01a052b9-d343-7a03-8afe-764016f38d9f`
  operated directly in `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, starting from the applicable authorization checkpoint.
  The reviewed base was `8e73cb9`; no source, business, or task-DAG drift was
  found. The app-generated untracked `.codex/config.toml` remained untouched,
  unstaged, and undeleted.
- **Worker:** Exactly one fresh sequential worker was created: Dirac
  `01a052d3-6f0c-7283-9732-4978b33d9186`. It was closed after the Manager's
  bounded stop instruction. No other worker, replacement, retry, or
  user-visible child was created; no worker remains active.
- **Scope review:** Dirac inspected the governing material and scoped
  Auth/Strategy/Search/Backtesting/Leaderboard/backend source, but made no
  source or test change. No outside-scope dependency was identified. The
  allowed implementation boundary was limited to the six path families named
  by INS-099; contracts, migrations, dependencies, generated files, News,
  Market Data, frontend, unrelated routes, policy, pure algorithms, and other
  packets were not touched.

## Task state and required acceptance

- **Transition:** AU-02 moved `REVIEW → READY → IN_PROGRESS → REVIEW`; the
  final board is `39 DONE`, `1 REVIEW` (`AU-02`), and `3 BLOCKED`
  (`I-01`, `I-02`, `I-03`). No other task moved. AU-02 is not `DONE`.
- **Requirements:** `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-ST-04`,
  `CSL-R-SE-01`, `CSL-R-SE-02`, `CSL-R-BT-01`, `CSL-R-LB-01`, and
  `CSL-R-OB-01`, governed by ADR-008 and the AU-02 packet in `MVP_PLAN.md`.
- **Closure rule:** Fixture-only or isolated per-module evidence cannot close
  AU-02. The complete resource-by-resource A/B matrix and applicable real
  PostgreSQL/Auth/Search integration are required.

## Matrix evidence

The fresh workspace suites passed their existing module tests, but Dirac added
no cross-module tests and ran no worker tests before the authorized stop. The
following records the boundary evidence without treating it as complete AU-02
acceptance.

| Resource / behavior | Existing evidence | AU-02 status |
|---|---|---|
| Unauthenticated private boundary | Backend Auth controller suite covers `/auth/current-user` rejection; 401 behavior passed. No private business REST boundary exists in this packet. | **PASS** where applicable; complete private-resource matrix **UNVERIFIED** |
| StrategyDefinition | Strategy owner predicates and trusted context are present; Strategy suite 116/116 passed. | **UNVERIFIED** for required cross-user/same-owner cross-module A/B proof |
| CompositeDefinition | Composite owner checks and public API composition are present; Strategy suite 116/116 passed. | **UNVERIFIED** for required cross-user/same-owner cross-module A/B proof |
| SearchRun lifecycle | Search owner filtering and pause/resume/cancel/status/list paths are present; Search suite 32 passed / 1 environment skip. | **BLOCKED** for real integrated lifecycle evidence; cross-module A/B proof remains **UNVERIFIED** |
| Candidate | Backtesting owner-scoped candidate reads, lists, and cancellation are present; Backtesting suite 43/43 passed. | **UNVERIFIED** for complete cross-module A/B proof |
| Experiment and Trade | Inherited owner lookups and owner-filtered trade reads are present; Backtesting suite 43/43 passed. | **UNVERIFIED** for required cross-module A/B proof |
| LeaderboardScope and Entry | Owner-scoped scope/entry reads and owner-filtered ranking paths are present; Leaderboard suite 22/22 passed. | **UNVERIFIED** for complete cross-user/same-owner submit/rank proof |
| SearchRun → Candidate propagation | Search passes trusted owner context into the public Backtesting submission path; the real integration reached PostgreSQL but observed `completedCandidateCount` 0 rather than 1 at `modules/search/application/integration.spec.ts:377`. | **BLOCKED**; no fresh two-user AU-02 matrix test was completed |
| Trusted identity and spoof resistance | Commands omit client ownership authority and services derive owner from authenticated context; existing contract/application tests pass. | **UNVERIFIED** as a complete matrix across all resources |
| Approved shared-data visibility | Shared market/ranking/plugin policy is preserved in reviewed source and contracts. | **UNVERIFIED** without the required integrated A/B evidence |
| Sensitive logging | Static review found only backend active-module/readiness logs and no credential-bearing log expression; forbidden sensitive-log search returned no matches. | **PASS** for reviewed source; matrix closure still **UNVERIFIED** |

## Environment and validation

- **PASS:** Previously completed redacted process-local Node `pg` checks passed
  `SELECT current_database()` for `cryptox_development` at
  `127.0.0.1:55432` and `cryptox_test` at `127.0.0.1:55433`.
- **UNVERIFIED:** Docker daemon, Docker Compose, and standalone `psql` CLI.
  The pending elevated approval was treated as unavailable; no failed
  elevated command was retried. The direct connectivity premise does not prove
  application-level Auth/Search integration.
- **PASS:** Real Auth PostgreSQL integration passed 3/3 against the documented
  `cryptox_development` database using the process-local configuration.
- **BLOCKED:** Real Search PostgreSQL integration reached the documented
  `cryptox_test` database but failed at
  `modules/search/application/integration.spec.ts:377`: `completedCandidateCount`
  was `0` rather than the expected `1`. No source fix or test retry was made.
  Skipped PostgreSQL-gated tests are not PASS evidence.
- **PASS:** `npm run verify:stage4a`: workspace builds and typechecks; 385
  workspace tests passed with 6 environment-gated skips; dependency-cruiser
  and architecture rules completed; source-sidecar and deferred-scope checks
  completed; backend smoke returned `/live=200`, `/ready=503`, `/health=404`.
- **PASS:** `npm run lint` completed across all workspaces, including backend
  Auth-E2E and contract-test typechecks.
- **PASS:** `npm run test:scope-check` returned 13/13 passing tests.
- **PASS:** `git diff --check` reported no whitespace errors.
- **PASS:** Exact changed-path review found only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`; no
  AU-02 source/test path, contract, migration, dependency, generated,
  frontend, News, Market Data, or unrelated path changed. `.codex/config.toml`
  remains untracked and untouched.
- **UNVERIFIED:** OpenSpec CLI; the host command is unavailable and no install
  or network fallback was attempted.

## Closure and safe stop

- Dirac's final handoff reports no changed paths, no fixes, and no worker tests.
  Manager validation established real Auth 3/3, but the real Search integration
  is BLOCKED by the concrete candidate-count failure and the complete matrix
  remains unproven, so AU-02 stays `REVIEW`.
- No downstream packet was started, promoted, retried, or reopened. I-01,
  I-02, and I-03 remain `BLOCKED`.
- **Commit result:** The one coherent Manager staging attempt for the exact two
  Manager-owned checkpoint files was denied with `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No
  commit was created and no retry was made. `.codex/config.toml` and every
  other path remained unstaged.

# Historical INS-095 Manager Checkpoint — M-02 Realtime Evidence Closure Review

## Resume here

- **Authorization:** `INS-095 / APPROVED_FOR_EXECUTION` is committed at
  `9127700fec29cdfe9d5fed9f1c5bc64b8d4ea999` and supersedes `INS-094 / HOLD`
  at `8556c43`. It authorizes exactly one fresh Manager for a bounded,
  evidence-only M-02 review. No worker, source rework, retry, replacement,
  duplicate, or downstream packet is authorized.
- **Canonical checkout and applicability:**
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, starting at
  `9127700fec29cdfe9d5fed9f1c5bc64b8d4ea999`. The reviewed authorization delta
  `8556c43..9127700` changes only `docs/control/INSTRUCTOR.md` and
  `docs/control/DECISIONS.md`; no source, business-state, or task-DAG drift
  occurred during INS-095. The existing M-02 implementation checkpoint is
  `5160c1c623347fe75c945e00603c6f11adf92ae7`. Later authorized M-03 changes
  are already present in the current Market Data provider/test tree and were
  not edited by this review.
- **Starting task state:** Before this review, `TASKS.md` recorded `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). M-01
  and F-01 were `DONE`; all other task states and dependencies were preserved.
- **Workers and scope:** No worker or subagent was created because INS-095
  provides no independent implementation write scope. The Manager changed
  only `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  The prior INS-014 implementation worker was not retried or reused.

## M-02 source and packet review

- **Requirement IDs:** `CSL-R-MD-02`, `CSL-R-FE-01`, `CSL-R-OB-01`,
  `CSL-R-AR-02`, `CSL-R-DM-01`, and `CSL-R-RD-01`.
- **Existing source/test boundary:**
  `modules/market-data/infrastructure/binance-realtime.ts` and
  `modules/market-data/infrastructure/binance-realtime.spec.ts`, with the
  M-02 socket-error recovery change recorded at `5160c1c`. The reviewed code
  normalizes market ticks/candles, updates same-timestamp candles, appends
  later candles, suppresses duplicate/unseen out-of-order closed candles,
  reconciles bounded REST gaps before continuation, resubscribes with bounded
  backoff, handles socket errors, isolates provider failures, and shuts down
  without creating replacement sockets. Current Market Data tests also cover
  the later accepted observability extension; no source or test file was
  changed under INS-095.
- **Closure decision:** M-02 moved exactly `REVIEW -> DONE` under INS-095 only
  after the packet-local evidence and the fresh public Binance smoke below
  both passed. This is packet closure, not final integration or demo closure.

## Validation evidence and exact commands

- **PASS:** `npm --workspace @cryptox/market-data test -- infrastructure/binance-realtime.spec.ts`
  — 1 file, 12/12 tests.
- **PASS:** `npm --workspace @cryptox/market-data test` — 6 files passed,
  31 tests passed; 1 PostgreSQL integration test skipped because its environment
  gate was unavailable.
- **PASS:** `npm --workspace @cryptox/market-data run typecheck`.
- **PASS:** `npm --workspace @cryptox/market-data run lint`.
- **PASS:** `npm --workspace @cryptox/market-data run build`.
- **PASS:** `npm run verify:stage4a` — exit 0; workspace build/typecheck,
  385 tests passed with 6 environment-gated skips, architecture dependency
  validation, artifact validation, deferred-scope validation, and runtime
  smoke all passed. Runtime smoke reported `/live=200`, `/ready=503`,
  `/health=404`. The architecture rules command reported its 9 expected
  forbidden-dependency fixtures while exiting successfully; this is not
  feature-provider or final integration evidence.
- **PASS:** `npm run test:scope-check` — 13/13.
- **PASS:** `git diff --check`.
- **Not claimed:** Docker/PostgreSQL integration remains `BLOCKED` where its
  environment gate is unavailable. OpenSpec CLI, full feature REST/market-WS
  composition, real News, Auth/application persistence, and browser/demo
  evidence remain `UNVERIFIED` or `BLOCKED`; fixture tests and skips are not
  substituted for those gates.

## Public Binance realtime smoke

The one authorized attempt used the existing compiled Market Data API bootstrap
after the read-only package build. No credentials, cookies, or secrets were
provided or logged. The exact command was:

```text
node -e '(async () => { const { createBinanceRealtimeProvider } = require("./modules/market-data/dist/modules/market-data/api/bootstrap.js"); const endpoint = "wss://stream.binance.com:9443/ws"; const startedAt = Date.now(); const updates = []; const observations = []; let normalizedSeen = false; let resolveNormalized; const normalizedDelivery = new Promise((resolve) => { resolveNormalized = resolve; }); let provider; let unsubscribe; let deadlineTimer; let forcedTimeout = false; let cleanupError; const sink = (update) => { if (updates.length >= 20) return; if (update.kind === "CONNECTION_STATUS") { updates.push({ kind: "CONNECTION_STATUS", status: update.payload.status }); return; } if (update.kind === "TICK") { normalizedSeen = true; updates.push({ kind: "TICK", pair: update.payload.pair, timestamp: update.payload.timestamp }); resolveNormalized(); return; } if (update.kind === "CANDLE") { normalizedSeen = true; updates.push({ kind: "CANDLE", pair: update.payload.pair, timestamp: update.payload.timestamp, isClosed: update.payload.isClosed }); resolveNormalized(); } }; let errorMessage; try { provider = createBinanceRealtimeProvider({ maxReconnectAttempts: 1, reconnectBaseDelayMs: 250, reconnectMaxDelayMs: 250, observability: { record: (event) => observations.push({ type: event.type, detail: event.detail }) } }); deadlineTimer = setTimeout(() => { forcedTimeout = true; void provider.shutdown().catch(() => undefined); }, 8000); unsubscribe = await provider.subscribe([{ pair: "BTCUSDT", timeframe: "1m" }], sink); if (!normalizedSeen) await Promise.race([normalizedDelivery, new Promise((resolve) => setTimeout(resolve, 3000))]); } catch (error) { errorMessage = error instanceof Error ? error.message : String(error); } finally { if (deadlineTimer) clearTimeout(deadlineTimer); try { if (unsubscribe) await unsubscribe(); } catch (error) { cleanupError = error instanceof Error ? error.message : String(error); } try { if (provider) await provider.shutdown(); } catch (error) { cleanupError = cleanupError ?? (error instanceof Error ? error.message : String(error)); } } const statuses = updates.filter((update) => update.kind === "CONNECTION_STATUS").map((update) => update.status); const connected = statuses.includes("CONNECTED"); const shutdown = cleanupError ? "UNVERIFIED" : "PASS"; let outcome = "UNVERIFIED"; if (forcedTimeout) outcome = "UNVERIFIED_TIMEOUT"; else if (errorMessage) outcome = "UNVERIFIED_PROVIDER_FAILURE"; else if (connected && normalizedSeen && shutdown === "PASS") outcome = "PASS"; else if (!connected) outcome = "UNVERIFIED_NO_CONNECTION"; else if (!normalizedSeen) outcome = "UNVERIFIED_NO_NORMALIZED_DELIVERY"; console.log(JSON.stringify({ outcome, elapsedMs: Date.now() - startedAt, endpoint, connectionStatuses: statuses, normalizedDelivery: normalizedSeen, updates, providerObservations: observations, shutdown, providerError: errorMessage ?? null, cleanupError: cleanupError ?? null, reconnectLimit: 1 })); })()'
```

Observed result (provider-safe summary):

- **PASS:** outcome `PASS`; elapsed time `746 ms`; endpoint
  `wss://stream.binance.com:9443/ws`.
- **PASS:** connection status `CONNECTED`; normalized delivery was `true`.
  One normalized `TICK` was delivered for `BTCUSDT` at
  `2026-08-30T11:28:49.655Z`.
- **PASS:** shutdown status `DISCONNECTED`; cleanup `PASS`.
- **PASS:** provider observations were empty; provider error and cleanup error
  were both `null`.
- **Bound:** the attempt allowed one reconnect with a 250 ms ceiling and had
  an 8-second hard deadline. The live connection did not need to reconnect, so
  live reconnect itself is not claimed; bounded reconnect/gap behavior remains
  covered by the deterministic suite.

## Closure and explicit stop boundary

- The resulting board is `39 DONE`, `0 REVIEW`, and `4 BLOCKED` (`AU-02`,
  `I-01`, `I-02`, `I-03`). No task other than M-02 moved, and no downstream
  task was started, reopened, or promoted.
- This checkpoint does not claim final runtime/demo completion. Final feature
  transport, real News, PostgreSQL/Auth application state, browser/demo,
  ownership integration, and remaining integration gates are outside INS-095.
- INS-095 is exhausted after this bounded review. Renewed Instructor review is
  required before AU-02, I-01, I-02, I-03, or any downstream/retry work.
- **Commit scope:** one coherent staging/commit attempt is authorized for
  exactly `docs/implementation/TASKS.md` and this file; no other path is
  eligible for staging under INS-095. The Git result and final HEAD are
  reported at the stop boundary.

# Historical INS-091 Manager Checkpoint — F-03 Packet Closure and Checkpoint Reconciliation

## Resume here

- **Authorization:** `INS-091 / APPROVED_FOR_EXECUTION` at
  `cb0f8fc88f371a7fcfc98930f01b37469523f2e1` supersedes
  `INS-090 / HOLD` at `1926142aaa20b4c0576002e66e859fef40a60566`. It authorizes
  exactly one fresh Manager for governance-only F-03 closure reconciliation:
  no worker, source implementation, retry, replacement, duplicate, or
  downstream packet.
- **Canonical checkout:** `D:/agy-cli-projects/AOS/Cryptox` on branch
  `MVP_IMPLEMENTATION`; the authorization base was clean. The committed F-03
  source checkpoint is `6a4e86e1011806f1e2e9f3017d343e00d1cf7971`, and the
  current HEAD is its control-plane descendant. No alternate checkout,
  worktree, branch, cloud task, or user-facing child task was used.
- **Control-plane preconditions:** Before this reconciliation, `TASKS.md` was
  `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and `4 BLOCKED` (`AU-02`, `I-01`,
  `I-02`, `I-03`). F-03 dependencies `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`,
  `B-03`, `N-03`, `E-02`, and `L-02` were `DONE`; no competing active
  Cryptox Manager or worker was found.
- **Prior execution identity:** The exact repository-recorded INS-089 identity
  was `INS-089 Manager` with exactly one fresh internal Frontend worker Darwin
  (`01a05209-7eaa-7162-b10c-4cdf849258f2`). Darwin made no commit or
  control-plane edit; that bounded execution and its independent audit are
  closed. No historical worker was resumed or reused.
- **State transition:** Prior execution recorded exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW`. Under INS-091, and only for this
  packet, F-03 now transitions `REVIEW -> DONE`. No other task moved.

## Scope and source reconciliation

- **Requirement IDs:** `CSL-R-MD-03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-FE-01`, and
  `CSL-R-DM-01`.
- **Committed delta:** `git diff --name-status` from the INS-089 starting
  commit `3945fb09286e062446cd95b55b6714bc1bbdda3b` to the F-03 source
  checkpoint `6a4e86e` contains exactly four paths: the two Manager control
  records and only `apps/frontend/src/features/screens.tsx` plus
  `apps/frontend/src/features/screens.spec.tsx`. `git diff --check` passes.
  The source/test paths are committed at `6a4e86e`; the F-03 implementation is
  not uncommitted. From `6a4e86e` through the authorization HEAD, the only
  changes are the Instructor-owned `INSTRUCTOR.md` and `DECISIONS.md`; there
  is no source or business-state drift.
- **Approved boundary:** The two screen paths remain within the
  `apps/frontend/**` projection/test scope. No backend, module, contract,
  migration, provider, manifest, lockfile, generated artifact, transport,
  persistence, client-identity, browser, or business-calculation change is
  included.

### Projection and backend source ledger

The following are read-only authoritative inputs for the projections. No
backend, module, contract, or provider path changed under INS-091.

- **Market observability and charts:**
  `packages/contracts/rest/market-data.ts`,
  `packages/contracts/websocket/market-data.ts`,
  `modules/market-data/api/contracts.ts`, and the previously audited market
  bridge/projection at `122569c`:
  `apps/frontend/src/market/chart-state.ts`,
  `apps/frontend/src/market/remote-source.ts`,
  `apps/frontend/src/market/types.ts`,
  `apps/frontend/src/market/clients.ts`, and
  `apps/frontend/src/components/MarketChart.tsx`. The market observability
  payload is ephemeral/latest-100 and is not history or backtest data.
- **Feature composition and state:**
  `apps/frontend/src/features/state.ts`,
  `apps/frontend/src/features/types.ts`, and
  `apps/frontend/src/features/clients.ts` supply the typed workspace state
  consumed by `apps/frontend/src/features/screens.tsx`.
- **Strategy authoring, descriptors, and composites:**
  `packages/contracts/rest/strategy.ts` and
  `modules/strategy/api/contracts.ts`. The screen renders supplied origin,
  descriptor, composite, weighted, and visualization metadata; LLM draft,
  validation, Save, and Approve remain explicitly unavailable because no
  frozen transport is composed.
- **Search and discovery:**
  `packages/contracts/rest/search.ts`,
  `modules/search/api/contracts.ts`,
  `modules/search/application/service.ts`,
  `modules/search/application/memory.ts`, and
  `modules/search/infrastructure/postgres.ts`. The screen renders supplied
  run status and seeded provenance; only the existing composed RANDOM start is
  enabled, while unsupported seeded starts remain explicit.
- **Experiments, paper execution, evaluation, and visualizations:**
  `packages/contracts/rest/backtesting.ts`,
  `packages/contracts/rest/evaluation.ts`,
  `modules/backtesting/api/contracts.ts`, and
  `modules/evaluation/api/contracts.ts`. The screen displays supplied paper
  direction, exits, SL/TP, fee, slippage, decimal, trade, visualization,
  metric, and provenance values; it performs no business calculation and
  submits no live orders.
- **Leaderboard and ranking:**
  `packages/contracts/rest/leaderboard.ts` and
  `modules/leaderboard/api/contracts.ts`. Scope, ranking configuration/formula,
  entries, and provenance are supplied read-only values.
- **News extraction and Sentiment:**
  `packages/contracts/rest/news.ts`,
  `modules/news/api/contracts.ts`, and
  `modules/sentiment/api/contracts.ts`. The screen renders extraction source,
  canonical URL/hash/time/retention/template status and keeps News usable for
  supplied `AVAILABLE`, `MISSING`, or `DEGRADED` Sentiment states.

## INS-089 execution review carried into closure

- Darwin changed only `apps/frontend/src/features/screens.tsx` and
  `apps/frontend/src/features/screens.spec.tsx`; the Manager’s prior narrow
  acceptance review stayed within those paths. The accepted slice projects
  unavailable authoring, origin and descriptor metadata, generic composites
  and weighted values, Search generator/provenance/status data, supplied
  paper/Trade/result provenance, and News extraction plus Sentiment states.
- Seeded profiles are shown only when supplied; absent values are
  `not supplied/not yet composed`. Opaque paper provenance is rendered
  generically. The result view displays supplied values with explicit paper and
  no-live-order wording. There is no URL fetch, LLM call, transport addition,
  persistence change, client-identity bypass, strategy-name branch, deferred
  scope leak, or browser-generated evidence.

## Validation evidence

- **PASS:** Focused F-03 test — `npm --workspace @cryptox/frontend test --
  src/features/screens.spec.tsx` — 3/3 (rerun during this reconciliation).
- **PASS:** Full Frontend suite 33/33; root suite 385 passed with 6
  environment-gated skips; Frontend/root typecheck, build, and lint.
- **PASS:** Architecture, artifacts, deferred-scope, and scope checks
  (13/13); whitespace and reviewed-diff checks.
- **PASS (limited):** Runtime smoke health evidence (`/live=200`, `/ready=503`,
  `/health=404`); this does not prove feature REST/WebSocket composition.
- **BLOCKED:** Docker/PostgreSQL validation because Docker Compose/config access
  is unavailable. No database evidence is claimed.
- **UNVERIFIED:** OpenSpec CLI, live Binance/News/provider traffic, real feature
  REST and market-WebSocket composition, and browser/demo evidence. Fixture
  tests and environment-gated skips do not become final integration/demo PASS.

## Closure and stop boundary

- F-03 is `DONE` only at its approved packet-local frontend projection
  boundary under INS-091. The resulting board is `38 DONE`, `1 REVIEW` (`M-02`),
  and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). This does not claim that
  the MVP, final integration, or instructor demo is complete.
- No worker was created under INS-091 because the authorization was explicitly
  governance-only and the prior Darwin implementation was committed at
  `6a4e86e` and independently audited. No source file was edited here. Stop
  before I-03, I-01, AU-02, I-02, live-provider, database, or browser/demo work;
  do not start newly unlocked work.
- **INS-091 Manager commit outcome:** The one coherent staging/commit attempt
  for this reconciliation failed before staging with the exact error:
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`.
  No retry occurred. The Instructor preserved the checkpoint in `9ed13bc`;
  this was not an INS-091 Manager commit.

# INS-087 Manager Checkpoint — F-03 Checkpoint Record Reconciliation

## Resume here

- **Authorization:** `INS-087 / APPROVED_FOR_EXECUTION` at current signal
  commit `6bc256a229d0c167b3f8b5a67db8a588044f812a` authorizes exactly one
  fresh Manager in the canonical same-directory checkout to reconcile the
  stale Manager-owned `TASKS.md` and `HANDOFF.md` records. This is
  governance-only. No source implementation, F-03 residual work, worker,
  downstream packet, retry, replacement, duplicate, or user-facing task is
  authorized.
- **Canonical checkout:** `D:/agy-cli-projects/AOS/Cryptox` on branch
  `MVP_IMPLEMENTATION`.
- **Audited checkpoint:** The Instructor audited and committed the exact
  eleven-path F-03 source/control delta at `122569c`
  (`feat(frontend): add market observability projection seams`): the nine
  effective frontend source paths listed below plus
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  `122569c` is an ancestor of current HEAD; the source/business tree is clean
  and unchanged since that checkpoint, and no uncommitted F-03 delta remains.
- **Instructor HOLD being reconciled:** `INS-086 / HOLD` at `376dcbc`
  (`docs(control): hold after partial F-03 review`). `INS-087` supersedes it
  only for this record reconciliation.
- **Dependencies:** `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`,
  `E-02`, and `L-02` were verified `DONE`. `M-02` remains `REVIEW`, while
  `AU-02`, baseline `I-01`, `I-02`, and `I-03` remain blocked. No downstream
  packet was started or promoted.
- **Task state:** `TASKS.md` remains authoritative at `37 DONE`, `2 REVIEW`
  (`M-02`, `F-03`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03
  remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and is not `DONE`.
- **Prior execution and worker:** The INS-085 execution found no competing
  Cryptox Manager or Frontend worker. Exactly one internal worker was
  dispatched: Descartes (`01a051c9-fe30-7a32-8b24-a3878e278323`). No worker
  was created for this INS-087 governance-only reconciliation.
- **State transition:** Only F-03 moved exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`. The worker stopped safely with
  partial edits; the Manager independently reviewed the result, and the
  Instructor later audited and committed the exact eleven-path delta at
  `122569c`. F-03 is not `DONE` and requires
  `NEEDS_INSTRUCTOR_REVIEW`.

## Execution boundary

- **Requirement IDs:** `CSL-R-MD-03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-FE-01`, and
  `CSL-R-DM-01`.
- **Worker scope:** `apps/frontend/**` only, excluding generated/build output
  and dependencies. Frozen REST/WebSocket contracts, backend/module source,
  migrations, providers, manifests/lockfiles, policy documents, and control
  files were protected. The worker made no commit and no control-plane edit.
- **Manager scope:** The INS-085 Manager owned review/integration safety work
  plus the Manager-owned `docs/implementation/TASKS.md` and this
  `HANDOFF.md`; no frontend feature slice was reimplemented by the Manager.
  INS-087 permits only this two-file record reconciliation.

## Worker result and independent review

- **Worker result:** Descartes began market observability, recovery-state, and
  private-cache projection changes, then stopped safely after its feature
  screen rewrite was incomplete. Its attempted `features/screens.tsx` deletion
  and new `features/projections.ts` helper were not accepted: the Manager
  restored `features/screens.tsx` byte-for-byte from the reviewed base and
  removed the unreferenced partial helper as review-safety cleanup. The initial
  transient `App.tsx` prop change also has no effective diff. The accepted
  effective delta was later audited and committed by the Instructor at
  `122569c`; no uncommitted F-03 implementation delta remains.
- **Effective frontend source paths:**
  `apps/frontend/src/auth/cache.ts`,
  `apps/frontend/src/components/MarketChart.tsx`,
  `apps/frontend/src/features/state.ts`,
  `apps/frontend/src/features/types.ts`,
  `apps/frontend/src/market/chart-state.ts`,
  `apps/frontend/src/market/clients.ts`,
  `apps/frontend/src/market/fixture-source.ts`,
  `apps/frontend/src/market/remote-source.ts`, and
  `apps/frontend/src/market/types.ts`.
- **Accepted bounded behavior:** The effective diff adds typed
  `MARKET_OBSERVABILITY` delivery handling for the existing public WebSocket
  payload, pair filtering, an at-most-100 latest-tick projection, provider
  event/received time and latency display, explicit ephemeral/restart-loss
  wording, and recovery-state labels while preserving history-before-realtime
  chart flow. It also adds a cache revision seam that prevents stale async
  feature writes after the shared private cache is cleared, and an explicit
  unavailable authoring state for the absent public draft transport.
- **Acceptance gaps:** The restored feature screens do not consume the new
  authoring state or provide the required distinct LLM draft/validation/error/
  Save/Approve presentation. They also do not provide the DEC-007 weighted/Lite
  descriptor projection, RANDOM/DOMAIN_GUIDED/GENETIC seeded provenance and
  stop presentation, synthetic Long/Short paper/SL-TP/fee/slippage/decimal
  projection, News extraction/template state, or explicit supplied
  Sentiment `AVAILABLE`/`MISSING`/`DEGRADED` reasons. No F-03 packet-specific
  tests were added. The frozen public REST contracts expose no dedicated LLM
  draft/Save/Approve transport and no typed SL/TP stop-policy fields, while
  the current backend composition has no feature REST/market-WebSocket routes;
  these limitations cannot be repaired within F-03 without Instructor review
  or the separately blocked integration boundary. No fabricated client state,
  browser network call, new contract field, or client identity bypass was
  introduced.
- **Scope review:** PASS. The exact eleven-path source/control delta audited
  by the Instructor and committed at `122569c` consists of the nine
  `apps/frontend` paths above plus `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; no uncommitted F-03 implementation delta
  remains. `packages/contracts/**`, `apps/backend/**`, `modules/**`,
  migrations, dependencies, policy documents, and generated source artifacts
  are unchanged. The deferred-scope checker passes after the unreferenced
  partial helper and fixture-only observability literal were removed; this does
  not convert the incomplete F-03 behavior into acceptance.

## Validation evidence

- **PASS (regression boundary):** `npm test --workspace @cryptox/frontend` —
  12 files, 31 tests. These are the existing frontend tests; no new packet
  tests exist, so this is not full F-03 acceptance evidence.
- **PASS:** Frontend typecheck, build, and lint; root typecheck, build, and
  lint.
- **PASS:** Root `npm test` — 383 tests passed and 6 environment-gated tests
  skipped. Skips are not PASS evidence.
- **PASS:** `npm run arch:check` (76 modules / 199 dependencies, with the
  expected nine forbidden-dependency fixtures), `npm run artifacts:check`,
  `npm run scope:check`, `npm run test:scope-check` (13/13), and
  `git diff --check`.
- **PASS (limited):** `npm run runtime:smoke` — `/live=200`, `/ready=503`,
  `/health=404`. This is health-only evidence, not feature API or provider
  evidence.
- **BLOCKED:** `npm run db:local:validate` because Docker Compose is not
  available and Docker config access is denied (`docker: unknown command:
  docker compose`). PostgreSQL and database integration remain unverified.
- **UNVERIFIED:** The OpenSpec CLI is unavailable (`openspec` is not
  recognized). Live Binance/News/provider traffic, real feature REST/market
  WebSocket composition, and browser/demo evidence were not available and are
  not claimed. Fixture/regression evidence is not final real-provider/demo
  evidence.

## Stop boundary

- F-03 remains at `REVIEW` with `NEEDS_INSTRUCTOR_REVIEW`; it must not be
  promoted to `DONE` from this partial worker result. No other task moved:
  `M-02` remains `REVIEW`; `AU-02`, `I-01`, `I-02`, and `I-03` remain blocked.
- The sole worker and its authorized execution are exhausted. Do not start a
  second worker, retry or resume this worker, implement another packet, or
  promote newly unlocked work. Instructor review is required before any
  further F-03 implementation or integration decision.
- **Prior INS-085 commit attempt:** The single coherent Manager staging/commit
  attempt was made once and failed before staging with `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. It was
  not retried. The Instructor independently audited and committed the exact
  eleven-path source/control delta at `122569c`; no uncommitted F-03
  implementation delta remains.
- **INS-087 commit attempt:** The one authorized coherent Manager staging/commit
  attempt for this two-file reconciliation failed before staging with the same
  exact error: `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. It was
  not retried. The two-file reconciliation remains uncommitted for Instructor
  audit and commit. Under `INS-087`, it changes only the two Manager-owned
  control files and does not start or promote any downstream task.

# INS-083 Execution Checkpoint — L-02 Extension-Aware Ranking and Provenance Admission

## Resume here

- **Authorization:** `INS-083 / APPROVED_FOR_EXECUTION` authorizes exactly one
  fresh Manager and exactly one internal Leaderboard worker for L-02 only. No
  retry, replacement, duplicate, second worker, downstream promotion, or other
  packet is authorized.
- **Manager:** `01a05171-cd4c-73e2-aa50-0d2b12073856` in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox` on branch
  `MVP_IMPLEMENTATION`; no worktree or alternate branch is used.
- **Starting checkpoint:** `a201afe001b22bab8bc018f73ca5bb3485a424dc`
  (`docs(control): authorize L-02 leaderboard admission`), with reviewed base
  `ebb890df75f8d081aa5e15c1532fe0d626a51671`. The base is an ancestor and the
  only delta before execution was the committed `docs/control/INSTRUCTOR.md`
  authorization; source, business state, and the task DAG were clean and
  applicable.
- **Dependencies:** `C-02`, `Q-02`, `B-03`, `E-02`, and completed `L-01` were
  verified `DONE` from `TASKS.md`; `F-03`, baseline `I-01`, and `I-03` remain
  blocked integration dependencies. `M-02` remains `REVIEW/UNVERIFIED` and
  `AU-02` remains blocked. No downstream packet was started.
- **Worker:** exactly one internal worker, Harvey
  (`01a05179-85a0-7570-b59a-4b0ebca94fc6`), was dispatched in the same
  canonical checkout with no commit, branch, worktree, or control-plane edit
  authorized. No other Cryptox worker or Manager is active; historical tasks
  are not resumed, retried, replaced, or reused.
- **State transition:** L-02 moved exactly `BLOCKED -> READY -> IN_PROGRESS ->
  REVIEW -> DONE`; all other task states are unchanged. Harvey completed within
  `modules/leaderboard/**` excluding the frozen `api/contracts.ts`, and the
  Manager independently reviewed and validated the result.

## Execution boundary

- The public Leaderboard contract, including the existing
  `RankableExperiment.extensionProvenance` shape, remains frozen. The worker may
  not edit contracts, migrations, dependencies, other modules, frontend, or
  backend composition.
- The Manager owns review, validation, `TASKS.md`, `HANDOFF.md`, and the one
  coherent checkpoint-commit attempt. The worker must not edit control-plane
  artifacts or move task state.

## Worker result and independent review

- **Worker checkpoint:** Harvey reported completion of owner-scoped admission
  and reads, finite `REQUIRED_METRICS_V1` validation, deterministic
  `LINEAR_REQUIRED_V1` Top-K/ties, duplicate safety, frozen extension
  provenance read-through, PostgreSQL owner predicates/conflict handling, and
  focused tests. The worker made no commit and did not edit control-plane
  artifacts.
- **Worker source/test/documentation paths:**
  `modules/leaderboard/application/memory.ts`,
  `modules/leaderboard/application/ports.ts`,
  `modules/leaderboard/application/service.ts`,
  `modules/leaderboard/application/service.spec.ts`,
  `modules/leaderboard/api/bootstrap.spec.ts`,
  `modules/leaderboard/domain/ranking.ts`,
  `modules/leaderboard/domain/ranking.spec.ts`,
  `modules/leaderboard/infrastructure/postgres.ts`,
  `modules/leaderboard/infrastructure/postgres.spec.ts`, and
  `modules/leaderboard/infrastructure/README.md`. Manager-only control paths
  are `docs/implementation/TASKS.md` and this checkpoint.
- **Scope and boundary review:** PASS. The frozen
  `modules/leaderboard/api/contracts.ts` content hash remains
  `702130a2c2469024668f77493f832993d005d916`, equal to `HEAD`; no migration,
  dependency, other module, frontend, backend composition, or deferred-scope
  file changed. Leaderboard imports only its own API/domain/application ports
  plus public Auth/Evaluation contracts. Exact changed-path review passed.
- **Behavior review:** PASS. The Manager verified trusted context and
  owner-filtered scope/entry/SearchRun access, unauthenticated rejection,
  authoritative owner-scoped Experiment read-through, rejection of failed,
  malformed, non-finite, wrong-profile, and zero-trade results, immutable
  projections, fixed formula/tie order, positive K, duplicate admission, and
  PostgreSQL uniqueness/owner predicates. No Experiment, Trade, or Evaluation
  record is mutated or copied into Leaderboard storage.

## Validation evidence

- **PASS:** `npm test --workspace @cryptox/leaderboard` — 7 files, 22 tests.
- **PASS:** Leaderboard package typecheck, build, and lint.
- **PASS:** root `npm test` — 383 tests passed and 6 environment-gated tests
  skipped; root typecheck, build, lint, architecture, artifacts,
  deferred-scope, 13-test scope suite, exact-scope review, and `git diff
  --check` all passed.
- **PASS (limited):** runtime smoke proved `/live=200`, `/ready=503`, and
  `/health=404`; it is not real provider or database evidence.
- **BLOCKED:** `npm run db:local:validate` could not run because Docker Compose
  is unavailable in this environment (`docker: unknown command: docker compose`;
  Docker config access was also denied). Live PostgreSQL migration and database
  integration therefore remain unverified; fake-pool adapter tests passed.
- **UNVERIFIED:** OpenSpec CLI is unavailable (`openspec` is not recognized).
  Configured Binance/News providers, browser/demo, and final cross-module
  runtime integration were not exercised here and remain unverified.

## Provenance and persistence limitation

The frozen public `RankableExperiment.extensionProvenance` projection supplies
only `searchProfileId`, `paperExecutionProfileId`, and
`newsExtractionTemplateVersion`; L-02 validates and reads those values without
changing them. An entry retains the Experiment ID and ranking-configuration
identity, so the authoritative public Experiment projection remains the place
to inspect strategy/composite version, Search seed/configuration/dataset/code,
full paper execution/decimal settings, and finite Evaluation metrics where
those upstream projections provide them. Leaderboard deliberately does not
duplicate that module-owned provenance or claim exact replay. PostgreSQL uses
the existing delete-on-eviction schema and keeps no tombstone, so active
duplicate admission is idempotent but re-admission after eviction cannot be
distinguished without a history schema change, which is outside INS-083.

## Stop boundary

- INS-083 is exhausted after L-02 `DONE`. `M-02` remains `REVIEW`, and
  `AU-02`, `F-03`, `I-01`, `I-02`, and `I-03` remain unchanged and blocked or
  unverified as previously recorded. No downstream packet was promoted or
  started.
- The single coherent Manager staging/commit attempt failed with `fatal: Unable
  to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission
  denied`; it was not retried. The exact source/control delta was independently
  audited and committed by the Instructor at `32ed9321f9f22f858fdd2458351b531e8807db7d`
  (`32ed932`). INS-083 remains exhausted; renewed Instructor authorization is
  required for any further packet, retry, integration, or downstream promotion.

# INS-081 Execution Checkpoint — E-02 Extension Evaluation and Decimal-Boundary Reconciliation

## Resume here

- **Authorization:** `INS-081 / APPROVED_FOR_EXECUTION` authorized exactly one
  fresh Manager and the single `E-02` packet. No retry, replacement, duplicate,
  downstream promotion, or other packet was authorized.
- **Manager:** `01a05141-3fce-7ff3-bceb-eded75852526` in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox` on branch
  `MVP_IMPLEMENTATION`; no worktree or alternate branch was used.
- **Starting checkpoint:** `87e9bc46f0b93ba565fb72884e0cb108407b010a`
  (`docs(control): authorize E-02 evaluation reconciliation`), with reviewed
  base `856f0973acf7066149777c566bef847180cc270d`. The starting delta was the
  reviewed `INSTRUCTOR.md` authorization only; source, business state, and task
  DAG were clean and applicable.
- **Dependencies:** `C-02` DONE, `B-03` DONE under `INS-069` with source
  checkpoint `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`, and `E-01` DONE at
  `a20a7c5`. `L-02`, `F-03`, and `I-03` remain BLOCKED. `M-02` remains
  REVIEW/UNVERIFIED and `AU-02` remains blocked pending its human decision.
  No downstream packet was started.
- **Worker:** exactly one internal worker, Bacon
  (`01a05145-6769-7100-b367-e3173484ce8c`), worked in the same canonical
  checkout with no commit. Bacon returned a completed checkpoint and did not
  edit control artifacts or the frozen contract.
- **State transition:** E-02 moved exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`; no other task state was
  changed.

## Implementation and review

- **Authorized paths changed:**
  `modules/evaluation/domain/evaluator.ts`,
  `modules/evaluation/api/bootstrap.ts`,
  `modules/evaluation/api/bootstrap.spec.ts`, and
  `modules/evaluation/README.md`, plus this Manager-owned checkpoint and
  `docs/implementation/TASKS.md`.
- Evaluation now consumes the completed decimal-normalized paper-result shape
  through its public boundary and computes only the four required deterministic
  metrics. Rational/integer decimal arithmetic, strict structural and finite
  input validation, overflow rejection, zero/flat handling, and immutable input
  behavior were independently reviewed. Evaluation does not reconstruct fills,
  fees, slippage, rounding, entry/exit behavior, simulation, ranking, or score.
- Decimal Long and synthetic Short projections, zero trades, flat/zero curves,
  malformed/sparse/non-finite/non-positive-denominator inputs, invalid decimal
  scale, and arithmetic overflow were independently exercised. A full B-03-shaped
  result and actual B-03 simulator output for Long and Synthetic Short were
  passed through Evaluation with finite required outputs.
- `modules/evaluation/api/contracts.ts` was not edited; its pre/post content
  hash remained `c5e1f7fd7a92d96879bc9ff15fb2d9b99eeda429`.

## Validation evidence

- **PASS:** focused E-02 bootstrap tests `17/17`; complete Evaluation package
  tests `19/19`; Evaluation typecheck, build, and lint.
- **PASS:** root test command (377 passed; 6 environment-gated skips), root
  typecheck, root build, and root lint.
- **PASS:** architecture gate (76 modules / 198 dependencies), artifacts gate,
  deferred-scope gate, scope tests `13/13`, exact authorized-path review,
  cross-module import review, and `git diff --check`.
- **UNVERIFIED:** OpenSpec CLI evidence because `openspec` is unavailable in
  this environment.
- **UNVERIFIED/BLOCKED:** live Binance/provider, PostgreSQL/Docker, browser/demo,
  and other live-runtime evidence. Fixture and local simulator evidence does
  not promote those checks.

## Stop boundary

- E-02 is DONE. `L-02`, `F-03`, `I-03`, `I-01`, `I-02`, `M-02`, and `AU-02`
  were not started or promoted. Stop here; the next nominal packet requires a
  fresh applicable Instructor authorization.
- **Commit:** The one coherent Manager checkpoint staging/commit attempt was
  made once and was denied before staging: `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No
  retry was made. The six-file checkpoint remains uncommitted in the working
  tree; current HEAD is still the reviewed starting checkpoint until an
  authorized environment can commit it.

# INS-077 Execution Checkpoint — S-04 Controlled LLM Authoring Review

## Resume here

- **Authorization:** `INS-077 / APPROVED_FOR_EXECUTION` authorized exactly one
  bounded `S-04` implementation and review. It authorized no retry,
  replacement, duplicate, downstream promotion, or other packet.
- **Manager:** `01a050e8-b340-7df1-8724-0e52e00f234d` in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox` on branch
  `MVP_IMPLEMENTATION`.
- **Starting checkpoint:** `3184d7a4fbd9b97f1e600d801c6a2d5b1e9cbeba`
  (`docs(control): authorize S-04 authoring`), with reviewed base
  `723d1700bd39c4417cbfe13ca6a56bdb8a4ce378`. The source/business tree was
  clean before the Manager-owned control transition; the authorization delta
  contained only the committed `docs/control/INSTRUCTOR.md` change.
- **Verified authority:** The committed signal is `INS-077 /
  APPROVED_FOR_EXECUTION`, naming `CSL-R-ST-05`, `CSL-R-RP-02`, and the safe
  imported-content join in `CSL-R-NW-02`, consistent with `DEC-007`, ADR-009,
  the Strategy capability spec, and the S-04 packet.
- **Dependencies:** `C-02`, `S-01`, `N-03`, `N-03A`, `S-05`, `S-06`, `Q-02`,
  `B-03`, and `M-03` are `DONE`. `F-03`, `AU-02`, and `I-03` remain blocked
  integration dependencies only and were not authorized.
- **Concurrency:** Active-task inspection found only the parent Instructor and
  this Manager; exactly one internal worker was used:
  `Helmholtz / 01a050f1-73b9-7c51-975b-19d6247ef96d`. No competing Cryptox
  worker or Manager was active. The worker made no commit and did not edit
  control-plane or frozen contract files.
- **State transition:** Only `S-04` moved `BLOCKED -> READY -> IN_PROGRESS ->
  REVIEW -> DONE` under `INS-077`. The board is now 35 `DONE`, 1 `REVIEW`
  (`M-02`), and 7 `BLOCKED`; every other state, dependency, and blocker is
  preserved.
- **Worker source/test paths:**
  `modules/strategy/api/bootstrap.ts`,
  `modules/strategy/api/bootstrap.spec.ts`,
  `modules/strategy/application/authoring.ts`,
  `modules/strategy/application/authoring-memory.ts`,
  `modules/strategy/application/authoring.spec.ts`,
  `modules/strategy/application/memory.ts`,
  `modules/strategy/infrastructure/openai-compatible.ts`, and
  `modules/strategy/infrastructure/openai-compatible.spec.ts`.

## Review evidence

- The provider adapter is configuration-gated by endpoint/model/key, sends one
  structured request, has no retry/queue behavior, and now applies the hard
  45-second timeout across request acquisition, response handling, body parsing,
  and strict structured-draft parsing. Secrets and raw prompts/completions are
  not persisted or logged.
- The application binds trusted authenticated identity, consumes only the
  existing public News `readNews` boundary for approved News input, performs no
  direct URL fetch, validates parameters deterministically before draft/definition
  persistence, requires explicit validation/approval, preserves safe provenance,
  uses owner-filtered not-found isolation, and retains immutable versioned
  definitions in the supplied repository boundary.
- Focused authoring coverage is 27/27: application 13/13, API bootstrap 2/2,
  provider 12/12. Full Strategy coverage is 15 files / 116 tests passed.
- Independently reproduced PASS: Strategy typecheck/build/lint; root
  build/typecheck/lint/tests; architecture (`dependency-cruiser` and the
  expected nine fixture detections); artifacts; deferred-scope checker and
  13/13 scope tests; and `git diff --check`.
- The exact final source diff is limited to the eight listed Strategy paths;
  Manager control changes are limited to `TASKS.md` and this `HANDOFF.md`.
  Frozen contracts/ports, REST contracts, News, migrations, dependencies,
  frontend, domain/plugin, and unrelated files are unchanged.
- OpenSpec CLI is unavailable (`openspec` is not installed). Live configured
  provider, live PostgreSQL, browser/demo, and runtime integration evidence are
  `UNVERIFIED`/`BLOCKED`; `npm run db:local:validate` was blocked because this
  host's Docker does not provide `docker compose` and denies Docker config
  access. Environment-gated workspace tests remain skips, not passes.
- The one authorized Manager checkpoint staging/commit attempt was denied by
  Git; no Manager checkpoint commit was created and no retry was made. The
  parent Instructor independently audited and committed the exact source/control
  delta at accepted checkpoint `01db873`.

## Stop boundary

- S-04 is `DONE` after the final review. The accepted source/control checkpoint
  is committed at `01db873` by the parent Instructor after independently
  auditing the exact delta; the one coherent Manager checkpoint staging/commit
  attempt was denied and no Manager retry occurred. Stop here. Do not start or
  promote any newly unlocked task.

# INS-071 Execution Checkpoint — M-03 Closure Review

## Resume here

- **Authorization:** `INS-071 / APPROVED_FOR_EXECUTION` authorized exactly one
  fresh Manager-owned closure review for `M-03`. It authorized no worker,
  source implementation, branch, worktree, retry, replacement, duplicate, or
  downstream start.
- **Manager:** This closure was performed by task
  `01a05094-bc71-7482-8107-dc654fcdff19` in the canonical same-directory
  checkout `D:/agy-cli-projects/AOS/Cryptox` on branch `MVP_IMPLEMENTATION`.
- **Instruction checkpoint:** `5f2871d0efe91020dc5f56b9d2f43c5f444c182f`
  (`docs(control): authorize M-03 closure`), with reviewed base
  `e583af58d089ee65a8b9492affc0e6d521e523d8` (`docs(control): hold after B-03
  closure`). The accepted M-03 source/business checkpoint is
  `b73b298726418d502f396b4f7ed29c1afbbdcf20`.
- **Start gates:** The signal was exactly `INS-071 / APPROVED_FOR_EXECUTION`;
  the branch and HEAD were `MVP_IMPLEMENTATION` / `5f2871d`; and the working
  tree was clean before these two authorized control-file edits. The reviewed-
  base delta to the instruction commit was only `docs/control/INSTRUCTOR.md`.
- **Accepted dependencies:** `C-02=DONE`, `M-01=DONE`, and the `F-01`
  normalized chart input contract are satisfied. `M-02` remains historical
  `REVIEW/UNVERIFIED` and was not moved. `N-03` remains `REVIEW` at source/
  business checkpoint `d4161ec458c869ff18fa89dd9732df260629c915`.
- **Concurrency:** Active-task inspection found only the parent Instructor task
  and this Manager task active in the Cryptox checkout. No competing Cryptox
  Manager or worker was active; historical tasks/worktrees were not resumed,
  retried, replaced, or duplicated.

## M-03 closure result

- **Transition:** M-03 moved exactly `REVIEW -> DONE` under INS-071. Its prior
  operational sequence remains `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`.
- **Workers/tasks used:** No worker was authorized or created. This was a
  Manager-only closure review of the implementation produced and independently
  reviewed under INS-049 by the single fresh Market Data worker Chandrasekhar.
  No downstream packet was started or promoted.
- **Unchanged task state:** M-02 remains `REVIEW/UNVERIFIED`; N-03 remains
  `REVIEW`, including its `PARTIAL/UNVERIFIED` auto-refresh scheduler. `S-04`,
  `E-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`, and `AU-02` remain `BLOCKED`.
  All other task rows and states are preserved.

## Scope and source immutability

- **M-03 implementation/test paths:**
  `modules/market-data/api/{bootstrap,index,index.spec}.ts`;
  `modules/market-data/application/{ports,observability,service,service.spec}.ts`;
  `modules/market-data/infrastructure/{binance-realtime,binance-realtime.spec}.ts`.
- Each of those nine paths has the same blob hash in the current tree as at
  `b73b298`; the source/business implementation was not reopened or changed.
  The M-03 checkpoint itself changed only those Market Data implementation/test
  paths and its Manager-owned control checkpoint. Frozen REST/market-WebSocket
  contract files, migrations, frontend, providers outside the approved adapter,
  package/dependency files, general event-bus paths, and other-module paths were
  not changed by M-03. Later authorized Search/Backtesting/checker history does
  not overlap the M-03 implementation paths.
- The current closure diff is restricted to
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.

## Reviewed M-03 behavior

- **Candle delivery:** For one pair/timeframe, same-timestamp updates replace
  the current candle state and a later timestamp appends one candle. Identical
  duplicates, unseen older out-of-order closed candles, and closed-to-forming
  regressions are suppressed; an observed closed candle may emit a changed
  correction. State is keyed by pair and timeframe.
- **Recovery and lifecycle:** Reconnect attempts and exponential backoff are
  bounded; socket errors recover even without a close event; REST reconciliation
  fills missing closed candles before releasing `CONNECTED`, excludes forming
  candles, bounds gap pages/candle slots, and queues live continuation. Shutdown
  cancels reconnect work, closes sockets, and bounds provider cleanup.
- **Telemetry:** Provider event time, received time, non-negative latency, and
  connection state are normalized and exposed. `MARKET_OBSERVABILITY_V1` keeps an
  independent latest-100 normalized-tick ring per pair. New service state and the
  explicit reset seam are empty after restart; reads are clone-safe.
- **Ephemeral boundary:** The observability projection is in-memory and marked
  `EPHEMERAL_IN_MEMORY_ONLY`. It is separate from CandleRepository and snapshot
  persistence and is not consumed by historical input, dataset snapshots,
  Backtesting, or replay. The WebSocket boundary remains market-only; no general
  event channel or non-market message was added.

## Validation and evidence

- **Focused Market Data:** **PASS** — `npm test --workspace
  @cryptox/market-data`; 31 passed / 1 skipped across 6 passed / 1 skipped
  files. The skipped `infrastructure/postgres.integration.spec.ts` is
  environment-gated and is not PASS evidence.
- **Market WebSocket contract:** **PASS** — focused contract test, 5/5.
- **Deferred-scope checker:** **PASS** — `npm run test:scope-check`, 13/13;
  `npm run scope:check` also passed.
- **Repository gates:** **PASS** — `npm run arch:check` (76 modules, 198
  dependencies; expected nine negative fixtures), `npm run artifacts:check`,
  `npm run typecheck`, `npm run build`, `npm run lint`, and `git diff --check`.
- **Source diff review:** **PASS** — the nine M-03 implementation/test paths
  are byte-identical to `b73b298`; no unauthorized REST/WS contract, migration,
  frontend, general event-bus, or other-module change is part of the M-03
  checkpoint or this closure.
- **Contextual workspace evidence:** The accepted current workspace record is
  341 passed / 6 environment-gated skips. Those skips are not PASS evidence and
  this contextual record is not treated as live-provider evidence.

## Unavailable evidence and limitations

- **Real configured Binance historical/realtime:** **UNVERIFIED** — no live
  Binance configuration is present on this host. Fixtures/fakes prove
  deterministic behavior only and are not live-provider evidence.
- **PostgreSQL:** **BLOCKED/UNVERIFIED** — `DATABASE_URL` is absent and the
  Market Data PostgreSQL integration test remains skipped. No database runtime
  PASS is claimed.
- **OpenSpec CLI:** **UNVERIFIED** — the command is unavailable. Browser/demo
  runtime and link/DAG automation were not run and remain **UNVERIFIED**. No
  unavailable check, fixture, or skip is promoted to PASS.

## Stop boundary

- This is one coherent Manager checkpoint under INS-071. Only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` are
  authorized to change; no source, test, contract, migration, frontend,
  provider, package, OpenSpec, Instructor, or decision file was edited.
- INS-071 is exhausted. Renewed Instructor review is required before any other
  packet, retry, implementation, closure review, or downstream promotion,
  including M-02, N-03, S-04, E-02, L-02, F-03, I-01, I-02, I-03, or AU-02.
- The single coherent Manager checkpoint was prepared with only these two
  control files. Git staging was blocked by the environment with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`;
  no commit was created and no staging/commit retry was attempted.

# INS-073 Execution Checkpoint — N-03A Completion and N-03 Closure

## Resume here

- **Authorization:** `INS-073 / APPROVED_FOR_EXECUTION` authorized exactly one
  residual `N-03A` News scheduler completion and the subsequent closure review
  of existing `N-03`. It authorized no retry, replacement, duplicate,
  downstream start, or other packet.
- **Manager:** `01a050a6-bc83-70a3-9030-6f6f8435a4f7` in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`.
- **Starting checkpoint:** Reviewed base `1fda6ad` and authorization commit
  `1256b667d7bbfd0b4aca699752a3f891a382e8a5`; the working tree was clean before
  the Manager added the N-03A row. The existing N-03 source/business checkpoint
  is `d4161ec458c869ff18fa89dd9732df260629c915`.
- **Authority checks:** `INS-073` was exact and current; `DEC-014` and the
  `N-03A` packet in `MVP_PLAN.md` matched the residual scope. `N-03` was
  `REVIEW`; `C-02`, `N-01`, and `N-02` were `DONE`. Pre-dispatch inspection
  found only the delegating parent task and this Manager active in the
  canonical checkout; no competing Cryptox worker or Manager was resumed.

## N-03A execution and transitions

- The Manager added exactly one `N-03A` operational row to `TASKS.md` in
  `READY`, with requirement IDs `CSL-R-NW-02`, `CSL-R-RP-02`, and
  `CSL-R-OB-01`, dependencies, exact write scope, and evidence expectations.
- Only `N-03A` moved `READY -> IN_PROGRESS` before dispatch. Existing `N-03`
  remained `REVIEW` during implementation.
- Exactly one fresh worker was used: `01a050be-e4f6-7c71-b289-8f12758b273c`,
  same-directory, no worker commit, branch, worktree, thread creation, or
  control-plane edit. No retry, replacement, duplicate, or second worker was
  created.
- The worker changed only:
  `modules/news/application/scheduler.ts`,
  `modules/news/application/scheduler.spec.ts`, and
  `modules/news/api/bootstrap.ts`. The bootstrap change is limited to the
  scheduler factory/class/type re-export; `api/index.ts`, `contracts.ts`, and
  contract-only tests are unchanged. No infrastructure path changed.
- Independent review accepted the provider-neutral application scheduler and
  its injected timer/clock seams. It validates the one-to-five-minute interval
  with a five-minute default, calls the existing public News `collect` seam,
  prevents overlap, contains refresh failures so later ticks continue, and
  shuts down idempotently without remote fetch, timer persistence, secret
  logging, or queue/distributed behavior.
- The exact tracked News application/infrastructure and Sentiment paths from
  the N-03 checkpoint remain unchanged since `d4161ec`; only the authorized
  bootstrap seam and the two new application paths were added.
- N-03A moved exactly `IN_PROGRESS -> REVIEW -> DONE`. After that proof, the
  Manager re-reviewed the complete original N-03 News/Sentiment, retention,
  provenance, and safe-fetch evidence and moved N-03 exactly `REVIEW -> DONE`.

## Validation and evidence

- **N-03A focused scheduler:** **PASS** — 5/5 tests.
- **News:** **PASS** — `npm test --workspace @cryptox/news`, 35/35. This
  includes the original N-03 News evidence (30/30) plus the five scheduler
  tests; the unchanged API entrypoint contract test still passes.
- **Sentiment:** **PASS** — `npm test --workspace @cryptox/sentiment`, 19/19.
- **Public News API:** **PASS** — focused `api/index.spec.ts` and
  `api/contracts.spec.ts`, 3/3.
- **Workspace:** **PASS** — root `npm test`, 346 passed / 6 environment-gated
  skips, exit success. The six skips are not PASS evidence.
- **Checker and repository gates:** **PASS** — `npm run test:scope-check`
  13/13, `npm run scope:check`, `npm run arch:check` (76 modules/198
  dependencies with the expected nine forbidden-dependency fixtures),
  `npm run artifacts:check`, `npm run typecheck`, `npm run build`,
  `npm run lint`, and `git diff --check`.
- **Original N-03 re-review:** **PASS at the approved fixture/test boundary**
  — the accepted N-03 checkpoint's 30/30 News, 19/19 Sentiment, retention,
  provenance, safety, and neutral failure-isolation evidence remains intact;
  current focused and workspace gates also pass.

## Unavailable evidence and limitations

- **Real configured News:** **UNVERIFIED** — no live configured provider/demo
  run was available; fixture/provider tests are not live-provider evidence.
- **PostgreSQL:** **BLOCKED/UNVERIFIED** — `DATABASE_URL` is absent and Docker
  Compose is unavailable; skipped PostgreSQL/integration checks are not PASS.
- **Browser/demo runtime, OpenSpec CLI, and link/DAG automation:**
  **UNVERIFIED** — the CLI is unavailable and those runtime/automation checks
  were not run. No unavailable check, fixture, or skip was promoted to PASS.
- Real Binance historical/realtime evidence remains **UNVERIFIED** as recorded
  by the prior checkpoint; it is outside this News residual packet.

## Stop boundary

- Manager-owned changes are limited to `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; worker changes remain the three scoped
  News paths listed above. No Instructor, decision, requirements, ADR,
  architecture, data-model, OpenSpec, contract, migration, dependency,
  frontend, Sentiment, Strategy, backend composition, or infrastructure file
  was edited by this execution.
- `M-02` remains `REVIEW/UNVERIFIED`; `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`,
  `I-01`, `I-02`, and `I-03` remain `BLOCKED`. No downstream task was started,
  promoted, or automatically unlocked.
- `INS-073` is exhausted. Renewed Instructor review is required before any
  other packet, retry, implementation, closure review, or downstream promotion.
- **Integration checkpoint:** The audited integration commit is
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd` (`feat(news): complete N-03A
  refresh scheduler`). It integrates the reviewed worker paths
  `modules/news/application/scheduler.ts`,
  `modules/news/application/scheduler.spec.ts`, and
  `modules/news/api/bootstrap.ts`, together with the INS-073 Manager-owned
  `TASKS.md`/`HANDOFF.md` checkpoint changes. The reviewed worker paths are
  no longer uncommitted.
- **Historical Manager checkpoint attempt:** Exactly one coherent Manager
  checkpoint commit was attempted with only `TASKS.md` and `HANDOFF.md`.
  Staging failed with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`;
  no commit was created by that attempt, and no staging/commit retry was
# INS-103 Manager Checkpoint — I-01 Runtime, Transports and Observability Integration (NEEDS_INSTRUCTOR_REVIEW)

## Authorization and execution

- **Authorization:** `INS-103 / APPROVED_FOR_EXECUTION`; current Instructor
  signal is committed at `2a85c82711bb2e78e52e3a02e44f015d8c20a83f` and is
  applicable to the reviewed checkpoint `9f0841a83da6bd917185d3d692b5c9f27f07cdff`.
- **Checkout:** Manager is operating directly at
  `D:/agy-cli-projects/AOS/Cryptox` on `MVP_IMPLEMENTATION`. The tracked tree
  was clean apart from the untouched app-generated `.codex/config.toml`.
  The authorization commit changes only Instructor/decision governance files;
  no source, business-state, or task-DAG drift was found.
- **Dependencies:** `TASKS.md` verified `40 DONE`, `0 REVIEW`, `3 BLOCKED`;
  AU-01, AU-02, B-02, M-01, M-02, S-02, S-03, Q-01 integration, N-01, N-02,
  F-01, F-AUTH, and F-02 are `DONE`.
- **State:** I-01 moved exactly `BLOCKED → READY → IN_PROGRESS → REVIEW`.
  No I-02, I-03, extension, retry, replacement, duplicate, or downstream
  packet was started or promoted.
- **Worker:** Exactly one fresh sequential internal worker was created:
  Socrates (`01a05344-02cf-7930-9226-a3ec1be46522`). The worker is authorized
  only for `apps/backend/**` and the narrowly permitted WebSocket dependency
  exception; it must not edit control artifacts, stage, or commit.

## Worker checkpoint and independent review

The sole worker completed its source and contract review and returned
`NEEDS_INSTRUCTOR_REVIEW`. It identified a concrete composition blocker: the
public Strategy bootstrap requires injected `StrategyFactory` instances, but
the public API exports no built-in factory registry or composition seam. The
available built-in factories live under excluded
`modules/strategy/domain/plugins/**`. Deep-importing or duplicating those
implementations from `apps/backend/**` would violate the approved architecture
and the exact INS-103 write scope. Independent Manager inspection confirmed
that `createStrategyModule` accepts factories and the default facade constructs
an empty registry; no backend implementation was started.

No source, dependency, contract, generated, migration, infrastructure,
frontend, or excluded-path files changed. The only working-tree changes are
the Manager-owned `TASKS.md` and this checkpoint; `.codex/config.toml` remains
untouched and untracked. The single Manager staging attempt for this truthful
control checkpoint was denied with the exact error `fatal: Unable to create
'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No
implementation source was staged, no commit was created, and no staging or
commit retry was made.

## Acceptance and validation status

I-01 acceptance gates are `BLOCKED` pending that decision: no composed REST or
market-WebSocket backend exists to exercise, and no real PostgreSQL/Binance/
News runtime smoke can truthfully be claimed. The baseline backend validation
was 8 passed and 1 environment-gated skip; workspace tests were 386 passed and
6 environment-gated skips. Backend and workspace typecheck/build/lint passed;
architecture, source-sidecar, deferred-scope, test-scope, runtime-smoke, and
whitespace checks passed. These are baseline/repository checks, not I-01
implementation evidence. The OpenSpec CLI is unavailable and remains
`UNVERIFIED`; checked-in active change artifacts were used. No I-02/I-03 work
was started.

## Required Instructor decision and next safe state

Please authorize either a public Strategy registry/export composition seam
within the approved contract architecture or explicitly reconcile the I-01
scope to permit the required source change. Until then, leave I-01 in `REVIEW`
with `NEEDS_INSTRUCTOR_REVIEW`; do not start I-02, I-03, or any extension.
