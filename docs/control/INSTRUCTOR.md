# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-050`

Status: `HOLD`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## INS-050 — Hold after the M-03 recovery checkpoint

This replaceable signal supersedes `INS-049 / APPROVED_FOR_EXECUTION`. The
authorized M-03 recovery reached a safe Manager checkpoint and is now exhausted;
no packet is currently authorized. M-03 is accepted at `REVIEW`, not `DONE`,
because the required real-provider gate is unavailable.

### Reviewed checkpoint

- Branch: `MVP_IMPLEMENTATION`.
- Current HEAD: `b73b298726418d502f396b4f7ed29c1afbbdcf20`, the coherent M-03
  Manager checkpoint; the working tree is clean.
- M-03 transitioned exactly `IN_PROGRESS -> REVIEW` under the fresh INS-049
  Manager and one fresh Market Data worker. The interrupted historical Anscombe
  worker was not resumed, replaced, retried, or duplicated.
- M-03 source is limited to the authorized Market Data API/application/
  infrastructure and focused tests; frozen API contracts, REST/WebSocket
  contracts, frontend, migrations, dependencies, runtime composition, event bus,
  other modules, and control artifacts outside Manager-owned checkpoint files
  were not changed.
- M-03 checkpoint commit reports Market Data `31 passed / 1 skipped`, root
  `318 passed / 6 skipped`, and architecture, artifacts, scope, typecheck,
  build, lint, and diff checks `PASS`. Environment-gated PostgreSQL is not PASS.
- Independent review confirmed pair/timeframe candle ordering and suppression,
  bounded reconnect/gap/shutdown behavior, Binance kline/trade normalization,
  four-subscription isolation, provider-failure containment, and the dedicated
  clone-read latest-100 ephemeral tick projection. No observability state enters
  CandleRepository, snapshots, Backtesting, or replay.
- Real configured Binance historical/realtime smoke is `UNVERIFIED`; PostgreSQL
  integration is `BLOCKED/UNVERIFIED` because `DATABASE_URL` is unavailable.
  OpenSpec CLI, browser/runtime, and link/DAG automation remain `UNVERIFIED` or
  `BLOCKED`. Fixture evidence is not promoted to a real-provider PASS.
- N-03 remains `REVIEW` at source/business checkpoint
  `d4161ec458c869ff18fa89dd9732df260629c915`; M-02 remains
  `REVIEW/UNVERIFIED`. S-05, S-06, and ENV-02 remain `DONE`. S-04, Q-02, B-03,
  and later integration/finalization packets remain `BLOCKED`.
- The completed M-03 Manager and worker are inactive. No Cryptox Manager or
  worker is active, and no duplicate task may be created from this checkpoint.

### Hold boundary

- Do not start, promote, or retry any packet while this signal is `HOLD`.
- Before the next authorization, the Instructor must re-read the current task
  DAG and source frontier, verify clean Git/no active Cryptox agents, and choose
  one bounded packet whose dependencies and write scope are explicitly safe.
- No agent may infer authorization from `READY`; no downstream packet is
  automatically unlocked by M-03 `REVIEW`.

### Deferred and prohibited feature scope

`M-02`, `S-04`, `Q-02`, `B-03`, `N-03`, `E-02`, `L-02`, `F-03`, `I-03`,
`AU-02`, `I-01`, `I-02`, and all deferred enterprise identity, queue/distributed,
risk, autonomous-LLM, strict-replay, cloud-database, secrets, or unrelated
scope remain unauthorized until a later explicit signal.

### Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
