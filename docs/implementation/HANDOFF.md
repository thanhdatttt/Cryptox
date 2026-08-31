# I-02 OpenSpec Scenario Preservation Repair Checkpoint — INS-168 / DEC-089

## Authority and applicability

- Current signal: INS-168 / APPROVED_FOR_EXECUTION; durable decision: DEC-089.
- Manager: fresh delegated Level-2 Manager in the canonical checkout.
- Canonical checkout: D:/agy-cli-projects/AOS/Cryptox, branch MVP_IMPLEMENTATION.
- Starting authorization commit / Git HEAD: 5a74e9833535b4c272add7c6d31f01a789a741b9. INS-168 records ec1209d as the reviewed dirty base for this signal.
- Exact scenario-preservation baseline: 560bdad63d922d66c3d78ad8965e4cecadd07be7.
- Entry tracked delta matched the authorized twelve paths: the ten active capability specs plus TASKS.md and HANDOFF.md. The pre-existing untracked .codex/config.toml remains excluded. No source, test, requirement, ADR, architecture, data-model, active-change, environment, credential, migration, infrastructure, generated, or deferred-scope path changed.
- Entry board state was 58 rows, 57 DONE, and only I-02 at REVIEW. This run re-entered only I-02 through REVIEW -> READY -> IN_PROGRESS -> REVIEW; N-03S, N-03R, I-02D, I-01, and I-03 remain DONE.

## Authorized work and delegation

- Exactly one fresh hidden internal worker was dispatched once in the canonical same-directory checkout: Darwin 01a059a1-eee6-7aa2-b23f-5b3ad9c6d3af, using gpt-5.6-luna, max reasoning, and priority service tier. It completed once and was closed. No retry, replacement, duplicate, child agent, worktree, branch, or worker commit was used.
- The worker write scope was exactly: openspec/specs/backtesting/spec.md, openspec/specs/evaluation/spec.md, openspec/specs/frontend/spec.md, openspec/specs/leaderboard/spec.md, openspec/specs/market-data/spec.md, openspec/specs/news/spec.md, openspec/specs/search/spec.md, openspec/specs/sentiment/spec.md, and openspec/specs/strategy/spec.md.
- The worker removed exactly one duplicate copy of the final evaluation-failure invariant and restored LF bytes in those nine files. It did not edit auth/spec.md or any control-plane, source, test, configuration, dependency, environment, migration, infrastructure, generated, or other path.

## Independent review and validation

### PASS

- Exact scenario multiset: baseline 64, current 64; every original block occurs exactly once. Per-file counts remain Auth 4, Backtesting 7, Evaluation 4, Frontend 9, Leaderboard 5, Market Data 7, News 9, Search 6, Sentiment 4, Strategy 9.
- Nested requirement coverage: 47/47 current requirements have at least one nested level-4 scenario.
- The dual-trigger block is present exactly once at openspec/specs/backtesting/spec.md:21 under Deterministic historical simulation; all ten old acceptance headings are absent.
- Evaluation's final failure invariant occurs exactly once at openspec/specs/evaluation/spec.md:71.
- Raw-byte review found no CRLF or bare-CR bytes in any active spec; git ls-files --eol reports w/lf for all ten active specs.
- Markdown/link/anchor review passed for 64 local links across the ten specs, TASKS.md, and this checkpoint.
- Exact tracked-path review passed: the tracked dirty set is exactly the authorized ten specs plus TASKS.md and HANDOFF.md; no files are staged and .codex/config.toml is the only untracked item.
- npm run test:scope-check: 15/15 PASS.
- npm run scope:check: PASS.
- npm run arch:check: PASS; no dependency violations.
- npm run artifacts:check: PASS.
- Added-line secret scan: PASS; no credential-like literal was introduced.
- git diff --check: PASS.

### BLOCKED / UNVERIFIED

- Formal OpenSpec status, apply instructions, and openspec validate --all --no-interactive --json: BLOCKED/UNVERIFIED. The installed absolute shim C:/Users/admin/AppData/Roaming/npm/openspec.cmd exists, but this Manager invocation failed with Access is denied. No OpenSpec PASS is inferred; the Instructor must rerun the absolute shim.
- Implementation tests: UNVERIFIED / not applicable to this documentation-only correction; no implementation scope was authorized.

## I-02 state and stop condition

- TASKS.md records I-02 at REVIEW with the exact transition REVIEW -> READY -> IN_PROGRESS -> REVIEW under INS-168 / DEC-089. There are 58 rows, 57 DONE, one REVIEW, and no other BLOCKED, READY, or IN_PROGRESS row. No downstream task started.
- The single explicit-path staging/commit attempt was denied before staging. Exact Git error: `fatal: Unable to create 'D:/agy-cli-projects/AOS/Cryptox/.git/index.lock': Permission denied`. No files are staged, HEAD remains 5a74e9833535b4c272add7c6d31f01a789a741b9, and no retry was made.
- Full MVP DoD is not claimed. The inherited real PostgreSQL/Auth, configured Binance/News, browser/demo, clean reprovision, and final integrated architecture evidence remain BLOCKED or UNVERIFIED.

## Remaining I-02 live/demo blockers

The documentation correction does not close the inherited I-02 evidence gap: real PostgreSQL/Auth registration, session, logout, expiry, and two-user ownership E2E; configured Binance historical/realtime and authenticated browser/demo evidence; configured real News/Sentiment and full LLM Save/Approve persistence; clean install/reprovision; and the complete architecture-change/demo proof remain BLOCKED or UNVERIFIED. Fixtures, skipped tests, historical checkpoints, and this spec correction are not live or final-demo evidence.
