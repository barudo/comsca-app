export type LoanDisbursement = {
  user_id: string;
  cycle_id: string;
  debit: string;
  credit: string;
  amount: string;
  description: string;
};

export async function disburseLoan(accessToken: string, groupSlug: string, payment: LoanDisbursement) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (![payment.user_id, payment.cycle_id, payment.debit, payment.credit, payment.description].every((value) => value.trim()) ||
    !/^\d+\.\d{2}$/.test(payment.amount) || Number(payment.amount) <= 0 || !Number.isSafeInteger(Math.round(Number(payment.amount) * 100))) {
    throw new Error("Select a member, cycle, debit and credit accounts, and a valid positive amount.");
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/transactions/disburse-loans`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify(payment),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Disbursement status could not be confirmed. Check transaction records before trying again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Disbursement status could not be confirmed. Check transaction records before trying again.");
  }
}
