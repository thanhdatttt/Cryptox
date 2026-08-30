import type { CompletionUnitOfWork } from "modules/backtesting/api";
import type { LeaderboardEntry, LeaderboardScope, ScoreFormula } from "../domain/contracts";
export interface LeaderboardScopeRepository {
    insert(scope: LeaderboardScope): Promise<LeaderboardScope>;
    getById(userId: string, id: string): Promise<LeaderboardScope | undefined>;
}
export interface ScoreFormulaRepository {
    getById(id: string): Promise<ScoreFormula | undefined>;
    listAll(): Promise<ScoreFormula[]>;
}
export interface LeaderboardEntryRepository {
    getActiveTopK(scopeId: string, k: number, unitOfWork?: CompletionUnitOfWork): Promise<LeaderboardEntry[]>;
    getByExperimentResultId(experimentResultId: string, unitOfWork?: CompletionUnitOfWork): Promise<LeaderboardEntry | undefined>;
    insert(entry: Omit<LeaderboardEntry, "id" | "rank">, unitOfWork?: CompletionUnitOfWork): Promise<LeaderboardEntry>;
    deactivate(entryId: string, unitOfWork?: CompletionUnitOfWork): Promise<void>;
}
export interface ExperimentResultReader {
    getBySearchRunId(userId: string, searchRunId: string): Promise<Array<{
        id: string;
        candidateId: string;
        searchRunId: string;
        leaderboardScopeId: string;
        scoreFormulaId: string;
        overallScore: number;
        rankEligible: boolean;
    }>>;
}
export interface SearchRunOwnerReader {
    getByOwner(userId: string, searchRunId: string): Promise<unknown | undefined>;
}
export interface Clock {
    now(): string;
}
export interface LeaderboardModuleDependencies {
    scopeRepository: LeaderboardScopeRepository;
    entryRepository: LeaderboardEntryRepository;
    formulaRepository: ScoreFormulaRepository;
    experimentReader: ExperimentResultReader;
    searchRunReader?: SearchRunOwnerReader;
    clock: Clock;
    initialScopes?: LeaderboardScope[];
    initialFormulas?: ScoreFormula[];
    idGenerator?: () => string;
}
