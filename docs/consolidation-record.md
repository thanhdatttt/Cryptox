# Stage 2 Documentation Consolidation Record

## Purpose

Stage 2 replaced a large, conflicting design/specification corpus with one reviewed
requirements baseline, one architecture narrative, one conceptual data model,
accepted ADRs, and nine concise capability specs. This record identifies where the
accepted unique content went before redundant files were removed.

The pre-refinement tree is recoverable at baseline commit
`2799c67dd837a7d29cec41f7846d77bc24b41496` and at the independently reversible
Stage 2 wave commits. Removal from the active tree does not erase Git history.

## Coverage map

| Retired source | Accepted unique content retained in | Intentionally not carried forward |
|---|---|---|
| `PROJECT_GUIDE.md` | `README.md`, `AGENTS.md` | Unverified Docker/worker instructions, skeleton approval gate, stale design links |
| `docs/spec-structure.md` | `AGENTS.md`, `openspec/config.yaml`, the common capability-spec structure | Generic duplicate template |
| `docs/design/architecture.md` | `docs/architecture.md`, ADR-006, ADR-007 | Mandatory distributed topology and false implementation claims |
| `docs/design/project-structure.md` | `docs/architecture.md`, `AGENTS.md` | OpenSpec authority inversion and worker/queue as current topology |
| `docs/design/component-contracts.md` | Module ownership and flows in `docs/architecture.md`; behavior and acceptance criteria in capability specs; executable shapes remain in TypeScript | Copied interfaces, auth/ownership, optional risk fields, queue protocols |
| `docs/design/data-flow.md` | Core flows in `docs/architecture.md` and owning capability specs | Lease/fencing/watchdog/reconciliation sequences |
| `docs/design/data-model.md` | `docs/data-model.md` and ADR-007 | Competing DDL, user/tenant model, queue internals, strict artifact replay |
| `docs/design/tech-stack.md` | Truthful current status/setup in `README.md`; architectural choices in `docs/architecture.md` and ADRs | Obsolete `services/*`, unapproved Auth/OpenAI choices, mandatory Redis/BullMQ |
| `docs/design/strategy-plugins-catalog.md` | Determinism, insufficient-data policy, parameters, formulas, validation, and fixture expectations in `openspec/specs/strategy/spec.md` | MACD as an implemented built-in and deferred INFORMATION-strategy material |
| `docs/design/architecture-conventions.md` | Module/call direction in `docs/architecture.md`; evaluator boundary in Evaluation spec; strategy purity in Strategy spec | Completion-processor and sentiment-strategy assumptions outside MVP |

## Review result

- Assignment-derived requirements and classifications are retained in
  `docs/requirements.md`.
- Accepted decision history remains in `docs/adr/`; superseded portions are marked
  explicitly instead of being rewritten.
- Executable TypeScript contracts were not changed. Documentation links to the
  current public barrels and records desired contract reconciliation separately.
- Deferred or unapproved concepts were removed from active normative context rather
  than promoted during consolidation.
