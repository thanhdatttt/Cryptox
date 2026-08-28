import { REST_SCHEMA_VERSION, RestContractValidationError } from "./common";
import {
  recordValue,
  rejectClientIdentityFields,
  stringValue,
} from "./internal-validation";

export interface AuthUserDto {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  email: string;
  password: string;
}

export interface LoginRequestDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  email: string;
  password: string;
}

export interface AuthSessionResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  user: AuthUserDto;
  expiresAt: string;
}

export interface CurrentUserResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  user: AuthUserDto;
}

export interface LogoutResponseDto {
  schemaVersion: typeof REST_SCHEMA_VERSION;
  authenticated: false;
}

function parseCredentials(
  value: unknown,
  label: string,
): { schemaVersion: typeof REST_SCHEMA_VERSION; email: string; password: string } {
  const input = recordValue(value, label);
  rejectClientIdentityFields(input, label);
  if (input.schemaVersion !== REST_SCHEMA_VERSION) {
    throw new RestContractValidationError("Unsupported REST schema version");
  }
  const email = stringValue(input.email, "email").trim().toLowerCase();
  if (email.length === 0) {
    throw new RestContractValidationError("email must be a non-empty string");
  }
  return {
    schemaVersion: REST_SCHEMA_VERSION,
    email,
    password: stringValue(input.password, "password"),
  };
}

export function parseRegisterRequest(value: unknown): RegisterRequestDto {
  return parseCredentials(value, "register request");
}

export function parseLoginRequest(value: unknown): LoginRequestDto {
  return parseCredentials(value, "login request");
}
