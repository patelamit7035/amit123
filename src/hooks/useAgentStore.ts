import { useEffect, useSyncExternalStore } from "react";
import { getState, subscribe, type StoreState } from "@/lib/store";
import { maybeRunDueJobs } from "@/lib/agentEngine";

export function useAgentStore(): StoreState {
  return useSyncExternalStore(subscribe, getState, getState);
}

/** Mount once at the app root: checks for due agent jobs on load and every few minutes. */
export function useAgentScheduler() {
  useEffect(() => {
    maybeRunDueJobs();
    const interval = setInterval(maybeRunDueJobs, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}
