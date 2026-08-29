# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-054`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-054 — Hold after ENV-03 checker reconciliation

This replaceable signal supersedes `INS-053 / APPROVED_FOR_EXECUTION`. It
authorizes no packet while the Instructor reconciles the next executable
frontier.

### Reviewed checkpoint and repository state

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD is `0bc215f5781a7a2860d439b3b4953104a99d9e3a`, the single
  four-path `ENV-03` checkpoint commit. Git status is clean.
- ENV-03 is `REVIEW` after exactly one fresh Manager and one fresh checker
  worker. `ENV-02` remains `DONE`; B-03 remains `REVIEW` at source checkpoint
  `692754051f2c43bf7ab70a453adb1b9c9d3ca6d4`; no source, contract, migration,
  or task state was promoted outside ENV-03. M-03 and N-03 remain `REVIEW`,
  S-05/S-06 remain `DONE`, and M-02 remains `REVIEW/UNVERIFIED`.
- The current task board contains 40 packets: 26 `DONE`, 5 `REVIEW`, 9
  `BLOCKED`; no `IN_PROGRESS` task remains. Active-task inspection found no
  Cryptox Manager or worker. Historical tasks and workers will not be reused.

### Independent ENV-03 review result

- `npm run test:scope-check`: `PASS` — 9/9, including positive coverage for
  Backtesting domain/application/infrastructure and near-match/unrelated
  negatives.
- `npm run scope:check`: `PASS` against the current B-03 source.
- `npm run arch:check`, `npm run artifacts:check`, `npm run typecheck`,
  `npm run build`, `npm run lint`, and `git diff --check`: `PASS` per the
  Manager's independent run; exact committed paths are the two checker files
  and Manager-owned `TASKS.md`/`HANDOFF.md` only.
- OpenSpec CLI remains `UNVERIFIED` because it is unavailable. ENV-03 does not
  claim PostgreSQL, Binance, or any real-provider evidence.

### Frontier reconciliation before the next signal

- B-03's approved source behavior now has a clean deferred-scope gate, but its
  required real PostgreSQL/provider evidence remains `BLOCKED`/`UNVERIFIED`;
  it stays `REVIEW` until a bounded closure review determines whether those
  limitations belong to the final integration gate or this packet's DoD.
- Q-02 is not yet executable under its current plan scope: the approved
  `DOMAIN_GUIDED_V1` and `GENETIC_V1` profile identifiers exist in Search
  provenance constants, but canonical `GeneratorType`/`StrategyGenerator`
  contracts and the application generator map currently support only `RANDOM`.
  `MVP_PLAN.md` currently excludes those canonical contracts from Q-02's write
  scope. This is a material source-reconciliation boundary, not permission to
  let a worker edit frozen contracts implicitly.
- Before Q-02 can be authorized, the Instructor must record a narrowly bounded
  decision and packet for the required canonical Search contract/port
  reconciliation, or explicitly resolve the conflict as a human decision. No
  Q-02 source work may start under this signal.
- S-04 remains blocked pending its controlled LLM-authoring path and safe URL
  dependency; E-02/L-02/F-03/I-03 remain blocked by their recorded DAG. M-03,
  N-03, M-02, AU-02, I-01, and I-02 retain their recorded evidence and are not
  silently promoted.

### Stop boundary

No Manager or worker may be created under `INS-054`. The next authorization
must name the exact Search contract-reconciliation paths and acceptance tests,
or a different packet whose dependencies and authority are independently
proven. No task state is changed by this signal.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
