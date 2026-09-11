"use client";

import { useCommunity } from "@/components/community-provider";

export function CommunityIntroduction() {
  const { subdomain } = useCommunity();

  return (
    <>
      <p>
        Sign in to your{" "}
        {subdomain ? (
          <strong className="community-name">{subdomain}</strong>
        ) : (
          "COMSCA"
        )}{" "}
        community.
      </p>
      <p className="subdomain-label">
        Subdomain: <strong>{subdomain ?? "None (main site)"}</strong>
      </p>
    </>
  );
}
