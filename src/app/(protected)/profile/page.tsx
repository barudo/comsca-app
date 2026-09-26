"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { useAuth } from "@/components/auth-provider";

import { useCommunity } from "@/components/community-provider";
import { updateProfile, updatePassword } from "@/lib/profile";

const tabs = ["Profile", "Password"] as const;
type Tab = (typeof tabs)[number];

export default function Profile() {
  const { user, session, refreshUser } = useAuth();
  const { subdomain } = useCommunity();
  const [saving, setSaving] = useState<Tab | null>(null);
  const [messages, setMessages] = useState<Record<Tab, string>>({ Profile: "", Password: "" });
  const [activeTab, setActiveTab] = useState<Tab>("Profile");

  async function handleSave(event: FormEvent<HTMLFormElement>, tab: Tab) {
    event.preventDefault();
    if (saving) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(tab);
    setMessages((current) => ({ ...current, [tab]: "" }));
    try {
      if (tab === "Profile") {
        await updateProfile(session?.access_token ?? "", subdomain ?? "", {
          first_name: String(data.get("first_name") ?? ""),
          family_name: String(data.get("family_name") ?? ""),
          address: String(data.get("address") ?? ""),
        });
        for (const name of ["first_name", "family_name", "address"]) {
          const field = form.elements.namedItem(name);
          if (field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) {
            field.defaultValue = String(data.get(name) ?? "").trim();
          }
        }
        try {
          await refreshUser();
        } catch {
          setMessages((current) => ({ ...current, Profile: "Profile saved. Reload the page to refresh your account details." }));
          return;
        }
      } else {
        await updatePassword(session?.access_token ?? "", subdomain ?? "", {
          new_password: String(data.get("new_password") ?? ""),
          repeat_new_password: String(data.get("repeat_new_password") ?? ""),
        });
        form.reset();
      }
      setMessages((current) => ({ ...current, [tab]: `${tab} updated successfully.` }));
    } catch (error) {
      setMessages((current) => ({ ...current, [tab]: error instanceof Error ? error.message : "Unable to save changes. Please try again." }));
    } finally {
      setSaving(null);
    }
  }

  function handleTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = 1 - index;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = tabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(tabs[next]);
    document.getElementById(`account-tab-${tabs[next].toLowerCase()}`)?.focus();
  }

  return (
    <main className="protected-content">
      <h1>Profile</h1>
      {user ? (
        <section className="account-settings" aria-label="Account settings">
          <div className="account-tabs" role="tablist" aria-label="Account settings">
            {tabs.map((tab, index) => (
              <button
                key={tab}
                type="button"
                role="tab"
                id={`account-tab-${tab.toLowerCase()}`}
                aria-controls={`account-panel-${tab.toLowerCase()}`}
                aria-selected={activeTab === tab}
                tabIndex={activeTab === tab ? 0 : -1}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(event) => handleTabKey(event, index)}
              >
                {tab}
              </button>
            ))}
          </div>
          <div role="tabpanel" id="account-panel-profile" aria-labelledby="account-tab-profile" hidden={activeTab !== "Profile"} tabIndex={0}>
            <form className="account-form" onSubmit={(event) => handleSave(event, "Profile")} aria-busy={saving === "Profile"} onReset={() => setMessages((current) => ({ ...current, Profile: "" }))}>
              <fieldset className="account-fields" disabled={saving !== null}>
              <div className="field">
                <label htmlFor="profile-first-name">First name</label>
                <input id="profile-first-name" name="first_name" autoComplete="given-name" defaultValue={user.first_name ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="profile-family-name">Family name</label>
                <input id="profile-family-name" name="family_name" autoComplete="family-name" defaultValue={user.family_name ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="profile-phone">Phone</label>
                <input id="profile-phone" name="phone" type="tel" autoComplete="tel" value={user.phone ?? ""} readOnly />
              </div>
              <div className="field">
                <label htmlFor="profile-address">Address</label>
                <textarea id="profile-address" name="address" autoComplete="street-address" rows={4} defaultValue={user.address ?? ""} />
              </div>
              <div className="account-actions">
                <button className="account-cancel" type="reset">Cancel</button>
                <button className="submit-button" type="submit">{saving === "Profile" ? "Saving…" : "Submit"}</button>
              </div>
              </fieldset>
              <p className="form-message" role="status">{messages.Profile}</p>
            </form>
          </div>
          <div role="tabpanel" id="account-panel-password" aria-labelledby="account-tab-password" hidden={activeTab !== "Password"} tabIndex={0}>
            <form className="account-form" onSubmit={(event) => handleSave(event, "Password")} aria-busy={saving === "Password"} onReset={() => setMessages((current) => ({ ...current, Password: "" }))}>
              <fieldset className="account-fields" disabled={saving !== null}>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input id="new-password" name="new_password" type="password" autoComplete="new-password" required />
              </div>
              <div className="field">
                <label htmlFor="repeat-new-password">Repeat new password</label>
                <input id="repeat-new-password" name="repeat_new_password" type="password" autoComplete="new-password" required />
              </div>
              <div className="account-actions">
                <button className="account-cancel" type="reset">Cancel</button>
                <button className="submit-button" type="submit">{saving === "Password" ? "Saving…" : "Submit"}</button>
              </div>
              </fieldset>
              <p className="form-message" role="status">{messages.Password}</p>
            </form>
          </div>
        </section>
      ) : <p>Unable to load your profile.</p>}
    </main>
  );
}
