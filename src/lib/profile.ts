export type ProfileUpdate = { first_name: string; family_name: string; address: string };
export type PasswordUpdate = { new_password: string; repeat_new_password: string };

async function putAccount(accessToken: string, groupSlug: string, endpoint: string, payload: ProfileUpdate | PasswordUpdate) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response;
  try {
    response = await fetch(`${base}/users/me${endpoint}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Unable to connect. Please try again.");
  }
  if (response.status === 204) return;
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to save changes. Please try again.");
  }
}

export function updateProfile(accessToken: string, groupSlug: string, profile: ProfileUpdate) {
  return putAccount(accessToken, groupSlug, "", {
    first_name: profile.first_name.trim(),
    family_name: profile.family_name.trim(),
    address: profile.address.trim(),
  });
}

export function updatePassword(accessToken: string, groupSlug: string, password: PasswordUpdate) {
  if (!password.new_password) throw new Error("Enter a new password.");
  if (password.new_password !== password.repeat_new_password) throw new Error("Passwords do not match.");
  return putAccount(accessToken, groupSlug, "/password", {
    new_password: password.new_password,
    repeat_new_password: password.repeat_new_password,
  });
}
