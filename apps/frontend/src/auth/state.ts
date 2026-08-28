import type { AuthUserDto } from "@cryptox/contracts/rest";
import { AuthClientError } from "./clients";
import type { PrivateCache } from "./cache";
import type { AuthClient, AuthCredentials } from "./types";

export type AuthStatus = "restoring" | "anonymous" | "authenticated" | "unavailable";

export interface AuthState {
  readonly status: AuthStatus;
  readonly user?: AuthUserDto;
  readonly expiresAt?: string;
  readonly pending: boolean;
  readonly message?: string;
}

type Listener = () => void;

const INITIAL_STATE: AuthState = { status: "restoring", pending: false };

function errorMessage(error: unknown, operation: "register" | "login" | "restore" | "logout"): string {
  if (error instanceof AuthClientError) {
    if (operation === "logout" && error.status !== 401) {
      return "We couldn't confirm sign out. Your session may still be active; please retry.";
    }
    return error.message;
  }
  if (operation === "register") return "We couldn't create your account. Please try again.";
  if (operation === "login") return "We couldn't sign you in. Please try again.";
  if (operation === "restore") return "We couldn't check your session. Please try again.";
  return "We couldn't confirm sign out. Your session may still be active; please retry.";
}

export class AuthStore {
  private state: AuthState = INITIAL_STATE;
  private readonly listeners = new Set<Listener>();
  private operation = 0;
  private restorePromise?: Promise<void>;

  public constructor(
    private readonly client: AuthClient,
    private readonly privateCache: PrivateCache,
  ) {}

  public snapshot = (): AuthState => this.state;

  public subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public restore(): Promise<void> {
    if (this.restorePromise) return this.restorePromise;
    const operation = ++this.operation;
    this.publish({ ...this.state, status: "restoring", pending: false, message: undefined });
    const request = this.client
      .currentUser()
      .then((response) => {
        if (operation !== this.operation) return;
        this.setAuthenticated(response.user, this.state.expiresAt);
      })
      .catch((error: unknown) => {
        if (operation !== this.operation) return;
        if (error instanceof AuthClientError && error.status === 401) {
          this.clearPrivateState();
          this.publish({
            status: "anonymous",
            pending: false,
            message: "Your session expired. Please sign in again.",
          });
          return;
        }
        this.publish({ status: "unavailable", pending: false, message: errorMessage(error, "restore") });
      })
      .finally(() => {
        if (this.restorePromise === request) this.restorePromise = undefined;
      });
    this.restorePromise = request;
    return request;
  }

  public async register(credentials: AuthCredentials): Promise<boolean> {
    return this.authenticate("register", credentials);
  }

  public async login(credentials: AuthCredentials): Promise<boolean> {
    return this.authenticate("login", credentials);
  }

  public async logout(): Promise<void> {
    const operation = ++this.operation;
    this.publish({ ...this.state, pending: true, message: undefined });
    try {
      await this.client.logout();
    } catch (error) {
      if (operation !== this.operation) return;
      if (error instanceof AuthClientError && error.status === 401) {
        this.clearPrivateState();
        this.publish({ status: "anonymous", pending: false });
        return;
      }
      this.clearPrivateState();
      // A non-401 failure leaves the server cookie outcome unknown. Preserve
      // the last truthful state so the UI can offer a retry instead of
      // pretending that the server session was revoked.
      this.publish({
        ...this.state,
        pending: false,
        message: errorMessage(error, "logout"),
      });
      return;
    }
    if (operation !== this.operation) return;
    this.clearPrivateState();
    this.publish({ status: "anonymous", pending: false });
  }

  /** Call this when any protected API reports 401. */
  public handleUnauthorized(): void {
    ++this.operation;
    this.clearPrivateState();
    this.publish({
      status: "anonymous",
      pending: false,
      message: "Your session expired. Please sign in again.",
    });
  }

  private async authenticate(
    operationName: "register" | "login",
    credentials: AuthCredentials,
  ): Promise<boolean> {
    const operation = ++this.operation;
    this.publish({ ...this.state, pending: true, message: undefined });
    try {
      const response = await this.client[operationName](credentials);
      if (operation !== this.operation) return false;
      this.setAuthenticated(response.user, response.expiresAt);
      return true;
    } catch (error) {
      if (operation !== this.operation) return false;
      this.publish({
        ...this.state,
        pending: false,
        message: errorMessage(error, operationName),
      });
      return false;
    }
  }

  private setAuthenticated(user: AuthUserDto, expiresAt: string | undefined): void {
    if (this.state.user?.id !== user.id) this.clearPrivateState();
    this.publish({ status: "authenticated", user, expiresAt, pending: false, message: undefined });
  }

  private clearPrivateState(): void {
    this.privateCache.clear();
  }

  private publish(state: AuthState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
