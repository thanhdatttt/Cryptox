import { QueryClient } from "@tanstack/react-query";
import { disconnectMarketSocket, session } from "./api";
import { persistSearchRunId } from "./state";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => {
        const status = typeof error === "object" && error !== null && "status" in error ? Number((error as { status?: unknown }).status) : undefined;
        return status !== 401 && status !== 404 && failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});

export function clearAuthenticatedClientState(): void {
  disconnectMarketSocket();
  persistSearchRunId(undefined);
  queryClient.clear();
}

let observedToken = session.token;
session.subscribe((nextToken) => {
  if (nextToken === observedToken) return;
  observedToken = nextToken;
  disconnectMarketSocket();
  persistSearchRunId(undefined);
  queryClient.clear();
});

export function logout(): void {
  clearAuthenticatedClientState();
  session.set(null);
}
