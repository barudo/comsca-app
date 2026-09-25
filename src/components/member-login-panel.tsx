"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { enableMemberLogin, type Member } from "@/lib/members";

export function MemberLoginPanel({ member, trigger, accessToken, groupSlug, onClose, onSaved }: {
  member: Member; trigger: HTMLButtonElement; accessToken: string; groupSlug: string;
  onClose: () => void; onSaved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const pending = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const panel = dialog.current;
    const overflow = document.body.style.overflow;
    panel?.showModal();
    passwordInput.current?.focus();
    document.body.style.overflow = "hidden";
    return () => { panel?.close(); document.body.style.overflow = overflow; trigger.focus(); };
  }, [trigger]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || member.id === undefined) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try {
      await enableMemberLogin(accessToken, groupSlug, member.id, String(new FormData(event.currentTarget).get("password")));
      onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to enable login. Please try again.");
      pending.current = false;
      setSaving(false);
    }
  }

  return <dialog ref={dialog} className="cycle-drawer" aria-labelledby="member-login-title" onCancel={(event) => { event.preventDefault(); if (!saving) onClose(); }}>
    <div className="cycle-drawer-header">
      <div><span className="eyebrow">{member.name}</span><h2 id="member-login-title">Enable Login</h2></div>
      <button type="button" className="cycle-close" aria-label="Close enable login form" disabled={saving} onClick={onClose}>×</button>
    </div>
    <p>Set an initial password for {member.phone}. Confirm this phone belongs to the member before enabling login.</p>
    <form className="cycle-draft-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="member-login-password">Initial password</label>
        <input ref={passwordInput} id="member-login-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="cycle-drawer-footer">
        <button type="button" className="cycle-cancel" disabled={saving} onClick={onClose}>Cancel</button>
        <button type="submit" className="submit-button" disabled={saving}>{saving ? "Enabling…" : "Enable Login"}</button>
      </div>
    </form>
  </dialog>;
}
