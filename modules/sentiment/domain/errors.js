"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SentimentException = void 0;
class SentimentException extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "SentimentException";
    }
}
exports.SentimentException = SentimentException;
