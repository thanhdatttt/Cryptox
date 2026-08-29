# MVP Delivery Capability Delta

## ADDED Requirements

### Requirement: Complete REQUIRED MVP coverage

Implementation MUST satisfy every REQUIRED ID in `docs/requirements.md` and MUST
retain requirement-to-task-to-test traceability in the approved durable program.

#### Scenario: Requirement coverage is auditable

- **Given** the completed implementation program
- **When** a fresh reviewer follows the requirement matrix and task evidence
- **Then** every REQUIRED ID resolves to implemented behavior, passing acceptance
  evidence, and an owning module or integration boundary

### Requirement: Approved architecture and decisions remain stable

Workers MUST preserve the accepted synchronous modular-monolith boundaries and the
versioned MVP V1 behavior decisions recorded in `docs/implementation/MVP_PLAN.md`.

#### Scenario: Parallel work does not drift shared contracts

- **Given** the approved contract-freeze checkpoint
- **When** capability workers implement disjoint task packets
- **Then** they use public module APIs, remain within their allowed write scopes,
  and do not reopen frozen ranking, strategy, composite, provider, Sentiment, or
  demo-default decisions

### Requirement: Execution state survives conversation loss

The program MUST keep one mutable task board and one latest checkpoint sufficient
for a fresh Manager to determine the next safe work without hidden context.

#### Scenario: Fresh Manager resumes

- **Given** only the repository and Git history
- **When** a new Manager reads the canonical sources and implementation artifacts
- **Then** it can identify READY work, dependencies, write boundaries, validation,
  critical path, blockers, and the current checkpoint

### Requirement: Later instructor change is explicit

The program MUST preserve P-00 and C-01 as completed history and MUST represent the
later Authentication, per-user ownership, and real-data requirements through an
explicit reconciliation task and additive contract gate.

Traceability: `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`.

#### Scenario: C-01 history is not rewritten

- **Given** C-01 completed against the earlier approved baseline
- **When** the later instructor requirement is incorporated
- **Then** C-01 remains DONE and C-01A becomes the next ownership-sensitive contract gate

### Requirement: Private resources are user-scoped

Implementation MUST derive authenticated identity from trusted server request
context and isolate the approved Strategy, Search, Backtesting, and Leaderboard
roots without adding owner identity to every child entity.

Traceability: `CSL-R-AU-01`, `CSL-R-OW-01`.

#### Scenario: Parallel capability work preserves ownership boundaries

- **Given** the C-01A contract checkpoint and approved ownership model
- **When** capability workers implement private resources
- **Then** repository access is owner-scoped, child ownership follows its approved parent, and pure calculations remain independent of Auth infrastructure

### Requirement: Final evidence uses real data paths

Deterministic fixtures MAY support development and automated tests, but final/demo
acceptance MUST prove real configured providers, persisted application/Auth state,
and application-generated Backtest/Leaderboard results without silently selecting
mock data sources.

Traceability: `CSL-R-RD-01`.

#### Scenario: Final configuration is not mock-backed

- **Given** the final/demo runtime profile
- **When** readiness and acceptance evidence are collected
- **Then** real Binance history/realtime, real News, PostgreSQL state, Auth, Backtest, and Leaderboard paths are demonstrated or reported BLOCKED/UNVERIFIED

### Requirement: Approved functional extension profiles are traceable

The program MUST implement the bounded 2026-08-29 functional profiles only after
their requirements, decision ledger, ADRs, architecture/data model, capability
specifications, and future reconciliation packets agree. Historical DONE evidence
is preserved; later work is represented by new reconciliation/extension packets.
No screenshot layout or pixel-perfect frontend requirement is implied.

Traceability: `CSL-R-MD-03`, `CSL-R-ST-05`, `CSL-R-ST-06`, `CSL-R-ST-07`,
`CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`; DEC-007.

#### Scenario: Re-baseline precedes future execution planning

- **Given** the approved 2026-08-29 functional amendment and preserved task history
- **When** the Manager later receives a new explicit execution signal
- **Then** it creates reconciliation/extension planning from this authority chain
  without rewriting completed packet history or treating this governance change as
  current task authorization
