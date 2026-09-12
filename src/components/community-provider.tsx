"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Group } from "@/lib/group-validation";

const CommunityContext = createContext<{ subdomain: string | null; group: Group | null } | undefined>(undefined);

export function CommunityProvider({
  subdomain,
  group,
  children,
}: {
  subdomain: string | null;
  group: Group | null;
  children: ReactNode;
}) {
  // The request hostname is the source of truth; do not persist across domains.
  return (
    <CommunityContext.Provider value={{ subdomain, group }}>
      {children}
    </CommunityContext.Provider>
  );
}

/** Shared hostname context for client components and future backend query hooks. */
export function useCommunity() {
  const community = useContext(CommunityContext);
  if (community === undefined) {
    throw new Error("useCommunity must be used within CommunityProvider");
  }
  return community;
}
