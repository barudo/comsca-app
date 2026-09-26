"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchCycles, type Cycle } from "@/lib/cycles";
import { getCurrentCycle } from "@/lib/cycle-state";

const CycleContext = createContext<{
  cycles: Cycle[];
  currentCycle: ReturnType<typeof getCurrentCycle>;
  activeCycle: Cycle | null;
  loading: boolean;
  error: string;
  refreshCycles: () => Promise<void>;
} | null>(null);

function CycleSession({ accessToken, groupSlug, children }: { accessToken: string; groupSlug: string; children: ReactNode }) {
  const [state, setState] = useState<{ cycles: Cycle[]; loading: boolean; error: string }>({ cycles: [], loading: true, error: "" });
  const request = useRef<AbortController | null>(null);
  const loadCycles = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    return fetchCycles(accessToken, groupSlug, controller.signal).then((cycles) => {
      if (!controller.signal.aborted) setState({ cycles, loading: false, error: "" });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        const error = cause instanceof Error ? cause.message : "Unable to load cycles. Please try again.";
        setState({ cycles: [], loading: false, error });
        throw new Error(error);
      }
    });
  }, [accessToken, groupSlug]);

  const refreshCycles = useCallback(() => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    return loadCycles();
  }, [loadCycles]);

  useEffect(() => {
    if (accessToken && groupSlug) void loadCycles().catch(() => {});
    return () => request.current?.abort();
  }, [accessToken, groupSlug, loadCycles]);

  const activeCycle = !state.loading && !state.error
    ? state.cycles.find((cycle) => cycle.status.trim().toUpperCase() === "ACTIVE") ?? null
    : null;
  return <CycleContext.Provider value={{ ...state, currentCycle: getCurrentCycle(state.cycles), activeCycle, refreshCycles }}>{children}</CycleContext.Provider>;
}

export function CycleProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const accessToken = session?.access_token ?? "";
  const groupSlug = subdomain ?? "";
  return <CycleSession key={`${groupSlug}:${accessToken}`} accessToken={accessToken} groupSlug={groupSlug}>{children}</CycleSession>;
}

export function useCycles() {
  const context = useContext(CycleContext);
  if (!context) throw new Error("useCycles must be used within CycleProvider");
  return context;
}
