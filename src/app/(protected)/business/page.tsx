"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { canViewBusiness } from "@/lib/auth";
import { fetchMembers, type Member } from "@/lib/members";

const actions = ["Shares", "Loan Payments", "Disburse Loans"] as const;
type BusinessAction = typeof actions[number];
type Selection = { action: BusinessAction; member: Member; trigger: HTMLButtonElement };
const pricePerShare = 100;
// Sample amounts until member loan data is available from the backend.
const previewRemainingBalance = 5000;
const previewAppliedLoan = 10000;
const pesos = (amount: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

function ActionPanel({ selection, onClose }: { selection: Selection; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const [shareCount, setShareCount] = useState("1");
  const [sharesAmount, setSharesAmount] = useState("100.00");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState("");

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
    const value = selection.action === "Shares" ? Number(sharesAmount) : Number(amount);
    setNotice(`${selection.action} preview: ${pesos(value)} for ${selection.member.name || "unnamed member"}. No transaction has been saved.`);
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="business-action-title business-member-name" aria-describedby="business-action-description" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">MEMBER BUSINESS</span><h2 id="business-action-title">{selection.action}</h2></div>
        <button className="cycle-close" type="button" aria-label="Close member action" onClick={onClose}>×</button>
      </div>
      <div className="business-selected-member"><span className="eyebrow">MEMBER</span><h3 id="business-member-name">{selection.member.name || "Unnamed member"}</h3></div>
      <p id="business-action-description">Preview only. {selection.action !== "Shares" && "Loan amounts below are sample data. "}Submissions are not saved.</p>
      <form className="cycle-draft-form" onSubmit={handleSubmit}>
        {selection.action === "Shares" ? (
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
          </>
        ) : (
          <>
            <dl className="business-loan-summary">
              <dt>{selection.action === "Loan Payments" ? "Remaining balance" : "Applied loan"} <span className="cycle-optional">(sample)</span></dt>
              <dd>{pesos(selection.action === "Loan Payments" ? previewRemainingBalance : previewAppliedLoan)}</dd>
            </dl>
            <div className="field">
              <label htmlFor="business-loan-amount">{selection.action === "Loan Payments" ? "Payment amount (₱)" : "Loan to Disburse (₱)"}</label>
              <input ref={firstInput} id="business-loan-amount" name="amount" type="number" min="0.01" max={selection.action === "Loan Payments" ? previewRemainingBalance : previewAppliedLoan} step="0.01" placeholder="0.00" required value={amount} onChange={(event) => { setAmount(event.target.value); setNotice(""); }} />
            </div>
          </>
        )}
        <div className="cycle-drawer-footer">
          <button type="button" className="cycle-cancel" onClick={onClose}>Cancel</button>
          <button type="submit" className="submit-button">{selection.action === "Loan Payments" ? "Pay" : "Submit"}</button>
        </div>
        <p className="business-submit-notice" role="status" aria-live="polite">{notice}</p>
      </form>
    </dialog>
  );
}

function BusinessMembers({ accessToken, groupSlug }: { accessToken: string; groupSlug: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<Selection | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      // Use the same community list as /members until cycle enrollment is ready.
      const members = await fetchMembers(accessToken, groupSlug, controller.signal);
      if (!controller.signal.aborted) setMembers(members);
    }
    load().catch((error: unknown) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load members. Please try again.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, attempt]);

  if (error) return (
    <div className="members-feedback">
      <p role="alert">{error}</p>
      <button type="button" className="text-button" onClick={() => { setError(""); setMembers(null); setAttempt((value) => value + 1); }}>Try again</button>
    </div>
  );
  if (!members) return <p className="members-feedback" role="status">Loading members…</p>;

  return (
    <>
      <div className="business-cycle-summary">
        <div><span className="eyebrow">BUSINESS</span><h2>Community members</h2></div>
        <span>{members.length} {members.length === 1 ? "member" : "members"}</span>
      </div>
      {members.length === 0 ? <p className="business-empty" role="status">No members found in this community.</p> : (
        <div className="members-table-wrapper" role="region" aria-label="Community members" tabIndex={0}>
          <table className="members-table business-table">
            <caption>Community members</caption>
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
  const { user, session } = useAuth();
  const { subdomain, group } = useCommunity();

  if (!canViewBusiness(user)) return (
    <main className="protected-content"><h1>Business</h1><p role="status">Business access is restricted to owners, admins, and treasurers with a verified profile.</p></main>
  );

  return (
    <main className="protected-content">
      <h1>Business</h1>
      <p>Shares, loan payments, and loan disbursements for members of {group?.name || subdomain || "your COMSCA community"}.</p>
      {session && subdomain ? <BusinessMembers key={`${subdomain}:${session.access_token}`} accessToken={session.access_token} groupSlug={subdomain} /> : <p role="status">Please sign in through your community’s URL to view business.</p>}
    </main>
  );
}
