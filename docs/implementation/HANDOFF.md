# N-03S Pinned HTTPS Transport Checkpoint — INS-158 / DEC-079

## Authority and applicability

- Current signal: `INS-158 / APPROVED_FOR_EXECUTION`; durable decision: `DEC-079`.
- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`.
- Authorization HEAD at entry: `c552e4dddf5f6afb2bbe4c1b8314149646c8fa1c` (`chore(control): authorize safe News transport correction`). The reviewed source/business/test checkpoint remains `48301b240b533db4cdf53651eaaea24a3225e9ac`; the intervening committed changes are governance-only for this packet.
- The entry tracked tree was clean. The pre-existing untracked `.codex/config.toml` remains excluded and was not staged or changed.
- The entry task board had 57 rows: 56 `DONE`, only `I-02` at `REVIEW`, and no other active row. `N-03`, `N-03A`, and `N-03R` were `DONE`. The new authorized `N-03S` row was added as the sole Manager-owned task-board reconciliation; all prior rows remain unchanged.
- Task inspection found no competing active Cryptox Manager, worker, retry, replacement, duplicate, or worktree. The only worker used here was the single fresh hidden worker authorized by `INS-158`.
- Applicable requirements are `CSL-R-NW-02`, `CSL-R-RD-01`, `CSL-R-NW-01`, `CSL-R-OB-01`, and the applicable provenance boundary of `CSL-R-RP-02`, with ADR-009, the News capability specification, and the N-03S packet in `MVP_PLAN.md`.

## Authorized execution and independent review

- N-03S moved exactly `BLOCKED -> READY -> IN_PROGRESS -> REVIEW` under `INS-158 / DEC-079`. `I-02` stayed `REVIEW`; no downstream task was started or promoted.
- Fresh hidden worker: Copernicus, `01a058fb-ffe2-7b31-ac81-9fc23b1c7ff2`, completed once and was closed after review. It changed only `modules/news/infrastructure/safe-fetch.ts` and `modules/news/infrastructure/safe-fetch.spec.ts`; it made no control-plane edit and no commit.
- The production correction branches on Node's lookup `all` option: multi-address lookup receives a one-element `{ address, family }` array, while single-address lookup retains the scalar address callback. Validated address pinning, hostname-based TLS/SNI, invalid-address rejection, HTTPS/allowlist validation, redirect and destination revalidation, credential/cookie omission, timeout, and body limits are unchanged.
- The focused regression exercises the default pinned transport, both lookup callback shapes, the validated pinned address, TLS server name, response body, and existing safe-fetch failure behavior. The Manager independently reviewed the exact diff and found no out-of-scope source or test change. No Manager-side feature edit was required.
- No credential, API key, cookie, token, raw content, Docker/PostgreSQL/migration change, provider-protocol change, runtime-composition change, unrestricted fallback, retry, or fixture substitution was introduced.

## Validation evidence

### PASS

- Focused safe-fetch: `7/7` tests passed.
- News package: `36/36` tests passed; build, typecheck, and lint passed.
- Backend package: `43` tests passed with `1` environment-gated skip; build, typecheck, and lint passed.
- Full workspace: `462` tests passed with `9` environment-gated skips; root build, typecheck, and lint passed. Skips were not promoted to live acceptance.
- Architecture: dependency-cruiser reported no dependency violations (`189` modules / `644` dependencies); the rules check exited successfully with its existing `9` forbidden-dependency fixture diagnostics.
- Artifact/source-sidecar check passed; deferred-scope check passed; focused deferred-scope regression passed `15/15`.
- Runtime smoke exited `0`: `/live=200`, `/ready=503`, `/health=404`. This is the repository smoke result without a configured application database, not full Compose or live-provider evidence.
- Exact-path review, secret-shaped diff scan, logging review, whitespace review, and `git diff --check` passed after the final control-plane update. Only `TASKS.md`, `HANDOFF.md`, and the two authorized News paths are tracked in this checkpoint.

### BLOCKED or UNVERIFIED

- Formal OpenSpec CLI status/instruction validation: `UNVERIFIED`; the `openspec` executable is unavailable in this Manager environment. Active artifacts were read manually.
- Instructor-owned live CoinDesk RSS through `composeConfiguredNewsProviders` and the production safe runtime was not rerun by this Manager. It remains pending independent Instructor smoke; only a non-empty normalized response can establish live PASS. Direct HTTP status, fixtures, skipped tests, or unavailable environment are not sufficient.
- Docker, PostgreSQL, migration, authenticated browser/demo, Binance, and LLM evidence were not part of this bounded transport packet. Previously accepted Instructor environment evidence remains at its own boundary and was not reclassified here.

## Final state and stop boundary

- Final operational board: 58 rows, 56 `DONE`, `I-02` `REVIEW`, and `N-03S` `REVIEW`; no `READY` or `IN_PROGRESS` row. `I-02` was not promoted and no other task state changed.
- The single explicit-path checkpoint commit attempt was denied during staging before commit: `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied` (exit 128). No files were staged, no commit was created, and no retry was made.
- The Manager stops after that single denied attempt and leaves final live CoinDesk verification and any later I-02 decision to the Instructor. The untracked `.codex/config.toml` remains excluded.
