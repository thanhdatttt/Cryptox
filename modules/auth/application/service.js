"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInMemoryAuthDependencies = createInMemoryAuthDependencies;
exports.createAuthModule = createAuthModule;
const node_crypto_1 = require("node:crypto");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errors_1 = require("../domain/errors");
const rules_1 = require("../domain/rules");
const now = () => new Date().toISOString();
class MemoryUserRepository {
    usersByEmail = new Map();
    usersById = new Map();
    async insert(user) {
        if (this.usersByEmail.has(user.email))
            throw new errors_1.AuthException("EMAIL_ALREADY_EXISTS", "Email is already registered.");
        const stored = { ...user };
        this.usersByEmail.set(stored.email, stored);
        this.usersById.set(stored.id, stored);
    }
    async findByEmail(email) {
        const user = this.usersByEmail.get(email);
        return user ? { ...user } : undefined;
    }
    async findById(id) {
        const user = this.usersById.get(id);
        return user ? { ...user } : undefined;
    }
}
const bcryptHasher = {
    hash: (password) => bcryptjs_1.default.hash(password, 12),
    verify: (password, passwordHash) => bcryptjs_1.default.compare(password, passwordHash),
};
class Hs256JwtCodec {
    secret;
    constructor(secret) {
        this.secret = secret;
    }
    sign(input) {
        return jsonwebtoken_1.default.sign({ sub: input.userId }, this.secret, { algorithm: "HS256", expiresIn: "1h" });
    }
    verify(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.secret, { algorithms: ["HS256"] });
            if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub.length === 0)
                throw new Error("JWT subject is missing");
            return { userId: payload.sub };
        }
        catch {
            throw new errors_1.AuthException("INVALID_TOKEN", "JWT is invalid or expired.");
        }
    }
}
const defaultSecret = () => process.env.JWT_SECRET?.trim() || "cryptox-local-development-secret-change-me";
const isDuplicateError = (error) => error instanceof errors_1.AuthException && error.code === "EMAIL_ALREADY_EXISTS" || typeof error === "object" && error !== null && "code" in error && error.code === "23505";
function createInMemoryAuthDependencies() {
    return { userRepository: new MemoryUserRepository(), jwtSecret: defaultSecret(), clock: { now }, passwordHasher: bcryptHasher, idGenerator: node_crypto_1.randomUUID };
}
function createAuthModule(dependencies = createInMemoryAuthDependencies()) {
    const defaults = createInMemoryAuthDependencies();
    const repository = dependencies.userRepository ?? defaults.userRepository;
    const jwtSecret = dependencies.jwtSecret?.trim() || defaults.jwtSecret;
    const clock = dependencies.clock ?? defaults.clock;
    const passwordHasher = dependencies.passwordHasher ?? defaults.passwordHasher;
    const tokenCodec = dependencies.tokenCodec ?? new Hs256JwtCodec(jwtSecret);
    const idGenerator = dependencies.idGenerator ?? defaults.idGenerator;
    return {
        async register(email, password) {
            const normalizedEmail = (0, rules_1.normalizeEmail)(email);
            const normalizedPassword = (0, rules_1.validatePassword)(password);
            if (await repository.findByEmail(normalizedEmail))
                throw new errors_1.AuthException("EMAIL_ALREADY_EXISTS", "Email is already registered.");
            const user = { id: idGenerator(), email: normalizedEmail, passwordHash: await passwordHasher.hash(normalizedPassword), createdAt: clock.now() };
            try {
                await repository.insert(user);
            }
            catch (error) {
                if (isDuplicateError(error))
                    throw new errors_1.AuthException("EMAIL_ALREADY_EXISTS", "Email is already registered.");
                throw error;
            }
        },
        async login(email, password) {
            const user = await repository.findByEmail((0, rules_1.normalizeEmail)(email));
            if (!user || !await passwordHasher.verify((0, rules_1.validatePassword)(password), user.passwordHash)) {
                throw new errors_1.AuthException("INVALID_CREDENTIALS", "Email or password is incorrect.");
            }
            return { token: tokenCodec.sign({ userId: user.id }) };
        },
        async verify(token) {
            return tokenCodec.verify((0, rules_1.validateToken)(token));
        },
    };
}
