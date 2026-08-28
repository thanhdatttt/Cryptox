import { useSyncExternalStore } from "react";
import type { AuthStore } from "./state";

export function useAuth(store: AuthStore) {
  return useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);
}
