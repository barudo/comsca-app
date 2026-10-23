export type TransactionEntry = Record<string, unknown>;

export async function fetchTransactionEntries(accessToken: string, groupSlug: string, transactionId: string, signal?: AbortSignal): Promise<TransactionEntry[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!transactionId.trim()) throw new Error("This document has no transaction ID.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/transactions/${encodeURIComponent(transactionId)}/entries`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !Array.isArray(body.data)) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to load transaction entries. Please try again.");
  }
  return body.data.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) throw new Error("Unable to read transaction entries.");
    return entry as TransactionEntry;
  });
}
