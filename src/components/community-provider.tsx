"use client";

import { createContext, useContext, type ReactNode } from "react";

const CommunityContext = createContext<string | null | undefined>(undefined);

export function CommunityProvider({
  subdomain,
  children,
}: {
  subdomain: string | null;
  children: ReactNode;
}) {
  // The request hostname is the source of truth; do not persist across domains.
  return (
    <CommunityContext.Provider value={subdomain}>
      {children}
    </CommunityContext.Provider>
  );
}

/** Shared hostname context for client components and future backend query hooks. */
export function useCommunity() {
  const subdomain = useContext(CommunityContext);
  if (subdomain === undefined) {
    throw new Error("useCommunity must be used within CommunityProvider");
  }
  return { subdomain };
}
