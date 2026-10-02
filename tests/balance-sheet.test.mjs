import assert from "node:assert/strict";
import test from "node:test";
import { fetchBalanceSheet } from "../src/lib/balance-sheet.ts";

const response = {
  success: true,
  current_cycle_id: "20",
  assets: {
    accounts: [
      { id: "101", code: "1000", name: "Cash", balance: "240.28" },
      { id: "102", code: "1100", name: "Loans Receivable", balance: "77.57" },
      { id: "103", code: "1400", name: "Contributions Receivable", balance: "19.80" },
    ],
    total: "337.65",
  },
  liabilities: {
    accounts: [{ id: "201", code: "2000", name: "Accounts Payable", balance: "10.00" }],
    total: "10.00",
  },
  equity: {
    accounts: [{ id: "301", code: "3000", name: "Equity", balance: "300.25" }],
    current_earnings: { income: "37.40", expenses: "10.00", balance: "27.40" },
    total: "327.65",
  },
  total_assets: "337.65",
  total_liabilities: "10.00",
  total_equity: "327.65",
  total_liabilities_and_equity: "337.65",
  difference: "0.00",
};

test("balance sheet uses an authenticated group-scoped uncached request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/accounting/balance-sheet"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(response);
  });

  const sheet = await fetchBalanceSheet("access", "cebu", 20);
  assert.equal(sheet.assets.totalCents, 33765);
  assert.equal(sheet.assets.accounts[0].balanceCents, 24028);
  assert.equal(sheet.equity.currentEarnings.incomeCents, 3740);
  assert.equal(sheet.equity.currentEarnings.balanceCents, 2740);
  assert.equal(sheet.totalLiabilitiesAndEquityCents, 33765);
  assert.equal(sheet.differenceCents, 0);
});

test("balance sheet rejects wrong-cycle and malformed response values", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  fetch.mock.mockImplementation(async () => Response.json({ ...response, current_cycle_id: "21" }));
  await assert.rejects(fetchBalanceSheet("access", "cebu", 20), /active cycle/);
  for (const body of [
    { ...response, success: false },
    { ...response, assets: { ...response.assets, accounts: [{ ...response.assets.accounts[0], balance: "bad" }] } },
    { ...response, equity: { ...response.equity, current_earnings: { ...response.equity.current_earnings, balance: "bad" } } },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchBalanceSheet("access", "cebu", 20), /balance sheet/);
  }
});

test("missing authentication or community prevents a balance sheet request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchBalanceSheet("", "cebu", 20), /sign in/);
  await assert.rejects(fetchBalanceSheet("access", " ", 20), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});