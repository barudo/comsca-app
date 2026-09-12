"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ProtectedNavigation } from "@/components/protected-navigation";
import { useAuth } from "@/components/auth-provider";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const router = useRouter();
  const authenticated = !!session;
  useEffect(() => {
    if (!authenticated) router.replace("/");
  }, [authenticated, router]);
  if (!authenticated) return <p role="status">Redirecting to sign in…</p>;
  return (
    <div className="protected-shell">
      <ProtectedNavigation />
      {children}
    </div>
  );
}
