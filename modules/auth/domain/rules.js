"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateToken = exports.validatePassword = exports.normalizeEmail = void 0;
const errors_1 = require("./errors");
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = (email) => {
    if (typeof email !== "string")
        throw new errors_1.AuthException("VALIDATION_ERROR", "Email is required.");
    const normalized = email.trim().toLowerCase();
    if (!emailPattern.test(normalized) || normalized.length > 254)
        throw new errors_1.AuthException("VALIDATION_ERROR", "Email must be valid.");
    return normalized;
};
exports.normalizeEmail = normalizeEmail;
const validatePassword = (password) => {
    if (typeof password !== "string" || password.length < 8 || password.length > 128) {
        throw new errors_1.AuthException("VALIDATION_ERROR", "Password must be between 8 and 128 characters.");
    }
    return password;
};
exports.validatePassword = validatePassword;
const validateToken = (token) => {
    if (typeof token !== "string" || token.trim().length === 0)
        throw new errors_1.AuthException("INVALID_TOKEN", "JWT is required.");
    return token.trim();
};
exports.validateToken = validateToken;
