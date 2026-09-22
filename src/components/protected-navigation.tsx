"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { useCommunity } from "@/components/community-provider";
import { useAuth } from "@/components/auth-provider";
import { canManageCycles, canViewMembers } from "@/lib/auth";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
  { href: "/cycles", label: "Cycles" },
];

export function ProtectedNavigation() {
  const pathname = usePathname();
  const { subdomain } = useCommunity();
  const { user, setSession } = useAuth();
  const accountMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      if (accountMenu.current && !accountMenu.current.contains(event.target as Node)) {
        accountMenu.current.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  return (
    <header className="protected-header">
      <div className="protected-nav">
        <Brand href="/dashboard" />
        <nav aria-label="Main navigation" className="protected-links">
          {links.filter(({ href }) =>
            (href !== "/members" || canViewMembers(user)) &&
            (href !== "/cycles" || canManageCycles(user))
          ).map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="protected-account">
          {subdomain && <span className="protected-community">{subdomain}</span>}
          {user && (
            <details
              className="protected-account-menu"
              ref={accountMenu}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false;
              }}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector("summary")?.focus();
                }
              }}
            >
              <summary className="protected-user">{user.name}<span aria-hidden="true">▾</span></summary>
              <nav className="protected-account-dropdown" aria-label="Account">
                <Link href="/profile" onClick={() => { if (accountMenu.current) accountMenu.current.open = false; }}>Profile</Link>
                <button type="button" onClick={() => setSession(null)}>Logout</button>
              </nav>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}
