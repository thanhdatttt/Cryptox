"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verify = exports.login = exports.register = void 0;
exports.createAuthModule = createAuthModule;
const notImplemented = () => { throw new Error("NOT_IMPLEMENTED"); };
const register = async () => notImplemented();
exports.register = register;
const login = async () => notImplemented();
exports.login = login;
const verify = async () => notImplemented();
exports.verify = verify;
function createAuthModule(_deps) { return { register: exports.register, login: exports.login, verify: exports.verify }; }
