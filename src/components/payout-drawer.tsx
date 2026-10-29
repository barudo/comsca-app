"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";
import { postPayout, type PayoutInput } from "@/lib/payouts";
import type { Distributions } from "@/lib/distributions";

type Distribution = Distributions["distributions"][number];
export function PayoutDrawer({ member, trigger, accessToken, groupSlug, cycleId, onClose, onPaid }: {
  member: Distribution; trigger: HTMLButtonElement; accessToken: string; groupSlug: string; cycleId: string | number;
  onClose: () => void; onPaid: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const payment = useRef<PayoutInput | null>(null);
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [accountError, setAccountError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [credit, setCredit] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState(false);
  const remaining = Math.max(0, member.amounts.net_amount - member.amounts.paid_amount);
  useEffect(() => {
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    panel?.showModal();
    amountInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { panel?.close(); document.body.style.overflow = overflow; trigger.focus(); };
  }, [trigger]);
  useEffect(() => {
    const controller = new AbortController();
    fetchCycleAccounts(accessToken, groupSlug, cycleId, controller.signal).then((data) => {
      if (controller.signal.aborted) return;
      const assets = data.filter((account) => account.type === "ASSET");
      setAccounts(assets);
      setCredit(String(assets.find((account) => account.name.trim().toUpperCase() === "CASH")?.id ?? ""));
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setAccountError(cause instanceof Error ? cause.message : "Unable to load accounts.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, attempt]);
  async function disburse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    if (!payment.current) {
      const cents = Math.round(Number(amount) * 100);
      if (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isSafeInteger(cents) || cents <= 0 || cents > remaining || !accounts?.some((account) => String(account.id) === credit)) {
        setError("Select an asset account and enter a positive amount no greater than the remaining payout.");
        return;
      }
      payment.current = { user_id: member.userId, credit, amount: (cents / 100).toFixed(2), idempotency_key: `cycle-${cycleId}-member-${member.userId}-payment-${crypto.randomUUID()}` };
      setLocked(true);
    }
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await postPayout(accessToken, groupSlug, cycleId, payment.current);
    } catch (cause) {
      setError(`${cause instanceof Error ? cause.message : "Unable to confirm payout."} Retry Disburse to safely retry the same payment.`);
      return;
    } finally {
      pending.current = false;
      setSaving(false);
    }
    onPaid();
  }
  return <dialog ref={dialog} className="cycle-drawer" aria-labelledby="payout-drawer-title" onCancel={(event) => { event.preventDefault(); if (!pending.current) onClose(); }}>
    <div className="cycle-drawer-header"><div><span className="eyebrow">PAYOUT</span><h2 id="payout-drawer-title">{member.fullName}</h2></div><button type="button" className="cycle-close" aria-label="Close payout" disabled={saving} onClick={onClose}>×</button></div>
    <p>Remaining payout: <button type="button" className="text-button" disabled={locked} onClick={() => { setAmount((remaining / 100).toFixed(2)); amountInput.current?.focus(); }}>{new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(remaining / 100)}</button></p>
    <form className="cycle-draft-form" onSubmit={disburse}>
      <fieldset className="business-payment-fields" disabled={locked}>
        <div className="field"><label htmlFor="payout-amount">Payout amount (₱)</label><input ref={amountInput} id="payout-amount" type="number" min="0.01" max={(remaining / 100).toFixed(2)} step="0.01" inputMode="decimal" required value={amount} onChange={(event) => setAmount(event.target.value)} /></div>
        {accountError ? <div><p role="alert">{accountError}</p><button type="button" className="text-button" onClick={() => { setAccountError(""); setAttempt((value) => value + 1); }}>Retry accounts</button></div>
          : accounts === null ? <p role="status">Loading asset accounts…</p>
          : <div className="field"><label htmlFor="payout-credit">Credit account</label><select id="payout-credit" required value={credit} onChange={(event) => setCredit(event.target.value)}><option value="">Select an asset account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>{accounts.length === 0 && <p>No asset accounts are available.</p>}</div>}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="cycle-drawer-footer"><button type="button" className="cycle-cancel" disabled={saving} onClick={onClose}>Cancel</button><button type="submit" className="submit-button" disabled={saving || !credit || !!accountError || remaining <= 0}>{saving ? "Disbursing…" : "Disburse"}</button></div>
    </form>
  </dialog>;
}
