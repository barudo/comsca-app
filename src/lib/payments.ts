export type PaymentEntry = {
  type: "LOAN_PAYMENT" | "BUY_SHARE";
  debit: string;
  credit: string;
  amount: string;
};

export async function postPayments(accessToken: string, groupSlug: string, userId: string | number, cycleId: string | number, entries: PaymentEntry[]) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!String(userId).trim() || !String(cycleId).trim() || !entries.length) throw new Error("Select a member, cycle, and at least one payment.");
  if (entries.some((entry) => !["LOAN_PAYMENT", "BUY_SHARE"].includes(entry.type) || !entry.debit.trim() || !entry.credit.trim() || !/^\d+\.\d{2}$/.test(entry.amount))) {
    throw new Error("Each payment needs a valid type, debit account, credit account, and amount.");
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/transactions/payments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: String(userId), cycle_id: String(cycleId), entries }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Payment status could not be confirmed. Check transaction records before trying again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Payment status could not be confirmed. Check transaction records before trying again.");
  }
}
