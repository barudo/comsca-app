export class ApiRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code: string | null = null) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function apiRequestError(response: Response, body: unknown, fallback: string): ApiRequestError {
  const record = body && typeof body === "object" && !Array.isArray(body)
    ? body as Record<string, unknown>
    : {};
  const error = record.error;
  const errorRecord = error && typeof error === "object" && !Array.isArray(error)
    ? error as Record<string, unknown>
    : {};
  const message = typeof error === "string"
    ? error
    : typeof errorRecord.message === "string" && errorRecord.message.trim()
      ? errorRecord.message
      : ({
          401: "Your session has expired. Please sign in again.",
          403: "You are not authorized to perform this action.",
          404: "The requested record or cycle could not be found.",
          409: "This action is not valid for the current cycle state.",
          423: "Transactions are currently frozen.",
        }[response.status] ?? fallback);
  const code = typeof errorRecord.code === "string" ? errorRecord.code : null;
  return new ApiRequestError(message, response.status, code);
}

export function isTransactionsFrozenError(cause: unknown): boolean {
  if (!cause || typeof cause !== "object") return false;
  const error = cause as { status?: unknown; code?: unknown };
  return error.status === 423 || error.code === "TRANSACTIONS_FROZEN";
}
