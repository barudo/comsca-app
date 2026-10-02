"use client";

import { useEffect, useState } from "react";
import { useCycles } from "@/components/cycle-provider";
import { useCommunity } from "@/components/community-provider";
import { useAuth } from "@/components/auth-provider";
import { fetchChartOfAccounts, type AccountSummary } from "@/lib/chart-of-accounts";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function ChartOfAccountsPage() {
  const { activeCycle, loading, error, refreshCycles } = useCycles();
  const { group, subdomain } = useCommunity();
  const { session } = useAuth();
  const groupSlug = subdomain ?? "";
  const cycleId = activeCycle?.id;
  const accessToken = session?.access_token;
  const [result, setResult] = useState<{ requestKey: string; accounts: AccountSummary[] } | null>(null);
  const [requestError, setRequestError] = useState<{ requestKey: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && groupSlug && cycleId !== undefined ? `${accessToken}:${groupSlug}:${cycleId}:${retry}` : null;
  const summary = result?.requestKey === requestKey ? result.accounts : null;
  const accountsError = requestError?.requestKey === requestKey ? requestError.message : "";
  const accountsLoading = requestKey !== null && summary === null && accountsError === "";
  const cycleLabel = activeCycle?.details?.name || (cycleId !== undefined ? `Cycle ${cycleId}` : "");

  useEffect(() => {
    if (!accessToken || !groupSlug || cycleId === undefined || !requestKey) return;
    const controller = new AbortController();
    fetchChartOfAccounts(accessToken, groupSlug, cycleId, controller.signal)
      .then((accounts) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, accounts });
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequestError({
          requestKey,
          message: cause instanceof Error ? cause.message : "Unable to load the chart of accounts.",
        });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, requestKey]);

  return (
    <main className="protected-content">
      <h1>Chart of Accounts</h1>
      <p>Account balances for {group?.name || subdomain || "your community"}{cycleLabel ? ` · ${cycleLabel}` : ""}.</p>
      {loading && <p className="members-feedback" role="status">Loading active cycle…</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
      {!loading && !error && !activeCycle && <p className="members-feedback" role="status">An active cycle is required to view the chart of accounts.</p>}
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to view account balances.</p>}
      {accountsLoading && <p className="members-feedback" role="status">Loading account balances…</p>}
      {accountsError && <p className="members-feedback" role="alert">{accountsError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {summary && (
        <section className="chart-account-list" aria-label="Chart of Accounts Summary" aria-busy={accountsLoading}>
            {summary.map((accountType) => (
              <details className="chart-account-group" key={accountType.type}>
                <summary className="chart-account-summary">
                  <span className="chart-account-heading"><span className="chart-account-toggle" aria-hidden="true" />{accountType.label}</span>
                  <span className="chart-account-total">{pesos.format(accountType.totalCents / 100)}</span>
                </summary>
                <dl className="chart-subaccounts">
                  {accountType.accounts.map((account) => (
                    <div key={account.name}>
                      <dt><span>{account.name}</span><small>{account.code}</small></dt>
                      <dd>{pesos.format(account.balanceCents / 100)}</dd>
                    </div>
                  ))}
                </dl>
              </details>
            ))}
        </section>
      )}
    </main>
  );
}