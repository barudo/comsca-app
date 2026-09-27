"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { canViewMembers } from "@/lib/auth";
import { fetchMembersSnapshot, type MembersSnapshot } from "@/lib/members";

const MembersContext = createContext<{
  snapshot: MembersSnapshot | null;
  error: string;
  revision: number;
  refreshMembers: () => Promise<void>;
} | null>(null);

function MembersSession({ accessToken, groupSlug, enabled, children }: { accessToken: string; groupSlug: string; enabled: boolean; children: ReactNode }) {
  const [state, setState] = useState<{ snapshot: MembersSnapshot | null; error: string; revision: number }>({ snapshot: null, error: "", revision: 0 });
  const request = useRef<AbortController | null>(null);
  const refreshMembers = useCallback(async () => {
    if (!enabled) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setState((current) => ({ ...current, snapshot: null, error: "" }));
    try {
      const snapshot = await fetchMembersSnapshot(accessToken, groupSlug, controller.signal);
      if (!controller.signal.aborted) setState((current) => ({ snapshot, error: "", revision: current.revision + 1 }));
    } catch (cause) {
      if (!controller.signal.aborted) setState((current) => ({ ...current, snapshot: null, error: cause instanceof Error ? cause.message : "Unable to load members. Please try again." }));
    }
  }, [accessToken, groupSlug, enabled]);

  useEffect(() => {
    void refreshMembers();
    return () => request.current?.abort();
  }, [refreshMembers]);

  return <MembersContext.Provider value={{ ...state, refreshMembers }}>{children}</MembersContext.Provider>;
}

export function MembersProvider({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const { subdomain } = useCommunity();
  const { activeCycle, loading } = useCycles();
  const accessToken = session?.access_token ?? "";
  const groupSlug = subdomain ?? "";
  const authorized = canViewMembers(user);
  const enabled = authorized && !!accessToken && !!groupSlug && !loading;
  return <MembersSession key={`${groupSlug}:${accessToken}:${authorized}:${activeCycle?.id ?? "none"}`} accessToken={accessToken} groupSlug={groupSlug} enabled={enabled}>{children}</MembersSession>;
}

export function useMembers() {
  const context = useContext(MembersContext);
  if (!context) throw new Error("useMembers must be used within MembersProvider");
  return context;
}
