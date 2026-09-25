export type Member = {
  id?: string | number;
  name: string;
  email: string | null;
  phone: string | null;
};

async function requestMembers(accessToken: string, groupSlug: string, signal?: AbortSignal) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/groups/users`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true || !Array.isArray(body.users)) {
    throw new Error("Unable to load members. Please try again.");
  }
  return body;
}

function parseMembers(users: unknown[]): Member[] {
  return users.map((user: unknown) => {
    if (!user || typeof user !== "object" ||
      !("first_name" in user) || typeof user.first_name !== "string" ||
      !("family_name" in user) || (user.family_name !== null && typeof user.family_name !== "string")) {
      throw new Error("Unable to load members. Please try again.");
    }
    return {
      id: "id" in user && (typeof user.id === "string" || typeof user.id === "number") ? user.id : undefined,
      name: [user.first_name.trim(), user.family_name?.trim()].filter(Boolean).join(" "),
      email: "email" in user && typeof user.email === "string" ? user.email : null,
      phone: "phone" in user && typeof user.phone === "string" ? user.phone : null,
    };
  });
}

export async function fetchMembers(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<Member[]> {
  const body = await requestMembers(accessToken, groupSlug, signal);
  return parseMembers(body.users);
}

export async function fetchActiveCycleMembers(accessToken: string, groupSlug: string, cycleId: string | number, signal?: AbortSignal): Promise<Member[]> {
  const body = await requestMembers(accessToken, groupSlug, signal);
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") ||
    String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The current cycle has changed or could not be verified. Please try again.");
  }
  // Missing membership flags must not silently include all community members.
  const users = body.users as unknown[];
  if (users.some((user) => !user || typeof user !== "object" ||
    !("is_current_cycle_member" in user) || typeof user.is_current_cycle_member !== "boolean")) {
    throw new Error("Unable to verify active-cycle membership. Please try again.");
  }
  return parseMembers(users.filter((user) => (user as { is_current_cycle_member: boolean }).is_current_cycle_member));
}
