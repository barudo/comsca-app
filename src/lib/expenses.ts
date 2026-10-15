export type ExpenseEntry = {
  amount: string;
  description: string;
  debit: string;
  credit: string;
};

export async function postExpense(accessToken: string, groupSlug: string, expense: ExpenseEntry) {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  if (!expense.description.trim() || !expense.debit.trim() || !expense.credit.trim() ||
    !/^\d+\.\d{2}$/.test(expense.amount) || Number(expense.amount) <= 0 || !Number.isSafeInteger(Math.round(Number(expense.amount) * 100))) {
    throw new Error("Enter a valid amount and description, then select debit and credit accounts.");
  }
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}/transactions/add-expense`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug, "Content-Type": "application/json" },
      body: JSON.stringify(expense),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Expense status could not be confirmed. Check transaction records before trying again.");
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true) {
    throw new Error(typeof body?.error === "string" ? body.error : "Expense status could not be confirmed. Check transaction records before trying again.");
  }
}

export type Expense = { id: string; description: string; amount: string };

export async function fetchExpenses(accessToken: string, groupSlug: string, signal?: AbortSignal): Promise<Expense[]> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/transactions/expenses`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !Array.isArray(body.data)) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to load expenses.");
  }
  const ids = new Set<string>();
  return body.data.map((value: unknown) => {
    if (!value || typeof value !== "object") throw new Error("Unable to load expenses.");
    const row = value as Record<string, unknown>;
    if ((typeof row.id !== "string" && typeof row.id !== "number") || !String(row.id).trim() ||
      (typeof row.amount !== "string" && typeof row.amount !== "number") || !String(row.amount).trim() ||
      !Number.isFinite(Number(row.amount)) || Number(row.amount) < 0 ||
      !Number.isSafeInteger(Math.round(Number(row.amount) * 100)) || ids.has(String(row.id))) {
      throw new Error("Unable to load expenses.");
    }
    ids.add(String(row.id));
    return { id: String(row.id), description: typeof row.description === "string" ? row.description.trim() : "", amount: String(row.amount) };
  });
}
