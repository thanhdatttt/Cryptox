# Stage 4A Structural Source Reconciliation

## Why

The reviewed Stage 3 audit found that executable source still contains deferred
Auth, risk, queue/distributed execution, strict-replay, contract-ownership, build
resolution, and runtime-topology assumptions that contradict the approved MVP.
Normal feature development must wait until those structural conflicts are removed.

## What changes

- Make TypeScript source, workspace package resolution, and compiled output
  unambiguous; remove stale source-adjacent generated module artifacts only after
  proving the corrected build layout.
- Reconcile module ownership and dependency direction without mechanically moving
  internal contracts.
- Remove active Auth, optional trading/risk, queue/distributed execution, and
  superseded strict-replay/snapshot concepts from the MVP executable surface.
- Establish typed provider ports, self-contained market WebSocket contracts, a
  mechanism-neutral Backtest Execution Port, and a bounded local executor tested
  with an injected fake runner.
- Align backend composition, health/readiness, and local topology with the approved
  synchronous modular monolith.
- Add only the focused verification needed to prove structural reconciliation.

## Non-goals

This change does not implement providers, strategies, Search behavior, the real
backtest simulator, evaluation/ranking formulas, persistence schema, frontend
features, Auth, risk features, distributed infrastructure, full lint adoption,
CI, OpenSpec CLI installation, or generated harness regeneration.

The existing `infra/db/migrations/001_enable_pgcrypto.js` remains unchanged and is
classified as PENDING PERSISTENCE DECISION.

## Approval and authority

This change records the human-approved Stage 4A brief supplied on 2026-08-27. It
is governed by the protected assignment, reviewed requirements, accepted ADRs,
canonical architecture/data model, active capability specs, and `AGENTS.md`.
