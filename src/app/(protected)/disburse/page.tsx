"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchExpenses, payExpenses, type Expense } from "@/lib/expenses";
import { useCycles } from "@/components/cycle-provider";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";
import { amountToCents } from "@/lib/money";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function DisbursePage() {
  const { activeCycle, loading: cycleLoading, error: cycleError, refreshCycles } = useCycles();
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const accessToken = session?.access_token ?? "";
  const groupSlug = subdomain ?? "";
  const [accountsResult, setAccountsResult] = useState<{ key: string; accounts: LedgerAccount[] } | null>(null);
  const [accountsError, setAccountsError] = useState<{ key: string; message: string } | null>(null);
  const [accountRetry, setAccountRetry] = useState(0);
  const [debit, setDebit] = useState("");
  const [credit, setCredit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [feedback, setFeedback] = useState<{ key: string; kind: "error" | "success"; message: string } | null>(null);
  const cycleId = activeCycle?.id;
  const contextKey = `${accessToken}:${groupSlug}:${cycleId}`;
  const accountsKey = accessToken && groupSlug && cycleId !== undefined ? `${contextKey}:${accountRetry}` : null;
  const accounts = accountsResult?.key === accountsKey ? accountsResult.accounts : null;
  const currentAccountsError = accountsError?.key === accountsKey ? accountsError.message : "";
  const liabilityAccounts = accounts?.filter((account) => account.type === "LIABILITY") ?? [];
  const assetAccounts = accounts?.filter((account) => account.type === "ASSET") ?? [];
  const canSubmit = !cycleLoading && !cycleError && liabilityAccounts.some((account) => String(account.id) === debit) && assetAccounts.some((account) => String(account.id) === credit);
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && groupSlug ? `${contextKey}:${retry}` : null;
  const [result, setResult] = useState<{ key: string; expenses: Expense[] } | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [selection, setSelection] = useState<{ key: string; ids: string[] } | null>(null);
  const expenses = result?.key === requestKey ? result.expenses : null;
  const currentError = error?.key === requestKey ? error.message : "";
  const selectedIds = selection?.key === requestKey ? selection.ids : [];
  const selected = expenses?.filter((expense) => selectedIds.includes(expense.id)) ?? [];
  const total = selected.reduce((sum, expense) => sum + amountToCents(expense.amount), 0);

  useEffect(() => {
    if (!requestKey) return;
    const controller = new AbortController();
    fetchExpenses(accessToken, groupSlug, controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted) setResult({ key: requestKey, expenses: loaded });
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError({ key: requestKey, message: cause instanceof Error ? cause.message : "Unable to load expenses." });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, requestKey]);

  useEffect(() => {
    if (!accountsKey || cycleId === undefined) return;
    const controller = new AbortController();
    fetchCycleAccounts(accessToken, groupSlug, cycleId, controller.signal)
      .then((loaded) => {
        if (controller.signal.aborted) return;
        setAccountsResult({ key: accountsKey, accounts: loaded });
        setDebit(String(loaded.find((account) => account.type === "LIABILITY" && account.name.toLowerCase() === "accounts payable")?.id ?? ""));
        setCredit(String(loaded.find((account) => account.type === "ASSET" && account.name.toLowerCase() === "cash")?.id ?? ""));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setAccountsError({ key: accountsKey, message: cause instanceof Error ? cause.message : "Unable to load accounts." });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, accountsKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current || !canSubmit || !selected.length) return;
    submittingRef.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await payExpenses(accessToken, groupSlug, {
        expenses: selected.map(({ id, amount }) => ({ id, amount })), debit, credit,
      });
      setSelection(null);
      setFeedback({ key: contextKey, kind: "success", message: "Payment disbursed successfully." });
      setRetry((value) => value + 1);
    } catch (cause) {
      setFeedback({ key: contextKey, kind: "error", message: cause instanceof Error ? cause.message : "Unable to disburse payment." });
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function addExpense(id: string) {
    if (!requestKey) return;
    setSelection((previous) => {
      const ids = previous?.key === requestKey ? previous.ids : [];
      return { key: requestKey, ids: ids.includes(id) ? ids : [...ids, id] };
    });
  }

  return (
    <main className="protected-content">
      <h1>Disburse Payment</h1>
      <p>Select expenses to add to your payment.</p>
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to load expenses.</p>}
      {requestKey && !expenses && !currentError && <p className="members-feedback" role="status">Loading expenses…</p>}
      {currentError && <p className="members-feedback" role="alert">{currentError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {expenses?.length === 0 && <p className="members-feedback" role="status">No expenses available.</p>}
      <div className="disburse-expenses">
        {expenses?.map((expense) => (
          <button className="disburse-expense-card" type="button" key={expense.id} disabled={submitting || selectedIds.includes(expense.id)} onClick={() => addExpense(expense.id)}>
            <strong>{expense.description || `Expense #${expense.id}`}</strong>
            <span className="disburse-expense-amount">{currency.format(Number(expense.amount))}</span>
            <span>{selectedIds.includes(expense.id) ? "Added to payment" : "Add to payment"}</span>
          </button>
        ))}
      </div>
      <section className="business-checkout" aria-labelledby="payment-heading">
        <h2 id="payment-heading">Selected expenses</h2>
        <div className="members-table-wrapper">
          <table className="members-table business-checkout-table">
            <thead><tr><th scope="col">Expense</th><th scope="col">Amount</th><th scope="col">Action</th></tr></thead>
            <tbody>
              {selected.length === 0 && <tr><td colSpan={3}>Select an expense above to add it to your payment.</td></tr>}
              {selected.map((expense) => (
                <tr key={expense.id}>
                  <th scope="row">{expense.description || `Expense #${expense.id}`}</th>
                  <td>{currency.format(Number(expense.amount))}</td>
                  <td><button type="button" className="text-button" disabled={submitting} aria-label={`Remove ${expense.description || `expense #${expense.id}`}`} onClick={() => setSelection((previous) => previous ? { ...previous, ids: previous.ids.filter((id) => id !== expense.id) } : null)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><th scope="row">Total</th><td colSpan={2} aria-live="polite">{currency.format(total / 100)}</td></tr></tfoot>
          </table>
        </div>
        {cycleLoading && <p role="status">Loading active cycle…</p>}
        {cycleError && <p role="alert">{cycleError} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
        {!cycleLoading && !cycleError && !activeCycle && <p role="status">An active cycle is required to disburse payment.</p>}
        {accountsKey && !accounts && !currentAccountsError && <p role="status">Loading accounts…</p>}
        {currentAccountsError && <p role="alert">{currentAccountsError} <button className="text-button" type="button" onClick={() => setAccountRetry((value) => value + 1)}>Try again</button></p>}
        <form className="expense-form" onSubmit={handleSubmit}>
          <fieldset disabled={submitting || !accounts || cycleLoading || Boolean(cycleError)} aria-busy={submitting}>
            <div className="transaction-account-row">
              <div className="field">
                <label htmlFor="disburse-debit">Debit — Liability account</label>
                <select id="disburse-debit" name="debit" required value={debit} onChange={(event) => setDebit(event.target.value)}>
                  <option value="">Select a liability account</option>
                  {liabilityAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="disburse-credit">Credit — Asset account</label>
                <select id="disburse-credit" name="credit" required value={credit} onChange={(event) => setCredit(event.target.value)}>
                  <option value="">Select an asset account</option>
                  {assetAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.name}</option>)}
                </select>
              </div>
            </div>
            <button className="submit-button" type="submit" disabled={submitting || !canSubmit || !selected.length}>{submitting ? "Disbursing…" : "Disburse Payment"}</button>
          </fieldset>
        </form>
        {feedback?.key === contextKey && <p className="members-feedback" role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
      </section>
    </main>
  );
}
