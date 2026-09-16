import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || "";
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || "";

/**
 * When these two variables are absent the app runs entirely on the built-in
 * local backend, so it is explorable with zero setup.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured - set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    });
  }
  return client;
}

export const supabaseUrl = url;
