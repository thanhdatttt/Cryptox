# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-056`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-056 — Post-C-03 independent review hold

This replaceable signal supersedes `INS-055 / APPROVED_FOR_EXECUTION`. The
Instructor independently reviewed the completed C-03 Manager checkpoint and is
holding the control plane before issuing a separate authorization for the next
packet.

### Reviewed checkpoint and current frontier

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `51e98f9d5edd545831007dc6ce105701384bfd44`, the exact C-03
  checkpoint commit. The working tree is clean after independent review.
- C-03 remains `REVIEW` in `TASKS.md`, as required by its Manager-owned
  checkpoint boundary. The Instructor does not change operational task state.
- C-02 is `DONE`; ENV-03 is `REVIEW` with its checker gate passing; Q-02 is
  still `BLOCKED`. M-03, B-03, and N-03 remain `REVIEW` with their recorded
  provider/database limitations; S-05, S-06, and ENV-02 remain `DONE`.
- No active Cryptox Manager or worker remains. The INS-055 Manager and its
  single worker are archived after the checkpoint; no historical task is being
  resumed, replaced, retried, or duplicated.

### C-03 independent review result

- The exact C-03 diff contains only the eight authorized Search contract/REST/
  checker paths plus Manager-owned `TASKS.md` and `HANDOFF.md`.
- The canonical Search contract now exposes the approved `RANDOM`,
  `DOMAIN_GUIDED`, and `GENETIC` modes, typed future registry slots, bounded
  seeded provenance, owner-free client commands, strict REST values/profile
  validation, and exact canonical REST checker recognition. No Q-02 algorithm,
  Search lifecycle, persistence, migration, provider, frontend, queue, LLM, or
  unrelated source behavior was added.
- Independent focused Search/API/REST tests: **PASS**, 9/9.
- Independent deferred-scope tests: **PASS**, 10/10; `npm run scope:check`:
  **PASS**.
- Independent architecture, artifacts, typecheck, build, lint, full workspace
  tests, whitespace, and control-plane path checks: **PASS**. Full workspace:
  332 passed; 6 environment-gated tests were skipped and are not PASS evidence.
- OpenSpec CLI remains **UNVERIFIED** because the executable is unavailable.
  Real PostgreSQL/Binance evidence is not claimed by this contract packet.

### Next candidate, not yet authorized

Q-02 is the next technical frontier: implement the separately approved seeded
`DOMAIN_GUIDED_V1` and `GENETIC_V1` Search profiles under its exact plan scope,
after confirming C-03's reviewed contract boundary. Q-02 remains blocked until
a new Instructor signal explicitly names its worker, paths, acceptance,
validation, dependencies, prohibitions, and stop condition. The Q-02 feature
packet must not silently broaden the deferred-scope checker; any checker
boundary reconciliation required by its actual paths must be separately
reviewed and authorized.

No source implementation is authorized by `INS-056 / HOLD`.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [MVP plan](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [C-03 checkpoint](../implementation/HANDOFF.md)
