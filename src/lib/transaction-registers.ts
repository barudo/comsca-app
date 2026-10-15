export type RegisterDocument = "PR" | "DV" | "JV";
export type TransactionRegister = Record<string, unknown>;
export type RegisterPage = {
  documents: TransactionRegister[];
  pagination: { page: number; per_page: number; total: number; total_pages: number };
};

export async function fetchTransactionRegisters(
  accessToken: string,
  groupSlug: string,
  document: RegisterDocument,
  signal?: AbortSignal,
  page = 1,
): Promise<RegisterPage> {
  if (!accessToken || !groupSlug.trim()) throw new Error("Please sign in through your community’s URL.");
  const base = (process.env.NEXT_PUBLIC_API_URL ||
    "https://ryvggw5w5m.execute-api.ap-southeast-1.amazonaws.com/api/v1").replace(/\/+$/, "");
  const response = await fetch(`${base}/transactions/registers?document=${document}&page=${page}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}`, "x-group-slug": groupSlug },
    cache: "no-store",
    signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15000)]) : AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.success !== true || !Array.isArray(body.data)) {
    throw new Error(typeof body?.error === "string" ? body.error : "Unable to load transaction documents. Please try again.");
  }
  const documents = body.data.map((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unable to read transaction documents.");
    return value as TransactionRegister;
  });
  const pagination = body.pagination ?? { page: 1, per_page: Math.max(1, documents.length), total: documents.length, total_pages: documents.length ? 1 : 0 };
  if (!Number.isSafeInteger(pagination.page) || pagination.page < 1 ||
    !Number.isSafeInteger(pagination.per_page) || pagination.per_page < 1 ||
    !Number.isSafeInteger(pagination.total) || pagination.total < 0 ||
    !Number.isSafeInteger(pagination.total_pages) || pagination.total_pages < 0) {
    throw new Error("Unable to read document pagination.");
  }
  return { documents, pagination };
}
