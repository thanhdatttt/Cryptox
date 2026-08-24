"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsException = void 0;
class NewsException extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "NewsException";
    }
}
exports.NewsException = NewsException;
