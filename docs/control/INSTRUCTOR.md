# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-070`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-070 — post-B-03 frontier review

This replaceable signal supersedes `INS-069 / APPROVED_FOR_EXECUTION`. The
B-03 closure authorization is exhausted and no new implementation or closure
packet is authorized by this `HOLD`.

### Reviewed checkpoint and current frontier

-- Branch: `MVP_IMPLEMENTATION`; current HEAD is `259f4a6`
  (`checkpoint(b-03): close synthetic paper reconciliation`); the parent
  Instructor reviewed the resulting governance diff and Git is clean at the
  checkpoint.
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

### Pending Instructor review

- M-03 is the next bounded candidate for a Manager-only closure review. Its
  plan allows the provider limitation to remain explicitly unavailable when
  the amended realtime behavior, ephemeral observability boundary, and
  deterministic local evidence are proven; this is not yet an authorization.
- N-03 requires a separate review of the missing auto-refresh scheduler before
  closure or any narrowly scoped completion authorization. S-04 remains
  blocked on N-03 and controlled LLM-authoring evidence. E-02 and all later
  joins remain blocked by their stated DAG dependencies. AU-02 remains a
  human-decision item and is not retried.

### Stop condition

- No Manager or worker may be created under INS-070. Before any next signal,
  the Instructor must recheck Git, the current checkpoint, the task DAG, and
  active task status. Any new authorization must name one bounded packet or
  explicitly safe closure group, its exact write scope, acceptance and
  validation evidence, dependencies, prohibitions, and stop condition.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
