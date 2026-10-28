export const distributionTotals = {
  total_capital: "Total capital", net_earnings: "Net earnings", gross_distribution: "Gross distribution",
  total_deductions: "Total deductions", net_distribution: "Net distribution", total_paid: "Total paid",
  cash_available: "Cash available", cash_shortfall: "Cash shortfall",
} as const;
export const distributionAmounts = {
  capital_amount: "Capital", earnings_amount: "Earnings", gross_amount: "Gross distribution",
  loan_deduction: "Loan deduction", contribution_deduction: "Contribution deduction", penalty_deduction: "Penalty deduction",
  other_deduction: "Other deduction", total_deductions: "Total deductions", net_amount: "Net distribution", paid_amount: "Paid",
} as const;
type Totals = Record<keyof typeof distributionTotals, number>;
type Amounts = Record<keyof typeof distributionAmounts, number>;
export type Distributions = {
  totals: Totals;
  memberCount: number;
  warnings: string[];
  distributions: { id: string; userId: string; status: string; amounts: Amounts }[];
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unable to read distributions.");
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) throw new Error("Unable to read distribution identifiers.");
  return String(value);
}
function amounts<K extends string>(row: Record<string, unknown>, labels: Record<K, string>): Record<K, number> {
  const result = {} as Record<K, number>;
  for (const key of Object.keys(labels) as K[]) {
    const value = row[key];
    if ((typeof value !== "string" && typeof value !== "number") || !/^-?\d+(\.\d{1,2})?$/.test(String(value))) throw new Error("Unable to read distribution amounts.");
    const cents = Math.round(Number(value) * 100);
    if (!Number.isSafeInteger(cents)) throw new Error("Unable to read distribution amounts.");
    result[key] = cents;
  }
  return result;
}
export async function fetchDistributions(accessToken: string, groupSlug: string, cycleId: string | number, signal?: AbortSignal): Promise<Distributions> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const cycleKey = id(cycleId);
  const base = (process.env.NEXT_PUBLIC_API_URL || "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/cycles/${encodeURIComponent(cycleKey)}/distributions`, {
    method: "GET", headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug }, cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = record(await response.json());
  if (!response.ok || body.success !== true) throw new Error(typeof body.error === "string" ? body.error : "Unable to load distributions. Please try again.");
  const cycle = record(body.cycle);
  const summary = record(body.summary);
  if (id(cycle.id) !== cycleKey || id(summary.cycle_id) !== cycleKey || cycle.status !== "distributing" || summary.status !== "distributing") throw new Error("Distributions do not match the current distributing cycle. Please reload the page.");
  if (!Array.isArray(body.distributions) || !Array.isArray(summary.warnings) || summary.warnings.some((warning) => typeof warning !== "string") || typeof summary.member_count !== "number" || !Number.isSafeInteger(summary.member_count) || summary.member_count < 0) throw new Error("Unable to read distributions.");
  return {
    totals: amounts(summary, distributionTotals), memberCount: summary.member_count, warnings: summary.warnings,
    distributions: body.distributions.map((value) => {
      const row = record(value);
      if (id(row.cycle_id) !== cycleKey) throw new Error("Distributions do not match the current cycle.");
      if (typeof row.status !== "string" || !row.status.trim()) throw new Error("Unable to read distribution status.");
      return { id: id(row.id), userId: id(row.user_id), status: row.status, amounts: amounts(row, distributionAmounts) };
    }),
  };
}
