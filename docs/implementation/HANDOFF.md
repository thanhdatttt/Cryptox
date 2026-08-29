# INS-036 Execution Checkpoint

## Resume here

- **Authorization:** `INS-036 / APPROVED_FOR_EXECUTION`, exactly S-05 immutable
  `WEIGHTED_VOTE_V1` and S-06 deterministic `SMC_LITE_V1`/
  `WYCKOFF_LITE_V1`; no registration or downstream packet.
- **Starting checkpoint:** `MVP_IMPLEMENTATION` /
  `79eacf032d848549b7181a8192b15b704ec21403` (`docs(control): authorize INS-036
  strategy extensions`). Before allocation, the branch and HEAD matched the
  reviewed signal, the canonical checkout was clean, and the only diff from the
  reviewed source checkpoint was the Instructor control signal.
- **Pre-dispatch applicability:** PASS — `INSTRUCTOR.md` still named INS-036 and
  `APPROVED_FOR_EXECUTION`; C-02 and S-01 were DONE; S-05 and S-06 were BLOCKED;
  S-05/S-06 write scopes were disjoint; M-02 remained REVIEW/UNVERIFIED; and no
  other active Cryptox Manager or worker was found.
- **Task transition:** S-05 and S-06 each moved exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`. Neither is DONE because the
  mandatory deferred-scope gate is blocked by the current checker.
- **Manager/workers:** Exactly two fresh workers ran in the canonical
  same-directory checkout, with no worktree, branch, worker commit, duplicate,
  retry, or control-plane edit:
  `01a04e66-d981-7e42-b75d-1bb3b7340c73` (S-05) and
  `01a04e66-e691-7a50-af2f-b1eecd39053b` (S-06). Both left their scoped source
  and tests in the checkout and were waiting only at report handoff; the Manager
  reviewed the checkout directly and did not wait for or retry a report.

## Current execution boundary

- Dependencies for both packets are verified: `C-02 DONE` and `S-01 DONE`.
  `M-02 REVIEW/UNVERIFIED` was not reopened or used as a completion dependency.
- S-05 touched only new files under
  `modules/strategy/domain/composite/**` and
  `modules/strategy/application/composite/**`. S-06 touched only new files
  under `modules/strategy/domain/plugins/smc-lite/**` and
  `modules/strategy/domain/plugins/wyckoff-lite/**`. The only other changed
  paths are the Manager-owned `TASKS.md` and this `HANDOFF.md`.
- No canonical contracts, application ports, API index/bootstrap, existing
  plugins, shared registry/barrels, manifests, migrations, apps, generated
  artifacts, runtime configuration, requirements, ADRs, architecture,
  OpenSpec, or downstream packet was changed.

## Worker results and Manager review

### S-05 — Immutable `WEIGHTED_VOTE_V1`

- Worker implementation is pure and local to the authorized composite scopes.
  It validates same-owner exact component definitions and versions, finite
  non-negative enabled weights, positive enabled total, immutable provenance,
  inclusive `+0.30`/`-0.30` thresholds, and BUY/HOLD/SELL `+1/0/-1` scoring.
  The application adapter rejects majority/wrong profiles and resolves exact
  owner/id/version snapshots before domain execution. Focused tests explicitly
  distinguish weighted behavior from historical `MAJORITY_VOTE_V1`.
- Manager inspected all six worker paths and made one narrow readonly-test cast
  fix at `modules/strategy/application/composite/weighted-vote.spec.ts`; no
  runtime or boundary implementation was replaced.
- Focused result: 2 files, 17/17 tests PASS. Strategy package result: 12 files,
  89/89 tests PASS. Package typecheck, lint, and build PASS.

### S-06 — Deterministic Lite plugins

- Worker implementation is pure and local to the authorized plugin scopes.
  SMC Lite uses confirmed strict pivot windows and close-based BOS; Wyckoff Lite
  uses fixed prior range/volume windows for accumulation, distribution, and
  breakout. Both reject invalid/non-finite/open-candle inputs, return explicit
  insufficient-data HOLD behavior, preserve input purity, and expose truthful
  Lite descriptors/limitations without professional-methodology claims.
- Manager inspected both implementations, both focused test files, and both
  limitation READMEs. No registration, integration, or shared boundary edit was
  introduced.
- Focused result: 2 files, 20/20 tests PASS. Strategy package result: 12 files,
  89/89 tests PASS. Package typecheck, lint, and build PASS.

## Changed paths

Worker/source/test paths:

- `modules/strategy/application/composite/index.ts`
- `modules/strategy/application/composite/weighted-vote.spec.ts`
- `modules/strategy/application/composite/weighted-vote.ts`
- `modules/strategy/domain/composite/index.ts`
- `modules/strategy/domain/composite/weighted-vote.spec.ts`
- `modules/strategy/domain/composite/weighted-vote.ts`
- `modules/strategy/domain/plugins/smc-lite/README.md`
- `modules/strategy/domain/plugins/smc-lite/index.spec.ts`
- `modules/strategy/domain/plugins/smc-lite/index.ts`
- `modules/strategy/domain/plugins/wyckoff-lite/README.md`
- `modules/strategy/domain/plugins/wyckoff-lite/index.spec.ts`
- `modules/strategy/domain/plugins/wyckoff-lite/index.ts`

Manager control paths:

- `docs/implementation/TASKS.md`
- `docs/implementation/HANDOFF.md`

## Validation status

- Focused S-05: **PASS** — 17/17.
- Focused S-06: **PASS** — 20/20.
- `npm --workspace @cryptox/strategy run test`: **PASS** — 89/89.
- `npm --workspace @cryptox/strategy run typecheck`: **PASS**.
- `npm --workspace @cryptox/strategy run lint`: **PASS**.
- `npm --workspace @cryptox/strategy run build`: **PASS**.
- Root `npm run build`: **PASS**.
- Root `npm run typecheck`: **PASS** after the focused-test typing fix.
- Root `npm run lint`: **PASS**.
- Root `npm run arch:check`: **PASS** — no dependency violations; the script
  reported its expected nine forbidden-dependency fixtures.
- Root `npm run artifacts:check`: **PASS** — no source-adjacent generated
  artifacts.
- Root `npm run test:scope-check`: **PASS** — 5/5 checker tests.
- Root `git diff --check` and new-file whitespace scan: **PASS**.
- Root `npm test`: **UNVERIFIED**, not PASS — command exited 0 and all executed
  tests passed, but six environment-gated PostgreSQL/integration/e2e tests were
  skipped. Those checks are not applicable to these pure Strategy packets and
  no skipped test is claimed as PASS.
- Root `npm run scope:check`: **BLOCKED** — exit 1. It rejects the four
  authorized implementation files because the current checker does not
  allowlist `WEIGHTED_VOTE_V1`, `SMC_LITE_V1`, or `WYCKOFF_LITE_V1` in these new
  implementation boundaries. Editing the checker is outside INS-036 and was
  explicitly not done.
- Git staging: initially **BLOCKED** by the sandbox's inability to create
  `.git/index.lock`; explicit tool escalation for the exact authorized `git add`
  then succeeded. No source or scope expansion resulted.
- OpenSpec CLI status/instructions: **UNVERIFIED** — executable unavailable.
  Dedicated link/DAG automation: **UNVERIFIED** — no dedicated checker was
  present. PostgreSQL/live providers/browser/migrations were not applicable to
  this pure scope and were not claimed as PASS.

## Blocker and stop condition

The implementation and focused evidence are reviewable, but S-05 and S-06
cannot be promoted to DONE while the required root `scope:check` rejects their
authorized implementation paths. The checker reconciliation requires Instructor
review and a separately authorized scope/checker change; this Manager did not
edit it. No downstream task was promoted or started. This checkpoint is the
containing INS-036 commit; after commit, verify the final HEAD and clean status,
then return to Instructor review and stop until a new signal is issued.
