"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { PaymentAccounts } from "@/components/payment-accounts";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";

const actionLabels = {
  interest: "Apply Loan Interest",
  contribution: "Charge Monthly Contribution",
} as const;
type Action = keyof typeof actionLabels;
type Selection = { action: Action; trigger: HTMLButtonElement };
type Context = { accessToken: string; groupSlug: string; cycleId: string | number };

function CycleActionPanel({ selection, accessToken, groupSlug, cycleId, onClose }: Context & { selection: Selection; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [debitId, setDebitId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [notice, setNotice] = useState("");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const interest = selection.action === "interest";
  const debitName = interest ? "Loans Receivable" : "Contributions Receivable";
  const creditName = interest ? "Interest Income" : "Contribution Income";
  const debit = accounts?.find((account) => String(account.id) === debitId && account.type === "ASSET");
  const credit = accounts?.find((account) => String(account.id) === creditId && account.type === "INCOME");

  useEffect(() => {
    const panel = dialog.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      selection.trigger.focus();
    };
  }, [selection]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCycleAccounts(accessToken, groupSlug, cycleId, controller.signal).then((accounts) => {
      if (controller.signal.aborted) return;
      setAccounts(accounts);
      setDebitId(String(accounts.find((account) => account.type === "ASSET" && account.name.trim().toLowerCase() === debitName.toLowerCase())?.id ?? ""));
      setCreditId(String(accounts.find((account) => account.type === "INCOME" && account.name.trim().toLowerCase() === creditName.toLowerCase())?.id ?? ""));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load cycle accounts.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, debitName, creditName, attempt]);

  function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debit || !credit || error) return;
    setNotice(`${actionLabels[selection.action]} preview${interest ? "" : ` for ${month}`}: debit ${debit.name}; credit ${credit.name}. No charges have been saved. This action is not connected yet.`);
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="cycle-action-title" aria-describedby="cycle-action-description" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">BUSINESS</span><h2 id="cycle-action-title">{interest ? "Apply Interest to Outstanding Loans?" : "Charge Monthly Contributions?"}</h2></div>
        <button ref={closeButton} type="button" className="cycle-close" aria-label="Close confirmation" onClick={onClose}>×</button>
      </div>
      <p id="cycle-action-description">{interest ? "This will calculate and apply interest to all eligible outstanding loans for the current cycle." : "This will add the required monthly contribution to all eligible members for the selected month."}</p>
      <form className="cycle-draft-form" onSubmit={confirm}>
        {!interest && <div className="field">
          <label htmlFor="contribution-month">Month</label>
          <input id="contribution-month" type="month" required value={month} onChange={(event) => { setMonth(event.target.value); setNotice(""); }} />
        </div>}
        {error ? <div><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => { setError(""); setAccounts(null); setAttempt((value) => value + 1); }}>Try again</button></div>
          : accounts === null ? <p role="status">Loading cycle accounts…</p>
          : <PaymentAccounts accounts={accounts} debitLabel="Debit Account" creditLabel="Credit Account" creditType="INCOME" fundsAccountId={debitId} creditAccountId={creditId}
            onFundsAccountChange={(id) => { setDebitId(id); setNotice(""); }} onCreditAccountChange={(id) => { setCreditId(id); setNotice(""); }} />}
        <p className="cycle-field-hint">Preview only. This action is not connected yet.</p>
        <div className="cycle-drawer-footer">
          <button type="button" className="cycle-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="submit-button" disabled={!debit || !credit || !!error}>{actionLabels[selection.action]}</button>
        </div>
        <p className="business-submit-notice" role="status">{notice}</p>
      </form>
    </dialog>
  );
}

export function BusinessCycleActions(props: Context) {
  const [selection, setSelection] = useState<Selection | null>(null);
  return <>
    <div className="business-heading-actions">
      {(Object.keys(actionLabels) as Action[]).map((action) => <button key={action} type="button" className="submit-button" onClick={(event) => setSelection({ action, trigger: event.currentTarget })}>{actionLabels[action]}</button>)}
    </div>
    {selection && <CycleActionPanel {...props} selection={selection} onClose={() => setSelection(null)} />}
  </>;
}
