# I-02 Configured-News UUID Normalization Checkpoint — INS-181 / DEC-102

## Authority and applicability

- Current Instructor signal: `INS-181 / APPROVED_FOR_EXECUTION`.
- Governing decision: `DEC-102 / APPROVED`, committed in `e0ef057`.
- Canonical checkout: `D:/agy-cli-projects/AOS/Cryptox`.
- Branch: `MVP_IMPLEMENTATION`.
- Authorization HEAD: `e0ef0572e4caa9ee16611e97049f7c45ec2f8065`.
- Reviewed source/business checkpoint: `30f184c`; the accepted News PostgreSQL
  SQL correction remains unchanged. The only pre-existing untracked path is
  `.codex/config.toml`, which was not touched.
- Applicability check: PASS. The branch, authorization, source/business premise,
  requirements, accepted ADRs, architecture, data model, active OpenSpec
  artifacts, and News implementation frontier were consistent with INS-181.
- The authoritative board remains 58 rows: 57 `DONE`, only `I-02` `REVIEW`.
  I-02 was re-entered exactly `REVIEW -> READY -> IN_PROGRESS -> REVIEW`; no
  downstream or deferred task was started or promoted.
- This is the one fresh same-directory Manager execution authorized by INS-181,
  with exactly one fresh hidden implementation worker. The worker was closed
  after completion; no Manager or worker remains active.

## Authorized implementation and independent review

- Worker: Godel, `01a05a6f-85aa-70c1-8d8a-83f538a92e49`; hidden, sequential,
  same-directory, no worktree/branch/retry/replacement/child worker.
- Worker write scope was exactly:
  `modules/news/infrastructure/configured.ts` and
  `modules/news/infrastructure/configured.spec.ts`.
- The adapter now supplies the existing provider-neutral
  `newsItemIdForProviderIdentity(providerId, providerItemId)` result as the
  normalized item ID. This keeps the PostgreSQL UUID contract intact and makes
  the identity stable for the same provider identity.
- `providerItemId`, normalized title/content/source/timestamps/URL/related coins,
  and extraction provenance remain provider-derived and unchanged. HTML
  fallback identifiers remain provider-item identities; they are not used as
  PostgreSQL item IDs.
- Focused coverage now exercises RSS, Website, and HTML outputs. It checks a
  valid UUID format, equality with the existing identity authority, repeated
  stability, provider identity preservation, and extracted fields/provenance.
- Independent exact-path review: PASS. The worker did not edit, stage, or commit
  any control-plane file or any path outside the two authorized source/test
  paths. No migration, schema, PostgreSQL query, contract, runtime composition,
  provider protocol, dependency, frontend, LLM, fallback, fixture promotion,
  deferred scope, downstream task, or unrelated source change was introduced.
- `modules/news/infrastructure/postgres.ts` and
  `modules/news/infrastructure/postgres.spec.ts` are unchanged from `30f184c`.

## Validation evidence

- `npm exec vitest run modules/news/infrastructure/configured.spec.ts`: PASS,
  6/6.
- `npm --workspace @cryptox/news test`: PASS, 36/36.
- `npm test`: PASS, 462 passed; 9 environment-gated tests skipped. Skips are
  not live-provider or final-demo evidence.
- `npm run build`: PASS. Existing Vite CJS deprecation, dynamic-import, and
  large-chunk warnings only.
- `npm run typecheck`: PASS.
- `npm run lint`: PASS.
- `npm run arch:check`: PASS; 189 modules and 644 dependencies, with 9
  configured forbidden-dependency fixtures detected.
- `npm run artifacts:check`: PASS; no source-adjacent generated artifacts.
- `npm run scope:check`: PASS; no deferred-scope leakage.
- `npm run test:scope-check`: PASS, 15/15.
- `npm run runtime:smoke`: PASS for the scripted smoke endpoints
  (`/live=200`, `/ready=503`, `/health=404`). This does not claim real News
  collection or PostgreSQL persistence.
- `git diff --check`: PASS.
- Exact-path/diff-scope review: PASS. Tracked changes are only this Manager
  checkpoint, `docs/implementation/TASKS.md`, and the two authorized News
  source/test paths; no staged paths exist. `.codex/config.toml` remains
  pre-existing and untracked.
- OpenSpec CLI commands are unavailable in this Manager context and are
  `UNVERIFIED`; the active `mvp-implementation` artifacts were read directly.
  Instructor-carried OpenSpec `@fission-ai/openspec@1.11.0` validation of 11/11
  is historical/carried evidence only, not a fresh Manager PASS.

## Stop checkpoint

- I-02 remains `REVIEW` and is not `DONE`.
- Full I-02/MVP Definition of Done remains NOT PROVEN. This bounded correction
  does not provide fresh live configured News/Sentiment persistence, Auth and
  ownership demo, Binance recovery, generated result-data, configured Gemini,
  browser/demo, or all-eight-scenario evidence.
- No final promotion, downstream work, pending OpenSpec implementation, or
  unrelated repair is authorized by INS-181. A separate Instructor review is
  required before any further I-02 action.
- One explicit path-scoped Manager staging/commit attempt was made after review.
  `git add` was blocked with `fatal: Unable to create
  'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`; commit
  was not invoked and no retry was made. The checkpoint remains uncommitted.
- Final Git checkpoint: branch `MVP_IMPLEMENTATION`, HEAD
  `e0ef0572e4caa9ee16611e97049f7c45ec2f8065`, with the authorized two News
  paths and the two Manager-owned control files modified, no staged paths, and
  only `.codex/config.toml` otherwise untracked.
