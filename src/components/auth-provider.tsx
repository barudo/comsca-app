"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useCommunity } from "@/components/community-provider";
import { fetchCurrentUser, readSession, restoreSession, sessionStorageKey, type Session, type User } from "@/lib/auth";

const AuthContext = createContext<{
  session: Session | null;
  user: User | null;
  ready: boolean;
  profileLoading: boolean;
  refreshUser: () => Promise<void>;
  setSession: (session: Session | null) => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { subdomain } = useCommunity();
  const [stored, setStored] = useState<{ groupSlug: string | null; session: Session | null } | null>(null);
  const ready = stored !== null && stored.groupSlug === subdomain;
  const session = ready ? stored.session : null;
  const [profile, setProfile] = useState<{ accessToken: string; groupSlug: string; user: User | null } | null>(null);
  const accessToken = session?.access_token;
  const user = accessToken && profile?.accessToken === accessToken && profile.groupSlug === subdomain ? profile.user : null;
  const profileLoading = !!accessToken && !!subdomain && (profile?.accessToken !== accessToken || profile?.groupSlug !== subdomain);
  const refreshUser = useCallback(async () => {
    if (!accessToken || !subdomain) return;
    const user = await fetchCurrentUser(accessToken, subdomain);
    setProfile((current) => current?.accessToken === accessToken && current.groupSlug === subdomain
      ? { accessToken, groupSlug: subdomain, user } : current);
  }, [accessToken, subdomain]);

  const setSession = useCallback((value: Session | null) => {
    const session = value && subdomain ? readSession({ session: value }) : null;
    if (subdomain) {
      try {
        if (session) window.localStorage.setItem(sessionStorageKey(subdomain), JSON.stringify(session));
        else window.localStorage.removeItem(sessionStorageKey(subdomain));
      } catch { /* Keep the current login usable if browser storage is blocked. */ }
    }
    setStored({ groupSlug: subdomain, session });
    setProfile(null);
  }, [subdomain]);

  useEffect(() => {
    function restore() {
      let session: Session | null = null;
      try { session = subdomain ? restoreSession(window.localStorage, subdomain) : null; } catch { /* Storage unavailable. */ }
      setStored({ groupSlug: subdomain, session });
    }
    function syncStorage(event: StorageEvent) {
      if (event.key === null || (subdomain && event.key === sessionStorageKey(subdomain))) restore();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) restore();
    }
    restore();
    window.addEventListener("storage", syncStorage);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", syncStorage);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [subdomain]);

  useEffect(() => {
    if (!accessToken || !subdomain) return;
    const controller = new AbortController();
    fetchCurrentUser(accessToken, subdomain, controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) setProfile({ accessToken, groupSlug: subdomain, user });
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfile({ accessToken, groupSlug: subdomain, user: null });
      });
    return () => controller.abort();
  }, [accessToken, subdomain]);
  useEffect(() => {
    if (!session?.expires_at) return;
    let timer: ReturnType<typeof setTimeout>;
    const expiresAt = session.expires_at;
    function checkExpiry() {
      clearTimeout(timer);
      const remaining = expiresAt * 1000 - Date.now();
      if (remaining <= 0) setSession(null);
      else timer = setTimeout(checkExpiry, Math.min(remaining, 2147483647));
    }
    checkExpiry();
    window.addEventListener("focus", checkExpiry);
    return () => { clearTimeout(timer); window.removeEventListener("focus", checkExpiry); };
  }, [session, setSession]);
  return <AuthContext.Provider value={{ session, setSession, user, ready, profileLoading, refreshUser }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}
