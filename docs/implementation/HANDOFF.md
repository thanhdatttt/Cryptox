# INS-024 Execution Checkpoint

## Resume here

- **Authorization:** `INS-024 / APPROVED_FOR_EXECUTION`, exactly
  `RB-01 — DEC-007 Documentation Reconciliation Planning`. This authorization
  is exhausted by this documentation checkpoint; it authorizes no feature task,
  worker, retry, source change, or downstream start.
- **Reviewed re-baseline commit:** `496d5a34b76841b9f5b142fa512225f502f5fa26`
  on `MVP_IMPLEMENTATION`.
- **Authorization signal commit:** `4df3961ad790ae3a5954f1648e47f8f59903cfb5`
  (`docs(control): authorize DEC-007 planning reconciliation`).
- **Applicability:** PASS before the RB-01 edits. The only commit after the
  reviewed re-baseline was the expected Instructor signal, and its only changed
  path was `docs/control/INSTRUCTOR.md`. The starting worktree was clean. The
  active Cryptox project had no other active Manager/Orchestrator/worker task;
  this task was the sole active Orchestrator.
- **Allowed paths used:** Only `docs/implementation/MVP_PLAN.md`,
  `docs/implementation/TASKS.md`, and `docs/implementation/HANDOFF.md`.
- **Forbidden paths untouched:** Source, executable contracts, migrations,
  runtime configuration, frontend implementation, requirements, decisions,
  ADRs, architecture, data model, OpenSpec files, and generated artifacts.

## RB-01 result

`RB-01` adds the DEC-007 extension planning baseline and preserves all existing
task states and completion evidence. It does not claim that any existing `DONE`
packet satisfies a newly approved extension requirement.

New task IDs and final planned state:

| Task | State | Purpose |
|---|---|---|
| `RB-01` | DONE | This Manager-owned documentation reconciliation |
| `C-02` | BLOCKED | Earliest contract/data-model/migration reconciliation gate |
| `M-03` | BLOCKED | Amended realtime behavior and `MARKET_OBSERVABILITY_V1` |
| `S-04` | BLOCKED | Controlled `LLM_AUTHORING_V1` drafts and approval |
| `S-05` | BLOCKED | Immutable `WEIGHTED_VOTE_V1` composite |
| `S-06` | BLOCKED | Deterministic `SMC_LITE_V1` and `WYCKOFF_LITE_V1` plugins |
| `Q-02` | BLOCKED | Seeded `DOMAIN_GUIDED_V1` and `GENETIC_V1` discovery |
| `B-03` | BLOCKED | Synthetic Long/Short paper execution and provenance |
| `N-03` | BLOCKED | Safe URL import and versioned extraction refinement |
| `E-02` | BLOCKED | Decimal-boundary Evaluation reconciliation |
| `L-02` | BLOCKED | Extension-aware ranking and provenance admission |
| `F-03` | BLOCKED | DEC-007 functional-state frontend projections |
| `I-03` | BLOCKED | Cross-boundary integration and reproducibility proof |

`C-02` is the only future gate that can open extension fan-out. The planned
topological order is:

```text
RB-01 DONE
  -> C-02 BLOCKED
       -> { M-03, S-04, S-05, S-06, Q-02, B-03, N-03 } BLOCKED
       -> E-02 BLOCKED after B-03
       -> L-02 BLOCKED after Q-02, B-03, and E-02
       -> F-03 BLOCKED after all E1/E2 extension packets
       -> I-03 BLOCKED after F-03, baseline I-01, and AU-02
       -> I-02 BLOCKED after I-03 for final required demo/verification
```

Shared joins are recorded in `MVP_PLAN.md`: safe News content enters Strategy
through the public boundary; Search uses the Backtesting execution boundary;
Backtesting sends decimal-normalized results to Evaluation; Evaluation feeds
finite metrics to Leaderboard; News invokes Sentiment through its neutral
boundary; and ephemeral Market Data observability remains delivery/frontend
state and never becomes historical backtest input.

## Preserved baseline and blockers

- Existing `DONE` baseline remains unchanged: `P-00`, `C-01`, `A-00`, `C-01A`,
  `D-01`, `M-01`, `S-01`, `S-02`, `S-03`, `E-01`, `L-01`, `B-01`, `B-02`,
  `Q-01`, `N-01`, `N-02`, `F-01`, `F-AUTH`, and `F-02`. Their original commits,
  scopes, tests, and limitations remain recorded in `TASKS.md` and
  `MVP_PLAN.md` as historical baseline evidence only.
- `M-02` remains `REVIEW/UNVERIFIED`; its live Binance reconnect limitation is
  not promoted, retried, or rewritten by RB-01.
- `AU-02` remains `BLOCKED/UNVERIFIED`; its final retry is not repeated.
- `I-01` and `I-02` remain `BLOCKED`; neither is started. The new `I-03` proof
  is also `BLOCKED` and does not authorize either baseline integration task.
- The extension frontier is not READY. No worker, subagent, worktree, source
  implementation, contract change, migration, runtime change, or frontend
  implementation was started under `INS-024`.
- Live Binance, real News, PostgreSQL/application integration, ownership
  security, and final end-to-end evidence remain unresolved where the baseline
  records them as `UNVERIFIED` or `BLOCKED`.

## Validation

- **Applicability and reviewed-checkpoint proof:** PASS. Starting HEAD was
  `4df3961ad790ae3a5954f1648e47f8f59903cfb5`; `496d5a3..4df3961` changed only
  `docs/control/INSTRUCTOR.md`; no source/business/task-DAG drift was found.
- **Active-task check:** PASS. Thread inspection found this Orchestrator as the
  only active Cryptox project task; no other active Manager/worker was present.
- **Changed-path proof:** PASS. The RB-01 diff is limited to the three allowed
  `docs/implementation/` files.
- **Requirement traceability:** PASS. All amended IDs are mapped to new packets:
  `CSL-R-MD-02`/`03`→`M-03`; `CSL-R-ST-05`→`S-04`; `CSL-R-ST-06`→`S-05`;
  `CSL-R-ST-07`→`S-06`; `CSL-R-SE-03`→`Q-02`; `CSL-R-BT-02`→`B-03`;
  `CSL-R-NW-02`→`N-03`; and `CSL-R-RP-02`→`S-04`, `S-05`, `Q-02`, `B-03`,
  `N-03`, `E-02`, and `L-02`, with final proof in `I-03`.
- **DAG/state consistency:** PASS. `MVP_PLAN.md`, `TASKS.md`, and this
  checkpoint agree on the new IDs, topological order, exact blocked states,
  preserved `M-02`/`AU-02`/`I-01`/`I-02` states, and C-02 as the earliest gate.
- **Documentation/link review:** PASS. New packet references point to the
  corresponding `MVP_PLAN.md` sections and the canonical authority links remain
  intact.
- **Whitespace:** `git diff --check` PASS.
- **Deferred-scope check:** PASS; no deferred enterprise Auth, queue/distributed,
  risk, or strict-replay leakage was found.
- **Source-artifact check:** PASS; no source-adjacent generated module artifacts
  were found.
- **Architecture check:** PASS; dependency and architecture-rule checks exited
  successfully (75 modules / 197 dependencies; the expected nine forbidden
  dependency fixtures were detected).
- **Formal OpenSpec CLI:** `UNVERIFIED` because the CLI is unavailable in this
  environment; no inherited PASS is claimed.
- **Feature/build/test/runtime validation:** Not run and not required for this
  documentation-only packet; no implementation was started.

## Commit and next frontier

- **RB-01 checkpoint commit:** the coherent commit containing this current
  checkpoint, with the exact resulting hash returned by the Manager after
  commit. The reviewed authority commits are the exact hashes recorded above.
- **Task-state transitions:** `RB-01` completed its Manager-owned documentation
  lifecycle; all new feature/reconciliation packets were allocated as
  `BLOCKED`; no existing task state changed.
- **Next frontier:** stop and require an independent Instructor review and a new
  explicit signal. The expected safe next packet is `C-02`, but it is not READY
  or authorized by `INS-024`.
- **Final status target:** `MVP_IMPLEMENTATION` with a clean worktree after the
  coherent RB-01 commit. No implementation was started.
