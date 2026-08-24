import type { BacktestLogApi, BacktestReadOptions, SearchCandidatePage, SearchCandidatePageRequest, SearchCandidateSummary, TradePage, TradePageRequest } from "../api";
import type { BacktestAttemptAudit, BacktestSubmissionAccepted, BenchmarkScopeSummary, CandidateProgress, CreateLeaderboardScopeCommand, ExperimentResultSummary, ReplayVerificationResult, StartManualBacktestCommand, SubmitSearchCandidateCommand } from "../domain/contracts";
import type { BacktestingModuleDependencies } from "./ports";
export declare const BACKTEST_RUNTIME_VERSION = "1.0.0";
export declare const BACKTEST_RUNTIME_SHA256 = "c7d208d3db06e01df73733b91ed928fbd78d06f0d6d978f5821547c8ee6af75b";
export declare function createInMemoryBacktestingDependencies(): BacktestingModuleDependencies;
export declare class BacktestingService implements BacktestLogApi {
    private readonly deps;
    constructor(deps: BacktestingModuleDependencies);
    private id;
    private now;
    private assertOwner;
    private scope;
    private candidate;
    private snapshot;
    private captureSnapshot;
    private validateScope;
    createBenchmarkScope(command: CreateLeaderboardScopeCommand, options: {
        scopeIdempotencyKey: string;
        ownerUserId: string;
    }): Promise<BenchmarkScopeSummary>;
    readBenchmarkScope(scopeId: string, options?: BacktestReadOptions): Promise<BenchmarkScopeSummary>;
    private compositeStrategy;
    private candidateRecord;
    private execute;
    private submit;
    startManual(command: StartManualBacktestCommand, options: {
        ownerUserId: string;
        submissionIdempotencyKey?: string;
    }): Promise<BacktestSubmissionAccepted>;
    submitSearchCandidate(command: SubmitSearchCandidateCommand): Promise<BacktestSubmissionAccepted>;
    status(candidateId: string, options?: BacktestReadOptions): Promise<CandidateProgress>;
    summarizeSearchCandidates(searchRunId: string): Promise<SearchCandidateSummary>;
    listSearchCandidates(searchRunId: string, page: SearchCandidatePageRequest): Promise<SearchCandidatePage>;
    cancelSearchCandidates(searchRunId: string): Promise<{
        candidateIds: string[];
    }>;
    cancelManualCandidate(candidateId: string): Promise<void>;
    removePendingJobs(_candidateIds: string[]): Promise<void>;
    readAttempt(attemptId: string, options?: BacktestReadOptions): Promise<BacktestAttemptAudit>;
    listAttemptTrades(attemptId: string, page: TradePageRequest, options?: BacktestReadOptions): Promise<TradePage>;
    readExperimentSummary(experimentId: string, options?: BacktestReadOptions): Promise<ExperimentResultSummary>;
    listSearchExperimentSummaries(searchRunId: string, options?: BacktestReadOptions): Promise<ExperimentResultSummary[]>;
    scoreExperiment(experimentId: string, input: {
        overallScore: number;
        rankEligible: boolean;
    }, options?: BacktestReadOptions): Promise<ExperimentResultSummary>;
    listExperimentTrades(experimentId: string, page: TradePageRequest, options?: BacktestReadOptions): Promise<TradePage>;
    private pageTrades;
    verifyReplay(experimentId: string, options?: BacktestReadOptions): Promise<ReplayVerificationResult>;
}
export declare function createBacktestingService(dependencies?: BacktestingModuleDependencies): BacktestLogApi;
