# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-069`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-069 — B-03 synthetic paper closure review

This replaceable signal supersedes `INS-068 / HOLD` and authorizes exactly one
fresh Manager-owned closure packet: `B-03`. It authorizes no feature
implementation, worker, or downstream start.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `ca3899b`
  (`docs(control): hold after ENV-03 closure`); Git is clean.
- Q-02 is `DONE` under INS-065. Its source checkpoint remains
  `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`; ENV-04 is `DONE` at `4c964f6`
  with implementation checkpoint `5032582`; C-03 is `DONE` at `a115025`.
- Current operational board: 30 `DONE`, 4 `REVIEW` (`M-02`, `M-03`, `B-03`,
  `N-03`), and 8 `BLOCKED` (`S-04`, `E-02`, `L-02`, `F-03`, `I-01`, `I-02`,
  `I-03`, `AU-02`) across 42 task rows. This is packet-state
  progress only, not final MVP acceptance.
- ENV-03 is `DONE` under INS-067. The current deferred-scope checker and its
  13 focused tests pass, and `npm run scope:check` passes for the approved
  B-03 and Q-02 boundaries. The later ENV-04 checker reconciliation at
  `5032582` remains unchanged.
- Real PostgreSQL, configured Binance/News providers, browser/demo runtime,
  link/DAG automation, and OpenSpec CLI evidence remain `UNVERIFIED` or
  `BLOCKED` where recorded. No unavailable check is treated as PASS.

### Reviewed frontier and authorized packet

- B-03 remains `REVIEW` after accepted source checkpoint
  `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`. Its exact implementation/test
  source paths are unchanged after that checkpoint; the current checker gate
  now passes following ENV-03. The parent Instructor independently reran all
  seven Backtesting test files: 43/43 pass. Real Binance and PostgreSQL
  evidence remain `UNVERIFIED`/`BLOCKED`, but the B-03 packet explicitly
  permits unavailable runtime evidence to remain limited rather than claimed.
- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, with model
  `gpt-5.6-luna` and `xhigh` reasoning. It must read `AGENTS.md` and
  `docs/control/prompts/ORCHESTRATOR_START.md` completely, then verify this
  signal, Git, TASKS, HANDOFF, the DAG, dependencies, and active tasks.
- No worker is authorized or needed: this is a Manager-only closure review.
  No source implementation, branch, worktree, retry, replacement, duplicate,
  or downstream start is authorized.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. If evidence remains sound, move only B-03
  `REVIEW -> DONE`, reconcile its old deferred-scope wording to the current
  ENV-03 `PASS`, and update the B-03 checkpoint. Leave M-02, M-03, N-03, S-04,
  E-02, L-02, F-03, I-01, I-02, I-03, AU-02, and every other state unchanged.
- Verify the approved B-03 behavior: explicit Long and synthetic Short
  candle-only simulation, conservative `STOP_LOSS_WINS_V1` dual-trigger
  handling, fixed-point eight-place `HALF_UP` arithmetic, 0.08% fee and 5-bps
  adverse slippage per fill, deterministic bounded exits, provenance and
  persistence round-trip, owner-filtered access, cancellation/failure
  containment, one terminal outcome, and no leverage/margin/funding/
  liquidation/exchange-order/generalized-risk behavior.
- Re-run or verify 43/43 Backtesting tests, current checker 13/13,
  `scope:check`, architecture, artifacts, typecheck, build, lint, and diff
  checks. OpenSpec CLI, PostgreSQL/Docker, Binance, browser/demo, and
  link/DAG automation evidence remain `UNVERIFIED` or `BLOCKED` where
  unavailable; never promote skips or fixtures to live evidence.
- If a material premise is false, keep B-03 `REVIEW`, record the exact blocker,
  and stop. Commit one coherent Manager checkpoint containing only the two
  authorized control files, then stop immediately. B-03 closure does not
  authorize E-02, L-02, F-03, I-03, I-01, I-02, AU-02, or any other packet.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
