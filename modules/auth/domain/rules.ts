import { AuthException } from "./errors";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (email: string): string => {
  if (typeof email !== "string") throw new AuthException("VALIDATION_ERROR", "Email is required.");
  const normalized = email.trim().toLowerCase();
  if (!emailPattern.test(normalized) || normalized.length > 254) throw new AuthException("VALIDATION_ERROR", "Email must be valid.");
  return normalized;
};

export const validatePassword = (password: string): string => {
  if (typeof password !== "string" || password.length < 8 || password.length > 128) {
    throw new AuthException("VALIDATION_ERROR", "Password must be between 8 and 128 characters.");
  }
  return password;
};

export const validateToken = (token: string): string => {
  if (typeof token !== "string" || token.trim().length === 0) throw new AuthException("INVALID_TOKEN", "JWT is required.");
  return token.trim();
};
