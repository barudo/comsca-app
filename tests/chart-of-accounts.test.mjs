import assert from "node:assert/strict";
import test from "node:test";
import { buildAccountSummary, createPlaceholderJournalEntries } from "../src/lib/chart-of-accounts.ts";

test("account summary derives normal balances from journal lines in the active group and cycle", () => {
  const entries = createPlaceholderJournalEntries("cebu", "cycle-2");
  entries.push(...createPlaceholderJournalEntries("other-group", "cycle-2"));
  entries.push(...createPlaceholderJournalEntries("cebu", "cycle-1"));

  const summary = buildAccountSummary(entries, "cebu", "cycle-2");
  const byType = Object.fromEntries(summary.map((accountType) => [accountType.type, accountType]));
  const assets = byType.ASSET;

  assert.equal(assets.totalCents, 770000);
  assert.equal(assets.accounts.find(({ name }) => name === "Cash on Hand").balanceCents, 335000);
  assert.equal(assets.accounts.find(({ name }) => name === "Bank").balanceCents, 260000);
  assert.equal(assets.accounts.find(({ name }) => name === "Loans Receivable").balanceCents, 150000);
  assert.equal(byType.LIABILITY.totalCents, 250000);
  assert.equal(byType.EQUITY.totalCents, 500000);
  assert.equal(byType.INCOME.totalCents, 35000);
  assert.equal(byType.EXPENSE.totalCents, 15000);
  assert.ok(summary.every(({ accounts, totalCents }) => accounts.reduce((total, account) => total + account.balanceCents, 0) === totalCents));
});