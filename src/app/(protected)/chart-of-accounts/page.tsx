"use client";

import { useCycles } from "@/components/cycle-provider";
import { useCommunity } from "@/components/community-provider";
import { buildAccountSummary, createPlaceholderJournalEntries } from "@/lib/chart-of-accounts";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function ChartOfAccountsPage() {
  const { activeCycle, loading, error, refreshCycles } = useCycles();
  const { group, subdomain } = useCommunity();
  const groupSlug = subdomain ?? "";
  const cycleId = activeCycle?.id;
  const summary = cycleId !== undefined && groupSlug
    ? buildAccountSummary(createPlaceholderJournalEntries(groupSlug, cycleId), groupSlug, cycleId)
    : null;
  const cycleLabel = activeCycle?.details?.name || (cycleId !== undefined ? `Cycle ${cycleId}` : "");

  return (
    <main className="protected-content">
      <h1>Chart of Accounts</h1>
      <p>Account balances for {group?.name || subdomain || "your community"}{cycleLabel ? ` · ${cycleLabel}` : ""}.</p>
      {loading && <p className="members-feedback" role="status">Loading active cycle…</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
      {!loading && !error && !activeCycle && <p className="members-feedback" role="status">An active cycle is required to view the chart of accounts.</p>}
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to view account balances.</p>}
      {summary && (
        <>
          <p className="chart-account-notice">Illustrative journal-entry balances for the current group and active cycle. These are placeholder values, not live financial data.</p>
          <section className="chart-account-list" aria-label="Chart of Accounts Summary">
            {summary.map((accountType) => (
              <details className="chart-account-group" key={accountType.type}>
                <summary className="chart-account-summary">
                  <span className="chart-account-heading"><span className="chart-account-toggle" aria-hidden="true" />{accountType.label}</span>
                  <span className="chart-account-total">{pesos.format(accountType.totalCents / 100)}</span>
                </summary>
                <dl className="chart-subaccounts">
                  {accountType.accounts.map((account) => (
                    <div key={account.name}>
                      <dt>{account.name}</dt>
                      <dd>{pesos.format(account.balanceCents / 100)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
          </section>
        </>
      )}
    </main>
  );
}