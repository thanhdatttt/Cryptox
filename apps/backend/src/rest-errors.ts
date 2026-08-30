import { HttpException, HttpStatus } from "@nestjs/common";
import { REST_SCHEMA_VERSION, RestContractValidationError } from "@cryptox/contracts/rest";

export interface FailureRecorder {
  markFailure(name: string, detail?: string): void;
}

function restError(status: number, code: string, message: string): HttpException {
  return new HttpException(
    { schemaVersion: REST_SCHEMA_VERSION, error: { code, message } },
    status,
  );
}

function codeOf(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

function marksProviderFailure(code: string | undefined): boolean {
  return code === "PROVIDER_UNAVAILABLE" || code === "PERSISTENCE_UNAVAILABLE" || code === "RANKING_FAILED";
}

function statusFor(code: string | undefined): number {
  if (code === "UNAUTHENTICATED") return HttpStatus.UNAUTHORIZED;
  if (code === "AUTH_PERSISTENCE_UNAVAILABLE" || code === "AUTH_UNAVAILABLE") {
    return HttpStatus.SERVICE_UNAVAILABLE;
  }
  if (code === "NOT_FOUND" || code === "SCOPE_NOT_FOUND" || code === "RANKING_CONFIGURATION_NOT_FOUND") {
    return HttpStatus.NOT_FOUND;
  }
  if (
    code === "SATURATED" ||
    code === "PROVIDER_UNAVAILABLE" ||
    code === "PERSISTENCE_UNAVAILABLE" ||
    code === "CAPABILITY_UNAVAILABLE" ||
    code === "RANKING_FAILED"
  ) {
    return HttpStatus.SERVICE_UNAVAILABLE;
  }
  if (code === "TERMINAL_STATE" || code === "INCOMPLETE_HISTORY" || code === "SEARCH_SPACE_EXHAUSTED") {
    return HttpStatus.CONFLICT;
  }
  return code ? HttpStatus.BAD_REQUEST : HttpStatus.SERVICE_UNAVAILABLE;
}

function messageFor(code: string | undefined): string {
  switch (code) {
    case "UNAUTHENTICATED": return "Authentication is required.";
    case "AUTH_PERSISTENCE_UNAVAILABLE":
    case "AUTH_UNAVAILABLE": return "Authentication is temporarily unavailable.";
    case "NOT_FOUND":
    case "SCOPE_NOT_FOUND":
    case "RANKING_CONFIGURATION_NOT_FOUND": return "The requested private resource was not found.";
    case "CAPABILITY_UNAVAILABLE": return "This capability is temporarily unavailable.";
    case "PROVIDER_UNAVAILABLE": return "The configured provider is temporarily unavailable.";
    case "PERSISTENCE_UNAVAILABLE": return "Application persistence is temporarily unavailable.";
    case "SATURATED": return "The bounded execution capacity is temporarily saturated.";
    case "TERMINAL_STATE": return "The requested operation is not valid for the resource state.";
    case "RANKING_FAILED": return "Leaderboard processing failed.";
    case "INCOMPLETE_HISTORY": return "The requested market history is incomplete.";
    case "SEARCH_SPACE_EXHAUSTED": return "The requested search space is exhausted.";
    default: return "The request could not be completed.";
  }
}

export function mapCapabilityError(
  error: unknown,
  recorder?: FailureRecorder,
  failureDependency = "persistence-adapters",
): HttpException {
  if (error instanceof HttpException) return error;
  if (error instanceof RestContractValidationError) {
    return restError(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "The request does not match the approved contract.");
  }
  const code = codeOf(error);
  if (code === "AUTH_PERSISTENCE_UNAVAILABLE") {
    recorder?.markFailure("auth-persistence", "Authentication persistence failure is visible in readiness.");
  }
  if (recorder && marksProviderFailure(code)) {
    recorder.markFailure(
      failureDependency,
      "Configured provider or persistence failure is visible in readiness.",
    );
  }
  return restError(statusFor(code), code ?? "CAPABILITY_UNAVAILABLE", messageFor(code));
}

export async function restCall<T>(
  recorder: FailureRecorder,
  operation: () => Promise<T> | T,
  failureDependency?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw mapCapabilityError(error, recorder, failureDependency);
  }
}

export function unavailableCapability(recorder: FailureRecorder, capability: string): never {
  recorder.markFailure(capability, "Capability is not composed by the configured runtime.");
  throw restError(HttpStatus.SERVICE_UNAVAILABLE, "CAPABILITY_UNAVAILABLE", "This capability is temporarily unavailable.");
}
