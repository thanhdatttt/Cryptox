# I-02 Provider and Local Configuration Execution Checkpoint — INS-152 / DEC-073

## Authority and applicability

- Current signal: `INS-152 / APPROVED_FOR_EXECUTION`; durable decision:
  `DEC-073`.
- Canonical checkout: `D:\agy-cli-projects\AOS\Cryptox`, branch
  `MVP_IMPLEMENTATION`, same directory. The reviewed source/business
  checkpoint is `2be555ccd834dca74d3ed53c307136f4975ebe02`; the authorization
  checkpoint is `5ab03f545dc2e2998530a942776ac889cd7d0a89`. Before execution,
  the only diff from the reviewed checkpoint was the committed
  `INS-152`/`DEC-073` control-plane update; no source, business, task-DAG,
  contract, migration, requirement, ADR, OpenSpec, or generated-path drift was
  found.
- The pre-existing app-generated untracked `.codex/config.toml` remains
  excluded. No credential, token, cookie, password, connection string, or
  secret was requested, printed, entered, or added to the repository.
- Before re-entry, `TASKS.md` had 57 operational rows: `56 DONE`, only `I-02`
  in `REVIEW`, and no other active row. `I-02D`, `I-01`, and `I-03` were
  already `DONE`. No other Manager/worker, retry, replacement, duplicate,
  worktree, or downstream task was active or dispatched.
- The governing requirements, accepted ADRs, architecture/data model, active
  change, and relevant News/Strategy specs were read. The local OpenSpec CLI
  is unavailable; formal CLI status/instruction validation remains
  `UNVERIFIED` and is not acceptance evidence.

## Governing requirements and authorized boundary

- Applicable requirements are `CSL-R-RD-01`, `CSL-R-NW-01`, `CSL-R-NW-02`,
  `CSL-R-ST-05`, `CSL-R-OB-01`, `CSL-R-RP-02`, `CSL-R-DL-01`, and
  `CSL-R-DM-01`, with ADR-004/005/009 and the exact `INS-152`/`DEC-073`
  boundary.
- I-02 moved exactly through `REVIEW -> READY -> IN_PROGRESS -> REVIEW`.
  Exactly two fresh hidden internal workers were used sequentially. No
  downstream task was started, unlocked work was auto-started, or final I-02
  claim was made.
- Worker A scope was exactly `apps/backend/src/runtime.ts` and
  `apps/backend/src/runtime.news-composition.spec.ts`.
- Worker B scope was exactly `.env.example`, `.dockerignore`, `README.md`,
  `apps/backend/package.json`, `apps/frontend/vite.config.ts`,
  `infra/docker-compose.yml`, `infra/docker/backend.Dockerfile`,
  `infra/docker/frontend.Dockerfile`, and `infra/db/local-postgres.cjs`.
  The backend Dockerfile was reviewed and intentionally unchanged.

## Worker results and Manager review

- Tesla (`01a05897-6560-7841-8943-7fea58702530`) completed once. The runtime
  composes the existing safe, allowlisted HTTPS CoinDesk RSS provider from
  explicit environment values, preserves the explicit legacy JSON path, and
  uses only the existing provider-neutral `LLM_AUTHORING_*` authoring path.
  Focused tests cover safe/incomplete RSS configuration, no fixture fallback,
  legacy JSON compatibility, authoring configuration, and ignored `GEMINI_*`
  aliases. No credential or live call was used.
- Manager reviewed Tesla's exact two-file diff and independently ran the
  focused runtime suite (`12/12` PASS), backend typecheck/lint, and
  `git diff --check`.
- Kuhn (`01a058a5-2c43-7692-a73e-396da8c0db85`) completed once. The exact
  changed files were `.env.example`, `.dockerignore`, `README.md`,
  `apps/backend/package.json`, `apps/frontend/vite.config.ts`,
  `infra/docker-compose.yml`, `infra/docker/frontend.Dockerfile`, and
  `infra/db/local-postgres.cjs`. The packet adds secret-free root env
  documentation, optional Node env-file loading, Docker internal PostgreSQL
  URL/health wiring, public-only frontend build/runtime values, and truthful
  setup/demo documentation.
- Manager made one narrow review correction inside that scope: the example
  leaves `COINDESK_BASE_URL` empty so the no-key RSS path is the default while
  the legacy JSON adapter remains available when explicitly configured.
  Neither worker edited control-plane files or used a branch, worktree,
  credential, or live provider call.

## Validation evidence

- Full workspace tests: `459` passed, `9` environment-gated skips, `0`
  failures; the independent root `npm test` process exited `0`. Focused
  runtime tests were `12/12` PASS.
- Root build, typecheck, and lint exited `0`. Architecture check PASS
  (`189` modules / `644` dependencies); its nine forbidden-dependency fixture
  diagnostics are the existing intentional checks. Artifact check PASS.
- Deferred-scope check PASS; focused scope regression `15/15` PASS. Runtime
  smoke PASS with the truthful no-database result `/live=200`, `/ready=503`,
  `/health=404`.
- Frontend production build and bundle scan PASS: no server-only database,
  credential, or private provider configuration names were found in
  `apps/frontend/dist`. Secret-shaped-value scan of all authorized changed
  files found no matches.
- Compose interpolation/configuration check PASS with the available
  `docker-compose` v2.40.2 client. Exact-path review, `git diff --check`, and
  source-adjacent artifact review PASS. `.codex/config.toml` remains excluded.

## Live versus fixture evidence

- Deterministic tests and local runtime smoke are not live-provider evidence.
  The official RSS URL and allowlist are now operable through the existing safe
  boundary, but no live CoinDesk RSS call was made. Gemini compatibility is
  documented and composed only through the existing `LLM_AUTHORING_*` names;
  no native Gemini SDK or `GEMINI_*` alias exists.
- Docker runtime evidence is `BLOCKED`: `docker compose` is not available as
  a subcommand and the Docker daemon is inaccessible. The available
  `docker-compose config --quiet` check proves interpolation only, not
  container startup, health, migrations, or teardown.
- Real configured News/LLM calls, Docker-backed PostgreSQL/Auth state and
  migrations, authenticated browser/demo evidence, clean-install evidence,
  and OpenSpec CLI evidence remain `BLOCKED`/`UNVERIFIED`. Historical or
  fixture evidence is not promoted to close the final real-data gate.

## Final task state and stop boundary

- `I-02` remains `REVIEW`; its bounded provider/local-configuration packet is
  reviewed, but the broader final-demo acceptance is not proven. `I-02D` and
  all other rows remain unchanged. No downstream packet is authorized.
- The single coherent explicit-path Manager staging/commit attempt was blocked
  before staging by the exact Git error `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No
  commit was created, no retry was made, and `.codex/config.toml` remained
  excluded. The authorized source/configuration/documentation and Manager
  control delta remains uncommitted for Instructor audit.
- The resulting Git branch, HEAD, status, and blocked commit outcome are
  authoritative at handoff. Fresh Instructor review is required before any
  I-02 promotion, downstream execution, or another commit attempt.
