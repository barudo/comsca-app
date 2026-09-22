"use client";

import { useAuth } from "@/components/auth-provider";

export default function Profile() {
  const { user } = useAuth();
  return (
    <main className="protected-content">
      <h1>Profile</h1>
      {user ? (
        <dl>
          <dt>Name</dt>
          <dd>{user.name}</dd>
          <dt>Role</dt>
          <dd>{user.role || "Not assigned"}</dd>
        </dl>
      ) : <p>Unable to load your profile.</p>}
    </main>
  );
}
