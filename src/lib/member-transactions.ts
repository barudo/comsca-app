export type MemberTransaction = {
  id: string;
  type: string;
  amount: string;
  description: string;
  transactionOccurredAt: string | null;
};

export type LedgerAmounts = {
  ownership: number;
  loan: number;
  contribution: number;
  penalty: number;
};

export type LedgerRow = MemberTransaction & LedgerAmounts;

const transactionTypeInfo: Record<string, { label: string; column: keyof LedgerAmounts; direction: 1 | -1 }> = {
  BUY_SHARE: { label: "Share purchase", column: "ownership", direction: 1 },
  SELL_SHARE: { label: "Share redemption", column: "ownership", direction: -1 },
  SHARE_REFUND: { label: "Share refund", column: "ownership", direction: -1 },
  LOAN_DISBURSED: { label: "Loan disbursed", column: "loan", direction: 1 },
  LOAN_PAYMENT: { label: "Loan payment", column: "loan", direction: -1 },
  PAY_LOAN: { label: "Loan payment", column: "loan", direction: -1 },
  LOAN_INTEREST: { label: "Loan interest charged", column: "loan", direction: 1 },
  LOAN_INTEREST_CHARGED: { label: "Loan interest charged", column: "loan", direction: 1 },
  INTEREST_CHARGED: { label: "Loan interest charged", column: "loan", direction: 1 },
  CONTRIBUTION_CHARGED: { label: "Contribution charged", column: "contribution", direction: 1 },
  CHARGE_CONTRIBUTION: { label: "Contribution charged", column: "contribution", direction: 1 },
  CONTRIBUTION_ASSESSED: { label: "Contribution charged", column: "contribution", direction: 1 },
  PAY_CONTRIBUTION: { label: "Contribution payment", column: "contribution", direction: -1 },
  CONTRIBUTION_PAYMENT: { label: "Contribution payment", column: "contribution", direction: -1 },
  CONTRIBUTION_PAID: { label: "Contribution payment", column: "contribution", direction: -1 },
  PENALTY_CHARGED: { label: "Penalty charged", column: "penalty", direction: 1 },
  CHARGE_PENALTY: { label: "Penalty charged", column: "penalty", direction: 1 },
  PENALTY_ASSESSED: { label: "Penalty charged", column: "penalty", direction: 1 },
  PENALTY_PAYMENT: { label: "Penalty payment", column: "penalty", direction: -1 },
  PAY_PENALTY: { label: "Penalty payment", column: "penalty", direction: -1 },
};

function readableType(type: string): string {
  const normalized = type.trim().toUpperCase();
  return transactionTypeInfo[normalized]?.label ?? normalized.toLowerCase().split("_")
    .map((word) => word ? `${word[0].toUpperCase()}${word.slice(1)}` : "").join(" ");
}

function parseTransaction(value: unknown): MemberTransaction {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unable to load member transactions.");
  const fields = value as Record<string, unknown>;
  const amount = fields.amount;
  if ((typeof fields.id !== "string" && typeof fields.id !== "number") || !String(fields.id).trim() ||
    typeof fields.type !== "string" || !fields.type.trim() ||
    (typeof amount !== "string" && typeof amount !== "number") || String(amount).trim() === "" ||
    !Number.isFinite(Number(amount)) || !Number.isSafeInteger(Math.round(Number(amount) * 100))) {
    throw new Error("Unable to load member transactions.");
  }
  const occurredAt = typeof fields.transaction_occurred_at === "string" && fields.transaction_occurred_at.trim()
    ? fields.transaction_occurred_at
    : typeof fields.created_at === "string" && fields.created_at.trim() ? fields.created_at : null;
  return {
    id: String(fields.id),
    type: fields.type.trim(),
    amount: String(amount),
    description: typeof fields.description === "string" ? fields.description.trim() : "",
    transactionOccurredAt: occurredAt,
  };
}

export async function fetchMemberTransactions(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<MemberTransaction[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/me/transactions`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body !== "object" || Array.isArray(body) || body.success !== true || !Array.isArray(body.data)) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to load member transactions.");
  }
  return body.data.map(parseTransaction);
}

export function buildMemberLedger(transactions: MemberTransaction[]): { rows: LedgerRow[]; totals: LedgerAmounts } {
  const totals: LedgerAmounts = { ownership: 0, loan: 0, contribution: 0, penalty: 0 };
  const rows = transactions.map((transaction): LedgerRow => {
    const amounts: LedgerAmounts = { ownership: 0, loan: 0, contribution: 0, penalty: 0 };
    const typeInfo = transactionTypeInfo[transaction.type.trim().toUpperCase()];
    if (typeInfo) {
      const signedCents = Math.round(Number(transaction.amount) * 100) * typeInfo.direction;
      amounts[typeInfo.column] = signedCents;
      totals[typeInfo.column] += signedCents;
    }
    return { ...transaction, ...amounts };
  });
  return { rows, totals };
}

export function describeMemberTransaction(type: string): string {
  return readableType(type);
}