import { LocalBackend } from "./local/localBackend";
import { SupabaseBackend } from "./supabase/supabaseBackend";
import { isSupabaseConfigured } from "./supabase/client";
import { STORAGE_KEY, SESSION_KEY } from "./local/localDb";
import type { AffiliateBackend } from "./backend";

let backend: AffiliateBackend | null = null;

/**
 * The single data source for the whole app: Supabase when it is configured,
 * otherwise the self-contained local backend so the product is explorable (and
 * testable) with nothing to set up.
 */
export function getBackend(): AffiliateBackend {
  if (!backend) {
    backend = isSupabaseConfigured ? new SupabaseBackend() : new LocalBackend();
  }
  return backend;
}

export const isDemoMode = !isSupabaseConfigured;

/** Wipes the demo database and re-seeds it. No-op when Supabase is in use. */
export function resetDemoData(): void {
  if (isSupabaseConfigured || typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(SESSION_KEY);
  backend = null;
}

export { BackendError } from "./backend";
export type { AffiliateBackend, ResolvedLink, SubmitLeadResult, LeadFilter } from "./backend";
