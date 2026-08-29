import type { AuthenticatedUserId } from "modules/auth/api";
import {
  LINEAR_REQUIRED_V1,
  type CreateLeaderboardScopeCommand,
  type LeaderboardEntry,
  type LeaderboardScope,
  type RankableExperiment,
  type RankingConfiguration,
} from "../api/contracts";
import type {
  LeaderboardApplicationDependencies,
  LeaderboardExperimentRepository,
} from "./ports";

const DEFAULT_CONFIGURATION: RankingConfiguration = {
  id: "ranking-v1",
  profileId: LINEAR_REQUIRED_V1.id,
  version: LINEAR_REQUIRED_V1.version,
  name: "Required MVP ranking",
  description: "LINEAR_REQUIRED_V1",
  formula: LINEAR_REQUIRED_V1.formula,
  minimumNumberOfTrades: LINEAR_REQUIRED_V1.eligibility.minimumNumberOfTrades,
  tieBreakers: LINEAR_REQUIRED_V1.tieBreakers,
  createdAt: "2026-08-27T00:00:00.000Z",
};

type StoredEntry = LeaderboardEntry & { active: boolean };
type StoredExperiment = RankableExperiment & { ownerUserId: AuthenticatedUserId };

function cloneConfiguration(configuration: RankingConfiguration): RankingConfiguration {
  return {
    ...configuration,
    formula: { ...configuration.formula },
    tieBreakers: [...configuration.tieBreakers] as RankingConfiguration["tieBreakers"],
  };
}

function cloneEntry(entry: StoredEntry): LeaderboardEntry {
  const { active: _active, ...publicEntry } = entry;
  return { ...publicEntry };
}

export class InMemoryLeaderboardRepositories {
  clock = { now: () => new Date().toISOString() };
  idGenerator: () => string = () => crypto.randomUUID();
  readonly scopes = new Map<string, LeaderboardScope>();
  readonly configurations = new Map<string, RankingConfiguration>([
    [DEFAULT_CONFIGURATION.id, DEFAULT_CONFIGURATION],
  ]);
  readonly entries = new Map<string, StoredEntry>();
  readonly experiments = new Map<string, StoredExperiment>();

  readonly scopeRepository = {
    insert: async (ownerUserId: AuthenticatedUserId, command: CreateLeaderboardScopeCommand) => {
      const scope: LeaderboardScope = {
        id: `scope-${this.idGenerator()}`,
        ownerUserId,
        name: command.name.trim(),
        k: command.k ?? LINEAR_REQUIRED_V1.defaultTopK,
        rankingConfigurationId: command.rankingConfigurationId,
        comparisonKey: command.comparisonKey.trim(),
        createdAt: this.clock.now(),
      };
      this.scopes.set(scope.id, scope);
      return { ...scope };
    },
    getByOwnerAndId: async (ownerUserId: AuthenticatedUserId, id: string) => {
      const scope = this.scopes.get(id);
      return scope?.ownerUserId === ownerUserId ? { ...scope } : undefined;
    },
  };

  readonly configurationRepository = {
    getById: async (id: string) => {
      const configuration = this.configurations.get(id);
      return configuration ? cloneConfiguration(configuration) : undefined;
    },
    listAll: async () =>
      [...this.configurations.values()]
        .sort((left, right) => left.version - right.version || left.id.localeCompare(right.id))
        .map(cloneConfiguration),
  };

  readonly entryRepository = {
    getActiveTopK: async (ownerUserId: AuthenticatedUserId, scopeId: string, k: number) => {
      const scope = this.scopes.get(scopeId);
      if (!scope || scope.ownerUserId !== ownerUserId) return [];
      return [...this.entries.values()]
        .filter((entry) => entry.active && entry.leaderboardScopeId === scopeId)
        .sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id))
        .slice(0, k)
        .map(cloneEntry);
    },
    listByOwnerAndSearchRun: async (ownerUserId: AuthenticatedUserId, searchRunId: string) =>
      [...this.entries.values()]
        .filter(
          (entry) =>
            entry.active &&
            entry.searchRunId === searchRunId &&
            this.scopes.get(entry.leaderboardScopeId)?.ownerUserId === ownerUserId,
        )
        .map(cloneEntry),
    insertForScopeOwner: async (
      ownerUserId: AuthenticatedUserId,
      entry: Omit<LeaderboardEntry, "id" | "rank">,
    ) => {
      const scope = this.scopes.get(entry.leaderboardScopeId);
      if (!scope || scope.ownerUserId !== ownerUserId) throw new Error("NOT_FOUND");
      const existing = [...this.entries.values()].find(
        (candidate) =>
          candidate.leaderboardScopeId === entry.leaderboardScopeId &&
          candidate.experimentId === entry.experimentId,
      );
      if (existing) return cloneEntry(existing);
      const stored: StoredEntry = {
        ...entry,
        id: `entry-${this.idGenerator()}`,
        rank: 0,
        active: true,
      };
      this.entries.set(stored.id, stored);
      return cloneEntry(stored);
    },
    deactivateForScopeOwner: async (ownerUserId: AuthenticatedUserId, entryId: string) => {
      const entry = this.entries.get(entryId);
      if (!entry || this.scopes.get(entry.leaderboardScopeId)?.ownerUserId !== ownerUserId) {
        throw new Error("NOT_FOUND");
      }
      entry.active = false;
    },
    findByScopeOwnerAndExperiment: async (
      ownerUserId: AuthenticatedUserId,
      scopeId: string,
      experimentId: string,
    ) => {
      const scope = this.scopes.get(scopeId);
      if (!scope || scope.ownerUserId !== ownerUserId) return undefined;
      const entry = [...this.entries.values()].find(
        (candidate) =>
          candidate.leaderboardScopeId === scopeId && candidate.experimentId === experimentId,
      );
      return entry ? cloneEntry(entry) : undefined;
    },
  };

  readonly experimentRepository: LeaderboardExperimentRepository = {
    getByOwnerAndId: async (ownerUserId, experimentId) => {
      const experiment = this.experiments.get(experimentId);
      return experiment?.ownerUserId === ownerUserId ? { ...experiment } : undefined;
    },
    listByOwnerAndSearchRun: async (ownerUserId, searchRunId) =>
      [...this.experiments.values()]
        .filter((experiment) => experiment.ownerUserId === ownerUserId && experiment.searchRunId === searchRunId)
        .map((experiment) => ({ ...experiment })),
  };

  addExperiment(ownerUserId: AuthenticatedUserId, experiment: RankableExperiment): void {
    this.experiments.set(experiment.experimentId, { ...experiment, ownerUserId });
  }

  createDependencies(): LeaderboardApplicationDependencies<
    LeaderboardScope,
    CreateLeaderboardScopeCommand,
    LeaderboardEntry,
    RankingConfiguration
  > {
    return {
      scopeRepository: this.scopeRepository,
      entryRepository: this.entryRepository,
      configurationRepository: this.configurationRepository,
      experimentRepository: this.experimentRepository,
      clock: this.clock,
      idGenerator: this.idGenerator,
    };
  }
}

export function createInMemoryLeaderboardDependencies() {
  const repositories = new InMemoryLeaderboardRepositories();
  return { ...repositories.createDependencies(), repositories };
}
