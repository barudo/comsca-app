export type DonationEntry = {
  amount: string;
  description: string;
  debit: string;
  credit: string;
};

export async function postDonation(accessToken: string, groupSlug: string, donation: DonationEntry) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!donation.description.trim() || !donation.debit.trim() || !donation.credit.trim() ||
    !/^\d+\.\d{2}$/.test(donation.amount) || Number(donation.amount) <= 0 || !Number.isSafeInteger(Math.round(Number(donation.amount) * 100))) {
    throw new Error("Enter a valid amount and description, then select debit and credit accounts.");
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/transactions/donations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify(donation),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Donation status could not be confirmed. Check transaction records before trying again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Donation status could not be confirmed. Check transaction records before trying again.");
  }
}