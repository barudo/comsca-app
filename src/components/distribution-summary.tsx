"use client";

import { useEffect, useState } from "react";
import { fetchDistributions, distributionAmounts, distributionTotals, type Distributions } from "@/lib/distributions";

import { PayoutDrawer } from "@/components/payout-drawer";

const pesos = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });
export function DistributionSummary({ accessToken, groupSlug, cycleId, onPaid }: { accessToken: string; groupSlug: string; cycleId: string | number; onPaid: () => void }) {
  const [selection, setSelection] = useState<{ member: Distributions["distributions"][number]; trigger: HTMLButtonElement } | null>(null);
  const [result, setResult] = useState<Distributions | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetchDistributions(accessToken, groupSlug, cycleId, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load distributions.");
    });
    return () => controller.abort();
  }, [accessToken, groupSlug, cycleId, attempt]);
  const amountKeys = Object.keys(distributionAmounts) as (keyof typeof distributionAmounts)[];
  return <section aria-labelledby="distribution-heading">
    <h2 id="distribution-heading">Distribution</h2>
    {error ? <div><p role="alert">{error}</p><button type="button" className="text-button" onClick={() => { setError(""); setResult(null); setAttempt((value) => value + 1); }}>Retry distributions</button></div>
      : !result ? <p role="status">Loading distributions…</p> : <>
        <p>{result.memberCount} member{result.memberCount === 1 ? "" : "s"}</p>
        <dl className="cycle-details">{(Object.keys(distributionTotals) as (keyof typeof distributionTotals)[]).map((key) =>
          <div key={key}><dt>{distributionTotals[key]}</dt><dd>{pesos.format(result.totals[key] / 100)}</dd></div>)}</dl>
        {result.warnings.length > 0 && <div role="status"><h3>Distribution warnings</h3><ul>{result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul></div>}
        {result.distributions.length === 0 ? <p role="status">No distributions are available for this cycle.</p> : <div className="distribution-cards" aria-label="Member distributions">
          {result.distributions.map((row) => <article className="distribution-card" key={row.id} aria-labelledby={`distribution-${row.id}`}>
            <header className="distribution-card-header">
              <h3 id={`distribution-${row.id}`}>{row.fullName}</h3>
              <span className="distribution-card-status">{row.status}</span>
            </header>
            <dl className="distribution-card-amounts">
              {amountKeys.map((key) => <div key={key} className={key === "net_amount" || key === "paid_amount" ? "distribution-card-total" : undefined}>
                <dt>{distributionAmounts[key]}</dt>
                <dd>{pesos.format(row.amounts[key] / 100)}</dd>
              </div>)}
            </dl>
            <footer className="distribution-card-footer">
              <button type="button" className="submit-button" disabled={row.amounts.paid_amount >= row.amounts.net_amount} onClick={(event) => setSelection({ member: row, trigger: event.currentTarget })} aria-label={`Payout for ${row.fullName}`}>Payout</button>
            </footer>
          </article>)}
        </div>}
      </>}
    {selection && <PayoutDrawer {...selection} accessToken={accessToken} groupSlug={groupSlug} cycleId={cycleId} onClose={() => setSelection(null)} onPaid={() => { setSelection(null); setResult(null); setError(""); setAttempt((value) => value + 1); onPaid(); }} />}
  </section>;
}
