"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { fetchTrialBalance, type TrialBalance } from "@/lib/trial-balance";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function formatAmount(cents: number) {
  return cents === 0 ? "—" : pesos.format(cents / 100);
}

export default function TrialBalancePage() {
  const { activeCycle, loading, error, refreshCycles } = useCycles();
  const { group, subdomain } = useCommunity();
  const { session } = useAuth();
  const groupSlug = subdomain ?? "";
  const accessToken = session?.access_token;
  const cycleId = activeCycle?.id;
  const [result, setResult] = useState<{ requestKey: string; trialBalance: TrialBalance } | null>(null);
  const [requestError, setRequestError] = useState<{ requestKey: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && groupSlug && cycleId !== undefined ? `${accessToken}:${groupSlug}:${cycleId}:${retry}` : null;
  const trialBalance = result?.requestKey === requestKey ? result.trialBalance : null;
  const trialBalanceError = requestError?.requestKey === requestKey ? requestError.message : "";
  const accountLoading = requestKey !== null && trialBalance === null && trialBalanceError === "";
  const cycleLabel = activeCycle?.details?.name || (cycleId !== undefined ? `Cycle ${cycleId}` : "");

  useEffect(() => {
    if (!accessToken || !groupSlug || cycleId === undefined || !requestKey) return;
    const controller = new AbortController();
    fetchTrialBalance(accessToken, groupSlug, cycleId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, trialBalance: data });
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequestError({
          requestKey,
          message: cause instanceof Error ? cause.message : "Unable to load the trial balance.",
        });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, requestKey]);

  const balanceTotals = trialBalance?.accounts.reduce((totals, account) => ({
    debitCents: totals.debitCents + account.debitBalanceCents,
    creditCents: totals.creditCents + account.creditBalanceCents,
  }), { debitCents: 0, creditCents: 0 });

  return (
    <main className="protected-content">
      <h1>Trial Balance</h1>
      <p>Debit and credit balances for {group?.name || subdomain || "your community"}{cycleLabel ? ` · ${cycleLabel}` : ""}.</p>
      {loading && <p className="members-feedback" role="status">Loading active cycle…</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
      {!loading && !error && !activeCycle && <p className="members-feedback" role="status">An active cycle is required to view the trial balance.</p>}
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to view the trial balance.</p>}
      {accountLoading && <p className="members-feedback" role="status">Loading trial balance…</p>}
      {trialBalanceError && <p className="members-feedback" role="alert">{trialBalanceError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {trialBalance && balanceTotals && (
        <>
          <section className="trial-balance-summary" aria-label="Trial balance summary">
            <div><h2>Total debits</h2><p>{pesos.format(trialBalance.summary.totalDebitsCents / 100)}</p></div>
            <div><h2>Total credits</h2><p>{pesos.format(trialBalance.summary.totalCreditsCents / 100)}</p></div>
            <div><h2>Difference</h2><p>{pesos.format(trialBalance.summary.differenceCents / 100)}</p></div>
          </section>
          <div className="member-ledger-wrapper" aria-busy={accountLoading}>
            <table className="member-ledger trial-balance-table">
              <caption>Trial balance for {group?.name || subdomain}{cycleLabel ? ` · ${cycleLabel}` : ""}</caption>
          <thead>
            <tr>
              <th scope="col">Account code</th>
              <th scope="col">Account</th>
              <th scope="col">Type</th>
              <th scope="col" className="member-ledger-amount">Total debits</th>
              <th scope="col" className="member-ledger-amount">Total credits</th>
              <th scope="col" className="member-ledger-amount">Debit balance</th>
              <th scope="col" className="member-ledger-amount">Credit balance</th>
            </tr>
          </thead>
          <tbody>
            {trialBalance.accounts.map((account) => (
              <tr key={account.id}>
                <td>{account.code}</td>
                <th scope="row">{account.name}</th>
                <td>{account.type}</td>
                <td className="member-ledger-amount">{formatAmount(account.totalDebitsCents)}</td>
                <td className="member-ledger-amount">{formatAmount(account.totalCreditsCents)}</td>
                <td className="member-ledger-amount">{formatAmount(account.debitBalanceCents)}</td>
                <td className="member-ledger-amount">{formatAmount(account.creditBalanceCents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={3}>Total</th>
              <td className="member-ledger-amount">{formatAmount(trialBalance.summary.totalDebitsCents)}</td>
              <td className="member-ledger-amount">{formatAmount(trialBalance.summary.totalCreditsCents)}</td>
              <td className="member-ledger-amount">{formatAmount(balanceTotals.debitCents)}</td>
              <td className="member-ledger-amount">{formatAmount(balanceTotals.creditCents)}</td>
            </tr>
          </tfoot>
        </table>
          </div>
        </>
      )}
    </main>
  );
}