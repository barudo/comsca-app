export type Cycle = { id: string | number; status: string };

export type CreateCycleInput = {
  interest_rate: string;
  interest_period: "MONTHLY";
  interest_method: "COMPOUND";
  cost_per_share: string;
  status: "draft";
};

export function canAddCycle(cycles: Cycle[]): boolean {
  return cycles.every((cycle) => cycle.status.trim().toUpperCase() !== "ACTIVE");
}

async function cycleRequest(accessToken: string, groupSlug: string, options: RequestInit) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/cycles`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "x-group-slug": groupSlug,
      ...(options.method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    cache: "no-store",
    signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to complete the cycle request. Please try again.");
  }
  return body;
}

export async function fetchCycles(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<Cycle[]> {
  const body = await cycleRequest(accessToken, groupSlug, { method: "GET", signal });
  if (!Array.isArray(body.cycles)) throw new Error("Unable to read cycles.");
  return body.cycles.map((cycle: unknown) => {
    if (!cycle || typeof cycle !== "object" || !("id" in cycle) ||
      (typeof cycle.id !== "string" && typeof cycle.id !== "number") ||
      !("status" in cycle) || typeof cycle.status !== "string" || !cycle.status.trim()) {
      throw new Error("Unable to read cycles.");
    }
    return { id: cycle.id, status: cycle.status };
  });
}

export async function createCycle(accessToken: string, groupSlug: string, payload: CreateCycleInput) {
  if (!/^\d+(\.\d{1,6})?$/.test(payload.interest_rate) ||
    !/^\d+(\.\d{1,2})?$/.test(payload.cost_per_share) || Number(payload.cost_per_share) <= 0 ||
    payload.interest_period !== "MONTHLY" || payload.interest_method !== "COMPOUND" || payload.status !== "draft") {
    throw new Error("Enter a valid interest rate and a positive cost per share.");
  }
  const cycles = await fetchCycles(accessToken, groupSlug);
  if (!canAddCycle(cycles)) throw new Error("An active cycle already exists. Close it before adding another cycle.");
  return cycleRequest(accessToken, groupSlug, { method: "POST", body: JSON.stringify(payload) });
}
