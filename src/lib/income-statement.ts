export type IncomeStatementAccount = {
  id: string | number;
  code: string;
  name: string;
  balanceCents: number;
};

export type IncomeStatementSection = {
  accounts: IncomeStatementAccount[];
  totalCents: number;
};

export type IncomeStatement = {
  income: IncomeStatementSection;
  expenses: IncomeStatementSection;
  totalIncomeCents: number;
  totalExpensesCents: number;
  netIncomeCents: number;
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

function readSection(value: unknown): IncomeStatementSection {
  if (!value || typeof value !== "object") throw new Error("Unable to read the income statement.");
  const section = value as Record<string, unknown>;
  if (!Array.isArray(section.accounts)) throw new Error("Unable to read the income statement.");
  const totalCents = parseCents(section.total);
  if (totalCents === null) throw new Error("Unable to read the income statement.");
  const accounts = section.accounts.map((rawAccount: unknown) => {
    if (!rawAccount || typeof rawAccount !== "object") throw new Error("Unable to read the income statement.");
    const account = rawAccount as Record<string, unknown>;
    const balanceCents = parseCents(account.balance);
    if ((typeof account.id !== "string" && typeof account.id !== "number") || String(account.id).trim() === "" ||
      typeof account.code !== "string" || !account.code.trim() ||
      typeof account.name !== "string" || !account.name.trim() || balanceCents === null) {
      throw new Error("Unable to read the income statement.");
    }
    return { id: account.id, code: account.code.trim(), name: account.name.trim(), balanceCents };
  });
  return { accounts, totalCents };
}

export async function fetchIncomeStatement(
  accessToken: string,
  groupSlug: string,
  cycleId: string | number,
  signal?: AbortSignal,
): Promise<IncomeStatement> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/accounting/income-statement`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true) throw new Error("Unable to load the income statement. Please try again.");
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") || String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The income statement does not match the active cycle. Please reload the page.");
  }

  const totalIncomeCents = parseCents(body.total_income);
  const totalExpensesCents = parseCents(body.total_expenses);
  const netIncomeCents = parseCents(body.net_income);
  if (totalIncomeCents === null || totalExpensesCents === null || netIncomeCents === null) {
    throw new Error("Unable to read the income statement.");
  }

  return {
    income: readSection(body.income),
    expenses: readSection(body.expenses),
    totalIncomeCents,
    totalExpensesCents,
    netIncomeCents,
  };
}