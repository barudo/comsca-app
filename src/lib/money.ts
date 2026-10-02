export function amountToCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}