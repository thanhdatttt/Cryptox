# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-072`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-072 — post-M-03 frontier review

This replaceable signal supersedes `INS-071 / APPROVED_FOR_EXECUTION`. The
M-03 closure authorization is exhausted and no new implementation, closure,
worker, or downstream packet is authorized by this `HOLD`.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`; current HEAD is `280b280`
  (`checkpoint(m-03): close realtime market delivery`). The parent Instructor
  independently audited the Manager diff and Git is clean at the checkpoint.
- The operational board contains 32 `DONE`, 2 `REVIEW` (`M-02`, `N-03`), and 8
  `BLOCKED` (`AU-02`, `S-04`, `I-01`, `I-02`, `E-02`, `L-02`, `F-03`, `I-03`)
  rows, 42 rows total. Packet-state progress is therefore 76.2%; this is not
  final MVP acceptance.
- M-03 moved exactly `REVIEW -> DONE` under INS-071. Its nine implementation/
  test paths remain identical to source checkpoint `b73b298`; focused Market
  Data evidence is 31 passed with one environment-gated PostgreSQL test
  skipped, and the market WebSocket contract suite is 5/5. B-03, Q-02, C-03,
  ENV-03, and ENV-04 remain `DONE`; no downstream packet was promoted.
- The current checker has 13/13 focused tests passing; the relevant local
  architecture, artifact, scope, typecheck, build, lint, and diff gates pass in
  the reviewed checkpoints. Real PostgreSQL, configured Binance and News
  providers, browser/demo runtime, link/DAG automation, and OpenSpec CLI
  evidence remain `UNVERIFIED` or `BLOCKED` where recorded. No unavailable
  check, fixture, or skipped test is treated as `PASS`.

### Pending Instructor review

- N-03 remains `REVIEW` because its implementation has a recorded
  `PARTIAL/UNVERIFIED` auto-refresh scheduler gap; the existing 1–5 minute
  setting and five-minute default do not prove a scheduler. Any completion
  work would need a fresh, separately bounded authorization with exact News/
  Sentiment write scope and a worker, after confirming the required behavior
  against the plan and source.
- M-02 remains historical `REVIEW/UNVERIFIED` and is not retried or silently
  promoted. S-04 remains blocked on N-03 and controlled LLM-authoring evidence.
  E-02 and later joins remain blocked by their stated DAG dependencies. AU-02
  remains a human-decision item and is not retried.

### Stop condition

- No Manager or worker may be created under INS-072. Before any next signal,
  the Instructor must recheck Git, the current checkpoint, the task DAG, and
  active task status. Any new authorization must name one bounded packet or
  explicitly safe closure/completion scope, exact write scope, acceptance and
  validation evidence, dependencies, prohibitions, and stop condition.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
