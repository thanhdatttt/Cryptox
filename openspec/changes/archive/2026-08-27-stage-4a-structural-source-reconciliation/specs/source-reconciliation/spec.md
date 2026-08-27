# Source Reconciliation Capability Delta

## Requirements

### Requirement: Executable structure matches the approved MVP architecture

Active source MUST implement the synchronous modular-monolith dependency rules and
MUST NOT require deferred Auth, risk, queue/distributed execution, or strict-replay
mechanisms.

#### Scenario: Dependency boundaries are verified

- **Given** the reconciled source tree
- **When** architecture checks run
- **Then** domain-to-other-module, package-to-module, reverse application/API,
  forbidden deep-import, and critical-cycle violations fail the check

### Requirement: Build and resolution have one source of truth

Production output MUST remain beneath ignored build directories, and tracked
source-side generated module `.js`/`.d.ts` files MUST be absent.

#### Scenario: Clean build remains isolated

- **Given** a clean dependency installation
- **When** build and generated-artifact checks run
- **Then** the build succeeds, output remains isolated, and no source-side module
  sidecar is generated or resolved

### Requirement: Local execution seam is bounded and mechanism-neutral

Backtesting MUST expose a mechanism-neutral execution port. The local MVP adapter
MUST enforce configurable capacity and MUST use an injected runner without
implementing the real simulator.

#### Scenario: Capacity and terminal outcome are deterministic

- **Given** a bounded executor and fake runner
- **When** submissions reach and exceed capacity
- **Then** active work never exceeds the bound, excess submission is saturated,
  and every accepted execution has exactly one terminal outcome

### Requirement: Runtime state is truthful

The active topology MUST NOT require Redis or a separate worker. Backend liveness
and readiness MUST distinguish process life from unavailable required capability
dependencies.

#### Scenario: Incomplete capability is not reported ready

- **Given** active feature dependencies are unavailable
- **When** liveness and readiness are queried
- **Then** liveness succeeds and readiness reports unavailable without composing
  fake dependencies
