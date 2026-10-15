"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchExpenses, type Expense } from "@/lib/expenses";
import { amountToCents } from "@/lib/money";

const currency = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function DisbursePage() {
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const accessToken = session?.access_token ?? "";
  const groupSlug = subdomain ?? "";
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && groupSlug ? `${accessToken}:${groupSlug}:${retry}` : null;
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
          <button className="disburse-expense-card" type="button" key={expense.id} disabled={selectedIds.includes(expense.id)} onClick={() => addExpense(expense.id)}>
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
                  <td><button type="button" className="text-button" aria-label={`Remove ${expense.description || `expense #${expense.id}`}`} onClick={() => setSelection((previous) => previous ? { ...previous, ids: previous.ids.filter((id) => id !== expense.id) } : null)}>Remove</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><th scope="row">Total</th><td colSpan={2} aria-live="polite">{currency.format(total / 100)}</td></tr></tfoot>
          </table>
        </div>
        <button className="submit-button" type="button">Disburse Payment</button>
      </section>
    </main>
  );
}
