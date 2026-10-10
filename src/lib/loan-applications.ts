export type LoanApplication = {
  id: string;
  group_id: string;
  user_id: string;
  cycle_id: string;
  amount_desired: string;
  amount_disbursed: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function submitLoanApplication(accessToken: string, groupSlug: string, amountDesired: string): Promise<void> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const amount = amountDesired.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(amount) || Number(amount) <= 0 || !Number.isSafeInteger(Math.round(Number(amount) * 100))) {
    throw new Error("Enter an amount greater than zero with up to two decimal places.");
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const uncertain = "Submission could not be confirmed. Refresh your loan application before trying again.";
  let response: Response;
  try {
    response = await fetch(`${base}/me/loans/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify({ amount_desired: Number(amount).toFixed(2) }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(uncertain);
  }
  if (response.status === 204) return;
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : uncertain);
  }
}

export async function fetchLoanApplication(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<LoanApplication | null> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/me/loans/apply`, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
      cache: "no-store",
      signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Unable to load your loan application. Please try again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to load your loan application. Please try again.");
  }
  if (body.loan_application === null) return null;
  const application = body.loan_application;
  if (!application || typeof application !== "object" ||
    !["id", "group_id", "user_id", "cycle_id", "amount_desired", "amount_disbursed", "status", "created_at", "updated_at"].every((key) => typeof application[key] === "string") ||
    ![application.amount_desired, application.amount_disbursed].every((amount) => /^\d+(\.\d{1,2})?$/.test(amount) && Number.isFinite(Number(amount)))) {
    throw new Error("The loan application response was invalid. Please try again.");
  }
  return application;
}
