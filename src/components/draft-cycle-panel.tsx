"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { interestTypes, type DraftDetails, type InterestType } from "@/lib/cycle-state";

export function DraftCyclePanel({ onClose, onCreate, returnFocus }: {
  onClose: () => void;
  onCreate: (details: DraftDetails) => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const [interestType, setInterestType] = useState<InterestType>("compounded");
  const [defaultName] = useState(() => {
    const currentYear = new Date().getFullYear();
    return `${currentYear} to ${currentYear + 1}`;
  });

  useEffect(() => {
    const panel = dialog.current;
    const trigger = returnFocus.current;
    const previousOverflow = document.body.style.overflow;
    panel?.showModal();
    nameInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [returnFocus]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onCreate({
      name: String(data.get("name")).trim(),
      description: String(data.get("description")).trim(),
      interestRate: String(data.get("interest_rate")),
      interestType,
      startingSubscription: String(data.get("starting_subscription")),
      maximumMonthlyShares: Number(data.get("maximum_monthly_shares")),
      costPerShare: String(data.get("cost_per_share")),
    });
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="draft-cycle-title" aria-describedby="draft-cycle-description" onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => {
      if (event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">CYCLE SETUP</span><h2 id="draft-cycle-title">Add a Draft Cycle</h2></div>
        <button type="button" className="cycle-close" aria-label="Close draft cycle form" onClick={onClose}>×</button>
      </div>
      <p id="draft-cycle-description">Set the savings terms for your community. Your cycle will start as a draft.</p>
      <form className="cycle-draft-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="cycle-name">Name</label>
          <input ref={nameInput} id="cycle-name" name="name" defaultValue={defaultName} required maxLength={120} pattern=".*\S.*" />
        </div>
        <div className="field">
          <label htmlFor="cycle-description">Description <span className="cycle-optional">(optional)</span></label>
          <textarea id="cycle-description" name="description" rows={3} maxLength={2000} placeholder="What is this cycle for?" />
        </div>
        <div className="cycle-form-row">
          <div className="field">
            <label htmlFor="cycle-interest-rate">Monthly Interest Rate (%)</label>
            <input id="cycle-interest-rate" name="interest_rate" type="number" min="0" step="0.000001" defaultValue="3" aria-describedby="cycle-interest-description" required />
          </div>
          <div className="field">
            <label htmlFor="cycle-interest-type">Interest Type</label>
            <select id="cycle-interest-type" name="interest_type" value={interestType} onChange={(event) => setInterestType(event.target.value as InterestType)} aria-describedby="cycle-interest-description">
              {Object.entries(interestTypes).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
        </div>
        <p id="cycle-interest-description" className="cycle-field-hint cycle-interest-description" aria-live="polite">{interestTypes[interestType].description}</p>
        <div className="field">
          <label htmlFor="cycle-starting-subscription">Starting Subscription</label>
          <input id="cycle-starting-subscription" name="starting_subscription" type="number" min="0" step="0.01" placeholder="0.00" aria-describedby="subscription-hint" required />
          <p id="subscription-hint" className="cycle-field-hint">Money amount at the start of the cycle.</p>
        </div>
        <div className="field">
          <label htmlFor="cycle-maximum-shares">Maximum monthly buyable shares</label>
          <input id="cycle-maximum-shares" name="maximum_monthly_shares" type="number" min="1" max={Number.MAX_SAFE_INTEGER} step="1" defaultValue="10" required />
        </div>
        <div className="field">
          <label htmlFor="cycle-cost-per-share">Cost per share</label>
          <input id="cycle-cost-per-share" name="cost_per_share" type="number" min="0.01" step="0.01" defaultValue="100.00" required />
        </div>
        <div className="cycle-drawer-footer">
          <button className="cycle-cancel" type="button" onClick={onClose}>Cancel</button>
          <button className="submit-button" type="submit">Add Draft Cycle</button>
        </div>
      </form>
    </dialog>
  );
}
