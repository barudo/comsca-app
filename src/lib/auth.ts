export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
};

export type User = { name: string; role: string | null };

/** UI access check; the API must independently enforce the same roles. */
export function canViewMembers(user: User | null): boolean {
  return user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "TREASURER";
}

export function canViewBusiness(user: User | null): boolean {
  return user?.role === "OWNER" || user?.role === "ADMIN" || user?.role === "TREASURER";
}

export function canManageCycles(user: User | null): boolean {
  return user?.role === "OWNER" || user?.role === "ADMIN";
}

export async function fetchCurrentUser(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<User> {
  if (!groupSlug.trim()) throw new Error("Please open your community’s URL to sign in.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/users/me`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  const profile = body?.user;
  const name = typeof profile?.name === "string" && profile.name.trim()
    ? profile.name.trim()
    : [profile?.first_name, profile?.family_name]
      .filter((part): part is string => typeof part === "string")
      .map((part) => part.trim()).filter(Boolean).join(" ");
  if (!response.ok || body?.success !== true || !name) {
    throw new Error("Unable to load your profile.");
  }
  return {
    name,
    role: typeof profile.role === "string" ? profile.role.trim().toUpperCase() : null,
  };
}

export async function authRequest(endpoint: string, payload: Record<string, string>, groupSlug: string) {
  if (!groupSlug.trim()) throw new Error("Please open your community’s URL to sign in.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response;
  let body;
  try {
    response = await fetch(`${base}/auth/login/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-group-slug": groupSlug },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    body = await response.json();
  } catch {
    throw new Error("Unable to connect. Please try again.");
  }
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Sign-in failed. Please try again.");
  }
  return body;
}

export function readSession(body: { session?: Session }): Session {
  const session = body.session;
  if (!session || typeof session.access_token !== "string" || !session.access_token ||
    typeof session.refresh_token !== "string" || !session.refresh_token) {
    throw new Error("Invalid sign-in response. Please try again.");
  }
  const expiresAt = typeof session.expires_at === "number" ? session.expires_at :
    typeof session.expires_in === "number" ? Date.now() / 1000 + session.expires_in : undefined;
  if ((session.expires_at !== undefined && (typeof session.expires_at !== "number" || !Number.isFinite(session.expires_at))) ||
    (session.expires_in !== undefined && (typeof session.expires_in !== "number" || !Number.isFinite(session.expires_in)))) {
    throw new Error("Invalid session expiry. Please sign in again.");
  }
  if (expiresAt !== undefined && expiresAt <= Date.now() / 1000) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  return { access_token: session.access_token, refresh_token: session.refresh_token, expires_at: expiresAt };
}

export function sessionStorageKey(groupSlug: string): string {
  return `comsca:session:${groupSlug}`;
}

export function restoreSession(storage: Pick<Storage, "getItem" | "removeItem">, groupSlug: string): Session | null {
  if (!groupSlug) return null;
  const key = sessionStorageKey(groupSlug);
  try {
    const value = storage.getItem(key);
    if (!value) return null;
    const stored = JSON.parse(value);
    // Relative expiry must never be restarted when restoring a session.
    if (stored?.expires_in !== undefined && stored?.expires_at === undefined) throw new Error("Missing absolute expiry");
    return readSession({ session: stored });
  } catch {
    try { storage.removeItem(key); } catch { /* Storage may be unavailable. */ }
    return null;
  }
}
