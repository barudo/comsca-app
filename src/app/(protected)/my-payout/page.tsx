"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { distributionAmounts, fetchMyPayout, type MyPayout } from "@/lib/distributions";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
function PersonalPayout({ accessToken, groupSlug, cycleId }: { accessToken: string; groupSlug: string; cycleId: string | number }) {
  const [result, setResult] = useState<{ payout: MyPayout | null } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchMyPayout(accessToken, groupSlug, cycleId, controller.signal).then((payout) => {
      if (!controller.signal.aborted) setResult({ payout });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load your payout.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, attempt]);
  if (error) return <div><p role="alert">{error}</p><button className="text-button" type="button" onClick={() => { setError(""); setResult(null); setAttempt((value) => value + 1); }}>Try again</button></div>;
  if (!result) return <p role="status">Loading your payout…</p>;
  if (!result.payout) return <p role="status">You do not have a distribution for this cycle yet.</p>;
  const payout = result.payout;
  return <article className="distribution-card" aria-labelledby="my-distribution-title">
    <header className="distribution-card-header"><h2 id="my-distribution-title">{payout.fullName}</h2><span className="distribution-card-status">{payout.status}</span></header>
    <dl className="distribution-card-amounts">
      {(Object.keys(distributionAmounts) as (keyof typeof distributionAmounts)[]).map((key) => <div key={key} className={key === "net_amount" || key === "paid_amount" ? "distribution-card-total" : undefined}><dt>{distributionAmounts[key]}</dt><dd>{pesos.format(payout.amounts[key] / 100)}</dd></div>)}
      <div className="distribution-card-total"><dt>Remaining payout</dt><dd>{pesos.format(payout.remainingCents / 100)}</dd></div>
    </dl>
  </article>;
}

export default function MyPayoutPage() {
  const { session } = useAuth();
  const { subdomain, group } = useCommunity();
  const { currentCycle, loading, error, refreshCycles } = useCycles();
  const cycle = currentCycle?.status === "distributing" ? currentCycle.cycle : null;
  return <main className="protected-content">
    <h1>My Payout</h1>
    {loading ? <p role="status">Loading current cycle…</p>
      : error ? <div><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => void refreshCycles().catch(() => {})}>Try again</button></div>
      : !cycle ? <p role="status">Your payout is available when your community’s cycle is distributing.</p>
      : !session || !subdomain ? <p role="status">Please sign in through your community’s URL to view your payout.</p>
      : <>
        <p>{group?.name || subdomain} · {cycle.details?.name || `Cycle ${cycle.id}`}</p>
        <PersonalPayout key={`${session.access_token}:${subdomain}:${cycle.id}`} accessToken={session.access_token} groupSlug={subdomain} cycleId={cycle.id} />
      </>}
  </main>;
}
