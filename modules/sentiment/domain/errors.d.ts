export declare class SentimentException extends Error {
    readonly code: "ANALYSIS_FAILED" | "DUPLICATE_RESULT" | "INVALID_INPUT" | "INVALID_RESULT" | "INVALID_SNAPSHOT" | "SNAPSHOT_NOT_FOUND";
    constructor(code: "ANALYSIS_FAILED" | "DUPLICATE_RESULT" | "INVALID_INPUT" | "INVALID_RESULT" | "INVALID_SNAPSHOT" | "SNAPSHOT_NOT_FOUND", message: string);
}
