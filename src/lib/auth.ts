export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  expires_in?: number;
};

export async function authRequest(endpoint: string, payload: Record<string, string>) {
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response;
  let body;
  try {
    response = await fetch(`${base}/auth/login/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  if (expiresAt !== undefined && expiresAt <= Date.now() / 1000) {
    throw new Error("Your session has expired. Please sign in again.");
  }
  return { ...session, expires_at: expiresAt };
}
