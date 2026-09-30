export type InterestCharge = { credit: string; debit: string };

export async function chargeInterest(accessToken: string, groupSlug: string, charge: InterestCharge) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (![charge.credit, charge.debit].every((value) => value.trim())) {
    throw new Error("Select credit and debit accounts before applying interest.");
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/interests/charge`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify(charge),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Interest charge status could not be confirmed. Check transaction records before trying again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Interest charge status could not be confirmed. Check transaction records before trying again.");
  }
}