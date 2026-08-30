# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-058`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-058 — Q-02 independent review hold

This replaceable signal supersedes `INS-057 / APPROVED_FOR_EXECUTION`. Q-02 has
reached a safe `REVIEW` checkpoint, but the repository remains on hold until
the separate deferred-scope checker boundary is reconciled. No feature,
checker, retry, or downstream packet is authorized by this signal.

### Reviewed checkpoint and evidence

- Branch: `MVP_IMPLEMENTATION`.
- Reviewed checkpoint commit: `95cb98463f60c35f71dda2f7832f0aa9ad22a30c`
  (`feat(search): implement seeded discovery profiles`). The working tree is
  clean after the checkpoint commit.
- Q-02 moved only through `BLOCKED -> READY -> IN_PROGRESS -> REVIEW`.
  `TASKS.md` and `HANDOFF.md` record the Manager checkpoint; Q-02 is not
  `DONE`.
- Exactly one fresh Q-02 worker was used and is now stopped/archived. The
  Manager was fresh, used the canonical same-directory checkout, performed
  the independent scope/test review, and is now stopped/archived. No Cryptox
  Manager or worker is active.
- The implementation diff is limited to the eleven authorized Search
  implementation/test paths plus Manager-owned `TASKS.md` and `HANDOFF.md`.
  No canonical contract, migration, frontend, provider, queue, unrelated
  module, or checker file changed.
- Independent validation: full workspace tests `341 passed` with `6`
  environment-gated skips; Search tests `32 passed` with `1` PostgreSQL
  integration skip; architecture, artifacts, typecheck, build, lint, and
  `git diff --check` pass. Skips are not PASS evidence. OpenSpec CLI and real
  PostgreSQL integration are `UNVERIFIED`.
- `npm run scope:check` is `BLOCKED` with exactly these findings:
  `modules/search/application/service.ts` contains approved
  `DOMAIN_GUIDED_V1` and `GENETIC_V1` outside the current supported boundary;
  `modules/search/domain/generators/domain-guided/domain-guided-generator.ts`
  contains `DOMAIN_GUIDED_V1` outside the boundary; and
  `modules/search/domain/generators/genetic/genetic-generator.ts` contains
  `GENETIC_V1` outside the boundary.

### Instructor disposition

- Preserve the Q-02 source checkpoint at `REVIEW`; do not promote it to `DONE`
  while the required checker gate is blocked.
- The checker findings are an executable-policy boundary mismatch, not a
  source implementation authorization. A distinct, narrowly scoped
  post-Q-02 checker reconciliation packet must be planned and authorized
  separately. It may update only the checker and its focused tests/helpers as
  explicitly listed in that packet, while continuing to reject all deferred
  enterprise identity, queue/distributed, risk/live-trading, autonomous or
  unconfigured LLM, and strict-replay scope.
- No agent may weaken, bypass, generically exclude, or hide the checker
  findings. No Q-02 retry, source repair, or downstream packet may start under
  `INS-058`.

### References

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Q-02 checkpoint](../implementation/HANDOFF.md)
