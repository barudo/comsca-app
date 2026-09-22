"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProtectedNavigation } from "@/components/protected-navigation";
import { useAuth } from "@/components/auth-provider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { session, ready, profileLoading } = useAuth();
  const router = useRouter();
  const authenticated = !!session;
  useEffect(() => {
    if (ready && !authenticated) router.replace("/");
  }, [authenticated, ready, router]);
  if (!ready || profileLoading) return <p role="status">Restoring your session…</p>;
  if (!authenticated) return <p role="status">Redirecting to sign in…</p>;
  return (
    <div className="protected-shell">
      <ProtectedNavigation />
      {children}
    </div>
  );
}
