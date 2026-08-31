# I-02 Optional RSS Allowlist Correction Checkpoint — INS-154 / DEC-075

## Authority and applicability

- Current signal: INS-154 / APPROVED_FOR_EXECUTION; durable decision: DEC-075.
- Canonical checkout: D:/agy-cli-projects/AOS/Cryptox, branch MVP_IMPLEMENTATION.
- Starting HEAD was the governance commit 5f86c07fa6d109e70848dc70b61f01977deb7ef2. The reviewed source/business checkpoint is 7c10afa14eff40adb85603453d2c743c6a7acfd0; the only tracked difference between that checkpoint and starting HEAD was the committed Instructor/decision control update. The pre-existing untracked .codex/config.toml remains excluded.
- Before re-entry, TASKS.md had 57 operational rows: 56 DONE, only I-02 at REVIEW, and no other active task. I-01, I-02D, and I-03 were DONE; no competing Cryptox Manager, worker, retry, replacement, duplicate, or worktree was active.
- Applicable requirements are CSL-R-RD-01, CSL-R-NW-01, CSL-R-NW-02, CSL-R-ST-05, CSL-R-OB-01, CSL-R-RP-02, CSL-R-DL-01, and CSL-R-DM-01, with ADR-004/005/009 and the exact INS-154/DEC-075 boundary.
- No credential, token, cookie, password, connection string, or secret was requested, printed, entered, stored, or committed. The previously exposed chat key was not used.

## Authorized execution and worker result

- I-02 moved exactly through REVIEW -> READY -> IN_PROGRESS -> REVIEW. It remains REVIEW; this correction does not authorize promotion or any downstream packet.
- Exactly one fresh hidden internal worker was used: Sartre, 01a058cd-7254-7191-b34a-83be4e88d0d6, using gpt-5.6-luna with max reasoning in the same canonical checkout. The worker created no child, branch, worktree, commit, retry, or control-plane edit.
- The exact worker write scope was limited to:
  - apps/backend/src/runtime.ts
  - apps/backend/src/runtime.news-composition.spec.ts
- The runtime now treats a blank value for the optional COINDESK_RSS_ALLOWED_URLS list as absent only for that RSS option. HTTPS, host/URL allowlisting, malformed-entry rejection, unsafe/private destination rejection, and the requirement for at least one non-empty effective matching allowlist entry remain fail-closed.
- Focused tests cover the copied .env.example RSS shape with a blank optional exact-URL list, malformed optional entries, all-empty effective allowlists, and no fixture/remote fallback. Injected fakes were used only.

## Independent Manager review

- The reviewed source diff is exactly 17 added/changed lines in runtime.ts and 14 added/changed lines in the named runtime spec. No scope drift or generated artifact change is present.
- The blank-list handling is opt-in at the RSS optional exact-URL list. Blank required URL/host/prefix values remain invalid; a trailing delimiter remains malformed; and a URL with no non-empty effective allowlist remains unavailable.
- The single worker result was accepted after independent source/diff review.

## Validation evidence

### PASS

- Focused runtime suite: 14/14.
- Backend workspace tests: 43 passed, 1 environment-gated skip; exit 0.
- Backend typecheck, build, and lint: exit 0.
- Root workspace tests: exit 0 across all workspaces; only expected environment-gated PostgreSQL/Auth skips were observed.
- Root build, typecheck, and lint: exit 0.
- Architecture check: 189 modules / 644 dependencies; the nine forbidden dependency fixtures were the existing intentional diagnostics.
- Source-adjacent artifact check: no generated module artifacts found.
- Deferred-scope check: no deferred leakage found.
- Deferred-scope regression: 15/15.
- Runtime smoke: /live=200, /ready=503, /health=404; the unavailable readiness result is truthful for the unconfigured local database.
- Exact-path review: tracked diff is limited to the two worker paths plus docs/implementation/TASKS.md and docs/implementation/HANDOFF.md.
- Secret-shaped-value scan of the reviewed diff: zero matches.
- git diff --check / whitespace check: PASS.

### BLOCKED or UNVERIFIED

- Docker runtime: BLOCKED; docker info could not access the Windows Docker daemon. No container was started.
- Docker Compose configuration/runtime: BLOCKED; configuration validation requires the ignored local CRYPTOX_LOCAL_POSTGRES_PASSWORD, and no secret was generated or supplied. No runtime, health, migration, or teardown claim is made.
- PostgreSQL application/Auth state and migration evidence: BLOCKED because the Docker-backed local database was unavailable.
- Live CoinDesk RSS: UNVERIFIED; deterministic injected fakes only, with no live request.
- Live Gemini/OpenAI-compatible provider: UNVERIFIED; deterministic fakes only, with no credential or live request.
- Authenticated browser/demo and final real-data flow: UNVERIFIED; not run under this narrow parser correction.
- Clean-install/reprovision evidence: UNVERIFIED; not run.
- OpenSpec CLI status/instruction validation: UNVERIFIED; the openspec executable is unavailable in this environment. The active change files were read manually.

## Final state and stop boundary

- I-02 remains REVIEW. I-01, I-02D, and I-03 remain unchanged; no downstream packet was started or promoted.
- The Manager completed the one worker, independent review/integration, checkpoint update, requested deterministic validation, and one explicit-path checkpoint commit attempt. Git denied it before staging with the exact error: fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied. No commit was created and no retry was made; the reviewed source/control delta remains uncommitted for Instructor audit.
- The next step is independent Instructor audit and renewed authorization; no further Manager work is authorized by INS-154.
