"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { useCommunity } from "@/components/community-provider";
import { useAuth } from "@/components/auth-provider";
import { canViewMembers } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
];

export function ProtectedNavigation() {
  const pathname = usePathname();
  const { subdomain } = useCommunity();
  const { user } = useAuth();

  return (
    <header className="protected-header">
      <div className="protected-nav">
        <Brand href="/dashboard" />
        <nav aria-label="Main navigation" className="protected-links">
          {links.filter(({ href }) => href !== "/members" || canViewMembers(user)).map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="protected-account">
          {subdomain && <span className="protected-community">{subdomain}</span>}
          {user && <span className="protected-user">{user.name}</span>}
        </div>
      </div>
    </header>
  );
}
