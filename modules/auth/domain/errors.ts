export class AuthException extends Error {
  constructor(
    readonly code: "CONFIGURATION_ERROR" | "EMAIL_ALREADY_EXISTS" | "INVALID_CREDENTIALS" | "INVALID_TOKEN" | "VALIDATION_ERROR",
    message: string,
  ) {
    super(message);
    this.name = "AuthException";
  }
}
