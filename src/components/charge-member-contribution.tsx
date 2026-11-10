"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { chargeContribution } from "@/lib/contributions";
import { PaymentAccounts } from "@/components/payment-accounts";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";
import { useCycles } from "@/components/cycle-provider";
import { isTransactionsFrozenError } from "@/lib/api-errors";

type Props = {
  accessToken: string;
  groupSlug: string;
  cycleId: string | number;
  requiredMonthlyContribution?: string;
  member: { id?: string | number; name: string };
  trigger: HTMLButtonElement;
  onCharged: () => Promise<unknown>;
  onClose: () => void;
};

const findAccount = (accounts: LedgerAccount[], type: string, name: string) =>
  String(accounts.find((account) => account.type === type && account.name.trim().toLowerCase() === name)?.id ?? "");

export function ChargeMemberContribution({ accessToken, groupSlug, cycleId, requiredMonthlyContribution, member, trigger, onCharged, onClose }: Props) {
  const { currentCycle, refreshCycles } = useCycles();
  const transactionsFrozen = currentCycle?.cycle.transactions_frozen === true;
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [debitId, setDebitId] = useState("");
  const [creditId, setCreditId] = useState("");
  const [amount, setAmount] = useState(requiredMonthlyContribution ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const debit = accounts?.find((account) => String(account.id) === debitId && account.type === "ASSET");
  const credit = accounts?.find((account) => String(account.id) === creditId && account.type === "INCOME");
  const memberName = member.name || "member";

  useEffect(() => {
    const panel = dialog.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    closeButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      trigger.focus();
    };
  }, [trigger]);

  useEffect(() => {
    const controller = new AbortController();
    fetchCycleAccounts(accessToken, groupSlug, cycleId, controller.signal).then((loaded) => {
      if (controller.signal.aborted) return;
      setAccounts(loaded);
      setDebitId(findAccount(loaded, "ASSET", "contributions receivable"));
      setCreditId(findAccount(loaded, "INCOME", "contribution income"));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load cycle accounts.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, attempt]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!debit || !credit || error || inFlight.current || submitted || transactionsFrozen) return;
    if (member.id === undefined) return;
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0) {
      setSubmitError("Enter a valid positive amount with up to two decimal places.");
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError("");
    setNotice("");
    try {
      await chargeContribution(accessToken, groupSlug, {
        amount: Number(amount).toFixed(2),
        debit: String(debit.id),
        credit: String(credit.id),
        description: "September contributions",
        user_ids: [String(member.id)],
      });
      setSubmitted(true);
      setNotice(`Contribution charged to ${memberName}.`);
      try {
        await onCharged();
      } catch (cause: unknown) {
        setSubmitError(cause instanceof Error
          ? `Contribution charge succeeded, but cycle members could not be refreshed: ${cause.message}`
          : "Contribution charge succeeded, but cycle members could not be refreshed.");
      }
    } catch (cause: unknown) {
      setSubmitError(cause instanceof Error ? cause.message : "Unable to charge contribution.");
      if (isTransactionsFrozenError(cause)) void refreshCycles().catch(() => {});
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="member-charge-title" aria-describedby="member-charge-description" onCancel={(event) => { event.preventDefault(); if (!inFlight.current) onClose(); }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">BUSINESS</span><h2 id="member-charge-title">Charge Contribution</h2></div>
        <button ref={closeButton} type="button" className="cycle-close" aria-label="Close drawer" disabled={submitting} onClick={onClose}>×</button>
      </div>
      <p id="member-charge-description">This will charge a contribution to {memberName}.</p>
      <form className="cycle-draft-form" onSubmit={submit}>
        <fieldset className="business-payment-fields" disabled={submitting || submitted || transactionsFrozen}>
          <div className="field">
            <label htmlFor="member-contribution-amount">Amount (₱)</label>
            <input id="member-contribution-amount" name="amount" type="number" min="0.01" step="0.01" inputMode="decimal" required value={amount} onChange={(event) => { setAmount(event.target.value); setSubmitError(""); }} />
          </div>
          {error ? <div><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => { setError(""); setAccounts(null); setAttempt((value) => value + 1); }}>Try again</button></div>
            : accounts === null ? <p role="status">Loading cycle accounts…</p>
            : <PaymentAccounts accounts={accounts} debitLabel="Charge To" creditLabel="Record Contribution as" creditType="INCOME" fundsAccountId={debitId} creditAccountId={creditId}
              onFundsAccountChange={setDebitId} onCreditAccountChange={setCreditId} />}
        </fieldset>
        <div className="cycle-drawer-footer">
          <button type="button" className="cycle-cancel" disabled={submitting} onClick={onClose}>{submitted ? "Close" : "Cancel"}</button>
          <button type="submit" className="submit-button" disabled={transactionsFrozen || !debit || !credit || !!error || submitting || submitted} title={transactionsFrozen ? "Transactions are currently frozen." : undefined}>{submitting ? "Charging…" : "Submit"}</button>
        </div>
        {submitError && <p role="alert">{submitError}</p>}
        <p className="business-submit-notice" role="status">{notice}</p>
      </form>
    </dialog>
  );
}
