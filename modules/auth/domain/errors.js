"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthException = void 0;
class AuthException extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = "AuthException";
    }
}
exports.AuthException = AuthException;
