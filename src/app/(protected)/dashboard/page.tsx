"use client";

import { useCommunity } from "@/components/community-provider";

export default function Dashboard() {
  const { subdomain } = useCommunity();
  const metrics = [
    { label: "Cash on Hand", value: "₱125,000.00" },
    { label: "Total Outstanding Loans", value: "₱342,500.00" },
    { label: "Total Fund Value", value: "₱587,250.00" },
    { label: "Share Capital", value: "₱245,000.00" },
    { label: "Contributions Collected", value: "₱82,500.00" },
    { label: "Contributions Due", value: "₱17,500.00" },
    { label: "Active Members", value: "48" },
  ];

  return (
    <main className="protected-content">
      <h1>Dashboard</h1>
      <p>Welcome to {subdomain || "your COMSCA community"}.</p>
      <section className="dashboard-metrics" aria-label="Community summary">
        {metrics.map((metric) => (
          <article className="dashboard-metric" key={metric.label}>
            <h2>{metric.label}</h2>
            <p className="dashboard-metric-value">{metric.value}</p>
            <p className="dashboard-metric-note">Placeholder</p>
          </article>
        ))}
      </section>
    </main>
  );
}
