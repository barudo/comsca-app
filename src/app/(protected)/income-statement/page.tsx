"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { fetchIncomeStatement, type IncomeStatement, type IncomeStatementSection } from "@/lib/income-statement";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function IncomeStatementPage() {
  const { activeCycle, loading, error, refreshCycles } = useCycles();
  const { group, subdomain } = useCommunity();
  const { session } = useAuth();
  const groupSlug = subdomain ?? "";
  const accessToken = session?.access_token;
  const cycleId = activeCycle?.id;
  const [result, setResult] = useState<{ requestKey: string; statement: IncomeStatement } | null>(null);
  const [requestError, setRequestError] = useState<{ requestKey: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && groupSlug && cycleId !== undefined ? `${accessToken}:${groupSlug}:${cycleId}:${retry}` : null;
  const statement = result?.requestKey === requestKey ? result.statement : null;
  const statementError = requestError?.requestKey === requestKey ? requestError.message : "";
  const accountLoading = requestKey !== null && statement === null && statementError === "";
  const cycleLabel = activeCycle?.details?.name || (cycleId !== undefined ? `Cycle ${cycleId}` : "");

  useEffect(() => {
    if (!accessToken || !groupSlug || cycleId === undefined || !requestKey) return;
    const controller = new AbortController();
    fetchIncomeStatement(accessToken, groupSlug, cycleId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setResult({ requestKey, statement: data });
          setRequestError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setRequestError({
          requestKey,
          message: cause instanceof Error ? cause.message : "Unable to load the income statement.",
        });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, requestKey]);

  return (
    <main className="protected-content">
      <h1>Income Statement</h1>
      <p>Income and expenses for {group?.name || subdomain || "your community"}{cycleLabel ? ` · ${cycleLabel}` : ""}.</p>
      {loading && <p className="members-feedback" role="status">Loading active cycle…</p>}
      {error && <p className="members-feedback" role="alert">{error} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
      {!loading && !error && !activeCycle && <p className="members-feedback" role="status">An active cycle is required to view the income statement.</p>}
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to view the income statement.</p>}
      {accountLoading && <p className="members-feedback" role="status">Loading income statement…</p>}
      {statementError && <p className="members-feedback" role="alert">{statementError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {statement && (
        <>
          <section className="trial-balance-summary" aria-label="Income statement summary">
            <div><h2>Total income</h2><p>{pesos.format(statement.totalIncomeCents / 100)}</p></div>
            <div><h2>Total expenses</h2><p>{pesos.format(statement.totalExpensesCents / 100)}</p></div>
            <div><h2>Net income</h2><p>{pesos.format(statement.netIncomeCents / 100)}</p></div>
          </section>
          <div className="member-ledger-wrapper" aria-busy={accountLoading}>
            <table className="member-ledger balance-sheet-table">
              <caption>Income statement for {group?.name || subdomain}{cycleLabel ? ` · ${cycleLabel}` : ""}</caption>
              <tbody>
                <IncomeStatementRows title="Income" section={statement.income} totalLabel="Total income" />
                <IncomeStatementRows title="Expenses" section={statement.expenses} totalLabel="Total expenses" />
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Net income</th>
                  <td className="member-ledger-amount">{pesos.format(statement.netIncomeCents / 100)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </main>
  );
}

function IncomeStatementRows({
  title,
  section,
  totalLabel,
}: {
  title: string;
  section: IncomeStatementSection;
  totalLabel: string;
}) {
  return (
    <>
      <tr className="balance-sheet-section-heading"><th colSpan={2}>{title}</th></tr>
      {section.accounts.map((account) => (
        <tr key={account.id}>
          <th scope="row">{account.name}<small className="balance-sheet-detail">{account.code}</small></th>
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