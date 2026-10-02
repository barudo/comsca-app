"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { fetchBalanceSheet, type BalanceSheet, type BalanceSheetSection } from "@/lib/balance-sheet";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function BalanceSheetPage() {
  const { activeCycle, loading, error, refreshCycles } = useCycles();
  const { group, subdomain } = useCommunity();
  const { session } = useAuth();
  const groupSlug = subdomain ?? "";
  const accessToken = session?.access_token;
  const cycleId = activeCycle?.id;
  const [result, setResult] = useState<{ requestKey: string; balanceSheet: BalanceSheet } | null>(null);
  const [requestError, setRequestError] = useState<{ requestKey: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && groupSlug && cycleId !== undefined ? `${accessToken}:${groupSlug}:${cycleId}:${retry}` : null;
  const balanceSheet = result?.requestKey === requestKey ? result.balanceSheet : null;
  const balanceSheetError = requestError?.requestKey === requestKey ? requestError.message : "";
  const accountLoading = requestKey !== null && balanceSheet === null && balanceSheetError === "";
  const cycleLabel = activeCycle?.details?.name || (cycleId !== undefined ? `Cycle ${cycleId}` : "");

  useEffect(() => {
    if (!accessToken || !groupSlug || cycleId === undefined || !requestKey) return;
    const controller = new AbortController();
    fetchBalanceSheet(accessToken, groupSlug, cycleId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, balanceSheet: data });
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequestError({
          requestKey,
          message: cause instanceof Error ? cause.message : "Unable to load the balance sheet.",
        });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, requestKey]);

  return (
    <main className="protected-content">
      <h1>Balance Sheet</h1>
      <p>Assets, liabilities, and equity for {group?.name || subdomain || "your community"}{cycleLabel ? ` · ${cycleLabel}` : ""}.</p>
      {loading && <p className="members-feedback" role="status">Loading active cycle…</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
      {!loading && !error && !activeCycle && <p className="members-feedback" role="status">An active cycle is required to view the balance sheet.</p>}
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to view the balance sheet.</p>}
      {accountLoading && <p className="members-feedback" role="status">Loading balance sheet…</p>}
      {balanceSheetError && <p className="members-feedback" role="alert">{balanceSheetError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {balanceSheet && (
        <>
          <section className="trial-balance-summary" aria-label="Balance sheet summary">
            <div><h2>Total assets</h2><p>{pesos.format(balanceSheet.totalAssetsCents / 100)}</p></div>
            <div><h2>Total liabilities and equity</h2><p>{pesos.format(balanceSheet.totalLiabilitiesAndEquityCents / 100)}</p></div>
            <div><h2>Difference</h2><p>{pesos.format(balanceSheet.differenceCents / 100)}</p></div>
          </section>
          <div className="member-ledger-wrapper" aria-busy={accountLoading}>
            <table className="member-ledger balance-sheet-table">
              <caption>Balance sheet for {group?.name || subdomain}{cycleLabel ? ` · ${cycleLabel}` : ""}</caption>
              <tbody>
                <BalanceSheetRows title="Assets" section={balanceSheet.assets} totalLabel="Total assets" />
                <BalanceSheetRows title="Liabilities" section={balanceSheet.liabilities} totalLabel="Total liabilities" />
                <tr className="balance-sheet-section-heading"><th colSpan={2}>Equity</th></tr>
                {balanceSheet.equity.accounts.map((account) => (
                  <tr key={account.id}>
                    <th scope="row">{account.name}</th>
                    <td className="member-ledger-amount">{pesos.format(account.balanceCents / 100)}</td>
                  </tr>
                ))}
                <tr>
                  <th scope="row">Current earnings<small className="balance-sheet-detail">Income {pesos.format(balanceSheet.equity.currentEarnings.incomeCents / 100)} · Expenses {pesos.format(balanceSheet.equity.currentEarnings.expensesCents / 100)}</small></th>
                  <td className="member-ledger-amount">{pesos.format(balanceSheet.equity.currentEarnings.balanceCents / 100)}</td>
                </tr>
                <tr className="balance-sheet-total">
                  <th scope="row">Total equity</th>
                  <td className="member-ledger-amount">{pesos.format(balanceSheet.totalEquityCents / 100)}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total liabilities and equity</th>
                  <td className="member-ledger-amount">{pesos.format(balanceSheet.totalLiabilitiesAndEquityCents / 100)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function BalanceSheetRows({ title, section, totalLabel }: { title: string; section: BalanceSheetSection; totalLabel: string }) {
  return (
    <>
      <tr className="balance-sheet-section-heading"><th colSpan={2}>{title}</th></tr>
      {section.accounts.map((account) => (
        <tr key={account.id}>
          <th scope="row">{account.name}</th>
          <td className="member-ledger-amount">{pesos.format(account.balanceCents / 100)}</td>
        </tr>
      ))}
      <tr className="balance-sheet-total">
        <th scope="row">{totalLabel}</th>
        <td className="member-ledger-amount">{pesos.format(section.totalCents / 100)}</td>
      </tr>
    </>
  );
}