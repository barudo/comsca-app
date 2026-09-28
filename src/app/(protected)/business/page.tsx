"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCycles } from "@/components/cycle-provider";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useMembers } from "@/components/members-provider";
import { SharePurchaseAccounts } from "@/components/share-purchase-accounts";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";
import { canViewBusiness } from "@/lib/auth";
import { getActiveCycleMembers, type Member } from "@/lib/members";

const actions = ["Shares and Payments", "Disburse Loans", "Penalty"] as const;
const paymentOptions = ["Share purchase", "Pay Loan", "Pay Penalty"] as const;
type PaymentOption = typeof paymentOptions[number];
type CheckoutItem = { id: number; type: PaymentOption; amountCents: number; shares?: number; debitAccount?: LedgerAccount; creditAccount?: LedgerAccount };
type BusinessAction = typeof actions[number];
type Selection = { action: BusinessAction; member: Member; trigger: HTMLButtonElement };
const pricePerShare = 100;
// Sample amounts until member loan data is available from the backend.
const previewRemainingBalance = 5000;
const previewAppliedLoan = 10000;
const pesos = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

function ActionPanel({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const { activeCycle } = useCycles();
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState("");
  const [accountsAttempt, setAccountsAttempt] = useState(0);
  const [fundsAccountId, setFundsAccountId] = useState("");
  const [capitalAccountId, setCapitalAccountId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const [shareCount, setShareCount] = useState("1");
  const [sharesAmount, setSharesAmount] = useState("100.00");
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("Share purchase");
  const [amount, setAmount] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState(activeCycle?.details?.absencePenalty ?? "");
  const currentAction = selection.action === "Shares and Payments" ? paymentOption : selection.action;
  const isSharePurchase = currentAction === "Share purchase";
  const isLoanPayment = currentAction === "Pay Loan";
  const isPenalty = currentAction === "Pay Penalty" || currentAction === "Penalty";
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const nextItemId = useRef(0);
  const isCheckout = selection.action === "Shares and Payments";
  const totalCents = items.reduce((total, item) => total + item.amountCents, 0);
  const queuedLoanCents = items.reduce((total, item) => total + (item.type === "Pay Loan" ? item.amountCents : 0), 0);
  const remainingLoanAmount = (previewRemainingBalance * 100 - queuedLoanCents) / 100;

  const debitAccount = accounts?.find((account) => String(account.id) === fundsAccountId && account.type === "ASSET");
  const creditAccount = accounts?.find((account) => String(account.id) === capitalAccountId && account.type === "EQUITY");
  const accessToken = session?.access_token;
  const cycleId = activeCycle?.id;

  useEffect(() => {
    if (!isCheckout || !accessToken || !subdomain || cycleId === undefined) return;
    const controller = new AbortController();
    fetchCycleAccounts(accessToken, subdomain, cycleId, controller.signal).then((accounts) => {
      if (!controller.signal.aborted) setAccounts(accounts);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setAccountsError(cause instanceof Error ? cause.message : "Unable to load cycle accounts.");
    });
    return () => controller.abort();
  }, [isCheckout, accessToken, subdomain, cycleId, accountsAttempt]);

  function updateShareCount(value: string) {
    setShareCount(value);
    setSharesAmount(value !== "" && Number.isFinite(Number(value) * pricePerShare)
      ? (Number(value) * pricePerShare).toFixed(2) : "");
    setNotice("");
  }

  function updateSharesAmount(value: string) {
    setSharesAmount(value);
    setShareCount(value !== "" && Number.isFinite(Number(value))
      ? String(Number(value) / pricePerShare) : "");
    setNotice("");
  }

  useEffect(() => {
    const panel = dialog.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    firstInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      selection.trigger.focus();
    };
  }, [selection]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = isSharePurchase ? Number(sharesAmount) : isPenalty ? Number(penaltyAmount) : Number(amount);
    if (isCheckout) {
      const amountCents = Math.round(value * 100);
      if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !Number.isSafeInteger(totalCents + amountCents)) {
        setNotice("Enter a valid amount within the supported range.");
        return;
      }
      if (isLoanPayment && amountCents + queuedLoanCents > previewRemainingBalance * 100) {
        setNotice("Loan payments cannot exceed the remaining balance.");
        return;
      }
      if (isSharePurchase && (!debitAccount || !creditAccount || accountsError)) {
        setNotice("Select an asset account and an equity account before adding a share purchase.");
        return;
      }
      const item: CheckoutItem = { id: nextItemId.current++, type: paymentOption, amountCents, ...(isSharePurchase ? { shares: Number(shareCount), debitAccount, creditAccount } : {}) };
      setItems((current) => [...current, item]);
      setNotice(`${paymentOption} added to checkout.`);
      return;
    }
    setNotice(`${currentAction} preview: ${pesos(value)} for ${selection.member.name || "unnamed member"}. No transaction has been saved.`);
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="business-action-title business-member-name" aria-describedby="business-action-description" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">MEMBER BUSINESS</span><h2 id="business-action-title">{selection.action}</h2></div>
        <button className="cycle-close" type="button" aria-label="Close member action" onClick={onClose}>×</button>
      </div>
      <div className="business-selected-member"><span className="eyebrow">MEMBER</span><h3 id="business-member-name">{selection.member.name || "Unnamed member"}</h3></div>
      <p id="business-action-description">Preview only. {(isLoanPayment || selection.action === "Disburse Loans") && "Loan amounts below are sample data. "}Submissions are not saved.</p>
      <form className="cycle-draft-form" onSubmit={handleSubmit}>
        {selection.action === "Shares and Payments" && (
          <div className="business-payment-options" role="group" aria-label="Purchase or payment type">
            {paymentOptions.map((option) => (
              <button key={option} type="button" aria-pressed={paymentOption === option} aria-controls="business-payment-fields" onClick={() => { setPaymentOption(option); setNotice(""); }}>{option}</button>
            ))}
          </div>
        )}
        <div id="business-payment-fields" role="group" aria-label={currentAction}>
        {isSharePurchase ? (
          <>
            <div className="field">
              <label htmlFor="business-share-count">No. of Shares</label>
              <input ref={firstInput} id="business-share-count" name="share_count" type="number" min="1" max={Math.floor(Number.MAX_SAFE_INTEGER / 10000)} step="1" required value={shareCount} onChange={(event) => updateShareCount(event.target.value)} aria-describedby="business-share-price" />
              <p id="business-share-price" className="cycle-field-hint">{pesos(pricePerShare)} per share.</p>
            </div>
            <div className="field">
              <label htmlFor="business-shares">Shares (₱)</label>
              <input id="business-shares" name="shares" type="number" min={pricePerShare} max={Math.floor(Number.MAX_SAFE_INTEGER / 10000) * pricePerShare} step={pricePerShare} required value={sharesAmount} onChange={(event) => updateSharesAmount(event.target.value)} aria-describedby="business-shares-hint" />
              <p id="business-shares-hint" className="cycle-field-hint">Edit either field to update the other. Enter multiples of {pesos(pricePerShare)} for whole shares.</p>
            </div>
            {accountsError ? (
              <div><p role="alert">{accountsError}</p><button type="button" className="text-button" onClick={() => { setAccountsError(""); setAccounts(null); setAccountsAttempt((value) => value + 1); }}>Try again</button></div>
            ) : accounts === null ? <p role="status">Loading cycle accounts…</p> : (
              <SharePurchaseAccounts accounts={accounts} fundsAccountId={fundsAccountId} capitalAccountId={capitalAccountId}
                onFundsAccountChange={(id) => { setFundsAccountId(id); setNotice(""); }}
                onCapitalAccountChange={(id) => { setCapitalAccountId(id); setNotice(""); }} />
            )}
          </>
        ) : isPenalty ? (
          <div className="field">
            <label htmlFor="business-penalty">Penalty (₱)</label>
            <input ref={firstInput} id="business-penalty" name="penalty" type="number" min="0" step="0.01" required value={penaltyAmount} onChange={(event) => { setPenaltyAmount(event.target.value); setNotice(""); }} aria-describedby="business-penalty-hint" />
            <p id="business-penalty-hint" className="cycle-field-hint">Defaults to the active cycle’s absence penalty.</p>
          </div>
        ) : (
          <>
            <dl className="business-loan-summary">
              <dt>{isLoanPayment ? "Remaining balance" : "Applied loan"} <span className="cycle-optional">(sample)</span></dt>
              <dd>{pesos(isLoanPayment ? remainingLoanAmount : previewAppliedLoan)}</dd>
            </dl>
            <div className="field">
              <label htmlFor="business-loan-amount">{isLoanPayment ? "Payment amount (₱)" : "Loan to Disburse (₱)"}</label>
              <input ref={firstInput} id="business-loan-amount" name="amount" type="number" min="0.01" max={isLoanPayment ? remainingLoanAmount : previewAppliedLoan} step="0.01" placeholder="0.00" required value={amount} onChange={(event) => { setAmount(event.target.value); setNotice(""); }} />
            </div>
          </>
        )}
        </div>
        <div className="cycle-drawer-footer">
          {!isCheckout && <button type="button" className="cycle-cancel" onClick={onClose}>Cancel</button>}
          <button type="submit" className="submit-button" disabled={(isCheckout && isLoanPayment && remainingLoanAmount <= 0) || (isSharePurchase && (!debitAccount || !creditAccount || !!accountsError))}>{isCheckout ? isSharePurchase ? "Add Share Purchase" : isLoanPayment ? "Add Loan Payment" : "Add Penalty Payment" : "Submit"}</button>
        </div>
      </form>
      {isCheckout && (
        <section className="business-checkout" aria-labelledby="business-checkout-title">
          <h3 id="business-checkout-title">Checkout items</h3>
          <div className="members-table-wrapper">
            <table className="members-table business-checkout-table">
              <caption>{items.length} {items.length === 1 ? "item" : "items"}</caption>
              <thead><tr><th scope="col">Item</th><th scope="col">Amount</th><th scope="col">Action</th></tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={3}>Add a share purchase, loan payment, or penalty payment above.</td></tr>}
                {items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.type}{item.shares !== undefined && <span className="business-checkout-detail">{item.shares} {item.shares === 1 ? "share" : "shares"}</span>}{item.debitAccount && <span className="business-checkout-detail">Debit: {item.debitAccount.name}</span>}{item.creditAccount && <span className="business-checkout-detail">Credit: {item.creditAccount.name}</span>}</th>
                    <td>{pesos(item.amountCents / 100)}</td>
                    <td><button type="button" className="text-button" aria-label={`Remove ${item.type} of ${pesos(item.amountCents / 100)}`} onClick={() => { setItems((current) => current.filter((entry) => entry.id !== item.id)); setNotice("Item removed from checkout."); }}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row">Total</th><td colSpan={2}>{pesos(totalCents / 100)}</td></tr></tfoot>
            </table>
          </div>
          <div className="cycle-drawer-footer">
            <button type="button" className="cycle-cancel" onClick={onClose}>Cancel</button>
            <button type="button" className="submit-button" disabled={items.length === 0} onClick={() => setNotice(`Checkout preview: ${items.length} ${items.length === 1 ? "item" : "items"} totaling ${pesos(totalCents / 100)} for ${selection.member.name || "unnamed member"}. No transaction has been saved.`)}>Checkout</button>
          </div>
        </section>
      )}
      <p className="business-submit-notice" role="status" aria-live="polite">{notice}</p>
    </dialog>
  );
}

function BusinessMembers({ cycleId }: { cycleId: string | number }) {
  const { snapshot, error: loadError, refreshMembers } = useMembers();
  const [selection, setSelection] = useState<Selection | null>(null);
  let members: Member[] | null = null;
  let error = loadError;
  if (snapshot) {
    try {
      members = getActiveCycleMembers(snapshot, cycleId);
    } catch (cause) {
      error = cause instanceof Error ? cause.message : "Unable to verify current cycle members.";
    }
  }

  if (error) return (
    <div className="members-feedback">
      <p role="alert">{error}</p>
      <button type="button" className="text-button" onClick={() => { void refreshMembers(); }}>Try again</button>
    </div>
  );
  if (!members) return <p className="members-feedback" role="status">Loading members…</p>;

  return (
    <>
      <div className="business-cycle-summary">
        <div><span className="eyebrow">BUSINESS</span><h2>Current cycle members</h2></div>
        <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
      </div>
      {members.length === 0 ? <p className="business-empty" role="status">No members enrolled in the current cycle.</p> : (
        <div className="members-table-wrapper" role="region" aria-label="Current cycle members" tabIndex={0}>
          <table className="members-table business-table">
            <caption>Current cycle members</caption>
            <thead><tr><th scope="col">#</th><th scope="col">Member</th><th scope="col">Phone</th><th scope="col">Actions</th></tr></thead>
            <tbody>{members.map((member, index) => (
              <tr key={member.id ?? index}>
                <td>{index + 1}</td>
                <th scope="row">{member.name || "Unnamed member"}{member.email && <span className="business-member-email">{member.email}</span>}</th>
                <td>{member.phone || "—"}</td>
                <td><div className="business-member-actions">{actions.map((action) => (
                  <button key={action} type="button" aria-label={`${action} for ${member.name || "unnamed member"}`} onClick={(event) => setSelection({ action, member, trigger: event.currentTarget })}>{action}</button>
                ))}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {selection && <ActionPanel selection={selection} onClose={() => setSelection(null)} />}
    </>
  );
}

export default function BusinessPage() {
  const { activeCycle, loading, error, refreshCycles } = useCycles();
  const { user, session } = useAuth();
  const { revision } = useMembers();
  const { subdomain, group } = useCommunity();

  if (!canViewBusiness(user)) return (
    <main className="protected-content"><h1>Business</h1><p role="status">Business access is restricted to owners, admins, and treasurers with a verified profile.</p></main>
  );

  if (loading) return <main className="protected-content"><h1>Business</h1><p role="status">Loading current cycle…</p></main>;
  if (error) return <main className="protected-content"><h1>Business</h1><p role="alert">{error}</p><button className="text-button" type="button" onClick={() => void refreshCycles().catch(() => {})}>Try again</button></main>;
  if (!activeCycle) return <main className="protected-content"><h1>Business</h1><p role="status">Business is available when your community has an active cycle.</p></main>;

  return (
    <main className="protected-content">
      <h1>Business</h1>
      <p>Shares, loan payments, loan disbursements, and penalties for members of {group?.name || subdomain || "your COMSCA community"}.</p>
      {session && subdomain ? <BusinessMembers key={`${subdomain}:${session.access_token}:${activeCycle.id}:${revision}`} cycleId={activeCycle.id} /> : <p role="status">Please sign in through your community’s URL to view business.</p>}
    </main>
  );
}
