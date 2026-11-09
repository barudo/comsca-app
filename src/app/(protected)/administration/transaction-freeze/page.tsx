"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { useCycles } from "@/components/cycle-provider";
import { freezeCycleTransactions, unfreezeCycleTransactions } from "@/lib/cycles";
import { canUnfreezeCycle } from "@/lib/cycle-state";
import { canManageCycles } from "@/lib/auth";

type FreezeAction = "freeze" | "unfreeze";

function ConfirmationDialog({ action, pending, onCancel, onConfirm }: {
  action: FreezeAction;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const freeze = action === "freeze";
  useEffect(() => {
    const panel = dialog.current;
    panel?.showModal();
    return () => panel?.close();
  }, []);

  return (
    <dialog
      ref={dialog}
      className="cycle-drawer transaction-freeze-dialog"
      aria-labelledby="transaction-freeze-confirm-title"
      aria-describedby="transaction-freeze-confirm-message"
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
    >
      <div className="cycle-drawer-header">
        <h2 id="transaction-freeze-confirm-title">{freeze ? "Freeze Transactions?" : "Unfreeze Transactions?"}</h2>
      </div>
      <p id="transaction-freeze-confirm-message">
        {freeze
          ? "Are you sure you want to freeze transactions for this cycle? Once frozen, users will no longer be able to create, modify, or void financial transactions. Existing transactions and financial reports will remain accessible."
          : "Are you sure you want to unfreeze transactions for this cycle? Once unfrozen, authorized officers will be able to record financial transactions. Only unfreeze transactions when the group is ready to conduct financial operations."}
      </p>
      <div className="cycle-drawer-footer">
        <button type="button" className="cycle-cancel" disabled={pending} onClick={onCancel}>Cancel</button>
        <button type="button" className="submit-button" disabled={pending} onClick={onConfirm}>
          {pending ? "Saving…" : freeze ? "Freeze Transactions" : "Unfreeze Transactions"}
        </button>
      </div>
    </dialog>
  );
}

export default function TransactionFreezePage() {
  const { user, session } = useAuth();
  const { subdomain } = useCommunity();
  const { currentCycle, loading, error, refreshCycles } = useCycles();
  const [action, setAction] = useState<FreezeAction | null>(null);
  const [pending, setPending] = useState(false);
  const submissionInFlight = useRef(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [refreshError, setRefreshError] = useState("");
  const cycle = currentCycle?.cycle ?? null;
  const frozen = cycle?.transactions_frozen === true;
  const canUnfreeze = canUnfreezeCycle(cycle);

  async function confirmAction() {
    if (!action || !cycle || !session?.access_token || !subdomain || submissionInFlight.current) return;
    submissionInFlight.current = true;
    setPending(true);
    setFeedback(null);
    setRefreshError("");
    try {
      if (action === "freeze") await freezeCycleTransactions(session.access_token, subdomain, cycle.id);
      else await unfreezeCycleTransactions(session.access_token, subdomain, cycle.id);
      setAction(null);
      setFeedback({
        kind: "success",
        message: action === "freeze" ? "Transactions have been frozen successfully." : "Transactions are now open.",
      });
      try {
        await refreshCycles();
      } catch (cause) {
        setRefreshError(cause instanceof Error ? cause.message : "The updated transaction status could not be loaded.");
      }
    } catch (cause) {
      setFeedback({ kind: "error", message: cause instanceof Error ? cause.message : "Unable to update transaction status." });
    } finally {
      submissionInFlight.current = false;
      setPending(false);
    }
  }

  if (!canManageCycles(user)) {
    return (
      <main className="protected-content">
        <h1>Transaction Freeze Management</h1>
        <p role="status">Transaction freeze management is restricted to owners and system administrators with a verified profile.</p>
      </main>
    );
  }

  return (
    <main className="protected-content">
      <h1>Transaction Freeze Management</h1>
      <p>Manage whether financial transactions can be recorded for the current cycle.</p>
      {loading && <p role="status">Loading current cycle…</p>}
      {error && <p role="alert">{error} <button type="button" className="text-button" onClick={() => void refreshCycles().catch(() => {})}>Try again</button></p>}
      {!loading && !error && !cycle && <>
        <p role="status">There is no current cycle to manage. Freeze and unfreeze actions are unavailable.</p>
        <button type="button" className="submit-button transaction-freeze-action" disabled>Freeze Transactions</button>
      </>}
      {cycle && (
        <section className="transaction-freeze-card" aria-labelledby="transaction-freeze-cycle">
          <h2 id="transaction-freeze-cycle">Current Cycle: {cycle.details?.name || `Cycle ${cycle.id}`}</h2>
          <div className={frozen ? "transaction-freeze-status is-frozen" : "transaction-freeze-status is-open"} role="status">
            <span className="transaction-freeze-icon" aria-hidden="true">
              {frozen
                ? <svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                : <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" fill="currentColor" /></svg>}
            </span>
            <div>
              <strong>{frozen ? "Transactions Frozen" : "Transactions Open"}</strong>
              <p>{frozen ? "Financial transactions are currently disabled for this cycle." : "Financial transactions are currently allowed for this cycle."}</p>
            </div>
          </div>
          <button
            type="button"
            className="submit-button transaction-freeze-action"
            disabled={pending || loading || (frozen && !canUnfreeze)}
            title={frozen && !canUnfreeze ? "Transactions cannot be unfrozen while this cycle is distributing or closed." : undefined}
            onClick={() => { setFeedback(null); setAction(frozen ? "unfreeze" : "freeze"); }}
          >
            {frozen ? "Unfreeze Transactions" : "Freeze Transactions"}
          </button>
          {frozen && !canUnfreeze && <p className="members-feedback">Transactions cannot be unfrozen while this cycle is distributing or closed.</p>}
        </section>
      )}
      {feedback && <p className="members-feedback" role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
      {refreshError && <p className="members-feedback" role="alert">The status update succeeded, but the latest cycle status could not be loaded: {refreshError}</p>}
      {action && cycle && <ConfirmationDialog action={action} pending={pending} onCancel={() => { if (!pending) setAction(null); }} onConfirm={() => void confirmAction()} />}
    </main>
  );
}
