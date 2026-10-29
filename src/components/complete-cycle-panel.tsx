"use client";

import { useEffect, useRef, type RefObject } from "react";

export function CompleteCyclePanel({ saving, error, onClose, onConfirm, returnFocus }: {
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const panel = dialog.current;
    const trigger = returnFocus.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    cancelButton.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [returnFocus]);

  return <dialog ref={dialog} className="cycle-drawer" aria-labelledby="complete-cycle-title" aria-describedby="complete-cycle-description" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="cycle-drawer-header">
      <div><span className="eyebrow">COMPLETE CYCLE</span><h2 id="complete-cycle-title">Has the group completed all payouts?</h2></div>
      <button type="button" className="cycle-close" aria-label="Close confirmation" disabled={saving} onClick={onClose}>×</button>
    </div>
    <p id="complete-cycle-description">Before completing this cycle, make sure all members have received their full payouts and all outstanding balances and transactions have been settled. Confirming will close the cycle.</p>
    {error && <p role="alert">{error}</p>}
    <div className="cycle-drawer-footer">
      <button ref={cancelButton} type="button" className="cycle-cancel" disabled={saving} onClick={onClose}>Cancel</button>
      <button type="button" className="submit-button" disabled={saving} onClick={onConfirm}>{saving ? "Completing…" : "Confirm Complete"}</button>
    </div>
  </dialog>;
}
