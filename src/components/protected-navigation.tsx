"use client";

import { useCycles } from "@/components/cycle-provider";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { useCommunity } from "@/components/community-provider";
import { useAuth } from "@/components/auth-provider";
import { canManageCycles, canViewBusiness, canViewMembers } from "@/lib/auth";

const administrationLinks = [
  { href: "/cycles", label: "Cycle", canView: canManageCycles },
  { href: "/groups", label: "Members", canView: canViewMembers },
];

export function ProtectedNavigation() {
  const { activeCycle } = useCycles();
  const pathname = usePathname();
  const { subdomain } = useCommunity();
  const { user, setSession } = useAuth();
  const visibleAdministrationLinks = administrationLinks.filter(({ canView }) => canView(user));
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`) ||
    (href === "/groups" && (pathname === "/members" || pathname.startsWith("/members/")));
  const administrationMenu = useRef<HTMLDetailsElement>(null);
  const administrationActive = visibleAdministrationLinks.some(({ href }) => isActive(href));
  const accountMenu = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      for (const menu of [accountMenu.current, administrationMenu.current]) {
        if (menu && !menu.contains(event.target as Node)) menu.open = false;
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
          <Link href="/dashboard" aria-current={pathname === "/dashboard" ? "page" : undefined}>Dashboard</Link>
          {canViewBusiness(user) && activeCycle && <Link href="/business" aria-current={isActive("/business") ? "page" : undefined}>Business</Link>}
          {visibleAdministrationLinks.length > 0 && (
            <details
              key={pathname}
              className="protected-account-menu protected-administration-menu"
              ref={administrationMenu}
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
              <summary data-active={administrationActive || undefined}>Administration<span aria-hidden="true">▾</span></summary>
              <div className="protected-account-dropdown">
                {visibleAdministrationLinks.map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    onClick={() => {
                      if (administrationMenu.current) {
                        administrationMenu.current.open = false;
                        if (pathname === href) administrationMenu.current.querySelector("summary")?.focus();
                      }
                    }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </details>
          )}
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
