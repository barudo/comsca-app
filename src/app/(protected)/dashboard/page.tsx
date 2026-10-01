"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchDashboard, type DashboardSummary } from "@/lib/dashboard";

const metricDefinitions: { label: string; description: string; key: keyof DashboardSummary; currency?: boolean }[] = [
  { label: "Cash on Hand", key: "cash_on_hand", currency: true, description: "Total cash currently available to the group." },
  { label: "Total Outstanding Loans", key: "outstanding_loans", currency: true, description: "Total unpaid principal from active member loans." },
  { label: "Total Fund Value", key: "total_fund_value", currency: true, description: "Total value of the group's cash, receivables, and other assets." },
  { label: "Share Capital", key: "share_capital", currency: true, description: "Total share capital contributed by members." },
  { label: "Contributions Collected", key: "contributions_collected", currency: true, description: "Total required contributions received from members." },
  { label: "Contributions Due", key: "contributions_due", currency: true, description: "Total required contributions still unpaid by members." },
  { label: "Active Members", key: "active_members", description: "Total members currently active in the group." },
];

const php = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function Dashboard() {
  const { subdomain } = useCommunity();
  const { session } = useAuth();
  const accessToken = session?.access_token;
  const [result, setResult] = useState<{ requestKey: string; summary: DashboardSummary } | null>(null);
  const [requestError, setRequestError] = useState<{ requestKey: string; message: string } | null>(null);
  const [reload, setReload] = useState(0);
  const requestKey = accessToken && subdomain ? `${accessToken}:${subdomain}:${reload}` : null;
  const summary = result?.requestKey === requestKey ? result.summary : null;
  const error = requestError?.requestKey === requestKey ? requestError.message : "";
  const loading = requestKey !== null && summary === null && error === "";

  useEffect(() => {
    if (!accessToken || !subdomain || !requestKey) return;

    const controller = new AbortController();
    fetchDashboard(accessToken, subdomain, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, summary: data });
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequestError({
          requestKey,
          message: cause instanceof Error ? cause.message : "Unable to load dashboard data.",
        });
      });
    return () => controller.abort();
  }, [accessToken, subdomain, requestKey]);

  const metrics = metricDefinitions.map((metric) => {
    const rawValue = summary?.[metric.key];
    const value = rawValue === undefined ? "—" : metric.currency ? php.format(Number(rawValue)) : String(rawValue);
    return { ...metric, value };
  });

  return (
    <main className="protected-content">
      <h1>Dashboard</h1>
      <p>Welcome to {subdomain || "your COMSCA community"}.</p>
      {loading && <p className="members-feedback" role="status">Loading dashboard data…</p>}
      {!requestKey && <p className="members-feedback" role="status">Please sign in through your community’s URL to view dashboard data.</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => setReload((current) => current + 1)}>Try again</button></p>}
      <section className="dashboard-metrics" aria-label="Community summary" aria-busy={loading}>
        {metrics.map((metric) => (
          <article className="dashboard-metric" key={metric.label}>
            <h2>{metric.label}</h2>
            <p className="dashboard-metric-value">{metric.value}</p>
            <p className="dashboard-metric-description">{metric.description}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
