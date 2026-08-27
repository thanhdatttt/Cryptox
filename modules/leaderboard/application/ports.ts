export interface LeaderboardScopeRepository<TScope, TCreateCommand> {
  insert(command: TCreateCommand): Promise<TScope>;
  getById(id: string): Promise<TScope | undefined>;
}

export interface RankingConfigurationRepository<TConfiguration> {
  getById(id: string): Promise<TConfiguration | undefined>;
  listAll(): Promise<readonly TConfiguration[]>;
}

export interface LeaderboardEntryRepository<TEntry extends object> {
  getActiveTopK(scopeId: string, k: number): Promise<readonly TEntry[]>;
  listBySearchRun(searchRunId: string): Promise<readonly TEntry[]>;
  insert(entry: Omit<TEntry, "id" | "rank">): Promise<TEntry>;
  deactivate(entryId: string): Promise<void>;
}

export interface Clock {
  now(): string;
}

export interface LeaderboardApplicationDependencies<
  TScope,
  TCreateCommand,
  TEntry extends object,
  TConfiguration,
> {
  scopeRepository: LeaderboardScopeRepository<TScope, TCreateCommand>;
  entryRepository: LeaderboardEntryRepository<TEntry>;
  configurationRepository: RankingConfigurationRepository<TConfiguration>;
  clock: Clock;
}
