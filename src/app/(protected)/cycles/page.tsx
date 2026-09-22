"use client";

import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { canManageCycles } from "@/lib/auth";

export default function CyclesPage() {
  const { user } = useAuth();
  const { subdomain, group } = useCommunity();

  if (!canManageCycles(user)) {
    return (
      <main className="protected-content">
        <h1>Cycles</h1>
        <p role="status">Cycles access is restricted to owners and admins with a verified profile.</p>
      </main>
    );
  }

  return (
    <main className="protected-content">
      <h1>Cycles</h1>
      <p>Cycles for {group?.name || subdomain || "your COMSCA community"}.</p>
      <p>Only one cycle can be active at a time. A new cycle can be added when all existing cycles are inactive.</p>
      <p role="status">Cycle management is not yet available.</p>
    </main>
  );
}
