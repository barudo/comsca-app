"use client";

import { useState, type KeyboardEvent } from "react";
import { useAuth } from "@/components/auth-provider";

const tabs = ["Profile", "Password"] as const;
type Tab = (typeof tabs)[number];

export default function Profile() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("Profile");

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
            <form className="account-form" onSubmit={(event) => event.preventDefault()}>
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
                <input id="profile-address" name="address" autoComplete="street-address" defaultValue={user.address ?? ""} />
              </div>
            </form>
          </div>
          <div role="tabpanel" id="account-panel-password" aria-labelledby="account-tab-password" hidden={activeTab !== "Password"} tabIndex={0}>
            <form className="account-form" onSubmit={(event) => event.preventDefault()}>
              <div className="field">
                <label htmlFor="new-password">New password</label>
                <input id="new-password" name="new_password" type="password" autoComplete="new-password" />
              </div>
              <div className="field">
                <label htmlFor="repeat-new-password">Repeat new password</label>
                <input id="repeat-new-password" name="repeat_new_password" type="password" autoComplete="new-password" />
              </div>
            </form>
          </div>
        </section>
      ) : <p>Unable to load your profile.</p>}
    </main>
  );
}
