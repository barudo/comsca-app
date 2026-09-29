"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useCycles } from "@/components/cycle-provider";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useMembers } from "@/components/members-provider";
import { BusinessCycleActions } from "@/components/business-cycle-actions";
import { PaymentAccounts } from "@/components/payment-accounts";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";
import { disburseLoan } from "@/lib/disbursements";
import { postPayments, type PaymentEntry } from "@/lib/payments";
import { canViewBusiness } from "@/lib/auth";
import { fetchCycleMembers, type CycleMember } from "@/lib/members";

const actions = ["Shares and Payments", "Disburse Loans", "Penalty"] as const;
const paymentOptions = ["Share purchase", "Pay Loan", "Pay Penalty", "Contribution"] as const;
type PaymentOption = typeof paymentOptions[number];
type CheckoutItem = { id: number; type: PaymentOption; amountCents: number; shares?: number; debitAccount?: LedgerAccount; creditAccount?: LedgerAccount };
type BusinessAction = typeof actions[number];
type Selection = { action: BusinessAction; member: CycleMember; trigger: HTMLButtonElement };
const pricePerShare = 100;
const previewAppliedLoan = 10000;
const pesos = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

function ActionPanel({ selection, onClose, onPaymentsSaved }: { selection: Selection; onClose: () => void; onPaymentsSaved: (memberId: string | number) => Promise<CycleMember> }) {
  const { activeCycle } = useCycles();
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const [accounts, setAccounts] = useState<LedgerAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState("");
  const [accountsAttempt, setAccountsAttempt] = useState(0);
  const [fundsAccountId, setFundsAccountId] = useState("");
  const [capitalAccountId, setCapitalAccountId] = useState("");
  const [loanFundsAccountId, setLoanFundsAccountId] = useState("");
  const [loanAccountId, setLoanAccountId] = useState("");
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionFundsAccountId, setContributionFundsAccountId] = useState("");
  const [contributionAccountId, setContributionAccountId] = useState("");
  const [disbursementLoanAccountId, setDisbursementLoanAccountId] = useState("");
  const [disbursementFundsAccountId, setDisbursementFundsAccountId] = useState("");
  const [penaltyFundsAccountId, setPenaltyFundsAccountId] = useState("");
  const [penaltyIncomeAccountId, setPenaltyIncomeAccountId] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const [shareCount, setShareCount] = useState("1");
  const [sharesAmount, setSharesAmount] = useState("100.00");
  const [memberBalances, setMemberBalances] = useState(selection.member);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>("Share purchase");
  const [amount, setAmount] = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState(activeCycle?.details?.absencePenalty ?? "");
  const currentAction = selection.action === "Shares and Payments" ? paymentOption : selection.action;
  const isDisbursement = currentAction === "Disburse Loans";
  const isSharePurchase = currentAction === "Share purchase";
  const isContribution = currentAction === "Contribution";
  const isLoanPayment = currentAction === "Pay Loan";
  const isPenaltyPayment = currentAction === "Pay Penalty";
  const isPenalty = selection.action === "Penalty";
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const checkoutInFlight = useRef(false);
  const [checkoutError, setCheckoutError] = useState("");
  const nextItemId = useRef(0);
  const isCheckout = selection.action === "Shares and Payments";
  const totalCents = items.reduce((total, item) => total + item.amountCents, 0);
  const queuedLoanCents = items.reduce((total, item) => total + (item.type === "Pay Loan" ? item.amountCents : 0), 0);
  const queuedPenaltyCents = items.reduce((total, item) => total + (item.type === "Pay Penalty" ? item.amountCents : 0), 0);
  const remainingLoanAmount = Math.max(0, (Number(memberBalances.remainingLoan) * 100 - queuedLoanCents) / 100);
  const remainingPenaltyAmount = Math.max(0, (Number(memberBalances.unpaidPenalties) * 100 - queuedPenaltyCents) / 100);

  const debitAccount = accounts?.find((account) => String(account.id) === (isContribution ? contributionFundsAccountId : isDisbursement ? disbursementLoanAccountId : isPenaltyPayment ? penaltyFundsAccountId : isLoanPayment ? loanFundsAccountId : fundsAccountId) && account.type === "ASSET");
  const creditAccount = accounts?.find((account) => String(account.id) === (isContribution ? contributionAccountId : isDisbursement ? disbursementFundsAccountId : isPenaltyPayment ? penaltyIncomeAccountId : isLoanPayment ? loanAccountId : capitalAccountId) && account.type === (isSharePurchase ? "EQUITY" : "ASSET"));
  const accessToken = session?.access_token;
  const cycleId = activeCycle?.id;

  useEffect(() => {
    if ((!isCheckout && !isDisbursement) || !accessToken || !subdomain || cycleId === undefined) return;
    const controller = new AbortController();
    fetchCycleAccounts(accessToken, subdomain, cycleId, controller.signal).then((accounts) => {
      if (controller.signal.aborted) return;
      setAccounts(accounts);
      if (isCheckout) {
        const defaultAccountId = (name: string, type: LedgerAccount["type"]) => String(accounts.find((account) => account.type === type && account.name.trim().toLowerCase() === name.toLowerCase())?.id ?? "");
        const cashId = defaultAccountId("Cash", "ASSET");
        setFundsAccountId(cashId);
        setLoanFundsAccountId(cashId);
        setPenaltyFundsAccountId(cashId);
        setContributionFundsAccountId(cashId);
        setCapitalAccountId(defaultAccountId("Equity", "EQUITY"));
        setLoanAccountId(defaultAccountId("Loans Receivable", "ASSET"));
        setPenaltyIncomeAccountId(defaultAccountId("Penalties Receivable", "ASSET"));
        setContributionAccountId(defaultAccountId("Contributions Receivable", "ASSET"));
      }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setAccountsError(cause instanceof Error ? cause.message : "Unable to load cycle accounts.");
    });
    return () => controller.abort();
  }, [isCheckout, isDisbursement, accessToken, subdomain, cycleId, accountsAttempt]);

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (checkoutInFlight.current) return;
    setCheckoutError("");
    const value = isSharePurchase ? Number(sharesAmount) : isContribution ? Number(contributionAmount) : isPenalty ? Number(penaltyAmount) : Number(amount);
    if (isDisbursement) {
      if (!accessToken || !subdomain || cycleId === undefined || selection.member.id === undefined || !debitAccount || !creditAccount || accountsError) {
        setCheckoutError("Select a member, active cycle, loan account, and funds disbursement account.");
        return;
      }
      checkoutInFlight.current = true;
      setCheckingOut(true);
      setNotice("");
      try {
        await disburseLoan(accessToken, subdomain, {
          user_id: String(selection.member.id),
          cycle_id: String(cycleId),
          debit: String(debitAccount.id),
          credit: String(creditAccount.id),
          amount: value.toFixed(2),
          description: "Member loan disbursement",
        });
        setAmount("");
        setNotice(`Loan disbursement saved: ${pesos(value)} for ${selection.member.name || "unnamed member"}.`);
      } catch (cause) {
        setCheckoutError(cause instanceof Error ? cause.message : "Unable to disburse the loan.");
      } finally {
        checkoutInFlight.current = false;
        setCheckingOut(false);
      }
      return;
    }
    if (isCheckout) {
      const amountCents = Math.round(value * 100);
      if (!Number.isSafeInteger(amountCents) || amountCents < 0 || (isContribution && amountCents === 0) || !Number.isSafeInteger(totalCents + amountCents)) {
        setNotice("Enter a valid amount within the supported range.");
        return;
      }
      if (isLoanPayment && amountCents + queuedLoanCents > Number(memberBalances.remainingLoan) * 100) {
        setNotice("Loan payments cannot exceed the remaining balance.");
        return;
      }
      if (isPenaltyPayment && amountCents + queuedPenaltyCents > Number(memberBalances.unpaidPenalties) * 100) {
        setNotice("Penalty payments cannot exceed the unpaid penalties.");
        return;
      }
      if (!debitAccount || !creditAccount || accountsError) {
        setNotice(isContribution ? "Select asset accounts for funds received and the contribution before adding a contribution." : isPenaltyPayment ? "Select asset accounts for funds received and penalty income before adding a penalty payment." : isLoanPayment ? "Select asset accounts for funds received and the loan before adding a loan payment." : "Select an asset account and an equity account before adding a share purchase.");
        return;
      }
      const item: CheckoutItem = { id: nextItemId.current++, type: paymentOption, amountCents, ...(isSharePurchase ? { shares: Number(shareCount) } : {}), debitAccount, creditAccount };
      setItems((current) => [...current, item]);
      setNotice(`${paymentOption} added to checkout.`);
      return;
    }
    setNotice(`${currentAction} preview: ${pesos(value)} for ${selection.member.name || "unnamed member"}. No transaction has been saved.`);
  }

  async function checkout() {
    if (checkoutInFlight.current || !items.length) return;
    setCheckoutError("");
    setNotice("");
    if (!accessToken || !subdomain || cycleId === undefined || selection.member.id === undefined) {
      setCheckoutError("A signed-in member and active cycle are required for checkout.");
      return;
    }
    checkoutInFlight.current = true;
    setCheckingOut(true);
    try {
      const entries: PaymentEntry[] = items.map((item) => {
        if (!item.debitAccount || !item.creditAccount) throw new Error("Choose debit and credit accounts for every payment.");
        return {
          type: item.type === "Contribution" ? "PAY_CONTRIBUTION" : item.type === "Share purchase" ? "BUY_SHARE" : item.type === "Pay Penalty" ? "PENALTY_PAYMENT" : "LOAN_PAYMENT",
          debit: String(item.debitAccount.id),
          credit: String(item.creditAccount.id),
          amount: `${Math.floor(item.amountCents / 100)}.${String(item.amountCents % 100).padStart(2, "0")}`,
        };
      });
      await postPayments(accessToken, subdomain, selection.member.id, cycleId, entries);
      setItems([]);
      setNotice(`Payments saved: ${pesos(totalCents / 100)} for ${selection.member.name || "unnamed member"}.`);
      try {
        setMemberBalances(await onPaymentsSaved(selection.member.id));
      } catch (cause) {
        setCheckoutError(cause instanceof Error
          ? `Payments were saved, but member balances could not be refreshed: ${cause.message}`
          : "Payments were saved, but member balances could not be refreshed.");
      }
    } catch (cause) {
      setCheckoutError(cause instanceof Error ? cause.message : "Unable to complete checkout.");
    } finally {
      checkoutInFlight.current = false;
      setCheckingOut(false);
    }
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="business-action-title business-member-name" aria-describedby="business-action-description" onCancel={(event) => { event.preventDefault(); if (!checkoutInFlight.current) onClose(); }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">MEMBER BUSINESS</span><h2 id="business-action-title">{selection.action}</h2></div>
        <button className="cycle-close" type="button" aria-label="Close member action" disabled={checkingOut} onClick={onClose}>×</button>
      </div>
      <div className="business-selected-member"><span className="eyebrow">MEMBER</span><h3 id="business-member-name">{selection.member.name || "Unnamed member"}</h3></div>
      <p id="business-action-description">{isCheckout ? "Add items below, then checkout to save payments." : isDisbursement ? "Submit to record the loan disbursement." : "Preview only. Submissions are not saved."} {selection.action === "Disburse Loans" && "Loan amounts below are sample data. "}</p>
      <form className="cycle-draft-form" onSubmit={handleSubmit}>
        <fieldset className="business-payment-fields" disabled={checkingOut}>
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
            <dl className="business-loan-summary"><dt>Total shares</dt><dd>{pesos(Number(memberBalances.totalShares))}</dd></dl>
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

          </>
        ) : isContribution ? (
          <>
            <dl className="business-loan-summary"><dt>Unpaid contributions</dt><dd>{pesos(Number(memberBalances.unpaidContributions))}</dd></dl>
            <div className="field">
              <label htmlFor="business-contribution-amount">Contribution (₱)</label>
              <input ref={firstInput} id="business-contribution-amount" name="contribution_amount" type="number" min="0.01" step="0.01" placeholder="0.00" required value={contributionAmount} onChange={(event) => { setContributionAmount(event.target.value); setNotice(""); }} />
            </div>
          </>
        ) : isPenaltyPayment ? (
          <>
            <dl className="business-loan-summary"><dt>Unpaid penalties</dt><dd>{pesos(remainingPenaltyAmount)}</dd></dl>
            <div className="field">
              <label htmlFor="business-penalty-payment-amount">Payment amount (₱)</label>
              <input ref={firstInput} id="business-penalty-payment-amount" name="amount" type="number" min="0.01" max={remainingPenaltyAmount} step="0.01" placeholder="0.00" required value={amount} onChange={(event) => { setAmount(event.target.value); setNotice(""); }} />
            </div>
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
              <dt>{isLoanPayment ? "Remaining balance" : "Applied loan"}{!isLoanPayment && <span className="cycle-optional">(sample)</span>}</dt>
              <dd>{pesos(isLoanPayment ? remainingLoanAmount : previewAppliedLoan)}</dd>
            </dl>
            <div className="field">
              <label htmlFor="business-loan-amount">{isLoanPayment ? "Payment amount (₱)" : "Loan to Disburse (₱)"}</label>
              <input ref={firstInput} id="business-loan-amount" name="amount" type="number" min="0.01" max={isLoanPayment ? remainingLoanAmount : previewAppliedLoan} step="0.01" placeholder="0.00" required value={amount} onChange={(event) => { setAmount(event.target.value); setNotice(""); }} />
            </div>
          </>
        )}
        {(isSharePurchase || isLoanPayment || isPenaltyPayment || isDisbursement || isContribution) && (accountsError ? (
          <div><p role="alert">{accountsError}</p><button type="button" className="text-button" onClick={() => { setAccountsError(""); setAccounts(null); setAccountsAttempt((value) => value + 1); }}>Try again</button></div>
        ) : accounts === null ? <p role="status">Loading cycle accounts…</p> : (
          <PaymentAccounts accounts={accounts} debitLabel={isDisbursement ? "Loan Account" : "Funds Received Into"} creditType={isSharePurchase ? "EQUITY" : "ASSET"} creditLabel={isContribution ? "Contribution Account" : isDisbursement ? "Funds Disbursed From" : isPenaltyPayment ? "Penalty Income Account" : isLoanPayment ? "Loan Account" : "Share Capital Account"}
            fundsAccountId={isContribution ? contributionFundsAccountId : isDisbursement ? disbursementLoanAccountId : isPenaltyPayment ? penaltyFundsAccountId : isLoanPayment ? loanFundsAccountId : fundsAccountId} creditAccountId={isContribution ? contributionAccountId : isDisbursement ? disbursementFundsAccountId : isPenaltyPayment ? penaltyIncomeAccountId : isLoanPayment ? loanAccountId : capitalAccountId}
            onFundsAccountChange={(id) => { (isContribution ? setContributionFundsAccountId : isDisbursement ? setDisbursementLoanAccountId : isPenaltyPayment ? setPenaltyFundsAccountId : isLoanPayment ? setLoanFundsAccountId : setFundsAccountId)(id); setNotice(""); }}
            onCreditAccountChange={(id) => { (isContribution ? setContributionAccountId : isDisbursement ? setDisbursementFundsAccountId : isPenaltyPayment ? setPenaltyIncomeAccountId : isLoanPayment ? setLoanAccountId : setCapitalAccountId)(id); setNotice(""); }} />
        ))}
        </div>
        <div className="cycle-drawer-footer">
          {!isCheckout && <button type="button" className="cycle-cancel" disabled={checkingOut} onClick={onClose}>Cancel</button>}
          <button type="submit" className="submit-button" disabled={(isDisbursement && selection.member.id === undefined) || (isCheckout && isLoanPayment && remainingLoanAmount <= 0) || (isCheckout && isPenaltyPayment && remainingPenaltyAmount <= 0) || ((isSharePurchase || isLoanPayment || isPenaltyPayment || isDisbursement || isContribution) && (!debitAccount || !creditAccount || !!accountsError))}>{isContribution ? "Add Contribution" : isCheckout ? isSharePurchase ? "Add Share Purchase" : isLoanPayment ? "Add Loan Payment" : "Add Penalty Payment" : checkingOut ? "Submitting…" : "Submit"}</button>
        </div>
        </fieldset>
      </form>
      {isCheckout && (
        <section className="business-checkout" aria-labelledby="business-checkout-title">
          <h3 id="business-checkout-title">Checkout items</h3>
          <div className="members-table-wrapper">
            <table className="members-table business-checkout-table">
              <caption>{items.length} {items.length === 1 ? "item" : "items"}</caption>
              <thead><tr><th scope="col">Item</th><th scope="col">Amount</th><th scope="col">Action</th></tr></thead>
              <tbody>
                {items.length === 0 && <tr><td colSpan={3}>Add a share purchase, loan payment, penalty payment, or contribution above.</td></tr>}
                {items.map((item) => (
                  <tr key={item.id}>
                    <th scope="row">{item.type}{item.shares !== undefined && <span className="business-checkout-detail">{item.shares} {item.shares === 1 ? "share" : "shares"}</span>}{item.debitAccount && <span className="business-checkout-detail">Debit: {item.debitAccount.name}</span>}{item.creditAccount && <span className="business-checkout-detail">Credit: {item.creditAccount.name}</span>}</th>
                    <td>{pesos(item.amountCents / 100)}</td>
                    <td><button type="button" className="text-button" disabled={checkingOut} aria-label={`Remove ${item.type} of ${pesos(item.amountCents / 100)}`} onClick={() => { setItems((current) => current.filter((entry) => entry.id !== item.id)); setNotice("Item removed from checkout."); }}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><th scope="row">Total</th><td colSpan={2}>{pesos(totalCents / 100)}</td></tr></tfoot>
            </table>
          </div>
          <div className="cycle-drawer-footer">
            <button type="button" className="cycle-cancel" disabled={checkingOut} onClick={onClose}>Cancel</button>
            <button type="button" className="submit-button" disabled={checkingOut || items.length === 0 || selection.member.id === undefined} onClick={() => void checkout()}>{checkingOut ? "Checking out…" : "Checkout"}</button>
          </div>
        </section>
      )}
      {checkoutError && <p role="alert">{checkoutError}</p>}
      <p className="business-submit-notice" role="status" aria-live="polite">{notice}</p>
    </dialog>
  );
}

function BusinessMembers({ cycleId, accessToken, groupSlug }: { cycleId: string | number; accessToken: string; groupSlug: string }) {
  const [members, setMembers] = useState<CycleMember[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);

  async function refreshMemberBalances(memberId: string | number) {
    const cycleMembers = await fetchCycleMembers(accessToken, groupSlug, cycleId);
    setMembers(cycleMembers);
    const refreshedMember = cycleMembers.find((member) => String(member.id) === String(memberId));
    if (!refreshedMember) throw new Error("The member was not found in the refreshed cycle.");
    return refreshedMember;
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchCycleMembers(accessToken, groupSlug, cycleId, controller.signal).then((cycleMembers) => {
      if (!controller.signal.aborted) setMembers(cycleMembers);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load current cycle members.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, attempt]);

  if (error) return (
    <div className="members-feedback">
      <p role="alert">{error}</p>
      <button type="button" className="text-button" onClick={() => { setMembers(null); setError(""); setAttempt((value) => value + 1); }}>Try again</button>
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
            <thead><tr><th scope="col">#</th><th scope="col">Member</th><th scope="col">Total Shares</th><th scope="col">Remaining Loan</th><th scope="col">Unpaid Penalties</th><th scope="col">Unpaid Contributions</th><th scope="col">Actions</th></tr></thead>
            <tbody>{members.map((member, index) => (
              <tr key={member.id ?? index}>
                <td>{index + 1}</td>
                <th scope="row">{member.name || "Unnamed member"}{member.email && <span className="business-member-email">{member.email}</span>}</th>
                <td>{pesos(Number(member.totalShares))}</td>
                <td>{pesos(Number(member.remainingLoan))}</td>
                <td>{pesos(Number(member.unpaidPenalties))}</td>
                <td>{pesos(Number(member.unpaidContributions))}</td>
                <td><div className="business-member-actions">{actions.map((action) => (
                  <button key={action} type="button" aria-label={`${action} for ${member.name || "unnamed member"}`} onClick={(event) => setSelection({ action, member, trigger: event.currentTarget })}>{action}</button>
                ))}</div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {selection && <ActionPanel key={`${selection.action}:${selection.member.id}`} selection={selection} onClose={() => setSelection(null)} onPaymentsSaved={refreshMemberBalances} />}
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
      <div className="members-heading business-heading">
        <h1>Business</h1>
        {session && subdomain && <BusinessCycleActions key={`${subdomain}:${session.access_token}:${activeCycle.id}`} accessToken={session.access_token} groupSlug={subdomain} cycleId={activeCycle.id} requiredMonthlyContribution={activeCycle.details?.requiredMonthlyContribution} />}
      </div>
      <p>Shares, loan payments, loan disbursements, and penalties for members of {group?.name || subdomain || "your COMSCA community"}.</p>
      {session && subdomain ? <BusinessMembers key={`${subdomain}:${session.access_token}:${activeCycle.id}:${revision}`} cycleId={activeCycle.id} accessToken={session.access_token} groupSlug={subdomain} /> : <p role="status">Please sign in through your community’s URL to view business.</p>}
    </main>
  );
}
