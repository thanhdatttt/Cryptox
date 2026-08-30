# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-064`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-064 — post-C-03 closure hold

This replaceable signal supersedes `INS-063 / APPROVED_FOR_EXECUTION`. C-03 is
now closed, but no new packet is authorized until the next E1 frontier is
independently reviewed against the current repository state.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- HEAD: `a115025` (`checkpoint(c-03): close contract reconciliation`).
- C-03 is `DONE`; ENV-04 is `DONE`; Q-02 remains `REVIEW`. The current board
  has 28 `DONE`, 6 `REVIEW`, and 8 `BLOCKED` rows out of 42 packet rows.
- The C-03 closure checkpoint contains only Manager-owned `TASKS.md` and
  `HANDOFF.md` updates. Focused C-03 tests passed 9/9, current checker tests
  passed 13/13, and scope, architecture, artifacts, typecheck, build, lint,
  workspace-test, and diff-check evidence passed. OpenSpec remains
  `UNVERIFIED`; PostgreSQL-gated and real provider/demo evidence remains
  `UNVERIFIED` or `BLOCKED` where recorded.
- Git is clean. Active-task inspection found no running Cryptox Manager or
  worker after the completed C-03 Manager was archived. Historical tasks must
  not be resumed, retried, replaced, or duplicated.

### Hold boundary

- Do not start, retry, replace, or duplicate any worker or implementation
  packet under this signal. Q-02, B-03, ENV-03, M-02, M-03, N-03, S-04, E-02,
  L-02, F-03, I-01, I-02, I-03, and AU-02 remain unauthorized here.
- Before a new authorization, independently review the relevant source,
  checkpoint, requirements, ADRs, architecture/data model, active specs, and
  DAG. Verify a clean Git tree, current signal applicability, dependencies,
  and no active Cryptox Manager/worker.
- The next authorization must name its packet, requirement IDs, exact write
  scope, acceptance criteria, validation gates, prohibitions, and stop
  condition. A closure-only packet may use a Manager without a worker; any
  bounded implementation with an independent write scope must use exactly one
  fresh authorized worker.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
