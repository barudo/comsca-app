"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCommunity } from "@/components/community-provider";
import { fetchMembers, type Member } from "@/lib/members";

function MembersTable({ accessToken, groupSlug }: { accessToken: string; groupSlug: string }) {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchMembers(accessToken, groupSlug, controller.signal)
      .then((users) => {
        if (!controller.signal.aborted) setMembers(users);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [accessToken, groupSlug, attempt]);

  if (error) return (
    <div className="members-feedback">
      <p role="alert">Unable to load members. Please try again.</p>
      <button className="text-button" onClick={() => { setError(false); setAttempt((value) => value + 1); }}>
        Try again
      </button>
    </div>
  );
  if (members === null) return <p className="members-feedback" role="status">Loading members…</p>;
  if (members.length === 0) return <p className="members-feedback" role="status">No members found in this community.</p>;

  return (
    <div className="members-table-wrapper" role="region" aria-label="Community members" tabIndex={0}>
      <table className="members-table">
        <caption>{members.length} {members.length === 1 ? "member" : "members"}</caption>
        <thead>
          <tr><th scope="col">#</th><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Phone</th></tr>
        </thead>
        <tbody>
          {members.map((member, index) => (
            <tr key={member.id ?? index}>
              <td>{index + 1}</td><th scope="row">{member.name || "—"}</th><td>{member.email || "—"}</td><td>{member.phone || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MembersPage() {
  const { session } = useAuth();
  const { subdomain, group } = useCommunity();

  return (
    <main className="protected-content">
      <h1>Members</h1>
      <p>Members of {group?.name || subdomain || "your COMSCA community"}.</p>
      {session && subdomain ? (
        <MembersTable key={`${subdomain}:${session.access_token}`} accessToken={session.access_token} groupSlug={subdomain} />
      ) : <p className="members-feedback" role="status">Please sign in through your community’s URL to view members.</p>}
    </main>
  );
}
