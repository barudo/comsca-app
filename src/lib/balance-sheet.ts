export type BalanceSheetAccount = {
  id: string | number;
  code: string;
  name: string;
  balanceCents: number;
};

export type BalanceSheetSection = {
  accounts: BalanceSheetAccount[];
  totalCents: number;
};

export type BalanceSheet = {
  assets: BalanceSheetSection;
  liabilities: BalanceSheetSection;
  equity: BalanceSheetSection & {
    currentEarnings: {
      incomeCents: number;
      expensesCents: number;
      balanceCents: number;
    };
  };
  totalAssetsCents: number;
  totalLiabilitiesCents: number;
  totalEquityCents: number;
  totalLiabilitiesAndEquityCents: number;
  differenceCents: number;
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

function readSection(value: unknown): BalanceSheetSection {
  if (!value || typeof value !== "object") throw new Error("Unable to read the balance sheet.");
  const section = value as Record<string, unknown>;
  if (!Array.isArray(section.accounts)) throw new Error("Unable to read the balance sheet.");
  const totalCents = parseCents(section.total);
  if (totalCents === null) throw new Error("Unable to read the balance sheet.");
  const accounts = section.accounts.map((rawAccount: unknown) => {
    if (!rawAccount || typeof rawAccount !== "object") throw new Error("Unable to read the balance sheet.");
    const account = rawAccount as Record<string, unknown>;
    const balanceCents = parseCents(account.balance);
    if ((typeof account.id !== "string" && typeof account.id !== "number") || String(account.id).trim() === "" ||
      typeof account.code !== "string" || !account.code.trim() ||
      typeof account.name !== "string" || !account.name.trim() || balanceCents === null) {
      throw new Error("Unable to read the balance sheet.");
    }
    return { id: account.id, code: account.code.trim(), name: account.name.trim(), balanceCents };
  });
  return { accounts, totalCents };
}

export async function fetchBalanceSheet(
  accessToken: string,
  groupSlug: string,
  cycleId: string | number,
  signal?: AbortSignal,
): Promise<BalanceSheet> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/accounting/balance-sheet`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) throw new Error("Unable to load the balance sheet. Please try again.");
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") || String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The balance sheet does not match the active cycle. Please reload the page.");
  }

  const equitySection = readSection(body.equity);
  if (!body.equity.current_earnings || typeof body.equity.current_earnings !== "object") {
    throw new Error("Unable to read the balance sheet.");
  }
  const earnings = body.equity.current_earnings as Record<string, unknown>;
  const incomeCents = parseCents(earnings.income);
  const expensesCents = parseCents(earnings.expenses);
  const earningsBalanceCents = parseCents(earnings.balance);
  const totalAssetsCents = parseCents(body.total_assets);
  const totalLiabilitiesCents = parseCents(body.total_liabilities);
  const totalEquityCents = parseCents(body.total_equity);
  const totalLiabilitiesAndEquityCents = parseCents(body.total_liabilities_and_equity);
  const differenceCents = parseCents(body.difference);
  if (incomeCents === null || expensesCents === null || earningsBalanceCents === null ||
    totalAssetsCents === null || totalLiabilitiesCents === null || totalEquityCents === null ||
    totalLiabilitiesAndEquityCents === null || differenceCents === null) {
    throw new Error("Unable to read the balance sheet.");
  }

  return {
    assets: readSection(body.assets),
    liabilities: readSection(body.liabilities),
    equity: { ...equitySection, currentEarnings: { incomeCents, expensesCents, balanceCents: earningsBalanceCents } },
    totalAssetsCents,
    totalLiabilitiesCents,
    totalEquityCents,
    totalLiabilitiesAndEquityCents,
    differenceCents,
  };
}