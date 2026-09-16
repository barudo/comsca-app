"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useCommunity } from "@/components/community-provider";
import { fetchCurrentUser, type Session, type User } from "@/lib/auth";

const AuthContext = createContext<{
  session: Session | null;
  user: User | null;
  setSession: (session: Session | null) => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { subdomain } = useCommunity();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<{ accessToken: string; groupSlug: string; user: User } | null>(null);
  const accessToken = session?.access_token;
  const user = accessToken && profile?.accessToken === accessToken && profile.groupSlug === subdomain ? profile.user : null;

  useEffect(() => {
    if (!accessToken || !subdomain) return;
    const controller = new AbortController();
    fetchCurrentUser(accessToken, subdomain, controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) setProfile({ accessToken, groupSlug: subdomain, user });
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfile(null);
      });
    return () => controller.abort();
  }, [accessToken, subdomain]);
  useEffect(() => {
    if (!session?.expires_at) return;
    const timer = setTimeout(() => setSession(null), Math.max(0, session.expires_at * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  return <AuthContext.Provider value={{ session, setSession, user }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}
