# Instructor Control

Control schema/version: `LEVEL2-V1`

Instruction ID: `INS-017`

Status: `APPROVED_FOR_EXECUTION`

Allowed statuses: `HOLD`, `APPROVED_FOR_EXECUTION`, `NEEDS_HUMAN_DECISION`

## Reviewed repository checkpoint

- Branch: `MVP_IMPLEMENTATION`
- Reviewed repository HEAD: `ce24396` (`docs(control): record INS-016 validation`)
- Working tree at review: clean. The branch is ahead of
  `origin/MVP_IMPLEMENTATION` by 39 local commits.
- INS-016 is exhausted. Its Orchestrator reconciled and delegated F-AUTH and
  Q-01, but neither bounded worker produced new source or sufficient real-world
  evidence. D-01, AU-01, M-01, L-01, and B-02 remain DONE and must not be
  reassigned or reworked.
- Current checkpoint evidence: F-AUTH retains source commit `8abd6a8`, frontend
  23/23 plus typecheck/build/lint PASS, and an AU-01 PostgreSQL proxy smoke
  PASS; the complete interactive browser credential flow and deployed HTTPS
  HttpOnly-cookie behavior remain UNVERIFIED. Q-01 retains its reviewed
  fake-port phase but has no real SearchRun PostgreSQL or public
  Backtesting/Leaderboard integration evidence. M-02 focused realtime is 9/9
  with full Market Data 23 PASS / 1 skipped, but live Binance remains
  UNVERIFIED. `verify:stage4a` is PASS; formal OpenSpec CLI validation remains
  UNVERIFIED because the CLI is unavailable.
- No source, business-state, or task-DAG drift was found after the INS-016
  checkpoint. The current task board and handoff are authoritative. The latest
  `ce24396` commit is Manager-owned validation-only checkpoint documentation.

## Approved execution frontier

The Orchestrator is authorized to execute exactly these four bounded phases in
parallel, grouped into two review-closure and two initial implementation
packets:

1. `F-AUTH` — complete final real AU-01/browser integration of the existing
   frontend Auth phase.
2. `Q-01` — complete real-port integration of the existing Search phase.
3. `N-01` — implement the News collection, deduplication, persistence/query,
   and provider-neutral boundary packet.
4. `N-02` — implement the local `LEXICON_V1` Sentiment analysis, persistence,
   provenance, and failure-isolation packet.

F-AUTH and Q-01 continue existing REVIEW records. N-01 and N-02 are initial
implementations whose C-01/D-01 start dependencies are satisfied; their later
cross-capability integration remains gated. They do not reassign completed work
or broaden scope. Each bounded implementation packet must be delegated to a
separate worker with a disjoint write scope. B-02 is already DONE at its packet
boundary; M-02 remains REVIEW and is not part of this instruction.

### F-AUTH boundary

- Governing requirements: `AU-01`, `OW-01`, `FE-01`, `DM-01`.
- Start/integration dependencies: `C-01A`, `F-01`, and `AU-01`, all DONE.
- Allowed scope: only `apps/frontend/**` Auth clients, screens, state,
  navigation guards, and tests; use the existing AU-01 public transport and
  HttpOnly cookie boundary.
- Objective: review the existing real-session boundary patch, complete the real
  AU-01 register/login/session restoration/logout integration, and close F-AUTH
  if its protected-navigation and cache-isolation DoD passes.
- Required evidence: real register/login/session restore/logout, protected
  navigation, 401 recovery, private-cache clearing, and truthful cookie behavior.
- Forbidden: backend/module implementation, client-selected identity, browser
  token storage, migrations, or business logic.

### Q-01 boundary

- Governing requirements: `SE-01`, `SE-02`, `LB-01`, `OB-01`, `DM-01`, `AR-02`,
  `OW-01`.
- Start dependencies: `C-01A` and `S-01`, both DONE.
- Integration dependencies: `D-01`, `L-01`, and B-02 DONE under prior approved
  work before the real-port phase starts.
- Allowed scope: only `modules/search/**` except frozen contracts and
  migrations; use public Backtesting and Leaderboard module APIs.
- Objective: integrate the existing seeded SearchRun/Candidate lifecycle with
  real persistence, Backtesting execution, and Leaderboard admission; fix only
  packet-scoped issues found by integration evidence.
- Required evidence: seed determinism, owner-scoped persistence/lifecycle,
  cross-user not-found, bounded stop/cancel/failure behavior, real port/database
  integration, and global gates. Fake-only evidence cannot close Q-01.
- Forbidden: simulation, Candidate persistence implementation outside Search's
  public boundary, score calculation, backend controllers, migrations, or
  automatic AU-02/I-01 work.

### N-01 boundary

- Governing requirements: `RD-01`, `NW-01`, `SN-01` isolation, `OB-01`,
  `DM-01`.
- Start dependencies: `C-01` and `D-01`, both DONE. N-02 and I-01 are later
  integration dependencies, not prerequisites for this initial packet.
- Allowed scope: only `modules/news/**` except frozen contracts and migrations;
  use the approved News provider and Sentiment public boundary.
- Objective: implement normalized provider-neutral News collection, persistence,
  provider-GUID deduplication, deterministic owner-independent queries, and
  malformed-item/provider-failure isolation. Keep provider internals behind the
  News infrastructure boundary.
- Required evidence: fixture/provider normalization, deduplication, query
  determinism, malformed-item isolation, provider outage behavior, persistence,
  and truthful Sentiment-failure isolation through the public boundary. Live
  CoinDesk evidence may remain separately `UNVERIFIED` when unavailable.
- Forbidden: Sentiment implementation or tables, crawling/LLM, frontend,
  migrations, and edits outside `modules/news/**`.

### N-02 boundary

- Governing requirements: `SN-01`, `OB-01`, `AR-02`, `AR-03`, `DM-01`.
- Start dependencies: `C-01` and `D-01`, both DONE. N-01 and I-01 are later
  integration dependencies, not prerequisites for this initial packet.
- Allowed scope: only `modules/sentiment/**` except frozen contracts and
  migrations; use the approved neutral analysis input and application ports.
- Objective: implement deterministic local `LEXICON_V1` analysis, normalized
  scoring, persistence, model/version provenance, and isolated failure/missing
  result behavior.
- Required evidence: positive/neutral/negative fixtures, finite normalized
  scores, deterministic repeat, documented negation/intensifier policy,
  provenance, invalid/exception no-write behavior, and explicit missing-result
  reads.
- Forbidden: News persistence, hosted APIs, model downloads, ONNX/Transformers,
  LLM, SentimentStrategy, migrations, and edits outside
  `modules/sentiment/**`.

## Orchestrator operating rules

Before assigning work, compare this reviewed checkpoint with current Git and
verify the non-stale `INS-017` signal, task readiness after any justified
blocked/review-to-ready reconciliation, dependencies, and disjoint write
scopes. Delegate F-AUTH, Q-01, N-01, and N-02 implementation work to four
separate workers. The Orchestrator alone changes `TASKS.md`/`HANDOFF.md`,
reviews and integrates worker output, runs applicable gates, records exact
commits and evidence, and stops when this authorization is exhausted.

Do not start M-02 rework, B-02 rework, AU-02, I-01, I-02, or F-02. Do not
promote N-01/N-02 into I-01 or claim final live-provider/demo completion from
fixture-only evidence. M-02 remains REVIEW with its live-provider limitation;
carry that evidence to a later explicitly authorized integration gate. A new
Instructor review and Instruction ID are required for the next frontier.

## Explicitly not authorized

- Reassignment or rework of D-01, AU-01, M-01, L-01, or B-02.
- M-02 source/rework, AU-02, F-02, I-01, I-02, or any other unfinished packet
  outside the four explicitly authorized phases.
- Migrations, frozen contract changes, scope expansion, deferred enterprise
  identity/queue/distributed/risk/AI features, or automatic follow-on work.

Authorization ends after the authorized F-AUTH/Q-01 review closures and N-01/N-02
initial packets are reviewed/integrated, or when a required evidence/environment
gate blocks safe completion. A fresh Instructor review and new Instruction ID are
required afterward.

## Canonical references

- [Contributor rules](../../AGENTS.md)
- [Decision ledger](./DECISIONS.md)
- [Task state](../implementation/TASKS.md)
- [Latest execution checkpoint](../implementation/HANDOFF.md)
- [Implementation program](../implementation/MVP_PLAN.md)
- [Requirements](../requirements.md)
- [Architecture](../architecture.md)
- [Data model](../data-model.md)
- [ADR-001](../adr/ADR_001_websocket.md)
- [ADR-005](../adr/ADR_005_module_first_structure.md)
- [ADR-006](../adr/ADR_006_local_backtest_execution.md)
- [ADR-007](../adr/ADR_007_practical_reproducibility.md)
- [ADR-008](../adr/ADR_008_simple_auth_and_per_user_ownership.md)
- [Active capability specifications](../../openspec/specs/)
- [Active MVP change](../../openspec/changes/mvp-implementation/)

Notes: this is the current execution signal, not a task board or implementation
handoff. No feature implementation is performed by this Instructor update.
