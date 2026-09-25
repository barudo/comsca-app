"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { DraftCyclePanel } from "@/components/draft-cycle-panel";
import { canManageCycles } from "@/lib/auth";
import { activateCycle, createDraftCycle, fetchCycles, saveDraftCycle } from "@/lib/cycles";
import { getCurrentCycle, interestTypes, type DisplayCycle, type DraftDetails } from "@/lib/cycle-state";

const states = {
  none: { title: "No cycle", description: "Start a new savings cycle by setting up a draft for your community.", action: "Add a Draft Cycle" },
  draft: { title: "Draft cycle", description: "Your draft is ready. Activate it when your community is ready to start saving.", action: "Make Active" },
  active: { title: "Active cycle", description: "Your community is in its savings phase. When ready, move this cycle to distribution.", action: "Change to Distributing" },
  distributing: { title: "Currently distributing", description: "This cycle is in its distribution phase. A new draft can be added once distribution is complete.", action: null },
};

function CyclesWorkspace({ accessToken, groupSlug }: { accessToken: string; groupSlug: string }) {
  const [cycles, setCycles] = useState<DisplayCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [requestVersion, setRequestVersion] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const mutationPending = useRef(false);
  const [notice, setNotice] = useState("");
  const actionButton = useRef<HTMLButtonElement>(null);
  const editButton = useRef<HTMLButtonElement>(null);
  const statusHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchCycles(accessToken, groupSlug, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setCycles(items);
          setLoading(false);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : "Unable to load the current cycle. Please try again.");
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, requestVersion]);

  const current = getCurrentCycle(cycles);
  const state = current?.status ?? "none";
  const content = states[state];
  const details = current?.cycle.details;

  async function persistDraft(details?: DraftDetails) {
    if (!current || current.status !== "draft" || mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    setSaveError("");
    setNotice("");
    try {
      if (details) await saveDraftCycle(accessToken, groupSlug, current.cycle.id, details);
      else await activateCycle(accessToken, groupSlug, current.cycle.id);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Unable to update the cycle. Please try again.");
      setSaving(false);
      mutationPending.current = false;
      return;
    }
    setShowForm(false);
    setNotice(details ? "Draft changes saved." : "Cycle is now active.");
    try {
      setCycles(await fetchCycles(accessToken, groupSlug));
    } catch {
      setError("The cycle was updated, but could not be reloaded. Try again to load its latest details.");
    } finally {
      setSaving(false);
      mutationPending.current = false;
    }
    statusHeading.current?.focus();
  }

  function handleAction() {
    if (!current) {
      setShowForm(true);
      return;
    }
    if (current.status === "draft") {
      void persistDraft();
      return;
    }
    if (current.status === "distributing") return;
    const nextStatus = "DISTRIBUTING";
    // Temporary UI state only; connect to the updated backend when available.
    setCycles((items) => items.map((cycle) => cycle.id === current.cycle.id ? { ...cycle, status: nextStatus } : cycle));
    setNotice("Cycle changed to distributing for this preview.");
    statusHeading.current?.focus();
  }

  async function addDraft(details: DraftDetails) {
    if (current || mutationPending.current) return;
    mutationPending.current = true;
    setSaving(true);
    setSaveError("");
    try {
      await createDraftCycle(accessToken, groupSlug, details);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : "Unable to create the draft. Please try again.");
      setSaving(false);
      mutationPending.current = false;
      return;
    }
    setShowForm(false);
    setNotice("Draft cycle created.");
    try {
      setCycles(await fetchCycles(accessToken, groupSlug));
    } catch {
      setError("The draft was created, but could not be reloaded. Try again to load its latest details.");
    } finally {
      setSaving(false);
      mutationPending.current = false;
    }
  }

  if (loading) return <p role="status" className="members-feedback">Loading current cycle…</p>;
  if (error) return (
    <div className="members-feedback">
      <p role="alert">{error}</p>
      <button type="button" className="submit-button" onClick={() => {
        setError("");
        setLoading(true);
        setRequestVersion((version) => version + 1);
      }}>Try again</button>
    </div>
  );

  return (
    <>
      <p className="cycle-preview-note">Changing a cycle to distributing is still a preview.</p>
      <p role="status" className="cycle-notice">{notice}</p>
      {!showForm && saveError && <p role="alert" className="members-feedback">{saveError}</p>}
      <section className={`cycle-status-card cycle-status-${state}`} aria-labelledby="cycle-status-title">
        <div className="cycle-status-topline">
          <span className="eyebrow">CURRENT CYCLE</span>
          <span className="cycle-status-badge"><span aria-hidden="true" />{content.title}</span>
        </div>
        <h2 id="cycle-status-title" ref={statusHeading} tabIndex={-1}>{content.title}</h2>
        {current && <p className="cycle-name">{details?.name ?? `Cycle ${current.cycle.id}`}</p>}
        <p className="cycle-status-description">{content.description}</p>
        {details && (
          <>
            {details.description && <p className="cycle-description">{details.description}</p>}
            <dl className="cycle-details">
              {details.interestRate !== undefined && <div><dt>Monthly Interest Rate</dt><dd>{details.interestRate}%</dd></div>}
              {details.interestType !== undefined && <div><dt>Interest type</dt><dd>{interestTypes[details.interestType].label}</dd></div>}
              {details.startingSubscription !== undefined && <div><dt>Starting subscription</dt><dd>{Number(details.startingSubscription).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>}
              {details.maximumMonthlyShares !== undefined && <div><dt>Maximum monthly buyable shares</dt><dd>{details.maximumMonthlyShares}</dd></div>}
              {details.costPerShare !== undefined && <div><dt>Cost per share</dt><dd>{Number(details.costPerShare).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>}
              {details.absencePenalty !== undefined && <div><dt>Absence penalty</dt><dd>{Number(details.absencePenalty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>}
              {details.requiredMonthlyContribution !== undefined && <div><dt>Required monthly contribution</dt><dd>{Number(details.requiredMonthlyContribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>}
            </dl>
          </>
        )}
        {current?.status === "draft" && <button ref={editButton} type="button" disabled={saving} className="submit-button cycle-primary-action" onClick={() => { setSaveError(""); setShowForm(true); }}>Edit Draft Cycle</button>}
        {content.action && <button ref={actionButton} type="button" disabled={saving} className="submit-button cycle-primary-action" onClick={handleAction}>{saving ? "Updating…" : content.action}</button>}
      </section>
      {showForm && <DraftCyclePanel onClose={() => setShowForm(false)} onCreate={addDraft} onSave={persistDraft} saving={saving} saveError={saveError} initialDetails={current?.status === "draft" ? details ?? {} : undefined} returnFocus={current?.status === "draft" ? editButton : actionButton} />}
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
      <p>Manage savings cycles for {group?.name || subdomain || "your COMSCA community"}.</p>
      {session && subdomain ? (
        <CyclesWorkspace key={`${subdomain}:${session.access_token}`} accessToken={session.access_token} groupSlug={subdomain} />
      ) : <p className="members-feedback" role="status">Please sign in through your community’s URL to view cycles.</p>}
    </main>
  );
}
