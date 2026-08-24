export declare class AuthException extends Error {
    readonly code: "EMAIL_ALREADY_EXISTS" | "INVALID_CREDENTIALS" | "INVALID_TOKEN" | "VALIDATION_ERROR";
    constructor(code: "EMAIL_ALREADY_EXISTS" | "INVALID_CREDENTIALS" | "INVALID_TOKEN" | "VALIDATION_ERROR", message: string);
}
