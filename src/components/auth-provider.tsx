"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@/lib/auth";

const AuthContext = createContext<{
  session: Session | null;
  setSession: (session: Session | null) => void;
} | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  useEffect(() => {
    if (!session?.expires_at) return;
    const timer = setTimeout(() => setSession(null), Math.max(0, session.expires_at * 1000 - Date.now()));
    return () => clearTimeout(timer);
  }, [session]);
  return <AuthContext.Provider value={{ session, setSession }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used within AuthProvider");
  return auth;
}
