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

export type CycleMember = Member & {
  totalShares: string;
  remainingLoan: string;
  unpaidPenalties: string;
  unpaidContributions: string;
};

export type NewMember = { first_name: string; family_name: string; phone: string; address: string };

export async function addMembersToCurrentCycle(accessToken: string, groupSlug: string, users: Array<string | number>) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!users.length) throw new Error("Select at least one member.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/cycles/members`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
    body: JSON.stringify({ users }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to add members to the current cycle. Please try again.");
  }
}

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

export async function fetchCycleMembers(accessToken: string, groupSlug: string, cycleId: string | number, signal?: AbortSignal): Promise<CycleMember[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/cycle/members`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true || !Array.isArray(body.members)) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to load current cycle members. Please try again.");
  }
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") || String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The current cycle has changed or could not be verified. Please try again.");
  }

  return body.members.map((member: unknown): CycleMember => {
    if (!member || typeof member !== "object" || !("id" in member) ||
      (typeof member.id !== "string" && typeof member.id !== "number")) {
      throw new Error("Unable to load current cycle members. Please try again.");
    }
    const parsed = parseMembers([member])[0];
    const fields = member as Record<string, unknown>;
    const amount = (value: unknown) => {
      if ((typeof value !== "string" && typeof value !== "number") || String(value).trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0) {
        throw new Error("Unable to load current cycle members. Please try again.");
      }
      return String(value);
    };
    return {
      ...parsed,
      totalShares: amount(fields.total_shares),
      remainingLoan: amount(fields.remaining_loan),
      unpaidPenalties: amount(fields.unpaid_penalties),
      unpaidContributions: amount(fields.unpaid_contributions),
    };
  });
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

export type MembersSnapshot = { members: Member[]; currentCycleId: string | number | null };

export async function fetchMembersSnapshot(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<MembersSnapshot> {
  const body = await requestMembers(accessToken, groupSlug, signal);
  return {
    members: parseMembers(body.users),
    currentCycleId: typeof body.current_cycle_id === "string" || typeof body.current_cycle_id === "number" ? body.current_cycle_id : null,
  };
}

export async function fetchMembers(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<Member[]> {
  return (await fetchMembersSnapshot(accessToken, groupSlug, signal)).members;
}

export function getActiveCycleMembers(snapshot: MembersSnapshot, cycleId: string | number): Member[] {
  if (snapshot.currentCycleId === null || String(snapshot.currentCycleId) !== String(cycleId)) {
    throw new Error("The current cycle has changed or could not be verified. Please try again.");
  }
  if (snapshot.members.some((member) => typeof member.isCurrentCycleMember !== "boolean")) {
    throw new Error("Unable to verify active-cycle membership. Please try again.");
  }
  return snapshot.members.filter((member) => member.isCurrentCycleMember === true);
}

export async function fetchActiveCycleMembers(accessToken: string, groupSlug: string, cycleId: string | number, signal?: AbortSignal): Promise<Member[]> {
  return getActiveCycleMembers(await fetchMembersSnapshot(accessToken, groupSlug, signal), cycleId);
}
