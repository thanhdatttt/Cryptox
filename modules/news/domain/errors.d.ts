export declare class NewsException extends Error {
    readonly code: "INVALID_NEWS_ITEM" | "PROVIDER_UNAVAILABLE" | "PERSISTENCE_FAILED";
    constructor(code: "INVALID_NEWS_ITEM" | "PROVIDER_UNAVAILABLE" | "PERSISTENCE_FAILED", message: string);
}
