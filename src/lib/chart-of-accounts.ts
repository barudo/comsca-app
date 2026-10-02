export const accountTypes = [
  { key: "ASSET", label: "Assets" },
  { key: "LIABILITY", label: "Liabilities" },
  { key: "EQUITY", label: "Equity" },
  { key: "INCOME", label: "Income" },
  { key: "EXPENSE", label: "Expenses" },
] as const;

export type AccountType = typeof accountTypes[number]["key"];
export type AccountSummary = {
  type: AccountType;
  label: string;
  totalCents: number;
  accounts: { id: string | number; code: string; name: string; balanceCents: number }[];
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

function isAccountType(value: unknown): value is AccountType {
  return accountTypes.some(({ key }) => key === value);
}

export async function fetchChartOfAccounts(
  accessToken: string,
  groupSlug: string,
  cycleId: string | number,
  signal?: AbortSignal,
): Promise<AccountSummary[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/accounting/accounts`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok || body?.success !== true || !Array.isArray(body.accounts)) {
    throw new Error("Unable to load the chart of accounts. Please try again.");
  }
  if ((typeof body.current_cycle_id !== "string" && typeof body.current_cycle_id !== "number") || String(body.current_cycle_id) !== String(cycleId)) {
    throw new Error("The accounting data does not match the active cycle. Please reload the page.");
  }

  const summaries = new Map<AccountType, AccountSummary>();
  for (const rawAccount of body.accounts as unknown[]) {
    if (!rawAccount || typeof rawAccount !== "object") throw new Error("Unable to read chart of accounts.");
    const account = rawAccount as Record<string, unknown>;
    if (!isAccountType(account.type) || summaries.has(account.type) || !Array.isArray(account.sub_accounts) || parseCents(account.total_balance) === null) {
      throw new Error("Unable to read chart of accounts.");
    }
    const accountType = accountTypes.find(({ key }) => key === account.type)!;
    const accounts = account.sub_accounts.map((rawSubAccount: unknown) => {
      if (!rawSubAccount || typeof rawSubAccount !== "object") throw new Error("Unable to read chart of accounts.");
      const subAccount = rawSubAccount as Record<string, unknown>;
      const balanceCents = parseCents(subAccount.current_balance);
      if ((typeof subAccount.id !== "string" && typeof subAccount.id !== "number") || String(subAccount.id).trim() === "" ||
        typeof subAccount.code !== "string" || !subAccount.code.trim() ||
        typeof subAccount.name !== "string" || !subAccount.name.trim() || balanceCents === null) {
        throw new Error("Unable to read chart of accounts.");
      }
      return { id: subAccount.id, code: subAccount.code.trim(), name: subAccount.name.trim(), balanceCents };
    });
    summaries.set(account.type, {
      type: account.type,
      label: accountType.label,
      totalCents: accounts.reduce((total, subAccount) => total + subAccount.balanceCents, 0),
      accounts,
    });
  }

  return accountTypes.map(({ key, label }) => summaries.get(key) ?? { type: key, label, totalCents: 0, accounts: [] });
}