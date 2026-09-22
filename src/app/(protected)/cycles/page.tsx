"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { canManageCycles } from "@/lib/auth";
import { canAddCycle, createCycle, fetchCycles, type Cycle } from "@/lib/cycles";

function CyclesTable({ accessToken, groupSlug }: { accessToken: string; groupSlug: string }) {
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || cycles === null || !canAddCycle(cycles)) return;
    const fields = new FormData(event.currentTarget);
    submitting.current = true;
    setSaving(true);
    setNotice("");
    setSaveError("");
    try {
      await createCycle(accessToken, groupSlug, {
        interest_rate: String(fields.get("interest_rate")).trim(),
        interest_period: "MONTHLY",
        interest_method: "COMPOUND",
        cost_per_share: String(fields.get("cost_per_share")).trim(),
        status: "draft",
      });
      setNotice("Draft cycle created.");
      setShowForm(false);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to create the cycle. Please try again.");
    } finally {
      // Reload even after a failed request: the server may have accepted a POST
      // whose response was lost, or another admin may have activated a cycle.
      setCycles(null);
      setAttempt((value) => value + 1);
      setSaving(false);
      submitting.current = false;
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    fetchCycles(accessToken, groupSlug, controller.signal)
      .then((result) => { if (!controller.signal.aborted) setCycles(result); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [accessToken, groupSlug, attempt]);

  if (error) return (
    <div className="members-feedback">
      <p role="alert">Unable to load cycles. Please try again.</p>
      <button className="text-button" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>Try again</button>
    </div>
  );
  if (cycles === null) return <p role="status">Loading cycles…</p>;

  return (
    <>
      {notice && <p role="status">{notice}</p>}
      {saveError && <p role="alert">{saveError}</p>}
      {!canAddCycle(cycles) && <p role="status">An active cycle exists. Close it before adding another cycle.</p>}
      <div className="cycle-actions">
        <button className="submit-button" disabled={!canAddCycle(cycles) || saving || showForm} onClick={() => { setShowForm(true); setNotice(""); setSaveError(""); }}>Add cycle</button>
      </div>
      {showForm && canAddCycle(cycles) && (
        <form className="cycle-form" onSubmit={handleCreate}>
          <h2>New cycle</h2>
          <p>New cycles start as drafts, with monthly compound interest.</p>
          <fieldset disabled={saving}>
            <div className="field">
              <label htmlFor="cycle-interest-rate">Interest rate (%)</label>
              <input id="cycle-interest-rate" name="interest_rate" type="number" min="0" step="0.000001" defaultValue="2.500000" required />
            </div>
            <div className="field">
              <label htmlFor="cycle-cost-per-share">Cost per share</label>
              <input id="cycle-cost-per-share" name="cost_per_share" type="number" min="0.01" step="0.01" defaultValue="100.00" required />
            </div>
            <button className="submit-button" type="submit">{saving ? "Creating…" : "Create draft cycle"}</button>
            <button className="text-button" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </fieldset>
        </form>
      )}
      {cycles.length === 0 ? <p role="status">No cycles found in this community.</p> : (
        <div className="members-table-wrapper" role="region" aria-label="Community cycles" tabIndex={0}>
          <table className="members-table">
            <caption>{cycles.length} {cycles.length === 1 ? "cycle" : "cycles"}</caption>
            <thead><tr><th scope="col">Cycle ID</th><th scope="col">Status</th></tr></thead>
            <tbody>{cycles.map((cycle) => <tr key={cycle.id}><th scope="row">{cycle.id}</th><td>{cycle.status}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function CyclesPage() {
  const { user, session } = useAuth();
  const { subdomain, group } = useCommunity();

  if (!canManageCycles(user)) {
    return (
      <main className="protected-content">
        <h1>Cycles</h1>
        <p role="status">Cycles access is restricted to owners and admins with a verified profile.</p>
      </main>
    );
  }

  return (
    <main className="protected-content">
      <h1>Cycles</h1>
      <p>Cycles for {group?.name || subdomain || "your COMSCA community"}.</p>
      <p>Only one cycle can be active at a time. A new cycle can be added when all existing cycles are inactive.</p>
      {session && subdomain ? (
        <CyclesTable key={`${subdomain}:${session.access_token}`} accessToken={session.access_token} groupSlug={subdomain} />
      ) : <p role="status">Please sign in through your community’s URL to view cycles.</p>}
    </main>
  );
}
