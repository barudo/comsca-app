"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brand } from "@/components/brand";
import { useCommunity } from "@/components/community-provider";

const links = [{ href: "/dashboard", label: "Dashboard" }];

export function ProtectedNavigation() {
  const pathname = usePathname();
  const { subdomain } = useCommunity();

  return (
    <header className="protected-header">
      <div className="protected-nav">
        <Brand href="/dashboard" />
        <nav aria-label="Main navigation" className="protected-links">
          {links.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}>
              {label}
            </Link>
          ))}
        </nav>
        {subdomain && <span className="protected-community">{subdomain}</span>}
      </div>
    </header>
  );
}
