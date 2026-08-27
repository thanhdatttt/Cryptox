import type { EvaluatorModulePublicApi } from "@cryptox/evaluation";
import type { MarketDataModulePublicApi } from "@cryptox/market-data";
import type {
  LeaderboardModulePublicApi,
  LeaderboardSubmission,
  LeaderboardSubmissionResult,
} from "@cryptox/leaderboard";
import type { StrategyModulePublicApi } from "@cryptox/strategy";

export interface Clock {
  now(): string;
}

export interface BacktestExecutionRequest {
  candidateId: string;
}

export type BacktestExecutionState =
  | "ACCEPTED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface BacktestExecutionCapacity {
  maximum: number;
  active: number;
  available: number;
}

export interface BacktestExecutionStatus {
  candidateId: string;
  state: BacktestExecutionState;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  failure?: { code: "RUNNER_FAILED"; message: string };
}

export type BacktestTerminalOutcome<TResult> =
  | {
      candidateId: string;
      state: "SUCCEEDED";
      result: TResult;
      startedAt?: string;
      completedAt: string;
      durationMs?: number;
    }
  | {
      candidateId: string;
      state: "FAILED";
      failure: { code: "RUNNER_FAILED"; message: string };
      startedAt?: string;
      completedAt: string;
      durationMs?: number;
    }
  | {
      candidateId: string;
      state: "CANCELLED";
      startedAt?: string;
      completedAt: string;
      durationMs?: number;
    };

export type BacktestSubmission<TResult> =
  | {
      accepted: true;
      candidateId: string;
      status: "ACCEPTED";
      outcome: Promise<BacktestTerminalOutcome<TResult>>;
    }
  | {
      accepted: false;
      candidateId: string;
      status: "SATURATED";
      capacity: BacktestExecutionCapacity;
    };

export interface BacktestExecutionPort<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  submit(request: TRequest): Promise<BacktestSubmission<TResult>>;
  capacity(): Promise<BacktestExecutionCapacity>;
  status(candidateId: string): Promise<BacktestExecutionStatus | undefined>;
  cancel(candidateId: string): Promise<boolean>;
}

export interface BacktestRunner<
  TRequest extends BacktestExecutionRequest = BacktestExecutionRequest,
  TResult = unknown,
> {
  run(request: TRequest, signal: AbortSignal): Promise<TResult>;
}

export interface CandidateRepository<TCandidate, TCreateCommand> {
  insert(command: TCreateCommand): Promise<TCandidate>;
  get(candidateId: string): Promise<TCandidate | undefined>;
  save(candidate: TCandidate): Promise<TCandidate>;
  listBySearchRun(searchRunId: string): Promise<readonly TCandidate[]>;
}

export interface ExperimentRepository<TExperiment, TTrade> {
  insert(experiment: TExperiment, trades: readonly TTrade[]): Promise<TExperiment>;
  get(experimentId: string): Promise<TExperiment | undefined>;
  listBySearchRun(searchRunId: string): Promise<readonly TExperiment[]>;
  listTrades(
    experimentId: string,
    page: { limit: number; cursor?: string },
  ): Promise<{ items: readonly TTrade[]; nextCursor?: string }>;
}

export interface BacktestingUnitOfWork {
  run<T>(operation: () => Promise<T>): Promise<T>;
}

export interface BacktestingCompletionUnitOfWork<TExperiment, TTrade> {
  commit(
    input: {
      experiment: TExperiment;
      trades: readonly TTrade[];
      leaderboardSubmission: LeaderboardSubmission;
    },
    participants: {
      insertExperiment(experiment: TExperiment, trades: readonly TTrade[]): Promise<TExperiment>;
      submitLeaderboard(
        submission: LeaderboardSubmission,
      ): Promise<LeaderboardSubmissionResult>;
    },
  ): Promise<{
    experiment: TExperiment;
    leaderboard: LeaderboardSubmissionResult;
  }>;
}

export interface BacktestingApplicationDependencies<TCandidate, TCreateCommand, TExperiment, TTrade> {
  execution: BacktestExecutionPort;
  marketData: Pick<
    MarketDataModulePublicApi,
    "createDatasetSnapshot" | "readDatasetSnapshot"
  >;
  strategy: Pick<
    StrategyModulePublicApi,
    | "readStrategyDefinition"
    | "readCompositeDefinition"
    | "resolveStrategy"
    | "combineSignals"
  >;
  evaluation: Pick<EvaluatorModulePublicApi, "evaluator" | "runtimeVersion">;
  leaderboard: Pick<
    LeaderboardModulePublicApi,
    "getLeaderboardScope" | "score" | "submit"
  >;
  candidateRepository: CandidateRepository<TCandidate, TCreateCommand>;
  experimentRepository: ExperimentRepository<TExperiment, TTrade>;
  unitOfWork: BacktestingUnitOfWork;
  completionUnitOfWork: BacktestingCompletionUnitOfWork<TExperiment, TTrade>;
  clock: Clock;
}
