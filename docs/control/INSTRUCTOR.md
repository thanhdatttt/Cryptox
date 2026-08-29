# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-045`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-045 — Implement N-03 safe URL import and news extraction refinement

This replaceable signal supersedes `INS-044 / HOLD` and authorizes exactly one
bounded E1 implementation packet: `N-03 — Safe URL Import and Versioned News
Extraction Refinement`. It does not authorize M-03 recovery, S-04, or any other
packet.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Authorization base HEAD: `d602fde` (`docs(control): hold after M-03 worker
  interruption`); the working tree was clean before this signal.
- `C-02`, completed `N-01`, and completed `N-02` are the verified N-03 start
  dependencies. `M-03` remains `IN_PROGRESS` after its interrupted worker;
  it is not reopened or modified by this authorization. `M-02` remains
  `REVIEW/UNVERIFIED`.
- No active Cryptox Manager or worker is running. Historical Managers and
  worktrees are not to be reused, removed, reset, or treated as active.

### Authorized packet: `N-03`

- **Requirement IDs:** `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-SN-01`,
  `CSL-R-ST-05`, and `CSL-R-OB-01`.
- **Manager pre-dispatch:** Verify this signal, the N-03 DAG row, and
  `C-02`/`N-01`/`N-02` dependencies, then move only N-03 through
  `BLOCKED -> READY -> IN_PROGRESS`. READY alone is not authorization.
- **Fresh Manager:** Create exactly one new Manager in the canonical
  same-directory checkout, no worktree, with model `gpt-5.6-luna` and `max`
  reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` fully and recover authority from
  the repository before dispatch.
- **Exactly one worker:** Delegate exactly one fresh News/Sentiment boundary
  worker. No second worker, replacement, retry, duplicate Manager, or
  downstream start.
- **Worker write scope:** News implementation and focused tests under
  `modules/news/api/**`, excluding `contracts.ts` and its contract-only test,
  plus `modules/news/application/**` and `modules/news/infrastructure/**`.
  Sentiment changes are limited to the approved neutral News-to-Sentiment
  boundary/provenance join under `modules/sentiment/api/**`,
  `modules/sentiment/application/**`, `modules/sentiment/infrastructure/**`,
  excluding canonical contract files and contract-only tests. No other module.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for operational state, review, and
  checkpoint evidence. Workers must not edit control artifacts.
- **Forbidden:** canonical News/Sentiment contracts, frontend, Strategy
  internals, credentials/cookies, arbitrary user-URL persistence, migrations,
  dependencies, runtime configuration, other modules, requirements, ADRs,
  OpenSpec, `MVP_PLAN.md`, `DECISIONS.md`, and `INSTRUCTOR.md`. No direct
  browser or unbounded remote fetching.

### N-03 acceptance criteria

- Backend-only configured Website/RSS/HTML collection and allowlisted URL
  import use HTTPS only, reject localhost/private/link-local destinations,
  revalidate DNS/destination on every redirect, allow at most three redirects,
  enforce a 20-second total timeout and 1 MiB body cap, and never send or
  persist credentials/cookies or arbitrary user URLs.
- Normalize and deduplicate by canonical/provider identity and normalized
  content hash; retain safe provenance including source kind, extraction time,
  template version where applicable, and 90-day normalized retention.
- Support versioned extraction templates with `DRAFT`/`APPROVED`/`RETIRED`
  lifecycle, reviewable diff/metrics, explicit approval/rollback, and
  DRAFT-only self-healing. Raw HTML retention is seven days. No automatic
  template promotion.
- Preserve News readability when Sentiment is unavailable, timed out, or
  fails; neutral boundary joins must not fabricate a result or leak provider
  internals. Configured real News evidence is distinct from fixture/fake tests.
- If an acceptance behavior cannot be exposed within the frozen canonical
  contract/public boundary, report the exact reconciliation blocker; do not
  edit contracts or broaden scope.

### Required validation and stop condition

- Run focused News/Sentiment safe-fetch, SSRF/redirect/DNS-revalidation,
  extraction/template/retention, deduplication, provenance, and failure-
  isolation tests, plus applicable package tests.
- Run `npm run arch:check`, `npm run artifacts:check`, `npm run scope:check`,
  `npm run typecheck`, `npm run build`, `npm run lint`, and `git diff --check`.
  Run root tests and real configured News smoke only when applicable; any
  unavailable external, PostgreSQL, OpenSpec, browser, or link/DAG check is
  `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Manager must review exact changed paths, safe-fetch/security boundaries,
  provenance/retention, neutral Sentiment isolation, test counts, and scope
  drift. Record worker/Manager IDs, transitions, commit, and unavailable
  evidence.
- Stop after N-03 is reviewed, committed, and checkpointed. Do not start or
  promote M-03, S-04, Q-02, B-03, E-02, L-02, F-03, I-03, M-02, AU-02, I-01,
  I-02, or deferred scope. A fresh Instructor review is required next.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
