"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { buildMemberLedger, describeMemberTransaction, fetchMemberTransactions, type LedgerAmounts, type LedgerRow } from "@/lib/member-transactions";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

function formatAmount(cents: number): string {
  return pesos.format(cents / 100);
}

function LedgerAmount({ cents }: { cents: number }) {
  return <td className="member-ledger-amount">{cents === 0 ? "—" : formatAmount(cents)}</td>;
}

function TransactionRow({ row }: { row: LedgerRow }) {
  const label = describeMemberTransaction(row.type);
  return (
    <tr>
      <td>{formatDate(row.transactionOccurredAt)}</td>
      <th scope="row" className="member-ledger-transaction">
        <span>{label}</span>
        {row.description && row.description.toLowerCase() !== label.toLowerCase() && <small>{row.description}</small>}
      </th>
      <LedgerAmount cents={row.ownership} />
      <LedgerAmount cents={row.loan} />
      <LedgerAmount cents={row.contribution} />
      <LedgerAmount cents={row.penalty} />
    </tr>
  );
}

function CurrentTotals({ totals }: { totals: LedgerAmounts }) {
  return (
    <tfoot>
      <tr>
        <th scope="row" colSpan={2}>Current total</th>
        <td className="member-ledger-amount">{formatAmount(totals.ownership)}</td>
        <td className="member-ledger-amount">{formatAmount(totals.loan)}</td>
        <td className="member-ledger-amount">{formatAmount(totals.contribution)}</td>
        <td className="member-ledger-amount">{formatAmount(totals.penalty)}</td>
      </tr>
    </tfoot>
  );
}

export default function MyAccountPage() {
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const accessToken = session?.access_token;
  const [transactions, setTransactions] = useState<{ requestKey: string; data: Awaited<ReturnType<typeof fetchMemberTransactions>> } | null>(null);
  const [requestError, setRequestError] = useState<{ requestKey: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && subdomain ? `${accessToken}:${subdomain}:${retry}` : null;
  const transactionData = transactions?.requestKey === requestKey ? transactions.data : null;
  const error = requestError?.requestKey === requestKey ? requestError.message : "";
  const loading = requestKey !== null && transactionData === null && error === "";

  useEffect(() => {
    if (!accessToken || !subdomain || !requestKey) return;
    const controller = new AbortController();
    fetchMemberTransactions(accessToken, subdomain, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setTransactions({ requestKey, data });
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequestError({
          requestKey,
          message: cause instanceof Error ? cause.message : "Unable to load member transactions.",
        });
      });
    return () => controller.abort();
  }, [accessToken, subdomain, requestKey]);

  const ledger = transactionData ? buildMemberLedger(transactionData) : null;

  return (
    <main className="protected-content">
      <h1>My Account</h1>
      <p>Your transaction history and current balances.</p>
      {loading && <p className="members-feedback" role="status">Loading transactions…</p>}
      {!requestKey && <p className="members-feedback" role="status">Please sign in through your community’s URL to view your transactions.</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {ledger && (
        <div className="member-ledger-wrapper" aria-busy={loading}>
          <table className="member-ledger">
            <caption>Transactions for {subdomain}</caption>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Transaction</th>
                <th scope="col">Ownership (Equity)</th>
                <th scope="col">Loan</th>
                <th scope="col">Contribution</th>
                <th scope="col">Penalty</th>
              </tr>
            </thead>
            <tbody>
              {ledger.rows.map((row) => <TransactionRow key={row.id} row={row} />)}
              {ledger.rows.length === 0 && <tr><td colSpan={6}>No transactions yet.</td></tr>}
            </tbody>
            <CurrentTotals totals={ledger.totals} />
          </table>
        </div>
      )}
    </main>
  );
}