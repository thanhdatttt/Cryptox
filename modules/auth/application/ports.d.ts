import type { UserRepository } from "../domain/contracts";
export interface Clock {
    now(): string;
}
export interface PasswordHasher {
    hash(password: string): Promise<string>;
    verify(password: string, passwordHash: string): Promise<boolean>;
}
export interface TokenCodec {
    sign(input: {
        userId: string;
    }): string;
    verify(token: string): {
        userId: string;
    };
}
export interface AuthModuleDependencies {
    userRepository: UserRepository;
    jwtSecret: string;
    clock?: Clock;
    passwordHasher?: PasswordHasher;
    tokenCodec?: TokenCodec;
    idGenerator?: () => string;
}
