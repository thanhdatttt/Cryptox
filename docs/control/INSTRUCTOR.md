# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-062`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-062 — post-ENV-04 closure hold

This replaceable signal supersedes `INS-061 / APPROVED_FOR_EXECUTION`. ENV-04
is now closed, but no new implementation packet is authorized until the next
frontier is independently reviewed against the current DAG and evidence.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- HEAD: `4c964f6` (`checkpoint(env-04): close reconciled validation gate`).
- ENV-04 is `DONE`; Q-02 remains `REVIEW`. The current board has 27 `DONE`,
  7 `REVIEW`, and 8 `BLOCKED` rows out of 42 packet rows.
- The ENV-04 implementation and closure checkpoints are clean and contain only
  their authorized checker files and Manager-owned control-plane updates.
  `npm run test:scope-check` passed 13/13; `scope:check`, architecture, and
  artifacts checks passed. OpenSpec remains `UNVERIFIED`; PostgreSQL-gated and
  real provider/demo evidence remains `UNVERIFIED` or `BLOCKED` where recorded.
- Git is clean. Active-task inspection found no running Cryptox Manager or
  worker after the completed ENV-04 Manager was archived. Historical tasks
  must not be resumed, retried, replaced, or duplicated.

### Hold boundary

- Do not start, retry, replace, or duplicate any worker or implementation
  packet under this signal. Q-02, C-03, B-03, ENV-03, M-02, M-03, N-03, S-04,
  E-02, L-02, F-03, I-01, I-02, I-03, and AU-02 remain unauthorized here.
- Before a new authorization, independently review the relevant source,
  checkpoint, requirements, ADRs, architecture/data model, active specs, and
  DAG. Verify a clean Git tree, current signal applicability, dependencies,
  and no active Cryptox Manager/worker.
- The next authorization should first address the highest-priority REVIEW
  prerequisite for the E1 frontier, with an explicit packet, requirement IDs,
  exact write scope, acceptance criteria, validation gates, prohibitions, and
  stop condition. A closure-only packet may use a Manager without a worker;
  any bounded implementation with an independent write scope must use exactly
  one fresh authorized worker.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Current checkpoint](../implementation/HANDOFF.md)
