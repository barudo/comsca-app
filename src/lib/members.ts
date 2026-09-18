export type Member = {
  id?: string | number;
  name: string;
  email: string | null;
  phone: string | null;
};

export async function fetchMembers(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<Member[]> {
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
  return body.users.map((user: unknown) => {
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
