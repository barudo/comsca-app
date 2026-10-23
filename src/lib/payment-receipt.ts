type Fields = Record<string, unknown>;

export function receiptCents(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (!/^\d+(\.\d{1,2})?$/.test(String(value).trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

function integerWords(value: number): string {
  const small = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  if (value < 20) return small[value];
  if (value < 100) return ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"][Math.floor(value / 10)] + (value % 10 ? " " + integerWords(value % 10) : "");
  for (const [scale, name] of [[1e12, "Trillion"], [1e9, "Billion"], [1e6, "Million"], [1e3, "Thousand"], [100, "Hundred"]] as const) {
    if (value >= scale) return integerWords(Math.floor(value / scale)) + " " + name + (value % scale ? " " + integerWords(value % scale) : "");
  }
  return "";
}

export function pesosInWords(cents: number): string {
  if (!Number.isSafeInteger(cents) || cents < 0) throw new Error("Invalid receipt amount.");
  const pesos = Math.floor(cents / 100);
  const remainder = cents % 100;
  return integerWords(pesos) + (pesos === 1 ? " Peso" : " Pesos") +
    (remainder ? " and " + integerWords(remainder) + (remainder === 1 ? " Centavo" : " Centavos") : "") + " Only";
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function person(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const fields = value as Fields;
  return text(fields.name) || text(fields.full_name) || [text(fields.first_name), text(fields.family_name) || text(fields.last_name)].filter(Boolean).join(" ");
}

export function receiptPayer(transaction: Fields, entries: Fields[]): string {
  const name = (fields: Fields) => person(fields.received_from) || person(fields.payer_name) || person(fields.member_name) || person(fields.user_name) || person(fields.user) || person(fields.member);
  const direct = name(transaction);
  if (direct) return direct;
  const names = [...new Set(entries.map(name).filter(Boolean))];
  return names.length === 1 ? names[0] : "";
}

export function receiptParticular(entry: Fields): string {
  return text(entry.description) || text(entry.particulars) || text(entry.type).toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Payment";
}
