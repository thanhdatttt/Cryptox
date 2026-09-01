# Spec: Module-First Layered Structure

## ADDED Requirements

### Requirement: Deployable composition roots use public module APIs
The Backend and Backtest Worker applications MUST compose modules through their public `api` entrypoints. Application code MUST NOT reach into another module's domain, application, or infrastructure internals.

#### Scenario: Backend composition
- **WHEN** the Backend starts
- **THEN** it creates the module graph from public bootstrap facades and exposes only the application transport surface

#### Scenario: Worker composition
- **WHEN** the Backtest Worker starts
- **THEN** it exposes the Backtesting worker runtime and consumes the versioned queue contract without importing Backend internals

### Requirement: Layer dependency direction is enforced
Domain code MUST remain transport- and infrastructure-independent; application code MAY depend on domain and ports; infrastructure MAY implement application ports; and cross-module calls MUST use public APIs.

#### Scenario: Forbidden dependency
- **WHEN** an import violates the module or layer allowlist
- **THEN** the architecture gate fails with the offending dependency

#### Scenario: Valid module dependency
- **WHEN** a module consumes another module's documented public API
- **THEN** the architecture gate accepts the dependency

### Requirement: Queue payloads are self-contained and versioned
Backend and Worker queue messages MUST use the canonical `packages/contracts/queue` schemas and MUST carry a supported `schemaVersion` so retries and terminal signals remain compatible across process boundaries.

#### Scenario: Compatible queue job
- **WHEN** a worker receives a schema-valid backtest job
- **THEN** it can process the job using only the queue payload and its public runtime

#### Scenario: Unsupported queue version
- **WHEN** a worker receives an unknown queue schema version
- **THEN** it rejects the message without creating a backtest result
