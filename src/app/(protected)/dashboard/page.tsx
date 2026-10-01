"use client";

import { useCommunity } from "@/components/community-provider";

export default function Dashboard() {
  const { subdomain } = useCommunity();
  const metrics = [
    { label: "Cash on Hand", value: "₱125,000.00", description: "Total cash currently available to the group." },
    { label: "Total Outstanding Loans", value: "₱342,500.00", description: "Total unpaid principal from active member loans." },
    { label: "Total Fund Value", value: "₱587,250.00", description: "Total value of the group's cash, receivables, and other assets." },
    { label: "Share Capital", value: "₱245,000.00", description: "Total share capital contributed by members." },
    { label: "Contributions Collected", value: "₱82,500.00", description: "Total required contributions received from members." },
    { label: "Contributions Due", value: "₱17,500.00", description: "Total required contributions still unpaid by members." },
    { label: "Active Members", value: "48", description: "Total members currently active in the group." },
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
            <p className="dashboard-metric-description">{metric.description}</p>
            <p className="dashboard-metric-note">Placeholder</p>
          </article>
        ))}
      </section>
    </main>
  );
}
