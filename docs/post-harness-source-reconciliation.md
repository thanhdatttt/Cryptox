# Post-Harness Source Reconciliation Backlog

## Status and boundary

This is a historical later-stage implementation/tooling backlog discovered while
refining documentation. The post-C-01 instructor change recorded by A-00 supersedes
the original Authentication/ownership removal direction below; the active
`mvp-implementation` change and durable implementation plan now govern execution.
Every source, executable-contract, migration, infrastructure, generated-artifact,
or toolchain change still requires its approved packet and dependency gate.

## Approved-scope reconciliation

- Reconcile the existing Auth scaffold and runtime composition against the approved
  simple Auth V1 contracts through C-01A, D-01, and AU-01; do not infer behavior
  from stale scaffolding or the `pgcrypto`-only migration.
- Reconcile trusted identity and direct/inherited owner fields through C-01A and
  the owning implementation packets. Keep enterprise tenancy/authorization fields
  out of V1 unless they are necessary for the approved simple per-user boundary.
- Remove deferred Long/Short, stop-loss, take-profit, trailing-stop, position-sizing,
  and risk-policy fields from active backtest/search/transport contracts.
- Replace fixed Top-10 contract assumptions with configurable K. A default of 10 may
  remain presentation/configuration only.
- Choose, document, and version the initial ranking formula/configuration before
  ranking implementation.

## Execution and contract ownership

- Establish the approved Backtest execution abstraction at the Backtesting
  application boundary and implement a bounded local executor.
- Remove mandatory BullMQ/Redis behavior from active runtime composition while
  preserving a future queue adapter seam; reconcile the historical worker app,
  Docker topology, queue transport contract, retry states, claim/fencing tokens,
  watchdogs, and distributed failure counters.
- Reconcile Search-generated candidate ownership with Backtesting execution
  ownership and remove duplicate `CandidateProgress`/status concepts.
- Move public business contracts toward one owner per module. Today many types live
  in `domain/contracts.ts` and are re-exported from `api/index.ts`; the preferred
  future `api/contracts.ts` paths do not yet exist.
- Make REST and market-WebSocket wire contracts self-contained at transport
  boundaries instead of importing module-domain internals.
- Establish explicit replaceable provider ports for Market Data, News, and
  Sentiment, preserving News/Sentiment failure isolation.
- Align Experiment, strategy, dataset, code-version, trade, evaluation, and ranking
  provenance with ADR-007 without adding production-grade artifact retention.

## Persistence and runtime truth

- Design and add migrations for the approved MVP entities only. Current physical
  migrations do not implement the conceptual model in `docs/data-model.md`.
- Replace placeholder health/readiness responses with checks that reflect real
  dependencies and capability readiness.
- Replace `NOT_IMPLEMENTED` module behavior with approved capability changes only;
  do not infer implementation requirements from current scaffolding.

## Tooling and verification

- Remove tracked source-side generated `.js` and `.d.ts` files after build output is
  redirected and ignore rules are verified.
- Repair dependency installation and verify build, typecheck/lint, tests, and
  architecture checks without weakening their coverage.
- Expand architecture enforcement to cover public-entrypoint, frontend, domain, and
  cross-module dependency rules.
- Add meaningful unit, contract/integration, resilience, and acceptance tests; do
  not treat `--passWithNoTests` or `NOT_IMPLEMENTED` assertions as feature evidence.
- Repair and pin OpenSpec tooling, then validate the capability-directory layout and
  archive workflow before regenerating any agent/tool harness.
- Add CI only after local commands and their coverage are truthful and repeatable.

## Exit rule

This backlog is informational. Follow the active change, `MVP_PLAN.md`, and
`TASKS.md`; do not open or implement an item here outside an approved READY packet.
