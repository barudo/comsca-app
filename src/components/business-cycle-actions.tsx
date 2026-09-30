"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { chargeContribution } from "@/lib/contributions";
import { chargeInterest } from "@/lib/interests";
import { PaymentAccounts } from "@/components/payment-accounts";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";

const actionLabels = {
  interest: "Apply Loan Interest",
  contribution: "Charge Contribution",
} as const;
type Action = keyof typeof actionLabels;
type Selection = { action: Action; trigger: HTMLButtonElement };
type Context = { accessToken: string; groupSlug: string; cycleId: string | number; requiredMonthlyContribution?: string; onMembersUpdated: () => Promise<unknown> };

function CycleActionPanel({ selection, accessToken, groupSlug, cycleId, requiredMonthlyContribution, onMembersUpdated, onClose }: Context & { selection: Selection; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [debitId, setDebitId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [notice, setNotice] = useState("");
  const [amount, setAmount] = useState(requiredMonthlyContribution ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const inFlight = useRef(false);
  const interest = selection.action === "interest";
  const debitName = interest ? "Loans Receivable" : "Contributions Receivable";
  const creditName = interest ? "Interest Income" : "Contribution Income";
  const debit = accounts?.find((account) => String(account.id) === debitId && account.type === "ASSET");
  const credit = accounts?.find((account) => String(account.id) === creditId && account.type === "INCOME");

  async function refreshMembersAfterCharge(action: string) {
    try {
      await onMembersUpdated();
    } catch (cause: unknown) {
      setSubmitError(cause instanceof Error
        ? `${action} succeeded, but cycle members could not be refreshed: ${cause.message}`
        : `${action} succeeded, but cycle members could not be refreshed.`);
    }
  }

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

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debit || !credit || error || inFlight.current || submitted) return;
    if (interest) {
      inFlight.current = true;
      setSubmitting(true);
      setSubmitError("");
      setNotice("");
      try {
        await chargeInterest(accessToken, groupSlug, { credit: String(credit.id), debit: String(debit.id) });
        setSubmitted(true);
        setNotice("Interest applied successfully.");
        await refreshMembersAfterCharge("Interest application");
      } catch (cause: unknown) {
        setSubmitError(cause instanceof Error ? cause.message : "Unable to apply interest.");
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setSubmitError("Enter a valid positive amount with up to two decimal places.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError("");
    setNotice("");
    try {
      await chargeContribution(accessToken, groupSlug, { amount: Number(amount).toFixed(2), debit: String(debit.id), credit: String(credit.id) });
      setSubmitted(true);
      setNotice("Contribution charged successfully.");
      await refreshMembersAfterCharge("Contribution charge");
    } catch (cause: unknown) {
      setSubmitError(cause instanceof Error ? cause.message : "Unable to charge contribution.");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="cycle-action-title" aria-describedby="cycle-action-description" onCancel={(event) => { event.preventDefault(); if (!inFlight.current) onClose(); }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">BUSINESS</span><h2 id="cycle-action-title">{interest ? "Apply Interest to Outstanding Loans?" : "Charge Contribution"}</h2></div>
        <button ref={closeButton} type="button" className="cycle-close" aria-label="Close confirmation" disabled={submitting} onClick={onClose}>×</button>
      </div>
      <p id="cycle-action-description">{interest ? "This will calculate and apply interest to all eligible outstanding loans for the current cycle." : "This will add the required contribution to all eligible members."}</p>
      <form className="cycle-draft-form" onSubmit={confirm}>
        <fieldset className="business-payment-fields" disabled={submitting || submitted}>
          {!interest && <div className="field">
            <label htmlFor="contribution-amount">Amount (₱)</label>
            <input id="contribution-amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => { setAmount(event.target.value); setSubmitError(""); }} />
          </div>}
          {error ? <div><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => { setError(""); setAccounts(null); setAttempt((value) => value + 1); }}>Try again</button></div>
            : accounts === null ? <p role="status">Loading cycle accounts…</p>
            : <PaymentAccounts accounts={accounts} debitLabel={interest ? "Add Interest To" : "Charge To"} creditLabel={interest ? "Record Interest As" : "Record Contribution As"} creditType="INCOME" fundsAccountId={debitId} creditAccountId={creditId}
              onFundsAccountChange={(id) => { setDebitId(id); setNotice(""); }} onCreditAccountChange={(id) => { setCreditId(id); setNotice(""); }} />}
        </fieldset>
        <div className="cycle-drawer-footer">
          <button type="button" className="cycle-cancel" disabled={submitting} onClick={onClose}>{submitted ? "Close" : "Cancel"}</button>
          <button type="submit" className="submit-button" disabled={!debit || !credit || !!error || submitting || submitted}>{submitting ? "Charging…" : actionLabels[selection.action]}</button>
        </div>
        {submitError && <p role="alert">{submitError}</p>}
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
