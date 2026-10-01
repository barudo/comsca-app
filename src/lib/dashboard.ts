export type DashboardSummary = {
  cash_on_hand: string;
  outstanding_loans: string;
  total_fund_value: string;
  share_capital: string;
  contributions_collected: string;
  contributions_due: string;
  active_members: number;
};

function isAmount(value: unknown): value is string | number {
  return (typeof value === "string" && value.trim() !== "" || typeof value === "number") && Number.isFinite(Number(value));
}

export async function fetchDashboard(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<DashboardSummary> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/dashboard`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Unable to load dashboard data. Please try again.");
  }

  const data = body as Record<string, unknown>;
  const amountFields = [
    "cash_on_hand",
    "outstanding_loans",
    "total_fund_value",
    "share_capital",
    "contributions_collected",
    "contributions_due",
  ] as const;
  const amountsAreValid = amountFields.every((field) => isAmount(data[field]));
  if (!response.ok || data.success !== true || !amountsAreValid ||
    !Number.isSafeInteger(data.active_members) || Number(data.active_members) < 0) {
    throw new Error(typeof data.error === "string" ? data.error : "Unable to load dashboard data. Please try again.");
  }

  return {
    cash_on_hand: String(data.cash_on_hand),
    outstanding_loans: String(data.outstanding_loans),
    total_fund_value: String(data.total_fund_value),
    share_capital: String(data.share_capital),
    contributions_collected: String(data.contributions_collected),
    contributions_due: String(data.contributions_due),
    active_members: data.active_members as number,
  };
}