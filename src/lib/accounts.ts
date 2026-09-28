export type LedgerAccount = { id: string | number; name: string; type: string; code?: string };

export async function fetchCycleAccounts(accessToken: string, groupSlug: string, cycleId: string | number, signal?: AbortSignal): Promise<LedgerAccount[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/cycles/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true || !Array.isArray(body.accounts)) {
    throw new Error("Unable to load cycle accounts. Please try again.");
  }
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") || String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The current cycle has changed or could not be verified. Please reload the page.");
  }
  return body.accounts.map((account: unknown) => {
    if (!account || typeof account !== "object") throw new Error("Unable to read cycle accounts.");
    const entry = account as Record<string, unknown>;
    if (entry.cycle_id !== undefined && String(entry.cycle_id) !== String(cycleId)) {
      throw new Error("Cycle accounts do not match the current cycle. Please reload the page.");
    }
    const name = entry.name;
    const type = entry.type;
    if ((typeof entry.id !== "string" && typeof entry.id !== "number") || String(entry.id).trim() === "" ||
      typeof name !== "string" || !name.trim() || typeof type !== "string" || !type.trim()) {
      throw new Error("Unable to read cycle accounts.");
    }
    return { id: entry.id, name: name.trim(), type: type.trim().toUpperCase(), ...(typeof entry.code === "string" ? { code: entry.code } : {}) };
  });
}
