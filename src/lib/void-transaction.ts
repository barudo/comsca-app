export async function voidTransaction(accessToken: string, groupSlug: string, transactionId: string): Promise<void> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!transactionId.trim()) throw new Error("This document has no transaction ID.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/transactions/${encodeURIComponent(transactionId)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Void status could not be confirmed. Check transaction records before trying again.");
  }
  if (response.status === 204) return;
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Void status could not be confirmed. Check transaction records before trying again.");
  }
}
