"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { DistributionSummary } from "@/components/distribution-summary";
import { canViewBusiness } from "@/lib/auth";
import { fetchPayouts, type Payout } from "@/lib/payouts";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
const formatAmount = (cents: number | undefined) => cents === undefined ? "—" : pesos.format(cents / 100);

function PayoutList({ accessToken, groupSlug, cycleId }: { accessToken: string; groupSlug: string; cycleId: string | number }) {
  const [result, setResult] = useState<Payout[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchPayouts(accessToken, groupSlug, cycleId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load payouts.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, attempt]);

  if (error) return <div className="members-feedback"><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => { setError(""); setResult(null); setAttempt((value) => value + 1); }}>Try again</button></div>;
  if (!result) return <p className="members-feedback" role="status">Loading payouts…</p>;
  return <>
    <p>{result.length} payout{result.length === 1 ? "" : "s"}</p>
    {result.length === 0 ? <p className="members-feedback" role="status">No payouts are available for this cycle.</p> :
      <div className="member-ledger-wrapper">
        <table className="member-ledger trial-balance-table">
          <caption>Payout transactions for the current distributing cycle</caption>
          <thead><tr>
            <th scope="col">Payout ID</th><th scope="col">Member ID</th>
            <th scope="col" className="member-ledger-amount">Amount</th><th scope="col">Transaction ID</th>
            <th scope="col">Debit account ID</th><th scope="col">Credit account ID</th><th scope="col">Created</th>
          </tr></thead>
          <tbody>{result.map((payout) => <tr key={payout.id}>
            <th scope="row">{payout.id}</th><td>{payout.userId}</td>
            <td className="member-ledger-amount">{formatAmount(payout.amountCents)}</td>
            <td>{payout.transactionId}</td><td>{payout.debit}</td><td>{payout.credit}</td>
            <td><time dateTime={payout.createdAt}>{new Date(payout.createdAt).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })} (PHT)</time></td>
          </tr>)}</tbody>
        </table>
      </div>}
  </>;
}

export default function PayoutPage() {
  const [payoutRevision, setPayoutRevision] = useState(0);
  const { user, session } = useAuth();
  const { subdomain, group } = useCommunity();
  const { currentCycle, loading, error, refreshCycles } = useCycles();
  const allowed = canViewBusiness(user);
  const cycle = currentCycle?.status === "distributing" ? currentCycle.cycle : null;
  return <main className="protected-content">
    <h1>Payout</h1>
    {!allowed ? <p role="status">Payout access is restricted to owners, admins, and treasurers with a verified profile.</p>
      : loading ? <p role="status">Loading current cycle…</p>
      : error ? <div><p role="alert">{error}</p><button className="text-button" type="button" onClick={() => void refreshCycles().catch(() => {})}>Try again</button></div>
      : !cycle ? <p role="status">Payouts are available when your community’s cycle is distributing.</p>
      : !session || !subdomain ? <p role="status">Please sign in through your community’s URL to view payouts.</p>
      : <>
        <p>Payouts for {group?.name || subdomain} · {cycle.details?.name || `Cycle ${cycle.id}`}.</p>
        <DistributionSummary onPaid={() => setPayoutRevision((value) => value + 1)} key={`${session.access_token}:${subdomain}:${cycle.id}`} accessToken={session.access_token} groupSlug={subdomain} cycleId={cycle.id} />
        <h2>Payment history</h2>
        <PayoutList key={`${session.access_token}:${subdomain}:${cycle.id}:${payoutRevision}`} accessToken={session.access_token} groupSlug={subdomain} cycleId={cycle.id} />
      </>}
  </main>;
}
