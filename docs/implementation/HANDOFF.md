# I-02 Remote Market Client Repair Execution Checkpoint — INS-150 / DEC-071

## Authority and applicability

- Current signal: `INS-150 / APPROVED_FOR_EXECUTION`; durable decision:
  `DEC-071`.
- Canonical checkout: `D:\agy-cli-projects\AOS\Cryptox`, branch
  `MVP_IMPLEMENTATION`, same directory. The authorization checkpoint is
  `31c7f7391cfb599b98fa080735ceccceeab23a13`; its reviewed source/business
  checkpoint is `69d7982`. The only diff from `69d7982` to the authorization
  checkpoint is the committed control-plane update in
  `docs/control/INSTRUCTOR.md` and `docs/control/DECISIONS.md`; no source,
  test, contract, migration, infrastructure, environment, requirement, ADR,
  OpenSpec, or generated-path drift was found.
- The pre-existing app-generated untracked `.codex/config.toml` remains
  excluded. No credential, token, cookie, password, or secret was requested,
  printed, entered into the browser, or added to the repository.
- Before re-entry, `TASKS.md` had 57 operational rows: `56 DONE`, only `I-02`
  in `REVIEW`, and no other `READY`, `IN_PROGRESS`, `BLOCKED`, or `REVIEW`
  row. `I-02D` remains `DONE`. No other Cryptox Manager/worker, retry,
  replacement, duplicate, or user-visible worker was active or dispatched.
- The checked-in active `mvp-implementation` proposal, design, market-data and
  frontend capability specifications, and delivery specification were read and
  are consistent with this bounded repair. The local OpenSpec CLI was not
  available; formal CLI status/instruction validation is `UNVERIFIED` and was
  not used as acceptance evidence.

## Governing requirements and authorized boundary

- Governing requirements: `CSL-R-MD-01`, `CSL-R-MD-02`, `CSL-R-MD-03`,
  `CSL-R-FE-01`, configured-runtime portions of `CSL-R-RD-01`, and the
  corresponding `CSL-R-DM-01` browser acceptance; applicable decisions are
  `DEC-071` and `INS-150`, with ADR-001 as the market WebSocket boundary.
- I-02 was re-entered exactly through `REVIEW -> READY -> IN_PROGRESS` under
  `INS-150`. Only one fresh hidden internal implementation worker was
  authorized. No downstream task was started or promoted.
- Worker write scope was exactly `apps/frontend/src/market/clients.ts` and
  `apps/frontend/src/market/clients.spec.ts`. The Manager-owned control scope
  was limited to this checkpoint and `docs/implementation/TASKS.md`.

## Worker result and independent review

- Russell (`01a05875-42d3-7f03-982a-c8a768b6c4a9`) completed once. No commit,
  branch, worktree, child worker, retry, replacement, or control-plane edit was
  made by the worker.
- `clients.ts` now uses the receiver-preserving `browserMarketFetch` wrapper
  as the default `RestMarketDataClient` seam. `clients.spec.ts` adds a focused
  regression that demonstrates the old unbound browser-like fetch raises
  `Illegal invocation` and that the default wrapper succeeds.
- The existing REST URL, POST method, credentials policy, DTO validation,
  WebSocket client, subscription/reconnect behavior, and chart independence
  are unchanged. The worker changed only the two named paths.
- Manager review found the exact intended five-line source change and the
  focused regression only; no backend, module, transport contract, provider,
  fixture selection, chart calculation, or generated-path change was present.

## Validation evidence

- Worker-reported focused market-client test: `5/5` PASS; frontend typecheck,
  lint, and diff check PASS.
- Independent focused market-client test: `5/5` PASS.
- Independent I-02 frontend test: `5/5` PASS.
- Full frontend suite: `14` files, `50/50` tests PASS.
- Full workspace suite: `449` tests PASS, `9` environment-gated skips, `0`
  failures. Skips and deterministic fixture tests are not live-provider
  evidence.
- Frontend typecheck, frontend lint, frontend production build, root
  typecheck, root lint, and root build: PASS.
- Architecture check: PASS (`189` modules / `642` dependencies); the reported
  `9` forbidden dependency fixtures are the existing intentional diagnostics.
  Artifact check: PASS. Deferred-scope check: PASS. Deferred-scope tests:
  `15/15` PASS. `git diff --check`: PASS. Exact tracked-path review: PASS;
  before the final commit the only tracked paths are the two authorized source
  paths plus Manager-owned `TASKS.md` and `HANDOFF.md`.

## Live versus fixture evidence

- Live configured backend probe: `/live=200`, `/ready=200`; the optional News
  provider was degraded. The real market history boundary returned HTTP 200
  with 100 `BTCUSDT` candles and `provider=binance` for the bounded request.
- Live local browser probe used `VITE_MARKET_SOURCE=remote`, the repository's
  same-origin `/api` market REST proxy, and the existing market WebSocket URL.
  The UI displayed `Configured market provider`, rendered exactly four market
  chart articles, showed no history error banners, and the browser console had
  no warning/error entries. The four charts therefore passed the repaired
  history/fetch boundary without `Illegal invocation`.
- The browser was not authenticated and no credential was entered. The market
  WebSocket consequently ended in its expected unauthenticated/disconnected
  state; authenticated realtime delivery, two-user Auth isolation, and the
  complete final demo remain `BLOCKED`/`UNVERIFIED` and are not claimed from
  this repair.
- Missing configured CoinDesk News, provider-neutral `LLM_AUTHORING_*`, full
  authenticated browser/demo evidence, clean-install evidence, and formal
  OpenSpec CLI evidence remain `BLOCKED`/`UNVERIFIED`. No `GEMINI_*` value was
  mapped or used. These limitations do not identify a new source gap in the
  two-file market repair.

## Final task state and stop boundary

- I-02 transition: `REVIEW -> READY -> IN_PROGRESS -> REVIEW` under `INS-150`.
  The bounded repair is accepted at its authorized packet boundary, but I-02
  is not promoted to `DONE` from this fix because the broader final-demo
  evidence remains incomplete.
- `I-02D` remains `DONE`; all other rows remain unchanged. `I-03` and every
  downstream/newly unlocked packet remain untouched. The Manager stops here.
- Renewed Instructor review remains required before any I-02 promotion or
  downstream execution. No new implementation authorization is requested by
  this checkpoint.

## Commit boundary

- At most one coherent explicit-path staging/commit attempt was authorized for
  exactly these tracked files: `apps/frontend/src/market/clients.ts`,
  `apps/frontend/src/market/clients.spec.ts`,
  `docs/implementation/TASKS.md`, and `docs/implementation/HANDOFF.md`.
  `.codex/config.toml` remained excluded. The single attempt was denied with
  the exact Git error `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`; no
  retry was made.
- The final branch, HEAD, status, and uncommitted commit outcome are
  authoritative in Git at handoff completion.
