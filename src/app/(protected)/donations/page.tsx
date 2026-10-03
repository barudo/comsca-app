"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { fetchCycleAccounts, type LedgerAccount } from "@/lib/accounts";
import { postDonation } from "@/lib/donations";

export default function DonationsPage() {
  const { activeCycle, loading: cycleLoading, error: cycleError, refreshCycles } = useCycles();
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const accessToken = session?.access_token ?? "";
  const groupSlug = subdomain ?? "";
  const cycleId = activeCycle?.id;
  const requestKey = accessToken && groupSlug && cycleId !== undefined ? `${accessToken}:${groupSlug}:${cycleId}` : null;
  const [accountsResult, setAccountsResult] = useState<{ requestKey: string; accounts: LedgerAccount[] } | null>(null);
  const [accountsError, setAccountsError] = useState<{ requestKey: string; message: string } | null>(null);
  const [retry, setRetry] = useState(0);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [debit, setDebit] = useState("");
  const [credit, setCredit] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "error" | "success"; message: string } | null>(null);
  const accounts = accountsResult?.requestKey === requestKey ? accountsResult.accounts : null;
  const currentAccountsError = accountsError?.requestKey === `${requestKey}:${retry}` ? accountsError.message : "";
  const accountsLoading = requestKey !== null && accounts === null && !currentAccountsError;

  useEffect(() => {
    if (!requestKey || cycleId === undefined) return;
    const controller = new AbortController();
    const key = `${requestKey}:${retry}`;
    fetchCycleAccounts(accessToken, groupSlug, cycleId, controller.signal)
      .then((loadedAccounts) => {
        if (controller.signal.aborted) return;
        setAccountsResult({ requestKey, accounts: loadedAccounts });
        setAccountsError(null);
        setDebit(String(loadedAccounts.find((account) => account.type === "ASSET" && account.name.toLowerCase() === "cash")?.id ?? ""));
        setCredit(String(loadedAccounts.find((account) => account.type === "INCOME" && account.name.toLowerCase() === "donation income")?.id ?? ""));
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setAccountsError({
          requestKey: key,
          message: cause instanceof Error ? cause.message : "Unable to load cycle accounts.",
        });
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, requestKey, retry]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !accounts) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await postDonation(accessToken, groupSlug, {
        amount: Number(amount).toFixed(2),
        description: description.trim(),
        debit,
        credit,
      });
      setAmount("");
      setDescription("");
      setFeedback({ kind: "success", message: "Donation recorded." });
    } catch (cause) {
      setFeedback({ kind: "error", message: cause instanceof Error ? cause.message : "Unable to record the donation." });
    } finally {
      setSubmitting(false);
    }
  }

  const assetAccounts = accounts?.filter((account) => account.type === "ASSET") ?? [];
  const incomeAccounts = accounts?.filter((account) => account.type === "INCOME") ?? [];

  return (
    <main className="protected-content">
      <h1>Record Donation</h1>
      <p>Record funds received as donation income.</p>
      {cycleLoading && <p className="members-feedback" role="status">Loading active cycle…</p>}
      {cycleError && <p className="members-feedback" role="alert">{cycleError} <button className="text-button" type="button" onClick={() => void refreshCycles()}>Try again</button></p>}
      {!cycleLoading && !cycleError && !activeCycle && <p className="members-feedback" role="status">An active cycle is required to record a donation.</p>}
      {!groupSlug && <p className="members-feedback" role="status">Please sign in through your community’s URL to record a donation.</p>}
      {accountsLoading && <p className="members-feedback" role="status">Loading cycle accounts…</p>}
      {currentAccountsError && <p className="members-feedback" role="alert">{currentAccountsError} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
      {accounts && (
        <form className="donation-form" onSubmit={handleSubmit}>
          <fieldset disabled={submitting} aria-busy={submitting}>
            <div className="field">
              <label htmlFor="donation-amount">Amount</label>
              <input id="donation-amount" name="amount" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="donation-description">Description</label>
              <input id="donation-description" name="description" type="text" maxLength={255} required value={description} onChange={(event) => setDescription(event.target.value)} />
            </div>
            <div className="transaction-account-row">
              <div className="field">
                <label htmlFor="donation-debit">Receive Into</label>
                <select id="donation-debit" name="debit" required value={debit} onChange={(event) => setDebit(event.target.value)}>
                  <option value="">Select an asset account</option>
                  {assetAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="donation-credit">Income Account</label>
                <select id="donation-credit" name="credit" required value={credit} onChange={(event) => setCredit(event.target.value)}>
                  <option value="">Select an income account</option>
                  {incomeAccounts.map((account) => <option key={account.id} value={String(account.id)}>{account.code ? `${account.code} — ${account.name}` : account.name}</option>)}
                </select>
              </div>
            </div>
            {feedback && <p className="members-feedback" role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
            <button className="submit-button" type="submit">{submitting ? "Recording…" : "Record Donation"}</button>
          </fieldset>
        </form>
      )}
    </main>
  );
}