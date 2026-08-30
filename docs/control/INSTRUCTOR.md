# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-065`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-065 — Q-02 seeded discovery closure review

This replaceable signal supersedes `INS-064 / HOLD` and authorizes exactly one
Manager-owned closure packet: review and close `Q-02`. It authorizes no worker,
source implementation, B-03, or downstream work.

### Reviewed checkpoint and preconditions

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed base: `1efe938` (`docs(control): hold after C-03 closure`), with a
  clean Git tree at dispatch. C-03 and ENV-04 are `DONE`; Q-02 is `REVIEW`.
- Q-02 source checkpoint: `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`
  (`feat(search): implement seeded discovery profiles`). The six C-03
  contract/REST files are unchanged after their `51e98f9` checkpoint; later
  Search changes are confined to the reviewed Q-02 implementation scope, and
  the checker boundary was reconciled separately by ENV-04.
- The parent Instructor independently reviewed the Q-02 implementation and
  tests. Q-02 focused tests pass 12/12; current checker tests pass 13/13,
  `scope:check`, architecture, artifacts, typecheck, build, lint, workspace
  tests, and diff checks pass. The workspace evidence is 341 passed with 6
  PostgreSQL-gated skips; skips are not PASS evidence. OpenSpec CLI remains
  `UNVERIFIED`; PostgreSQL, Binance/News, real-provider, browser, and demo
  evidence remains `UNVERIFIED` or `BLOCKED` where recorded.
- Active-task inspection must find no other running Cryptox Manager or worker.
  Historical tasks must not be resumed, retried, replaced, or duplicated.

### Authorized packet: `Q-02` closure review

- **Authority and requirements:** `CSL-R-SE-03`, `CSL-R-RP-02`,
  `CSL-R-OB-01`, `CSL-R-LB-01`, DEC-007, DEC-012, DEC-013, ADR-010, and the
  C-03 public-boundary decision. This is a closure review of already executed
  seeded discovery implementation; it creates no new product behavior.
- **Fresh Manager:** create exactly one new Manager in the canonical
  same-directory checkout `D:/agy-cli-projects/AOS/Cryptox`, on branch
  `MVP_IMPLEMENTATION`, with model `gpt-5.6-luna` and `xhigh` reasoning. It
  must read `AGENTS.md` and `docs/control/prompts/ORCHESTRATOR_START.md`
  completely, then verify this signal, `TASKS.md`, `HANDOFF.md`, the DAG,
  current Git, dependencies, and active tasks before editing anything.
- **Worker rule:** no worker is authorized or needed. This packet is limited
  to Manager-owned control-plane reconciliation and closure review; the Manager
  must not create a worker or touch source.
- **Manager-owned write scope:** only `docs/implementation/TASKS.md` and
  `docs/implementation/HANDOFF.md`. Reconcile the Q-02 checkpoint to the
  current Git history and evidence, preserve all exact implementation paths,
  validation results, and `UNVERIFIED`/`BLOCKED` limitations, and update only
  Q-02's operational state/checkpoint text. C-03, ENV-04, and every other task
  state must remain unchanged.

### Acceptance and stop condition

- Verify the original Q-02 write scope: the Domain-guided and Genetic
  generator directories, Search application/profile and infrastructure
  projections excluding canonical contracts, and focused Search tests. Confirm
  no contract, migration, Backtesting, scoring, LLM, frontend, provider,
  queue, or unrelated source was changed by Q-02.
- Verify deterministic seed/config/dataset/code provenance, declared-category
  behavior, Genetic bounded defaults, the 500-candidate/300-second bound,
  finite capacity/lifecycle observability, persistence projections, and public
  Search/Backtesting/Leaderboard lifecycle evidence. Unavailable PostgreSQL or
  provider evidence must remain explicitly unverified.
- If evidence and control records are consistent, move only Q-02
  `REVIEW -> DONE`; otherwise keep Q-02 `REVIEW` and record the precise reason.
  Do not promote B-03 or any downstream packet.
- Commit one coherent Manager checkpoint containing only the two authorized
  control files and stop immediately. No source, contract, migration,
  dependency, provider, frontend, or downstream packet may change.
- After this authorization, renewed Instructor review is required before B-03,
  ENV-03, or any downstream implementation/closure authorization.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
