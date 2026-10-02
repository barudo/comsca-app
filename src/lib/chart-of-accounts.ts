export const accountTypes = [
  { key: "ASSET", label: "Assets", normalSide: "debit" },
  { key: "LIABILITY", label: "Liabilities", normalSide: "credit" },
  { key: "EQUITY", label: "Equity", normalSide: "credit" },
  { key: "INCOME", label: "Income", normalSide: "credit" },
  { key: "EXPENSE", label: "Expenses", normalSide: "debit" },
] as const;

export type AccountType = typeof accountTypes[number]["key"];
export type JournalLine = {
  accountType: AccountType;
  accountName: string;
  debitCents: number;
  creditCents: number;
};
export type JournalEntry = {
  groupSlug: string;
  cycleId: string | number;
  lines: JournalLine[];
};
export type AccountSummary = {
  type: AccountType;
  label: string;
  totalCents: number;
  accounts: { name: string; balanceCents: number }[];
};

const placeholderAccounts: { type: AccountType; name: string }[] = [
  { type: "ASSET", name: "Cash on Hand" },
  { type: "ASSET", name: "Bank" },
  { type: "ASSET", name: "GCash" },
  { type: "ASSET", name: "Loans Receivable" },
  { type: "ASSET", name: "Contributions Receivable" },
  { type: "ASSET", name: "Penalties Receivable" },
  { type: "LIABILITY", name: "Member Deposits" },
  { type: "LIABILITY", name: "Accounts Payable" },
  { type: "EQUITY", name: "Member Equity" },
  { type: "EQUITY", name: "Retained Earnings" },
  { type: "INCOME", name: "Contribution Income" },
  { type: "INCOME", name: "Interest Income" },
  { type: "INCOME", name: "Penalty Income" },
  { type: "EXPENSE", name: "Administrative Expense" },
  { type: "EXPENSE", name: "Loan Loss Expense" },
];

const placeholderLines: JournalLine[][] = [
  [
    { accountType: "ASSET", accountName: "Cash on Hand", debitCents: 500000, creditCents: 0 },
    { accountType: "EQUITY", accountName: "Member Equity", debitCents: 0, creditCents: 500000 },
  ],
  [
    { accountType: "ASSET", accountName: "Bank", debitCents: 250000, creditCents: 0 },
    { accountType: "LIABILITY", accountName: "Member Deposits", debitCents: 0, creditCents: 250000 },
  ],
  [
    { accountType: "ASSET", accountName: "Bank", debitCents: 150000, creditCents: 0 },
    { accountType: "ASSET", accountName: "Cash on Hand", debitCents: 0, creditCents: 150000 },
  ],
  [
    { accountType: "ASSET", accountName: "GCash", debitCents: 25000, creditCents: 0 },
    { accountType: "INCOME", accountName: "Contribution Income", debitCents: 0, creditCents: 25000 },
  ],
  [
    { accountType: "ASSET", accountName: "Loans Receivable", debitCents: 200000, creditCents: 0 },
    { accountType: "ASSET", accountName: "Bank", debitCents: 0, creditCents: 200000 },
  ],
  [
    { accountType: "ASSET", accountName: "Bank", debitCents: 50000, creditCents: 0 },
    { accountType: "ASSET", accountName: "Loans Receivable", debitCents: 0, creditCents: 50000 },
  ],
  [
    { accountType: "ASSET", accountName: "Bank", debitCents: 10000, creditCents: 0 },
    { accountType: "INCOME", accountName: "Interest Income", debitCents: 0, creditCents: 10000 },
  ],
  [
    { accountType: "EXPENSE", accountName: "Administrative Expense", debitCents: 15000, creditCents: 0 },
    { accountType: "ASSET", accountName: "Cash on Hand", debitCents: 0, creditCents: 15000 },
  ],
];

export function createPlaceholderJournalEntries(groupSlug: string, cycleId: string | number): JournalEntry[] {
  return placeholderLines.map((lines) => ({ groupSlug, cycleId, lines }));
}

export function buildAccountSummary(
  entries: JournalEntry[],
  groupSlug: string,
  cycleId: string | number,
): AccountSummary[] {
  const balances = new Map<string, number>();

  for (const account of placeholderAccounts) {
    balances.set(`${account.type}:${account.name}`, 0);
  }

  for (const entry of entries) {
    if (entry.groupSlug !== groupSlug || String(entry.cycleId) !== String(cycleId)) continue;
    for (const line of entry.lines) {
      const accountType = accountTypes.find(({ key }) => key === line.accountType);
      const multiplier = accountType?.normalSide === "debit" ? 1 : -1;
      const key = `${line.accountType}:${line.accountName}`;
      balances.set(key, (balances.get(key) ?? 0) + (line.debitCents - line.creditCents) * multiplier);
    }
  }

  return accountTypes.map(({ key, label }) => {
    const accounts = placeholderAccounts
      .filter((account) => account.type === key)
      .map(({ name }) => ({ name, balanceCents: balances.get(`${key}:${name}`) ?? 0 }));
    return {
      type: key,
      label,
      totalCents: accounts.reduce((total, account) => total + account.balanceCents, 0),
      accounts,
    };
  });
}