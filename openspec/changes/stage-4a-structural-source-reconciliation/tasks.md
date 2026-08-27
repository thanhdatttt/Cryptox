# Tasks

## Wave 0 — baseline and checkpoint

- [x] Verify branch, HEAD, tracked status, active changes, generated sidecars, and
  current dependency violations.
- [x] Record the human-approved Stage 4A scope as an active change artifact.

## Wave 1 — build and resolution truth

- [x] Establish deterministic workspace package resolution, production output,
  explicit typecheck, cross-platform start behavior, and clean install/build.
- [x] Prove output isolation, remove exactly the stale module `.js`/`.d.ts`
  sidecars, and add a recurrence guard.
- [x] Validate and commit Wave 1.

## Wave 2 — ownership and boundaries

- [x] Remove cross-module domain imports, reverse application/API dependency, and
  critical type cycles with canonical owners.
- [x] Remove Auth and deferred product/distributed/strict-replay leakage while
  preserving the pgcrypto migration unchanged.
- [x] Establish typed Market Data, News, and Sentiment provider ports without real
  adapters.
- [x] Reconcile Candidate/SearchRun/Evaluation/Leaderboard ownership.
- [x] Make market WebSocket transport self-contained and retire queue transport.
- [x] Validate and commit coherent Wave 2 sub-waves.

## Wave 3 — execution boundary

- [x] Add mechanism-neutral `BacktestExecutionPort` and bounded local executor
  using an injected runner, with focused state/capacity/failure tests.
- [x] Validate and commit Wave 3.

## Wave 4 — runtime topology and truth

- [x] Remove mandatory Redis/worker topology, reconcile backend composition, and
  provide truthful liveness/readiness.
- [x] Run focused runtime smoke checks and commit Wave 4.

## Wave 5 — structural verification

- [ ] Repair and expand architecture checks for the Stage 4A invariants.
- [ ] Run clean install, build, typecheck, focused tests, architecture/cycle,
  sidecar, leakage, runtime-smoke, diff, and final status audits.
- [ ] Commit the verification gate and complete the Definition-of-Done report.
