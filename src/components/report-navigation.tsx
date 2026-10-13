"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const reports = [
  { href: "/chart-of-accounts", label: "Chart of Accounts" },
  { href: "/trial-balance", label: "Trial Balance" },
  { href: "/balance-sheet", label: "Balance Sheet" },
  { href: "/income-statement", label: "Income Statement" },
];

export function ReportNavigation() {
  const pathname = usePathname();

  return (
    <nav className="dashboard-reports" aria-label="Group Account Status">
      <h2>Group Account Status</h2>
      {reports.map(({ href, label }) => (
        <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
