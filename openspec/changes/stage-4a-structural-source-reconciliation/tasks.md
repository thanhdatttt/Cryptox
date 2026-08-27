# Tasks

## Wave 0 — baseline and checkpoint

- [x] Verify branch, HEAD, tracked status, active changes, generated sidecars, and
  current dependency violations.
- [x] Record the human-approved Stage 4A scope as an active change artifact.

## Wave 1 — build and resolution truth

- [ ] Establish deterministic workspace package resolution, production output,
  explicit typecheck, cross-platform start behavior, and clean install/build.
- [ ] Prove output isolation, remove exactly the stale module `.js`/`.d.ts`
  sidecars, and add a recurrence guard.
- [ ] Validate and commit Wave 1.

## Wave 2 — ownership and boundaries

- [ ] Remove cross-module domain imports, reverse application/API dependency, and
  critical type cycles with canonical owners.
- [ ] Remove Auth and deferred product/distributed/strict-replay leakage while
  preserving the pgcrypto migration unchanged.
- [ ] Establish typed Market Data, News, and Sentiment provider ports without real
  adapters.
- [ ] Reconcile Candidate/SearchRun/Evaluation/Leaderboard ownership.
- [ ] Make market WebSocket transport self-contained and retire queue transport.
- [ ] Validate and commit coherent Wave 2 sub-waves.

## Wave 3 — execution boundary

- [ ] Add mechanism-neutral `BacktestExecutionPort` and bounded local executor
  using an injected runner, with focused state/capacity/failure tests.
- [ ] Validate and commit Wave 3.

## Wave 4 — runtime topology and truth

- [ ] Remove mandatory Redis/worker topology, reconcile backend composition, and
  provide truthful liveness/readiness.
- [ ] Run focused runtime smoke checks and commit Wave 4.

## Wave 5 — structural verification

- [ ] Repair and expand architecture checks for the Stage 4A invariants.
- [ ] Run clean install, build, typecheck, focused tests, architecture/cycle,
  sidecar, leakage, runtime-smoke, diff, and final status audits.
- [ ] Commit the verification gate and complete the Definition-of-Done report.
