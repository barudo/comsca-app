"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchLoanApplication, submitLoanApplication, type LoanApplication } from "@/lib/loan-applications";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export default function ApplyLoanPage() {
  const { session } = useAuth();
  const { subdomain } = useCommunity();
  const accessToken = session?.access_token;
  const [retry, setRetry] = useState(0);
  const requestKey = accessToken && subdomain ? `${accessToken}:${subdomain}:${retry}` : null;
  const [result, setResult] = useState<{ key: string; application: LoanApplication | null } | null>(null);
  const [failure, setFailure] = useState<{ key: string; message: string } | null>(null);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionPending = useRef(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const loaded = result !== null && result.key === requestKey;
  const application = loaded ? result.application : null;
  const error = failure?.key === requestKey ? failure.message : "";
  const loading = requestKey !== null && !loaded && !error;

  useEffect(() => {
    if (!accessToken || !subdomain || !requestKey) return;
    const controller = new AbortController();
    fetchLoanApplication(accessToken, subdomain, controller.signal)
      .then((application) => {
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, application });
          setFailure(null);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setFailure({ key: requestKey, message: cause instanceof Error ? cause.message : "Unable to load your loan application." });
      });
    return () => controller.abort();
  }, [accessToken, subdomain, requestKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submissionPending.current || !accessToken || !subdomain || !loaded) return;
    submissionPending.current = true;
    setSubmitting(true);
    setFeedback(null);
    try {
      await submitLoanApplication(accessToken, subdomain, amount);
      setAmount("");
      setFeedback({ kind: "success", message: "Loan application submitted." });
      setRetry((value) => value + 1);
    } catch (cause: unknown) {
      setFeedback({ kind: "error", message: cause instanceof Error ? cause.message : "Unable to submit your loan application." });
    } finally {
      submissionPending.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="protected-content">
      <h1>Apply Loan</h1>
      <p>View your loan application and enter your desired loan amount.</p>
      <section className="loan-application-card" aria-labelledby="loan-application-heading" aria-busy={loading}>
        <div className="loan-application-header">
          <h2 id="loan-application-heading">Your loan application</h2>
          {application && <span className="loan-application-status">{application.status}</span>}
        </div>
        {loading && <p role="status">Loading your loan application…</p>}
        {!requestKey && <p role="status">Please sign in through your community’s URL to view your loan application.</p>}
        {error && <p role="alert">{error} <button className="text-button" type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></p>}
        {loaded && !application && <p>You have no loan application yet.</p>}
        {application && (
          <dl className="loan-application-details">
            <div><dt>Amount desired</dt><dd>{pesos.format(Number(application.amount_desired))}</dd></div>
            <div><dt>Amount disbursed</dt><dd>{pesos.format(Number(application.amount_disbursed))}</dd></div>
            <div><dt>Application ID</dt><dd>{application.id}</dd></div>
          </dl>
        )}
      </section>
      <form className="loan-application-form" onSubmit={handleSubmit}>
        <h2>Desired loan amount</h2>
        <fieldset disabled={submitting || !loaded} aria-busy={submitting}>
        <div className="field">
          <label htmlFor="amount-desired">Amount desired (PHP)</label>
          <input id="amount-desired" name="amount_desired" type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <button className="submit-button" type="submit">{submitting ? "Submitting…" : "Apply for loan"}</button>
        </fieldset>
        {feedback && <p className="members-feedback" role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
        <button className="text-button" type="button" disabled={submitting || loading || !requestKey} onClick={() => setRetry((value) => value + 1)}>Refresh application</button>
      </form>
    </main>
  );
}
