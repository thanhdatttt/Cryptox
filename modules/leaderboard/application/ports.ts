import type { AuthenticatedUserId } from "modules/auth/api";

export interface LeaderboardScopeRepository<TScope, TCreateCommand> {
  insert(ownerUserId: AuthenticatedUserId, command: TCreateCommand): Promise<TScope>;
  getByOwnerAndId(
    ownerUserId: AuthenticatedUserId,
    id: string,
  ): Promise<TScope | undefined>;
}

export interface RankingConfigurationRepository<TConfiguration> {
  getById(id: string): Promise<TConfiguration | undefined>;
  listAll(): Promise<readonly TConfiguration[]>;
}

export interface LeaderboardEntryRepository<TEntry extends object> {
  getActiveTopK(
    ownerUserId: AuthenticatedUserId,
    scopeId: string,
    k: number,
  ): Promise<readonly TEntry[]>;
  listByOwnerAndSearchRun(
    ownerUserId: AuthenticatedUserId,
    searchRunId: string,
  ): Promise<readonly TEntry[]>;
  insertForScopeOwner(
    ownerUserId: AuthenticatedUserId,
    entry: Omit<TEntry, "id" | "rank">,
  ): Promise<TEntry>;
  deactivateForScopeOwner(ownerUserId: AuthenticatedUserId, entryId: string): Promise<void>;
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
