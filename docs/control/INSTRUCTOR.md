# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-071`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-071 — M-03 realtime market delivery closure review

This replaceable signal supersedes `INS-070 / HOLD` and authorizes exactly one
fresh Manager-owned closure packet: `M-03`. It authorizes no feature
implementation, worker, retry, or downstream start.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `e583af5`
  (`docs(control): hold after B-03 closure`); the parent Instructor reviewed
  the governance-only delta and Git is clean at the checkpoint.
- The operational board contains 31 `DONE`, 3 `REVIEW` (`M-02`, `M-03`,
  `N-03`), and 8 `BLOCKED` (`AU-02`, `S-04`, `I-01`, `I-02`, `E-02`, `L-02`,
  `F-03`, `I-03`) rows, 42 rows total. This is packet-state progress only and
  is not final MVP acceptance.
- C-02, C-03, ENV-01, ENV-02, ENV-03, ENV-04, Q-02, B-03, S-05, and S-06 are
  recorded `DONE`. B-03 closure moved exactly `REVIEW -> DONE` under INS-069;
  no downstream packet was promoted.
- M-03 source remains at `b73b298`; its focused evidence is 31 passed and one
  environment-gated PostgreSQL test skipped. Its implementation paths are
  unchanged since that checkpoint. N-03 source remains at
  `d4161ec458c869ff18fa89dd9732df260629c915` and its recorded auto-refresh
  scheduler gap remains `PARTIAL/UNVERIFIED`; it is not eligible for closure
  on the current evidence. M-02 remains historical `REVIEW/UNVERIFIED`.
- The current checker has 13/13 focused tests passing; the relevant local
  architecture, artifact, scope, typecheck, build, lint, and diff gates have
  passed in the reviewed checkpoints. Real PostgreSQL, configured Binance and
  News providers, browser/demo runtime, link/DAG automation, and OpenSpec CLI
  evidence remain `UNVERIFIED` or `BLOCKED` where recorded. No unavailable
  check, fixture, or skipped test is treated as `PASS`.

### Authorized packet

- M-03 remains `REVIEW` after its accepted source checkpoint `b73b298`. The
  parent Instructor verified that the eleven implementation/test paths in the
  M-03 checkpoint are unchanged in the current source tree. The focused Market
  Data evidence is 31 passed and one environment-gated PostgreSQL test skipped;
  the skip is not PASS evidence.
- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, with model
  `gpt-5.6-luna` and `xhigh` reasoning. It must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify this
  signal, Git, TASKS, HANDOFF, the DAG, dependencies, and active tasks.
- No worker is authorized or needed: this is a Manager-only closure review.
  No source implementation, branch, worktree, retry, replacement, duplicate,
  or downstream start is authorized.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. If evidence remains sound, move only M-03
  `REVIEW -> DONE` and update the M-03 checkpoint. Leave M-02, N-03, S-04,
  E-02, L-02, F-03, I-01, I-02, I-03, AU-02, and every other state unchanged.
- Verify the approved M-03 behavior: same-timestamp replacement and later-
  timestamp delivery, duplicate/out-of-order suppression, bounded gap
  recovery, reconnect/shutdown behavior, provider event and received times,
  latency, connection state, restart-empty semantics, an independent latest
  100-tick ring per pair, and the strictly ephemeral observability boundary
  excluded from historical input, dataset snapshots, Backtesting, and replay.
- Re-run or verify focused Market Data and market-WebSocket tests, the current
  checker 13/13, `scope:check`, architecture, artifacts, typecheck, build,
  lint, and diff checks. Real Binance readiness must be reported honestly;
  no live configuration is present, so real Binance remains `UNVERIFIED`, and
  the PostgreSQL-gated test remains `BLOCKED`/`UNVERIFIED`. Root skips,
  fixtures, and unavailable OpenSpec/browser/link-DAG checks must not be
  promoted to PASS.
- If a material premise is false, keep M-03 `REVIEW`, record the exact blocker,
  and stop. Commit one coherent Manager checkpoint containing only the two
  authorized control files, then stop immediately. This closure does not
  authorize N-03, S-04, E-02, L-02, F-03, I-03, I-01, I-02, AU-02, M-02, or
  any other packet.

### Preserved pending frontier

- N-03 requires a separate review of the missing auto-refresh scheduler before
  closure or any narrowly scoped completion authorization. S-04 remains
  blocked on N-03 and controlled LLM-authoring evidence. E-02 and all later
  joins remain blocked by their stated DAG dependencies. AU-02 remains a
  human-decision item and is not retried.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
