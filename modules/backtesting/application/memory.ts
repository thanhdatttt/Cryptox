import type { AuthenticatedUserId } from "modules/auth/api";
import type { LeaderboardSubmission, LeaderboardSubmissionResult } from "@cryptox/leaderboard";
import type {
  BacktestConfiguration,
  CandidatePageRequest,
  CandidateProgress,
  Experiment,
  StartManualBacktestCommand,
  SubmitSearchCandidateCommand,
  Trade,
} from "./ports";
import type {
  BacktestingApplicationDependencies,
  BacktestingCompletionUnitOfWork,
} from "./ports";
import type { BacktestingCandidate } from "./service";

type CreateCommand = StartManualBacktestCommand | SubmitSearchCandidateCommand;

function copy<T>(value: T): T {
  return structuredClone(value);
}

function isSearchCommand(command: CreateCommand): command is SubmitSearchCandidateCommand {
  return "searchRunId" in command;
}

export class InMemoryBacktestingRepositories {
  readonly candidates = new Map<string, BacktestingCandidate>();
  readonly experiments = new Map<string, Experiment>();
  readonly trades = new Map<string, Trade[]>();
  idGenerator: () => string = () => crypto.randomUUID();
  clock = { now: () => new Date().toISOString() };

  readonly candidateRepository = {
    insert: async (ownerUserId: AuthenticatedUserId, command: CreateCommand): Promise<BacktestingCandidate> => {
      const candidateId = this.idGenerator();
      const createdAt = this.clock.now();
      const candidate: BacktestingCandidate = {
        candidateId,
        ownerUserId,
        origin: isSearchCommand(command)
          ? {
              kind: "SEARCH",
              searchRunId: command.searchRunId,
              leaderboardScopeId: command.leaderboardScopeId,
              iterationNumber: command.iterationNumber,
            }
          : { kind: "MANUAL", leaderboardScopeId: command.leaderboardScopeId },
        strategySelection: copy(command.strategySelection),
        marketInput: copy(command.marketInput),
        configuration: copy(command.configuration),
        status: "ACCEPTED",
        createdAt,
        updatedAt: createdAt,
      };
      this.candidates.set(candidateId, candidate);
      return copy(candidate);
    },
    getByOwnerAndId: async (ownerUserId: AuthenticatedUserId, candidateId: string) => {
      const candidate = this.candidates.get(candidateId);
      return candidate?.ownerUserId === ownerUserId ? copy(candidate) : undefined;
    },
    save: async (ownerUserId: AuthenticatedUserId, candidate: BacktestingCandidate) => {
      const existing = this.candidates.get(candidate.candidateId);
      if (!existing || existing.ownerUserId !== ownerUserId || candidate.ownerUserId !== ownerUserId) {
        throw new Error("NOT_FOUND");
      }
      this.candidates.set(candidate.candidateId, copy(candidate));
      return copy(candidate);
    },
    listByOwnerAndSearchRun: async (ownerUserId: AuthenticatedUserId, searchRunId: string) =>
      [...this.candidates.values()]
        .filter((candidate) => candidate.ownerUserId === ownerUserId && candidate.origin.kind === "SEARCH" && candidate.origin.searchRunId === searchRunId)
        .map(copy),
  };

  readonly experimentRepository = {
    insertForCandidateOwner: async (
      ownerUserId: AuthenticatedUserId,
      experiment: Experiment,
      trades: readonly Trade[],
    ): Promise<Experiment> => {
      const candidate = this.candidates.get(experiment.candidateId);
      if (!candidate || candidate.ownerUserId !== ownerUserId) throw new Error("NOT_FOUND");
      const existing = this.experiments.get(experiment.id);
      if (existing) return copy(existing);
      const existingForCandidate = [...this.experiments.values()].find((item) => item.candidateId === experiment.candidateId);
      if (existingForCandidate) return copy(existingForCandidate);
      this.experiments.set(experiment.id, copy(experiment));
      this.trades.set(experiment.id, copy([...trades]));
      return copy(experiment);
    },
    getByCandidateOwnerAndId: async (ownerUserId: AuthenticatedUserId, experimentId: string) => {
      const experiment = this.experiments.get(experimentId);
      if (!experiment) return undefined;
      const candidate = this.candidates.get(experiment.candidateId);
      return candidate?.ownerUserId === ownerUserId ? copy(experiment) : undefined;
    },
    listByCandidateOwnerAndSearchRun: async (ownerUserId: AuthenticatedUserId, searchRunId: string) =>
      [...this.experiments.values()]
        .filter((experiment) => {
          const candidate = this.candidates.get(experiment.candidateId);
          return candidate?.ownerUserId === ownerUserId && experiment.searchRunId === searchRunId;
        })
        .map(copy),
    listTradesByCandidateOwner: async (
      ownerUserId: AuthenticatedUserId,
      experimentId: string,
      page: CandidatePageRequest,
    ) => {
      const experiment = this.experiments.get(experimentId);
      const candidate = experiment ? this.candidates.get(experiment.candidateId) : undefined;
      if (!experiment || candidate?.ownerUserId !== ownerUserId) throw new Error("NOT_FOUND");
      const values = [...(this.trades.get(experimentId) ?? [])].sort(
        (left, right) => left.sequence - right.sequence || left.id.localeCompare(right.id),
      );
      const start = page.cursor ? Math.max(0, values.findIndex((trade) => trade.id === page.cursor) + 1) : 0;
      const items = values.slice(start, start + page.limit).map(copy);
      return {
        items,
        ...(start + items.length < values.length && items.length ? { nextCursor: items.at(-1)!.id } : {}),
      };
    },
  };

  readonly unitOfWork = {
    run: async <T>(operation: () => Promise<T>): Promise<T> => {
      const candidates = new Map([...this.candidates].map(([id, value]) => [id, copy(value)]));
      const experiments = new Map([...this.experiments].map(([id, value]) => [id, copy(value)]));
      const trades = new Map([...this.trades].map(([id, value]) => [id, copy(value)]));
      try {
        return await operation();
      } catch (error) {
        this.candidates.clear();
        this.experiments.clear();
        this.trades.clear();
        for (const [id, value] of candidates) this.candidates.set(id, value);
        for (const [id, value] of experiments) this.experiments.set(id, value);
        for (const [id, value] of trades) this.trades.set(id, value);
        throw error;
      }
    },
  };

  readonly completionUnitOfWork: BacktestingCompletionUnitOfWork<Experiment, Trade> = {
    commit: async (input, participants) => {
      const experiments = new Map([...this.experiments].map(([id, value]) => [id, copy(value)]));
      const trades = new Map([...this.trades].map(([id, value]) => [id, copy(value)]));
      try {
        const experiment = await participants.insertExperiment(input.ownerUserId, input.experiment, input.trades);
        const leaderboard = await participants.submitLeaderboard(input.ownerUserId, input.leaderboardSubmission);
        return { experiment, leaderboard };
      } catch (error) {
        this.experiments.clear();
        this.trades.clear();
        for (const [id, value] of experiments) this.experiments.set(id, value);
        for (const [id, value] of trades) this.trades.set(id, value);
        throw error;
      }
    },
  };

  createDependencies(
    overrides: Pick<BacktestingApplicationDependencies<BacktestingCandidate, CreateCommand, Experiment, Trade>, "execution" | "marketData" | "strategy" | "evaluation" | "leaderboard">,
  ): BacktestingApplicationDependencies<BacktestingCandidate, CreateCommand, Experiment, Trade> {
    return {
      candidateRepository: this.candidateRepository,
      experimentRepository: this.experimentRepository,
      unitOfWork: this.unitOfWork,
      completionUnitOfWork: this.completionUnitOfWork,
      clock: this.clock,
      ...overrides,
    };
  }
}

export function createInMemoryBacktestingRepositories(): InMemoryBacktestingRepositories {
  return new InMemoryBacktestingRepositories();
}

export type { BacktestConfiguration, LeaderboardSubmission, LeaderboardSubmissionResult };
