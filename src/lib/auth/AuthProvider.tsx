import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getBackend } from "@/lib/data";
import type { Profile } from "@/lib/affiliate/types";
import type { RegisterValues } from "@/lib/affiliate/validation";

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  /** Resolves to null when the provider wants the email confirmed first. */
  signUp: (values: RegisterValues) => Promise<Profile | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setProfile(await getBackend().getCurrentProfile());
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const current = await getBackend().getCurrentProfile();
        if (!cancelled) setProfile(current);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await getBackend().signIn(email, password);
    setProfile(next);
    return next;
  }, []);

  const signUp = useCallback(async (values: RegisterValues) => {
    const next = await getBackend().signUp(values);
    if (next) setProfile(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    await getBackend().signOut();
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ profile, loading, isAdmin: profile?.role === "admin", signIn, signUp, signOut, refresh }),
    [profile, loading, signIn, signUp, signOut, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
