export type TrialBalanceAccount = {
  id: string | number;
  code: string;
  name: string;
  type: string;
  totalDebitsCents: number;
  totalCreditsCents: number;
  debitBalanceCents: number;
  creditBalanceCents: number;
};

export type TrialBalance = {
  accounts: TrialBalanceAccount[];
  summary: {
    totalDebitsCents: number;
    totalCreditsCents: number;
    differenceCents: number;
  };
};

function parseCents(value: unknown): number | null {
  if (typeof value === "number") {
    const cents = Math.round(value * 100);
    return Number.isFinite(value) && Number.isSafeInteger(cents) ? cents : null;
  }
  if (typeof value !== "string") return null;
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const cents = Number(match[2]) * 100 + Number((match[3] ?? "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) return null;
  return match[1] ? -cents : cents;
}

export async function fetchTrialBalance(
  accessToken: string,
  groupSlug: string,
  cycleId: string | number,
  signal?: AbortSignal,
): Promise<TrialBalance> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/accounting/trial-balance`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true || !Array.isArray(body.accounts)) {
    throw new Error("Unable to load the trial balance. Please try again.");
  }
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") || String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The trial balance does not match the active cycle. Please reload the page.");
  }
  if (!body.summary || typeof body.summary !== "object") throw new Error("Unable to read the trial balance.");

  const accounts = body.accounts.map((rawAccount: unknown) => {
    if (!rawAccount || typeof rawAccount !== "object") throw new Error("Unable to read the trial balance.");
    const account = rawAccount as Record<string, unknown>;
    const totalDebitsCents = parseCents(account.total_debits);
    const totalCreditsCents = parseCents(account.total_credits);
    const debitBalanceCents = parseCents(account.debit_balance);
    const creditBalanceCents = parseCents(account.credit_balance);
    if ((typeof account.id !== "string" && typeof account.id !== "number") || String(account.id).trim() === "" ||
      typeof account.code !== "string" || !account.code.trim() ||
      typeof account.name !== "string" || !account.name.trim() ||
      typeof account.type !== "string" || !account.type.trim() ||
      totalDebitsCents === null || totalCreditsCents === null || debitBalanceCents === null || creditBalanceCents === null) {
      throw new Error("Unable to read the trial balance.");
    }
    return {
      id: account.id,
      code: account.code.trim(),
      name: account.name.trim(),
      type: account.type.trim().toUpperCase(),
      totalDebitsCents,
      totalCreditsCents,
      debitBalanceCents,
      creditBalanceCents,
    };
  });

  const summary = body.summary as Record<string, unknown>;
  const totalDebitsCents = parseCents(summary.total_debits);
  const totalCreditsCents = parseCents(summary.total_credits);
  const differenceCents = parseCents(summary.difference);
  if (totalDebitsCents === null || totalCreditsCents === null || differenceCents === null) {
    throw new Error("Unable to read the trial balance.");
  }

  return { accounts, summary: { totalDebitsCents, totalCreditsCents, differenceCents } };
}