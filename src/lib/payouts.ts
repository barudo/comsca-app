export type Payout = {
  id: string;
  groupId: string;
  cycleId: string;
  userId: string;
  transactionId: string;
  debit: string;
  credit: string;
  amountCents: number;
  idempotencyKey: string;
  createdAt: string;
};

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unable to read payouts.");
  return value as Record<string, unknown>;
}

function identifier(value: unknown): string {
  if ((typeof value !== "string" && typeof value !== "number") || !String(value).trim()) throw new Error("Unable to read payout details.");
  return String(value);
}

function amount(value: unknown): number {
  if ((typeof value !== "string" && typeof value !== "number") || !/^\d+(\.\d{1,2})?$/.test(String(value))) {
    throw new Error("Unable to read payout amounts.");
  }
  const cents = Math.round(Number(value) * 100);
  if (!Number.isSafeInteger(cents)) throw new Error("Unable to read payout amounts.");
  return cents;
}

export async function fetchPayouts(accessToken: string, groupSlug: string, cycleId: string | number, signal?: AbortSignal): Promise<Payout[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!String(cycleId).trim()) throw new Error("A cycle is required to load payouts.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/cycles/${encodeURIComponent(String(cycleId))}/payouts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = record(await response.json());
  if (!response.ok || body.success !== true) {
    throw new Error(typeof body.error === "string" ? body.error : "Unable to load payouts. Please try again.");
  }
  const cycle = record(body.cycle);
  if (identifier(cycle.id) !== String(cycleId) || typeof cycle.status !== "string" || cycle.status.trim().toLowerCase() !== "distributing") {
    throw new Error("Payouts do not match the current distributing cycle. Please reload the page.");
  }
  if (!Array.isArray(body.payouts)) throw new Error("Unable to read payouts.");
  return body.payouts.map((value) => {
    const row = record(value);
    if (identifier(row.cycle_id) !== String(cycleId)) throw new Error("Payouts do not match the current cycle. Please reload the page.");
    if (typeof row.created_at !== "string" || !Number.isFinite(Date.parse(row.created_at)) || typeof row.idempotency_key !== "string") {
      throw new Error("Unable to read payout details.");
    }
    return {
      id: identifier(row.id), groupId: identifier(row.group_id), cycleId: identifier(row.cycle_id),
      userId: identifier(row.user_id), transactionId: identifier(row.transaction_id),
      debit: identifier(row.debit), credit: identifier(row.credit), amountCents: amount(row.amount),
      idempotencyKey: row.idempotency_key, createdAt: row.created_at,
    };
  });
}
