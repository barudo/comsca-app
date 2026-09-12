"use client";

import { useCommunity } from "@/components/community-provider";

export default function Dashboard() {
  const { subdomain } = useCommunity();
  return (
    <main className="site-shell">
      <h1>Dashboard</h1>
      <p>Welcome to {subdomain || "your COMSCA community"}.</p>
    </main>
  );
}
