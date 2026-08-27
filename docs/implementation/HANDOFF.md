# MVP Implementation Checkpoint

## Resume here

- **Current stage:** MVP Implementation
- **Current wave:** Wave 1 — executable contract and behavior freeze
- **Branch:** `MVP_IMPLEMENTATION`
- **P-00 base HEAD:** `6786949f8bc9e72f4f08808a468bea1f62fd9b60`
- **Checkpoint HEAD:** The commit containing this file; resolve it with
  `git rev-parse HEAD` or `git log -1 --oneline` after checkout.
- **Task state:** P-00 DONE; C-01 READY; every other task BLOCKED.
- **Next action:** Execute C-01 only. Do not begin code-task fan-out until its
  contracts are reviewed, validated, committed, and recorded in this checkpoint.

Read [`AGENTS.md`](../../AGENTS.md), then the authority chain it specifies, the
active [`mvp-implementation` change](../../openspec/changes/mvp-implementation/),
the full [`MVP_PLAN.md`](MVP_PLAN.md), and the mutable [`TASKS.md`](TASKS.md).

## Decisions that are closed

- Ranking is versioned `LINEAR_REQUIRED_V1`: 50% Return, 30% Win Rate, minus
  20% drawdown magnitude; eligibility and deterministic ties are defined in the
  plan; Top-K is configurable with demo default K=10.
- Built-ins follow `TECHNICAL_PROFILES_V1`: SMA 20/50, Wilder RSI 14/30/70,
  Bollinger SMA20/population deviation/2x, and prior-window Support/Resistance
  with 20 candles and 0.5% proximity. Signals execute no earlier than the next
  candle open.
- Composites use equal-weight `MAJORITY_VOTE_V1`; a unique highest BUY/SELL/HOLD
  count wins and every tie yields HOLD.
- CoinDesk Data API is the primary live News adapter; deterministic tests and
  acceptance use fixtures.
- Sentiment is deterministic local `LEXICON_V1`. Do not introduce hosted APIs,
  model downloads, ONNX, Transformers, or LLM infrastructure.
- Demo defaults are BTCUSDT, 5m/15m/1h/4h, 30 days, 10,000 USDT, 0.1% fee,
  zero slippage, one full-capital long position, and K=10; these remain configurable.

Do not reopen these choices during implementation. A genuinely new business
decision returns to human review and updates the approved change before code.

## Dependency and execution guardrails

The controlling computation path is:

```text
P-00 -> C-01 -> S-01 -> B-01 -> B-02 -> I-01 -> I-02
```

D-01, E-01, and L-01 are parallel prerequisites that must finish before B-02.
B-01 starts after C-01 and S-01 using fixtures and fake strategies; it must not
wait for M-01 or real built-ins. B-02 starts after D-01, S-01, B-01, E-01, and
L-01; M-01 and S-02/S-03 are integration dependencies before I-01/I-02. Q-01
starts after C-01 and S-01 against fakes, then needs D-01/L-01/B-02 to finish.

Only the Manager changes states in `TASKS.md`. Maximum useful concurrency after
the C-01 checkpoint is one Manager plus three workers with disjoint write scopes.

## P-00 result

- Completed Stage 4A was archived at
  [`openspec/changes/archive/2026-08-27-stage-4a-structural-source-reconciliation`](../../openspec/changes/archive/2026-08-27-stage-4a-structural-source-reconciliation/).
- Its one-time structural delta was not copied into canonical capability specs;
  the closure explains why and records OpenSpec CLI validation as UNVERIFIED.
- Active governance now lives at
  [`openspec/changes/mvp-implementation`](../../openspec/changes/mvp-implementation/).
- The only Stage 5.1 additions under `docs/implementation/` are this checkpoint,
  the full plan, and the mutable task board.
- No application source, executable contract, migration, runtime, dependency, or
  feature implementation was changed in P-00.

## Validation status and limitations

- Documentation links, task inventory/state, dependency corrections, approved
  decision persistence, changed-path scope, and whitespace checks: PASS.
- Repository architecture, artifact, and deferred-scope checks: PASS.
- Formal OpenSpec CLI validation: **UNVERIFIED** because the CLI is unavailable;
  no substitute is reported as formal OpenSpec validation.
- Runtime build/typecheck/test suites were not rerun for this documentation-only
  checkpoint. The previously reviewed Stage 5 baseline at the base HEAD passed;
  P-00 makes no executable changes.
- Public Binance/CoinDesk access, credentials, and PostgreSQL/Docker remain later
  task concerns and do not block C-01.

## Fresh-agent restart procedure

1. Confirm the branch and checkpoint HEAD, then verify the working tree is clean.
2. Read the authority chain and the five active program artifacts linked above.
3. Confirm `TASKS.md` still shows exactly C-01 READY and every other unfinished
   task BLOCKED.
4. Claim C-01, record its owner/branch/starting commit, and change it to
   IN_PROGRESS before editing within its bounded contract scope.
5. Stop for human review if C-01 exposes a materially new product decision.
6. When C-01 passes all applicable checks, update `TASKS.md`, replace this file
   with the new checkpoint, and create the next coherent local commit.
