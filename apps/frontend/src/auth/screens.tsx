import { useEffect, useId, useState } from "react";
import { navigateTo, type AppRouteName } from "./navigation";
import { useAuth } from "./hooks";
import type { ProtectedRequestClient } from "./clients";
import type { AuthStore } from "./state";

export interface AuthScreenProps {
  readonly mode: "login" | "register";
  readonly store: AuthStore;
  readonly returnTo?: AppRouteName;
}

export function AuthScreen({ mode, store, returnTo = "market" }: AuthScreenProps): React.ReactElement {
  const state = useAuth(store);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [localError, setLocalError] = useState<string>();
  const emailId = useId();
  const passwordId = useId();
  const confirmationId = useId();
  const isRegister = mode === "register";

  useEffect(() => {
    if (state.status === "authenticated") navigateTo(returnTo);
  }, [returnTo, state.status]);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setLocalError(undefined);
    if (isRegister && password !== confirmation) {
      setLocalError("Passwords do not match.");
      return;
    }
    const authenticated = isRegister
      ? await store.register({ email, password })
      : await store.login({ email, password });
    if (authenticated) navigateTo(returnTo);
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-card__intro">
        <span className="kicker">Private workspace</span>
        <h1 id="auth-title">{isRegister ? "Create your account" : "Welcome back"}</h1>
        <p>
          {isRegister
            ? "Create a local Cryptox account to keep your private research separate."
            : "Sign in to access your private strategies and experiment workspace."}
        </p>
      </div>
      {state.message || localError ? (
        <div className="auth-message" role="alert">
          {localError ?? state.message}
        </div>
      ) : null}
      <form className="auth-form" onSubmit={(event) => void submit(event)}>
        <label htmlFor={emailId}>Email</label>
        <input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor={passwordId}>Password</label>
        <input
          id={passwordId}
          name="password"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {isRegister ? (
          <>
            <label htmlFor={confirmationId}>Confirm password</label>
            <input
              id={confirmationId}
              name="confirmation"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              required
            />
          </>
        ) : null}
        <button className="auth-form__submit" type="submit" disabled={state.pending}>
          {state.pending ? "Working…" : isRegister ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="auth-card__switch">
        {isRegister ? "Already have an account?" : "New to Cryptox?"}{" "}
        <a href={isRegister ? "#login" : "#register"}>
          {isRegister ? "Sign in" : "Create an account"}
        </a>
      </p>
    </section>
  );
}

interface PrivateWorkspaceProps {
  readonly section: "Strategies" | "Experiments";
  readonly email: string;
  readonly protectedClient: ProtectedRequestClient;
}

function privateWorkspaceStatus(value: unknown): { readonly status: "ready" } {
  if (
    typeof value !== "object" ||
    value === null ||
    (value as { status?: unknown }).status !== "ready"
  ) {
    throw new Error("Private workspace returned an invalid response.");
  }
  return { status: "ready" };
}

export function PrivateWorkspace({
  section,
  email,
  protectedClient,
}: PrivateWorkspaceProps): React.ReactElement {
  const [resourceState, setResourceState] = useState<"loading" | "ready" | "error">("loading");
  const [resourceError, setResourceError] = useState<string>();

  useEffect(() => {
    let active = true;
    void protectedClient
      .get("/private/workspace", privateWorkspaceStatus)
      .then(() => {
        if (active) setResourceState("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        setResourceState("error");
        setResourceError(error instanceof Error ? error.message : "Private workspace unavailable.");
      });
    return () => {
      active = false;
    };
  }, [protectedClient]);

  return (
    <section className="private-placeholder" aria-labelledby="private-title">
      <span className="kicker">Authenticated workspace</span>
      <h1 id="private-title">{section}</h1>
      <p>
        This private area is protected for <strong>{email}</strong>. Its business data will be
        loaded only through owner-scoped APIs.
      </p>
      <div className="private-placeholder__boundary">
        <span>
          {resourceState === "loading"
            ? "Checking protected workspace…"
            : resourceState === "ready"
              ? "Session boundary active"
              : "Protected workspace unavailable"}
        </span>
        <small>
          {resourceError ?? "Private cached data is cleared when the signed-in user changes or signs out."}
        </small>
      </div>
    </section>
  );
}
