export type Member = {
  isCurrentCycleMember?: boolean;
  id?: string | number;
  first_name: string;
  family_name: string;
  address: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type NewMember = { first_name: string; family_name: string; phone: string; address: string };

async function saveMember(accessToken: string, groupSlug: string, member: NewMember, id?: string | number) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/groups/users${id === undefined ? "" : `/${encodeURIComponent(String(id))}`}`, {
    method: id === undefined ? "POST" : "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
    body: JSON.stringify({ firstname: member.first_name.trim(), lastname: member.family_name.trim(), phone: member.phone || null, address: member.address.trim() || null }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to save member. Please try again.");
  }
}

export async function createMember(accessToken: string, groupSlug: string, member: NewMember) {
  return saveMember(accessToken, groupSlug, member);
}

export async function updateMember(accessToken: string, groupSlug: string, id: string | number, member: NewMember) {
  return saveMember(accessToken, groupSlug, member, id);
}

export async function enableMemberLogin(accessToken: string, groupSlug: string, id: string | number, password: string) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const bytes = new TextEncoder().encode(password).length;
  if (password.length < 8 || bytes > 72) throw new Error("Use at least 8 characters and no more than 72 UTF-8 bytes for the password.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/groups/users/${encodeURIComponent(String(id))}/account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) throw new Error(typeof body?.error === "string" ? body.error : "Unable to enable login. Please try again.");
}

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
      ...("is_current_cycle_member" in user && typeof user.is_current_cycle_member === "boolean" ? { isCurrentCycleMember: user.is_current_cycle_member } : {}),
      id: "id" in user && (typeof user.id === "string" || typeof user.id === "number") ? user.id : undefined,
      first_name: user.first_name,
      family_name: user.family_name ?? "",
      address: "address" in user && typeof user.address === "string" ? user.address : "",
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
