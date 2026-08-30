import type {
  BacktestingModulePublicApi,
  CandidatePage,
  CandidatePageRequest,
  CandidateProgress,
  Experiment,
  SearchCandidateSummary,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  TradePage,
  TradePageRequest,
} from "./contracts";
import type { AuthenticatedRequestContext } from "modules/auth/api";
import { createEvaluationModule } from "@cryptox/evaluation/bootstrap";
import { getLeaderboardScope, score, submit } from "@cryptox/leaderboard";
import { createBacktestingApplication } from "../application/service";
import { InMemoryBacktestingRepositories } from "../application/memory";
import { createBoundedLocalBacktestExecutor } from "./composition";

export * from "./contracts";
export type {
  BacktestExecutionCapacity,
  BacktestExecutionPort,
  BacktestExecutionRequest,
  BacktestExecutionState,
  BacktestExecutionStatus,
  BacktestRunner,
  BacktestSubmission,
  BacktestTerminalOutcome,
} from "../application/ports";

const repositories = new InMemoryBacktestingRepositories();
const defaultEvaluation = createEvaluationModule();
const defaultExecution = createBoundedLocalBacktestExecutor({
  capacity: 1,
  runner: {
    run: async () => {
      throw new Error("backtesting module is not configured");
    },
  },
});
const defaultApplication = createBacktestingApplication({
  execution: defaultExecution,
  marketData: {
    createDatasetSnapshot: async () => {
      throw new Error("market data module is not configured");
    },
    readDatasetSnapshot: async () => {
      throw new Error("market data module is not configured");
    },
  },
  strategy: {
    readStrategyDefinition: async () => {
      throw new Error("strategy module is not configured");
    },
    readCompositeDefinition: async () => {
      throw new Error("strategy module is not configured");
    },
    resolveStrategy: async () => {
      throw new Error("strategy module is not configured");
    },
    combineSignals: () => {
      throw new Error("strategy module is not configured");
    },
  },
  evaluation: defaultEvaluation,
  leaderboard: { getLeaderboardScope, score, submit },
  candidateRepository: repositories.candidateRepository,
  experimentRepository: repositories.experimentRepository,
  unitOfWork: repositories.unitOfWork,
  completionUnitOfWork: repositories.completionUnitOfWork,
  clock: repositories.clock,
});

export const startManual: BacktestingModulePublicApi["startManual"] = (
  context: AuthenticatedRequestContext,
  command: StartManualBacktestCommand,
) => defaultApplication.startManual(context, command);
export const submitSearchCandidate: BacktestingModulePublicApi["submitSearchCandidate"] = (
  context: AuthenticatedRequestContext,
  command: SubmitSearchCandidateCommand,
) => defaultApplication.submitSearchCandidate(context, command);
export const status = (
  context: AuthenticatedRequestContext,
  candidateId: string,
): Promise<CandidateProgress> => defaultApplication.status(context, candidateId);
export const summarizeSearchCandidates = (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<SearchCandidateSummary> => defaultApplication.summarizeSearchCandidates(context, searchRunId);
export const listSearchCandidates = (
  context: AuthenticatedRequestContext,
  searchRunId: string,
  page: CandidatePageRequest,
): Promise<CandidatePage> => defaultApplication.listSearchCandidates(context, searchRunId, page);
export const cancelSearchCandidates: BacktestingModulePublicApi["cancelSearchCandidates"] = (
  context: AuthenticatedRequestContext,
  searchRunId: string,
) => defaultApplication.cancelSearchCandidates(context, searchRunId);
export const cancelCandidate: BacktestingModulePublicApi["cancelCandidate"] = (
  context: AuthenticatedRequestContext,
  candidateId: string,
) => defaultApplication.cancelCandidate(context, candidateId);
export const readExperiment = (
  context: AuthenticatedRequestContext,
  experimentId: string,
): Promise<Experiment> => defaultApplication.readExperiment(context, experimentId);
export const listSearchExperiments = (
  context: AuthenticatedRequestContext,
  searchRunId: string,
): Promise<readonly Experiment[]> => defaultApplication.listSearchExperiments(context, searchRunId);
export const listExperimentTrades = (
  context: AuthenticatedRequestContext,
  experimentId: string,
  page: TradePageRequest,
): Promise<TradePage> => defaultApplication.listExperimentTrades(context, experimentId, page);
