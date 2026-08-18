# Spec: Backtest Log and Audit Trail (modules/backtesting)

This document is normative. MUST and MUST NOT are required behavior; SHOULD is
the default unless an explicit implementation constraint is recorded. The
branch-main specifications and shared contracts are the compatibility baseline.
This spec adds the assignment's manual backtest log and audit requirements.
## 1. Overview

### Purpose

Backtesting executes a deterministic historical simulation from immutable
inputs, records Candidate and Attempt history, persists auditable Trades, and
publishes an Experiment result for evaluation and leaderboard projection. The
same public boundary serves manual submissions and Search-generated candidates.
### Scope

The Manual Backtest flow MUST support:
- Pair/Coin and canonical Timeframe selection.
- A UTC half-open historical range [from, to).
- Initial capital, fee rate, and fixed MVP slippage of exactly 5 bps.
- One strategy or a deterministic composite strategy.
- Sealed Market Data and optional Sentiment snapshots.
- Progress, retry, cancellation, result, Trade Detail, and replay reads.
The required Trade Detail output contains Pair/Coin, entry time, entry price,
stop-loss, take-profit, exit time, exit price, quantity, fee, slippage rate and
amount, net Profit, and result percentage.
### Ownership and boundaries

| Owner | Owns | Backtesting may use |
|---|---|---|
| Backtesting | Candidate, Attempt, Trade, Experiment history, queue reconciliation | Public APIs below |
| Leaderboard | Scope aggregate and ranking projection | Scope creation/use through its public contract |
| Market Data | Candles and sealed DatasetSnapshotRef | public create/read snapshot API |
| Strategy | Immutable definitions and retained implementations | resolveStrategy/combineSignals |
| Sentiment | Immutable sentiment snapshots and aligned reader | readSnapshot/readAt |
| Search | Search Run, counters, stop conditions, maxInFlight, slots | Backtesting public candidate API |
| Evaluation | Metric computation and finite/edge-case policy | Evaluation public contract |
REST adapters compose public application APIs and MUST NOT access another
module's repository, table, domain, or infrastructure internals. PostgreSQL is
the durable authority; Redis/BullMQ is transport and wake-up only.
### Compatibility baseline

CreateBenchmarkScopeRequest is a REST/application adapter shape. It maps to the
inline command accepted by BacktestCoordinator.createBenchmarkScope: name,
DatasetSnapshotRef, optional sentiment relatedCoin/range, initialCapital,
feeRatePercent, slippageBps, scoreFormulaId, and worker/evaluation runtime
references. Backtesting owns scope composition: it requests the optional
Sentiment snapshot and asks Leaderboard to persist the immutable scope;
Leaderboard owns the scope aggregate/table and locking rules. This is not a
second shared CreateLeaderboardScopeCommand. The canonical queue contract is
packages/contracts/queue/backtesting.ts; its adapter belongs under
modules/backtesting/infrastructure/queue.
The adapter request is:
~~~typescript
type CreateBenchmarkScopeRequest = {
  name: string; pair: Pair; timeframe: Timeframe;
  datasetRange: {from:string;to:string}; datasetSnapshot: DatasetSnapshotRef;
  initialCapital: number;
  feeRatePercent: number; slippageBps: 5; scoreFormulaId: string;
  scopeIdempotencyKey: string;
  sentimentCreate?: {relatedCoin:string; range:{from:string;to:string};
    aggregationWindowSeconds:number;
    modelName:string; modelVersion:string};
  riskPolicy?: {stopLossPercent?:number; takeProfitPercent?:number};
  workerRuntimeVersion: string; workerRuntimeSha256: string;
  evaluationRuntimeVersion: string; evaluationRuntimeSha256: string;
};
~~~

The scope-composition adapter uses Market Data's public createDatasetSnapshot or
readDatasetSnapshot operation (never its tables) to obtain the sealed ref,
validates pair/timeframe/range against the form, and passes it to the
main-compatible createBenchmarkScope. The worker later uses only
readDatasetSnapshot(ref.id) for verification. If sentimentCreate is
present, Backtesting calls Sentiment.createSnapshot and retains its returned
immutable ref; otherwise no sentiment snapshot is pinned. Sentiment.readSnapshot
is used later for aligned reads and returns the main reader only; its snapshot ID
is validated by the public API and Leaderboard-owned scope relation. The scope
idempotency key is metadata on this coordinator call; its digest covers every
immutable input. Coordinator maps name, snapshots, capital, fee, slippage,
scoreFormulaId, riskPolicy, and runtime fields to LeaderboardScope; its policy
fields are stopLossPercent and takeProfitPercent, each persisted as nullable
columns with CHECK (NULL OR value >= 0 AND value < 100). riskPolicy is an
additive scope-policy extension; all main scope fields and ownership remain intact.
## 2. Requirements

### 2.1 Functional requirements

| ID | Requirement |
|---|---|
| FR-01 | The system MUST validate Pair, Timeframe, UTC [from,to), positive initial capital, non-negative fee rate, and slippageBps = 5 before creating a scope. Pair is opaque and MUST NOT be parsed as BASE/QUOTE by Backtesting. |
| FR-02 | Scope creation MUST receive a sealed DatasetSnapshotRef containing id, pair, timeframe, range, candleCount, sha256, and createdAt from the Market Data public/bootstrap flow. The worker reads and verifies all reference fields and the versioned market-data-snapshot-v1 hash before simulation. |
| FR-03 | A scope MUST seal dataset, optional sentiment reference, capital, fee, slippage, score formula, decimal/evaluation policies, nullable riskPolicy.stopLossPercent/takeProfitPercent in [0,100), and worker/evaluation runtime references. A changed benchmark creates a new scope. |
| FR-04 | Manual submission MUST reference a committed leaderboardScopeId. It MUST persist a deterministic Candidate identity before queue submission and return 202 with candidateId and jobId. |
| FR-05 | Search MUST submit the exact Search boundary with searchRunId, leaderboardScopeId, iterationNumber, maxAttempts, strategyDefinitions, compositeDefinition, and generatedBy. Search MUST NOT send selectionMode. |
| FR-06 | selectionMode is immutable and server-derived from component count: SINGLE means one definition or one-component composite; COMPOSITE means two or more components. A client assertion may be checked but MUST NOT override the derived value. |
| FR-07 | Strategy and Composite definitions MUST be created or verified through Strategy's public API, remain immutable/versioned, and be stored by reference. The worker resolves the retained implementation hash, never current code. Composite validation requires at least one component; component IDs must exactly match the supplied Strategy definitions with no duplicates or extras. WEIGHTED_SCORE requires finite weights summing exactly to 1 and finite thresholds with buy > sell; MAJORITY_VOTE normalizes weights to 0 and documented default thresholds. |
| FR-08 | Every selected strategy MUST execute through the composite path. A SINGLE composite has exactly one matching component with weight 1. MAJORITY_VOTE uses at least one component, ignores weights, normalizes them to 0 and thresholds to buy=0.3/sell=-0.3, and resolves ties to HOLD. WEIGHTED_SCORE maps BUY=+1, HOLD=0, SELL=-1; its explicit finite thresholds require buy > sell and strict score > buy / < sell comparisons apply. |
| FR-09 | A Candidate MAY have multiple numbered Attempts, but Attempt number MUST be <= maxAttempts. A successful non-cancelled Candidate creates at most one Experiment. |
| FR-10 | The worker MUST simulate only sealed closed candles, use the versioned fill policy, persist Trades before reporting queue success, and record all runtime/snapshot provenance. |
| FR-11 | A Trade MUST expose the required assignment columns and the richer audit fields in section 4.4. Public numeric fields are finite JavaScript numbers; exact decimal arithmetic is internal/persistence-only. |
| FR-12 | Entry/exit fills, fees, slippage, stop-loss, take-profit, range-end closure, and net P&L MUST follow section 2.2. Slippage is exactly 5 bps and applies at both entry and exit. |
| FR-13 | Evaluation MUST calculate/return totalProfitAmount, total return, win rate, trade count, maximum drawdown, profit factor, Sharpe status/value, and evaluation runtime provenance; Completion persists them in ExperimentResult. Leaderboard.score owns score formula/overallScore/rank eligibility; Leaderboard.submit owns admission. |
| FR-14 | Progress and result reads MUST expose bounded projections, attempt history, failures, provenance, and paginated Trade Detail without raw queue payloads or provider payloads. |
| FR-15 | Manual scope and submission idempotency MUST compare a request digest. Equal digest returns the existing resource; different immutable content returns 409 and writes nothing. Search identity remains (searchRunId, iterationNumber). |
| FR-16 | Cancellation MUST be durable and idempotent. It fences completion, keeps the Candidate CANCELLED, and permits only a completed audit Attempt with readable Trades. |
| FR-17 | A cancelled audit Attempt MUST NOT create an Experiment, ranking entry, Search completion counter, slot release, or other completion side effect. |
| FR-18 | Search owns Search Run counters, maxInFlight, stop conditions, and slot bookkeeping. After its cancellation transaction commits, it calls removePendingJobs(candidateIds), which only removes waiting/delayed jobs. |
| FR-19 | Queue events MUST be treated as wake-up observations. PostgreSQL reload, locks, leases, and generation checks decide domain state. Duplicate or late signals MUST converge idempotently. |
| FR-20 | Replay verification MUST rerun the exact retained inputs and compare canonical ordered Trades and metrics without inserting or mutating Candidate, Attempt, Experiment, or ranking rows. |
| FR-21 | Missing snapshots or retained implementations MUST produce typed non-replayable/infrastructure failures; live data or current implementation MUST NOT be substituted. |
| FR-22 | The public boundary MUST return 404 for missing resources, 409 for origin/idempotency conflicts, 400 for invalid cursors or input, 201 for scope creation, and 202 for accepted backtests. |
| FR-23 | Pagination cursors MUST be opaque, authenticated/resource-bound, and limit-bound. Ordering is entryTime ASC, sequence ASC, id ASC. |
| FR-24 | Backtesting MUST support multiple workers, bounded payloads, observable progress/failure/duration, and deterministic reconciliation after enqueue interruption, worker crash, or lost queue notification. |
### 2.2 Accounting and fill rules

The quote currency is the scope's capital currency; quantity is base-asset
units. Fee rate is a percentage and feeAmount is the sum of entry and exit
notional fees. The MVP slippage rate is 5/10,000 = 0.0005.
For a long position, slippage worsens entry upward and exit downward. For a
short position, slippage worsens entry downward and exit upward. The applied
slippage amount is the quote-currency difference between market/reference and
executed prices at both sides.
Let s = 0.0005. For a long, executedEntry = marketEntry * (1+s) and
executedExit = marketExit * (1-s). For a short, executedEntry =
marketEntry * (1-s) and executedExit = marketExit * (1+s). The implementation
MUST calculate these values using the internal exact-decimal policy, round only
at the documented persistence boundary, and expose finite number values.
MVP position sizing is one unleveraged LONG position with no pyramiding and
full-capital sizing: q is initialCapital / (executedEntryPrice *
(1 + feeRatePercent/100)), with no partial fill; a non-positive price or
entry/fee exceeding capital rejects the Attempt as INSUFFICIENT_CAPITAL.
For quantity q, grossProfit is q * (marketExit - marketEntry), so it is before
fee and slippage. EntryNotional is q * executedEntry; exitNotional is q *
executedExit; feeAmount is (entryNotional + exitNotional) * feeRatePercent / 100.
slippageAmount is q times the absolute market/executed-price difference at entry
plus exit. profit is grossProfit - feeAmount - slippageAmount. notionalEntryValue
is entryNotional and resultPercent is profit / notionalEntryValue * 100.
Only closed snapshot candles are simulated. MVP_OHLC_STOP_FIRST_V1 evaluates a
signal at candle close and enters at the next candle open; a gap beyond a
protective level uses the gap-open price. During a candle, stop/take triggers
use high/low and STOP_LOSS wins if both are reachable. A SELL strategy signal
closes LONG at the next open; a final-candle signal cannot enter. An open
position fills at the final candle close. Intrabar time is not invented, and an
exit cannot re-enter on the same candle. There is at most one position. The
Trade signal is LONG in MVP; SHORT is a reserved additive extension matching
main, not an accepted MVP input. riskPolicy percentages are finite [0,100),
and levels use pre-slippage marketEntryPrice:
stopLoss=marketEntryPrice*(1-stopLossPercent/100) and
takeProfit=marketEntryPrice*(1+takeProfitPercent/100). Missing values produce
null, and LONG requires stopLoss < market entry < takeProfit.
The core Strategy API remains BUY|SELL|HOLD.
A close MUST use the versioned policy; no hidden
frontend business logic is allowed.
Protective levels use market OHLC: stop is low <= stopLoss and take is high >=
takeProfit. A gap open <= stop or >= take uses market open as the exit basis;
otherwise the trigger price is the basis, and exit-side slippage is applied in
both cases. The entry candle is the candle whose open fills; its later high/low
may trigger protection, but the signal candle cannot. Any OHLC trigger uses that candle's close timestamp; market prices
remain pre-slippage and executed prices are post-slippage.
MVP_DECIMAL_HALF_UP_V1 uses 18 intermediate and monetary/price fractional
digits, 12 percentage/ratio fractional digits, and half-up rounding once per
persisted field; aggregates use persisted Trade values.
MAJORITY_VOTE counts BUY, SELL, and HOLD and returns the strictly highest count;
any tie returns HOLD. WIN means persisted profit > 0, LOSS < 0, and BREAKEVEN = 0
after field rounding. A signal on the final range candle cannot enter.
### 2.3 Evaluation rules

| Metric/policy | Required behavior |
|---|---|
| totalProfitAmount | Sum of closed Trade.profit in quote currency |
| totalReturnPercent | totalProfitAmount / initialCapital * 100 |
| winRatePercent | Wins / closed trades * 100; BREAKEVEN is not a win |
| numberOfTrades | Number of closed Trades |
| maxDrawdownPercent | max over the equity curve of (prior peak - equity) / prior peak * 100, stored as a non-negative loss magnitude |
| profitFactor | Sum of positive gross profits / absolute sum of negative gross profits; null for NO_TRADES, NO_LOSSES, or NO_GROSS_MOVEMENT |
| Sharpe | Versioned evaluator output; fewer than two returns gives finite 0 with INSUFFICIENT_OBSERVATIONS; stddev <= 1e-12 gives finite 0 with ZERO_VARIANCE |
| Score/rank | Uses sealed scoreFormulaId; zero trades gives overallScore=0, rankEligible=false, rankExclusionReason=NO_TRADES, profitFactorStatus=NO_TRADES |
| Numeric contract | API returns finite numbers or null/status, never infinity; exact decimal policy is MVP_DECIMAL_HALF_UP_V1 |
Sharpe observations are r_i = Trade.profit / equityBeforeTrade in Trade order;
for n >= 2, mean = sum(r)/n, population stddev = sqrt(sum((r-mean)^2)/n),
and Sharpe = mean/stddev with annualization factor 1. The equity curve starts
at initialCapital and adds each rounded Trade.profit; drawdown uses those
points and the initial peak.
### 2.4 Candidate state contract

The authoritative Candidate states are:
CREATED -> QUEUED -> BACKTESTING -> PROCESSING_RESULT -> COMPLETED
Retryable simulation failure goes to RETRY_WAIT -> BACKTESTING. Exhaustion
goes to TERMINAL_FAILURE_PENDING -> FAILED. Verified infrastructure failure
also goes to TERMINAL_FAILURE_PENDING -> FAILED. Any non-terminal state may
become CANCELLED when the cancellation fence wins.
COMPLETED, FAILED, and CANCELLED are terminal. Claim generation/token,
activeAttemptNumber, and completion leases fence stale workers. A worker MUST
re-lock and re-check Candidate state before creating an Experiment.
Cross-cutting requirements: PostgreSQL transactions make Candidate/Attempt/
Trade/Experiment writes consistent; queue/API payloads are bounded and omit
provider payloads, Trades, and metrics; errors are typed, allowlisted, bounded,
redacted, and observable; timestamps are ISO-8601 UTC; public contracts keep
finite main-branch numbers and internal DecimalString is not a wire type; no
generic event bus or direct cross-module SQL access is introduced.
## 3. Behavior

### 3.1 Scope and Candidate creation

The UI MAY render one form, but the durable flow has two operations:
1. The adapter validates CreateBenchmarkScopeRequest and calls
   Backtesting.createBenchmarkScope with scopeIdempotencyKey metadata.
2. The scope-composition adapter obtains or receives the sealed Market Data
   snapshot through its public create/read API; Backtesting verifies it through
   readDatasetSnapshot, requests Sentiment only when needed, then asks Leaderboard
   to persist the immutable scope with an idempotency digest.
3. The adapter returns 201 only after canonical references, runtime refs,
   input accounting policy, and score formula are sealed.
4. startManual accepts only the committed scope ID, immutable Strategy refs,
   Composite ref, maxAttempts, and optional submission idempotency key.
5. The application verifies definitions, derives selectionMode, and begins one
   transaction inserting Candidate and any manual idempotency mapping.
6. The transaction commits Candidate(CREATED) with deterministic jobId=CandidateId.
7. After commit, the queue adapter submits the job and conditionally changes
   CREATED to QUEUED. An interrupted update is repaired by reconciliation.
A repeated immutable identity returns the existing Candidate/job. A repeated
identity with a different digest is a 409 conflict. Omitting a manual key
intentionally creates a new Candidate. Search identity is the existing unique
(searchRunId, iterationNumber) constraint.
### 3.2 Worker claim, simulation, and retry

The worker receives only a scope reference, Candidate identity, attempt budget,
runtime reference, and queue metadata. It reloads PostgreSQL, claims a new
Attempt with a generation/lease, and rejects stale or terminal work.
On every redelivery it first closes any prior RUNNING Attempt as a typed stall
failure, then allocates the next attempt number only when below maxAttempts and
stores it as active_attempt_number; successful/pending/terminal/cancel writes
clear that field. No Candidate may have two RUNNING Attempts.
Before simulation it verifies:
- DatasetSnapshotRef id, Pair, Timeframe, range, candleCount, and sha256.
- Snapshot serialization version market-data-snapshot-v1 and closed candles.
- Strategy/Composite versions and retained implementation hashes.
- Optional SentimentDatasetSnapshotRef metadata and aligned readAt behavior.
- Worker runtime, fill policy, decimal policy, and evaluation policy.
It obtains signals only through Strategy APIs and sentiment only through
Sentiment.readSnapshot/readAt. It persists ordered Trades in the Attempt
transaction. A retryable simulation error closes a FAILED Attempt with
failure_category=RETRYABLE and enters RETRY_WAIT when budget remains. It must
not create a partial Experiment.
Infrastructure loss or a verified worker/queue stall closes one real or
synthetic Attempt with failure_category=INFRASTRUCTURE. A missing snapshot is
MISSING_SNAPSHOT; a missing retained implementation is
IMPLEMENTATION_ARTIFACT_UNAVAILABLE. Redelivery of terminal work is ignored.
### 3.3 Completion and evaluation

Queue completion is only an observation. The Completion Processor derives
candidateId from jobId, reloads and locks PostgreSQL, validates the signal,
and claims PROCESSING_RESULT with its separate fixed five-claim completion
budget. Search completion locks SearchRun -> Candidate -> LeaderboardScope;
manual completion locks Candidate -> LeaderboardScope. The active Attempt is
validated under the Candidate lock, then completion_claim_token and
completion_lease_until fence
stale workers. A watchdog scans CREATED, QUEUED, BACKTESTING, and RETRY_WAIT;
it closes stale work or writes at most one synthetic INFRASTRUCTURE Attempt
when no worker claimed the job. TERMINAL_FAILURE_PENDING is completed only by
completion reconciliation, after no retryable BullMQ job remains.
Completion claims are immediate, then retry after 5s, 30s, 2m, and 10m with
plus/minus 20% jitter; lease expiry permits another claim but never a duplicate Experiment.
Claim five terminalizes without claim six, and terminal completion clears retry,
claim-token, and lease fields. A PostgreSQL deadlock retry does not consume a
completion claim; only a committed claim increments completion_attempt_count.
Due rows are claimed with FOR UPDATE SKIP LOCKED; completion_attempt_count is
the claim generation, and final writes match it, completion_claim_token, and
completion_lease_until > now(). Lease duration and watchdog interval are the
same deployment setting; expiry permits a later claim but never claim six.
For a non-cancelled successful Attempt it builds the additive
BacktestingEvaluationInput (main CompletedBacktestResult plus initialCapital,
evaluationPolicyId, and audit Trade fields), then calls the scope-bound
BacktestingEvaluationAdapter.evaluate(input), persists one Experiment/result projection, and
transitions Candidate to COMPLETED. If evaluation is transient, it retries
completion without creating a new simulation Attempt. If evaluation is
permanent or non-finite, Candidate becomes FAILED with
failureKind=COMPLETION_PROCESSING while successful Attempt/Trades remain.
The adapter's initialCapital and evaluationPolicyId come only from the immutable
scope. riskPolicy is simulation-only provenance, not an Evaluation input; enriched
Trade fields are the persisted audit rows.
The result exposes metrics, rank eligibility, exact provenance, and paginated
Trades. Scope/Attempt/Experiment identity is immutable after completion. For a
Search Candidate, the same completion transaction updates Search counters once
and releases its slot through the opaque CompletionUnitOfWork while holding
SearchRun -> Candidate -> LeaderboardScope; Backtesting does not query Search
tables. After commit it calls Search.onCandidateFinished(searchRunId) only to
trigger serialized reconcile/fill; lost callbacks are repaired periodically.
### 3.4 Cancellation and audit completion

Manual cancellation locks Candidate; Search cancellation locks SearchRun then
Candidate. Both check origin, record the cancellation fence, and commit
CANCELLED. This lock order is mandatory, cancellation is idempotent, and it
cannot reopen the Candidate. Search and its Candidate cancellations share one opaque
CancellationUnitOfWork: SearchRun becomes CANCELLED with stop_reason=
USER_CANCELLED and endedAt, Candidate fencing commits, then and only then
removePendingJobs runs. Active-attempt generation, completion retry/lease/token,
pending failure classification, and stale error fields are cleared on cancel.
A worker that already claimed simulation MAY finish its current Attempt. If
the cancellation fence wins, the Attempt closes as COMPLETED with
failure_category=CANCELLED_AUDIT and audit_only=true; audit Trades remain
readable. Completion rechecks the fence and creates no Experiment, rank, counter,
slot-release, or success side effect.
### 3.5 Recovery and failure matrix

| Situation | Attempt | Candidate/result | Side effect |
|---|---|---|---|
| Invalid request before claim | none | typed 4xx; no Candidate | none |
| Retryable simulation error with budget | FAILED/RETRYABLE | RETRY_WAIT | next Attempt allowed |
| Final retryable error | FAILED/RETRYABLE | TERMINAL_FAILURE_PENDING then FAILED | no Experiment |
| Verified queue/worker loss | real/synthetic FAILED/INFRASTRUCTURE | terminal failure then FAILED | reconcile |
| Missing snapshot/artifact after claim | FAILED with typed code | terminal failure then FAILED | no substitution |
| Cancellation wins while running | COMPLETED/CANCELLED_AUDIT/audit_only | CANCELLED | Trades only; no completion effects |
| Evaluator transient error | no new simulation Attempt | completion retry | no duplicate Experiment |
| Evaluator permanent/non-finite error | prior Attempt retained | FAILED/COMPLETION_PROCESSING | no Experiment |
| Duplicate/late terminal signal | no new Attempt | current durable state wins | anomaly/reconcile if conflicting |
Startup and periodic reconciliation scan durable non-terminal identities, compare
queue state, repair interrupted enqueue, recover stale leases, and replay
missing wake-ups without duplicating Candidates or Experiments.
## 4. Contracts

### 4.1 Public application and REST contract

The Backtesting public API is the allowlisted boundary. The REST adapter maps
HTTP DTOs to these operations and never exposes repositories or queue internals.
| Operation | Input/output | HTTP |
|---|---|---|
| createBenchmarkScope | main-compatible inline scope command -> LeaderboardScope/summary | POST /leaderboard-scopes, 201 |
| startManual | StartManualBacktestCommand + submissionIdempotencyKey -> BacktestSubmissionAccepted | POST /backtests, 202 |
| submitSearchCandidate | SubmitSearchCandidateCommand -> BacktestSubmissionAccepted | internal public API |
| status | candidateId -> CandidateProgress | GET /backtests/{candidateId} |
| readAttempt | attemptId -> BacktestAttemptAudit | GET /attempts/{attemptId} |
| listAttemptTrades | attemptId + TradePageRequest -> TradePage | GET /attempts/{id}/trades |
| readExperimentSummary | experimentId -> ExperimentResultSummary | GET /experiments/{id} |
| listExperimentTrades | experimentId + TradePageRequest -> TradePage | GET /experiments/{id}/trades |
| cancelManualCandidate | candidateId + unit of work -> void | POST /backtests/{id}/cancel |
| cancelSearchCandidates | searchRunId + unit of work -> candidateIds | Search callback |
| summarizeSearchCandidates | searchRunId -> SearchCandidateSummary | Search callback |
| removePendingJobs | candidateIds -> void | internal best-effort cleanup |
| verifyReplay | experimentId -> ReplayVerificationResult | POST /experiments/{id}/replay-verification |
summarizeSearchCandidates returns exactly active, queuedCount, runningCount,
and candidatesTested: active is non-terminal Search candidates ordered by status
then id; queuedCount is CREATED|QUEUED; runningCount is
BACKTESTING|RETRY_WAIT|PROCESSING_RESULT|TERMINAL_FAILURE_PENDING; candidatesTested
counts non-cancelled COMPLETED|FAILED Search candidates. BacktestCompletionProcessor exposes process(signal),
reconcileCandidate(candidateId), and reconcileDueCandidates(limit), all using
the same PostgreSQL authority and completion unit of work.
Idempotency metadata is separate from shared commands: scopeIdempotencyKey is
1..255 UTF-8 bytes and covers every immutable scope input; submission key is
separate metadata on startManual. The adapter calls Backtesting, which resolves
Market Data/Sentiment references and passes the validated snapshot to Leaderboard.
The cancellation port is an opaque process-level unit of work:
~~~typescript
type CancellationUnitOfWork = { readonly kind: "SEARCH_CANCELLATION" };
type CompletionUnitOfWork = { readonly kind: "BACKTEST_COMPLETION" };
~~~

Neither port is a database handle or a permission to open a second transaction.
CompletionUnitOfWork is the opaque authorization for Search-owned counter/slot
updates to participate in the existing completion transaction.
For main compatibility the BacktestCoordinator cancelManual signature may carry
the same opaque CancellationUnitOfWork type even though kind is meaningful only
to Search; manual REST cancellation owns its local transaction and validates
origin MANUAL before fencing the Candidate.
### 4.2 Canonical commands and summaries

~~~typescript
type StartManualBacktestCommand = {
  leaderboardScopeId: string;
  strategyDefinitions: StrategyDefinition[];
  compositeDefinition: CompositeStrategyDefinition;
  maxAttempts: number;
};
type SubmitSearchCandidateCommand = {
  searchRunId: string; leaderboardScopeId: string; iterationNumber: number;
  maxAttempts: number; strategyDefinitions: StrategyDefinition[];
  compositeDefinition: CompositeStrategyDefinition; generatedBy: string;
};
type BacktestSubmissionAccepted = {
  candidateId: string; jobId: string; status: "CREATED" | "QUEUED";
};
~~~

StartManualBacktestCommand MUST NOT contain selectionMode. The server derives
and persists it. Search sends exactly the fields shown above.
BenchmarkScopeSummary is an adapter/read projection of canonical LeaderboardScope;
it creates no second scope row and maps all immutable benchmark fields.
### 4.3 Market Data, Strategy, and Sentiment references

The main-compatible Market Data reference is:
~~~typescript
type DatasetSnapshotRef = {
  id: string; pair: Pair;
  timeframe: Timeframe;
  range: {from:string;to:string}; candleCount: number; sha256: string;
  createdAt: string;
};
~~~

Pair is canonical opaque data. Market Data owns snapshot ingestion/bootstrap and
readDatasetSnapshot. Backtesting verifies pair/timeframe/range/count/hash and
never reads Market Data tables.
Strategy definitions are immutable references containing id,
logicalFamilyKey, strategyName, implementationVersion,
implementationSha256, version, parameters, and createdAt. Composite definitions
contain id, logicalFamilyKey, version, method MAJORITY_VOTE or WEIGHTED_SCORE,
components of strategyDefinitionId/weight, optional buy/sell thresholds, and
createdAt. Strategy owns listStrategies, resolveStrategy, and combineSignals.
SentimentDatasetSnapshotRef contains id, relatedCoin, range,
aggregationWindowSeconds, modelName, modelVersion, modelSha256, pointCount,
sha256, and createdAt. Sentiment owns createSnapshot, readSnapshot, and
reader.readAt(snapshotId,candleCloseTime). readAt uses only the point whose
window contains the close, never future points or carry-forward values.
Each point has inclusive window-end timestamp, label, and averageScore in
[-1,1]; relatedCoin is canonical base asset, not Pair. Missing windows are undefined. Information strategies require a complete
aligned reference. sentiment_snapshot_id remains an opaque API identifier to
Backtesting and is validated through Sentiment; the main baseline
leaderboard_scopes.sentiment_snapshot_id foreign key is preserved for database
referential integrity. Backtesting never reads or writes Sentiment tables
directly and never copies sentiment points.
### 4.4 Candidate progress and Trade Detail

CandidateProgress fields are candidateId, origin MANUAL/SEARCH, derived
selectionMode, optional Search metadata, leaderboardScopeId, CandidateStatus,
ordered attempts, maxAttempts, activeAttemptNumber, completionAttemptCount,
completionMaxAttempts=5, completionNextRetryAt, experimentResultId,
failureKind, bounded lastError, createdAt, and updatedAt. CandidateStatus is
CREATED, QUEUED, BACKTESTING, RETRY_WAIT, PROCESSING_RESULT,
TERMINAL_FAILURE_PENDING, COMPLETED, FAILED, or CANCELLED.
BacktestAttemptProgress fields are attemptId, attemptNumber, status
RUNNING/COMPLETED/FAILED, startedAt, completedAt, failureCategory
RETRYABLE/INFRASTRUCTURE/CANCELLED_AUDIT, failureCode, and bounded errorMessage.
Trade Detail is append-only audit data. The UI mapping is:
| UI column | API field | Meaning |
|---|---|---|
| Pair/Coin | pair | Canonical opaque Pair from Scope |
| Thời gian vào lệnh | entryTime | ISO-8601 UTC |
| Giá vào lệnh | entryPrice | Executed price after slippage |
| Stoploss | stopLoss | Nullable trigger price |
| TakeProfit | takeProfit | Nullable trigger price |
| Thời gian kết thúc | exitTime | ISO-8601 UTC |
| Giá kết thúc | exitPrice | Executed price after slippage |
| Quantity | quantity | Base-asset units |
| Transaction cost | feeAmount | Entry plus exit fee |
| Slippage/Spread | slippageBps, slippageAmount | Fixed 5 bps and applied amount |
| Profit | profit, resultPercent | Net quote P&L and percentage |
Trade fields are id, sequence, pair, backtestAttemptId, signal LONG (MVP; SHORT
is a reserved additive extension),
entryTime, marketEntryPrice, entryPrice, stopLoss, takeProfit, exitTime,
marketExitPrice, exitPrice, exitReason STOP_LOSS/TAKE_PROFIT/STRATEGY_CLOSE/
RANGE_END, quantity, notionalEntryValue, grossProfit, feeAmount, slippageBps=5,
slippageAmount, profit, resultPercent, and result WIN/LOSS/BREAKEVEN. All
numeric fields are finite and all timestamps are UTC.
TradePageRequest is limit > 0, <= configured MAX_PAGE_SIZE, plus an opaque
cursor. TradePage orders items by entryTime, sequence, id and returns
nextCursor. A cursor includes server-authenticated version, resource kind/id,
limit, and last ordering tuple; a mismatch is 400 INVALID_CURSOR.
### 4.5 Evaluation and Experiment result

EvaluationMetrics contains the main fields candidateId, totalReturnPercent,
winRatePercent, numberOfTrades, maxDrawdownPercent, profitFactor or null,
profitFactorStatus, sharpeRatio, and sharpeRatioStatus. ExperimentResultSummary
uses `BacktestingEvaluationInput = CompletedBacktestResult & { initialCapital: number; evaluationPolicyId: string; trades: (Trade & { grossProfit: number; feeAmount: number; slippageAmount: number; profit: number })[] }` as an additive structural adapter. `BacktestingEvaluationMetrics = EvaluationMetrics & { totalProfitAmount: number }` is its explicit result. `BacktestingEvaluationAdapter.evaluate(input)` calls the additive Evaluation API `evaluateEnriched(input)`; Evaluation owns calculation, while the adapter owns scope/input mapping.
ExperimentResultSummary adds totalProfitAmount from closed Trades and contains id, candidateId, backtestAttemptId, compositeDefinitionId,
leaderboardScopeId, scoreFormulaId, workerRuntimeVersion/Sha256,
evaluationRuntimeVersion/Sha256,
CompositeStrategyDefinition and component references, DatasetSnapshotRef,
optional SentimentDatasetSnapshotRef, benchmark settings, fill/decimal/
evaluation policies, worker and evaluation runtime hashes, metrics, overallScore,
rank eligibility, rankExclusionReason, and createdAt. Canonical ExperimentResult
adds id, compositeDefinitionId, hydrated trades, and the rank union
{rankEligible:true} or {rankEligible:false, rankExclusionReason:"NO_TRADES"}.
ExperimentResultSummary is a read-only adapter projection of that persisted
ExperimentResult; it never creates another aggregate.
simulatorVersion and simulatorSha256 are MVP aliases of workerRuntimeVersion
and workerRuntimeSha256; no second simulator row exists. A distinct simulator
requires an additive schema/version change.
Canonical main names are backtestAttemptId, leaderboardScopeId, and overallScore;
the adapter does not expose competing aliases. Completion calls
BacktestingEvaluationAdapter.evaluate(BacktestingEvaluationInput), which
delegates to Evaluation.evaluateEnriched and returns BacktestingEvaluationMetrics.
It then calls Leaderboard.score with the sealed
scope/formula and Leaderboard.submit(experiment, CompletionUnitOfWork) inside the
existing PostgreSQL transaction. The adapter carries audit fields and scope
policy, never Strategy or Composite details.
Completion maps the returned metrics to the Experiment summary without changing
the shared main wire types; totalReturnPercent is checked against scope
initialCapital.
### 4.6 Persistence delta and mapping

PostgreSQL is the source of truth. The following are additive requirements; the
existing main baseline columns name, version, dataset_snapshot_id,
sentiment_snapshot_id, worker/evaluation runtime refs, capital, fee,
slippage_bps, and score_formula_id MUST be preserved, not re-added.
| Entity | Required additive data | Key invariants |
|---|---|---|
| leaderboard_scopes | pair, timeframe, dataset_from/to, snapshot hashes, decimal/evaluation policy IDs, stop_loss_percent, take_profit_percent | range to > from; hashes valid; slippage=5; each risk column is NULL or [0,100); levels derive from marketEntryPrice |
| scope idempotency | key, request_sha256, scope id, createdAt | key 1..255 bytes; key maps uniquely to scope |
| candidate_strategies (Candidate) | id, origin, leaderboard_scope_id, composite_definition_id, queue_job_id, max_attempts, status, created_at, updated_at, search_run_id, generated_by, iteration_number, selection_mode, active_attempt_number, completion_attempt_count, completion_max_attempts=5, completion_claim_token, completion_lease_until, completion_next_retry_at, cancelled_audit_attempt_number, failure_kind, last_error | MANUAL requires search_run_id/generated_by/iteration_number NULL; SEARCH requires all three and iteration_number > 0; UNIQUE(search_run_id, iteration_number) plus the main composite SearchRun FK |
| candidate submission keys | MANUAL origin, key, digest, candidate id, createdAt | primary key (origin,key); candidate unique |
| backtest_attempts | failure category/code/retryable, audit_only | failure shape matches status; redacted bounded error |
| trades | sequence, market/exec prices, stops, exit reason, quantity, notional, gross/net, fee, slippage, outcome | sequence unique per Attempt; amounts non-negative where defined |
| trade ordering | attempt id, entry time, sequence, id index | stable pagination order |
| experiment_results | candidate id, successful backtestAttemptId, composite/strategy refs, scope/formula IDs, metrics, overallScore, rank eligibility, runtime/policy provenance | unique successful Candidate; immutable; inserted only after completion claim |
Trade API names map to durable columns: sequence/trade_sequence,
stopLoss/stop_loss, takeProfit/take_profit, feeAmount/fee_amount,
slippageAmount/slippage_amount, marketEntryPrice/market_entry_price,
marketExitPrice/market_exit_price, exitReason/trade_exit_reason, and
result/trade_outcome.
Required uniqueness is unique scope idempotency key, (origin,
submission_idempotency_key), (search_run_id, iteration_number),
(backtestAttemptId, trade_sequence), and
experiment_results.candidate_id. Status/check constraints reject malformed
failure/audit shapes, negative quantities/fees, non-5-bps Trades, and non-finite
metrics.
Candidate submission key and scope key are written in the same transaction as
their resource. Both keys are 1..255 UTF-8 bytes. request_sha256 is SHA-256 of
canonical UTF-8 JSON (sorted object keys, no whitespace, UTC timestamps, and
normalized decimal strings). Equal digest returns the resource; different digest
returns 409. Search uses its existing unique identity and does not use the manual
key table. Scope references are verified against the sealed snapshot before commit.
The experiment_results candidate_id uniqueness constraint enforces at most one
Experiment for a successful Candidate; leaderboard submission receives the
CompletionUnitOfWork in the same application transaction.
Failure persistence is:
| Attempt situation | Stored state |
|---|---|
| Retryable simulation | FAILED, RETRYABLE, retryable=true |
| Infrastructure loss | FAILED, INFRASTRUCTURE, typed code |
| Cancellation audit | COMPLETED, CANCELLED_AUDIT, audit_only=true |
| Normal success | COMPLETED, no failure category/code |
| Running | RUNNING, no failure category/code |
TERMINAL_FAILURE_PENDING -> FAILED retains failure_kind
RETRY_EXHAUSTED/INFRASTRUCTURE/COMPLETION_PROCESSING; it is never cleared while
the Candidate is terminal.
### 4.7 Queue contract

~~~typescript
type BacktestQueueJob = {
  schemaVersion: 1; jobId: string; candidateId: string;
  leaderboardScopeId: string; maxAttempts: number;
  workerRuntimeVersion: string; workerRuntimeSha256: string; enqueuedAt: string;
};
type BacktestQueueReturn =
 | {candidateId:string; status:"COMPLETED"; attemptId:string; completedAt:string}
 | {candidateId:string; status:"IGNORED";
    reason:"CANCELLED"|"ALREADY_TERMINAL"|"SUPERSEDED"|"PENDING_COMPLETION"};
type BacktestQueueTerminalSignal =
 | {schemaVersion:1; jobId:string; status:"COMPLETED";
    returnValue:BacktestQueueReturn}
 | {schemaVersion:1; jobId:string; status:"RETRIES_EXHAUSTED";
    attemptsMade:number}
 | {schemaVersion:1; jobId:string; status:"VERIFIED_TERMINAL_FAILED";
    failedReason:string};
~~~

jobId MUST equal candidateId. maxAttempts is positive and bounded by
BACKTEST_MAX_ATTEMPTS. Queue contains no Trades, metrics, full strategy
definitions, provider payloads, or durable failure history. The adapter
validates schema/discriminators and IDs, then the Completion Processor reloads
PostgreSQL. failedReason is only a bounded redacted wake-up hint. Unknown,
malformed, or conflicting signals are anomalies for reconciliation, never a
source of guessed domain state. The queue adapter forwards IGNORED returns to
the Completion Processor; it emits VERIFIED_TERMINAL_FAILED only after
confirming BullMQ state=failed and no retryable job remains. RETRIES_EXHAUSTED
requires attemptsMade to be a positive integer and does not by itself overwrite
a newer durable state.
### 4.8 Provenance and replay

The canonical chain is:
~~~text
Experiment -> Candidate -> Attempt -> LeaderboardScope
  -> DatasetSnapshotRef and optional SentimentDatasetSnapshotRef
  -> Strategy/Composite definition versions and implementation hashes
  -> worker runtime -> fill/decimal/evaluation policies
  -> score formula -> ordered Trades -> metrics
~~~

Every completed Experiment stores the exact IDs/hashes, Pair, Timeframe, range,
capital, fee, fixed slippage, timezone UTC, fill policy
MVP_OHLC_STOP_FIRST_V1, same-candle STOP_LOSS_BEFORE_TAKE_PROFIT, decimal and
evaluation policies, runtime hashes, and deterministic guarantee. References
are sealed records, not currently deployed code or live datasets.
verifyReplay loads those exact references, reruns pure simulation/evaluation,
compares canonical ordered Trades and metrics, and returns MATCH only when all
values match. It returns MISMATCH for a determinism difference and
NON_REPLAYABLE for MISSING_SNAPSHOT or IMPLEMENTATION_ARTIFACT_UNAVAILABLE.
It never inserts, updates, ranks, or creates a new Candidate/Attempt/Experiment.
### 4.9 Module compatibility matrix

| Caller | Allowed | Forbidden |
|---|---|---|
| REST/apps/backend | Backtesting public API | repositories, queue internals |
| Backtesting | Market Data snapshot API; Strategy APIs; Sentiment reader; Evaluation; Leaderboard | other module tables/domain internals |
| Search | submit candidate, summaries, cancel, removePendingJobs | Candidate/Attempt/Trade/queue tables |
| Worker | immutable scope/definition refs and public readers | live provider data, current unpinned code |
| Leaderboard | scope/ranking projection | owning simulation history |
| Queue adapter | serialize/wake/reconcile | durable audit decisions |
Strategy execution is deterministic and has no direct DB/network dependency;
Search owns maxInFlight/counters; the main Sentiment FK is referential integrity
only. All modules extend through public contracts, not a Backtesting God Service.
## 5. Constraints
Constraints are PostgreSQL authority with transactional locks/leases/unique
identity; finite main-branch numbers with MVP_DECIMAL_HALF_UP_V1 internally;
UTC half-open pinned snapshots; bounded redacted versioned queue/errors;
public module boundaries and bounded cursors. MVP slippage is fixed 5 bps,
units are explicit, audit Trades are read-only, and new strategies/composites,
workers, and Search algorithms require no Backtesting rewrite.
Architecture decisions: Coordinator composes scopes without a second shared command.
- PostgreSQL owns lifecycle truth; Redis/BullMQ only transports wake-ups.
- Backtesting owns Candidate/Attempt/Trade completion and queue reconciliation.
- Search owns counters and slots through an idempotent post-commit callback.
- Evaluation and Leaderboard remain public services called by completion.
- Immutable snapshots, definitions, runtimes, and policies make replay possible.

## 6. Acceptance Criteria
### Inputs and scope
- [ ] Pair uses canonical Pair, Timeframe is main-compatible, and the UTC half-open range is validated before snapshot creation; Backtesting never parses Pair.
- [ ] Capital is positive quote currency; fee is non-negative; slippage is exactly 5 bps.
- [ ] Sealed Market Data reference contains matching pair, timeframe, range, count, and v1 hash; optional Sentiment is validated through its public API and retains the Leaderboard FK.
- [ ] Scope stores score, decimal, evaluation, and runtime references immutably.
- [ ] Scope idempotency returns equal resources and rejects digest conflicts with 409.
- [ ] A Search fixture with one CREATED, one RETRY_WAIT, one COMPLETED, and one CANCELLED candidate returns queuedCount=1, runningCount=1, candidatesTested=1, and active excludes the two terminal rows.
### Candidate and strategy
- [ ] Manual start accepts only a committed scope ID and immutable Strategy/Composite refs; Search uses SubmitSearchCandidateCommand exactly and does not send selectionMode.
- [ ] Server derives SINGLE/COMPOSITE and rejects an inconsistent client assertion.
- [ ] Definitions are verified through Strategy APIs and retain implementation hashes.
- [ ] Composite execution is used for one and many selected strategies.
- [ ] SINGLE has exactly one matching component with weight 1; MAJORITY_VOTE normalizes weights 0 and thresholds 0.3/-0.3; weighted weights are finite, sum to 1, and have buy > sell.
- [ ] Supplied Strategy definitions exactly match Composite component IDs with no duplicates, omissions, or extras.
- [ ] Candidate is committed before queue submission with jobId = candidateId; manual idempotency and Search identity are atomic.
- [ ] Candidate and Attempt states, timestamps, origin, budget, and provenance are readable.
### Attempts, simulation, and accounting

- [ ] Attempts are numbered, bounded by maxAttempts, distinct from Candidates, and validate sealed snapshot, retained artifacts, and runtime policies.
- [ ] Only closed candles are simulated; OHLC stop/take ordering is deterministic.
- [ ] STOP_LOSS wins when stop-loss and take-profit share a candle.
- [ ] Range-end/strategy-close policies are versioned; intrabar time is not invented.
- [ ] Trade Detail exposes Pair, entry/exit times and prices, stops, quantity, fees, slippage, profit, and result percent.
- [ ] Slippage is 5 bps at entry and exit with side-correct worsening.
- [ ] Fee is entry plus exit notional fee; gross and net P&L are distinct and slippage is not double-counted.
- [ ] Full-capital unleveraged LONG quantity, no pyramiding, stop/take inequalities, gap fills, reserved SHORT extension, and half-up rounding are deterministic.
- [ ] resultPercent uses entry notional; totalReturnPercent uses initial capital.
- [ ] Public numbers are finite; exact decimal arithmetic does not alter shared wire types.
- [ ] Trades are persisted before queue success and ordered deterministically.
- [ ] Zero-trade success produces zero return/win rate/drawdown/Sharpe and is not rank eligible.
- [ ] A LONG fixture with entry market 100, exit market 110, fee 0, and 5 bps applies 100.05/109.945 executed prices, persists net profit after both slippage sides, and classifies the rounded result as WIN.
### Completion, retry, and failure

- [ ] Retryable simulation failures create a failed Attempt and RETRY_WAIT only when budget remains.
- [ ] Retry exhaustion/infrastructure loss finalize through TERMINAL_FAILURE_PENDING -> FAILED; completion retries have a separate budget and create no simulation Attempt.
- [ ] Completion uses the five-claim budget, correct Search/Manual lock order, lease expiry, and watchdog terminalization.
- [ ] A successful non-cancelled Candidate creates at most one Experiment.
- [ ] Queue signals are validated observations; PostgreSQL state, duplicate/late idempotency, and stale-lease fencing decide terminal outcomes.
- [ ] Missing snapshots and retained artifacts produce typed failures and never fall back to live/current data.
- [ ] Permanent or non-finite evaluation failure retains successful Attempt/Trades and creates no Experiment.
- [ ] A completion retry with an expired lease cannot write unless its generation, token, and live lease all match; a duplicate terminal callback leaves one Experiment and one Search counter update.
### Cancellation and recovery

- [ ] Cancellation is durable/idempotent/fenced, cannot reopen a Candidate, and Search commits its cancellation/counters before removePendingJobs.
- [ ] Cleanup only removes waiting/delayed jobs; running work may finish for audit.
- [ ] Cancelled audit Attempts expose Trades but create no Experiment, rank, counter, slot release, or success side effect.
- [ ] Startup/periodic reconciliation repairs interrupted enqueue and lost queue wake-ups.
- [ ] Worker crash recovery closes stale work or creates one typed infrastructure Attempt.
### Reads, provenance, and architecture

- [ ] REST returns documented 201/202/400/404/409 statuses without raw queue payloads; Trade cursors are opaque/resource- and limit-bound, ordered by entryTime/sequence/id.
- [ ] Experiment provenance reaches scope, snapshots, strategy versions/hashes, runtime hashes, policies, score, and ordered Trades.
- [ ] Replay MATCH requires exact Trade/metric equality and creates no new durable rows.
- [ ] Search owns Search Run counters, maxInFlight, stop conditions, and slot bookkeeping.
- [ ] REST and modules use public boundaries; no direct cross-module SQL/domain access exists.
- [ ] Queue contract is main-compatible and remains transport-only.
- [ ] The implementation supports multiple workers, extensible strategies/composites, observability, and deterministic replay.
