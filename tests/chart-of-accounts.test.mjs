import assert from "node:assert/strict";
import test from "node:test";
import { fetchChartOfAccounts } from "../src/lib/chart-of-accounts.ts";

const response = {
  success: true,
  current_cycle_id: "20",
  accounts: [
    { type: "ASSET", total_balance: "1750.00", sub_accounts: [
      { id: "101", code: "1000", name: "Cash", current_balance: "1250.00" },
      { id: "102", code: "1200", name: "Loans receivable", current_balance: "500.00" },
    ] },
    { type: "LIABILITY", total_balance: "250.00", sub_accounts: [
      { id: "201", code: "2000", name: "Member savings payable", current_balance: "250.00" },
    ] },
    { type: "EQUITY", total_balance: "1300.00", sub_accounts: [
      { id: "301", code: "3000", name: "Share capital", current_balance: "1300.00" },
    ] },
    { type: "INCOME", total_balance: "300.00", sub_accounts: [
      { id: "401", code: "4000", name: "Interest income", current_balance: "300.00" },
    ] },
    { type: "EXPENSE", total_balance: "100.00", sub_accounts: [
      { id: "501", code: "5000", name: "Operating expenses", current_balance: "100.00" },
    ] },
  ],
};

test("accounting accounts use an authenticated group-scoped uncached request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/accounting/accounts"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(response);
  });

  const accounts = await fetchChartOfAccounts("access", "cebu", 20);
  assert.deepEqual(accounts.map(({ type }) => type), ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]);
  assert.equal(accounts[0].totalCents, 175000);
  assert.equal(accounts[0].accounts[0].code, "1000");
  assert.equal(accounts[0].accounts[0].balanceCents, 125000);
});

test("parent totals are calculated from the returned sub-account balances", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({
    ...response,
    accounts: [{ ...response.accounts[0], total_balance: "9999.00" }],
  }));
  const accounts = await fetchChartOfAccounts("access", "cebu", 20);
  assert.equal(accounts[0].totalCents, 175000);
  assert.equal(accounts[0].accounts.length, 2);
  assert.equal(accounts[1].totalCents, 0);
  assert.equal(fetch.mock.callCount(), 1);
});

test("accounting responses must match the active cycle and contain readable balances", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  fetch.mock.mockImplementation(async () => Response.json({ ...response, current_cycle_id: "21" }));
  await assert.rejects(fetchChartOfAccounts("access", "cebu", 20), /active cycle/);
  for (const body of [
    { ...response, success: false },
    { ...response, accounts: [{ ...response.accounts[0], sub_accounts: [{ ...response.accounts[0].sub_accounts[0], current_balance: "invalid" }] }] },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchChartOfAccounts("access", "cebu", 20), /chart of accounts/);
  }
});

test("missing authentication or community prevents an accounting request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchChartOfAccounts("", "cebu", 20), /sign in/);
  await assert.rejects(fetchChartOfAccounts("access", " ", 20), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});