"use client";

import { useCommunity } from "@/components/community-provider";

export function CommunityIntroduction() {
  const { group } = useCommunity();

  return (
    <>
      <p>
        Sign in to your{" "}
        {group ? (
          <strong className="community-name">{group.name}</strong>
        ) : (
          "COMSCA"
        )}{" "}
        community.
      </p>

    </>
  );
}
