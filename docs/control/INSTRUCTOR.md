# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-067`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-067 — ENV-03 checker closure and control-plane reconciliation

This replaceable signal supersedes `INS-066 / HOLD` and authorizes exactly one
fresh Manager-owned closure/reconciliation packet: `ENV-03`. It authorizes no
feature implementation, worker, B-03 promotion, or downstream start.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `ca0e120`
  (`docs(control): hold after Q-02 closure`); Git is clean.
- Q-02 is `DONE` under INS-065. Its source checkpoint remains
  `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`; ENV-04 is `DONE` at `4c964f6`
  with implementation checkpoint `5032582`; C-03 is `DONE` at `a115025`.
- Current operational board: 29 `DONE`, 5 `REVIEW` (`M-02`, `M-03`, `B-03`,
  `N-03`, `ENV-03`), and 8 `BLOCKED` (`S-04`, `E-02`, `L-02`, `F-03`, `I-01`,
  `I-02`, `I-03`, `AU-02`) across 42 task rows. This is packet-state
  progress only, not final MVP acceptance.
- The current deferred-scope checker and its 13 focused tests pass, and
  `npm run scope:check` now passes for the approved B-03 and Q-02 boundaries.
  ENV-03's reviewed checkpoint `0bc215f` therefore has local evidence for a
  separate Manager-only closure review, subject to the start gate below. The
  later ENV-04 checker reconciliation at `5032582` is reviewed context and must
  remain unchanged.
- Real PostgreSQL, configured Binance/News providers, browser/demo runtime,
  link/DAG automation, and OpenSpec CLI evidence remain `UNVERIFIED` or
  `BLOCKED` where recorded. No unavailable check is treated as PASS.
- Control-plane finding included in this authorization: a legacy
  narrative paragraph in `docs/implementation/TASKS.md` still broadly says
  that all extension packets other than the completed S-05/S-06/Q-02 remain
  `BLOCKED`, while the authoritative rows for M-03, B-03, N-03, and ENV-03 are
  `REVIEW`. The authorized Manager must correct only this stale summary wording
  while closing ENV-03; no task state other than ENV-03 may change.

### Authorized packet: `ENV-03` closure and summary reconciliation

- Authority and requirements: `CSL-R-RP-02`, DEC-007, DEC-011, and ADR-010.
  ENV-03 is a post-B-03 checker-boundary gate; it creates no product behavior
  and does not promote B-03 or any downstream packet.
- Create exactly one fresh Manager in the canonical same-directory checkout
  `D:/agy-cli-projects/AOS/Cryptox`, branch `MVP_IMPLEMENTATION`, using model
  `gpt-5.6-luna` with `xhigh` reasoning. The Manager must read `AGENTS.md`
  and `docs/control/prompts/ORCHESTRATOR_START.md` completely and verify this
  signal, Git, TASKS, HANDOFF, the DAG, dependencies, and active tasks.
- No worker is authorized for this Manager-only closure. No branch, worktree,
  retry, replacement, duplicate, source implementation, or downstream start
  is authorized.
- The Manager may edit only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. It may move only ENV-03
  `REVIEW -> DONE` if the recorded checker evidence is still valid, update the
  ENV-03 checkpoint, and correct the one stale summary paragraph identified
  above. It must leave B-03 at `REVIEW` and every other task row/state exactly
  unchanged.
- Verify ENV-03's exact checker scope: B-03 profile identifiers and directional
  paper vocabulary are allowed only in the existing canonical boundaries and
  exact `modules/backtesting/domain/`, `application/`, and `infrastructure/`
  directories; all near-match and deferred-scope rejection cases remain.
  Confirm the current 13/13 checker tests, `scope:check`, architecture,
  artifacts, typecheck, build, lint, and diff evidence. OpenSpec, PostgreSQL,
  Binance/News, real-provider, browser/demo, and automation evidence stays
  `UNVERIFIED` or `BLOCKED` where unavailable.
- If a material premise is false, keep ENV-03 `REVIEW`, record the exact
  blocker, and stop. Commit one coherent Manager checkpoint containing only
  the two authorized control files, then stop immediately.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
