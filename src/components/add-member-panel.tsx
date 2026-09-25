"use client";

import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import { createMember, updateMember, type Member } from "@/lib/members";

export function AddMemberPanel({ accessToken, groupSlug, onClose, onCreated, returnFocus, member }: {
  member?: Member;
  accessToken: string;
  groupSlug: string;
  onClose: () => void;
  onCreated: () => void;
  returnFocus: RefObject<HTMLButtonElement | null>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const firstInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const panel = dialog.current;
    const trigger = returnFocus.current;
    const overflow = document.body.style.overflow;
    panel?.showModal();
    firstInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      panel?.close();
      document.body.style.overflow = overflow;
      trigger?.focus();
    };
  }, [returnFocus]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const data = new FormData(event.currentTarget);
    const phone = String(data.get("phone")).trim();
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      const values = {
        first_name: String(data.get("first_name")),
        family_name: String(data.get("family_name")),
        phone: phone ? `+63${phone}` : "",
        address: String(data.get("address")),
      };
      if (member) {
        if (member.id === undefined) throw new Error("This member has no ID and cannot be updated.");
        await updateMember(accessToken, groupSlug, member.id, values);
      } else {
        await createMember(accessToken, groupSlug, values);
      }
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save member. Please try again.");
      pending.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="cycle-drawer" aria-labelledby="add-member-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
      <div className="cycle-drawer-header">
        <div><span className="eyebrow">MEMBERS</span><h2 id="add-member-title">{member ? "Edit Member" : "Add Member"}</h2></div>
        <button type="button" className="cycle-close" aria-label="Close member form" disabled={saving} onClick={onClose}>×</button>
      </div>
      <p>{member ? "Update the member’s details." : "Enter the new member’s details."}</p>
      <form className="cycle-draft-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="member-first-name">First name</label>
          <input ref={firstInput} id="member-first-name" name="first_name" defaultValue={member?.first_name ?? ""} autoComplete="given-name" required maxLength={255} pattern=".*\S.*" />
        </div>
        <div className="field">
          <label htmlFor="member-family-name">Family name</label>
          <input id="member-family-name" name="family_name" defaultValue={member?.family_name ?? ""} autoComplete="family-name" required maxLength={255} pattern=".*\S.*" />
        </div>
        <div className="field">
          <label htmlFor="member-phone">Phone</label>
          <div className="member-phone-input">
            <span id="member-phone-prefix">+63</span>
            <input id="member-phone" name="phone" defaultValue={(member?.phone ?? "").replace(/^(?:\+63|63|0)(?=9[0-9]{9}$)/, "")} type="tel" inputMode="numeric" autoComplete="tel-national" placeholder="9171234567" pattern="9[0-9]{9}" maxLength={10} aria-describedby="member-phone-prefix" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="member-address">Address</label>
          <textarea id="member-address" name="address" defaultValue={member?.address ?? ""} autoComplete="street-address" rows={3} maxLength={4000} />
        </div>
        {error && <p role="alert">{error}</p>}
        <div className="cycle-drawer-footer">
          <button type="button" className="cycle-cancel" disabled={saving} onClick={onClose}>Cancel</button>
          <button type="submit" className="submit-button" disabled={saving}>{saving ? "Saving…" : member ? "Save Changes" : "Submit"}</button>
        </div>
      </form>
    </dialog>
  );
}
