import { useSyncExternalStore } from "react";
import type { AuthStatus } from "./state";

export type AppRouteName = "market" | "login" | "register" | "strategies" | "experiments";

export interface AppLocation {
  readonly name: AppRouteName;
  readonly returnTo?: AppRouteName;
}

export type RouteGuardDecision =
  | { readonly kind: "allow" }
  | { readonly kind: "restore" }
  | { readonly kind: "redirect"; readonly returnTo: AppRouteName }
  | { readonly kind: "unavailable" };

const protectedRoutes = new Set<AppRouteName>(["strategies", "experiments"]);
const routeNames = new Set<AppRouteName>([
  "market",
  "login",
  "register",
  "strategies",
  "experiments",
]);

export function isProtectedRoute(route: AppRouteName): boolean {
  return protectedRoutes.has(route);
}

export function parseLocation(hash: string): AppLocation {
  const [rawRoute, query = ""] = hash.replace(/^#/, "").split("?", 2);
  const name = routeNames.has(rawRoute as AppRouteName) ? (rawRoute as AppRouteName) : "market";
  const params = new URLSearchParams(query);
  const requestedReturn = params.get("returnTo");
  const returnTo =
    requestedReturn && routeNames.has(requestedReturn as AppRouteName)
      ? (requestedReturn as AppRouteName)
      : undefined;
  return { name, returnTo: returnTo && isProtectedRoute(returnTo) ? returnTo : undefined };
}

export function routeHash(route: AppRouteName, returnTo?: AppRouteName): string {
  if (route === "login" && returnTo && isProtectedRoute(returnTo)) {
    return `#login?returnTo=${encodeURIComponent(returnTo)}`;
  }
  return `#${route}`;
}

export function guardRoute(route: AppRouteName, authStatus: AuthStatus): RouteGuardDecision {
  if (authStatus === "restoring") return { kind: "restore" };
  if (!isProtectedRoute(route)) return { kind: "allow" };
  if (authStatus === "authenticated") return { kind: "allow" };
  if (authStatus === "unavailable") return { kind: "unavailable" };
  return { kind: "redirect", returnTo: route };
}

export function navigateTo(route: AppRouteName, returnTo?: AppRouteName): void {
  if (typeof window === "undefined") return;
  const nextHash = routeHash(route, returnTo);
  if (window.location.hash !== nextHash) window.location.hash = nextHash;
}

function currentHash(): string {
  return typeof window === "undefined" ? "#market" : window.location.hash || "#market";
}

function subscribeToHash(listener: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function useAppLocation(): AppLocation {
  const hash = useSyncExternalStore(subscribeToHash, currentHash, () => "#market");
  return parseLocation(hash);
}
