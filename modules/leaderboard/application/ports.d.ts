import type { LeaderboardEntry, LeaderboardScope, ScoreFormula } from "../domain/contracts";
export interface LeaderboardScopeRepository {
    insert(scope: LeaderboardScope): Promise<LeaderboardScope>;
    getById(id: string): Promise<LeaderboardScope | undefined>;
}
export interface ScoreFormulaRepository {
    getById(id: string): Promise<ScoreFormula | undefined>;
    listAll(): Promise<ScoreFormula[]>;
}
export interface LeaderboardEntryRepository {
    getActiveTopK(scopeId: string, k: number): Promise<LeaderboardEntry[]>;
    insert(entry: Omit<LeaderboardEntry, "id" | "rank">): Promise<LeaderboardEntry>;
    deactivate(entryId: string): Promise<void>;
}
export interface ExperimentResultReader {
    getBySearchRunId(searchRunId: string): Promise<Array<{
        id: string;
        candidateId: string;
        searchRunId: string;
        leaderboardScopeId: string;
        scoreFormulaId: string;
        overallScore: number;
        rankEligible: boolean;
    }>>;
}
export interface Clock {
    now(): string;
}
export interface LeaderboardModuleDependencies {
    scopeRepository: LeaderboardScopeRepository;
    entryRepository: LeaderboardEntryRepository;
    formulaRepository: ScoreFormulaRepository;
    experimentReader: ExperimentResultReader;
    clock: Clock;
}
