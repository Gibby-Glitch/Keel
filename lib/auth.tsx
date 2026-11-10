"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { cloudEnabled, supabase } from "./supabase";

export interface Profile {
  id: string;
  email: string;
  display_name: string;
}

interface AuthCtx {
  /** False until the saved session (if any) has been restored. */
  loaded: boolean;
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  /** True while the person is following a password-reset link. */
  recovering: boolean;
  signOut: () => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  doneRecovering: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(!cloudEnabled);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    if (!supabase || !userId) {
      setProfile(null);
      return;
    }
    supabase
      .from("profiles")
      .select("id, email, display_name")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setProfile(data as Profile | null));
  }, [userId]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const setDisplayName = useCallback(
    async (name: string) => {
      if (!supabase || !userId) return;
      const display_name = name.trim();
      await supabase.from("profiles").update({ display_name }).eq("id", userId);
      setProfile((p) => (p ? { ...p, display_name } : p));
    },
    [userId],
  );

  return (
    <Ctx.Provider
      value={{ loaded, session, userId, profile, recovering, signOut, setDisplayName, doneRecovering: () => setRecovering(false) }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
}
