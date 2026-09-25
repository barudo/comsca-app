"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { DraftCyclePanel } from "@/components/draft-cycle-panel";
import { canManageCycles } from "@/lib/auth";
import { getCurrentCycle, interestTypes, type DisplayCycle, type DraftDetails } from "@/lib/cycle-state";

const states = {
  none: { title: "No cycle", description: "Start a new savings cycle by setting up a draft for your community.", action: "Add a Draft Cycle" },
  draft: { title: "Draft cycle", description: "Your draft is ready. Activate it when your community is ready to start saving.", action: "Activate This Cycle" },
  active: { title: "Active cycle", description: "Your community is in its savings phase. When ready, move this cycle to distribution.", action: "Change to Distributing" },
  distributing: { title: "Currently distributing", description: "This cycle is in its distribution phase. A new draft can be added once distribution is complete.", action: null },
};

function CyclesWorkspace() {
  // Temporary empty mock so the draft form can be previewed without cycle API data.
  const [cycles, setCycles] = useState<DisplayCycle[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const actionButton = useRef<HTMLButtonElement>(null);
  const statusHeading = useRef<HTMLHeadingElement>(null);

  const current = getCurrentCycle(cycles);
  const state = current?.status ?? "none";
  const content = states[state];
  const details = current?.cycle.details;

  function handleAction() {
    if (!current) {
      setShowForm(true);
      return;
    }
    if (current.status === "distributing") return;
    const nextStatus = current.status === "draft" ? "ACTIVE" : "DISTRIBUTING";
    // Temporary UI state only; connect to the updated backend when available.
    setCycles((items) => items.map((cycle) => cycle.id === current.cycle.id ? { ...cycle, status: nextStatus } : cycle));
    setNotice(nextStatus === "ACTIVE" ? "Cycle activated for this preview." : "Cycle changed to distributing for this preview.");
    statusHeading.current?.focus();
  }

  function addDraft(details: DraftDetails) {
    setCycles((items) => [...items, { id: `preview-${crypto.randomUUID()}`, status: "DRAFT", details }]);
    setNotice("Draft cycle added for this preview.");
    setShowForm(false);
  }

  return (
    <>
      <p className="cycle-preview-note">Preview: changes on this page are temporary and reset when you leave or refresh.</p>
      <p role="status" className="cycle-notice">{notice}</p>
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
              <div><dt>Monthly Interest Rate</dt><dd>{details.interestRate}%</dd></div>
              <div><dt>Interest type</dt><dd>{interestTypes[details.interestType].label}</dd></div>
              <div><dt>Starting subscription</dt><dd>{Number(details.startingSubscription).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
              <div><dt>Maximum monthly buyable shares</dt><dd>{details.maximumMonthlyShares}</dd></div>
              <div><dt>Cost per share</dt><dd>{Number(details.costPerShare).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
              <div><dt>Absence penalty</dt><dd>{Number(details.absencePenalty).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
              <div><dt>Required monthly contribution</dt><dd>{Number(details.requiredMonthlyContribution).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd></div>
            </dl>
          </>
        )}
        {content.action && <button ref={actionButton} type="button" className="submit-button cycle-primary-action" onClick={handleAction}>{content.action}</button>}
      </section>
      {cycles.length > 0 && (
        <div className="members-table-wrapper" role="region" aria-label="Community cycles" tabIndex={0}>
          <table className="members-table">
            <caption>All cycles</caption>
            <thead><tr><th scope="col">Cycle</th><th scope="col">Status</th></tr></thead>
            <tbody>{cycles.map((cycle) => <tr key={cycle.id}><th scope="row">{cycle.details?.name ?? `Cycle ${cycle.id}`}</th><td className="cycle-table-status">{cycle.status.toLowerCase()}</td></tr>)}</tbody>
          </table>
        </div>
      )}
      {showForm && <DraftCyclePanel onClose={() => setShowForm(false)} onCreate={addDraft} returnFocus={actionButton} />}
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
        <CyclesWorkspace key={`${subdomain}:${session.access_token}`} />
      ) : <p className="members-feedback" role="status">Please sign in through your community’s URL to view cycles.</p>}
    </main>
  );
}
