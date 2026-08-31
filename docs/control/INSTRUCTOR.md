# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-162`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-162 — APPROVED_FOR_EXECUTION for OpenSpec and traceability reconciliation

This instruction supersedes `INS-161 / HOLD` and authorizes one narrowly
bounded documentation/specification reconciliation within the existing final
I-02 verification boundary. It repairs validator compatibility and missing
requirement-to-plan links only; it adds no product capability and does not
promote I-02 or start downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, reviewed HEAD
  `5d14f27598f2b2b25c0f3d4ec44f9319a1009f9a` (the current `INS-161 / HOLD`
  governance checkpoint). The tracked tree is clean; `.codex/config.toml` remains the
  pre-existing untracked item and the ignored `.env` remains outside Git.
- `TASKS.md` is authoritative at `58` rows: `57` `DONE`, only `I-02`
  `REVIEW`, with no `READY` or `IN_PROGRESS` row. `N-03S`, `N-03R`, `I-02D`,
  `I-01`, and `I-03` are `DONE`; no Cryptox Manager or worker is active.
- Instructor execution proved OpenSpec CLI `1.11.0` is installed and
  executable through the local npm shim. `openspec validate --all
  --no-interactive --json` currently passes the active `mvp-implementation`
  change and fails exactly the ten capability specs because the CLI requires
  `## Purpose` and `## Requirements` while those files currently start with
  `## Purpose and boundary`.
- Independent review also identified seven required IDs not literally covered
  by the current `MVP_PLAN.md` traceability: `CSL-R-AR-02`,
  `CSL-R-AR-03`, `CSL-R-MD-01`, `CSL-R-SE-01`, `CSL-R-SE-02`,
  `CSL-R-ST-02`, and `CSL-R-VIS-01`. This is a documentation reconciliation,
  not authority to change their approved behavior.

### Authorized Manager and workers

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The
Manager must reread `AGENTS.md` and
`docs/control/prompts/ORCHESTRATOR_START.md`, verify this signal and
`DEC-083`, compare the actual Git checkpoint with this record, and confirm no
competing task before dispatch.

The Manager may create exactly two fresh hidden internal workers, sequentially
because the canonical checkout is shared, with disjoint write scopes:

1. OpenSpec worker: may edit only the ten active files under
   `openspec/specs/{auth,backtesting,evaluation,frontend,leaderboard,market-data,news,search,sentiment,strategy}/spec.md`.
   It may normalize the required top-level heading to the CLI's accepted
   `## Purpose` form while preserving the existing purpose/boundary content,
   requirements, scenarios, traceability, and meaning. It may not edit the
   active change, archived changes, `openspec/config.yaml`, source, tests, or
   any other file.
2. Traceability worker: may edit only `docs/implementation/MVP_PLAN.md` to
   add a concise mapping for the seven identified IDs to existing approved
   packets/evidence and links. It may not change requirement meaning, packet
   objectives, dependencies, task states, scope, source, tests, or any other
   document.

Workers must use the internal subagent mechanism, `gpt-5.6-luna` with `max`
reasoning and the fastest service tier when exposed. They may not edit
`TASKS.md`, `HANDOFF.md`, `INSTRUCTOR.md`, `DECISIONS.md`, requirements, ADRs,
environment files, credentials, or create/retry/replace another worker.

### Acceptance, validation, and stop condition

- `openspec validate --all --no-interactive --json` must exit successfully with
  all active specs and the active change valid. A CLI unavailable in Manager
  context remains `UNVERIFIED` there; Instructor will independently rerun the
  absolute installed shim and will not infer PASS.
- The seven IDs must be traceable in `MVP_PLAN.md` to existing packets and
  current evidence without adding a task, changing the DAG, or claiming live
  evidence that is not present. Existing links and requirement authority must
  remain intact.
- The Manager must run Markdown/link/DAG/scope/secret/whitespace/diff checks
  proportionate to the two documentation scopes, review both worker diffs, and
  record exact results in `HANDOFF.md`. The Manager alone may move I-02
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; it must not mark I-02 `DONE`
  under this documentation-only packet.
- Any need for another path, semantic requirement change, source repair,
  provider/Docker/migration change, or task addition is
  `NEEDS_INSTRUCTOR_REVIEW`. Each worker runs once; no retry or replacement.
  The Manager makes at most one explicit-path checkpoint commit attempt and
  stops after this authorization.

No native Gemini integration, `GEMINI_*` mapping, automatic retry/fallback,
credential change, source/test implementation, fixture substitution, deferred
scope, final I-02 promotion, or downstream task is authorized.

## INS-161 — HOLD after independent final I-02 review

This is the Instructor's replaceable safe checkpoint after `INS-160 /
APPROVED_FOR_EXECUTION` was exhausted. N-03S is accepted and operationally
closed, but the final I-02 evidence is incomplete. This HOLD authorizes no
implementation and no downstream execution.

### Verified checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, HEAD `15a0314f913f5229bb6a5c8589ff244419f56cd3`
  (`chore(control): record INS-160 final verification`). The exact Manager
  delta was limited to `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the pre-existing untracked
  `.codex/config.toml` remains excluded. Source/business drift from the
  accepted `c228117` checkpoint is empty.
- `TASKS.md` remains the sole operational authority with `58` rows: `57`
  `DONE`, only `I-02` `REVIEW`, and no `READY`, `IN_PROGRESS`, or `BLOCKED`
  row. `N-03S`, `N-03R`, `I-02D`, `I-01`, and `I-03` are `DONE`.
- INS-160 used exactly one fresh Manager and three fresh hidden read-only
  verifiers, all completed and closed without file changes, duplicate,
  retry, replacement, or worktree. The Manager's one denied checkpoint
  commit attempt was independently integrated by the Instructor; it was not
  retried by that Manager.

### Independent evidence and remaining gaps

- Deterministic source and I-02 fixture evidence remains accepted: workspace
  `462` tests with nine environment-gated skips, focused I-02 backend `6/6`
  and frontend `5/5` on each of two runs, build/typecheck/lint,
  architecture, artifacts, scope/deferred `15/15`, and runtime smoke.
- N-03S remains accepted at `c228117`: safe-fetch `7/7`, News `36/36`, and
  live CoinDesk RSS through the production safe runtime returned five
  normalized items. Docker/PostgreSQL/migration evidence remains the
  previously accepted Instructor-side evidence at its stated boundary.
- The root ignored `.env` now selects `gemini-3.6-flash`. A real
  `createConfiguredAuthoringProvider` call through the OpenAI-compatible
  Gemini endpoint returned a structured draft with `fastPeriod` and
  `slowPeriod`; this is strong provider-boundary evidence but not yet proof
  of REST Save/Approve persistence in the running application.
- OpenSpec is installed and executable in the Instructor context as version
  `1.11.0`. `openspec validate --all --no-interactive --json` validates the
  active `mvp-implementation` change but fails all ten capability specs for
  missing `## Purpose` and `## Requirements`. This is a real validation
  failure, not an unavailable CLI, and no spec repair is authorized by the
  expired INS-160 scope.
- Current authenticated PostgreSQL/Auth ownership E2E, configured Binance
  application/realtime evidence, authenticated real-data browser/demo,
  clean install/reprovision, full application LLM Save/Approve, traceability
  reconciliation, and a consolidated eight-scenario executable matrix are
  not yet proven. They remain `BLOCKED`/`UNVERIFIED` as applicable; fixtures,
  skips, static prose, and prior historical evidence cannot be promoted.

### HOLD boundary

The MVP is not complete. A future authorization must first address the
OpenSpec/traceability validation gap in a separately bounded packet and may
then revalidate the existing I-02 live/demo evidence. Native Gemini code,
automatic retry/fallback, provider redesign, credential changes, fixture
substitution, deferred scope, or unrelated source repair are not authorized
by this HOLD.

## INS-160 — APPROVED_FOR_EXECUTION for E5R closure and final I-02 revalidation

This instruction supersedes `INS-159 / HOLD` and authorizes one bounded final
revalidation of the existing I-02 packet after the E5R residual join. It is
not new product scope and does not authorize a provider redesign, feature
repair, or downstream execution.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, reviewed HEAD
  `a4520dc69867ee0771da8a5fe10f194217694b84` (`chore(control): hold after
  N-03S acceptance`). The tracked tree is clean; the pre-existing untracked
  `.codex/config.toml` remains excluded. The ignored root `.env` is local
  configuration and is not part of the checkpoint.
- `TASKS.md` is the sole operational state authority with `58` rows: `56`
  `DONE`, `I-02` `REVIEW`, `N-03S` `REVIEW`, and no `READY` or `IN_PROGRESS`
  row. `N-03R`, `I-02D`, `I-01`, and `I-03` are `DONE`. N-03S's source/live
  acceptance is independently recorded at `c228117`; its remaining `REVIEW`
  state is a Manager-owned operational closure, not permission to change the
  source.
- `N-03R` and `I-02D` satisfy the E5R residual join in `MVP_PLAN.md`; the
  accepted N-03S source correction and live CoinDesk safe-runtime result are
  now independently reviewed. No Cryptox Manager, worker, retry, replacement,
  duplicate, or worktree is active.
- The current final I-02 acceptance remains governed by every applicable
  required requirement, the approved functional amendment behavior, DEC-007
  extension evidence already represented by the dependency packets, accepted
  ADRs, architecture, data model, and the existing I-02 packet. Fixtures,
  skipped tests, documentation statements, and historical results cannot
  satisfy live/demo claims.

### Authorized Manager and delegation

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The
Manager must reread `AGENTS.md` and
`docs/control/prompts/ORCHESTRATOR_START.md`, verify this signal and
`DEC-081`, compare the reviewed checkpoint with Git, and confirm that no
competing Cryptox task is active before executing.

The Manager may create at most three fresh hidden internal read-only
verifiers, with disjoint scopes and no user-visible task or manual approval.
They may run in parallel because they may not write files:

1. Backend verifier: existing I-02 backend tests, Auth/PostgreSQL and
   ownership boundary checks, REST/WebSocket/provider boundary checks, and
   real configured provider evidence when available.
2. Frontend/demo verifier: existing I-02 frontend tests and configured-mode
   functional/browser projection checks when the browser environment is
   available, including truthful fixture/live labeling.
3. Setup/traceability verifier: clean-install/reprovision where available,
   README/path and requirement/DAG/link reconciliation, architecture-change
   scenario review, and OpenSpec CLI status.

Every verifier must use the internal subagent mechanism, `gpt-5.6-luna` with
`max` reasoning and the fastest service tier when the platform exposes one.
Verifiers may not edit any file, request or print credentials, use the
chat-supplied key, create another Manager/worker, retry or replace a failed
verifier, or promote unavailable evidence.

### Exact Manager-owned scope

- Close only `N-03S` from `REVIEW -> DONE` after verifying its accepted
  checkpoint; no N-03S source change is authorized.
- Re-enter only `I-02` through `REVIEW -> READY -> IN_PROGRESS`, run the
  existing final verification, and move it to `REVIEW` or `DONE` strictly
  according to complete evidence. The Manager alone may update
  `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for these operational transitions.
- The Manager may record final acceptance/checkpoint evidence in
  `HANDOFF.md`; no source, test, README, contract, migration, infrastructure,
  environment, requirements, ADR, OpenSpec, or other control-plane feature
  change is authorized. If a concrete implementation defect is found, stop at
  `NEEDS_INSTRUCTOR_REVIEW` rather than fixing it under this signal.

### Required acceptance and validation

The Manager must verify the existing I-02 scenarios: real PostgreSQL-backed
register/login/session expiry/logout; unauthenticated rejection and User A/B
ownership isolation; Binance historical/realtime behavior and recovery;
four-chart and multi-timeframe projections; strategy definitions/composites;
bounded Search/progress/Top-K/selected Experiment; signals, entry/exit,
markers/overlays; four metrics and provenance; real-source News and local
LEXICON sentiment; configured LLM draft/failure behavior with deterministic
validation and explicit Save/Approve when the provider is available; mock-only
final configuration rejection; and all eight architecture change scenarios.

It must run the applicable focused/full tests and quality gates, clean setup
and migration evidence, build, typecheck, lint, architecture, artifacts,
scope/deferred checks, runtime smoke, exact-path/whitespace/diff checks, and
E2E evidence twice where the environment supports it. Docker, PostgreSQL,
providers, browser, clean install, or OpenSpec checks that are unavailable
must remain `BLOCKED`/`UNVERIFIED`; they are never PASS by inference. The
configured Gemini completion currently has observed timeout/503 behavior and
must be reported at that boundary unless a real current run completes.

### Prohibitions and stop condition

No native Gemini adapter, `GEMINI_*` mapping, automatic retry/backoff or
fallback, fixture substitution, credential change, provider addition, source
repair, migration/Docker redesign, deferred scope, or downstream packet is
authorized. The Manager must make at most one explicit-path checkpoint
staging/commit attempt and stop after this packet. `I-02` may become `DONE`
only when the complete final evidence and Full MVP DoD are actually proven;
otherwise it remains `REVIEW` with precise blockers. Instructor will audit
the result independently before any final closure.

## INS-159 — HOLD after independent N-03S acceptance and live-provider review

This is the Instructor's replaceable safe checkpoint after the `INS-158 /
APPROVED_FOR_EXECUTION` implementation scope was exhausted. It records
acceptance of the bounded N-03S source correction and keeps the final I-02
decision on hold until the remaining live/demo evidence is independently
proved. It authorizes no implementation and no downstream execution.

### Verified checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, HEAD `c228117` (`fix(news): support Node 22 pinned
  lookup shape`).
- The exact four-file Manager checkpoint was integrated by the Instructor:
  `modules/news/infrastructure/safe-fetch.ts`,
  `modules/news/infrastructure/safe-fetch.spec.ts`,
  `docs/implementation/TASKS.md`, and `docs/implementation/HANDOFF.md`.
  The pre-existing untracked `.codex/config.toml` remains excluded. The
  ignored root `.env` is local configuration and is not part of Git evidence;
  no credential value is recorded here.
- Independent acceptance of N-03S passed focused safe-fetch `7/7`, News
  `36/36`, backend `43` tests with one environment-gated skip, workspace
  `462` tests with nine environment-gated skips, build, typecheck, lint,
  architecture, artifacts, scope/deferred checks, runtime smoke, exact-path,
  secret/logging, whitespace, and diff checks.
- Instructor-owned live CoinDesk RSS through
  `composeConfiguredNewsProviders` and the production safe runtime returned
  a non-empty normalized RSS result (`5` items). This is live runtime evidence,
  not a direct HTTP-only claim.
- The N-03S Manager used exactly one fresh hidden worker, stopped at `REVIEW`,
  and made one denied checkpoint staging attempt without retry. No competing
  Cryptox Manager, worker, duplicate, retry, replacement, or worktree is
  active.
- Operational state remains Manager-owned: `TASKS.md` has `58` rows, `56`
  `DONE`, `I-02` `REVIEW`, and `N-03S` `REVIEW`; no `READY` or `IN_PROGRESS`
  row exists. N-03R and I-02D remain `DONE`.

### Remaining final evidence

- The local `.env` now contains the provider-neutral `LLM_AUTHORING_*`
  configuration, and the configured Gemini model metadata endpoint returned
  successfully. A real `gemini-3.7-flash` completion through the application
  adapter did not complete within the bounded timeout and direct probes also
  observed provider unavailability; therefore structured draft validation and
  Save/Approve persistence remain `BLOCKED`, not PASS. A small diagnostic
  request using another model is not application acceptance.
- Authenticated real-data browser/demo coverage, clean-install/reprovision,
  and formal OpenSpec CLI validation remain `UNVERIFIED` or `BLOCKED` as
  applicable. Docker/PostgreSQL/migration evidence remains the previously
  accepted Instructor-side evidence and must not be confused with Manager
  local tool availability.

### HOLD boundary

The E5R join is now eligible for a fresh, explicitly bounded final I-02
revalidation authorization because N-03R and I-02D are `DONE` and N-03S has
independent source/live acceptance. That next signal may include only the
Manager-owned closure/reconciliation of N-03S and final I-02 evidence under
the existing `MVP_PLAN.md` packet; it may not add native Gemini code, automatic
fallback/retry, new providers, fixture substitution, or unrelated fixes.
Until that signal is committed and reverified, the system remains on `HOLD`.

## INS-158 — APPROVED_FOR_EXECUTION for N-03S pinned HTTPS transport correction

This instruction is issued after the `INS-157 / HOLD` review and the
Instructor's independent diagnosis of the remaining real-News failure. It
authorizes one narrowly bounded implementation correction for the existing
approved safe News boundary. It does not reopen N-03, N-03A, or N-03R and does
not add product scope.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, reviewed HEAD
  `c0a5d67032fdc04a25a0023794d6bf634cff8ce8` (`chore(control): hold after
  environment reconciliation`). The tracked tree is clean; the pre-existing
  untracked `.codex/config.toml` remains excluded.
- `TASKS.md` is the sole operational state authority with 57 rows: 56 `DONE`,
  only `I-02` at `REVIEW`; `N-03`, `N-03A`, and `N-03R` are `DONE`; no other
  row is active. `I-01`, `I-02D`, and `I-03` remain `DONE`.
- No Cryptox Manager, worker, retry, replacement, duplicate, or worktree is
  active. The accepted source/business/test checkpoint remains
  `48301b240b533db4cdf53651eaaea24a3225e9ac`; later commits are governance-only
  and the reviewed source has no material drift.
- Applicable authority is `CSL-R-NW-02`, `CSL-R-RD-01`, `CSL-R-NW-01`,
  `CSL-R-OB-01`, the applicable `CSL-R-RP-02` provenance boundary, ADR-009,
  the News capability specification, and the N-03S packet in `MVP_PLAN.md`.

Instructor diagnosis used a real public CoinDesk RSS URL with no credential.
The normal HTTPS request returned 200, while the existing default pinned
transport failed before response handling because Node 22 supplied the custom
lookup with `all=true`; the resulting `ERR_INVALID_IP_ADDRESS` was surfaced as
`SafeNewsFetchError / HTTP_ERROR`. This is a source transport defect. Docker,
PostgreSQL, and migration evidence remain separately recorded as Instructor
PASS at their own boundary and are not part of this packet.

### Authorized scope

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager
must reread `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`, verify
this signal and `DEC-079`, compare the reviewed checkpoint with Git, and
confirm the absence of competing Cryptox tasks before dispatch.

The Manager may create exactly one fresh hidden internal worker, with this sole
implementation scope:

- `modules/news/infrastructure/safe-fetch.ts`
- `modules/news/infrastructure/safe-fetch.spec.ts`

The worker may correct the default pinned HTTPS transport's Node lookup callback
compatibility and add narrowly scoped regression coverage. It must preserve
validated address pinning and TLS/SNI, HTTPS-only and allowlist checks,
redirect/DNS/private-destination revalidation, omission of credentials/cookies,
the 20-second timeout, and the 1 MiB body limit.

The Manager alone may update only `docs/implementation/TASKS.md` and
`docs/implementation/HANDOFF.md` for the N-03S operational checkpoint. No
worker may edit control-plane files.

### Acceptance and stop condition

- Focused safe-fetch tests cover the corrected pinned transport path and retain
  existing unsafe-destination, redirect, timeout, body-limit, and no-credential
  behavior.
- Applicable News/backend tests, build, typecheck, lint, architecture,
  artifact, deferred-scope, runtime-smoke, exact-path, whitespace, and diff
  checks are run and truthfully recorded.
- After integration, the Instructor independently reruns the live CoinDesk RSS
  path through `composeConfiguredNewsProviders`/the production safe runtime.
  A non-empty normalized response is required for PASS; direct HTTP status,
  fixture output, skipped tests, or unavailable environment is not PASS.
- Any need to edit another path, alter a contract/provider protocol, weaken
  validation, add a credential, or change Docker/PostgreSQL/migrations is
  `NEEDS_INSTRUCTOR_REVIEW` and stops execution.

No unrestricted fetch fallback, allowlist weakening, CoinDesk API-key
requirement, native Gemini integration, `GEMINI_*` mapping, secret, retry,
replacement, duplicate, worktree, I-02 promotion, or downstream packet is
authorized. The Manager must move only N-03S through
`BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, perform one worker review and one
checkpoint commit attempt, then stop for independent Instructor review.

## INS-157 — HOLD after Instructor-owned environment reconciliation

`INS-156 / DEC-077` is accepted as a control-only reconciliation. The
Manager-owned `TASKS.md` and `HANDOFF.md` now correctly point to the accepted
source/runtime/test commit and distinguish Instructor-owned Docker evidence
from Manager-local tool availability. No feature code was changed by
INS-156, and I-02 remains `REVIEW`.

### Verified checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, accepted HEAD
  `c896ad3` (`chore(control): reconcile I-02 environment checkpoint`). The
  accepted source/business/test checkpoint remains
  `48301b240b533db4cdf53651eaaea24a3225e9ac`; the latest commit is only the
  Manager-owned control reconciliation. The pre-existing untracked
  `.codex/config.toml` remains excluded.
- `TASKS.md` has 57 rows: 56 `DONE`, only `I-02` at `REVIEW`; no other task is
  active. `I-01`, `I-02D`, and `I-03` remain `DONE`. No Manager, worker,
  retry, replacement, duplicate, or worktree is active.
- INS-156 changed only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; its one Manager commit attempt was
  denied by `.git/index.lock`, and the Instructor integrated the exact
  reviewed two-file delta at `c896ad3`.

### Instructor-owned environment result

The prior repeated Docker block is resolved as an execution-context issue.
From the Instructor context, Docker daemon and Compose were available;
Compose interpolation passed; local PostgreSQL migration validation passed
`up -> constraints -> down -> remigrate`; project-scoped backend/frontend
images built and started with `--wait`; `postgres-dev`, `postgres-test`,
backend, and frontend were healthy; `/live=200`, `/ready=200`, and the
frontend root returned `200`; backend's sanitized database target was
`postgres-dev:5432/cryptox_development`; and exact project teardown completed
without removing named volumes or unrelated containers. These are PASS
evidence recorded in `DEC-077`, not Manager-local Docker evidence.

Future Manager reports of Docker pipe/config `UNAVAILABLE` must remain
`UNVERIFIED`/`BLOCKED`; they must not erase this committed Instructor evidence
or be converted to PASS without a real check. Instructor will continue to run
environment-gated Docker/PostgreSQL checks where needed, while Managers keep
ownership of source-scope review and `TASKS/HANDOFF` transitions.

### I-02 remains incomplete

The remaining acceptance gates are:

- live CoinDesk RSS through the production safe runtime provider. The current
  attempt is `BLOCKED` with `SafeNewsFetchError` reason `HTTP_ERROR`; a direct
  URL returning HTTP 200 is not runtime-provider evidence;
- live Gemini-compatible authoring through the existing `LLM_AUTHORING_*`
  contract, structured draft validation, and explicit Save/Approve persistence.
  The root `.env` is absent; the previously exposed chat key is unsafe and
  must not be used. A newly rotated local key is required and must never enter
  Git or chat;
- authenticated real-data browser/demo coverage for registration/login,
  ownership isolation, Binance historical/realtime and recovery,
  multi-timeframe charts, strategy/authoring, combination/search/backtest/
  evaluation/leaderboard/trade visualization, real News, and Sentiment;
- clean-install/reprovision evidence; and
- formal OpenSpec CLI validation, which remains `UNVERIFIED/BLOCKED` while
  the executable is unavailable.

The deterministic source gates, Docker/PostgreSQL boundary, and application
health boundary do not by themselves permit `I-02 -> DONE`. Keep the system
on `HOLD`; no downstream packet, provider redesign, native Gemini SDK,
credential use, retry, duplicate, or unrelated repair is authorized until a
new narrowly scoped signal is issued.

## INS-156 — APPROVED_FOR_EXECUTION for I-02 checkpoint reconciliation

This is a control-only follow-up to `INS-155 / HOLD`. The Instructor has
collected the local Docker/Compose/PostgreSQL evidence that the prior Manager
context could not access. The sole purpose of this instruction is for one
fresh Manager to reconcile its Manager-owned checkpoint files with the
accepted source commit and the durable evidence in `DEC-077`. It does not
authorize feature implementation, a worker, I-02 promotion, or downstream
work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, reviewed HEAD
  `59a69e1` (`chore(control): hold after RSS correction review`). The source
  and deterministic-test checkpoint is accepted at `48301b2`; the tracked
  tree is clean and the pre-existing untracked `.codex/config.toml` remains
  excluded.
- `TASKS.md` is the sole operational state authority with 57 rows: 56 `DONE`,
  only `I-02` at `REVIEW`, and no other active task. `I-01`, `I-02D`, and
  `I-03` remain `DONE`. The INS-154 Manager and worker are terminal; no
  Manager, worker, retry, replacement, duplicate, or worktree is active.
- Instructor-side evidence in `DEC-076`/`DEC-077` is the applicable source
  for the environment boundary. The Manager must not downgrade that evidence
  merely because its own unprivileged Docker context cannot open the Windows
  daemon, and must not upgrade any unavailable live-provider or browser
  evidence.

### Authorized Manager scope

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. It must
re-read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`, verify
this signal and `DEC-077`, compare the reviewed checkpoint with Git, and
confirm there is no competing active Cryptox task. If any material premise
differs, stop with `NEEDS_INSTRUCTOR_REVIEW`.

No implementation worker is needed or authorized for this control-only packet.
The Manager may edit only:

- `docs/implementation/TASKS.md`
- `docs/implementation/HANDOFF.md`

It must move only the existing `I-02` row through
`REVIEW -> READY -> IN_PROGRESS -> REVIEW`, reconcile the stale
pre-integration wording to accepted source commit `48301b2`, and record the
Instructor-observed Docker/Compose/PostgreSQL/migration evidence plus the
remaining `BLOCKED`/`UNVERIFIED` final-I-02 gates. It must preserve every other
task and state. It must not edit source, tests, `.env`, credentials,
`INSTRUCTOR.md`, `DECISIONS.md`, requirements, ADRs, OpenSpec artifacts, or
any other path; it must not start a worker, feature packet, retry, replacement,
duplicate, or downstream task.

### Acceptance and stop condition

- The only tracked delta is the two Manager-owned checkpoint files. The
  checkpoint references `48301b2` as the accepted source commit and records
  Docker daemon/Compose interpolation, full backend/frontend Compose health,
  internal `postgres-dev` database wiring, migration validation, and project
  teardown as Instructor evidence. It keeps live CoinDesk RSS (runtime
  `HTTP_ERROR`), live Gemini, authenticated browser/demo, clean-install, and
  OpenSpec CLI evidence truthful as `BLOCKED`/`UNVERIFIED`.
- No credential may be requested, printed, logged, stored, or committed. The
  root `.env` remains user-created and absent; the previously exposed chat key
  remains unusable. The Docker build's package-audit warning is recorded as an
  observation only and is not silently repaired under this control packet.
- The Manager may make one explicit-path checkpoint commit attempt containing
  only `TASKS.md` and `HANDOFF.md`. If Git denies it, report once and stop;
  do not retry. After review and the single attempt, stop immediately with
  `I-02` at `REVIEW`. The Instructor will independently audit and integrate if
  necessary, then issue the next bounded signal.

No downstream packet is authorized by `INS-156`.

## INS-155 — HOLD after INS-154 optional RSS allowlist correction

INS-154 / DEC-075 is accepted at its bounded source and deterministic-test
boundary after independent Instructor review. The optional
`COINDESK_RSS_ALLOWED_URLS=` value is now treated as absent only for that
optional RSS list, so the copied secret-free `.env.example` shape composes the
configured CoinDesk RSS source while malformed, all-empty, unsafe, and
unallowlisted configurations remain fail-closed. This correction does not
promote I-02 or authorize downstream work.

### Accepted checkpoint and independent evidence

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, accepted HEAD
  `48301b240b533db4cdf53651eaaea24a3225e9ac` (`fix(runtime): accept blank
  optional RSS allowlist`). The commit contains exactly the two authorized
  runtime/test paths and Manager-owned `TASKS.md`/`HANDOFF.md`; the
  pre-existing untracked `.codex/config.toml` remains excluded.
- The single fresh INS-154 Manager and single hidden worker Sartre completed
  once, with no retry, replacement, duplicate, branch, worktree, or
  downstream dispatch. I-02 transitioned exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW` and remains `REVIEW`.
- Deterministic acceptance is independently reproduced: focused runtime
  `14/14 PASS`; backend `43 PASS / 1 environment-gated skip`; full workspace
  tests exit 0; root/backend build, typecheck, and lint pass; architecture,
  artifacts, deferred-scope, scope regression `15/15`, runtime smoke,
  exact-path, secret-shaped diff, whitespace, and diff checks pass.
- Instructor-side environment checks now establish Docker daemon access,
  Docker Compose interpolation, healthy existing `postgres-dev` and
  `postgres-test` containers, and local migration validation
  `up -> constraints -> down -> remigrate` as `PASS`. This does not yet prove
  the full backend/frontend Compose demo or authenticated application flow.
- The Manager's one checkpoint commit attempt was denied before staging by
  `.git/index.lock: Permission denied`; no retry was made. The parent
  Instructor integrated the exact reviewed four-file delta in `48301b2`
  without changing its content. `TASKS.md` and `HANDOFF.md` still contain the
  Manager's truthful pre-integration wording and require Manager-owned
  checkpoint reconciliation before the next acceptance decision.

### I-02 completion criteria still not proven

I-02 cannot be marked `DONE` until the following evidence is real and
reconciled in the repository checkpoint, rather than inferred from fixtures or
deterministic tests:

- a full Docker Compose application run with backend/frontend health, internal
  PostgreSQL `DATABASE_URL`, migration/teardown evidence, and persisted Auth
  plus application data;
- a live configured CoinDesk RSS request through the existing safe News
  boundary, with no fixture fallback;
- a live configured Gemini-compatible authoring request through the existing
  `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`, and
  `LLM_AUTHORING_API_KEY` names, including structured draft validation and the
  explicit Save/Approve persistence path. The root `.env` is currently absent;
  the previously exposed chat key is revoked/unsafe and must not be used. A
  newly rotated local key is required and must never enter Git or chat;
- an authenticated real-data browser/demo proving registration/login,
  per-user isolation, Binance historical/realtime delivery and recovery,
  independent multi-timeframe charts, strategy add/select and authoring,
  combination/search/backtest/evaluation/leaderboard/trade visualization,
  real-source News, and Sentiment behavior;
- clean-install/reprovision evidence for the delivered repository; and
- formal OpenSpec CLI validation if the executable becomes available. Its
  absence remains `UNVERIFIED`, never `PASS`.

Keep I-02 at `REVIEW` and do not start `M-02`, `AU-02`, `S-04`, `I-01`,
`I-03`, or any other packet under this HOLD. A future authorization may first
reconcile only the Manager checkpoint and collect the remaining final-I-02
evidence through one fresh Manager; no feature scope is implied.

## INS-154 — APPROVED_FOR_EXECUTION for optional RSS allowlist reconciliation

This signal supersedes `INS-153 / HOLD` and authorizes one narrow correction
to the already integrated INS-152 provider configuration. It exists because
independent review found that an empty optional
`COINDESK_RSS_ALLOWED_URLS=` line in the supported root `.env.example` is
currently classified as invalid, so copying the template prevents the valid
RSS URL/host/prefix configuration from composing. This is not a new provider,
new product scope, or permission to promote I-02 or start downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, reviewed HEAD
  `7c10afa14eff40adb85603453d2c743c6a7acfd0`. This commit integrates the
  exact reviewed INS-152 output; the tracked working tree is clean and the
  pre-existing app-generated `.codex/config.toml` remains untracked and
  excluded.
- `TASKS.md` remains the sole operational state authority with 57 rows: 56
  `DONE`, only `I-02` at `REVIEW`, and no other active task. `I-02D`, `I-01`,
  and `I-03` remain `DONE`. The INS-152 Manager and both workers are terminal;
  no Manager, worker, retry, replacement, duplicate, or worktree is active.
- INS-152's runtime/configuration behavior and deterministic gates were
  independently reviewed. The known defect is specifically in optional list
  parsing: a blank optional allowlist value should behave as absent, while an
  actually malformed list and an all-empty allowlist must still fail closed.
  No other source/business/DAG drift is authorized or present.

### Authorized Manager and worker scope

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager
must re-read `AGENTS.md` and
`docs/control/prompts/ORCHESTRATOR_START.md`, verify this signal and
`DEC-075`, compare the reviewed checkpoint with Git, and re-enter only the
existing `I-02` row through `REVIEW -> READY -> IN_PROGRESS` after checking
dependencies and scope. It must stop at `REVIEW` after the bounded fix and may
not start any downstream packet.

The Manager may create exactly one fresh hidden internal implementation worker
with the following scope. No second worker, verifier, retry, replacement,
duplicate, user-visible task, branch, or worktree is authorized. The worker
must not edit any control-plane artifact; the Manager alone owns `TASKS.md` and
`HANDOFF.md`.

- Exact worker write scope: only `apps/backend/src/runtime.ts` and
  `apps/backend/src/runtime.news-composition.spec.ts`.
- Treat a blank value for an optional RSS list variable as absent, without
  weakening HTTPS validation, hostname/URL allowlisting, malformed-entry
  rejection, private/unsafe destination rejection, or the requirement for at
  least one non-empty matching allowlist entry.
- Add or adjust only focused deterministic tests in the named runtime test
  file proving that the copied `.env.example` shape composes RSS and that
  malformed/all-empty allowlists still fail closed. Do not use a live provider
  call, credential, fixture fallback, or new dependency.
- Do not change `.env.example`, Docker, README, modules, contracts, migrations,
  strategy authoring, `GEMINI_*` mapping, provider protocols, requirements,
  ADRs, OpenSpec artifacts, frontend, or any path outside the two named files.

### Acceptance, validation, and stop condition

- The exact diff is limited to the two authorized runtime paths plus the
  Manager-owned `TASKS.md`/`HANDOFF.md` checkpoint. The `.env.example` sample
  with a blank optional URL list composes the official RSS source when its URL
  and non-empty host/prefix allowlist are present; malformed and all-empty
  configurations remain unavailable with no fixture fallback.
- Run the focused runtime suite, relevant backend tests, backend typecheck,
  build, lint, architecture/artifact/deferred-scope/scope checks, whitespace
  checks, and any other proportionate repository gates. Preserve truthful
  `PASS` versus `BLOCKED` versus `UNVERIFIED` classification. No live CoinDesk,
  Gemini, Docker runtime, PostgreSQL, browser, clean-install, or OpenSpec CLI
  evidence is created by this packet.
- I-02 must remain `REVIEW`; this narrow parser correction does not prove the
  full authenticated real-provider/demo acceptance and does not authorize
  `M-02`, `AU-02`, `S-04`, `I-01`, `I-03`, or any other packet.
- The Manager may make one explicit-path checkpoint commit attempt and must
  stop immediately after review/integration, regardless of commit success. If
  the issue crosses the two-file scope, stop with `NEEDS_INSTRUCTOR_REVIEW`.

No credential may be requested, printed, logged, committed, or entered into a
browser. Do not use the previously exposed chat key. The next step after this
packet is an independent Instructor audit and a new `HOLD` signal.

## INS-153 — HOLD after independent INS-152 configuration audit

This signal supersedes `INS-152 / APPROVED_FOR_EXECUTION`. The two authorized
workers completed and the Manager's bounded implementation/configuration delta
passed its deterministic gates, but independent Instructor review found one
functional configuration defect before acceptance: the secret-free `.env`
template contains an intentionally empty optional
`COINDESK_RSS_ALLOWED_URLS` value, while the new runtime parser currently
classifies any present empty list as invalid. A user who copies the template
therefore loses the otherwise valid CoinDesk RSS composition. This is a narrow
reconciliation defect, not a reason to widen I-02 or start downstream work.

### Reviewed checkpoint and exact unaccepted delta

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, authorization HEAD
  `5ab03f545dc2e2998530a942776ac889cd7d0a89`. The Manager and both workers
  are terminal; no Cryptox Manager, worker, retry, replacement, duplicate, or
  worktree is active.
- `TASKS.md` records 57 rows: 56 `DONE`, only `I-02` at `REVIEW`, and no other
  active row. `I-02D`, `I-01`, and `I-03` remain `DONE`.
- The reviewed INS-152 working-tree delta is limited to the two Worker A
  runtime/test paths, the Worker B configuration/Docker/frontend/documentation
  paths, and Manager-owned `TASKS.md`/`HANDOFF.md`; `.codex/config.toml` is
  pre-existing and excluded. The Manager's one explicit staging/commit attempt
  failed before staging with `.git/index.lock: Permission denied`. The delta
  is not yet accepted as a complete packet until the empty-optional-list defect
  is corrected and revalidated.
- Independent review accepts the reported deterministic gates at their stated
  boundaries (459 tests with 9 environment-gated skips, focused runtime 12/12,
  build/typecheck/lint, architecture/artifact/deferred-scope/scope checks,
  runtime smoke, Compose interpolation, and frontend server-only bundle scan),
  but does not promote live CoinDesk/Gemini, Docker runtime/PostgreSQL,
  authenticated browser/demo, clean-install, or OpenSpec CLI evidence.

### Hold boundary

Keep `I-02` at `REVIEW`. No downstream packet is authorized. The next
authorization may address only the empty optional RSS allowlist handling and
its regression test; it must not redesign provider composition, add a native
Gemini integration, map `GEMINI_*`, change Docker architecture, or use a
credential. The existing INS-152 source/configuration delta may be integrated
as the reviewed-but-not-yet-final checkpoint; the correction must be performed
by a fresh Manager/worker under a new committed signal.

No credential was requested, printed, stored, or committed. Missing live
provider, Docker, browser, clean-install, or OpenSpec evidence remains
`BLOCKED`/`UNVERIFIED`, never PASS.

## INS-152 — APPROVED_FOR_EXECUTION for bounded provider and local configuration completion

This signal supersedes `INS-151 / HOLD` only for the bounded configuration
and provider-composition packet below. It does not promote `I-02` to `DONE`,
open downstream work, or authorize unrelated feature repair. The purpose is to
make the already-approved real-provider boundary operable through an ignored
root `.env`, Docker-managed PostgreSQL connection composition, the existing
safe configured RSS adapter for CoinDesk, and the existing provider-neutral
`LLM_AUTHORING_V1` OpenAI-compatible contract for Gemini compatibility.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, reviewed HEAD
  `2be555ccd834dca74d3ed53c307136f4975ebe02` (`INS-151 / HOLD`). Tracked Git
  state is clean; the pre-existing app-generated `.codex/config.toml` remains
  untracked and excluded.
- `TASKS.md` remains the sole operational state authority with 57 rows: 56
  `DONE`, only `I-02` at `REVIEW`, and no other active task. `I-02D` is
  `DONE`. No Cryptox Manager, worker, retry, replacement, duplicate, or
  worktree is active.
- The accepted News infrastructure already exposes the provider-neutral RSS
  adapter and safe HTTPS/allowlist fetch boundary. The accepted Strategy
  infrastructure already exposes the provider-neutral OpenAI-compatible
  authoring port. The current gaps are runtime composition, safe local
  environment loading/documentation, and Docker service wiring; they are not
  permission to add a new provider protocol or change product requirements.
- The reviewed external references are the official CoinDesk RSS feed
  announcement at
  `https://www.coindesk.com/coindesk-news/2021/09/17/coindesk-rss` and Google's
  Gemini OpenAI-compatibility documentation at
  `https://ai.google.dev/gemini-api/docs/openai`. These references do not
  substitute for a successful local runtime call.

### Authorized Manager and worker scopes

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager
must re-read `AGENTS.md` and
`docs/control/prompts/ORCHESTRATOR_START.md`, verify this signal and
`DEC-073`, compare the reviewed checkpoint with Git, and move only the
existing `I-02` row through `REVIEW -> READY -> IN_PROGRESS` after its
dependency and scope checks. It must stop at `REVIEW` or `DONE` according to
evidence and must not start any downstream packet.

The Manager may create exactly two fresh hidden internal implementation
workers, sequentially, with the disjoint scopes below. It may not create a
third worker, verifier, user-visible task, retry, replacement, duplicate, or
worktree. Workers may read the repository but may not edit any control-plane
artifact. The Manager alone owns the `TASKS.md` and `HANDOFF.md` transitions
and checkpoint.

Worker A — backend runtime provider composition:

- Exact write scope: `apps/backend/src/runtime.ts` and
  `apps/backend/src/runtime.news-composition.spec.ts` only.
- Compose the existing configured RSS provider from explicit environment
  values, using the existing safe fetcher and an explicit HTTPS host/URL
  allowlist. The supported packet is the official CoinDesk RSS feed; no
  CoinDesk API credential is required for this path. Preserve the existing
  CoinDesk JSON adapter as a backward-compatible path when its current
  `COINDESK_*` configuration is explicitly present.
- Keep `LLM_AUTHORING_V1` provider-neutral and use the existing
  `createOpenAiCompatibleAuthoringProvider` configuration path. The runtime
  must accept Google's official OpenAI-compatible endpoint through the existing
  `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`, and
  `LLM_AUTHORING_API_KEY` names. Do not add native Gemini SDK/provider code,
  `GEMINI_*` aliases, fallback fixtures, autonomous calls, or a new contract.
- Add focused deterministic composition/configuration tests using injected
  fakes where needed. Tests must prove incomplete or unsafe source
  configuration does not silently select fixtures, and must never print or
  persist a credential.

Worker B — local `.env`, Docker wiring, frontend build/runtime configuration,
and documentation:

- Exact write scope: `.env.example`, `.dockerignore`, `README.md`,
  `apps/backend/package.json`, `apps/frontend/vite.config.ts`,
  `infra/docker-compose.yml`, `infra/docker/backend.Dockerfile`,
  `infra/docker/frontend.Dockerfile`, and `infra/db/local-postgres.cjs` only.
- Add a secret-free root `.env.example` and document that the ignored root
  `.env` is user-created locally. Server-only credentials must remain outside
  the frontend build and bundle. The documented Gemini mapping must use the
  existing `LLM_AUTHORING_*` contract; do not document or implement a
  `GEMINI_*` repository alias and do not add any real key.
- Make the built backend optionally load the root `.env` through the Node
  runtime's supported env-file mechanism. Docker Compose must inject the
  ignored root `.env` into the backend as runtime configuration, while
  composing `DATABASE_URL` internally against the healthy `postgres-dev`
  service from the generated local PostgreSQL password. The full local path
  must not require the user to hand-write a Docker-host database URL. Preserve
  the existing explicit migration-preparation flow; do not add a hidden
  migration protocol or cloud database.
- Make the frontend consume only public `VITE_*` values from the root local
  configuration for its remote mode/build, and ensure Docker build/runtime
  configuration does not expose `LLM_AUTHORING_API_KEY`, database credentials,
  or other server-only values. Add `.env` and `infra/db/local.env` to the
  Docker build exclusion if needed for this guarantee.
- Do not change module contracts, REST/WebSocket contracts, migrations,
  requirements, ADRs, OpenSpec artifacts, task planning, authentication
  semantics, provider safety limits, or UI behavior beyond configuration
  loading and the existing remote-mode wiring.

### Acceptance criteria and validation

- With no key in the repository, the root `.env.example` is complete and
  secret-free, `.env` remains ignored, server-only variables are not present in
  the frontend bundle, and `git diff --check`/exact-path review passes.
- A local Docker Compose run, after the existing `db:local:prepare` flow, gives
  the backend an internal `postgresql://...@postgres-dev:5432/...` value and
  waits for the database health condition. The backend must not need a manual
  `DATABASE_URL` entry for this Compose path. Any unavailable Docker/daemon
  check is `BLOCKED` or `UNVERIFIED`, never `PASS`.
- Deterministic tests prove the official RSS configuration composes through
  the existing safe provider boundary, rejects missing/unsafe allowlist
  configuration without fixture fallback, and preserves the existing JSON
  adapter compatibility. No claim of a live CoinDesk result is allowed without
  a successful local feed call.
- Deterministic tests prove the existing authoring adapter emits the expected
  provider-neutral request shape for a configured endpoint without exposing
  the key. A real Gemini authoring call is explicitly deferred until the user
  places a newly rotated key in the local root `.env`; missing credentials are
  `UNVERIFIED`/`BLOCKED`, not PASS.
- Run focused backend/runtime tests, relevant frontend tests, package
  typechecks/build/lint, architecture/artifact/deferred-scope checks,
  Compose/config validation when available, and exact-path/whitespace checks.
  Preserve truthful PASS versus `UNVERIFIED` versus `BLOCKED` evidence.
- The Manager may move `I-02` to `DONE` only if the whole existing I-02
  acceptance boundary is genuinely proven; configuration code and fixture
  tests alone do not permit that transition. Otherwise leave `I-02` at
  `REVIEW` with the exact missing evidence.

### Prohibitions and stop condition

No credential may be requested in chat, printed, logged, committed, copied to
frontend code, or entered into a browser. Do not use the previously exposed
chat key. Do not add a native Gemini dependency, map `GEMINI_*`, add a
CoinDesk API workaround, select fixtures as a production fallback, change
business behavior, start `M-02`, `AU-02`, `S-04`, `I-01`, `I-03`, or any other
packet, or silently repair an issue outside the exact paths above.

If either worker needs a path outside its scope, if Docker/Compose syntax or
the runtime contract requires an architectural change, or if the source/DAG
checkpoint is no longer applicable, stop and report
`NEEDS_INSTRUCTOR_REVIEW`. After the two workers, review/integration, one
coherent Manager checkpoint commit attempt, and the bounded I-02 status update,
the Manager must stop immediately. The Instructor will independently audit
Git, source, tests, provider evidence, and control-plane consistency before
issuing any next signal.

## INS-151 — HOLD after INS-150 I-02 market client repair

This signal supersedes `INS-150 / APPROVED_FOR_EXECUTION`. The authorized
market-client repair is accepted at its bounded scope, but the system remains
on hold before the next authorization. The broader I-02 final/demo boundary is
not promoted from this narrow repair.

### Reviewed checkpoint and accepted result

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD
  `37e168eb60acb808db897c7f3bbb97b8bc2a1e29`. Tracked Git state is clean;
  the pre-existing app-generated `.codex/config.toml` remains untracked and
  excluded.
- The Manager completed exactly once under `INS-150`; its sole hidden worker
  completed exactly once. No retry, replacement, duplicate, worktree, or
  downstream task was created. `TASKS.md` has 57 rows: 56 `DONE`, only `I-02`
  `REVIEW`, and no other active state. `I-02D` remains `DONE`.
- The exact source delta is limited to
  `apps/frontend/src/market/clients.ts` and
  `apps/frontend/src/market/clients.spec.ts`; Manager-owned checkpoint changes
  are limited to `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. The receiver-preserving browser fetch
  seam and regression are accepted and committed in `37e168e`.

### Independent evidence

- Focused market/I-02 frontend tests: `10/10` PASS; full frontend suite:
  `50/50` PASS; full workspace: `449` PASS, `9` environment-gated skips,
  `0` failures. Frontend typecheck, lint, build, root build/typecheck/lint,
  architecture, artifact, deferred-scope, and diff checks are PASS at their
  stated boundaries.
- In a local browser with `VITE_MARKET_SOURCE=remote` and the same-origin
  `/api` proxy, all four chart history views loaded from the live Binance
  boundary without the former `Illegal invocation` error and the console had
  no warning/error entries. No credentials were entered, so authenticated
  WebSocket delivery and the full authenticated demo remain unverified.
- The active OpenSpec CLI is unavailable and remains `UNVERIFIED`. No
  provider credential or chat-supplied Gemini secret was used, mapped, printed,
  or committed.

### Remaining hold conditions

- `I-02` remains `REVIEW` because final evidence still lacks an authenticated
  browser/WebSocket session, a configured real News source, configured LLM
  authoring evidence, clean-install evidence, and formal OpenSpec CLI
  evidence. These are not converted to PASS by fixture tests or the narrow
  market fix.
- The runtime currently composes CoinDesk's JSON API adapter when its existing
  `COINDESK_*` configuration is present. The approved News infrastructure also
  contains provider-neutral RSS/Website/HTML adapters, but no runtime switch
  for the requested CoinDesk RSS feed has yet been authorized or integrated.
- The backend reads `process.env` but the repository has no automatic root
  `.env` loading contract. `.env` is already ignored by Git. Docker currently
  starts PostgreSQL but does not inject the internal development
  `DATABASE_URL` into the backend service. These configuration gaps require a
  separate bounded authorization; they are not silently repaired under
  `INS-150`.

No downstream packet is authorized by this HOLD. A subsequent instruction may
authorize only a reviewed, bounded configuration/runtime packet after its
exact write scopes, acceptance, validation, and stop condition are recorded.

## INS-150 — APPROVED_FOR_EXECUTION for I-02 remote market client fix

This signal supersedes INS-149 / HOLD. During an Instructor-side browser check
of the local app in explicit remote mode, the frontend displayed
`Failed to execute 'fetch' on 'Window': Illegal invocation` for all four market
charts. The backend was live and ready against local PostgreSQL, and the error
was observed at the remote market client boundary rather than inferred from a
fixture or test failure. This is a narrowly bounded I-02 implementation fix,
not permission to redesign the frontend or reopen unrelated packets.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, starting HEAD `69d7982`. Tracked Git state is clean;
  only the pre-existing app-generated `.codex/config.toml` is untracked and
  must remain excluded. The current board is 57 rows: `56 DONE`, only `I-02`
  `REVIEW`, with no other active task.
- No Cryptox Manager, worker, retry, replacement, or duplicate is active.
  `I-02D` is already DONE. The current source/business checkpoint is unchanged
  except for the reproduced browser defect; no other source gap is authorized
  by this instruction.
- The relevant code search shows Auth and Feature clients already call global
  `fetch` through receiver-preserving wrappers. Only the default market client
  seam in `apps/frontend/src/market/clients.ts` passes the browser global
  directly and reproduces the observed error.

### Authorized Manager and worker scope

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager
must re-enter only the existing `I-02` row through
`REVIEW -> READY -> IN_PROGRESS` and may create exactly one fresh hidden
internal implementation worker. The worker must receive the independent write
scope below and may not edit control-plane artifacts.

- Governing requirements: `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-MD-03`,
  `CSL-R-FE-01`, configured-runtime portions of `CSL-R-RD-01`, and the
  corresponding I-02 / `CSL-R-DM-01` browser acceptance.
- Exact worker write scope: `apps/frontend/src/market/clients.ts` and
  `apps/frontend/src/market/clients.spec.ts` only. A regression test may be
  added or adjusted only in the named test file. The worker must preserve the
  existing REST/WebSocket contracts, remote URLs, credentials policy, and
  independent chart behavior.
- The intended correction is limited to preserving the browser `fetch`
  receiver when the default market fetch seam is invoked. It must not add a
  provider, change API routes/contracts, alter Auth/Feature clients, change
  chart calculations, introduce fixtures, or modify backend/module code.
- The Manager owns review/integration and `TASKS.md` / `HANDOFF.md` only. It
  may not implement feature code in place of the worker except for a genuinely
  minimal merge/conflict fix. No second worker, verifier, retry, replacement,
  user-visible task, or downstream task is authorized.

### Acceptance, validation, and stop condition

- In a real local browser using `VITE_MARKET_SOURCE=remote`, the four existing
  chart instances must reach the backend history boundary without the
  `Illegal invocation` error; the remote market source must remain non-fixture
  and the WebSocket path must remain the existing narrow market boundary.
- The named frontend regression test must fail on the old unbound default and
  pass with the correction. Run the focused market-client/I-02 frontend tests,
  frontend typecheck, lint, build as proportionate, and exact-path,
  whitespace, diff, architecture/artifact/scope checks as applicable. Record
  live browser evidence separately from fixture tests.
- No credential may be requested, printed, committed, or entered into the
  browser. The existing missing CoinDesk, provider-neutral LLM, and OpenSpec
  evidence remains `BLOCKED`/`UNVERIFIED`; this instruction does not authorize
  mapping `GEMINI_*`, adding News/LLM configuration, or claiming final I-02
  DONE solely from this fix.
- If the defect requires changes outside the two named frontend files, or if
  the browser failure is caused by a backend/API/architecture gap, stop at
  `REVIEW` / `NEEDS_INSTRUCTOR_REVIEW` with exact evidence. Otherwise the
  Manager must stop after this bounded fix and I-02 revalidation, with no
  downstream promotion and at most one coherent commit attempt.

## Historical INS-149 — HOLD after INS-148 final I-02 revalidation

This signal supersedes INS-148 / APPROVED_FOR_EXECUTION. The Instructor has
independently reviewed the Manager checkpoint and keeps the system at a safe
hold: I-02D is accepted as DONE, while I-02 remains REVIEW because the Full
MVP live/demo boundary is not proven. No new implementation authorization is
issued by this signal.

### Independent checkpoint and evidence

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`. The authorization HEAD remains
  `a01e832f486e25e7785172b697dad8fc0a277bcf`; no production source,
  contract, migration, infrastructure, environment, requirement, ADR,
  OpenSpec, or generated-path drift was found. The Manager-owned checkpoint
  delta is limited to `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the pre-existing `.codex/config.toml`
  remains excluded.
- The Manager completed once under INS-148. Its two hidden read-only
  verifiers completed once each, changed no files, and were not retried or
  replaced. The operational board is 57 rows: `56 DONE`, only `I-02 REVIEW`,
  and no other active state. `I-02D` is `DONE` by control-only closure.
- Independent deterministic evidence is PASS: backend I-02 `6/6`, frontend
  I-02 plus projection checks `8/8`, full workspace with no configured
  database `448 passed / 9 expected skips`, and with the local PostgreSQL
  test database `457 passed / 0 skipped`; build, typecheck, lint,
  architecture (`189` modules / `642` dependencies), artifacts,
  deferred-scope `15/15`, runtime smoke (`/live=200`, `/ready=503`,
  `/health=404`), migration up/constraints/down/remigrate, and diff checks
  pass. The nine architecture fixture diagnostics remain intentional test
  fixtures and are not violations of the accepted implementation boundary.
- Docker Compose and both local PostgreSQL containers are available to this
  Instructor environment, but the Manager environment could not use the
  same Compose command; that Manager-side limitation is recorded as
  `BLOCKED`/`UNVERIFIED`, not PASS. The Instructor-side migration and
  PostgreSQL evidence does not by itself prove the entire final demo.
- The real CoinDesk endpoint returned HTTP `401` without a configured
  credential, and no `COINDESK_API_KEY` is configured for the final runtime.
  `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`, and
  `LLM_AUTHORING_API_KEY` are also not configured. No chat-supplied
  `GEMINI_*` value was mapped or used; it is not a substitute for the
  repository contract. Browser/demo evidence has no localhost tab, and the
  local OpenSpec CLI remains unavailable. These items remain
  `BLOCKED`/`UNVERIFIED`.
- The five amendment screenshots were re-read. Their functional scope is
  represented by the approved requirements and packets: realtime
  multi-timeframe Binance delivery, controlled prompt/URL authoring, News
  extraction/template/sentiment boundaries, directional paper backtesting,
  and composite/Lite/discovery flows. Their visual layout is not an
  additional requirement.

### Hold boundary

- Keep `I-02` at `REVIEW`; do not promote it to `DONE` from fixture tests,
  README wording, skipped checks, historical evidence, or an unavailable
  environment. Do not start downstream work or add a source repair under this
  HOLD.
- A future authorization may re-enter only the existing I-02 verification once
  the missing evidence is genuinely available: a configured real News source,
  any required provider-neutral LLM configuration for the controlled path, a
  runnable browser/demo session, and any required OpenSpec/clean-install
  evidence. Credentials must be supplied through a local process/environment
  mechanism and never committed, printed, or copied into the browser.
- No Manager or worker is active. The next authorization, if external state
  changes, must be a fresh same-directory Luna/max Manager with an explicitly
  bounded scope and no duplicate/retry. Until then the repository remains at
  HOLD.

## Historical INS-148 — APPROVED_FOR_EXECUTION for final I-02 revalidation

This signal supersedes INS-147 / HOLD. The Instructor has accepted the exact
N-03R and I-02D checkpoints and authorizes one bounded final revalidation of
the existing I-02 packet. This is not new product scope and does not authorize
feature repair, redesign, or downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\agy-cli-projects\AOS\Cryptox`; branch
  `MVP_IMPLEMENTATION`. The accepted source/documentation checkpoint base is
  `19f0de6`; this authorization is persisted in the containing governance
  commit. Git is clean except for the pre-existing app-generated
  `.codex/config.toml`, which must remain excluded.
- `TASKS.md` is the sole operational authority with 57 rows: 55 `DONE`,
  `I-02D` `REVIEW`, and `I-02` `REVIEW`; no `READY`, `IN_PROGRESS`, or
  `BLOCKED` row. The INS-146 Manager and Raman worker are terminal, and no
  Cryptox Manager/worker, retry, replacement, duplicate, or downstream task is
  active.
- Accepted source/documentation checkpoints are N-03R at `82693c6` and the
  I-02D README integration at `f2fb6f9`. The current source/business state has
  no unreviewed drift. The I-02 plan requires real Auth/ownership, Binance,
  News/Sentiment, backtest/ranking, frontend, provenance, failure, and
  architecture evidence; fixtures and unavailable environments cannot satisfy
  live/demo claims.

### Authorized Manager and worker scope

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using `gpt-5.6-luna` with `max` reasoning and no worktree. The Manager
may:

1. Re-read the accepted I-02D checkpoint and move only `I-02D`
   `REVIEW -> DONE` as a control-only closure; no README or source edit is
   authorized for this action.
2. Re-enter only `I-02` through `REVIEW -> READY -> IN_PROGRESS`, run the
   final verification, and move it to `REVIEW` or `DONE` only according to
   the evidence. It must stop before any downstream packet.
3. Create at most two fresh hidden internal read-only verifiers, sequentially
   in the shared checkout if needed:
   - backend verifier: existing I-02 backend tests, runtime/REST/provider
     boundary checks, and real-data evidence when already configured;
   - frontend verifier: existing I-02 frontend tests and presentation/demo
     projection checks, including fixture labeling when a browser/live
     environment is unavailable.

The verifiers may not edit any file, create tests, change source/contracts,
migrations, infrastructure, environment files, requirements, ADRs, OpenSpec,
or control-plane artifacts. They may not print or request credentials, use the
chat-supplied Gemini secret, create user-visible tasks, or create/retry/replace
another worker. A verifier terminal failure is recorded and not retried; the
Manager may continue only with the other already-authorized verifier.

### Acceptance, validation, and stop condition

The Manager must verify the applicable I-02 acceptance scenarios: real
register/login/session/logout and two-user isolation; real Binance historical
and realtime behavior; strategy definitions/composites; bounded Search;
progress/results; user-specific Leaderboard; signals/markers/overlays; four
metrics and provenance; real-source News plus local Sentiment; provider and
failure isolation; fixture-versus-live labeling; and all eight architecture
change scenarios. It must run the existing focused I-02 tests, relevant full
workspace tests, clean-install/build/typecheck/lint/architecture/artifact/
deferred-scope/runtime and exact-path checks as proportionate, and must retain
the existing PASS versus `BLOCKED` versus `UNVERIFIED` distinctions.

Real configured provider, PostgreSQL/Auth, LLM, browser/demo, or OpenSpec
evidence may be marked PASS only when actually observed in the current
environment. Missing Docker/Compose, credentials, external providers, browser
automation, or OpenSpec CLI remains `BLOCKED`/`UNVERIFIED`; no fixture, skip,
README statement, or prior historical result may be promoted. No
`GEMINI_*` mapping or chat secret is authorized.

The Manager owns only `TASKS.md` and `HANDOFF.md` state/checkpoint updates and
may make one explicit-path staging/commit attempt. If a source gap,
provider redesign, migration need, task-DAG conflict, or unavailable required
evidence prevents final acceptance, it must leave `I-02` at `REVIEW` or
`NEEDS_INSTRUCTOR_REVIEW` with the exact blocker and stop. No production fix,
extension, automatic retry, or downstream task is authorized by INS-148.

## Historical INS-147 — HOLD after I-02D documentation acceptance

INS-147 accepted N-03R and the exact README-only I-02D delta, persisted the
safe checkpoint at `19f0de6`, and left I-02 at `REVIEW` pending this explicit
final revalidation. Its decision is preserved in `DEC-068`.

## Historical INS-145 — HOLD after N-03R acceptance and I-02D quota interruption

This signal supersedes INS-144 / APPROVED_FOR_EXECUTION. The Instructor
independently accepts the bounded N-03R implementation evidence and exact
source scope, but the operational N-03R row remains REVIEW pending a future
Manager control closure. The only remaining uncompleted residual is I-02D:
its README-only worker terminated with a platform usage-limit error before
changing README.md. No final I-02 promotion or downstream work is authorized
by this HOLD.

### Independent checkpoint and scope audit

- Canonical checkout: D:\agy-cli-projects\AOS\Cryptox; branch
  MVP_IMPLEMENTATION; authorization HEAD was 4fd5ff7. The reviewed Manager
  delta is being integrated exactly in scope with this governance checkpoint:
  apps/backend/src/runtime.ts, apps/backend/src/runtime.news-composition.spec.ts,
  docs/implementation/TASKS.md, and docs/implementation/HANDOFF.md. README.md
  is unchanged. The app-generated .codex/config.toml remains excluded.
- TASKS.md is the sole operational authority. It now records 57 rows:
  54 DONE, N-03R REVIEW, I-02 REVIEW, I-02D BLOCKED, and no READY or
  IN_PROGRESS rows after the Manager checkpoint. No Manager or worker is
  active; the Dalton attempt is terminal and no retry/replacement was made.
- N-03R changed only the authorized runtime and narrowly named runtime
  composition test. Independent focused runtime tests pass 2/2; News scheduler
  tests pass 5/5; backend tests pass 31 with 1 environment-gated skip; backend
  typecheck/build and repository architecture, artifacts, deferred-scope,
  whitespace, and diff-scope checks pass. The implementation consumes the
  existing News public provider/scheduler boundaries and does not add a
  provider, contract, migration, or deferred capability.
- Real CoinDesk collection remains BLOCKED/UNVERIFIED without a configured
  credential; Docker/PostgreSQL, configured LLM, browser/demo, OpenSpec, and
  consolidated live architecture evidence remain BLOCKED/UNVERIFIED. No
  chat-supplied Gemini secret was used or mapped.

### Next safe action

After this HOLD is committed, a fresh authorization may close the independently
accepted N-03R row and re-enter the existing blocked I-02D row for one fresh
README-only hidden worker. That is a continuation of the same residual, not a
new product task or an unbounded retry. The new Manager must stop at I-02D
REVIEW, before final I-02 revalidation; any further source gap requires a new
Instructor review.

## Historical INS-144 — APPROVED_FOR_EXECUTION for E5R News runtime and README residuals

This signal supersedes INS-143 / HOLD. The Instructor has independently
accepted the bounded I-02 test and core live-application evidence at source and
business checkpoint e4d8f0f, but I-02 remains REVIEW because the approved real
News collection path is not composed into the backend runtime and README.md
still makes stale scaffold claims. The residual plan is recorded in the E5R
current residual closure packets section of MVP_PLAN.md. This authorization
adds no product capability and does not authorize final I-02 promotion.

### Reviewed checkpoint and applicability

- Canonical checkout: D:\agy-cli-projects\AOS\Cryptox; branch
  MVP_IMPLEMENTATION; source/business checkpoint e4d8f0f. The pending
  Instructor-only plan/signal/decision edits are governance-only and will be
  committed before dispatch. After that commit, Git must be clean except for
  the app-generated .codex/config.toml and ignored infra/db/local.env.
- TASKS.md is the sole operational authority and currently has 55 rows:
  54 DONE, I-02 at REVIEW, and zero READY, IN_PROGRESS, or BLOCKED. No
  Manager, worker, retry, replacement, duplicate, or downstream task may be
  active at dispatch. N-03R and I-02D are planned residual rows and must be
  added only by the authorized Manager.
- The independent audit accepted local PostgreSQL/Auth, Binance historical and
  realtime, Strategy/composite, bounded Search, persisted result data, and
  cross-owner isolation. Docker/migration, build/typecheck/lint, full tests,
  architecture, artifacts, scope/deferred checks, runtime smoke, and exact
  diff checks passed. Real configured News, configured LLM, browser/demo,
  OpenSpec, and the consolidated architecture scenarios remain
  UNVERIFIED or BLOCKED. No chat-supplied credential may be used.

### Authorized packets and write scopes

Exactly one fresh same-directory Manager is authorized in the canonical
checkout, using gpt-5.6-luna with max reasoning and no worktree. The Manager
may create at most two fresh hidden internal workers, sequentially because the
checkout is shared:

1. N-03R: one runtime worker may edit only apps/backend/src/runtime.ts and
   narrowly named focused backend runtime-composition tests under
   apps/backend/src/. It may consume the existing News provider/scheduler
   public boundaries, but may not redesign them.
2. I-02D: one documentation worker may edit only README.md. It must describe
   the current install/run/architecture/demo/validation paths truthfully,
   distinguish fixtures from live integrations, and document the existing
   LLM_AUTHORING_* contract without any credential value.

The two workers must not overlap, create user-visible tasks, edit control-plane
files, or touch contracts, migrations, infrastructure, environment files,
News module internals, arbitrary providers, frontend, Strategy, Search,
Backtesting, Leaderboard, requirements, ADRs, or OpenSpec. The Manager alone
may update TASKS.md and HANDOFF.md, and may move only N-03R and I-02D through
BLOCKED -> READY -> IN_PROGRESS -> REVIEW. I-02 must remain REVIEW.

### Acceptance, validation, and stop condition

N-03R is accepted only if the existing provider-neutral News composition proves
one bounded initial collection, approved interval scheduling, failure
continuation, no overlapping refresh, idempotent shutdown, truthful persisted
News/Sentiment reads, and visibly unavailable behavior when the provider is not
configured. I-02D is accepted only if every documented command/path exists or
is explicitly environment-dependent, real-data and fixture boundaries are
truthful, and no unavailable provider, LLM call, browser/demo, or OpenSpec
check is claimed as PASS. Missing CoinDesk credentials remain
BLOCKED/UNVERIFIED; no credential request or mapping from GEMINI_* is allowed.

The Manager must run focused and relevant tests plus build, typecheck, lint,
architecture, artifacts, scope/deferred, runtime smoke, diff, exact-path, and
secret checks as applicable, and report external evidence truthfully. One
explicit-path staging/commit attempt is allowed; a Git permission denial is
recorded without retry. When both packets reach REVIEW, the Manager stops
before any I-02 transition or downstream work. Any required contract,
migration, provider redesign, source outside scope, or material DAG mismatch
is NEEDS_INSTRUCTOR_REVIEW.

## Historical INS-143 — HOLD after independent I-02 final revalidation audit

This signal supersedes `INS-142 / APPROVED_FOR_EXECUTION`. The one authorized
same-directory Manager completed the bounded `S-04N` control closure and
`I-02` final revalidation, then stopped at `I-02 / REVIEW`. The Instructor
accepts the scoped test/checkpoint evidence but does not accept I-02 as DONE.
No downstream packet is authorized by this HOLD.

### Independent checkpoint and scope audit

- Canonical checkout is `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, HEAD remains
  `d28588e2601d85496c3d1bd91c3a9b39fd000778`. The Manager's single staging
  attempt was denied by `.git/index.lock`; the Instructor integrated only its
  exact authorized delta plus this governance review. The app-generated
  untracked `.codex/config.toml` and ignored `infra/db/local.env` remain
  excluded from Git.
- The tracked Manager delta is limited to
  `apps/backend/src/i02.backend.e2e.spec.ts`,
  `docs/implementation/TASKS.md`, and `docs/implementation/HANDOFF.md`.
  The backend change is test-only; no production/business source, contract,
  migration, infrastructure, environment, or deferred-scope file changed.
- Franklin, Anscombe, and Leibniz were the only authorized hidden workers;
  Franklin changed only the backend test, Anscombe and Leibniz changed
  nothing, and all workers were closed. No Manager, worker, retry, duplicate,
  replacement, or downstream task is active.
- `TASKS.md` is internally consistent at 55 rows: `54 DONE`, one `REVIEW`
  (`I-02`), and zero `READY`, `IN_PROGRESS`, or `BLOCKED`. `S-04N` is DONE;
  I-02 is the sole frontier row. The current operational row and latest
  `HANDOFF.md` are the state authority; stale historical prose is not used to
  infer execution state.

### Evidence accepted and limitations

- Independent fixture/boundary checks pass: backend I-02 `6/6`, frontend I-02
  `5/5`, each rerun twice; the post-worker backend test and all existing source
  tests remain within the authorized test scope.
- Current local environment checks pass: Docker `28.5.1`, Compose
  `v2.40.3-desktop.1`, migration up/constraints/down/remigrate, full workspace
  tests with local PostgreSQL `455 passed / 0 skipped`, backend Auth E2E `1/1`,
  backend `/live=200` and `/ready=200`, real Binance BTCUSDT history, real
  market WebSocket delivery including a `CANDLE`, and a live application flow
  covering two-user Auth, Strategy/composite, bounded Search, persisted
  Experiment/Trades/Leaderboard, and cross-owner `404` isolation.
- Build, typecheck, lint, architecture, artifacts, deferred-scope, runtime
  smoke, clean install, exact-path, whitespace, and secret-literal checks
  pass. The local browser probe is fixture-only: it rendered four charts and
  the explicit fixture label but its backend proxy was unavailable.
- Real News is not yet proven. The runtime exposes only the News read route;
  the configured News collection/scheduler is not composed into the live
  application, and the public CoinDesk endpoint returned `401` without a
  configured credential. The configured LLM variables are absent; the
  chat-supplied Gemini secret is not used or mapped. Live configured browser
  demo, OpenSpec CLI, and the consolidated eight architecture scenarios remain
  `UNVERIFIED`/`BLOCKED`.
- These limitations are not a reason to fabricate a PASS or to broaden
  `I-02` retrospectively. The News runtime composition gap is a residual
  implementation/reconciliation item that requires its own explicit packet;
  no source implementation is authorized under this HOLD.

### Next safe action

Before any new authorization, the Instructor must plan a narrowly scoped
residual packet for the already-approved real News runtime composition and
collection behavior, reconcile its task/DAG position, and recheck Git and
active-task state. A fresh authorization may then delegate implementation to
hidden workers with disjoint scopes. The packet must not expand into RBAC,
queues, arbitrary providers, autonomous LLM behavior, or other deferred scope.
Until that authorization is committed, no Manager or worker may start.

## INS-142 — APPROVED_FOR_EXECUTION for final I-02 revalidation

This signal supersedes `INS-141 / HOLD` and authorizes exactly one fresh
same-directory Manager for the explicitly bounded group `S-04N` control-row
closure plus the existing `I-02` final revalidation. It is not a new product
scope or a retry. No other task or downstream packet is authorized.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `cf598c36a2c9464f4192f4bb791d75c22d50cf0a`
  (`INS-141 / DEC-062`). Git is clean except the app-generated untracked
  `.codex/config.toml`; `infra/db/local.env` is an ignored local credential
  created by the repository helper and must not be committed, printed, or
  included in any report.
- The authoritative board has 55 rows: `53 DONE` and two `REVIEW`
  (`S-04N`, `I-02`), with no `READY`, `IN_PROGRESS`, or `BLOCKED` row. I-01,
  I-03, and S-04I through S-04M are DONE. No Cryptox Manager, worker, retry,
  replacement, duplicate, or downstream task is active.
- S-04N's combined checkpoint was independently accepted at source/checker
  integration `16a347e`; no source or business-state drift exists. Local
  Docker PostgreSQL services are healthy and the repository migration validator
  passed real up/constraints/down/remigrate evidence. This does not by itself
  prove application runtime, external providers, or browser/demo acceptance.

### Exact Manager and hidden-worker authorization

- Create exactly one fresh Manager in canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, model
  `gpt-5.6-luna`, reasoning `max`. No worktree, branch, cloud task, duplicate,
  retry, replacement, or user-visible worker task. The Manager must read
  `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely and
  reverify the current signal, Git, task board, handoff, plan, requirements,
  accepted ADRs, architecture, data model, active specs/change, DAG, and active
  task list before editing.
- Under the authorization, the Manager may first reconcile only
  `S-04N: REVIEW -> DONE` from the already accepted control evidence. It may
  then explicitly re-enter only `I-02: REVIEW -> READY -> IN_PROGRESS`; no
  other task state may change. At the end it must leave I-02 at `REVIEW` for
  independent Instructor audit, unless the repository's normal task protocol
  and the recorded evidence unambiguously support a different state without
  bypassing that audit; do not invent completion.
- The Manager may create at most three fresh hidden internal reviewer/test
  subagents, with disjoint write scopes and no user-visible tasks. Because the
  backend, frontend, Docker, and local database share runtime resources, run
  write-capable workers sequentially unless isolation is proven. The scopes are:
  1. backend/runtime E2E evidence and test-only correction, limited to
     `apps/backend/src/i02.backend.e2e.spec.ts` and the new
     `apps/backend/src/i02.runtime.e2e.spec.ts` path if needed;
  2. frontend/browser E2E evidence and test-only correction, limited to
     `apps/frontend/src/i02.frontend.e2e.spec.tsx` and the new
     `apps/frontend/src/i02.runtime.e2e.spec.tsx` path if needed; and
  3. read-only requirements/architecture/traceability/demo reviewer, with no
     write scope, or a documentation worker limited to `README.md` if a
     truthful verified run instruction is required.
- Workers may read the entire repository and run relevant checks, but may not
  edit production source, contracts, migrations, infra, environment files,
  `docs/control/*`, `TASKS.md`, `HANDOFF.md`, or any path outside their exact
  scope. A production defect, migration need, provider adapter change, or
  scope discrepancy is a stop/report condition, not permission to broaden the
  packet. The Manager alone owns `TASKS.md` and `HANDOFF.md`.

### Acceptance, validation, and prohibitions

- Prove the I-02 packet against the governing requirement set: real local
  register/login/session/logout and two-user isolation; real Binance BTCUSDT
  four-chart historical/realtime market-only flow; definitions/composite;
  bounded Random Search and progress; owner-specific Top-K and selected
  Experiment; signals, entry/exit, overlays, four metrics and provenance;
  real-source News with local `LEXICON_V1` sentiment; controlled provider and
  failure demonstrations; mock-only final configuration rejection; and all
  eight architecture change scenarios.
- Run clean-install evidence where feasible, real local migration validation,
  build, typecheck, all workspace tests, architecture/artifact/scope/runtime
  gates, the E2E flow twice, exact-path/whitespace/secret-log/diff checks, and
  a clean tracked Git checkpoint. Every unavailable or skipped check is
  `UNVERIFIED`/`BLOCKED`, never PASS.
- The runtime LLM configuration is the repository's
  `LLM_AUTHORING_ENDPOINT`, `LLM_AUTHORING_MODEL`, and
  `LLM_AUTHORING_API_KEY` contract. Do not silently map `GEMINI_*`, do not
  echo or store the chat-supplied secret, and do not claim a real LLM request
  unless a safe OpenAI-compatible endpoint/model/key is already configured and
  actually exercised. The same truthfulness rule applies to Binance, News,
  browser/demo, Docker, and OpenSpec CLI evidence.
- No optional/deferred scope, redesign, autonomous or unconfigured LLM,
  arbitrary URL retrieval, live trading/generalized risk, enterprise Auth,
  queue/distributed infrastructure, new dependency, cloud database, secret
  request, source fix outside the exact test/doc scopes, second Manager,
  duplicate/retry/replacement, or downstream packet is authorized. Make one
  checkpoint staging/commit attempt and stop at `REVIEW`; if Git denies it,
  record the exact error once and do not retry.

## INS-141 — HOLD after S-04N residual closure reconciliation

This signal supersedes `INS-140 / APPROVED_FOR_EXECUTION` after the one fresh
same-directory control-only Manager completed the authorized S-04N checkpoint.
It authorizes no new Manager, worker, retry, replacement, duplicate, I-02
transition, or downstream packet until a new authorization is committed.

### Independent Instructor review

- The Manager changed only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` and created no worker/subagent. The exact
  tracked delta is preserved for this Instructor checkpoint; the app-generated
  untracked `.codex/config.toml` remains untouched and outside scope.
- The Manager verified the authorization at HEAD `a70ed88135d0d803bfcf49f2712249e5c61bdd37`,
  reconciled only the authorized rows, and stopped at `REVIEW`. Independent
  review confirms the board is now 55 rows: `53 DONE`, `2 REVIEW` (`I-02` and
  `S-04N`), with no `READY`, `IN_PROGRESS`, or `BLOCKED` task row. All
  unrelated rows are unchanged.
- `S-04I`, `S-04J`, `S-04K`, `S-04L`, and `S-04M` are accepted as the bounded
  combined checkpoint at `16a347e`. Frontend `49/49` including authoring
  `11/11`, Strategy `129` with `3` PostgreSQL-gated skips, root
  `verify:stage4a`, checker `15/15` plus live scan, architecture, artifacts,
  runtime smoke, exact-path, whitespace, secret/log, and diff evidence are
  recorded and consistent. No source or business-state drift was found.
- The single Manager staging attempt was denied by
  `.git/index.lock` permission. The exact error is recorded once in
  `HANDOFF.md`; no retry or commit was made. This Instructor checkpoint
  persists the Manager-authored two-file delta without changing its content.
- PostgreSQL/Auth, configured LLM, Binance/News, browser/demo, and OpenSpec
  evidence remain `BLOCKED`/`UNVERIFIED`; fixtures, skips, and packet-local
  evidence are not promoted to final I-02 or live-provider PASS claims.

### Hold boundary and next review

- Keep `S-04N` at `REVIEW` for this completed control-only checkpoint and keep
  `I-02` at `REVIEW`. No feature work is authorized by this signal.
- Before the next authorization, revalidate the resulting Git commit, exact
  control-plane paths, task/DAG/checkpoint consistency, absence of active
  Cryptox Manager/worker tasks, and the final I-02 scope in `MVP_PLAN.md`,
  `TASKS.md`, `HANDOFF.md`, requirements, accepted ADRs, architecture, data
  model, and active specifications.

## INS-140 — APPROVED_FOR_EXECUTION for S-04N residual closure reconciliation

This signal supersedes `INS-139 / HOLD` and authorizes exactly one fresh
same-directory control-only Manager for packet `S-04N`. It is not an
implementation retry or replacement and authorizes no worker, source edit,
I-02 transition, or downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `69ac2ba` (`INS-139 / DEC-060`). The
  accepted source/checker integration is `16a347e`; `69ac2ba` contains only
  Instructor governance. Git is clean except the app-generated untracked
  `.codex/config.toml`, which is outside scope.
- `TASKS.md` is authoritative at 54 rows: 48 `DONE` and six `REVIEW`
  (`I-02`, `S-04I`, `S-04J`, `S-04K`, `S-04L`, `S-04M`); no READY or
  IN_PROGRESS row exists, and S-04N is not yet on the board. No Cryptox
  Manager, worker, verifier, retry, replacement, duplicate, or downstream task
  is active.
- The combined S-04I–S-04M source/checker checkpoint is independently
  accepted: frontend `49/49`, authoring `11/11`, Strategy `129` with `3`
  PostgreSQL-gated skips, root `verify:stage4a`, checker `15/15` plus live
  scan, architecture, artifacts, runtime smoke, exact-path, whitespace,
  secret/log, and diff checks pass. External PostgreSQL/Auth, configured LLM,
  Binance/News, browser/demo, and OpenSpec remain `BLOCKED`/`UNVERIFIED`.

### Exact Manager authorization

- Create exactly one fresh Manager in canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, model
  `gpt-5.6-luna`, reasoning `max`. No worktree, branch, cloud task, duplicate,
  retry, replacement, or user-visible worker task. The Manager must read
  `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely,
  then verify this signal, Git, TASKS, HANDOFF, MVP_PLAN, DAG, requirements,
  ADRs, specs, relevant evidence, and active-task state before editing.
- This is control-only: no worker/subagent may be created. The Manager alone
  may add exactly one `S-04N` row and update only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
- After verifying the accepted `16a347e` checkpoint and combined evidence, the
  Manager may move only `S-04I`, `S-04J`, `S-04K`, `S-04L`, and `S-04M` through
  `REVIEW -> DONE`, recording the evidence and preserving I-02 as `REVIEW`.
  If any row's bounded acceptance cannot be proven, leave it at `REVIEW` and
  report the exact reason; do not edit source or invent evidence.

### Acceptance and stop condition

- Reconcile only the five residual S-04 rows, keep I-02 and all unrelated task
  states unchanged, and record truthful external `BLOCKED`/`UNVERIFIED`
  limitations. Run exact-path, task/DAG/checkpoint consistency, whitespace,
  and diff checks; unavailable checks are never PASS.
- Make one checkpoint staging/commit attempt and stop immediately at `REVIEW`
  for independent Instructor audit. Do not start I-02, create a worker, retry,
  replace, duplicate, or promote any downstream packet. If Git staging is
  denied, record the exact error once and do not retry.

## INS-139 — HOLD after S-04M acceptance

This signal supersedes `INS-138 / APPROVED_FOR_EXECUTION` after the bounded
S-04M Manager checkpoint and independent Instructor audit. It authorizes no
new Manager, worker, retry, replacement, duplicate, I-02 transition, or
downstream work until a new authorization is committed.

### Accepted checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD is `16a347e` (`feat: integrate
  controlled authoring acceptance`). The Instructor integrated the exact
  reviewed 15-path worker/control delta after the Manager's single staging
  attempt was denied by `.git/index.lock`; no implementation was changed by
  the Instructor. The only remaining untracked path is app-generated
  `.codex/config.toml`, outside scope.
- `TASKS.md` is authoritative at 54 rows: 48 `DONE` and six `REVIEW`
  (`I-02`, `S-04I`, `S-04J`, `S-04K`, `S-04L`, `S-04M`); no READY or
  IN_PROGRESS row exists. The S-04M Manager is idle; Gauss and Locke are
  complete/idle; no Cryptox Manager, worker, verifier, retry, replacement,
  duplicate, or downstream task is active.
- S-04M moved `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`. Its frontend and
  checker workers were fresh, hidden, sequential, disjoint, and in scope; no
  prior residual row or I-02 was changed. The source/business checkpoint is
  unchanged after the accepted integration commit.

### Independent evidence and decision

- Frontend independently passes `14` files / `49` tests, including the new
  authoring boundary `11/11`; Strategy passes `129` with `3` PostgreSQL-gated
  skips. Root `verify:stage4a` exits `0`, including build, typecheck, lint,
  workspace tests, architecture, artifacts, deferred-scope, and runtime smoke.
- Deferred-scope checker independently passes `15/15` and the live scan; the
  exact-path, whitespace, `git diff --check`, and focused secret/log checks
  pass. The checker only recognizes the exact canonical REST file and the
  approved typed frontend transport paths; near-match rejection remains.
- PostgreSQL/Auth, configured LLM, Binance/News, browser/demo, and OpenSpec
  CLI evidence remain `BLOCKED` or `UNVERIFIED`; fixtures/skips are not live
  evidence. These limitations do not invalidate the packet-local S-04M
  acceptance, but they still gate final I-02 claims.

Decision: accept S-04M's bounded implementation/checker evidence, keep all six
current `REVIEW` rows unchanged, persist this `HOLD`, and plan distinct
control-only packet `S-04N`. S-04N will reconcile the five S-04 residual rows
from `REVIEW` to `DONE` only after rechecking their combined evidence; it will
not alter source, add a worker, retry a historical worker, or start I-02.

### Next review conditions

- Re-read the current `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, requirements,
  accepted ADRs, architecture, data model, active specs, and the S-04N scope.
- Verify HEAD `16a347e`, the clean accepted source checkpoint, the sole
  app-generated untracked config path, no active Cryptox Manager/worker, and
  consistent task/DAG/checkpoint evidence before authorizing S-04N.
- A later signal may authorize exactly one fresh same-directory control-only
  Manager for S-04N. It must use `gpt-5.6-luna` with `max` reasoning, must not
  create a worker because no implementation scope is present, and must stop at
  the reconciled REVIEW checkpoint. I-02 needs a separate authorization.

## INS-138 — APPROVED_FOR_EXECUTION for S-04M final test/checker closure

This signal supersedes `INS-137 / HOLD` and authorizes exactly one fresh
same-directory Manager for the separately planned `S-04M` residue. It is not a
retry or replacement of Noether or any earlier Manager/worker. It does not
promote S-04L/S-04K/S-04J/S-04I, transition I-02, or authorize downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `db93bd8` (`INS-137 / DEC-058`). That
  commit contains only the Instructor governance HOLD and S-04M plan. The
  expected uncommitted delta is the previously preserved Strategy and frontend
  implementation/test paths, Manager-owned `docs/implementation/TASKS.md` and
  `HANDOFF.md`, plus untracked `apps/frontend/src/features/authoring.spec.ts`;
  app-generated `.codex/config.toml` remains untouched and outside scope.
- `TASKS.md` is authoritative at 53 rows: 48 `DONE` and five `REVIEW`
  (`I-02`, `S-04I`, `S-04J`, `S-04K`, `S-04L`); no implementation row is
  active and S-04M is not yet on the board. All original S-04I dependencies
  remain `DONE`. The prior S-04L Manager is idle, Noether is shut down, and no
  other Cryptox Manager, worker, verifier, retry, replacement, duplicate, or
  downstream task is active.
- The source/business checkpoint is unchanged from the independent S-04L
  audit. The governance-only commit did not alter source, business state, task
  state, or handoff evidence.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. Do not use a worktree, branch, cloud
  task, duplicate, retry, replacement, or user-visible worker task. The
  Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify this
  signal, HEAD, the exact dirty delta, task DAG, TASKS/HANDOFF, requirements,
  ADRs, specs, relevant source/tests, and active-task list before editing.
- The Manager may add exactly one `S-04M` row and update only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` for
  state/checkpoint ownership. It must preserve every existing task state and
  stop at the authorized checkpoint.
- Worker 1, exactly one fresh sequential hidden internal frontend-test
  subagent, may write only these two paths:
  `apps/frontend/src/features/screens.spec.tsx` and
  `apps/frontend/src/features/authoring.spec.ts`. It may correct the stale
  READY-state assertion and the zero-argument fixture `news` call so the
  focused test typechecks. It must not modify production source,
  `fixture-data.ts`, `screens.tsx`, contracts, backend, Strategy, migrations,
  providers, or any control-plane file. Request `service_tier:"priority"`
  when supported; never claim it if unavailable.
- Only after Worker 1 is reviewed and its tests/typecheck pass, Worker 2,
  exactly one fresh sequential hidden internal checker subagent, may write
  only `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs`. It may correct only the canonical
  `LLM_AUTHORING_V1` allowlist boundary for
  `packages/contracts/rest/strategy.ts` and add its narrow regression; it may
  not broaden any other rule. Request `service_tier:"priority"` when
  supported. Workers have disjoint scopes and must not create children,
  commit, retry, replace, or edit `AGENTS.md`, `docs/control/**`, requirements,
  ADRs, `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, migrations, or unrelated
  files.

### Acceptance, validation, and stop condition

- Frontend tests must be fully green, including the 11-test authoring file;
  frontend typecheck/build/lint must pass. Checker tests and the live deferred-
  scope check must pass with the exact canonical REST-file boundary. Preserve
  the independently proven Strategy `129 passed / 3` PostgreSQL-gated skips and
  cross-context exactly-one approval evidence.
- Run applicable full workspace test/build/typecheck/lint, architecture,
  artifacts, scope/deferred, runtime smoke, secret/log, exact-path,
  whitespace, and diff checks. PostgreSQL, configured LLM, Binance/News,
  browser/demo, and OpenSpec are `PASS` only with actual evidence; otherwise
  record `BLOCKED`/`UNVERIFIED`. Never use or echo the secret supplied in chat.
- Move only S-04M through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`; record
  `DONE` only if its exact bounded acceptance is proven. Do not transition
  S-04L/S-04K/S-04J/S-04I or I-02 under this instruction. After one bounded
  checkpoint/commit attempt, stop and report exact paths, workers, evidence,
  failures, commit result, and remaining blockers. No retry, replacement,
  duplicate, second Manager, or downstream packet is authorized.

## INS-137 — HOLD after S-04L frontend evidence failure

This signal supersedes `INS-136 / APPROVED_FOR_EXECUTION` after the one fresh
S-04L Manager reached its bounded checkpoint. It authorizes no new Manager,
worker, retry, replacement, duplicate, checker, I-02 transition, or downstream
work until a new authorization is committed.

### Independent review checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD remains `7ae2cfe`
  (`INS-136 / DEC-057`). The current uncommitted delta contains the preserved
  Strategy approval-integrity paths, the accumulated frontend authoring paths,
  the Manager-owned `TASKS.md`/`HANDOFF.md` checkpoint, and the one untracked
  focused test `apps/frontend/src/features/authoring.spec.ts`; untracked
  `.codex/config.toml` remains app-generated and outside scope. No source
  change has been accepted or committed under S-04L.
- `TASKS.md` is authoritative: S-04I, S-04J, S-04K, and S-04L remain
  `REVIEW`; I-02 remains `REVIEW`; no downstream packet was promoted. The
  S-04L Manager is idle, Noether was shut down after its bounded timeout, and
  no Cryptox Manager/worker/retry/replacement/duplicate is active.
- The S-04L Manager correctly recorded `BLOCKED -> READY -> IN_PROGRESS ->
  REVIEW` and did not claim DONE. Its checker worker was never dispatched.

### Evidence and decision

- The frontend suite independently ran `14` test files: `48 passed / 1
  failed`. The only failure is the stale `screens.spec.tsx` expectation that
  `Save draft` must be disabled, while the current approved READY workflow
  intentionally exposes Save and disables only Validate/Approve.
- The new focused authoring test ran `11/11` tests, but frontend typecheck and
  lint fail because it calls the zero-argument fixture `news` client with an
  argument at `apps/frontend/src/features/authoring.spec.ts:213`. The frontend
  build passes; this is still a required acceptance failure, not a PASS.
- Strategy independently ran `129 passed / 3 PostgreSQL-gated skips`. The
  cross-context exactly-one approval evidence remains intact. `git diff --check`
  passes. The deferred-scope checker correction and its live evidence remain
  unresolved; no checker worker was authorized after the timeout.
- PostgreSQL/Auth, configured LLM, Binance/News, browser/demo, OpenSpec CLI,
  and any post-residue full-gate evidence remain `BLOCKED` or `UNVERIFIED`.
  No fixture or skipped test is promoted to live PASS.

Decision: keep S-04L, S-04K, S-04J, S-04I, and I-02 at `REVIEW`, persist this
HOLD, and plan distinct packet `S-04M`. S-04M is not a retry or replacement of
Noether: it is limited to correcting the two independently observed frontend
test/typecheck defects and then running the previously unstarted checker worker
under a new authorization. No source behavior, provider, contract, backend,
migration, autonomous LLM, or downstream scope is implied.

### Next review conditions

- Re-read the current `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, requirements,
  accepted ADRs, architecture, data model, active specs, and S-04M source/test
  boundary before authorizing anything.
- Verify Git and the exact uncommitted delta, no active Cryptox Manager/worker,
  current checkpoint consistency, and no source/business-state drift. A fresh
  same-directory Manager must use `gpt-5.6-luna` with `max` reasoning and
  hidden internal subagents only; request `priority` service tier for children
  when the platform supports it.
- A later `APPROVED_FOR_EXECUTION` may authorize only S-04M's exact frontend
  test paths followed by its disjoint checker paths. It must stop at REVIEW and
  cannot start I-02 or any other packet.

## INS-136 — APPROVED_FOR_EXECUTION for S-04L final frontend/checker residue

This signal supersedes `INS-135 / HOLD` and authorizes exactly one fresh
same-directory Manager for the separately planned, smaller `S-04L` residue.
It is not a retry or replacement of Pasteur or any earlier worker. It does not
promote S-04I/S-04J/S-04K, transition I-02, or authorize downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `57c1281` (`INS-135 / DEC-056`). The
  commit contains only Instructor governance. The expected uncommitted delta
  is exactly the two Strategy paths, six frontend feature paths, and
  Manager-owned `docs/implementation/TASKS.md`/`HANDOFF.md`; untouched
  untracked `.codex/config.toml` remains outside scope.
- `TASKS.md` is authoritative at 52 rows: 48 `DONE`, `I-02 REVIEW`,
  `S-04I REVIEW`, `S-04J REVIEW`, and `S-04K REVIEW`; `S-04L` is not yet on
  the board. All original S-04I dependencies remain `DONE`. The S-04K Manager
  `01a05735-b056-7562-8c46-f8e1a0ce9810` and Worker 1 Pasteur are idle/not
  active; no Cryptox Manager, worker, verifier, retry, replacement, duplicate,
  or downstream task is active.
- The expected source delta is unchanged and understood: Strategy approval
  concurrency is tested; frontend transport sanitization and approved-News
  fixture rejection are present; frontend still has two stale failing
  assertions, no focused authoring test, a likely cache fail-closed residue,
  and no checker correction.

### Authorized packet, requirements, and exact scope

- Packet: `S-04L — LLM_AUTHORING_V1 Final Frontend Acceptance and Checker
  Residue`.
- Requirements: `CSL-R-ST-05`, `CSL-R-RP-02`, `CSL-R-OW-01`, and only the
  configured-runtime portion of `CSL-R-RD-01`; `ADR_009`, the accepted S-04
  seam, existing REST contracts, and approved functional image behavior remain
  governing authority.
- Manager: create exactly one fresh Manager in the canonical same-directory
  checkout, model `gpt-5.6-luna`, reasoning `max`; no worktree, branch,
  duplicate, retry, replacement, or user-visible worker task. The Manager must
  read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely,
  verify this signal, HEAD, exact dirty delta, DAG, task board, and active-task
  list, and stop on material drift. Use hidden internal subagents only; request
  `priority` service tier for each child when supported.
- Worker 1, exactly one and sequential: only the following existing frontend
  files and focused tests may be written:
  `apps/frontend/src/features/clients.ts`,
  `apps/frontend/src/features/fixture-client.ts`,
  `apps/frontend/src/features/state.ts`,
  `apps/frontend/src/features/screens.spec.tsx`,
  `apps/frontend/src/i02.frontend.e2e.spec.tsx`,
  `apps/frontend/src/features/fixture-client.spec.ts`,
  `apps/frontend/src/features/state.spec.ts`, and a new focused test directly
  under `apps/frontend/src/features/`. Fix only the known cache/transport and
  post-approval projection residue, replace the two stale unavailable
  expectations with truthful assertions, and add focused tests for typed
  Save/Validate/Approve transitions, approved-News-only input, failure/
  unavailable states, safe provenance, owner/credential boundaries, and no raw
  prompt/completion. Do not modify `screens.tsx`, `fixture-data.ts`, or any
  other path; stop if one is genuinely required. No REST contract, backend,
  Strategy, migration, provider, arbitrary URL fetch, client identity, or
  control-plane edit is allowed.
- Worker 2, only after Worker 1 is reviewed: exactly one hidden internal
  checker worker may write only `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs`, correcting only the canonical
  `packages/contracts/rest/strategy.ts` `LLM_AUTHORING_V1` boundary and its
  narrow regression coverage.
- Workers are disjoint and must not edit `AGENTS.md`, `docs/control/**`,
  requirements, ADRs, `TASKS.md`, `HANDOFF.md`, migrations, or unrelated
  source. The Manager owns the new `S-04L` row, latest handoff, integration,
  and any S-04I/S-04J/S-04K closure transition only after combined acceptance.
  No I-02 transition is authorized.

### Acceptance, validation, and stop condition

- Frontend focused tests must pass and prove the already implemented typed,
  same-origin authoring workflow, distinct required states/actions, approved
  News boundary, fail-closed cache/transport behavior, post-approval
  projection, safe provenance, and no credentials/raw prompt/completion.
  Checker tests and the live deferred-scope check must pass for the exact
  canonical REST file. Existing Strategy exactly-one cross-context evidence
  remains intact.
- Run full workspace test/build/typecheck/lint, architecture, artifacts,
  scope/deferred, runtime smoke, secret/log, exact-path, whitespace, and diff
  checks. PostgreSQL, configured LLM, Binance/News, browser/demo, and OpenSpec
  are `PASS` only with actual evidence; otherwise record `BLOCKED`/`UNVERIFIED`.
- The Manager must stop after one bounded S-04L checkpoint at `REVIEW`, report
  exact paths/evidence, and make no retry/replacement/duplicate worker or
  Manager attempt. S-04I/S-04J/S-04K may move to `DONE` only if combined
  acceptance is genuinely proven; otherwise they remain `REVIEW`.

## INS-135 — HOLD after S-04K Worker 1 timeout

This signal supersedes `INS-134 / APPROVED_FOR_EXECUTION` after the one fresh
Manager reached the bounded S-04K checkpoint. It authorizes no new Manager,
worker, retry, replacement, duplicate, I-02 transition, or downstream work.

### Independent review checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `53733e1` (`INS-134 / DEC-055`). The
  expected Manager checkpoint delta remains uncommitted and is exactly the
  two Strategy paths, six frontend feature paths, and Manager-owned
  `docs/implementation/TASKS.md`/`HANDOFF.md`; untouched untracked
  `.codex/config.toml` remains outside scope.
- The S-04K Manager `01a05735-b056-7562-8c46-f8e1a0ce9810` is idle. Its only
  authorized child, frontend Worker 1 Pasteur
  (`01a0573c-9596-7fa0-ae6c-f27104aae6a0`), timed out while working and was
  shut down without retry or replacement. Worker 2 checker was not dispatched.
  No Cryptox Manager, worker, verifier, retry, replacement, duplicate, or
  downstream task is active.
- `TASKS.md` is authoritative at 52 rows: 48 `DONE`, `I-02 REVIEW`,
  `S-04I REVIEW`, `S-04J REVIEW`, and `S-04K REVIEW`; no S-04L row exists yet.
  The Manager recorded `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` and did
  not promote any packet.

### Independent evidence and decision

- The preserved Strategy approval-integrity delta remains in scope and its
  focused authoring suite passes `14/14` (the full Strategy suite remains
  `129 passed / 3 PostgreSQL-gated skips` from independent review).
- The frontend residue now includes same-origin/request sanitization and the
  approved-News fixture boundary, but the frontend suite still fails `2`
  stale assertions (`36 passed / 2 failed`); the timeout produced no new
  frontend tests or completion evidence. Frontend typecheck and build pass.
  The state cache fail-closed correction and post-approval projection remain
  unproven in tests. The checker boundary still fails on the canonical
  `packages/contracts/rest/strategy.ts` path and its worker was not started.
- PostgreSQL, real LLM provider, Binance/News, browser/demo, OpenSpec, and
  post-residue full-gate evidence remain `BLOCKED`/`UNVERIFIED`; no fixture or
  skipped test is promoted to `PASS`.
- Decision: keep `S-04K` at `REVIEW` and preserve the partial artifact. Plan a
  smaller distinct residual packet `S-04L` for the known frontend acceptance
  defects/tests and the unstarted checker worker. S-04L is not a retry or
  replacement of Pasteur; it must close only the remaining unverified residue.

### HOLD boundary

- Do not edit `TASKS.md` or `HANDOFF.md` as Instructor, dispatch the checker
  from `INS-134`, accept S-04K, promote S-04I/S-04J, or start I-02. Before a
  new authorization, reconcile the expected dirty delta and verify no active
  task; use a fresh same-directory Manager and the narrowly bounded S-04L
  packet only.

## INS-134 — APPROVED_FOR_EXECUTION for S-04K timeout-residue closure

This signal supersedes `INS-133 / HOLD` and authorizes exactly one fresh
same-directory Manager for the separately planned `S-04K` residual closure.
It is not a retry or replacement of timed-out Worker 2 from S-04J. It does not
promote S-04I/S-04J, transition I-02, or authorize downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `0a3ec85` (`chore(control): hold after
  S-04J frontend timeout`). This commit contains only the Instructor HOLD and
  durable S-04K plan/decision. The expected uncommitted Manager checkpoint
  delta is exactly two Strategy paths, six frontend feature paths, and
  `docs/implementation/TASKS.md`/`HANDOFF.md`; untouched untracked
  `.codex/config.toml` remains outside the change.
- `TASKS.md` is authoritative at 51 rows: 48 `DONE`, `I-02 REVIEW`,
  `S-04I REVIEW`, and `S-04J REVIEW`; `S-04K` has not yet been added to the
  operational board. All original S-04I dependencies remain `DONE`. The
  previous S-04J Manager and Worker 2 are idle/not active; no Cryptox Manager,
  worker, verifier, retry, replacement, duplicate, or downstream task is
  active.
- The expected dirty delta was independently reviewed: Strategy Worker 1's
  cross-context approval fix is in its authorized paths; the preserved
  frontend files are an unreviewed partial artifact, compile, and currently
  leave two stale frontend assertions failing. No checker path changed.

### Authorized packet, requirements, and exact scope

- Packet: `S-04K — LLM_AUTHORING_V1 Timeout-Residue Frontend and Checker
  Reconciliation`.
- Requirements: `CSL-R-ST-05`, `CSL-R-RP-02`, `CSL-R-OW-01`, and only the
  configured-runtime portion of `CSL-R-RD-01`; `ADR_009`, the accepted S-04
  seam, existing REST contracts, and approved functional image behavior remain
  governing authority.
- Manager: create exactly one fresh Manager in the canonical same-directory
  checkout, model `gpt-5.6-luna`, reasoning `max`; no worktree, branch,
  duplicate, retry, replacement, or user-visible worker task. The Manager must
  read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely,
  verify this signal, HEAD, expected delta, DAG, task board, and active-task
  list, and stop on material drift. Use hidden internal subagents only; request
  `priority` service tier for each child when the child tool supports it.
- Worker 1, exactly one and sequential: only `apps/frontend/src/**`. It must
  review the preserved partial S-04J frontend implementation, correct defects
  inside that tree, update stale expectations, and add focused tests for prompt
  and approved-News input, DRAFT/VALIDATED/APPROVED/REJECTED/failure/
  unavailable states, explicit Save/Validate/Approve actions, safe provenance,
  owner/credential boundaries, and absence of raw prompt/completion. The
  fixture must enforce the existing approved-News/template boundary. It must
  use canonical typed REST DTOs and same-origin transport. No REST contract,
  backend, Strategy, migration, provider, arbitrary URL fetch, client identity,
  or control-plane edit is allowed.
- Worker 2, only after the frontend worker is reviewed: only
  `scripts/check-deferred-scope.cjs` and `scripts/check-deferred-scope.test.cjs`.
  It may correct exactly the `LLM_AUTHORING_V1` allowlist boundary for the
  canonical `packages/contracts/rest/strategy.ts` file and add narrow
  regression coverage; no other checker rule may broaden.
- Workers have disjoint scopes and must not edit `AGENTS.md`,
  `docs/control/**`, requirements, ADRs, `TASKS.md`, `HANDOFF.md`, migrations,
  or unrelated source. The Manager alone owns the new S-04K row, latest
  `HANDOFF.md`, integration, and any S-04I/S-04J closure transition after
  combined acceptance. No I-02 transition is authorized.

### Acceptance, validation, and stop condition

- Frontend must expose the typed authoring flow when transport is present and
  remain honestly unavailable/fail-closed when it is absent. It must never
  expose or persist provider credentials, authorization headers, raw prompts,
  raw completions, arbitrary URLs, or client identity. Save/Validate/Approve
  must use server-returned opaque draft ids and definitions; approved-News
  input must be selected from already loaded approved News data.
- Focused frontend and checker tests must pass, including the stale expectation
  updates and the exact canonical REST-file regression. Existing Strategy
  cross-context exactly-one approval evidence remains required. Run full
  workspace test/build/typecheck/lint, architecture, artifacts, scope/deferred,
  runtime smoke, secret/log, exact-path, whitespace, and diff checks. PostgreSQL,
  configured LLM, Binance/News, browser/demo, and OpenSpec are `PASS` only
  with actual evidence; otherwise record `BLOCKED`/`UNVERIFIED`.
- The Manager must stop after one bounded S-04K checkpoint at `REVIEW`, report
  exact paths and evidence, and make no retry/replacement/duplicate worker or
  Manager attempt. S-04I/S-04J may move to `DONE` only if the combined
  acceptance is truly proven; otherwise they remain `REVIEW`.

## INS-133 — HOLD after S-04J Worker 2 timeout

This signal supersedes `INS-132 / APPROVED_FOR_EXECUTION` after the one fresh
Manager exhausted its bounded S-04J dispatch. It authorizes no new Manager,
worker, retry, replacement, duplicate, I-02 transition, or downstream work.

### Independent review checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, committed HEAD `5bc1c32` (the `INS-132`
  authorization). The expected Manager checkpoint delta remains uncommitted
  and is limited to `modules/strategy/application/authoring.ts`,
  `modules/strategy/application/authoring.spec.ts`, six paths under
  `apps/frontend/src/features/`, and the Manager-owned
  `docs/implementation/TASKS.md`/`HANDOFF.md`; untouched untracked
  `.codex/config.toml` remains outside the change. No other path was found.
- The S-04J Manager `01a05711-cac0-7183-b493-6df09fefcf77` is idle and no
  Cryptox Manager or worker is active. Worker 1 Archimedes completed in the
  authorized Strategy scope. Worker 2 Meitner was interrupted/timed out after
  writing frontend files and returned no completion or test evidence; it was
  not retried or replaced. Worker 3 was correctly not dispatched.
- `TASKS.md` is authoritative and records `S-04J REVIEW`, with `S-04I` and
  `I-02` still `REVIEW`; no downstream packet started. The Manager checkpoint
  remains an honest `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` transition.

### Independent evidence and decision

- The Worker 1 Strategy delta is in scope. Independent Strategy validation
  passes `129` tests with `3` PostgreSQL-gated skips; the skips are not live
  PostgreSQL evidence. `git diff --check` passes.
- The preserved frontend delta compiles and the frontend typecheck/build pass,
  but the frontend suite fails `2` stale assertions (`36 passed / 2 failed`):
  existing tests still expect the former unavailable-only authoring message and
  disabled markup. No new frontend authoring test evidence was returned.
  The partial frontend implementation is therefore unreviewed and not
  accepted. The exact canonical deferred-scope checker was not reached.
- PostgreSQL, real LLM provider, Binance/News, browser/demo, OpenSpec, and
  post-frontend full-gate evidence remain `BLOCKED`/`UNVERIFIED`; no fixture or
  skipped test is promoted to `PASS`.
- Decision: keep `S-04J` at `REVIEW` and preserve the partial working-tree
  artifact. A new plan packet `S-04K` is required for residual frontend
  completion/reconciliation and the not-yet-dispatched checker worker. It is a
  distinct residual closure packet, not a retry of the timed-out Worker 2.

### HOLD boundary

- Do not edit `TASKS.md` or `HANDOFF.md` as Instructor, accept the partial
  frontend source, dispatch Worker 3 from `INS-132`, promote S-04I/S-04J, or
  start I-02. Before any new authorization, reconcile the expected dirty delta,
  verify no active task, and use a fresh same-directory Manager with a new
  bounded authorization for S-04K.

## INS-132 — APPROVED_FOR_EXECUTION for S-04J residual LLM completion

This signal supersedes `INS-131 / HOLD` and authorizes exactly one fresh
same-directory Manager for the separately planned `S-04J` residual closure
packet. It does not retry or reopen `S-04I`, promote `I-02`, or authorize any
downstream work.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION` at committed HEAD `b522724`
  (`chore(control): hold after S-04I audit`). The reviewed source/business
  checkpoint is `f872590` (`feat(strategy): checkpoint S-04I public
  composition`); the only untracked item is untouched app-generated
  `.codex/config.toml`.
- `TASKS.md` is authoritative at exactly 50 rows: `48 DONE`, `I-02 REVIEW`,
  and `S-04I REVIEW`. No Cryptox Manager, worker, verifier, retry,
  replacement, duplicate, or downstream task is active. Historical Managers
  and workers must not be reused.
- The current HOLD independently verified the S-04I partial delta and recorded
  the missing frontend, cross-request approval-integrity proof, and exact
  checker boundary as the distinct `S-04J` packet in `MVP_PLAN.md`.

### Authorized packet, requirements, and exact scope

- Packet: `S-04J — LLM_AUTHORING_V1 Residual Completion and Approval Integrity`.
- Requirements: `CSL-R-ST-05`, `CSL-R-RP-02`, `CSL-R-OW-01`, and only the
  configured-runtime portion of `CSL-R-RD-01`; `ADR_009`, the accepted S-04
  seam, and the current REST contracts remain governing authority.
- Manager: create exactly one fresh Manager in the canonical same-directory
  checkout, model `gpt-5.6-luna`, reasoning `max`; no worktree, branch,
  duplicate, retry, replacement, or user-visible worker task. The Manager must
  read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely,
  verify this signal/checkpoint/DAG and active-task list, and stop on material
  drift. Use internal hidden subagents only; request the available `priority`
  service tier for each child when the child tool supports it.
- Worker 1, exactly one and sequential: only
  `modules/strategy/application/**` and
  `modules/strategy/infrastructure/**` for the approval concurrency/idempotency
  correction and focused tests. Prove two separately-created authenticated
  authoring ports cannot create duplicate definitions for one owner/draft;
  preserve owner isolation, immutable provenance, and no-secret persistence.
  No canonical contract, migration, provider-specific adapter, or other module.
  If a schema/migration is necessary, stop with `NEEDS_INSTRUCTOR_REVIEW`.
- Worker 2, only after Worker 1 review: only `apps/frontend/src/**` for the
  typed authoring client methods, private store state, panel, fixture coverage,
  and focused tests. Compose prompt/approved-News input, DRAFT, VALIDATED,
  APPROVED, failure, and unavailable states with explicit Save/Validate/
  Approve actions. No provider credential, client business logic, arbitrary URL
  fetch, or identity authority.
- Worker 3, only after feature review: only
  `scripts/check-deferred-scope.cjs` and
  `scripts/check-deferred-scope.test.cjs` to correct the exact canonical REST
  file boundary for `LLM_AUTHORING_V1` and add regression coverage. No other
  checker rule may broaden.
- Workers have disjoint write scopes and must not edit `AGENTS.md`,
  `docs/control/**`, requirements, ADRs, `TASKS.md`, `HANDOFF.md`, migrations,
  or unrelated source. The Manager alone may add the S-04J row, update
  `HANDOFF.md`, integrate scoped output, commit, and reconcile `S-04I` to DONE
  only after every S-04I/S-04J acceptance is proven. I-02 remains REVIEW.

### Acceptance, validation, and stop condition

- The public frontend uses the typed REST DTOs already composed by S-04I; it
  never exposes a provider key or raw prompt/completion. Provider requests stay
  bounded and server-side, and unconfigured/failure paths remain fail-closed.
- Concurrent approval from separate request contexts produces one immutable
  owner-scoped definition and the same result; sequential idempotency,
  unauthenticated/cross-owner/unsafe-field rejection, approved-News boundary,
  and safe provenance remain proven.
- Require focused Strategy/frontend/checker tests, workspace test/build/
  typecheck/lint, architecture, artifacts, live scope/deferred checks, runtime
  smoke, secret/log, exact-path, whitespace, and diff checks. PostgreSQL, real
  provider, browser/demo, and OpenSpec evidence are `PASS` only when actually
  run; otherwise they remain `UNVERIFIED`/`BLOCKED`.
- The Manager must stop after one bounded S-04J checkpoint at `REVIEW`, report
  exact paths/evidence/failures/unavailable checks, and not start I-02 or any
  downstream packet. A fresh Instructor audit and separate authorization are
  required for final I-02 verification.

## INS-129 — HOLD after independent I-02 review

This signal supersedes `INS-128 / APPROVED_FOR_EXECUTION` after the single
authorized I-02 Manager exhausted its bounded final-verification scope. I-02
remains `REVIEW`, not `DONE`; this HOLD authorizes no implementation, no task
transition, and no downstream promotion.

### Independent review checkpoint

- Canonical checkout: `D:\\agy-cli-projects\\AOS\\Cryptox`, branch
  `MVP_IMPLEMENTATION`, current committed HEAD
  `c9d2a26` (`chore(control): record I-02 checkpoint commit`). The tracked tree
  is clean; the only remaining working-tree item is untouched app-generated
  `.codex/config.toml`.
- The accepted bounded Manager checkpoint is
  `762b0e4c46c9f73d26a55507aeecd42be3f4cb77`, with the control-only follow-up
  `c9d2a26`. The source/business checkpoint is unchanged and no source drift or
  unauthorized path was found.
- `TASKS.md` is authoritative at exactly 49 rows: `48 DONE` and only `I-02`
  at `REVIEW`. No other task is `READY`, `IN_PROGRESS`, or `REVIEW`; no other
  Cryptox Manager, worker, verifier, retry, replacement, duplicate, or
  downstream task is active.

### Independent acceptance and evidence

- Accept the I-02 checkpoint as an honest bounded `REVIEW` checkpoint, not as
  final MVP completion. The Manager's fixture-boundary backend/frontend tests,
  clean install, full static gates, architecture (`184 modules / 615
  dependencies`), artifacts, scope/deferred `13/13`, runtime smoke, and
  whitespace/diff checks remain `PASS`.
- Fresh Instructor execution against the local Docker PostgreSQL test database
  independently passed `npm run db:local:validate` (up, constraints, down,
  remigrate), the Auth E2E `1/1`, and the full workspace suite with `433 passed`
  and `0 skipped`. This proves current local PostgreSQL-backed test evidence;
  it does not by itself prove the complete two-user HTTP demo, live providers,
  or configured browser acceptance.
- The LLM implementation is currently partial: the provider-neutral application
  and OpenAI-compatible adapter exist and are tested, but the backend runtime
  does not compose that provider/public authoring transport, while the frontend
  explicitly reports authoring `UNAVAILABLE`. No real LLM request or application
  API key usage is claimed. This is a material gap against `CSL-R-ST-05` and
  `CSL-R-RP-02`, and it was outside INS-128's allowed scope.

### Unverified or blocked final evidence

- Real configured LLM endpoint/model/key, public draft/validate/Save/Approve
  transport, and configured frontend authoring flow are `UNVERIFIED`; no key is
  committed, printed, or requested in chat.
- Real Binance historical/realtime, real configured News, and configured
  browser/demo evidence remain `BLOCKED`/`UNVERIFIED` where the environment or
  configuration is unavailable. Fixture and injected-provider evidence is not
  promoted to final PASS.
- OpenSpec CLI remains unavailable. The active change checklist and several
  requirement/spec status labels still disagree with the operational board and
  current source; this requires an explicitly bounded reconciliation or
  implementation authorization and must not be silently repaired here.

### HOLD boundary

- Do not mark I-02 `DONE`, edit `TASKS.md` or `HANDOFF.md` as Instructor, start
  a downstream task, or reuse INS-128's authorization for new LLM transport,
  contract, runtime, frontend, or provider work.
- A future authorization must state separately whether it covers the missing
  LLM public composition, final real-provider/demo revalidation, documentation
  reconciliation, or only another bounded evidence packet. It must define exact
  write scopes, acceptance criteria, validation, prohibitions, and stop
  conditions before a fresh same-directory Manager is created.

## INS-128 — APPROVED_FOR_EXECUTION for I-02 final E2E/demo verification

This signal supersedes `INS-127 / HOLD` and authorizes exactly the existing
final `I-02` packet. I-03 has been independently accepted as `DONE`; this is a
separate final-verification authorization, not an automatic state transition.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, current committed HEAD
  `a58530fa037ae0d46a2d76a9ce1674166aacd137` (`chore(control): hold after
  I-03 acceptance`). The tracked tree is clean; the only remaining working-tree
  item is untouched app-generated `.codex/config.toml`.
- `TASKS.md` is authoritative at exactly 49 rows: `48 DONE`, including `I-01`
  and `I-03`, and `I-02 BLOCKED`. No other task is `READY`, `IN_PROGRESS`, or
  `REVIEW`; no Cryptox Manager, worker, verifier, retry, replacement, duplicate,
  or downstream task is active. `HANDOFF.md` is the accepted I-03 checkpoint.
- I-02 dependencies `I-01` and `I-03` are verified `DONE`. The local environment
  now has fresh Docker evidence: Docker Engine `28.5.1`, Compose `v2.40.3`,
  healthy `cryptox-local-postgres-dev-1` and `cryptox-local-postgres-test-1`,
  and `npm run db:local:validate` passed `up`, constraints, `down`, and
  remigrate. This evidence must still be recorded by the Manager in the final
  handoff; it does not prove live Binance/News or browser evidence.

### Authorized packet

- **Packet:** `I-02` — E2E Demo, Documentation and Final Verification.
- **Requirements:** Every REQUIRED requirement ID, especially
  `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-DL-01`, and
  `CSL-R-DM-01`, plus the approved functional image amendment and DEC-007
  behavior already represented by the accepted dependency packets.
- **Objective:** Prove the complete MVP in a clean, reproducible final
  checkpoint: runtime behavior, two-user ownership, real-provider/demo mode,
  architecture defense, setup/documentation, requirement traceability, and
  final handoff.
- **Integration dependencies:** `I-01`, `I-03`, local PostgreSQL/migration
  evidence, and live-provider smoke where required. No dependency is inferred
  from a green unit test alone.

### Exact scope and bounded delegation

- Manager-owned scope: the existing I-02 row in
  `docs/implementation/TASKS.md`, the latest
  `docs/implementation/HANDOFF.md`, final acceptance/checkpoint evidence, and
  narrowly scoped final setup/traceability documentation in `README.md` if a
  concrete gap is found. The Manager may integrate worker test output and make
  only a narrowly reviewed behavior-preserving fix in the approved app boundary
  if it is explicitly within this packet; a new business/module/contract/schema
  change requires stopping for Instructor review.
- At most three internal child agents may be created, with disjoint scopes and
  no user-visible task or manual approval. Parallelism is allowed only for
  reviewer/test work:
  1. backend E2E/HTTP/WebSocket/Auth/ownership proof, write scope limited to a
     dedicated `apps/backend/src/i02*.spec.ts` test artifact;
  2. frontend configured-mode/browser/functional-state proof, write scope
     limited to a dedicated `apps/frontend/src/i02*.spec.tsx` test artifact;
  3. final setup/traceability review, write scope limited to `README.md`, or a
     read-only verifier with write scope `none` if no documentation gap exists.
  Each child must use the internal subagent mechanism, model
  `gpt-5.6-luna`, reasoning `max`, and `priority/Fast` service tier when
  available. Workers may not edit `TASKS.md`, `HANDOFF.md`, Instructor or
  decision files, requirements, ADRs, contracts, migrations, module business
  logic, secrets, or unrelated files. The Manager must not create a second
  Manager, duplicate worker, retry, replacement, worktree, or downstream task.
- If a required runtime defect cannot be fixed by a narrowly reviewed,
  behavior-preserving app-boundary change in the authorized scope, leave I-02
  at `REVIEW` and report `NEEDS_INSTRUCTOR_REVIEW`; do not broaden the packet.

### Required final acceptance

The Manager must prove, with real configured mode where the requirement calls
for it and with fixtures explicitly labeled non-final:

- real register/login/current-user/session expiry/logout using PostgreSQL-backed
  opaque HttpOnly sessions, with no credential/session/cookie/token logging;
- User A/User B isolation and unauthenticated rejection across user-owned
  Strategy definitions/composites, Search runs/candidates, Experiments/Trades,
  Evaluation/Leaderboard reads and mutations, including owner-filtered
  collections, cross-user not-found/denial, and trusted server identity;
- real Binance BTCUSDT historical/realtime delivery to four independent charts,
  market-only WebSocket behavior, normalized ticks/status, bounded ephemeral
  observability, and no coupling into historical Backtesting or a general event
  bus;
- Strategy definitions/composite, bounded seeded Random Search with progress
  and user-specific Top-K, selected Experiment, signals/entry/exit/overlays,
  four finite metrics, and complete discovery/paper/ranking provenance;
- real-source News plus local `LEXICON_V1` Sentiment, provider failure and
  degraded-mode demonstrations, safe URL/extraction behavior, and explicit
  rejection of mock-only final configuration;
- all eight architecture-change scenarios required by the assignment and the
  approved functional amendment, with no deferred enterprise identity,
  queue/distributed, live-trading/generalized-risk, autonomous/unconfigured LLM,
  or strict-replay scope leakage.

### Validation and stop condition

- Run clean setup/install where available, Docker/local PostgreSQL migration
  validation, focused child tests, the complete workspace test suite, E2E twice
  from clean state, build, typecheck, lint, architecture, artifact,
  deferred-scope/scope, runtime smoke, whitespace/diff checks, and final
  requirement/DAG/link traceability review. Record exact commands and results
  in `HANDOFF.md`.
- Live Binance/News, browser/final-demo, OpenSpec CLI/archive, or any required
  environment unavailable at execution must be `BLOCKED`/`UNVERIFIED`, never
  `PASS`; skipped tests, fixtures, prior screenshots, or carry-forward evidence
  cannot substitute for required final mode. No secrets may be requested in
  chat or printed.
- The only allowed operational transition is
  `I-02 BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE`, made solely by the
  Manager. Mark `DONE` only when all applicable required evidence is complete;
  otherwise leave `REVIEW` with the exact blocker and next evidence needed.
- Stop after I-02 is exhausted. Do not start or promote any other task, edit
  deferred scope, or claim final MVP completion from this signal unless the
  complete final handoff and clean tracked Git checkpoint support it.

## INS-127 — HOLD after independent I-03 recovery acceptance

This signal supersedes `INS-126 / APPROVED_FOR_EXECUTION` after the Instructor
independently reviewed the completed recovery checkpoint. I-03 is accepted as
`DONE`; this HOLD authorizes no implementation and does not automatically start
or ready I-02.

### Independent review checkpoint

- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, accepted Manager checkpoint
  `223fc1b91baf83944d19f9dad57c151fe8bf5d7c` (`chore(control): close I-03
  under INS-126`). The source/business checkpoint `5e06fdf` is unchanged.
- The Manager commit contains exactly the preserved
  `apps/backend/src/i03.boundary.integration.spec.ts`, the existing I-03 row
  in `docs/implementation/TASKS.md`, and the latest
  `docs/implementation/HANDOFF.md`. The only remaining working-tree item is
  the untouched app-generated `.codex/config.toml`; no source or business-state
  drift was found.
- `TASKS.md` is authoritative at exactly 49 rows: `48 DONE` and `I-02
  BLOCKED`. I-03 transitioned `IN_PROGRESS -> REVIEW -> DONE`; no other task
  was changed, started, promoted, or modified. The recovery Manager is idle;
  no Manager, worker, verifier, retry, replacement, duplicate, or downstream
  task is active.

### Acceptance and validation decision

- The preserved I-03 artifact was independently rerun and passed `4/4` tests;
  it uses public module/bootstrap boundaries and proves the safe News/URL →
  controlled authoring path, seeded Search → synthetic paper Backtesting →
  Evaluation → Leaderboard with ownership/provenance, market-only ephemeral
  WebSocket delivery, and fail-closed readiness/secret sanitization.
- Independent workspace evidence: `415 passed / 8 expected PostgreSQL-gated
  skips`; build, typecheck, lint, architecture (`182 modules / 579
  dependencies`), source artifacts, deferred-scope, scope `13/13`, runtime
  smoke, whitespace, and diff checks all passed. The skips are not promoted to
  live-provider evidence.
- Prior real PostgreSQL/Binance evidence remains valid as carry-forward because
  the source/business checkpoint is unchanged. Current Docker/PostgreSQL,
  live Binance/News access, missing News credentials, OpenSpec CLI, and
  browser/final-demo evidence remain `BLOCKED`/`UNVERIFIED`; no mock provider or
  fixture-only result is claimed as final evidence.
- Decision: accept I-03 `DONE` at the Manager commit above. Keep I-02
  `BLOCKED` until this HOLD is followed by a separate Instructor authorization
  after final checkpoint review. No Instructor edit to `TASKS.md` or
  `HANDOFF.md` is made.

### HOLD boundary

- Do not start, ready, promote, or modify I-02 or any other task under this
  signal. Do not alter the accepted Manager checkpoint, source, contracts,
  migrations, frontend, providers, or deferred scope.
- I-02 is now the only DAG candidate, but it requires a fresh `INS-* /
  APPROVED_FOR_EXECUTION` with its own exact scope, acceptance, validation,
  prohibitions, stop condition, and clean/reconciled checkpoint.

## INS-126 — APPROVED_FOR_EXECUTION for interrupted I-03 recovery/reconciliation

This signal supersedes `INS-125 / HOLD` only for one bounded recovery review of
the interrupted I-03 attempt. It is a reconciliation of preserved worker output,
not a retry, replacement, duplicate, or reimplementation of the prior worker.

### Reviewed checkpoint and applicability

- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, current committed HEAD `db9898b`
  (`chore(control): hold after interrupted I-03`). The source/business
  checkpoint remains `5e06fdf`; `9601d77` is the superseded I-03 authorization
  checkpoint. No source, business-state, requirement, dependency, or DAG drift
  was found.
- The expected current delta is exactly: the Manager-owned `I-03` row modified
  in `docs/implementation/TASKS.md`; the preserved authorized worker artifact
  `apps/backend/src/i03.boundary.integration.spec.ts`; and the untouched
  app-generated `.codex/config.toml`. Any other path or material change is an
  applicability failure and requires `NEEDS_INSTRUCTOR_REVIEW`.
- `TASKS.md` is authoritative at 49 rows: `47 DONE`, `I-03 IN_PROGRESS`, and
  `I-02 BLOCKED`. I-03 dependencies `C-02`, `M-03`, `S-04`, `S-05`, `S-06`,
  `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`, `F-03`, `I-01`, `AU-02` are recorded
  `DONE`. No Cryptox Manager or worker is active; the prior INS-124 Manager and
  worker are terminal system-error tasks.
- The preserved artifact independently passed its focused `4/4` suite and
  backend no-emit TypeScript check. That evidence is input to this recovery,
  not I-03 completion. I-02 must remain `BLOCKED` throughout this signal.

### Authorized packet

- **Packet:** `I-03` — DEC-007 Boundary Integration and Reproducibility Proof.
- **Objective:** One fresh Manager independently reviews the preserved artifact,
  verifies its exact scope and public-boundary behavior, reruns applicable
  validation, and either integrates it into one coherent Manager commit with a
  refreshed `HANDOFF.md` and `I-03 IN_PROGRESS -> REVIEW -> DONE` transition,
  or leaves I-03 at `REVIEW` and reports the exact missing evidence/blocker.
- **Requirements:** All DEC-007 extension IDs; amended `CSL-R-MD-02`;
  `CSL-R-AU-01`, `CSL-R-OW-01`, `CSL-R-RD-01`, `CSL-R-OB-01`, and
  `CSL-R-AR-01`–`03` as the integration drivers.
- **Write scope:** The preserved `apps/backend/src/i03.boundary.integration.spec.ts`,
  `apps/backend/**`, thin REST/market-only WebSocket transport mappers, and
  I-03-owned extension integration/E2E tests only. The Manager may stage and
  commit the preserved artifact and may update only the existing I-03 row in
  `docs/implementation/TASKS.md` plus the latest `docs/implementation/HANDOFF.md`.
  No module algorithms, module persistence, migrations, frontend, contracts,
  queue, distributed protocol, general event bus, or unrelated cleanup.
- The recovery authorizes **no new implementation worker**. The prior worker's
  output is the object under review; if it is insufficient, stop at `REVIEW` and
  report `NEEDS_INSTRUCTOR_REVIEW` rather than retrying or replacing it. The
  Manager may create at most one sequential internal read-only verifier with
  write scope `none`; it may not create a second Manager, implementation worker,
  retry, duplicate, worktree, or downstream task.

### Acceptance and validation

The Manager must review and evidence, using public module/bootstrap boundaries:

- safe URL/import content to controlled Strategy authoring without direct URL
  fetching from Strategy, prompt/provider-secret leakage, or unsafe persistence;
- seeded Search to synthetic paper Backtesting to Evaluation to Leaderboard,
  including generated results, owner propagation/isolation, same-input seeded
  candidate/ranking reproducibility, and provenance;
- News-to-Sentiment neutral boundary and failure isolation where applicable;
- ephemeral market delivery through the market-only WebSocket boundary, with
  bounded observability and no historical Backtesting coupling;
- real-provider readiness/preflight for configured Binance, PostgreSQL, and
  News requirements, truthful synthetic-paper labeling, and no mock-only final
  claim; unavailable evidence stays `BLOCKED` or `UNVERIFIED`;
- no-secret observability/logging and failure isolation, plus public-boundary,
  architecture, deferred-scope, artifact, and changed-path checks.

Run the focused I-03 suite, backend typecheck, applicable workspace test/build/
typecheck/lint gates, architecture/artifact/deferred-scope/scope checks,
`git diff --check`, and applicable local PostgreSQL/provider evidence. OpenSpec
CLI, browser/final-demo, unavailable Docker/Compose, missing News credentials,
or unavailable live providers must remain `UNVERIFIED`/`BLOCKED`, never `PASS`.

### Prohibitions and stop condition

- Do not edit Instructor governance, requirements, ADRs, architecture, data
  model, OpenSpec artifacts, or any task other than the existing I-03 row and
  latest handoff. Do not manually change task state outside the Manager.
- Do not start, ready, promote, or otherwise modify `I-02` or any other packet.
  The Manager stops after this recovery scope is exhausted and leaves the
  repository at a reviewable checkpoint. A later Instructor review is required
  before any I-02 authorization.

## INS-125 — HOLD after interrupted I-03 execution

This signal supersedes `INS-124 / APPROVED_FOR_EXECUTION` after the Instructor
verified that the one authorized I-03 Manager and its one implementation worker
ended with the same usage-limit system error before the Manager could produce a
reviewed handoff. It records the interrupted state and authorizes no new work.

### Interrupted checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on branch
  `MVP_IMPLEMENTATION` at authorization commit `9601d77` (the latest committed
  signal). The tracked tree is clean at that checkpoint; the current delta is
  exactly one modified `docs/implementation/TASKS.md` row and one untracked
  in-scope test artifact `apps/backend/src/i03.boundary.integration.spec.ts`,
  plus the untouched app-generated `.codex/config.toml`.
- `TASKS.md` remains authoritative at exactly 49 rows: `47 DONE`, `I-02`
  `BLOCKED`, and `I-03` `IN_PROGRESS`. The Manager was authorized to move only
  I-03 and the worker was authorized to write only the backend integration/test
  boundary. The Manager task and its one worker both ended with the exact
  system error `You've hit your usage limit`; no review handoff or commit was
  produced. No other Manager, worker, retry, replacement, duplicate, or
  downstream task is active.
- The in-scope artifact independently passes `npx vitest run
  src/i03.boundary.integration.spec.ts` (`4/4`) and backend TypeScript compile
  (`tsc -p tsconfig.json --noEmit`). It is preserved as interrupted worker
  output, not accepted as I-03 completion until a fresh authorized Manager
  reconciles its scope, reviews it, and updates `TASKS.md`/`HANDOFF.md`.
- No source/business requirement or dependency drift was found. I-02 remains
  `BLOCKED`; no new task state is authorized by this HOLD. The prior PASS,
  `BLOCKED`, and `UNVERIFIED` evidence statuses remain unchanged, including
  the CoinDesk credential limitation, unavailable OpenSpec CLI, and browser/
  final-demo evidence.

### HOLD boundary

- Do not modify or delete the interrupted test artifact, and do not manually
  change `TASKS.md` or `HANDOFF.md` task state. A separate Instructor signal is
  required before any recovery Manager may reconcile this interrupted I-03
  checkpoint.
- I-02 must remain `BLOCKED` even though the I-03 artifact's focused tests
  pass; no downstream or final-demo work is authorized here.

## INS-121 — HOLD after I-01 runtime integration review

This signal supersedes `INS-120 / APPROVED_FOR_EXECUTION` after the Instructor
independently reviewed and integrated the exact Manager delta, re-ran the
workspace and runtime gates, and obtained fresh local PostgreSQL and real
Binance evidence. It authorizes no implementation or downstream work while
the current I-01 task remains at `REVIEW`.

### Reviewed checkpoint and outcome

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION` at `5e06fdf` (`feat(backend): integrate MVP runtime
  capabilities`). The commit contains the five authorized backend worker
  paths plus the Manager-owned `I-01` row and latest `HANDOFF.md`; the only
  untracked path is the untouched app-generated `.codex/config.toml`.
- The authoritative board remains 49 rows: `46 DONE`, `I-01 REVIEW`, and
  `I-02`/`I-03 BLOCKED`. No other task state changed. The completed Manager
  `01a055c5-7f75-7260-8988-d6e544ecb234` and worker
  `01a055ca-ced6-7890-83ec-3289df017659` are idle/closed; no Cryptox Manager,
  worker, retry, replacement, duplicate, or downstream writer is active.
- Independent source and scope review found the authorized public bootstrap
  composition, trusted session identity, bounded local executor, PostgreSQL
  adapters, real Binance adapters, local `LEXICON_V1`, truthful readiness,
  failure isolation, and market-only WebSocket boundary. No contract,
  module-internal, schema, migration, infrastructure, frontend, deferred,
  or unrelated path drift was found.
- Current evidence is PASS for workspace tests, build, typecheck, lint,
  architecture, artifacts, scope, deferred-scope `13/13`, runtime smoke,
  backend Auth/application PostgreSQL integration (`18/18`), Strategy
  PostgreSQL integration (`2/2`), migration up/constraints/down/remigrate,
  configured runtime `/live=200` and `/ready=200`, read-only Binance
  historical normalization, read-only Binance realtime `CONNECTED` plus
  `TICK`, and an HTTP smoke covering unauthenticated rejection, Auth,
  Strategy definitions, manual backtest `SUCCEEDED`, generated flow reads,
  and SearchRun `COMPLETED`.
- CoinDesk live News smoke is `BLOCKED/UNVERIFIED` because the configured
  endpoint returned HTTP 401 without credentials; no credential was supplied
  or requested. OpenSpec CLI and browser/final-demo evidence remain
  `UNVERIFIED` where unavailable. These statuses are not represented as
  PASS and remain part of the later final-verification boundary.

### HOLD boundary

- Preserve `I-01` at `REVIEW` until a fresh, separately authorized Manager
  performs the operational closure update using this current evidence. The
  Instructor does not change `TASKS.md` or `HANDOFF.md` task state.
- Keep `I-02` and `I-03` `BLOCKED`; do not start any extension, deferred,
  downstream, retry, replacement, duplicate, or final/demo packet from this
  HOLD. The next signal, if applicable, may authorize only I-01 closure
  validation with an exact Manager-owned control-plane scope.

## INS-120 — I-01 runtime, transports and observability integration

This signal supersedes `INS-119 / HOLD` after the Instructor reviewed the
current I-01 frontier, its now-complete public seam and validation
prerequisites, the exact backend source, and the governing DAG. It authorizes
one fresh I-01 implementation/resumption attempt only.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION` at `2462f18` (`chore(control): hold after ENV-05 and
  I-01R closure`). The tracked tree is clean; the sole pre-existing untracked
  path is the untouched app-generated `.codex/config.toml`.
- The authoritative task board has 49 rows: `46 DONE`, `1 REVIEW` (`I-01`),
  and `2 BLOCKED` (`I-02`, `I-03`). `I-01R`, `ENV-05`, `ENV-06`, `ENV-07`, and
  `ENV-08` are independently accepted `DONE`. No active Cryptox Manager or
  worker is present at dispatch.
- I-01's prior backend delta is committed at `0bab722` and remains a
  historical `REVIEW / NEEDS_INSTRUCTOR_REVIEW` checkpoint, not a retry. The
  source now has the required public module seams through `9bbbfda` and the
  strict validation/real Strategy PostgreSQL gates are reconciled through
  `5fc0bb2`, `d274f52`, `6653191`, and `09ba93b`. The current backend still
  does not compose those seams into the real runtime: its default path leaves
  Strategy, Search, and Backtesting unavailable/in-memory and retains stale
  readiness details. This is the bounded I-01 frontier.
- I-01 start dependencies recorded by `MVP_PLAN.md` are `DONE`: `AU-01`,
  `AU-02`, `B-02`, `M-01`, `M-02`, `S-02`, `S-03`, `Q-01`, `N-01`, `N-02`,
  `F-01`, `F-AUTH`, `F-02`, `I-01S`, `I-01R`, and the ENV validation gates.
  Live Binance/CoinDesk and final browser/demo availability remain runtime
  evidence obligations, not permission to claim success when unavailable.

### Authorized packet: `I-01`

- **Requirements / authority:** the I-01 packet in
  `docs/implementation/MVP_PLAN.md`; `CSL-R-AU-01`, `CSL-R-OW-01`,
  `CSL-R-RD-01`, `CSL-R-DL-01`, `CSL-R-DM-01`, `CSL-R-MD-01`–`03`,
  `CSL-R-ST-01`–`07`, `CSL-R-SE-01`–`03`, `CSL-R-BT-01`–`02`,
  `CSL-R-NW-01`–`02`, `CSL-R-SN-01`, `CSL-R-RP-01`–`02`, `CSL-R-AR-01`–`03`,
  and the frozen REST/market-WebSocket contracts, accepted architecture,
  ADRs, and approved image functional amendment. This is implementation of
  already approved behavior, not a product-scope change.
- **Manager:** create exactly one fresh Manager in the same-directory
  canonical checkout `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, using `gpt-5.6-luna` with reasoning `max`. The Manager
  must read `AGENTS.md`, `docs/control/prompts/ORCHESTRATOR_START.md`, and the
  full authority chain before work; verify this signal, checkpoint, DAG,
  active-task absence, and exact write scope. No worktree, historical Manager
  reuse, duplicate, retry, replacement, or downstream execution is allowed.
- **Worker:** exactly one fresh sequential internal implementation worker,
  using `gpt-5.6-luna`, reasoning `max`, and Fast/priority service tier when
  the subagent tool exposes it. Its scope is the single coupled backend
  boundary `apps/backend/**`, including backend tests, composition/runtime,
  thin REST mappers, market-only WebSocket gateway, readiness/failure
  projections, and narrowly necessary example configuration. A root
  `package-lock.json` and matching `apps/backend/package.json` change is
  allowed only if one genuinely necessary market-WebSocket server runtime
  dependency is proven; no other dependency expansion is allowed. The worker
  must not edit control-plane files, modules, packages/contracts, migrations,
  infra, frontend, ADRs, OpenSpec, requirements, or generated files, and must
  not stage or commit.
- **Manager-owned write scope:** only the existing `I-01` row in
  `docs/implementation/TASKS.md` and the latest
  `docs/implementation/HANDOFF.md`, in addition to reviewing/integrating the
  worker's authorized backend paths. The Manager alone changes I-01 state and
  must not change any other row.
- **Required behavior:** compose Auth and all approved capability APIs through
  public module boundaries; derive trusted identity only from the server-side
  session context; preserve frozen REST and market-only WebSocket contracts;
  provide owner-filtered Strategy/Search/Backtest/Leaderboard operations;
  compose the public bounded Backtesting executor, Search generator registry,
  Strategy PostgreSQL repositories, Sentiment PostgreSQL adapter, real Binance
  historical/realtime adapters, application-generated results, and configured
  News plus local `LEXICON_V1` sentiment. Keep controllers thin and keep
  provider/persistence failures visible without leaking internals.
- **Readiness rule:** liveness remains independent; missing required
  persistence/providers makes readiness not-ready; provider failure remains
  observable; News/Sentiment degradation does not break core market,
  Strategy, Search, or Backtest paths; mock/fixture providers may be used only
  in tests/development and must never silently become final/demo runtime.
- **Acceptance:** backend HTTP/WS tests must prove Auth/session, unauthenticated
  rejection, 401/404 ownership and spoof resistance, Strategy definitions and
  composites, manual Backtest and SearchRun/Candidate/Experiment/Trade,
  application-generated Leaderboard, market history/realtime, News/Sentiment,
  readiness, provider failure, and `MARKET_OBSERVABILITY_V1`. The runtime must
  use the public seams without module-internal deep imports or algorithm
  duplication. Preserve the exact DTO/contract behavior and two-user no-leak
  guarantees.
- **Validation:** run the backend focused HTTP/WS suites, process-local real
  PostgreSQL Auth/application checks and migration validation when available,
  read-only live Binance historical/realtime checks, and configured real News
  source smoke when configured. Then run workspace test/build/typecheck/lint,
  architecture/dependency, source-sidecar/artifact, deferred-scope and its
  13-case suite, runtime smoke, secret/log, whitespace, exact-path, and
  `git diff --check`. Every unavailable database, provider, browser, OpenSpec
  CLI, or skipped test is `UNVERIFIED`/`BLOCKED`, never PASS.
- **Forbidden:** no changes to module source, contracts, schema/migrations,
  infra root, frontend, architecture rules, requirements, ADRs, OpenSpec, or
  unrelated routes; no controller business logic, general event bus,
  non-market WebSocket, fake-ready status, mock fallback, Redis/BullMQ,
  distributed protocol, live trading, generalized risk, deferred feature,
  I-02/I-03, extension, downstream, retry, replacement, duplicate, or final
  acceptance work. If an essential fix requires an excluded path, stop at
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and report the exact blocker.
- **Stop condition:** the Manager may transition only `I-01` through the
  normal execution/review sequence and record `DONE` only after all applicable
  scoped evidence passes. Make one coherent commit attempt; if Git ACL denies
  it, record the exact error and do not retry. Stop immediately at I-01's
  boundary; do not start or promote I-02, I-03, or any downstream packet.

## INS-119 — HOLD after ENV-05 and I-01R independent review

This signal supersedes `INS-118 / APPROVED_FOR_EXECUTION` after the Instructor
independently reviewed the exact Manager checkpoint, current source/diff,
control-plane transitions, deterministic gates, and fresh local PostgreSQL and
migration evidence. `ENV-05` and `I-01R` are accepted as `DONE` at their
bounded closure frontier. No new implementation packet is authorized while
this signal is current.

### Reviewed checkpoint and outcome

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION` at `1fab40d` (`chore(control): integrate ENV-05 and
  I-01R closure checkpoint`). The integrated Manager delta contains only the
  existing `TASKS.md` and latest `HANDOFF.md` operational artifacts; the sole
  pre-existing untracked path remains the untouched app-generated
  `.codex/config.toml`.
- The authoritative board has 49 rows: `46 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). No other task state changed, and no Cryptox
  Manager or worker remains active after the INS-118 checkpoint.
- `ENV-05` and `I-01R` each moved exactly `REVIEW -> DONE` under INS-118.
  The Manager changed no source, test, tooling, configuration, contract,
  schema, migration, provider, UI, or unrelated path. The one authorized
  Godel verifier used Luna `max`/priority with write scope `none`, timed out,
  and was closed without retry; that verifier result is `UNVERIFIED` and is
  not represented as a PASS.
- Independent deterministic evidence remains green: Backtesting `4/4`, Search
  `4/4`, Strategy `11/11`, Sentiment `2/2`; workspace `409` passed with `8`
  expected environment-gated skips; scope/deferred `13/13`; strict
  architecture `0` violations; runtime smoke `/live=200`, `/ready=503`,
  `/health=404`; artifacts, build, typecheck, lint, secret/log, exact-path,
  whitespace, and diff checks pass.
- Fresh Instructor local evidence confirms migration validation (`up`,
  constraints, `down`, remigrate) and Strategy PostgreSQL integration `2/2`,
  exit `0`, including same-owner composite persistence, exact component
  versions, owner-filtered reads, cross-owner rejection, and clean teardown.
  OpenSpec CLI, configured external providers, browser/demo, and final
  integration evidence remain `UNVERIFIED`/`BLOCKED` where unavailable.

### HOLD boundary

- Preserve `ENV-05` and `I-01R` as `DONE` with the exact audited commits and
  evidence. Keep `I-01` at `REVIEW`, `I-02` and `I-03` at `BLOCKED`, and all
  extension/deferred scope unchanged.
- Do not infer that closing the seam/validation packets resumes `I-01`. The
  next authorization requires a fresh Instructor review of the current I-01
  source/business frontier, exact requirements and dependencies, runtime/
  provider/demo obligations, write-scope safety, and absence of active
  Cryptox execution tasks.

## INS-118 — ENV-05 and I-01R closure validation

This signal supersedes `INS-117 / HOLD` after the Instructor independently
reviewed the current Git checkpoint, the repaired validation gates, the exact
I-01R source delta, and the task DAG. It authorizes one fresh Manager to perform
closure validation for exactly `ENV-05` and `I-01R`. It authorizes no source
implementation, no new task row, and no I-01 resumption.

### Reviewed checkpoint and authorization boundary

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION` at `5c215d0bc92c3a335adb98d49cb429d4c867c54d`
  (`chore(control): hold after ENV-08 and ENV-07 review`). The source and
  business state is unchanged from that checkpoint; the sole pre-existing
  untracked path is the untouched app-generated `.codex/config.toml`.
- The authoritative task board has 49 rows: `44 DONE`, `3 REVIEW`
  (`ENV-05`, `I-01R`, `I-01`), and `2 BLOCKED` (`I-02`, `I-03`). No active
  Cryptox Manager or worker is present at dispatch.
- The already integrated and independently reviewed reconciliation chain is
  `9bbbfda` (I-01R public seams), `5fc0bb2` (ENV-05 bounded gate delta),
  `d274f52` (ENV-06 boundary repair), `6653191` (ENV-07 persistence repair),
  and `09ba93b` (ENV-08 teardown repair). No new source delta is implied by
  this instruction.
- Current independent evidence is green for `scope:check`, architecture
  (`0` dependency violations), runtime smoke (`/live=200`, `/ready=503`,
  `/health=404`), deferred-scope `13/13`, focused public-seam tests,
  workspace tests (`409` passed with `8` expected environment-gated skips),
  build, typecheck, lint, and `git diff --check`. The focused real Strategy
  PostgreSQL integration evidence recorded at `INS-117` is `2/2`, exit `0`,
  with owner/version/cross-owner assertions and clean teardown. OpenSpec CLI
  remains `UNVERIFIED` because it is unavailable.

### Authorized closure packet: `ENV-05` + `I-01R`

- **Requirements / authority:** the requirement IDs and acceptance criteria
  already recorded for `ENV-05` and `I-01R` in
  `docs/implementation/MVP_PLAN.md`, `CSL-R-AR-01`–`03`,
  `CSL-R-RP-02`, `CSL-R-RD-01`, `CSL-R-DL-01`, `DEC-007`, ADR-005, and the
  approved public module/bootstrap contracts. This is a closure-validation
  authorization, not a scope change.
- **Manager:** create exactly one fresh Manager in the same-directory
  canonical checkout `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and reasoning `max`. The
  Manager must read `AGENTS.md`,
  `docs/control/prompts/ORCHESTRATOR_START.md`, and the full authority chain,
  then verify this signal, the reviewed checkpoint, DAG, and absence of active
  writers before doing anything else. No worktree, historical Manager reuse,
  duplicate, retry, or replacement is allowed.
- **Internal verification worker:** exactly one fresh read-only internal
  verifier is authorized to run the independent closure-gate review. Its
  write scope is `none`: it must not edit, stage, commit, or delete any file,
  and it must not change task state. Use `gpt-5.6-luna`, reasoning `max`, and
  Fast/priority service tier when the subagent tool exposes that field. No
  implementation worker is authorized because this packet has no source write
  scope.
- **Manager-owned write scope:** only the existing `ENV-05` and `I-01R` rows
  in `docs/implementation/TASKS.md` and the latest
  `docs/implementation/HANDOFF.md` checkpoint. The Manager may move each of
  those two rows from `REVIEW` to `DONE` only when its complete bounded
  evidence passes. It may not add a task row or alter any other state.
- **No source write scope:** no implementation, test, tooling, configuration,
  architecture, contract, schema, migration, provider, UI, OpenSpec,
  requirements, ADR, `MVP_PLAN.md`, `INSTRUCTOR.md`, or `DECISIONS.md` edits
  are authorized. If any source or governance repair is needed, stop and
  report `NEEDS_INSTRUCTOR_REVIEW` rather than editing it.
- **Required validation:** re-verify the starting Git checkpoint and no source
  or business-state drift; inspect the exact I-01R delta at `9bbbfda` and the
  ENV-05/ENV-06/ENV-07/ENV-08 evidence; rerun focused public-seam tests,
  `npm run scope:check`, the 13-case deferred-scope suite,
  `npm run arch:check`, `npm run runtime:smoke`, workspace test/build/
  typecheck/lint, artifacts/source-sidecar, secret/log, exact-path,
  whitespace, and `git diff --check`. Re-run the local PostgreSQL integration
  and migration validation when available. Any unavailable OpenSpec, provider,
  browser, or other environment remains `UNVERIFIED`/`BLOCKED`, never PASS.
- **Acceptance:** record `DONE` for `ENV-05` and `I-01R` only if the current
  strict gates remain green, the exact public boundaries and behavior are
  preserved, the real PostgreSQL evidence remains clean, no deferred scope or
  out-of-scope path leaked, and the task DAG/control plane is consistent. If
  any required bounded gate fails, leave the affected row at `REVIEW` and
  record the precise evidence and blocker in `HANDOFF.md`.
- **Prohibitions and stop condition:** no `I-01`, `I-02`, `I-03`, E1,
  downstream, extension, deferred, provider/demo, or final acceptance work;
  no automatic promotion; no source patch; no task-state changes outside
  `ENV-05`/`I-01R`. Stop immediately after the two authorized closure decisions
  and return to the Instructor for a fresh independent review.

## INS-117 — HOLD after ENV-08 and ENV-07 independent review

This signal supersedes `INS-116 / APPROVED_FOR_EXECUTION` after the Instructor
independently reviewed the exact ENV-08 worker delta, real PostgreSQL run,
full validation evidence, Git scope, and control-plane transitions. ENV-07
and ENV-08 are accepted as DONE at their bounded frontier. No new packet is
authorized while this signal is current.

### Reviewed checkpoint and outcome

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION` at `09ba93b` (`test(strategy): clean PostgreSQL
  integration teardown`), with the ENV-07 source repair integrated at
  `6653191` and the prior Instructor authorization at `44e3603`.
- The authoritative task board has 49 rows: `44 DONE`, `3 REVIEW`
  (`ENV-05`, `I-01R`, `I-01`), and `2 BLOCKED` (`I-02`, `I-03`). ENV-07 and
  ENV-08 each completed the required bounded state transitions; no other row
  changed.
- Exactly one fresh ENV-08 worker (Einstein) changed only
  `modules/strategy/infrastructure/postgres.integration.spec.ts`. The
  teardown now deletes dependent composite rows, composite definitions,
  Strategy definitions, and fixture users in foreign-key-safe order. The
  existing assertions and production `modules/strategy/infrastructure/postgres.ts`
  are unchanged from the reviewed ENV-07 checkpoint.
- Independent local Docker/PostgreSQL evidence: the focused Strategy
  integration passed `2/2` with exit `0`, including same-owner composite
  persistence, exact component versions, owner-filtered reads, and
  cross-owner rejection; the teardown produced no foreign-key error. Strategy
  unit tests passed `5/5`, workspace tests passed `409` with `8` expected
  environment-gated skips, and build/typecheck/lint, architecture, scope,
  deferred-scope `13/13`, artifacts, runtime smoke, secret/log, exact-path,
  whitespace, and diff checks passed. Local migration validation passed.
- OpenSpec CLI remains `UNVERIFIED` because the executable is unavailable.
  `.codex/config.toml` remains the sole untouched untracked path. The Manager's
  staging attempt was denied once by Git ACL; the Instructor integrated the
  already-reviewed exact three-path delta once without staging that file and
  without retrying the denied attempt.

### HOLD boundary

- Keep ENV-07 and ENV-08 `DONE` and preserve their exact commits and evidence.
- Keep `ENV-05`, `I-01R`, and `I-01` at `REVIEW`, `I-02` and `I-03` at
  `BLOCKED`, and all E1/deferred scope unchanged. Do not infer readiness or
  start any downstream packet from this HOLD signal.
- The next authorization requires a fresh Instructor review of the current
  I-01R frontier, exact dependencies, source/business state, and absence of
  active Cryptox Manager/worker before dispatch.

## INS-116 — ENV-08 Strategy PostgreSQL integration teardown and ENV-07 closure

This signal supersedes `INS-115 / HOLD` after the Instructor independently
reviewed and integrated the exact ENV-07 source/control checkpoint. It
authorizes one tightly coupled follow-up: repair the existing Strategy
PostgreSQL integration-test teardown and, only if the resulting evidence is
clean, close ENV-07. It authorizes no other implementation or downstream work.

### Authorization boundary and applicability

- The reviewed source/business checkpoint is `fd5fcf3` on
  `MVP_IMPLEMENTATION`, after the ENV-07 source mapping and Manager checkpoint
  were integrated at `6653191` and the Instructor persisted `INS-115 / HOLD`.
  The authorization commit contains governance only; the Manager must verify
  that no source/business state changed from `fd5fcf3`.
- Before adding ENV-08, the authoritative board has 48 rows: `42 DONE`, `4
  REVIEW` (`ENV-05`, `I-01R`, `I-01`, `ENV-07`), and `2 BLOCKED` (`I-02`,
  `I-03`). No ENV-08 operational row exists yet; the Manager must add exactly
  that one row and may move no other row except the explicitly permitted
  ENV-07 closure below.
- The only pre-existing untracked path is the app-generated
  `.codex/config.toml`; it is outside scope and must remain untouched,
  unstaged, and undeleted. No Cryptox Manager, worker, retry, replacement,
  duplicate, or downstream task may be active at dispatch.

### Authorized packet: ENV-08 plus conditional ENV-07 closure

- **Requirement IDs:** `CSL-R-ST-03`–`04`, `CSL-R-OW-01`, `CSL-R-RP-02`, the
  accepted Strategy persistence contract, and the integration evidence needed
  before accepting ENV-07/I-01R.
- **Manager:** create exactly one fresh Manager in the same canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and reasoning `max`. The
  Manager must read `AGENTS.md`,
  `docs/control/prompts/ORCHESTRATOR_START.md`, and the full authority chain
  before work. Internal worker dispatch must use Fast/priority service tier
  when the subagent tool supports that field.
- **Worker:** exactly one fresh internal worker, the sole implementation
  writer, with the disjoint scope limited to
  `modules/strategy/infrastructure/postgres.integration.spec.ts`. It may
  adjust only the existing `afterAll` deletion ordering needed to satisfy the
  composite foreign keys. It must not edit production source, control-plane
  files, contracts, migrations, ADRs, OpenSpec, backend/frontend, other
  modules, generated files, or stage/commit.
- **Objective:** make the focused Strategy PostgreSQL integration suite clean
  by deleting dependent composite rows/definitions before referenced Strategy
  definitions and fixture users. Preserve both existing tests, fixtures,
  assertions, owner isolation, the ENV-07 production source fix, schema,
  migrations, contracts, and runtime behavior.
- **Manager-owned control scope:** add exactly one `ENV-08` row to
  `docs/implementation/TASKS.md`, move only ENV-08 through the normal state
  sequence, and replace `docs/implementation/HANDOFF.md` with the ENV-08
  checkpoint. After the cleanup is independently proven, the Manager may move
  only ENV-07 from `REVIEW` to `DONE`; no other task state may change.
- **Acceptance:** with the local Docker/PostgreSQL test database, the focused
  command `npm --workspace @cryptox/strategy test --
  infrastructure/postgres.integration.spec.ts` exits zero, both existing
  tests pass, and no teardown foreign-key error remains. The evidence must
  still prove ENV-07 same-owner composite persistence, exact component
  versions, owner-filtered reads, and cross-owner rejection.
- **Validation:** run focused Strategy tests and applicable workspace
  test/build/typecheck/lint, `npm run arch:check`, `npm run scope:check`, the
  13-case deferred-scope suite, artifacts/source-sidecar, runtime smoke,
  secret/log, exact-path, whitespace, and `git diff --check`. Run local
  migration validation when Docker is available. Any unavailable tool or
  environment is `BLOCKED` or `UNVERIFIED`, never PASS; OpenSpec CLI remains
  `UNVERIFIED` unless real evidence is obtained.
- **Prohibitions and stop condition:** no production source, schema/migration,
  API/DTO, ownership, algorithm, checker, broad skip, unrelated cleanup,
  retry, replacement, duplicate, worktree, downstream, I-01R closure, I-01,
  I-02, I-03, extension, or final/demo execution. The Manager may record
  ENV-08 `DONE` and ENV-07 `DONE` only if the exact bounded evidence passes;
  otherwise both remain truthfully at REVIEW/NEEDS_INSTRUCTOR_REVIEW as
  applicable. Stop at that checkpoint and return to the Instructor.

## INS-115 — HOLD after ENV-07 Strategy PostgreSQL review

This signal supersedes `INS-114 / APPROVED_FOR_EXECUTION` after the Instructor
independently reviewed the Manager checkpoint, the exact source delta, Git
state, local PostgreSQL evidence, and the control plane. No implementation
packet is authorized while this signal is current.

### Reviewed checkpoint and outcome

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION` at `6653191` (`fix(strategy): reconcile composite
  persistence mapping`), with `c5e9df0` as the INS-114 authorization
  checkpoint and `d274f52` as the ENV-06 integration ancestor.
- ENV-07 is recorded as `REVIEW / NEEDS_INSTRUCTOR_REVIEW` in the sole
  operational task board. The board has 48 rows: `42 DONE`, `4 REVIEW`
  (`ENV-05`, `I-01R`, `I-01`, `ENV-07`), and `2 BLOCKED` (`I-02`, `I-03`).
- The worker changed only the authorized Strategy PostgreSQL source path;
  the integration spec was not changed. The final mapping preserves the
  existing camelCase JSON payload and aliases its quoted fields into the
  existing snake_case CTE names.
- Real local PostgreSQL evidence proves the two ENV-07 behavioral assertions
  (`2/2`): same-owner composite persistence with exact component versions,
  owner-filtered read, and cross-owner rejection. The focused suite still
  exits nonzero because its pre-existing `afterAll` deletes users before
  `composite_components`, violating `composite_components_strategy_fk`.
- Independent validation: local migration validation PASS; Strategy unit
  `5/5`; workspace tests PASS with the expected environment-gated skips; root
  build/typecheck/lint PASS; architecture, deferred-scope `13/13`, scope,
  artifacts, runtime smoke, secret/log, exact-path, whitespace, and diff
  checks PASS. OpenSpec CLI remains `UNVERIFIED`.
- The Manager's only staging attempt was denied by Git ACL at
  `.git/index.lock`; the Instructor integrated the already-reviewed exact
  three-path delta once with elevated Git. No retry was made, and
  `.codex/config.toml` remains untouched and untracked.

### HOLD boundary

- Do not mark ENV-07 `DONE` until the real integration command exits cleanly.
- The teardown cleanup is a separate, narrow follow-up authorization; it does
  not authorize changes to the Strategy source fix, schema, migrations,
  contracts, ownership, algorithms, checkers, or unrelated tests.
- Keep `I-01R`, `I-01`, `I-02`, `I-03`, all E1 extension packets, and all
  deferred scope unchanged. Do not create a Manager or worker under this
  HOLD signal.

## INS-114 — ENV-07 Strategy PostgreSQL Composite Persistence Reconciliation

This signal supersedes `INS-113 / HOLD` after the Instructor independently
verified the live PostgreSQL failure, the ENV-06 integration checkpoint, Git
state, the task board, and the absence of an active Cryptox Manager or worker.
It authorizes exactly one bounded packet: `ENV-07`. It authorizes no ENV-06
retry, I-01R closure, I-01 resumption, I-02, I-03, extension, replacement,
duplicate, worktree, or downstream execution.

### Authorization boundary and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `391d639` (`chore(control): hold after ENV-06
  database review`), with the exact ENV-06 source integration at ancestor
  `d274f52`. The tracked tree is clean; the app-generated `.codex/config.toml`
  remains untracked, outside Cryptox scope, and must stay untouched,
  unstaged, and undeleted.
- The authoritative board remains `42 DONE`, `3 REVIEW` (`ENV-05`, `I-01R`,
  `I-01`), and `2 BLOCKED` (`I-02`, `I-03`) across `47` rows. `ENV-07` is a
  planned packet and is not yet an operational row; the Manager must add
  exactly that one new row and may move no existing row.
- `HANDOFF.md` remains the latest Manager checkpoint for ENV-06 at the
  integrated `d274f52` source checkpoint. Its recorded `INS-112` authority is
  historical; this fresh signal is the only execution authority for ENV-07.
- The previous ENV-06 Manager and all three internal workers are idle/complete.
  The task-status review found no active Cryptox Manager, worker, retry,
  replacement, duplicate, or downstream task.

### Authorized packet: ENV-07

- **Requirement IDs:** `CSL-R-ST-03`–`04`, `CSL-R-OW-01`, `CSL-R-RP-02`, the
  accepted Strategy persistence contract, and the live PostgreSQL failure
  recorded in `DEC-034` and `MVP_PLAN.md`.
- **Manager:** create exactly one fresh Manager in the same canonical
  same-directory checkout, with model `gpt-5.6-luna` and reasoning `max`.
  The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal,
  the reviewed checkpoint, the DAG, and the exact write scopes before work.
- **Worker:** the Manager may create exactly one fresh internal worker. That
  worker is the sole feature implementer and must use only the disjoint scope
  `modules/strategy/infrastructure/postgres.ts` and, only when a focused
  regression assertion is strictly necessary,
  `modules/strategy/infrastructure/postgres.integration.spec.ts`.
- **Objective:** repair only the JSON key mapping mismatch in Strategy
  composite persistence where `componentPayload` emits camelCase keys while
  `jsonb_to_recordset` reads snake_case fields. Preserve schema, public
  contracts, version semantics, owner filtering, component-version
  provenance, transaction behavior, and all unrelated Strategy behavior.
- **Manager-owned control scope:** add the single `ENV-07` row to
  `docs/implementation/TASKS.md`, move only that row through the normal state
  sequence, and replace `docs/implementation/HANDOFF.md` with the final
  checkpoint. The Manager may review/integrate only the worker's exact
  authorized source delta; it must not change any other task row or governance
  artifact.
- **Acceptance:** with the local PostgreSQL test database, the focused
  Strategy integration proves same-owner composite persistence, exact
  component versions, owner-filtered reads, and cross-owner rejection. The
  targeted Strategy suite must pass, followed by applicable workspace tests,
  build, typecheck, lint, `npm run arch:check`, `npm run scope:check`, the
  13-case deferred-scope suite, artifacts/source-sidecar, runtime smoke,
  secret/log, whitespace, exact-path, and `git diff --check` validation.
  Docker/PostgreSQL evidence may use the process-local test URL derived from
  the repository's local environment file; never print passwords, tokens, or
  connection secrets. Any unavailable tool or environment is `BLOCKED` or
  `UNVERIFIED`, never `PASS`; OpenSpec CLI remains `UNVERIFIED` unless real
  evidence becomes available.
- **Prohibitions and stop condition:** no schema or migration change, API/DTO
  redesign, algorithm change, ownership weakening, checker modification,
  broad skip, unrelated cleanup, retry, replacement, duplicate, worktree,
  downstream task, I-01R closure, or I-01/I-02/I-03 execution. The Manager
  stops after ENV-07 reaches `REVIEW` (and records `DONE` only if all scoped
  evidence passes) for a fresh Instructor audit. No newly unlocked work may
  start automatically.

## Historical INS-113 — HOLD after ENV-06 review and live PostgreSQL Strategy blocker

This signal supersedes `INS-112 / APPROVED_FOR_EXECUTION` after the Instructor
independently reviewed the exact ENV-06 integration and newly available local
PostgreSQL evidence. It authorizes no implementation, retry, replacement,
duplicate, downstream promotion, or task-state transition.

### Reviewed checkpoint and current frontier

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `d274f52` (`chore(control): integrate ENV-06
  boundary reconciliation`). The tracked tree is clean at this checkpoint;
  the app-generated `.codex/config.toml` remains untracked, outside Cryptox
  scope, and must stay untouched, unstaged, and undeleted.
- The authoritative board has `42 DONE`, `3 REVIEW` (`ENV-05`, `I-01R`,
  `I-01`), and `2 BLOCKED` (`I-02`, `I-03`) rows, `47` rows total. ENV-06 is
  the only newly completed row; no existing row was changed by its Manager.
- The ENV-06 Manager and all three internal workers are idle/complete. No
  competing Cryptox Manager, worker, retry, replacement, duplicate, or
  downstream task is active.

### Independent review evidence

- ENV-06 changed exactly its 23 authorized source files plus its `TASKS.md`
  row and `HANDOFF.md`; no Strategy source path was changed. The strict
  `npm run arch:check` passes with 0 violations, `npm run scope:check`,
  artifacts, runtime smoke, build, typecheck, lint, whitespace, exact-path,
  and focused affected-module tests pass.
- Local Docker Compose is reachable as `v2.40.3`; migration validation passes
  for up, constraints, down, and remigrate. With a process-local test URL,
  Auth PostgreSQL persistence is `3/3`, Market Data persistence `1/1`, Search
  Q-01 integration `1/1`, and backend Auth E2E `1/1`.
- A targeted Strategy PostgreSQL integration rerun reproducibly fails one
  test at `modules/strategy/infrastructure/postgres.ts:637` with `NOT_FOUND`
  during a valid same-owner composite insert. The existing
  `componentPayload` emits camelCase JSON keys while
  `jsonb_to_recordset` reads snake_case fields. This is an independent
  Strategy persistence defect and is not evidence to broaden ENV-06.
- The full database-enabled workspace run therefore has one real Strategy
  integration failure and must not be reported as PASS. OpenSpec CLI remains
  `UNVERIFIED`; configured live Binance/News traffic, browser/demo, and final
  integrated runtime evidence remain `UNVERIFIED`.

### Required next decision

The next authorization, if any, must be a new bounded `ENV-07` packet exactly
as recorded in `MVP_PLAN.md`: one fresh same-directory Manager using
`gpt-5.6-luna` with reasoning `max`, one fresh internal worker, and write scope
limited to `modules/strategy/infrastructure/postgres.ts` plus its focused
integration test only. It may repair only the JSON key mapping and prove the
real PostgreSQL composite persistence behavior. It must not close ENV-06,
I-01R, resume I-01, start I-02/I-03, or promote downstream work.

## Historical INS-112 — Remaining application contract boundary reconciliation

This signal supersedes `INS-111 / HOLD` after the Instructor verified the
integrated ENV-05 checkpoint and its remaining architecture findings. It
authorizes exactly one new operational packet, `ENV-06`, and no other task.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `17db62f` (`chore(control): hold after ENV-05
  review`). The tracked tree is clean at this checkpoint; the app-generated
  `.codex/config.toml` remains untracked, outside Cryptox scope, and must stay
  untouched, unstaged, and undeleted.
- The authoritative task board has `41 DONE`, `3 REVIEW` (`I-01R`, `I-01`,
  `ENV-05`), and `2 BLOCKED` (`I-02`, `I-03`) rows, `46` rows total. Existing
  rows must remain unchanged; the Manager must add exactly one `ENV-06` row
  and own only its state transitions.
- The exact ENV-05 output is integrated at `5fc0bb2`. Independent
  `npm run arch:check` still reports `28` active application-to-own-API
  violations across Backtesting, Search, News, Market Data, and Leaderboard;
  no competing Cryptox Manager, worker, retry, replacement, duplicate, or
  downstream task is active.
- Governing authority is `CSL-R-AR-01`–`03`, `CSL-R-RP-02`, `CSL-R-DL-01`,
  ADR-005's accepted `api -> application -> domain` layering, `DEC-032`,
  `DEC-033`, the current `MVP_PLAN.md` ENV-06 packet, and the active
  `mvp-implementation` artifacts read directly. OpenSpec CLI remains
  `UNVERIFIED`.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical checkout, same directory,
  no worktree and no historical Manager reuse, with model `gpt-5.6-luna` and
  reasoning `max`. The Manager must read `AGENTS.md`,
  `docs/control/prompts/ORCHESTRATOR_START.md`, the current signal, checkpoint,
  task DAG, requirements, accepted ADRs, architecture, data model, relevant
  specs, and the complete ENV-06 plan before acting.
- The Manager must create exactly three fresh internal workers in parallel
  with disjoint module scopes below; no user-visible child task, duplicate,
  replacement, retry, unapproved writer, branch, or worktree is allowed.
  Workers must not edit control-plane artifacts or commit.
- Worker A may edit only `modules/backtesting/application/service.ts`,
  `modules/backtesting/application/memory.ts`,
  `modules/backtesting/application/ports.ts`,
  `modules/backtesting/api/contracts.ts`,
  `modules/search/application/service.ts`,
  `modules/search/application/memory.ts`,
  `modules/search/application/ports.ts`,
  `modules/search/api/contracts.ts`,
  `modules/search/domain/random-generator.ts`, and focused tests under the
  Backtesting/Search module directories only. It may remove only the current
  application-to-own-API dependencies with lower-layer-owned types/constants
  and stable public re-exports.
- Worker B may edit only `modules/news/application/service.ts`,
  `modules/news/application/scheduler.ts`,
  `modules/news/application/ports.ts`,
  `modules/news/application/normalization.ts`,
  `modules/news/api/contracts.ts`,
  `modules/market-data/application/service.ts`,
  `modules/market-data/application/observability.ts`,
  `modules/market-data/application/ports.ts`,
  `modules/market-data/api/contracts.ts`, and focused tests under the
  News/Market Data module directories only. It may remove only the current
  application-to-own-API dependencies while preserving News/Sentiment
  isolation and ephemeral Market Data behavior.
- Worker C may edit only `modules/leaderboard/application/service.ts`,
  `modules/leaderboard/application/memory.ts`,
  `modules/leaderboard/application/ports.ts`,
  `modules/leaderboard/api/contracts.ts`,
  `modules/leaderboard/domain/ranking.ts`, and focused tests under the
  Leaderboard module directory only. It may remove only the current
  application-to-own-API dependencies while preserving ranking formula,
  eligibility, ownership, provenance, and public exports.
- The Manager alone may add and update the `ENV-06` row in
  `docs/implementation/TASKS.md` and replace `docs/implementation/HANDOFF.md`.
  It may perform only governance, review, integration glue, conflict
  resolution, or a genuinely tiny review fix inside the authorized paths.
  It may not change ENV-05, I-01R, I-01, I-02, I-03, or any other row.

### Acceptance, validation, prohibitions and stop condition

- The Manager must verify the current architecture finding set before edits.
  `npm run arch:check` must pass with all active rules intact. No
  `dependencyTypesNot` shortcut, broad allowlist, severity downgrade,
  known-violation baseline, or coverage bypass is authorized.
- Run focused tests for every changed module, workspace test/build/typecheck/
  lint, artifacts/source-sidecar, deferred-scope and its 13-case suite,
  runtime smoke, secret/log, whitespace, exact-path, and `git diff --check`.
  Docker/PostgreSQL, OpenSpec CLI, configured live providers, browser/demo,
  and final integrated runtime evidence remain `BLOCKED`/`UNVERIFIED` unless
  actually observed. Fixtures and skips are not PASS evidence.
- Preserve all public module exports, REST/WebSocket contracts, runtime
  behavior, algorithms, schemas/migrations, providers, ownership,
  provenance, and existing task states. Do not edit `.dependency-cruiser.js`,
  `scripts/check-architecture-rules.mjs`, packages, apps, infra root,
  dependencies, OpenSpec/requirements/ADR artifacts, deferred features,
  queues, distributed protocols, or downstream code.
- The Manager may move only `ENV-06` through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, and to `DONE` only when the
  exact architecture findings are gone and every bounded gate passes. It
  must stop after one coherent checkpoint commit attempt; if Git denies
  staging/commit, record the exact error once and do not retry. It must not
  close ENV-05/I-01R, resume I-01, start I-02/I-03, or promote downstream
  work. A fresh Instructor review must follow.

## Historical INS-111 — HOLD after ENV-05 architecture-gate review

This signal supersedes `INS-110 / APPROVED_FOR_EXECUTION` after the Manager
completed the one authorized ENV-05 attempt. It authorizes no implementation,
retry, replacement, duplicate, downstream promotion, or task-state transition.

### Verified checkpoint and current frontier

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, with the exact audited ENV-05 delta integrated at
  `5fc0bb2` (`chore(control): integrate ENV-05 gate checkpoint`). The tracked
  tree is clean at that commit; the app-generated `.codex/config.toml` remains
  untracked, outside Cryptox scope, and must stay untouched, unstaged, and
  undeleted.
- The authoritative board has `41 DONE`, `3 REVIEW` (`I-01R`, `I-01`,
  `ENV-05`), and `2 BLOCKED` (`I-02`, `I-03`) rows, `46` rows total. `ENV-05`
  is `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; no existing row was promoted or
  changed by its Manager.
- The fresh ENV-05 Manager and all three internal workers are idle/complete;
  no Cryptox Manager, worker, retry, replacement, duplicate, or downstream
  task is active.

### Independent evidence

- `npm run scope:check`: `PASS`; deferred-scope suite: `13/13 PASS`.
- `npm run runtime:smoke`: `PASS` with `/live=200`, `/ready=503`, and
  `/health=404`.
- Workspace tests: `409 PASS`, `8` environment-gated skips; skips are not
  PASS evidence. Typecheck, build, lint, artifacts, secret/log, whitespace,
  exact-path, and diff checks passed.
- `npm run arch:check`: `FAIL`, with `28` active
  `application-does-not-import-own-api` / `application-depends-inward-only`
  findings, including unchanged files outside the ENV-05 authorization. The
  rules remain strict; no bypass or severity downgrade is accepted.
- Docker/PostgreSQL is `BLOCKED`; OpenSpec CLI, configured live providers,
  browser/demo, and final integrated runtime evidence remain `UNVERIFIED` or
  `BLOCKED` where unavailable. Fixtures and skipped tests are not promoted to
  live evidence.

### Required next decision

The next authorization, if any, must be a separately bounded architecture
source/harness reconciliation for the exact `28` findings (or a justified
smaller proven subset), with explicit file scopes, acceptance criteria, and
stop boundary. ENV-05 does not authorize that work, I-01, I-02, I-03, or any
downstream packet. Until then, preserve `ENV-05` at `REVIEW /
NEEDS_INSTRUCTOR_REVIEW` and leave the system on `HOLD`.

## Historical INS-110 — Validation and architecture gate reconciliation

This signal supersedes `INS-109 / HOLD` after the Instructor's fresh review of
the verified I-01R gate findings. It authorizes exactly one new validation
reconciliation packet, `ENV-05`, and no other task.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `b8c6f52` (`chore(control): hold after I-01R seam
  review`). The tracked tree is clean at this checkpoint; the untouched
  app-generated `.codex/config.toml` remains untracked, outside Cryptox scope,
  and must stay unstaged and undeleted.
- The authoritative task board has `41 DONE`, `2 REVIEW` (`I-01R`, `I-01`),
  and `2 BLOCKED` (`I-02`, `I-03`), `45` rows total. The Manager must add
  exactly one `ENV-05` row and own its state transitions. Existing rows must
  remain unchanged.
- `I-01R` source is independently integrated at `9bbbfda`; its public seams
  are reviewable, but the current scope checker, architecture checker, and
  runtime smoke expose concrete reconciliation findings. No Cryptox Manager,
  worker, retry, replacement, duplicate, or downstream task is active.
- Governing requirements/authority for this packet are `CSL-R-AR-01`–`03`,
  `CSL-R-RP-02`, `CSL-R-RD-01`, `CSL-R-DL-01`, `DEC-007`, and the accepted
  ADR-005 bootstrap-facade rule. OpenSpec CLI remains `UNVERIFIED`; the active
  change/spec artifacts and durable plan have been read directly.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical checkout, same directory,
  no worktree and no historical Manager reuse, with model `gpt-5.6-luna` and
  reasoning `max`. The Manager must read `AGENTS.md`,
  `docs/control/prompts/ORCHESTRATOR_START.md`, the current signal, checkpoint,
  task DAG, requirements, accepted ADRs, architecture, data model, relevant
  specs, and the complete ENV-05 plan before acting.
- The Manager may create at most three fresh internal workers, with the three
  disjoint scopes below, and no user-visible child tasks. No duplicate,
  replacement, retry, unapproved parallel writer, branch, or worktree is
  allowed. Workers must not edit control-plane artifacts or commit.
- Worker A may edit only `scripts/check-deferred-scope.cjs`,
  `scripts/check-deferred-scope.test.cjs`, and `scripts/smoke-backend.cjs`.
  It may add only the exact public Search registry boundary for the two
  already approved profiles and align the readiness assertion with the
  current truthful composition list; all unrelated rejection and smoke
  behavior must remain enforced.
- Worker B may edit only `.dependency-cruiser.js` and
  `scripts/check-architecture-rules.mjs`. It may configure the repository's
  TypeScript path resolution and represent the documented allowlisted
  `api/bootstrap` facade, while retaining enforcement for non-bootstrap
  infrastructure imports, cross-module internals, domain/application
  direction, unresolved dependencies, and cycles. No severity downgrade,
  broad ignore, known-violation baseline, or coverage bypass is authorized.
- Worker C may edit only the exact module source/test paths listed in the
  `ENV-05` plan: `modules/backtesting/application/service.ts`,
  `modules/backtesting/api/contracts.ts`,
  `modules/search/application/service.ts`,
  `modules/search/api/contracts.ts`,
  `modules/search/domain/random-generator.ts`,
  `modules/search/domain/generators/domain-guided/domain-guided-generator.ts`,
  `modules/search/domain/generators/genetic/genetic-generator.ts`,
  `modules/leaderboard/application/service.ts`,
  `modules/leaderboard/domain/ranking.ts`,
  `modules/leaderboard/api/contracts.ts`,
  `modules/market-data/application/service.ts`,
  `modules/market-data/api/contracts.ts`,
  `modules/news/application/service.ts`,
  `modules/news/api/contracts.ts`,
  `modules/sentiment/application/lexicon.ts`,
  `modules/sentiment/api/contracts.ts`,
  `modules/news/infrastructure/postgres.ts`,
  `modules/news/infrastructure/extraction-postgres.ts`,
  `modules/news/infrastructure/postgres-types.ts` (new), and focused tests
  in those same module directories only. This is limited to
  behavior-preserving import/constant plumbing and the News PostgreSQL
  infrastructure cycle fix; it may not alter contract behavior, algorithms,
  use-case semantics, schema, or provider behavior.
- The Manager alone may update the new `ENV-05` row and replace
  `docs/implementation/HANDOFF.md`. It may perform only governance, review,
  integration glue, conflict resolution, or a tiny review fix within the
  authorized paths; all independent implementation must be delegated.

### Acceptance, validation, prohibitions and stop condition

- The Manager must prove `npm run scope:check`, the 13-case deferred-scope
  suite, `npm run arch:check`, and `npm run runtime:smoke` pass. Architecture
  must pass with the real rules intact; no failure may be hidden by weakening
  a rule or changing expected product behavior.
- Run focused tests for every changed module, workspace test/build/typecheck/
  lint, artifact/source-sidecar, secret/log, whitespace, exact-path, and
  `git diff --check` validation. Docker/PostgreSQL, OpenSpec CLI, configured
  real providers, browser/demo, and final integrated runtime evidence remain
  `BLOCKED`/`UNVERIFIED` unless actually observed.
- Do not change `packages/contracts/**`, migrations, backend/frontend,
  `infra/**`, dependencies, OpenSpec/requirements/ADR artifacts, deferred
  features, queues, distributed protocols, or any unrelated source. Do not
  close `I-01R`, resume `I-01`, start `I-02`/`I-03`, or promote downstream.
  If an architecture repair requires a path outside the listed scope, stop at
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and report it exactly.
- The Manager may move only `ENV-05` through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, and to `DONE` only when the
  bounded evidence passes. It must stop after one coherent checkpoint commit
  attempt; if Git denies staging/commit, record the exact error once and do
  not retry. A fresh Instructor review must follow.

## Historical INS-109 — HOLD after INS-108 I-01R review

This signal supersedes `INS-108 / APPROVED_FOR_EXECUTION` after the Instructor's
independent review of the exact I-01R source delta integrated at `9bbbfda`. It
authorizes no implementation, retry, replacement, duplicate, downstream
promotion, or task-state transition.

### Reviewed checkpoint and current frontier

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, with the exact audited I-01R source delta integrated at
  `9bbbfda` (`feat(strategy): expose public module persistence seams`). The
  tracked tree was clean at the review checkpoint; the untouched app-generated
  `.codex/config.toml` remains untracked, outside Cryptox scope, and must stay
  unstaged and undeleted.
- The authoritative task board has `41 DONE`, `2 REVIEW` (`I-01R`, `I-01`),
  and `2 BLOCKED` (`I-02`, `I-03`), `45` operational rows total. `I-01R` is
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`, not `DONE`; `I-01` remains its earlier
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` checkpoint. No downstream task was started
  or promoted.
- `INS-108` used exactly one fresh same-directory Manager
  (`01a053e8-0972-78b2-aa4b-54362ad3c5ab`) and exactly three fresh internal
  workers (Euler, Erdos, Chandrasekhar) in the canonical checkout. The Manager
  and all workers are idle/closed; there was no worktree, retry, replacement,
  duplicate, competing Cryptox writer, or downstream execution. The Manager's
  single staging attempt was denied by Git's `.git/index.lock` permission error
  and was not retried.

### Independent I-01R review

- The integrated source is limited to the explicitly authorized public
  Backtesting/Search/Strategy/Sentiment seams and their focused tests. No
  contracts, migrations, application layer, existing provider/algorithm,
  backend, frontend, infra, dependency, generated, OpenSpec, requirement,
  ADR, or deferred-scope path entered the integration commit. The Manager-owned
  `TASKS.md` and `HANDOFF.md` checkpoint remains the operational record.
- `PASS`: Backtesting `46/46`; Search `36 passed / 1 PostgreSQL-gated skip`;
  Strategy `125 passed / 2 PostgreSQL-gated skips`; Sentiment `20/20`; root
  workspace test, build, typecheck, and lint commands; artifact/source-sidecar,
  test-scope `13/13`, focused secret/log, whitespace, exact-path, and
  `git diff --check` validations.
- `FAIL`: `npm run scope:check` rejects the approved
  `DOMAIN_GUIDED_V1` and `GENETIC_V1` profile entries in the new public Search
  registry because the current checker allowlist does not cover that boundary;
  `npm run arch:check` reports `71` dependency violations, including the new
  public API/infrastructure composition finding; `npm run runtime:smoke` fails
  its stale readiness-name assertion against the now truthful dependency list.
- `BLOCKED`: Docker Compose/local PostgreSQL validation is unavailable and
  `DATABASE_URL` is unset, so the two live Strategy PostgreSQL integration
  tests remain skipped. `UNVERIFIED`: OpenSpec CLI evidence and real provider,
  browser/demo, and final integrated runtime evidence. Fixtures and skipped
  tests are not promoted to PASS.

### Hold condition and next safe gate

- No implementation is authorized under `INS-109`. `I-01R` cannot be promoted
  to `DONE` while its deferred-scope and architecture gates fail and live
  PostgreSQL evidence is unavailable. `I-01` cannot resume until a fresh
  authorization proves its applicability against the new checkpoint. `I-02`
  and `I-03` remain `BLOCKED`; no deferred packet or downstream packet may
  start automatically.
- The next Instructor authorization, if any, must be a separately bounded
  reconciliation of the Search checker allowlist/public boundary and the
  architecture/runtime-smoke control-plane mismatch, or a separately bounded
  continuation of I-01 after those premises are proven. It must first recheck
  Git, the latest checkpoint, task DAG, dependencies, and active writers. It
  must not silently widen I-01R, reopen deferred scope, or treat unavailable
  PostgreSQL/provider/demo evidence as PASS.

## Historical INS-108 — Public module bootstrap and persistence seam reconciliation

This signal supersedes `INS-107 / HOLD` after the Instructor's independent
review of the committed I-01 boundary. It authorizes exactly one fresh
same-directory Manager and only the bounded prerequisite packet `I-01R`.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `b20c5e6` (`chore(control): hold after I-01
  integration review`). The tracked tree is clean at this checkpoint; the
  untouched app-generated `.codex/config.toml` remains untracked, outside
  Cryptox scope, and must stay unstaged and undeleted.
- The authoritative task board at authorization is `41 DONE`, `1 REVIEW`
  (`I-01`), and `2 BLOCKED` (`I-02`, `I-03`). `I-01R` is a new plan packet in
  `MVP_PLAN.md`; the Manager must add its single operational row to
  `TASKS.md` and own its state transitions. `I-01` must remain `REVIEW` until
  a later fresh authorization.
- `INS-106` was independently reviewed and integrated at `0bab722`; its
  Manager and sole worker Volta are idle/closed. No competing Cryptox
  Manager, worker, retry, replacement, duplicate, or downstream execution is
  active. The public seams named below are concrete blockers from that review,
  not chat-only assumptions.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical checkout, same directory,
  no worktree and no historical Manager reuse, using model
  `gpt-5.6-luna` with reasoning `max`. The Manager must read `AGENTS.md`,
  `docs/control/prompts/ORCHESTRATOR_START.md`, the current signal, checkpoint,
  task DAG, requirements, accepted ADRs, architecture, data model, relevant
  capability specs, and the `I-01R` plan packet before acting.
- The Manager may create at most three fresh internal workers, one for each
  disjoint scope below, and no user-visible child tasks. Workers must not edit
  control-plane artifacts, commit, or change another worker's paths. No
  duplicate, replacement, retry, or unapproved parallel writer is allowed.
- Worker A — Backtesting public execution seam: only
  `modules/backtesting/api/**` excluding `contracts.ts`, plus focused tests
  within that authorized area. Expose a public bounded-local-executor
  composition helper/factory usable by `createBacktestingModule`; do not alter
  simulator behavior or import infrastructure from the backend.
- Worker B — Search public generator seam: only `modules/search/api/**`
  excluding `contracts.ts`, plus focused tests within that authorized area.
  Expose deterministic immutable composition for the already approved
  `RANDOM_V1`, `DOMAIN_GUIDED_V1`, and `GENETIC_V1` generators without copying
  algorithms or changing their behavior.
- Worker C — Owned persistence/public exports: only
  `modules/strategy/api/**`, a new or narrowly required
  `modules/strategy/infrastructure/postgres.ts` and its focused tests, plus
  `modules/sentiment/api/**` and focused tests. Provide owner-filtered,
  versioned Strategy definition/composite PostgreSQL repositories against the
  existing approved schema and expose the existing Sentiment PostgreSQL
  dependencies through its public entrypoint. No schema or migration change
  is authorized.
- The Manager alone may update the new `I-01R` row in
  `docs/implementation/TASKS.md` and replace
  `docs/implementation/HANDOFF.md`; all source implementation with an
  independent write scope must be delegated to the workers. The Manager may
  do only governance, review, integration glue, conflict resolution, or a
  tiny review fix clearly within these paths.

### Acceptance, validation, prohibitions and stop condition

- Prove through focused public-entrypoint tests that the Backtesting and
  Search seams are composable, deterministic, immutable, and free of
  duplicate algorithm source; prove Strategy owner filtering, pagination,
  version allocation/concurrency, composite component-version provenance,
  cross-owner no-leak behavior, and Sentiment public adapter export.
- Run focused module suites plus workspace build, typecheck, lint,
  architecture/dependency, artifact/source-sidecar, deferred-scope,
  test-scope, secret/log, whitespace, and exact-path checks. Fixture/fake
  tests may establish deterministic source behavior, but real PostgreSQL or
  provider evidence must be reported only when actually observed; unavailable
  tools/environments remain `UNVERIFIED`/`BLOCKED`.
- Do not change `packages/contracts/**`, migrations/schema, any module
  `application/**`, Strategy algorithms, existing provider implementations,
  `apps/backend/**`, `infra/**`, frontend, dependencies, OpenSpec artifacts,
  requirements, ADRs, deferred scope, queues, distributed protocols, or
  general event buses. Do not resume or promote `I-01`, start `I-02`/`I-03`,
  or claim final/demo integration. If the required seam cannot be implemented
  within the listed paths without contract/schema/application changes, stop at
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and report the exact blocker.
- The Manager may move only `I-01R` through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`, and to `DONE` only when its
  bounded seam evidence passes. It must stop when I-01R is exhausted and must
  not automatically resume I-01 or start any downstream packet. One coherent
  commit attempt is allowed; if Git denies it, record the exact error and do
  not retry.

## Historical INS-107 — HOLD after INS-106 I-01 review

This signal supersedes `INS-106 / APPROVED_FOR_EXECUTION` after the
Instructor's independent review. It records the current safe checkpoint and
authorizes no implementation until the public composition/bootstrap blockers
and unavailable final-environment evidence are separately reconciled.

### Reviewed checkpoint and current state

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, with the exact audited I-01 source/checkpoint delta
  integrated at `0bab722` (`feat(backend): compose MVP runtime boundary`).
  The tracked tree is clean after that commit; the untouched app-generated
  `.codex/config.toml` remains untracked, outside Cryptox scope, and must stay
  unstaged and undeleted.
- The authoritative task board is `41 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). `I-01` remains `REVIEW`, not `DONE`; no task
  moved to `IN_PROGRESS` or `READY` under this HOLD.
- `INS-106` used exactly one fresh same-directory Manager and exactly one
  fresh sequential internal worker Volta. Both are idle/closed; no competing
  Cryptox Manager, worker, retry, replacement, duplicate, or downstream task
  is active.
- The accepted I-01 boundary is limited to `apps/backend/**` plus the two
  Manager-owned checkpoint files. No contracts, modules, migrations,
  infrastructure, frontend, dependency, generated, architecture,
  requirements, ADR, OpenSpec, or unrelated path changed. The backend
  exposes the approved Auth/capability REST and market-only WebSocket
  transport boundary with trusted server-side session identity and truthful
  readiness/failure projection.

### Independent review and blockers

- `PASS`: backend tests `15 passed / 1 skipped`; workspace tests `396 passed /
  6 environment-gated skips`; build; typecheck; lint; source-sidecar and
  artifact checks; deferred-scope; test-scope `13/13`; secret/log scan;
  whitespace; and exact changed-path review.
- `FAIL`: `arch:check` reports 71 existing dependency violations, with no
  I-01 backend path implicated. `runtime:smoke` reaches `/live=200` and
  truthful `/ready=503` but has a stale assertion for the prior three required
  dependency names; the smoke script is outside the authorized I-01 boundary.
- `BLOCKED`/`UNVERIFIED`: Docker/local PostgreSQL and real application
  persistence; configured Binance historical/realtime and CoinDesk evidence;
  manual production Backtest/SearchRun/Candidate/Experiment/Trade and
  application-generated Leaderboard composition; browser/final-demo evidence;
  and OpenSpec CLI evidence. The missing public Backtesting executor, Search
  generator, Strategy PostgreSQL, and Sentiment PostgreSQL bootstraps require
  explicit source-reconciliation authorization before any excluded module or
  bootstrap path is changed.

### Hold condition and next authorization gate

- No implementation is authorized by `INS-107`. The Manager must not start,
  promote, retry, or split any packet under this signal. `I-02` and `I-03`
  remain `BLOCKED`, and no deferred or excluded scope may be opened.
- A later Instructor review may issue a fresh bounded authorization only after
  reconciling the public module/bootstrap seams in the plan and decision ledger,
  proving disjoint write scope and dependencies, and rechecking Git,
  checkpoint consistency, and active writers. Real database/provider/browser
  evidence must remain explicitly `PASS`, `UNVERIFIED`, or `BLOCKED` according
  to actual evidence.

## Historical INS-106 — Runtime, transports and observability integration

This signal supersedes `INS-105 / HOLD` after the Instructor's fresh review
of the accepted I-01S seam. It authorizes exactly one fresh same-directory
Manager in the canonical checkout, configured as `gpt-5.6-luna` with
reasoning `max`, and exactly one fresh sequential internal worker for the sole
packet `I-01`. No I-02, I-03, extension, retry, replacement, duplicate,
worktree, or downstream execution is authorized.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `f656274` (`chore(control): hold after I-01S
  acceptance`). The tracked tree is clean at this checkpoint; the only
  working-tree item is the untouched app-generated `.codex/config.toml`,
  outside Cryptox scope, which must remain unstaged and undeleted.
- The authoritative task board is `41 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). `I-01S` is independently accepted `DONE` at
  `7d574e6`; the public `STRATEGY_FACTORIES` seam is now available through the
  Strategy package entrypoint and is proven compatible with
  `createStrategyModule`.
- I-01 start dependencies are verified `DONE`: `AU-01`, `AU-02`, `B-02`,
  `M-01`, `M-02`, `S-02`, `S-03`, `Q-01`, `N-01`, `N-02`, `F-01`, `F-AUTH`,
  and `F-02`. The prior I-01 attempt remains a historical
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` checkpoint, not a retry; this is a fresh
  resumption after the separately authorized I-01S reconciliation.
- The prior I-01 composition blocker is resolved without changing canonical
  contracts or Strategy algorithms. No competing Cryptox Manager,
  Orchestrator, worker, retry, replacement, duplicate, or downstream task is
  active. The Manager must revalidate all of these premises from Git and the
  control plane before assigning work.

### Exact Manager/worker scope

- Create exactly one fresh sequential internal worker. All bounded
  implementation work with an independent write scope must be delegated under
  `AGENTS.md`; the Manager may perform governance, review, integration glue,
  and checkpoint work only. Do not use a worktree or reuse any historical
  Manager/worker.
- The implementation boundary is `apps/backend/**`, including backend tests,
  thin REST and market-only WebSocket transport mappers, composition,
  readiness/failure projections, and a narrowly necessary example
  configuration. A single root `package-lock.json` update and matching
  `apps/backend/package.json` dependency entry are allowed only if one
  genuinely necessary market-WebSocket server runtime dependency is required;
  no other dependency expansion is allowed.
- Compose the approved public Auth and capability APIs through the backend,
  deriving trusted identity only from the server-side Auth session context.
  Preserve the frozen REST and market-WebSocket contracts and cover the
  existing Auth, market-history, Strategy, Search, Backtesting, Leaderboard,
  News, and local Sentiment surface with correct unauthenticated rejection and
  authenticated cross-owner no-leak behavior. Consume Strategy through the
  public `STRATEGY_FACTORIES` seam; do not deep-import Strategy domain plugins.
- Compose market history and realtime through the approved Binance adapters
  and narrow market-only WebSocket contract, including normalized candles,
  bounded connection/failure state, and `MARKET_OBSERVABILITY_V1`. Compose
  real configured PostgreSQL Auth/application state, the bounded local
  Backtest execution path, application-generated Leaderboard results, and a
  configured real News source with local `LEXICON_V1` sentiment. Fixtures are
  test/development inputs only and must never silently become final/demo
  runtime configuration.
- Keep readiness truthful: liveness is independent; missing required
  persistence/providers yields not-ready; provider failure remains visible;
  News/Sentiment failure does not break core market/strategy/backtest paths;
  mock-only final/demo configuration is rejected.

### Acceptance, validation, prohibitions and stop condition

- Prove the frozen backend contracts and market-only WebSocket behavior with
  Auth/session, 401 and 404 ownership, trusted-identity/spoof-resistance,
  manual Backtest, bounded SearchRun, Candidate/Experiment/Trade,
  application-generated Leaderboard, market history, News/Sentiment,
  readiness, provider-failure, and observability evidence.
- Run backend HTTP/WS integration tests; real process-local PostgreSQL Auth
  and application checks where configured; live Binance historical/realtime
  and a configured real News-source smoke; then build, typecheck, lint, full
  workspace tests, architecture/dependency, source-sidecar, artifact,
  deferred-scope, test-scope, runtime, secret/log, whitespace, and exact-diff
  gates. Every unavailable tool, provider, database, browser, or skipped test
  remains `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Do not change `packages/contracts/**`, any `modules/**` source,
  migrations/schema, `infra/**`, `apps/frontend/**`, architecture,
  requirements, ADRs, OpenSpec artifacts, or unrelated routes. Controllers
  remain thin mappers/delegators; no business logic, general event bus,
  non-market WebSocket, fake-ready status, mock fallback, Redis/BullMQ,
  distributed protocol, live trading, generalized risk, or deferred feature.
  If an essential fix requires an excluded path or contract change, stop at
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` and report the exact blocker.
- The Manager may move only `I-01` through `BLOCKED -> READY ->
  IN_PROGRESS -> REVIEW`, and to `DONE` only after all applicable scoped
  evidence passes. Make one coherent commit attempt for the authorized source
  and Manager checkpoint files; if Git denies it, record the exact error and do
  not retry. Stop when I-01 is exhausted and do not start or promote I-02,
  I-03, or any downstream packet.

## Historical INS-105 — HOLD after I-01S acceptance

This signal supersedes `INS-104 / APPROVED_FOR_EXECUTION` after the Instructor's
independent audit of the completed I-01S Manager checkpoint. `I-01S` is
accepted at `DONE`; this signal authorizes no implementation, retry,
replacement, duplicate, downstream packet, extension, or resumed I-01.

### Reviewed checkpoint and acceptance

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `7d574e6` (`feat(strategy): expose public factory
  composition seam`). The parent Instructor integrated exactly the Manager's
  audited six-path source/checkpoint delta after the Manager's one staging
  attempt was denied by the repository `.git/index.lock` permission error.
  The unrelated app-generated `.codex/config.toml` remains untouched,
  unstaged, and untracked.
- The authoritative task board is `41 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). `I-01S` completed exactly
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` under `INS-104`.
- The accepted source boundary is exactly
  `modules/strategy/application/registry.ts`,
  `modules/strategy/api/index.ts`,
  `modules/strategy/api/index.spec.ts`, and
  `modules/strategy/api/composition.spec.ts`; the Manager-owned checkpoint
  delta is in `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. No contract, plugin algorithm,
  persistence, migration, transport, backend, frontend, dependency,
  generated-artifact, or unrelated path changed.
- The Strategy-owned public factory collection reuses the approved four
  baseline registrations followed by `SMC_LITE_V1` and `WYCKOFF_LITE_V1`,
  preserves exact descriptors/profile IDs and factory identity, is immutable,
  and composes successfully through `createStrategyModule` without algorithm
  duplication or backend domain deep imports.
- Independent validation passed focused Strategy `119/119` and the complete
  workspace `verify:stage4a` run: build, typecheck, workspace tests (`389`
  passed), architecture/dependency, artifact/source-sidecar,
  deferred-scope, runtime-smoke, lint, test-scope (`13/13`), secret/log,
  whitespace, and exact-path checks. OpenSpec CLI is `UNVERIFIED`; six
  environment-gated PostgreSQL/integration/E2E tests and real provider,
  browser/demo, and final integration evidence remain `UNVERIFIED` or
  `BLOCKED`, never promoted to `PASS`.
- The `INS-104` Manager and its sole worker Mendel are idle/closed. No
  competing Cryptox Manager, Orchestrator, worker, retry, replacement,
  duplicate, or downstream execution is active.

### Current hold and next safe state

- No implementation is authorized by `INS-105`. `I-01` remains
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` until a fresh signal explicitly resumes
  it; `I-02` and `I-03` remain `BLOCKED`.
- A later Instructor review may authorize only a separately bounded fresh
  `I-01` Manager attempt after verifying that the public `STRATEGY_FACTORIES`
  seam at `7d574e6` resolves the previous composition blocker and that the
  current Git/checkpoint/DAG and active-writer preconditions still hold.

## Historical INS-104 — Strategy public composition seam reconciliation

This signal supersedes `INS-103 / APPROVED_FOR_EXECUTION` after the fresh
Instructor review of its completed Manager checkpoint. It authorizes exactly
one new source-reconciliation packet, `I-01S`, in one fresh same-directory
Manager and exactly one fresh sequential internal worker. `I-01S` is the only
authorized task. It does not authorize resumed I-01, I-02, I-03, any extension
packet, retry, replacement, duplicate, worktree, or downstream execution.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `7d686b6` (`chore(control): record INS-103 I-01
  review blocker`). The tracked tree is clean after that checkpoint commit;
  the only remaining working-tree delta is the untouched app-generated
  untracked `.codex/config.toml`, outside Cryptox scope; it must remain
  untouched, unstaged, and undeleted.
- The current operational board is `40 DONE`, `1 REVIEW` (`I-01`), and
  `2 BLOCKED` (`I-02`, `I-03`). The Manager's checkpoint records the exact
  `I-01` transition `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` and no source
  implementation. The new `I-01S` packet is now durable in `MVP_PLAN.md`; the
  Manager must add and operate its row in `TASKS.md`, the sole operational
  state authority, before execution.
- The completed Strategy packets `C-02`, `S-01`, `S-02`, `S-03`, `S-04`,
  `S-05`, and `S-06` are the verified prerequisites for this seam review.
  `I-01` remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW` until this packet is
  independently accepted and a later signal explicitly resumes it.
- The fresh `INS-103` Manager is idle/closed, its sole worker Socrates is
  complete, and no competing Cryptox Manager, Orchestrator, worker, retry, or
  duplicate is active.

### Exact Manager/worker scope

- Create exactly one fresh sequential internal worker. All bounded Strategy
  implementation work must be delegated under `AGENTS.md`; the Manager may
  perform only governance/checkpoint work and narrow review/integration glue.
- The implementation boundary is `modules/strategy/api/**` and
  `modules/strategy/application/**`, including focused tests, limited to the
  public bootstrap/barrel and the Strategy-owned registry/composition helper
  needed to expose the already approved factories. The Manager may update
  only `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md` for
  operational state and checkpoint evidence.
- Expose a typed, immutable public factory collection or equivalent helper
  using the existing `StrategyFactory` contract. It must provide the approved
  baseline registrations and the completed deterministic Lite registrations,
  preserve their exact descriptors/profile identifiers, avoid duplicate
  algorithm implementations, and be consumable by the existing
  `createStrategyModule` bootstrap through a public package entrypoint.
- Preserve the synchronous modular-monolith direction: registry ownership
  stays in Strategy, and backend consumers must not deep-import Strategy
  domain plugins. This is a composition seam for already approved behavior,
  not a new functional or UI requirement.

### Acceptance, validation, prohibitions and stop condition

- Focused public-entrypoint and composition tests must prove deterministic
  registration, exact descriptor/profile preservation, immutability, no
  duplicate algorithm source, and compatibility with the existing Strategy
  bootstrap. No REST or WebSocket contract changes are needed or authorized.
- Run focused Strategy tests, workspace tests, build, typecheck, lint,
  architecture/dependency, source-sidecar, artifact, deferred-scope,
  test-scope, runtime-smoke, secret-log, whitespace, and exact-diff checks.
  OpenSpec CLI or other unavailable checks remain `UNVERIFIED`/`BLOCKED`,
  never `PASS`.
- Do not change `modules/strategy/api/contracts.ts`, plugin algorithm files,
  persistence, migrations, REST/WebSocket contracts, Auth, Backtesting,
  Search, Evaluation, Leaderboard, News, Sentiment, backend composition,
  dependencies, frontend, architecture/requirements/ADR/OpenSpec artifacts,
  or any deferred scope. If the seam requires an excluded path or a contract
  change, stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may transition only `I-01S` through the normal operational
  states and may mark it `DONE` only with complete scoped evidence. Make one
  coherent commit attempt for the authorized source and checkpoint files; if
  Git denies it, record the exact error and do not retry. Stop when `I-01S`
  is exhausted. A later Instructor review must accept it before I-01 can be
  freshly authorized.

## Historical INS-103 — Runtime, transport and observability integration

This signal supersedes `INS-102 / HOLD` after a fresh Instructor review. It
authorizes exactly one new I-01 attempt: one fresh Manager in the canonical
same-directory checkout and one fresh sequential internal worker. I-01 is the
only authorized task; no extension packet, I-02, I-03, retry, replacement,
duplicate, worktree, or downstream execution is authorized.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `9f0841a83da6bd917185d3d692b5c9f27f07cdff`
  (`docs(control): hold after INS-101 AU-02 review`). The tracked tree is
  clean and `git diff --check` is clean. The only working-tree delta is the
  untouched app-generated untracked `.codex/config.toml`, outside Cryptox
  scope; it must remain untouched, unstaged, and undeleted.
- `TASKS.md` is authoritative at `40 DONE`, `0 REVIEW`, and `3 BLOCKED`
  (`I-01`, `I-02`, `I-03`). AU-02 is independently accepted `DONE` in
  `DEC-023`; no task is promoted by this signal before the Manager verifies
  the same state.
- I-01 start dependencies are verified `DONE`: AU-01, AU-02, B-02, M-01,
  M-02, S-02, S-03, Q-01 integration, N-01, N-02, F-01, F-AUTH, and F-02.
  The prior M-02 checkpoint contains public Binance realtime smoke evidence.
- Read-only provider preflight from this environment reached Binance public
  historical data with HTTP 200 and a two-item kline array, and reached the
  CoinDesk public RSS source with HTTP 200 and RSS items. The CoinDesk JSON
  API without an API key returned HTTP 401 and remains unavailable; no secret
  is requested or inferred. I-01 must use an actually configured real source
  and record any unavailable provider as `UNVERIFIED` or `BLOCKED`.
- No competing Cryptox Manager, Orchestrator, or worker is active. The prior
  INS-101 Manager is idle/closed and must not be reused.

### Exact Manager/worker scope

- Create exactly one fresh internal worker and run it sequentially. The
  Manager may perform governance/checkpoint work and narrow integration glue;
  all bounded implementation work with an independent write scope must be
  delegated under `AGENTS.md`.
- The implementation boundary is `apps/backend/**`, including backend tests,
  thin REST/market-WebSocket transport mappers, composition/readiness code,
  and an example configuration if needed. A single root `package-lock.json`
  update and the corresponding `apps/backend/package.json` dependency entry
  are allowed only if one narrowly necessary market-WebSocket server runtime
  dependency is genuinely required; no other dependency expansion is allowed.
- Compose the approved Auth and capability public APIs through the backend,
  derive identity only from the server-side Auth session context, and expose
  the existing frozen REST DTOs/parsers without changing contracts. The
  protected transport must cover the existing Auth, market-history, Strategy,
  Search, Backtesting, Leaderboard, and News client/API surface, with 401 for
  unauthenticated access and 404/no-leak for authenticated cross-owner access.
- Compose market history/realtime through the approved Binance adapters and
  the narrow market-only WebSocket contract, including normalized candles,
  connection/failure state, and `MARKET_OBSERVABILITY_V1`. Compose real
  PostgreSQL application/Auth state, the bounded local Backtest execution
  path, application-generated Leaderboard results, and a configured real News
  source (CoinDesk RSS is an available candidate) with local `LEXICON_V1`
  sentiment. Fixtures may remain test-only and must never silently become the
  final/demo runtime.
- Readiness and failure projections must be truthful: liveness remains
  independent, readiness does not report `ready` for missing required real
  providers or persistence, provider failures remain visible, and News /
  Sentiment failure does not break core market/strategy/backtest paths. The
  final/demo preflight must reject mock-only required configuration.

### Acceptance, validation, prohibitions and stop condition

- I-01 may become `DONE` only after the composed backend serves the frozen
  REST contracts and market-only WebSocket, passes Auth/session, 401/404
  ownership, trusted-identity/spoof-resistance, one manual Backtest, one
  bounded SearchRun, Candidate/Experiment/Trade, Leaderboard, market history,
  News/Sentiment, readiness, provider-failure, and observability evidence.
- Run backend HTTP/WS integration tests, real process-local PostgreSQL Auth
  and application checks where configured, live Binance historical/realtime
  and real News-source smoke where available, then build, typecheck, lint,
  all workspace tests, architecture/dependency, source-sidecar,
  deferred-scope, test-scope, runtime, secret-log, whitespace, and
  exact-diff gates. Every skip or unavailable tool/provider is
  `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Controllers must remain thin mappers/delegators; no business logic may be
  placed in controllers. Do not change `packages/contracts/**`, any module
  source under `modules/**`, migrations or database schema, `infra/**`,
  `apps/frontend/**`, architecture/requirements/ADR/OpenSpec artifacts, or
  any unrelated route. If an essential fix requires an excluded path, stop
  with `NEEDS_INSTRUCTOR_REVIEW` and leave I-01 at `REVIEW`/`BLOCKED`.
- Do not add a general event bus, non-market WebSocket, fake-ready status,
  mock fallback in final configuration, Redis/BullMQ/worker topology, live
  trading, deferred feature, contract drift, or frontend business logic.
- The Manager may transition only I-01 through `BLOCKED -> READY ->
  IN_PROGRESS -> REVIEW` and to `DONE` only when every gate passes. Make one
  coherent commit attempt for the authorized implementation and Manager
  checkpoint files; if Git denies it, record the exact error and do not retry.
  Stop when I-01 is exhausted and do not start or promote I-02/I-03.

## Historical INS-102 — Independent review after INS-101 AU-02 completion

This signal replaces `INS-101 / APPROVED_FOR_EXECUTION` after the Instructor's
independent review. It is a checkpoint only and authorizes no implementation,
retry, replacement, duplicate Manager/worker, or downstream packet.

### Reviewed checkpoint and acceptance

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at
  `422d47fad516f0e57930f91e3da88b22cb726183` (`fix(search): close AU-02
  ownership integration`). The commit contains exactly the five tracked paths
  produced by the INS-101 Manager: the three Search source/test paths and the
  Manager-owned `TASKS.md` and `HANDOFF.md`.
- The Instructor independently reviewed the source diff, the Search lifecycle
  regression, the real PostgreSQL integration, the ownership matrix, task
  transitions, and the Manager's exact one-commit boundary. No source,
  business-state, task-DAG, generated-artifact, or out-of-scope drift was
  found. `git diff --check` is clean.
- AU-02 is accepted as `DONE`. Its recorded transition is exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW -> DONE`. The board is now
  `40 DONE`, `0 REVIEW`, and `3 BLOCKED` (`I-01`, `I-02`, `I-03`).
- The fresh INS-101 Manager and its sole internal worker are idle/closed. No
  Cryptox Manager, Orchestrator, worker, retry, replacement, duplicate, or
  downstream packet is active.

### Independent validation

- **PASS:** Search application regression `13/13`.
- **PASS:** Real PostgreSQL Search integration `1/1`, including SearchRun
  persistence, Search -> Backtesting -> Leaderboard execution,
  `completedCandidateCount = 1`, and owner A/B isolation.
- **PASS:** Real PostgreSQL Auth integration `3/3` and backend Auth E2E `1/1`.
- **PASS:** Serial `npm run verify:stage4a`: build, typecheck, workspace tests
  (`386` passed with `6` environment-gated skips), architecture/dependency,
  source-sidecar, deferred-scope, and backend runtime smoke gates. Lint,
  test-scope check, secret-log review, exact changed-path review, and
  whitespace checks also pass.
- **UNVERIFIED:** Docker daemon/Compose and standalone `psql`; direct
  process-local Node PostgreSQL checks and application integrations were used.
- **UNVERIFIED:** OpenSpec CLI and local PDF text extraction because the host
  tools are unavailable. No requirement was inferred from either missing tool.
- The only remaining working-tree delta is the untouched app-generated
  untracked `.codex/config.toml`; it is outside Cryptox scope and must remain
  untouched, unstaged, and undeleted.

### HOLD boundary

- This `HOLD` authorizes no implementation. `I-01`, `I-02`, and `I-03` remain
  `BLOCKED`; completion of AU-02 does not automatically promote or start any
  downstream packet.
- A future authorization may review and, if all dependencies and evidence are
  still valid, authorize the next bounded packet from the repository plan.

## Historical INS-101 — AU-02 Search remediation and ownership matrix completion

This signal supersedes `INS-100 / HOLD` at `9d2d6d9` after a fresh Instructor
review. It authorizes exactly one new bounded AU-02 remediation/completion
attempt: exactly one fresh Manager and exactly one fresh internal worker. This
is an explicit new authorization after a concrete failure was identified, not
an automatic retry of `INS-099`; no duplicate, replacement, second worker,
downstream packet, or I-01/I-02/I-03 work is authorized.

### Reviewed checkpoint and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `9d2d6d9` (`docs(control): hold after INS-099 AU-02
  review`). The tracked tree has no source, business-state, or task-DAG drift.
  The only working-tree delta is the app-generated untracked
  `.codex/config.toml`; it is outside Cryptox scope and must remain untouched,
  unstaged, and undeleted.
- `TASKS.md` is authoritative at `39 DONE`, `1 REVIEW` (`AU-02`), and
  `3 BLOCKED` (`I-01`, `I-02`, `I-03`). AU-02's prior transition was exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; no other task state changes are
  part of this authorization.
- AU-02 dependencies AU-01, D-01, S-01, L-01, B-02, Q-01 real integration,
  and F-AUTH are recorded `DONE`. I-01/I-02/I-03 remain blocked and are not
  authorized. No Cryptox Manager, Orchestrator, or worker is active.
- The concrete blocker is the real Search integration at
  `modules/search/application/integration.spec.ts:377`: PostgreSQL was
  reached, but `completedCandidateCount` was `0` instead of `1`. Real Auth
  PostgreSQL integration passed `3/3`; no source/test change was made by
  `INS-099`.
- Fresh redacted process-local Node `pg` checks pass against the documented
  `cryptox_development` (`55432`) and `cryptox_test` (`55433`) databases using
  `infra/db/local.env` without exposing its password. Docker daemon/Compose
  and standalone `psql` remain `UNVERIFIED`; no elevation, install, secret
  request, credential change, or volume reset is allowed.

### Exact Manager/worker scope

- Create exactly one fresh internal worker and run it sequentially. The worker
  may diagnose and fix the concrete Search integration lifecycle defect and
  add the complete AU-02 cross-module ownership/security evidence under only
  `modules/auth/**`, `modules/strategy/**`, `modules/search/**`,
  `modules/backtesting/**`, `modules/leaderboard/**`, and
  `apps/backend/src/**`.
- Use public module APIs across boundaries. The worker must cover Strategy
  Definition/Composite Definition, SearchRun/Candidate, Experiment/Trade, and
  Leaderboard Scope/Entry, including unauthenticated rejection, cross-user
  404/no-leak, same-owner success, trusted server identity, spoof resistance,
  SearchRun-to-Candidate propagation, same-owner admission, cross-owner
  rejection, approved shared-data visibility, and sensitive-log absence.
- The Search failure must be diagnosed from the implementation; do not weaken
  assertions, merely increase a timeout, make a test pass by changing the
  expected count, or replace real PostgreSQL evidence with fixtures. Preserve
  Auth independence for pure Strategy, Backtest, Evaluation, and ranking
  calculations.
- Contracts (including `packages/contracts/**`), migrations, dependencies,
  generated artifacts, News, Market Data, frontend, unrelated backend routes,
  architecture/data-model/policy files, pure algorithms, and every other
  packet are forbidden. If an essential fix requires an excluded path, stop
  with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, may transition only AU-02 through
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW` (and `DONE` only if every gate
  passes), and must independently review the worker diff. The worker may not
  edit control files, stage, or commit.

### Acceptance, validation, and stop condition

- AU-02 may become `DONE` only when the full resource-by-resource two-user
  matrix passes and the real Auth/Search/PostgreSQL path passes, including the
  SearchRun -> Candidate -> Backtesting -> Leaderboard flow and the concrete
  candidate completion invariant. Fixture-only or isolated package evidence
  cannot close the packet.
- Run focused changed-package tests, the real Auth/Search integration where
  configured, typecheck, build, lint, architecture/dependency,
  generated-artifact, deferred-scope, test-scope, runtime, whitespace, and
  exact-diff gates. Record every result as `PASS`, `BLOCKED`, or `UNVERIFIED`;
  skipped or unavailable checks are never PASS. Docker/Compose, standalone
  `psql`, and OpenSpec CLI remain explicitly `UNVERIFIED` if unavailable.
- Make one coherent Manager staging/commit attempt for the reviewed source/
  test changes and the two Manager-owned checkpoint files. If Git denies it,
  record the exact error and do not retry. Stop when this authorization is
  exhausted; do not start, promote, retry, replace, or duplicate any other
  work.

## Historical INS-100 — HOLD after INS-099 AU-02 completion attempt

This was the Instructor checkpoint after `INS-099 / APPROVED_FOR_EXECUTION`
was exhausted and was not an active authorization. The exact Manager checkpoint
was persisted at `49ca52e` after the Manager's one staging attempt was denied;
that commit contains only the Manager-produced `TASKS.md` and `HANDOFF.md`
content and no feature implementation.

### Independent review and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox` on
  `MVP_IMPLEMENTATION`, at `49ca52e`. The tracked working tree has no source,
  business-state, or task-DAG drift. The only remaining working-tree delta is
  the app-generated untracked `.codex/config.toml`, which is outside Cryptox
  scope and remains untouched, unstaged, and undeleted.
- `TASKS.md` remains authoritative at `39 DONE`, `1 REVIEW` (`AU-02`), and
  `3 BLOCKED` (`I-01`, `I-02`, `I-03`). AU-02 recorded exactly
  `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; no other task moved.
- The fresh INS-099 Manager and sole worker Dirac are idle/closed. Independent
  task inspection found no active Cryptox Manager, Orchestrator, or worker, no
  duplicate, and no competing writer.
- The Manager's source/diff review found no changed source or test path. The
  current checkpoint therefore proves neither a new ownership implementation
  nor the complete AU-02 matrix.

### Review result and validation

- Real Auth PostgreSQL integration passed `3/3` against the documented local
  `cryptox_development` database. The redacted process-local `pg` connectivity
  checks passed for both documented database names and ports.
- Real Search integration reached PostgreSQL but failed at
  `modules/search/application/integration.spec.ts:377` because
  `completedCandidateCount` was `0` instead of `1`. This is a concrete
  `BLOCKED` result, not a PASS; no source fix or test retry was authorized.
- The complete resource-by-resource two-user A/B matrix remains
  `UNVERIFIED`, including cross-module Strategy/Composite, SearchRun/Candidate,
  Experiment/Trade, Leaderboard admission/ranking, spoof resistance, and
  shared-data visibility. Existing isolated package tests are retained as
  partial evidence only.
- Workspace build/typecheck/tests, architecture/artifact/deferred-scope and
  runtime smoke, lint, scope tests `13/13`, sensitive-log review, and diff
  checks passed (`385` tests with `6` environment-gated skips). Those skips do
  not substitute for AU-02 acceptance. Docker daemon/Compose, standalone
  `psql`, and OpenSpec CLI remain `UNVERIFIED`.
- The Manager's single staging/commit attempt failed with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock':
  Permission denied`; it did not retry. The parent persisted the exact
  Manager checkpoint once at `49ca52e`, without changing its content.

### HOLD boundary

- AU-02 is not accepted as `DONE`. No retry, replacement, duplicate, worker,
  downstream packet, or I-01/I-02/I-03 work is authorized by this HOLD.
- A future authorization may address the concrete Search integration failure
  and the missing matrix only after a fresh Instructor review verifies the
  current Git checkpoint, task DAG, environment, and safe write scope. It must
  be a new explicit signal, not an automatic continuation of INS-099.

## Historical INS-099 — AU-02 Completion Ownership Matrix

This signal superseded `INS-098 / HOLD` at `8e73cb9` and was issued
after a fresh Instructor review found that the previously blocked host database
premise has changed. It authorizes exactly one fresh Manager and exactly one
fresh internal worker for one bounded AU-02 completion attempt. This is an
explicit new authorization after verified environment recovery, not an
automatic retry; no duplicate, replacement, second worker, or downstream work
is authorized.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, at `8e73cb9` (`docs(control): hold after AU-02
  attempt`). There is no tracked source, business-state, or control-plane
  drift. The only working-tree delta is the 33-byte app-generated
  `.codex/config.toml` (`model_reasoning_summary = "auto"`), which is outside
  Cryptox scope and must remain untouched, unstaged, and undeleted.
- `TASKS.md` is authoritative at `39 DONE`, `1 REVIEW` (`AU-02`), and
  `3 BLOCKED` (`I-01`, `I-02`, `I-03`). The previous AU-02 attempt under
  `INS-097` produced no source/test changes and was closed in `REVIEW` under
  `INS-098`; no other task was changed.
- AU-02 dependencies `AU-01`, `D-01`, `S-01`, `L-01`, `B-02`, Q-01 real
  integration, and F-AUTH are recorded `DONE`. I-01, I-02, and I-03 remain
  blocked and are not authorized here.
- Read-only environment revalidation found the local containers
  `cryptox-local-postgres-dev-1` and `cryptox-local-postgres-test-1` healthy,
  with ports `55432` and `55433` open. Using the documented
  `CRYPTOX_LOCAL_POSTGRES_PASSWORD` from `infra/db/local.env` without printing
  its value, host `pg` connections and `SELECT current_database()` succeeded
  for `cryptox_development` and `cryptox_test`. This restores the documented
  application-level PostgreSQL connectivity gate. The Docker Compose plugin
  itself remains unavailable and must stay `UNVERIFIED`; no credential change,
  extraction, volume reset, install, cloud database, or secret request is
  allowed.
- No competing Cryptox Manager or worker is active. The fresh Manager must use
  the same canonical checkout, model `gpt-5.6-luna`, and reasoning `max`, with
  no worktree, alternate checkout, branch, cloud task, or historical Manager.

### Exact Manager and worker scope

- Create exactly one fresh internal worker/subagent. The worker may edit only
  cross-module AU-02 ownership/security integration tests and narrowly
  necessary owner-scoped fixes under `modules/auth/**`, `modules/strategy/**`,
  `modules/search/**`, `modules/backtesting/**`, `modules/leaderboard/**`, and
  `apps/backend/src/**`.
- Canonical contracts, `packages/contracts/**`, migrations, dependencies,
  generated artifacts, News, Market Data, frontend, unrelated backend routes,
  architecture policy, pure algorithms, and I-01/I-02/I-03 or any other
  packet are excluded. If an essential change falls outside the allowed paths,
  stop and report `NEEDS_INSTRUCTOR_REVIEW`.
- Use public module APIs at cross-module boundaries and preserve Auth
  independence for pure Strategy, Backtest, Evaluation, and ranking
  calculations. Do not add enterprise identity, tenant/RBAC, JWT/refresh
  tokens, queues/distributed infrastructure, general risk, live trading, or
  sensitive logging.
- The Manager may update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, may transition only AU-02 through the
  normal operational states (including the explicit `REVIEW → READY` reopen
  for this fresh authorization), and must review the worker diff before
  integration. No Manager-side feature implementation or control-file edit is
  permitted.

### Acceptance and validation

- Prove the complete resource-by-resource A/B matrix: unauthenticated 401;
  cross-user 404/no-leak and same-owner success for applicable read, update,
  delete, cancel, list, submit, and rank operations; trusted server-derived
  identity; client `userId`/`ownerUserId` spoof resistance; SearchRun to
  Candidate owner propagation; same-owner Leaderboard admission and
  cross-owner rejection; approved shared-data visibility; and no password,
  raw credential, cookie, session-token, token-digest, or credential logging.
- Required evidence must cover the real host PostgreSQL/Auth/Search path now
  available, not only fixtures or in-memory adapters. AU-02 may be marked
  `DONE` only when the full matrix and applicable integration evidence pass.
- Run focused tests, affected package tests, typecheck, build, lint,
  architecture/dependency, generated-artifact, deferred-scope, test-scope,
  whitespace, exact-diff, and relevant global gates. Docker Compose/OpenSpec
  CLI and any unavailable external check remain `BLOCKED`/`UNVERIFIED`.
- Do not start or promote I-01, I-02, I-03, any downstream/deferred packet, or
  any retry/replacement/duplicate. Make one coherent Manager checkpoint
  staging/commit attempt only; if Git denies it, report the exact error and do
  not retry. Stop after this authorization is exhausted.

## Historical INS-098 — HOLD after AU-02 ownership-integration attempt

This historical signal superseded `INS-097 / APPROVED_FOR_EXECUTION` at
`7febd0f`. The exact Manager checkpoint is independently audited and persisted
at `6f83d3c`. This HOLD authorizes no worker, retry, replacement, downstream
packet, or final-MVP claim.

### Reviewed checkpoint and result

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, with the tracked repository state at `6f83d3c`
  (`docs(control): record AU-02 review checkpoint`). The only current
  untracked delta is the 33-byte app-generated `.codex/config.toml`
  (`model_reasoning_summary = "auto"`); it is outside Cryptox scope and
  remains untouched, unstaged, and undeleted. No source, business-state, or
  task-DAG drift is present.
- `TASKS.md` remains the sole operational authority and records `39 DONE`,
  `1 REVIEW` (`AU-02`), and `3 BLOCKED` (`I-01`, `I-02`, `I-03`). The Manager
  correctly recorded `BLOCKED → READY → IN_PROGRESS → REVIEW` for AU-02 and
  changed no other task state.
- Fresh Manager `01a05289-9805-72a3-b811-fda8a7d89eed` used the required
  same-directory checkout and `gpt-5.6-luna / max`. Bacon
  `01a0528f-4f6b-7ee3-be7f-5787c2b40005` was the sole internal worker. The
  worker returned no changed paths, no source/test implementation, and no
  commit; no replacement, duplicate, or retry occurred. Both are now idle or
  completed, with no active Cryptox Manager/worker remaining.
- Parent Instructor audit confirms the Manager diff contains only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`, and
  the Manager's single staging/commit attempt was denied by `.git/index.lock`
  permission. The exact checkpoint was then committed once by the parent;
  there was no Manager commit retry.

### Acceptance decision and blockers

- AU-02 is **not accepted as DONE**. Existing per-module/fixture evidence
  passes, but the required complete two-user cross-module A/B matrix and
  applicable real PostgreSQL/Auth/Search integration are not proven. The
  documented host database credential failed authentication and Docker
  Compose is unavailable; these remain `BLOCKED`/`UNVERIFIED`, never PASS.
- Independent validation remains truthful: workspace build/typecheck/tests,
  architecture/artifact/deferred-scope/runtime checks, lint, scope `13/13`,
  and `git diff --check` passed; environment-gated tests and unavailable
  OpenSpec CLI remain `UNVERIFIED` or `BLOCKED`. These gates do not substitute
  for AU-02 acceptance.
- No authorization is active. I-01, I-02, and I-03 remain blocked by the
  task DAG; no downstream work may start. A future authorization requires a
  fresh Instructor review of the missing matrix and real integration gate and
  must not treat this exhausted attempt as a retry permission.

## Historical INS-097 — AU-02 Per-User Ownership Security Integration

This historical signal superseded `INS-096 / HOLD` at `389db3b` and authorized
exactly one fresh Manager and exactly one internal worker for a bounded AU-02
implementation-and-evidence attempt. It is the fresh attempt permitted by
`DEC-018`; it does not authorize I-01, I-02, I-03, any downstream packet, or an
automatic retry.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, with the reviewed repository state clean at `389db3b`
  (`docs(control): hold after M-02 closure`). The M-02 closure is independently
  persisted at `4ba6f8a`; no source, business-state, or task-DAG drift is
  present. The only current untracked delta is the 33-byte app-generated
  `.codex/config.toml` (`model_reasoning_summary = "auto"`); it is outside the
  Cryptox change, is preserved untouched, and must not be staged or deleted.
- `TASKS.md` is authoritative at `39 DONE`, `0 REVIEW`, and `4 BLOCKED`:
  `AU-02`, `I-01`, `I-02`, and `I-03`. AU-02 is the only predecessor that can
  unlock the remaining integration chain; its prior INS-021 attempt produced
  no accepted ownership matrix and correctly stopped at
  `NEEDS_HUMAN_DECISION`.
- AU-02 start dependencies `AU-01`, `D-01`, `S-01`, `L-01`, `B-02`, and the
  real Q-01 integration are `DONE`; F-AUTH is also `DONE`. I-01, I-02, and I-03
  remain blocked and are not authorized here.
- Local PostgreSQL containers `cryptox-local-postgres-dev-1` and
  `cryptox-local-postgres-test-1` were observed healthy through the Docker
  daemon and accepted read-only `pg_isready`/`psql` checks internally.
  Application access through the documented host credential in
  `infra/db/local.env` is currently `UNVERIFIED` because authentication failed;
  Docker Compose plugin access is unavailable. This is an explicit validation
  risk, not permission to change credentials, reset volumes, request secrets,
  or use a cloud database.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning `max`,
  without a worktree, alternate checkout, branch, cloud task, or duplicate.

### Exact Manager and worker scope

- Create exactly one fresh internal worker. The worker owns the single
  disjoint AU-02 implementation scope: cross-module ownership/security tests
  and narrowly necessary owner-scoped fixes only under
  `modules/auth/**`, `modules/strategy/**`, `modules/search/**`,
  `modules/backtesting/**`, `modules/leaderboard/**`, and `apps/backend/src/**`.
  Canonical contracts, migrations, dependencies, generated artifacts, News,
  Market Data, frontend, unrelated backend routes, and architecture policy are
  excluded. If a change outside this scope is necessary, stop for Instructor
  review.
- The worker must implement/prove the resource-by-resource A/B matrix:
  unauthenticated rejection; cross-user 404/no-leak for read, update, delete,
  cancel, list, submit, and rank where applicable; same-owner success; trusted
  server identity; client `userId`/`ownerUserId` spoof resistance; Search
  Candidate owner propagation; same-owner Leaderboard admission; shared-data
  visibility; and absence of password, cookie, token, digest, or credential
  logs. It must use public module boundaries and preserve pure calculations'
  Auth independence.
- The Manager may update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`, may move only AU-02 through the normal
  operational states, and must review the worker diff before integration.
  No Manager-side feature implementation is permitted. The Manager must not
  edit Instructor/decision/requirements/ADR/OpenSpec files or start/promote
  I-01, I-02, I-03, or any other packet.

### Acceptance and validation

- AU-02 may be marked `DONE` only when the complete A/B isolation matrix and
  trusted-identity evidence pass at the approved boundary, including the
  applicable PostgreSQL/Auth/Search integration. Fixture-only or in-memory
  evidence cannot close this packet.
- Run focused worker tests, affected package tests, typecheck/build/lint,
  architecture/artifact/deferred-scope/scope checks, `git diff --check`, and
  the relevant global gate. Unavailable Docker Compose, PostgreSQL application
  access, OpenSpec CLI, or other external checks must remain
  `BLOCKED`/`UNVERIFIED`, never PASS.
- The current host database credential failure may be diagnosed and recorded
  only. Do not extract credentials from container metadata, alter database
  passwords, reset volumes, install software, or broaden environment scope.
  If the required real DB gate cannot run, preserve AU-02 as `BLOCKED` or
  `REVIEW` with the exact limitation and list the remaining evidence.
- Preserve every unrelated task state, record exact changed paths/evidence and
  the worker/Manager identities, make at most one coherent Manager checkpoint
  staging/commit attempt, and stop when AU-02 is exhausted. No retry,
  replacement, duplicate, or downstream start is allowed.

## Historical INS-096 — HOLD after INS-095 M-02 evidence closure

This current signal supersedes `INS-095 / APPROVED_FOR_EXECUTION` at
`9127700`. The bounded M-02 review is complete and was independently audited
and persisted at `4ba6f8a`.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `4ba6f8a` (`docs(control): record M-02
  evidence closure`). No source or business-state drift is present.
- `TASKS.md` remains the sole operational-state authority and records `39 DONE`,
  `0 REVIEW`, and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). M-02 moved
  only from `REVIEW` to `DONE`; no downstream task was started or promoted.
- The M-02 source checkpoint remains `5160c1c`. The Manager's focused realtime
  suite, package/global gates, scope checks, and runtime smoke passed. The one
  bounded public Binance smoke connected, delivered a normalized BTCUSDT tick,
  and shut down cleanly. This closes M-02's packet boundary only; it does not
  claim final runtime, integration, or demo completion.
- The INS-095 Manager is idle. No Cryptox Manager or worker is active, and the
  temporary PDF-review render artifacts were removed without entering Git.
- `DEC-018` records the explicit user governance direction to continue the MVP
  loop autonomously. It permits the Instructor to consider one fresh bounded
  AU-02 authorization after revalidating dependencies and environment; it does
  not itself start AU-02, change requirements, relax deferred scope, or permit
  automatic retries.

### Current boundary and next review

- This HOLD authorizes nothing: no worker, AU-02, I-01, I-02, I-03, downstream
  promotion, source change, or final-demo claim.
- The next Instructor review must verify the local PostgreSQL/Auth environment,
  the AU-02 dependency chain, exact disjoint write scope, Git cleanliness, and
  absence of active Manager/worker tasks before issuing a separate signal.
  If those checks are not satisfied, preserve `NEEDS_HUMAN_DECISION` or
  `BLOCKED` honestly; do not convert fixture-only evidence into PASS.

## Historical INS-095 — M-02 Realtime Evidence Closure Review

This current signal supersedes `INS-094 / HOLD` at `8556c43` and authorizes
exactly one fresh Manager for a bounded M-02 review/evidence attempt. It is an
evidence-only authorization: no source rework is permitted, and no downstream
task may start.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `8556c43` (`docs(control): hold after F-03
  closure`). F-03 is accepted at its packet-local boundary in `b73d014`; the
  current operational board is `38 DONE`, `1 REVIEW` (`M-02`), and `4 BLOCKED`
  (`AU-02`, `I-01`, `I-02`, `I-03`).
- M-02 is the only current REVIEW task. Its existing implementation checkpoint
  is `5160c1c`; focused resilience and package evidence are recorded PASS, but
  the required real Binance realtime smoke remains `UNVERIFIED` after the
  prior bounded attempt. M-01 and F-01 dependencies are DONE; I-01 remains a
  later integration dependency.
- The source, contracts, architecture, and market-data spec require normalized
  market-only realtime delivery, bounded reconnect/gap behavior, and truthful
  real-provider final/demo evidence. Fixture evidence alone must not promote
  M-02 past its current review state.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning `max`,
  without a worktree, alternate checkout, branch, cloud task, or duplicate.

### Exact Manager-only scope

- The Manager may inspect the current M-02 source/tests and run the focused
  resilience suite, applicable package/global checks, and one bounded live
  Binance WebSocket smoke using the existing configured provider boundary.
  Public Binance access only; no secrets or credentials may be requested or
  logged.
- No source, test, contract, module, frontend, backend, migration, provider,
  configuration, dependency, or generated-file change is authorized. No worker
  is authorized because this packet has no independent write scope; the
  Manager owns review and the two control artifacts.
- The Manager may update only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. It may transition M-02 only when the
  packet-local implementation/recovery evidence and the live smoke are both
  genuinely evidenced; otherwise it must retain `REVIEW` and record
  `UNVERIFIED` or `BLOCKED` with the exact observed limitation. It must not
  convert fixture tests or a failed/absent provider connection into PASS.
- The checkpoint must preserve all other task states, record the exact live
  attempt/transcript and provider outcome, and stop before AU-02, I-01, I-02,
  I-03, or any downstream work. Make at most one coherent checkpoint
  staging/commit attempt; on Git rejection, do not retry and report the exact
  error.

## Historical INS-094 — HOLD after F-03 closure review

This current signal supersedes `INS-093 / APPROVED_FOR_EXECUTION` and grants no
execution authority. The F-03 checkpoint reconciliation was independently
audited and committed at `b73d014`.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `b73d014` (`docs(control): reconcile F-03
  checkpoint state`). The only INS-093 delta was the Manager-owned
  `TASKS.md`/`HANDOFF.md` reconciliation; no source or business-state drift
  was present.
- `TASKS.md` is now internally consistent: F-03 is `DONE` at its approved
  packet-local frontend projection boundary, and the board is `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`).
  No other task moved and no downstream packet started.
- F-03 evidence is accepted only for its local scope: focused 3/3, frontend and
  root suites/static checks recorded PASS, runtime smoke is limited, Docker/
  PostgreSQL is `BLOCKED`, and OpenSpec CLI, live providers, real feature
  transport, and browser/demo evidence remain `UNVERIFIED` or `BLOCKED`.
  Final MVP/integration/demo completion is not claimed.
- The INS-093 Manager is idle, created no worker, and made no source change.
  Its single Git attempt was denied before staging; the Instructor preserved
  and audited the exact two-file result in `b73d014` without retrying the
  Manager.

### Current boundary

- This HOLD authorizes nothing: no worker, implementation packet, M-02, AU-02,
  I-01, I-02, I-03, downstream promotion, or final-demo claim.
- The next review must independently inspect M-02's current checkpoint and
  determine whether a separate bounded review/closure authorization is safe.
  M-02 must not start merely because its state is `REVIEW`; no live-provider
  evidence may be silently promoted to PASS.

## Historical INS-093 — F-03 Checkpoint Consistency Reconciliation

This current signal supersedes `INS-092 / HOLD` at `b50f8db` and authorizes
exactly one fresh governance-only Manager. It authorizes no worker, source
implementation, retry, replacement, duplicate, downstream packet, or change
to any task other than reconciling the already-recorded F-03 checkpoint.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `b50f8db` (`docs(control): hold for F-03
  checkpoint consistency`). The audited F-03 source/test implementation remains
  committed at `6a4e86e`; the INS-091 Manager checkpoint is preserved at
  `9ed13bc`.
- The top `TASKS.md` table records F-03 as `DONE` and the board as `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). The
  current “State derivation at this checkpoint” paragraph still says F-03 is
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`. This is a control-plane inconsistency,
  not permission to start downstream work.
- The packet-local evidence and its limitations are already independently
  reviewed: focused F-03 3/3, frontend/root suites and static checks pass;
  Docker/PostgreSQL is `BLOCKED`; OpenSpec CLI, live providers, real feature
  REST/market-WebSocket composition, and browser/demo evidence remain
  `UNVERIFIED` or `BLOCKED`.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning `max`,
  without a worktree, alternate checkout, branch, cloud task, or worker.

### Exact Manager-only scope

- The Manager may read the full repository authority, INS-091 checkpoint, and
  current task DAG, then edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`.
- It must reconcile every current F-03 state statement in both files to one
  consistent result. If the approved packet-local evidence is accepted, F-03
  may remain `DONE` and all current summaries/derivation text must agree; the
  handoff must explicitly record source checkpoint `6a4e86e`, the INS-091
  Manager commit denial, and that no retry occurred. If consistency or packet
  acceptance cannot be proven, it must set/retain F-03 as `REVIEW` and report
  `NEEDS_INSTRUCTOR_REVIEW` rather than claiming closure.
- It must not edit `INSTRUCTOR.md` or `DECISIONS.md`, source/contracts/modules/
  backend/migrations/providers, requirements/ADRs/OpenSpec policy, or any
  other task state. It must not start M-02, AU-02, I-01, I-02, I-03, or any
  downstream work. No worker, retry, replacement, duplicate, or implementation
  expansion is authorized.
- It must make at most one coherent staging/commit attempt for these two files.
  If Git rejects it, it must not retry and must report the exact error, then
  stop after the checkpoint reconciliation.

## Historical INS-092 — HOLD after INS-091 checkpoint consistency review

This current signal supersedes `INS-091 / APPROVED_FOR_EXECUTION` and grants no
execution authority. The INS-091 Manager checkpoint was preserved in commit
`9ed13bc` after its single staging/commit attempt was denied by the Git
environment, but F-03 closure is not accepted yet because `TASKS.md` contains
an internal state contradiction.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, with the exact INS-091 Manager-owned delta recorded in
  `9ed13bc` (`docs(control): record INS-091 F-03 closure checkpoint`). No source
  or business-state drift was introduced by that commit.
- The top operational table records F-03 as `DONE` and the board as `38 DONE`,
  `1 REVIEW` (`M-02`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`).
  However, the current `TASKS.md` “State derivation at this checkpoint” still
  says that F-03 remains `REVIEW` and requires `NEEDS_INSTRUCTOR_REVIEW`.
  Until those duplicated statements are reconciled by the Manager, the
  operational board is inconsistent and F-03 is not accepted as DONE.
- The INS-091 focused evidence remains packet-local and valid: F-03 tests
  3/3, frontend/root suites and static checks pass, while Docker/PostgreSQL is
  `BLOCKED` and OpenSpec/live-provider/feature-transport/browser-demo evidence
  remains `UNVERIFIED` or `BLOCKED`. These limitations do not authorize final
  integration or downstream work.
- The INS-091 Manager is idle and made no source change or worker dispatch.
  Its sole commit attempt failed before staging with
  `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock':
  Permission denied`; no retry was made.

### Current boundary

- This HOLD authorizes nothing: no worker, implementation packet, F-03 retry,
  M-02, AU-02, I-01, I-02, I-03, downstream promotion, or duplicate Manager.
- A separate fresh governance-only Manager may be authorized to reconcile the
  contradictory F-03 state language in `TASKS.md` and the corresponding
  `HANDOFF.md` checkpoint to the already audited `6a4e86e` source boundary.
  That Manager must edit only those two Manager-owned files, create no worker,
  perform no source implementation, and stop after one commit attempt.

## Historical INS-091 — F-03 Packet Closure and Checkpoint Reconciliation

This current signal supersedes `INS-090 / HOLD` and authorizes exactly one fresh
Manager for a governance-only F-03 closure review. It authorizes no worker and no
source implementation: the bounded screen implementation was already audited
and committed at `6a4e86e`.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at the immediately preceding HOLD commit
  `1926142` (`docs(control): hold after F-03 review`). The F-03 source/test
  implementation is committed at `6a4e86e`; the current Manager-owned
  `TASKS.md`/`HANDOFF.md` records still describe that delta as uncommitted from
  the older starting HEAD and therefore require reconciliation.
- The board is authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and
  `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03 is `REVIEW` and its
  dependencies `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`,
  and `L-02` are `DONE`. M-02 and all blocked tasks remain outside this signal.
- No competing Cryptox Manager or worker is active. The fresh Manager must run
  in the same canonical checkout with model `gpt-5.6-luna` and reasoning
  `max`, without a worktree, alternate checkout, branch, cloud task, or worker.

### Exact Manager-only scope

- The Manager may read and independently verify the current authority, the
  committed F-03 source/test diff, the prior INS-089 evidence, and the current
  task DAG. It may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`.
- It must reconcile both files to committed source checkpoint `6a4e86e`, current
  HOLD/authorization history, exact worker and Manager identities, and the
  independently verified validation classifications. It may transition only
  F-03 from `REVIEW` to `DONE` if the approved packet boundary is fully
  evidenced; otherwise it must leave F-03 in `REVIEW` and report
  `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager must not create a worker, edit source/contracts/modules/backend/
  migrations/providers/manifests, change requirements/ADR/OpenSpec policy,
  change any other task state, update `INSTRUCTOR.md`/`DECISIONS.md`, or start
  M-02, AU-02, I-01, I-02, I-03, or any downstream work. No retry, replacement,
  duplicate, or implementation expansion is authorized.
- The Manager must preserve the distinction between packet-local PASS evidence
  and final integration evidence: Docker/PostgreSQL is `BLOCKED`; OpenSpec CLI,
  live providers, real feature REST/market-WebSocket composition, and
  browser/demo evidence are `UNVERIFIED` or `BLOCKED`, never PASS. Closure of
  F-03 does not close `CSL-R-RD-01`, final demo acceptance, I-03, I-01, AU-02,
  or I-02.
- The Manager must record the stop boundary and make at most one coherent
  checkpoint commit attempt. If Git rejects it, it must not retry and must
  report the exact error for Instructor audit. It must stop after the F-03
  reconciliation/closure decision.

## Historical INS-090 — Post-INS-089 F-03 Review HOLD

This current signal supersedes `INS-089 / APPROVED_FOR_EXECUTION`. It records the
Instructor review after the bounded F-03 screen projection run and grants no
execution authority while the Manager-owned checkpoint is reconciled.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `6a4e86e` (`feat(frontend): complete F-03
  screen projections`). The commit contains exactly the two authorized screen
  paths and the Manager-owned `TASKS.md`/`HANDOFF.md` checkpoint records.
- The fresh INS-089 Manager completed with exactly one internal Frontend worker
  (Darwin); both are inactive/closed. No competing Cryptox Manager or worker is
  active, and no retry, replacement, duplicate, worktree, branch, or downstream
  task was started.
- F-03 remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW` in the operational board until
  a fresh Manager reconciles the checkpoint to `6a4e86e` and, if the packet
  boundary is satisfied, performs the sole authorized `REVIEW -> DONE` state
  transition. The board is `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and `4
  BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`).

### Independent evidence review

- **PASS:** F-03 focused screen tests 3/3; Frontend 33/33; root tests 385 pass
  with 6 environment-gated skips; root/Frontend typecheck, build, and lint;
  architecture, artifacts, deferred-scope, scope tests 13/13, runtime smoke,
  and whitespace/diff checks.
- **BLOCKED/UNVERIFIED:** Docker/PostgreSQL validation is `BLOCKED` because
  Docker Compose is unavailable and Docker config access is denied. OpenSpec
  CLI, live Binance/News/provider traffic, real feature REST/market-WebSocket
  composition, and browser/demo evidence remain `UNVERIFIED` or `BLOCKED`.
  These limitations do not become PASS and remain integration/final-demo gates
  owned by later authorized work.
- The source review found no new transport, persistence, provider call,
  frontend business calculation, client-identity/cache bypass, hard-coded
  strategy-name branch, deferred-scope leakage, or forbidden-path change. The
  UI keeps unavailable state explicit and renders only supplied DTO/state.

### Current boundary

- This HOLD authorizes nothing: no worker, no implementation packet, no M-02,
  AU-02, I-01, I-02, I-03, no retry/replacement, and no downstream promotion.
- A separate fresh Manager may be authorized only for governance checkpoint
  reconciliation and packet-state closure against committed `6a4e86e`. That
  Manager must not create a worker or edit source. If the checkpoint is not
  internally consistent, it must leave F-03 in `REVIEW` and report
  `NEEDS_INSTRUCTOR_REVIEW`.

## Historical INS-089 — F-03 Residual Screen Projections

This current signal supersedes `INS-088 / HOLD` and authorizes exactly one
fresh Manager and exactly one internal Frontend worker to complete the
remaining screen-level portion of packet `F-03`. It is a bounded residual
execution, not a retry or replacement of the completed INS-085 worker. It
authorizes no second worker, parallel frontend writer, downstream packet,
M-02, AU-02, I-01, I-02, I-03, or unrelated source/control change.

### Reviewed authority and applicability

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at reviewed base `29464d3` (`docs(control): hold
  after checkpoint reconciliation`). The already audited market/cache source
  slice is committed at `122569c`; the reconciled Manager checkpoint is
  `43ae5d2`; the current HOLD is `INS-088` at `29464d3`.
- `TASKS.md` remains authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`),
  and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03 is
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; its dependencies `M-03`, `S-04`,
  `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`, `E-02`, and `L-02` are `DONE`.
  The residual may reopen only F-03 through `REVIEW -> READY -> IN_PROGRESS ->
  REVIEW` and may reach `DONE` only if the bounded acceptance and packet tests
  are actually complete.
- The source/business state and task DAG were reviewed against the reconciled
  checkpoint. No active Cryptox Manager or worker exists. The historical
  INS-085 Manager and Descartes worker, and the INS-087 governance Manager,
  are idle/closed and must not be reused. The fresh Manager must run in the
  same canonical directory with model `gpt-5.6-luna` and reasoning `max`, with
  no worktree or alternate checkout.
- This packet uses the already committed `FeatureWorkspaceState.authoring`,
  frozen REST DTOs, frozen market WebSocket DTOs, and existing typed clients.
  No new transport is authorized. If a required state is absent from a frozen
  DTO or not composed by the current client, the UI must say
  `not supplied/not yet composed` or unavailable and the handoff must record
  `NEEDS_INSTRUCTOR_REVIEW`; it must not fabricate state or calculate business
  results in the browser.

### Exact residual write scope

- **Allowed implementation paths:**
  `apps/frontend/src/features/screens.tsx`,
  `apps/frontend/src/features/screens.spec.tsx`, and—only when needed to
  supply deterministic development evidence for those screen tests—
  `apps/frontend/src/features/fixture-data.ts` and
  `apps/frontend/src/features/fixture-client.ts`.
- Existing classes/dependencies should be reused. `apps/frontend/src/style.css`
  may be changed only if a directly required F-03 screen projection cannot be
  rendered accessibly with the existing styles; no unrelated visual redesign
  is allowed.
- **Forbidden:** `apps/frontend/src/market/**`,
  `apps/frontend/src/components/MarketChart.tsx`, auth/cache/state/types
  outside the already committed seam, `apps/frontend/src/features/clients.ts`,
  all `modules/**`, `apps/backend/**`, `packages/contracts/**`, migrations,
  providers/infrastructure, manifests/lockfiles, OpenSpec/ADR/requirements/
  architecture/data-model policy, new fields/endpoints, persistence, browser
  Binance/News/LLM calls, hard-coded strategy-name business branches, private
  cache or client-identity bypass, live-order/risk behavior, and any deferred
  scope.

### Required screen projections and acceptance

- **Authoring and Strategy:** render the existing authoring state distinctly.
  The current frozen contracts have no draft/validation/Save/Approve transport,
  so the unavailable/disabled state must be explicit rather than simulated.
  For supplied saved definitions, render `MANUAL`, `LLM_DRAFT`, and
  `APPROVED_NEWS_ITEM` origin metadata without exposing prompts or credentials.
  Render descriptor `behaviorProfileId`, implementation version, visualization
  metadata, and parameters generically. Render composite method/profile,
  component enabled/weight metadata, and supplied weighted thresholds and
  normalization; weighted and Lite profiles must be descriptor/metadata-driven,
  never selected by strategy-name branches.
- **Search:** present the three frozen generator types `RANDOM`,
  `DOMAIN_GUIDED`, and `GENETIC`. Render supplied seeded profile, seed,
  algorithm configuration, dataset identity, code provenance, finite stop
  condition, state, candidate counts, timing, errors, and ranking. If the
  existing client cannot start a seeded request because that transport is not
  exposed, keep the unsupported action disabled or label it not yet composed;
  do not silently convert it to RANDOM or invent provenance. Preserve REST
  request/response semantics and do not generate candidates in the browser.
- **Experiments/paper:** project only supplied Experiment/Trade fields,
  including search/candidate/market/code/ranking/replay provenance, execution
  profile, initial capital, fee/slippage, opaque paper-execution provenance,
  position mode, exit reason, and visualization markers/overlays/signals.
  Clearly distinguish synthetic paper Long versus Short when supplied, show
  SL/TP/stop-policy/decimal fields only when supplied, and otherwise show
  `not supplied/not yet composed`. Include an explicit no-live-order label;
  do not calculate metrics, P&L, or execution values in the frontend.
- **News/Sentiment:** keep stories usable when sentiment is absent. Render
  extraction source/canonical URL/hash/time/retention and template id/source/
  version/status (`DRAFT`, `APPROVED`, `RETIRED`) when supplied. Render
  sentiment as explicit `AVAILABLE`, `MISSING`, or `DEGRADED` with its reason
  when the DTO supplies it, without inferring a provider result from absent
  data. Do not add arbitrary URL fetching or LLM calls.
- **Privacy and tests:** preserve trusted server identity and private-cache
  isolation. Add packet-specific screen/component regression tests covering
  the available and unavailable paths above, including no fabricated state and
  no name-based business branch. Fixture data must remain clearly fixture-only
  and cannot be cited as final real-provider/demo evidence.

### Manager/worker procedure and validation

- The fresh Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then independently
  verify this signal, `DECISIONS.md`, `TASKS.md`, `HANDOFF.md`, the F-03 packet,
  requirements, accepted ADRs, active specs, frozen contracts, and current
  frontend source. It must create exactly one internal Frontend worker with a
  disjoint scope inside the allowed feature-screen/test paths. The worker must
  not edit control files or commit; the Manager alone updates TASKS/HANDOFF.
- The Manager must review the worker path-by-path, run focused frontend tests
  including the new packet tests, frontend typecheck/build/lint, applicable
  root tests, architecture/artifact/deferred-scope/scope/whitespace checks,
  and browser/real API evidence when available. OpenSpec CLI, Docker/
  PostgreSQL, live providers, real feature transport, and browser/demo checks
  must remain `UNVERIFIED`/`BLOCKED` when unavailable, never `PASS`.
- Only F-03 may transition under this instruction. The Manager must stop when
  the residual scope is exhausted, must not start downstream work, and must
  make at most one coherent checkpoint commit attempt. If Git rejects it, it
  must not retry and must report the exact error for Instructor audit. If any
  source/business/DAG drift or forbidden contract/backend need appears, stop
  with `NEEDS_INSTRUCTOR_REVIEW` rather than expanding scope.

## Historical INS-088 — Post-INS-087 Checkpoint Reconciliation HOLD

This current signal supersedes `INS-087 / APPROVED_FOR_EXECUTION`. The
governance-only reconciliation is complete and grants no execution authority.
No Manager, worker, residual F-03 implementation, downstream packet, retry,
replacement, duplicate, or user-facing child task is currently authorized.

### Reviewed checkpoint

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at `43ae5d2` (`docs(control): reconcile F-03
  checkpoint commit`). This commit contains only the Manager-owned TASKS and
  HANDOFF reconciliation authorized by INS-087. The audited F-03 source slice
  remains committed at `122569c`, and the prior Instructor partial-review HOLD
  is `INS-086` at `376dcbc`.
- TASKS/HANDOFF now consistently record the exact nine effective frontend
  source paths plus the two Manager-owned checkpoint files, the Instructor
  audit/commit at `122569c`, no uncommitted F-03 delta, and the current
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW` outcome. The reconciliation did not change
  source, business state, task state, validation classifications, or scope.
- TASKS remains authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`), and
  `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). No downstream task was
  authorized, started, or promoted. The INS-087 Manager is complete/idle and
  no active Cryptox Manager or worker remains.
- The accepted partial source slice is limited to frozen market observability
  delivery/recovery display, private-cache revision protection, and honest
  unavailable authoring state. Frontend/global validation remains green, but
  the required F-03 screen projections and packet-specific tests are absent.
  Docker/PostgreSQL remains BLOCKED; OpenSpec CLI, live providers, real
  feature transport, and browser/demo evidence remain UNVERIFIED or BLOCKED.

### Next decision boundary

- A fresh residual F-03 authorization may be considered after this HOLD. It
  must use a fresh Manager and exactly one fresh internal worker with a
  narrower disjoint screen/test write scope, preserve frozen contracts, and
  not reopen or duplicate the already committed market slice. The residual
  may not mark F-03 DONE unless all applicable acceptance criteria and tests
  are evidenced; missing public transport must remain explicitly unavailable.
- This HOLD authorizes nothing. M-02, AU-02, I-01, I-02, and I-03 remain
  unauthorized, and no newly unlocked work may start.

## Historical INS-087 — F-03 Checkpoint Record Reconciliation

This current signal supersedes `INS-086 / HOLD` for one governance-only
reconciliation. It authorizes exactly one fresh Manager in the canonical
checkout to reconcile the stale Manager-owned `TASKS.md` and `HANDOFF.md`
records with already committed, Instructor-audited Git evidence. It authorizes
no source implementation, F-03 residual work, worker, downstream packet,
retry, replacement, duplicate, or user-facing child task.

### Reconciliation authority and boundary

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean at current control signal commit `376dcbc`
  (`docs(control): hold after partial F-03 review`). The audited F-03 source
  checkpoint is `122569c` (`feat(frontend): add market observability projection
  seams`) and is an ancestor of the current HEAD; no source/business-state
  drift is present.
- The stale record is precise: `TASKS.md` F-03 and the top `HANDOFF.md`
  checkpoint still describe the audited source/control delta as uncommitted at
  `abc868c`, although the Instructor already committed the exact 11-path delta
  at `122569c`. The current `INS-086 / HOLD` is committed at `376dcbc`.
- `TASKS.md` remains authoritative at `37 DONE`, `2 REVIEW` (`M-02`, `F-03`),
  and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03 remains
  `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; no task state may be promoted, reopened,
  or otherwise changed by this instruction.
- The completed INS-085 Manager and Descartes worker are closed. No active
  Cryptox Manager or worker competes in the canonical checkout. Create exactly
  one fresh Manager with model `gpt-5.6-luna` and reasoning `max`, same
  directory and no worktree. Because this is governance-only, no worker is
  required or permitted.

### Manager-only work

- Read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md` completely,
  then verify Git, `INSTRUCTOR.md`, `DECISIONS.md`, `TASKS.md`, `HANDOFF.md`,
  the F-03 packet, and the committed `122569c`/`376dcbc` evidence.
- Update only Manager-owned `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` so they accurately state that the exact
  nine effective frontend source paths plus `TASKS.md`/`HANDOFF.md` were
  audited and committed at `122569c`, that the current Instructor HOLD is
  `INS-086` at `376dcbc`, and that no uncommitted F-03 delta remains. Preserve
  F-03 `REVIEW / NEEDS_INSTRUCTOR_REVIEW`, all validation classifications,
  missing projection coverage, and the stop boundary. Do not change any source,
  contract, plan, requirement, ADR, OpenSpec, or Instructor decision.
- The reconciliation must retain the actual evidence: frontend 31/31, root
  383 with 6 environment-gated skips, typecheck/build/lint, architecture,
  artifacts, deferred-scope, scope 13/13, runtime health smoke, and whitespace
  PASS; Docker/PostgreSQL BLOCKED; OpenSpec CLI, live providers, real feature
  transport, and browser/demo UNVERIFIED or BLOCKED. It must not claim F-03
  DONE or final real-provider evidence.
- Make at most one coherent Manager checkpoint commit attempt. If Git rejects
  it, do not retry; return the exact error and leave the Instructor to audit
  and commit. Stop immediately after the reconciliation checkpoint; do not
  create a worker or start F-03, M-02, AU-02, I-01, I-02, or I-03.

## Historical INS-086 — Post-INS-085 F-03 Partial Review HOLD

This current signal supersedes `INS-085 / APPROVED_FOR_EXECUTION` and grants no
execution authority. The F-03 execution is exhausted at a safe review
checkpoint; no Manager, worker, downstream packet, retry, replacement, or
duplicate is currently authorized.

### Review evidence

- The canonical checkout is `D:/agy-cli-projects/AOS/Cryptox`, branch
  `MVP_IMPLEMENTATION`, clean after the Instructor-audited checkpoint commit
  `122569c` (`feat(frontend): add market observability projection seams`). The
  prior authorization commit is `abc868c`; the reviewed base was
  `1c5b1cf9c250526990c1b4bc0da0b5d9bbec403d`.
- INS-085 used exactly one fresh Manager and exactly one internal Frontend
  worker, Descartes. Both are complete/closed; no active Cryptox Manager or
  worker remains, and no retry or replacement occurred. The Manager's single
  staging/commit attempt failed with `.git/index.lock: Permission denied`; the
  Instructor independently audited and committed the exact 11-path delta.
- `TASKS.md` is authoritative and now records `37 DONE`, `2 REVIEW`
  (`M-02`, `F-03`), and `4 BLOCKED` (`AU-02`, `I-01`, `I-02`, `I-03`). F-03
  remains `REVIEW / NEEDS_INSTRUCTOR_REVIEW`; it is not DONE. No downstream
  packet was started or promoted.
- The accepted bounded source slice is frontend-only: existing frozen
  `MARKET_OBSERVABILITY_V1` delivery is consumed and rendered with pair
  filtering, an at-most-100 ephemeral tick buffer, provider/received times,
  latency, recovery labels, and restart-loss wording. The private feature
  cache revision seam prevents stale async writes after logout, and the
  absent LLM transport is represented honestly as unavailable/disabled.
- Independent validation is PASS for frontend 31/31, root 383 with 6
  environment-gated skips, root/frontend typecheck, build, lint, architecture,
  artifacts, deferred-scope, scope tests 13/13, runtime health smoke, and
  whitespace. No frozen contract, backend/module source, migration, or
  deferred-scope path changed. Docker/PostgreSQL is BLOCKED; OpenSpec CLI,
  live Binance/News/provider, real feature transport, and browser/demo
  evidence are UNVERIFIED or BLOCKED and are not treated as PASS.

### Unresolved F-03 coverage

- The restored screens do not consume the new state or provide the required
  Search `RANDOM_V1`/`DOMAIN_GUIDED_V1`/`GENETIC_V1` provenance and stop
  presentation, weighted/Lite descriptor views, synthetic paper
  Long/Short/SL-TP/fee/slippage/decimal projections, News extraction/template
  state, explicit Sentiment `AVAILABLE`/`MISSING`/`DEGRADED` reasons, or
  distinct LLM draft/validation/Save/Approve presentation.
- The frozen public contracts expose only the states they currently model and
  expose no dedicated browser-safe LLM draft transport or typed SL/TP stop
  policy fields. No agent may invent fields, endpoints, persistence, browser
  network calls, or client-side business truth. Any residual implementation
  must remain an explicitly bounded frontend projection and report absent
  state honestly.
- A future residual F-03 authorization may be considered only after this HOLD
  review and a fresh applicability check. It must use a fresh Manager and
  fresh internal worker, with a narrower disjoint screen/test write scope;
  this HOLD itself authorizes nothing. M-02, AU-02, I-01, I-02, and I-03
  remain unauthorized.

## Historical INS-085 — DEC-007 Functional-State Frontend Projections

This current signal supersedes `INS-084 / HOLD` and authorizes exactly one fresh
Manager and exactly one internal Frontend worker to execute only packet `F-03`.
It authorizes no retry, replacement, duplicate, second worker, downstream
promotion, M-02/AU-02/I-01/I-02/I-03 work, or unrelated control/source change.

### Reviewed authority and applicability

- The reviewed base is `1c5b1cf9c250526990c1b4bc0da0b5d9bbec403d`
  (`docs(control): reconcile task board evidence`) on branch
  `MVP_IMPLEMENTATION`; Git is clean, `.git/index.lock` is absent, and no
  source or business-state drift is present. The only expected delta after this
  review is this committed Instructor authorization.
- `TASKS.md` is reconciled with the current checkpoints: `37 DONE`, `1 REVIEW`
  (`M-02`), and `5 BLOCKED` (`AU-02`, `F-03`, `I-01`, `I-02`, `I-03`). F-03's
  start dependencies `M-03`, `S-04`, `S-05`, `S-06`, `Q-02`, `B-03`, `N-03`,
  `E-02`, and `L-02` are all `DONE`. F-03 is the sole packet authorized here;
  its downstream `I-03` and baseline `I-01` remain blocked and unauthorized.
- The authority chain reviewed for F-03 is `DEC-007`, `MVP_PLAN.md`,
  `TASKS.md`, `HANDOFF.md`, `docs/requirements.md`, accepted ADR-001,
  ADR-002, ADR-006, ADR-007, and ADR-009, the active frontend and related
  capability specifications, the frozen REST/WebSocket contracts, and the
  current frontend/backend source. The current frontend is fixture-first for
  private feature views and has typed remote clients; backend feature transport
  composition and final real-provider evidence remain later integration work.
- Existing public contracts already expose normalized chart data,
  `MARKET_OBSERVABILITY_V1` WebSocket messages, descriptor metadata, strategy
  authoring-origin fields, seeded Search provenance, paper-execution
  provenance, News extraction/template fields, Sentiment availability, and
  Experiment/Leaderboard provenance. These contracts are frozen for F-03.
  A required state that cannot be represented through an existing public
  contract must be reported honestly as unavailable and escalated as
  `NEEDS_INSTRUCTOR_REVIEW`; no worker may invent or expand a transport.
- No active Cryptox Manager or worker exists. The historical INS-083 Manager
  and worker are idle and must not be reused for implementation; no parallel
  frontend writer is authorized.

### Authorization

- Create exactly one fresh Orchestrator/Manager in the canonical checkout
  `D:/agy-cli-projects/AOS/Cryptox`, same directory, branch
  `MVP_IMPLEMENTATION`, with no worktree or alternate checkout. Use model
  `gpt-5.6-luna` with reasoning `max`. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then independently
  verify this signal, the reviewed base, task DAG, dependencies, active-task
  list, and clean Git before doing anything.
- The Manager must create exactly one internal Frontend worker/subagent using
  the repository-approved native mechanism. The worker must use the same
  canonical checkout, must not create a user-facing thread, branch, worktree,
  child agent, or commit, and must not edit any control-plane artifact. No
  second, replacement, retry, or duplicate worker is allowed.
- Only F-03 may move through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW ->
  DONE`. The Manager alone may update `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the worker returns scoped source, tests,
  and evidence. When F-03 is exhausted, the Manager must stop without starting
  I-03, I-01, M-02, AU-02, I-02, or any newly unlocked packet.

### Packet boundary

- **Requirement IDs:** `CSL-R-MD-03`, `CSL-R-ST-05`–`07`, `CSL-R-SE-03`,
  `CSL-R-BT-02`, `CSL-R-NW-02`, `CSL-R-RP-02`, `CSL-R-FE-01`, and
  `CSL-R-DM-01`.
- **Only writable implementation scope:** `apps/frontend/**`, excluding
  generated/build output and dependency directories. Frontend tests, fixtures,
  typed client adapters, state projections, and styling under that directory
  are allowed only when they serve F-03. Manager-only control updates remain
  limited to `TASKS.md` and `HANDOFF.md`.
- **Forbidden scope:** all module source, `apps/backend/**`,
  `packages/contracts/**`, migrations, providers, infrastructure, package
  manifests/lockfiles, OpenSpec/ADR/requirements/architecture/data-model
  policy changes, new REST/WebSocket fields, business calculations, persistence
  changes, LLM/network calls from the browser, and unrelated auth behavior.

### Acceptance criteria

- Up to four independently configurable charts use normalized market state,
  keep history-before-realtime ordering, preserve independent timeframe state,
  and render connection/recovery truthfully. The frontend consumes the existing
  market observability projection for provider event time, received time,
  latency, connection state, and the latest-tick buffer; it labels the buffer
  ephemeral, shows restart/loss honestly, and never treats it as historical or
  backtest input.
- Strategy and composite controls remain descriptor/public-contract driven. The
  UI renders weighted and Lite profile descriptors and provenance without
  name-based business branches. LLM draft, deterministic validation, failure or
  missing-configuration, and explicit Save/Approve states remain distinct; no
  draft is presented as persisted automatically, and unavailable backend state
  is not fabricated.
- Search presentation exposes the selected `RANDOM_V1`, `DOMAIN_GUIDED_V1`,
  or `GENETIC_V1` profile, finite budget/stop state, seed, algorithm
  configuration, dataset identity, code version, counts, failures, timing, and
  ranking through request/response state. It does not widen the market
  WebSocket or run generation in the client.
- Experiment/result views visibly distinguish synthetic Long versus Short
  paper execution, SL/TP and `STOP_LOSS_WINS_V1`, fee, adverse slippage,
  decimal scale/rounding, and practical replay/provenance limitations. They
  render required metrics, ranking configuration, selected-strategy overlays,
  Buy/Sell and Entry/Exit markers, and do not imply live exchange orders.
- News displays source/refresh and extraction provenance, template `DRAFT` /
  `APPROVED` review state where supplied, and keeps News usable when Sentiment
  is missing/degraded. Sentiment failure must remain visibly limited to that
  panel and must not block chart, strategy, Search, result, or leaderboard
  views.
- No private data is retained in a client cache across owner changes or logout,
  no client-supplied identity authorizes access, no frontend business rule
  replaces backend authority, and fixture-only evidence is never reported as
  final real-provider/demo evidence.

### Validation and stop conditions

- The Manager must review the worker diff path-by-path and run the focused
  frontend component/state/client/browser tests available in the environment,
  frontend typecheck/build/lint, and applicable root tests plus architecture,
  artifacts, deferred-scope, scope, and whitespace checks. Browser and real API
  evidence are required when available; fixture-only evidence remains limited
  and final-mode real-provider evidence is `UNVERIFIED` or `BLOCKED` when the
  integrated runtime/environment is unavailable.
- If the current frozen contracts do not carry a required F-03 state, if a
  backend/module/contract/schema change is needed, if scope or task-DAG drift
  appears, or if any active competing Manager/worker is found, stop safely and
  report `NEEDS_INSTRUCTOR_REVIEW` without widening scope. Unavailable tools,
  PostgreSQL/Docker, OpenSpec CLI, live providers, and browser/demo checks must
  be recorded as `UNVERIFIED` or `BLOCKED`, never `PASS`.
- The Manager must record the exact Instruction ID, worker, state transitions,
  changed paths, evidence, limitations, and newly ready/remaining blocked
  tasks in `HANDOFF.md`/`TASKS.md`, make at most one coherent commit attempt for
  the completed bounded checkpoint, and stop when F-03 is done or blocked. No
  downstream work starts under INS-085.

## Historical INS-084 — Post-L-02 Independent Audit HOLD

- Branch is `MVP_IMPLEMENTATION`; the reviewed source/control checkpoint is
  `32ed9321f9f22f858fdd2458351b531e8807db7d` (`feat(leaderboard): reconcile
  provenance-aware ranking`), whose parent is the INS-083 authorization commit
  `a201afe001b22bab8bc018f73ca5bb3485a424dc`. The working tree is clean after
  the parent Instructor independently audited and committed the exact twelve
  path L-02 delta following the Manager's single denied staging attempt.
- `TASKS.md` is internally reconciled and records `37 DONE`, `1 REVIEW`
  (`M-02`), and `5 BLOCKED` (`AU-02`, `F-03`, `I-01`, `I-02`, `I-03`). L-02
  alone moved under INS-083 through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW
  -> DONE`; no downstream packet was promoted or started.
- L-02 source scope was limited to Leaderboard. The frozen
  `modules/leaderboard/api/contracts.ts` hash remains
  `702130a2c2469024668f77493f832993d005d916`; no migration, dependency, other
  module, frontend, backend-composition, or deferred-scope file entered the
  checkpoint. The Manager and exactly one internal worker are idle; no active
  Cryptox Manager or worker remains.
- Independent evidence is PASS for the Leaderboard suite (`22/22`), root
  tests, workspace typecheck/build/lint, architecture, artifacts,
  deferred-scope, 13-test scope suite, runtime smoke, exact-scope review, and
  `git diff --check`. Docker/Compose PostgreSQL validation is BLOCKED on this
  host; OpenSpec CLI, live Binance/News, browser/demo, and final cross-module
  runtime evidence remain UNVERIFIED. These limitations do not become PASS by
  fixture or fake-pool coverage.
- L-02 explicitly records that Leaderboard retains Experiment and
  ranking-configuration references and reads the frozen optional extension
  provenance without duplicating upstream strategy/Search/Backtesting storage
  or claiming exact replay. PostgreSQL's existing delete-on-eviction schema has
  no tombstone; that persistence limitation is outside the exhausted L-02
  authorization and is documented in `HANDOFF.md`.

### HOLD conditions and next review

- The next nominal technical frontier is `F-03`, whose start dependencies are
  now satisfied according to `MVP_PLAN.md` and `TASKS.md`. It remains BLOCKED
  until this Instructor reviews the exact frontend packet, current REST/public
  contracts, backend-derived projection boundaries, and safe write scope, then
  issues a separate `INS-* / APPROVED_FOR_EXECUTION`.
- `M-02` remains `REVIEW/UNVERIFIED`; `AU-02` remains blocked pending its
  required human decision; `I-01`, `I-02`, and `I-03` remain blocked. No new
  Manager, worker, or parallel packet may be created while this HOLD is current.
- Before any next authorization, re-check clean Git/source-business state,
  active-task status, the current task DAG, the F-03 authority chain, and the
  unavailable evidence above. The next authorized Manager must use
  `gpt-5.6-luna` with reasoning `max`, same-directory canonical checkout, and
  internal subagents only for its bounded worker delegation.

## Historical INS-083 — Extension-Aware Ranking and Provenance Admission

This historical signal superseded `INS-082 / HOLD` and authorized exactly one fresh
Manager to execute and close only packet `L-02`. It authorizes no other packet,
worker thread, retry, replacement, duplicate, downstream promotion, or
unrelated control/source change.

### Reviewed checkpoint and applicability

- Reviewed base: `ebb890df75f8d081aa5e15c1532fe0d626a51671` (`docs(control):
  hold after E-02 audit`) on branch `MVP_IMPLEMENTATION`; the working tree was
  clean before this authorization and no source/business-state drift was found.
- The operational board is `36 DONE`, `1 REVIEW` (`M-02`), and `6 BLOCKED`
  (`AU-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`). `C-02`, `Q-02`, `B-03`,
  `E-02`, and completed legacy `L-01` are DONE and satisfy L-02's documented
  start dependencies. `F-03`, baseline `I-01`, and `I-03` are integration
  dependencies and must remain blocked.
- `MVP_PLAN.md` defines L-02 as the E2 extension-aware Leaderboard join with
  requirements `CSL-R-LB-01`, `CSL-R-SE-03`, `CSL-R-BT-02`, `CSL-R-RP-02`,
  `CSL-R-OB-01`, and `CSL-R-OW-01`. It requires finite successfully evaluated
  same-owner admission, deterministic Top-K/ties/idempotency, and traceable
  discovery/paper/definition/metric/ranking provenance without mutation or
  cross-user leakage.
- The public Leaderboard contract in `modules/leaderboard/api/contracts.ts`
  and the additive C-02 `RankableExperiment.extensionProvenance` shape are
  frozen for this packet. L-02 must work through those existing public
  boundaries; it may not edit canonical contracts, migrations, or other module
  source. If the approved behavior cannot be proven without a contract/schema
  expansion, the Manager must stop with `NEEDS_INSTRUCTOR_REVIEW` rather than
  widening this authorization.
- Active-task inspection found no active Cryptox Manager or worker. No historical
  Manager or worker will be resumed, retried, replaced, or reused.

### Authorization

- Create exactly one fresh Orchestrator/Manager in the same canonical checkout
  `D:\agy-cli-projects\AOS\Cryptox`, on branch `MVP_IMPLEMENTATION`, with no
  worktree or alternate branch, using model `gpt-5.6-luna` and reasoning
  `max`. Do not reuse a historical Manager and do not create a duplicate.
- The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify the
  current signal, reviewed base, branch/status, task DAG, dependencies,
  checkpoint, and active-task list before acting. If any material premise has
  changed, it must stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may create exactly one internal Leaderboard worker/subagent using
  the repository-approved internal subagent mechanism. It must not create a
  user-facing worker task, worktree worker, second worker, retry, replacement,
  or duplicate. The Manager must stop when this authorization is exhausted.
- The authorized packet is **L-02 — Extension-Aware Ranking and Provenance
  Admission** only. The Manager alone may transition L-02 through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` and may update
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  Workers must not edit those files or any Instructor/decision artifact.
- Authorized source/write scope is limited to `modules/leaderboard/**`,
  excluding `modules/leaderboard/api/contracts.ts`, migrations, other modules,
  frontend, dependencies, and backend composition. Focused Leaderboard tests,
  module documentation, and module-owned adapters are allowed only when needed
  to prove this packet. No canonical contract or schema expansion is authorized.

### Required behavior and acceptance

- Admit only `SUCCEEDED` Experiments with finite required Evaluation metrics,
  and preserve trusted owner-scoped scope/entry/search-run reads and mutations.
  Unauthenticated access must reject; cross-user guessed identifiers and
  client-supplied identity fields must not read or mutate private data.
- Preserve `LINEAR_REQUIRED_V1` scoring, configurable positive K, deterministic
  Top-K ordering and ties, duplicate/idempotent submission behavior, and
  rejection of incomplete, failed, invalid, or non-finite results. Do not mutate
  historical Experiments or Evaluation data and do not add risk, live-trading,
  queue, or generalized score scope.
- Make the existing extension provenance traceable through the public
  Leaderboard/Experiment boundary: strategy or composite version, Search
  profile/seed/configuration/dataset/code where supplied by the approved
  projection, paper execution/decimal profile, finite Evaluation metrics, and
  ranking-configuration identity. Preserve provenance as read-only; do not
  fabricate unavailable replay evidence or duplicate another module's storage.
  Any persistence limitation must be explicit in the Manager checkpoint.
- Keep module ownership and dependency direction intact. Leaderboard may consume
  only public ports/projections; it must not deep-import Strategy, Search,
  Backtesting, or Evaluation internals, edit their contracts, recompute metrics,
  simulate trades, or change migrations.

### Validation and stop condition

- The Manager must independently review the one worker's diff and evidence,
  including Leaderboard domain/application, public-boundary, owner-isolation,
  provenance, idempotency, deterministic ranking, and persistence-adapter tests.
- Run the relevant root workspace tests and gates: architecture, artifacts,
  deferred-scope, scope tests, typecheck, build, lint, and `git diff --check`.
  Record unavailable OpenSpec CLI, PostgreSQL/Docker, live-provider,
  browser/demo, or other environment evidence as `UNVERIFIED` or `BLOCKED`,
  never `PASS`.
- Verify the exact module-only write scope, frozen contract/schema, no
  deferred-scope leakage, no source/business-state drift, and TASKS/HANDOFF
  consistency before accepting. A missing provenance boundary, scope breach,
  unexpected contract/schema change, or failed check requires `REVIEW`/`BLOCKED`
  and Instructor review rather than broadening the packet.
- Record `INS-083` and the reviewed base in the checkpoint, attempt at most one
  coherent Manager checkpoint commit, report any permission failure truthfully,
  and stop. Do not start F-03, I-03, I-01, I-02, M-02, AU-02, or any other
  downstream/deferred work.

### Concurrency rationale

- No safe second implementation packet is available under this signal. F-03 and
  I-03 depend on L-02, baseline I-01/AU-02 remain gated, and the `M-02`
  `REVIEW/UNVERIFIED` closure shares the same canonical control plane. One
  internal Leaderboard worker is therefore the maximum quality-preserving
  concurrency for INS-083.

### Historical INS-081 authorization (exhausted)

- Create exactly one fresh Orchestrator/Manager in the same canonical checkout
  `D:\agy-cli-projects\AOS\Cryptox`, on branch `MVP_IMPLEMENTATION`, with no
  worktree or alternate branch, using model `gpt-5.6-luna` and reasoning
  `max`. Do not reuse a historical Manager and do not create a duplicate.
- The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify the
  current signal, reviewed base, branch/status, task DAG, dependencies,
  checkpoint, and active-task list before acting. If any material premise has
  changed, it must stop with `NEEDS_INSTRUCTOR_REVIEW`.
- The Manager may create exactly one internal Evaluation worker/subagent using
  the repository-approved internal subagent mechanism. It must not create a
  user-facing worker task, worktree worker, second worker, retry, replacement,
  or duplicate. The Manager must stop when this authorization is exhausted.
- The authorized packet is **E-02 — Extension Evaluation and Decimal-Boundary
  Reconciliation** only. The Manager alone may transition E-02 through
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` and may update
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`.
  Workers must not edit those files or any Instructor/decision artifact.
- Authorized source/write scope is limited to
  `modules/evaluation/**`, excluding frozen
  `modules/evaluation/api/contracts.ts`, and focused Evaluation tests or
  module documentation required to prove the packet. API bootstrap/index,
  application, and domain files are allowed only when needed for the approved
  public Evaluation boundary. No other module or root source may change.

### Historical INS-081 acceptance

- Consume the completed decimal-normalized paper result produced by B-03
  through the public Evaluation boundary. Preserve independence from Strategy
  and Backtesting implementation details.
- Prove deterministic, finite `REQUIRED_METRICS_V1` outputs: Return, Win Rate,
  Maximum Drawdown, and Number of Trades, including decimal/fixed-point fixture
  cases, zero trades, flat/zero equity curves, and valid Long/Short paper
  results.
- Do not recompute fills, fees, slippage, rounding, entry/exit behavior, or
  simulation inside Evaluation. Do not introduce optional metrics, risk,
  ranking/score, persistence, queues, providers, or business logic outside
  this packet.
- Reject invalid, sparse, non-finite, non-positive-denominator, or otherwise
  malformed input deterministically without emitting ranking output; preserve
  input immutability and explicit finite-output guarantees.
- Keep the frozen API contract and module ownership boundaries intact. Do not
  edit migrations, dependencies, Strategy, Backtesting, Leaderboard,
  frontend, backend composition, provider code, or any deferred scope.

### Historical INS-081 validation

- The Manager must review the one worker's diff and evidence independently,
  including focused Evaluation decimal-boundary tests and the complete
  Evaluation package suite, typecheck, build, and lint.
- Run the relevant root workspace tests and gates: architecture, artifacts,
  deferred-scope, scope tests, typecheck, build, lint, and `git diff --check`.
  Record unavailable OpenSpec CLI, live-provider, PostgreSQL, browser/demo, or
  other environment evidence as `UNVERIFIED` or `BLOCKED`, never `PASS`.
- Verify exact write scope, no deferred-scope leakage, no source/business-state
  drift, and consistency of TASKS/HANDOFF before accepting. A failed check,
  scope breach, unexpected contract change, or missing decimal-boundary proof
  requires `REVIEW`/`BLOCKED` and Instructor review rather than broadening the
  packet.
- Record `INS-081` and the reviewed base in the checkpoint, attempt at most
  one coherent Manager checkpoint commit, report any permission failure
  truthfully, and stop. Do not start L-02, F-03, I-03, M-02, AU-02, I-01,
  I-02, or any other downstream/deferred work.

### Historical INS-081 concurrency rationale

- No safe second implementation packet is available under this signal: L-02
  is a critical downstream join that depends on E-02, while F-03/I-03 and the
  baseline integration packets are gated by additional dependencies. One
  internal worker is therefore the maximum quality-preserving concurrency for
  INS-081.

## INS-079 — Reconcile the committed INS-077 checkpoint

This current signal supersedes `INS-078 / HOLD` and authorizes exactly one
fresh Manager for a control-plane-only reconciliation. It authorizes no worker,
feature implementation, retry, replacement, duplicate, downstream promotion,
or task-state transition.

### Reviewed checkpoint and exact authority

- Branch: `MVP_IMPLEMENTATION`; reviewed base is
  `2c69732ec2ed92be7084ca59175b49c48963cc71` (`docs(control): hold after
  INS-077 audit`). The working tree is clean, and active-task inspection found
  no Cryptox Manager or worker.
- The S-04 source and Manager-owned checkpoint delta were independently
  accepted and committed at `01db873`. The Manager's one staging/commit denial
  remains historical evidence and must not be rewritten as a successful
  Manager commit.
- `TASKS.md` and the top `HANDOFF.md` checkpoint still describe the accepted
  S-04 source/control changes as uncommitted at `3184d7a`. This is a stale
  checkpoint statement, not a source or business-state change, and must be
  reconciled before any new implementation authorization.
- Current operational states must remain unchanged: `35 DONE`, `1 REVIEW`
  (`M-02`), and `7 BLOCKED` (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`,
  `I-03`). `TASKS.md` remains the sole task-state authority.

### Exact Manager authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal
  and base from Git, inspect TASKS/HANDOFF consistency and active tasks, and
  stop if any material source/business/DAG drift is found.
- This authorization is Manager-owned governance reconciliation only. Create
  no worker or subagent; do not use a user-facing thread for a worker, and do
  not create a branch or worktree.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. It may update the current S-04 latest
  commit/checkpoint references from “uncommitted at `3184d7a`” to the accepted
  `01db873` checkpoint and preserve the historical staging denial. It must not
  change any task state, dependency, validation claim, source, contract,
  migration, dependency, frontend, backend, OpenSpec, ADR, or other file.

### Acceptance, validation, and stop condition

- Reconcile only the stale S-04 commit/checkpoint language, preserve all other
  task rows and historical evidence, and ensure the top HANDOFF and S-04 row
  agree with `01db873`.
- Verify the exact two-file diff, `git diff --check`, and applicable control
  consistency checks. Unavailable checks remain `UNVERIFIED`/`BLOCKED`, never
  `PASS`.
- Attempt exactly one coherent Manager checkpoint commit. If Git staging or
  commit is denied, report the exact error once and do not retry; the parent
  Instructor may independently audit/commit the exact control delta.
- After that attempt and report, stop immediately. No packet or downstream
  work is authorized by INS-079, including `M-02`, `E-02`, `L-02`, `F-03`,
  `AU-02`, `I-01`, `I-02`, or `I-03`.

## INS-078 — Post-INS-077 independent audit HOLD

This current signal supersedes `INS-077 / APPROVED_FOR_EXECUTION`. The
authorized S-04 implementation is accepted at its bounded packet boundary and
the control plane is now held pending the next Instructor frontier review. It
authorizes no Manager, worker, retry, replacement, duplicate, downstream
promotion, or other task-state transition.

### Verified checkpoint and acceptance

- Branch: `MVP_IMPLEMENTATION`; the reviewed S-04 source/control checkpoint is
  committed at `01db873` (`feat(strategy): implement controlled LLM authoring`)
  on top of `3184d7a` (`INS-077 / APPROVED_FOR_EXECUTION`). The working tree is
  clean after the parent Instructor committed the exact Manager-reported delta
  that Git refused to stage for the Manager.
- Manager `01a050e8-b340-7df1-8724-0e52e00f234d` used exactly one internal
  Strategy worker, Helmholtz `01a050f1-73b9-7c51-975b-19d6247ef96d`, in the
  canonical same-directory checkout. No competing Cryptox Manager/worker is
  active; the Manager was archived after completion. No downstream packet was
  started.
- Only `S-04` moved through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW ->
  DONE`. The current board is `35 DONE`, `1 REVIEW` (`M-02`), and `7 BLOCKED`
  (`AU-02`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`, `I-03`).
- The exact source delta is limited to the eight authorized Strategy
  API/application/infrastructure source/test paths; the Manager-owned control
  delta is limited to `TASKS.md` and `HANDOFF.md`. Frozen contracts/ports,
  News, migrations, dependencies, frontend, backend composition, domain/plugin
  code, and unrelated files are unchanged.
- Independent validation PASS: Strategy `15` test files / `116` tests, root
  workspace tests, root build/typecheck/lint, architecture, artifacts,
  deferred-scope, `test:scope-check` `13/13`, and `git diff --check`.
  Environment-gated tests remain skips, not passes.
- Truthful limitations remain: OpenSpec CLI is unavailable (`UNVERIFIED`),
  live configured provider and browser/demo evidence are `UNVERIFIED`, and
  Docker/PostgreSQL validation is `BLOCKED`/`UNVERIFIED` because this host
  lacks usable `docker compose` access. No fixture or skipped test is promoted
  to live evidence.

### HOLD conditions and next review

- Re-read the current `MVP_PLAN.md`, `TASKS.md`, `HANDOFF.md`, requirements,
  accepted ADRs, architecture, data model, active capability/change specs, and
  the source/tests for the selected frontier before any new signal.
- Verify Git cleanliness, the absence of active Manager/worker tasks, current
  dependency satisfaction, and a disjoint write scope. Do not infer authority
  from a `READY` row or from S-04 completion.
- The next review may consider `E-02` because its recorded start dependencies
  (`C-02`, `B-03`, `E-01`) are `DONE`; it must not be treated as authorized by
  this HOLD. `L-02`, `F-03`, `I-01`, `I-02`, `I-03`, `AU-02`, and the
  `M-02` review state remain separately gated.
- Any next implementation authorization must name its packet, requirement IDs,
  exact write scope, acceptance criteria, validation, dependencies,
  prohibitions, and stop condition. A fresh same-directory Manager must use
  `gpt-5.6-luna` with `max` reasoning and internal subagents only; no
  user-facing `create_thread` dispatch is permitted for workers.

## INS-077 — S-04 controlled LLM authoring

This current signal supersedes `INS-076 / HOLD` and authorizes exactly one
bounded `S-04` implementation. It authorizes no other packet, retry,
replacement, duplicate, or downstream promotion.

### Reviewed checkpoint and authority

- Branch: `MVP_IMPLEMENTATION`; reviewed base is
  `723d1700bd39c4417cbfe13ca6a56bdb8a4ce378` (`docs(control): hold after
  INS-075 audit`). The working tree was clean at review and no Cryptox Manager
  or worker was active.
- The authority chain agrees: `DEC-007`, `ADR-009`, the approved
  `CSL-R-ST-05`/`CSL-R-RP-02` requirements and safe-content join
  `CSL-R-NW-02`, `openspec/specs/strategy/spec.md`, and the `S-04` packet in
  `MVP_PLAN.md`/`TASKS.md` define the same controlled authoring boundary.
- Start dependencies are verified from `TASKS.md`: `C-02`, `S-01`, and the
  URL-origin prerequisite `N-03`/`N-03A` are `DONE`. `S-05`, `S-06`, `Q-02`,
  `B-03`, and `M-03` are also `DONE`. `F-03`, `AU-02`, and `I-03` are
  integration dependencies only and remain blocked; they are not authorized by
  this signal.
- The operational board remains `34 DONE`, `1 REVIEW` (`M-02`), and
  `8 BLOCKED`. `TASKS.md` remains the sole operational-state authority.

### Exact Manager and worker authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, verify this signal
  and base checkpoint from Git, check the DAG/dependencies and active-task list,
  and stop if any material premise or source/business state drifted.
- The Manager may create exactly one fresh Strategy application worker for
  `S-04`, with a disjoint source write scope. No second worker, retry,
  replacement, worktree, branch, or duplicate Manager is allowed.
- The Manager alone may update `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`; the worker must not edit any control-plane
  artifact. The Manager must stop after the S-04 review/checkpoint.

### Packet, requirements, and exact write scope

- Packet: `S-04 — Controlled LLM_AUTHORING_V1 Strategy Drafts`.
- Requirement IDs: `CSL-R-ST-05`, `CSL-R-RP-02`, and the safe imported-content
  join in `CSL-R-NW-02`.
- Allowed implementation scope: `modules/strategy/api/**` excluding
  `contracts.ts` and contract-only tests; `modules/strategy/application/**`
  for authoring implementation/repositories excluding the canonical
  `ports.ts`; `modules/strategy/infrastructure/**` for the provider adapter;
  and focused Strategy authoring tests. Existing frozen contracts may be read
  and consumed but not changed.
- Forbidden scope: `modules/strategy/api/contracts.ts`,
  `modules/strategy/application/ports.ts`, canonical REST contracts,
  `modules/strategy/domain/**`, `modules/news/**`, direct URL fetching or News
  persistence, migrations, dependencies, frontend, backend composition,
  credentials/secrets, queues/distributed execution, automatic approval, and
  every unrelated source or control-plane file.

### Acceptance, validation, and stop condition

- Implement a provider-neutral, configured OpenAI-compatible demo adapter that
  makes at most one request per prompt or approved-News-item submission, has a
  hard 45-second timeout, performs no retry/queue behavior, and never exposes
  or persists provider secrets, raw prompts, or raw completions.
- Produce a structured draft only; deterministic schema/domain validation must
  precede any persistence. Missing configuration, timeout, provider failure,
  malformed draft, rejected validation, and rejected approval must have no
  persistence side effect.
- Require an explicit authenticated Save/Approve action to create exactly one
  immutable owner-scoped Strategy Definition version with safe authoring origin
  metadata. Cross-user reads/mutations must have the approved not-found
  behavior. An URL-origin submission may use only the existing safe News public
  boundary and approved News item; Strategy must never fetch the URL directly.
- Add focused unit/contract/owner-approval/no-write/timeout/provenance tests,
  then run applicable Strategy tests and package typecheck/build/lint plus
  repository scope, architecture, artifact, deferred-scope, and diff checks.
  Configured real-provider or PostgreSQL/browser evidence is recorded as
  `PASS` only when actually run; unavailable evidence remains `UNVERIFIED` or
  `BLOCKED`, never inherited from fixtures or skipped tests.
- Move only `S-04` through the normal operational sequence
  `BLOCKED -> READY -> IN_PROGRESS -> REVIEW -> DONE` when evidence warrants
  it. Do not start or promote `F-03`, `AU-02`, `I-01`, `I-02`, `I-03`, `E-02`,
  `L-02`, `M-02`, or any other packet. After one Manager checkpoint commit
  attempt and report, stop for independent Instructor review.

## Historical INS-076 — Post-INS-075 independent audit hold

This historical signal recorded the independent Instructor review after `INS-075`.
It authorizes no Manager, worker, implementation, retry, replacement, closure
review, downstream promotion, or other task-state transition.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`; the reviewed HEAD is
  `19164a65d89b51215f031dd99619726f34271353` (`docs(control): reconcile
  INS-073 checkpoint`). The working tree was clean before this signal, and no
  competing Cryptox Manager or worker was active.
- `INS-075` completed its control-only authorization. Its Manager changed only
  `docs/implementation/TASKS.md` and `docs/implementation/HANDOFF.md`;
  independent review confirmed the diff and `git diff --check`. The Manager's
  own staging failure remains recorded as historical evidence; the parent
  Instructor persisted the reviewed control delta at `19164a6` after the
  environment denied the Manager's Git staging attempt.
- `TASKS.md` remains the sole operational-state authority: 43 rows total,
  `34 DONE`, `1 REVIEW` (`M-02`), and `8 BLOCKED` (`AU-02`, `S-04`, `E-02`,
  `L-02`, `F-03`, `I-01`, `I-02`, `I-03`). `N-03A` and its existing `N-03`
  closure are `DONE` and point to the integrated News checkpoint
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
- The `MVP_PLAN.md` DAG still requires the remaining E1/E2/E3 work and the
  baseline/security gates before `I-03` and final `I-02`. `AU-02` retains its
  `NEEDS_HUMAN_DECISION` boundary, and no unavailable PostgreSQL, real-provider,
  browser/demo, OpenSpec CLI, or link/DAG evidence is promoted to `PASS`.

### HOLD conditions and next review

- Keep the repository at this safe checkpoint. Do not infer authorization from
  any `READY` row or from the fact that `N-03`/`N-03A` are now `DONE`.
- The next Instructor review must re-read the current `MVP_PLAN.md`,
  `TASKS.md`, `HANDOFF.md`, requirements, accepted ADRs, architecture, data
  model, active specs, and the source/tests for a selected frontier. It must
  verify Git cleanliness, the absence of active Manager/worker tasks, current
  dependencies, and a disjoint write scope before issuing a new signal.
- Any future implementation authorization must name its packet, requirement
  IDs, exact write scope, acceptance evidence, validation, dependencies,
  prohibitions, and stop condition. A fresh same-directory Manager must use
  `gpt-5.6-luna` with `max` reasoning, and any independent implementation must
  be delegated to an authorized worker.

## Historical INS-075 — Reconcile the audited INS-073 checkpoint

This historical signal superseded `INS-074 / HOLD` and authorized exactly one
fresh Manager for a control-plane-only reconciliation. It does not authorize a
worker, feature implementation, retry, replacement, duplicate, or downstream
start.

### Reviewed checkpoint and reason for reconciliation

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base: `6727122` (`docs(control): hold after N-03A audit`); the
  working tree was clean at that checkpoint and no Cryptox Manager or worker
  was active.
- The independently reviewed N-03A source and tests, together with the
  Manager-owned task/checkpoint changes, are integrated at
  `f320b5f1d7731d121db27e788cffa4a8033dc7fd` (`feat(news): complete N-03A
  refresh scheduler`). The latest `HANDOFF.md` was written before that narrow
  integration and therefore still says the reviewed worker paths remain
  uncommitted. That statement must be reconciled by the Manager who owns the
  handoff artifact.
- Current task facts to preserve: `N-03A=DONE`, `N-03=DONE`, `M-02` is
  `REVIEW/UNVERIFIED`, and `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, and `I-03` are `BLOCKED`. No other task state may change.

### Exact Manager authorization

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `max` reasoning. The Manager must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, recover the current
  signal from Git, and verify the reviewed base, actual integration commit,
  task board, handoff, and absence of competing active tasks.
- This is Manager-owned governance reconciliation; no worker or subagent is
  authorized or needed. Do not create any worker, retry, replacement, branch,
  worktree, or duplicate task.
- **Exact write scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. The Manager must not edit
  `INSTRUCTOR.md`, `DECISIONS.md`, `MVP_PLAN.md`, requirements, ADRs,
  architecture, data model, OpenSpec artifacts, source, tests, migrations,
  dependencies, frontend, backend composition, providers, or infrastructure.

### Acceptance and validation

- Reconcile the N-03A row and the latest INS-073 checkpoint so they identify
  the actual integrated checkpoint `f320b5f` and no longer claim the reviewed
  worker paths are uncommitted. Preserve the recorded Manager staging failure
  as historical evidence; do not rewrite it as a successful Manager commit.
- Preserve the exact `N-03A` and `N-03` `DONE` states and every unrelated task
  state, dependency, and stop boundary. Do not promote or start any other
  packet.
- Verify the final control-only diff contains no path outside the two allowed
  files, run `git diff --check` and applicable control-plane consistency checks,
  and record any unavailable check as `UNVERIFIED`/`BLOCKED`, never `PASS`.
- Attempt exactly one coherent Manager checkpoint commit containing only
  `TASKS.md` and `HANDOFF.md`. If Git staging/commit is denied, report the
  exact error once and do not retry; the parent Instructor will independently
  audit any remaining control delta.

### Stop condition

After the reconciliation and one commit attempt, stop immediately. This
signal authorizes no `M-02`, `S-04`, `E-02`, `L-02`, `F-03`, `AU-02`, `I-01`,
`I-02`, `I-03`, or any other implementation/closure packet. The next step is
an independent Instructor audit and a new `HOLD` signal.

### Evidence limitations

Real configured News/Binance, PostgreSQL/Docker runtime, browser/demo runtime,
OpenSpec CLI, and link/DAG automation remain `UNVERIFIED` or `BLOCKED` where
applicable. Fixtures and skipped tests are not promoted to `PASS`.

## Historical INS-074 — Independent post-INS-073 audit hold

This is the current Instructor signal and supersedes `INS-073 /
APPROVED_FOR_EXECUTION`. The N-03A implementation and N-03 closure passed
independent review and were integrated at commit `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
Execution is now on HOLD because the latest Manager checkpoint still contains
one stale statement about the worker paths being uncommitted.

### Verified checkpoint

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `f320b5f1d7731d121db27e788cffa4a8033dc7fd`.
- The working tree was clean after the audited integration commit. The commit
  contains only the three reviewed N-03A News paths and the Manager-owned
  `TASKS.md`/`HANDOFF.md` checkpoint changes; the Instructor did not implement
  feature code.
- `TASKS.md` records `N-03A=DONE` and `N-03=DONE`; `M-02` remains
  `REVIEW/UNVERIFIED`; `AU-02`, `S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, and `I-03` remain `BLOCKED`.
- The INS-073 Manager and its single News worker are complete and archived;
  no Cryptox Manager, worker, duplicate, or retry is active.

### Independent evidence

- N-03A scheduler `5/5`, News `35/35`, Sentiment `19/19`, and public News API
  `3/3` passed.
- Root workspace tests passed `346` with `6` environment-gated skips; skips
  are not PASS evidence. Root/package typecheck, build, lint, architecture,
  artifacts, deferred-scope/checker, and diff checks exited successfully.
- The worker changed only `modules/news/application/scheduler.ts`,
  `modules/news/application/scheduler.spec.ts`, and the minimal scheduler
  export in `modules/news/api/bootstrap.ts`. No contracts, infrastructure,
  migration, dependency, or unrelated source path changed.

### Reconciliation required before the next feature authorization

- The latest `HANDOFF.md` correctly records the Manager's one staging failure,
  but its final sentence still says the reviewed worker paths remain
  uncommitted. That is stale after `f320b5f`.
- The Instructor will not edit `TASKS.md` or `HANDOFF.md`. A fresh Manager must
  receive a separate control-only authorization to reconcile those two files
  with the actual integrated commit, then stop. No feature implementation,
  retry, replacement, downstream promotion, `M-02`, `AU-02`, `I-01`, `I-02`,
  or deferred packet is authorized under this HOLD.

### Evidence limitations

Real configured News/Binance, PostgreSQL/Docker runtime, browser/demo runtime,
OpenSpec CLI, and link/DAG automation remain `UNVERIFIED` or `BLOCKED` where
applicable. Fixtures and skipped tests are not promoted to PASS.

## Historical INS-073 — N-03A News auto-refresh completion and N-03 closure

This replaceable signal supersedes `INS-072 / HOLD` and authorizes exactly one
fresh Manager and exactly one fresh News worker for the residual `N-03A`
completion packet. It authorizes no retry of the completed N-03 worker, no
other implementation, and no downstream start.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `1fda6ad`
  (`docs(control): approve N-03A refresh completion`). The parent Instructor
  reviewed the governance-only plan/decision delta and Git is clean.
- The operational board currently contains 32 `DONE`, 2 `REVIEW` (`M-02`,
  `N-03`), and 8 `BLOCKED` (`AU-02`, `S-04`, `I-01`, `I-02`, `E-02`, `L-02`,
  `F-03`, `I-03`) rows, 42 existing rows total. `N-03A` is newly planned in
  `MVP_PLAN.md` and must be added as a separate operational row by the Manager
  before it is executable.
- M-03 is `DONE` under INS-071 at `280b280`; C-02, C-03, Q-02, B-03,
  ENV-03, and ENV-04 remain `DONE`. N-03 source/business state remains at
  `d4161ec458c869ff18fa89dd9732df260629c915`; its safe-fetch, extraction,
  retention, provenance, and neutral Sentiment evidence is preserved, but its
  checkpoint explicitly records that only the 1–5 minute setting/default exists
  and no scheduler is implemented.
- `DEC-014` and `MVP_PLAN.md` now define N-03A as completion of the approved
  `CSL-R-NW-02` behavior. They do not expand product scope, reopen N-03 source
  history, or authorize downstream tasks. Real PostgreSQL, configured Binance
  and News providers, browser/demo runtime, link/DAG automation, and OpenSpec
  CLI evidence remain `UNVERIFIED` or `BLOCKED` where recorded. No unavailable
  check, fixture, or skipped test is treated as `PASS`.

### Authorized packet and delegation

- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, with model
  `gpt-5.6-luna` and `xhigh` reasoning. It must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify this
  signal, the new N-03A plan/decision, Git, TASKS, HANDOFF, the DAG,
  dependencies, and active tasks.
- The Manager must add exactly one `N-03A` operational row to `TASKS.md` in
  `READY` state, with the packet's requirement IDs, dependencies, exact scope,
  and stop evidence. It must then move only N-03A through
  `READY -> IN_PROGRESS` before dispatching the worker. Existing N-03 remains
  `REVIEW` until the residual acceptance is proven; it must not be retried or
  moved to another state before then.
- Delegate exactly one fresh News worker after the READY/dependency check. The
  worker must use the canonical same-directory checkout, must not create a
  thread/worker, branch, worktree, commit, or control-plane edit, and must not
  edit `TASKS.md`, `HANDOFF.md`, `INSTRUCTOR.md`, `DECISIONS.md`,
  `MVP_PLAN.md`, requirements, ADRs, or OpenSpec artifacts. No retry,
  replacement, duplicate, or second worker is authorized.
- **Worker write scope:** `modules/news/api/**` excluding `contracts.ts` and
  contract-only tests; `modules/news/application/**`; and focused News
  scheduler tests in those boundaries. No infrastructure change is authorized;
  if the implementation genuinely requires one, stop and report
  `NEEDS_INSTRUCTOR_REVIEW`. No Sentiment, Strategy, frontend, backend
  composition root, contract, migration, dependency, credential, arbitrary
  URL, queue, distributed, or unrelated source change is authorized.
- **Manager-owned scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md` for the N-03A row, N-03 closure, review,
  and checkpoint. The Manager must preserve every unrelated task state and
  stop before S-04, E-02, L-02, F-03, I-01, I-02, I-03, AU-02, M-02, or any
  other packet.

### Acceptance and validation

- Implement a provider-neutral, application-owned, testable scheduler that
  accepts the existing configured 1–5 minute interval and five-minute default,
  invokes the existing public News collection at each interval, prevents
  overlapping collection runs, isolates a failed refresh so later ticks remain
  possible, and shuts down idempotently so no future tick runs. It must not
  perform direct remote fetching, persist timer state, log secrets, or create a
  queue/distributed worker protocol.
- Tests must cover cadence, default and invalid intervals, non-overlap, failure
  continuation, and shutdown using injected timer/clock seams. The public API
  must remain contract-compatible and later runtime integration must be able to
  consume the scheduler through the News boundary.
- The Manager must review exact changed paths and re-run the original N-03
  focused News/Sentiment tests plus N-03A tests, relevant public API tests,
  current checker and `scope:check`, architecture, artifacts, typecheck, build,
  lint, and `git diff --check`. Real configured News, PostgreSQL, browser/demo,
  OpenSpec CLI, and link/DAG automation remain `UNVERIFIED`/`BLOCKED` when
  unavailable; fixtures and skips are not live-provider evidence.
- If the residual evidence is complete, move N-03A through
  `IN_PROGRESS -> REVIEW -> DONE`, then move the existing N-03 exactly
  `REVIEW -> DONE` under this authorization and record both transitions. If a
  material premise is false, keep N-03A/N-03 at the safe state, record the
  exact blocker, and stop. Attempt one coherent Manager checkpoint commit
  containing only TASKS/HANDOFF; if Git staging/commit is denied, report it once
  and do not retry or broaden scope.
- The Manager must stop immediately after the N-03A review and optional N-03
  closure. No downstream promotion is implied by this instruction.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [ADR-009](../adr/ADR_009_controlled_llm_and_external_content.md)
- [News capability spec](../../openspec/specs/news/spec.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
