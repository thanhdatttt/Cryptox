"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketDataException = void 0;
class MarketDataException extends Error {
    code;
    retryable;
    details;
    constructor(code, message, retryable = false, details) {
        super(message);
        this.code = code;
        this.retryable = retryable;
        this.details = details;
        this.name = "MarketDataException";
    }
}
exports.MarketDataException = MarketDataException;
