import assert from "node:assert/strict";
import test from "node:test";
import { fetchIncomeStatement } from "../src/lib/income-statement.ts";

const response = {
  success: true,
  current_cycle_id: "20",
  income: {
    accounts: [{ id: "401", code: "4000", name: "Interest income", balance: "37.40" }],
    total: "37.40",
  },
  expenses: {
    accounts: [{ id: "501", code: "5000", name: "Operating expenses", balance: "10.00" }],
    total: "10.00",
  },
  total_income: "37.40",
  total_expenses: "10.00",
  net_income: "27.40",
};

test("income statement uses an authenticated community-scoped uncached request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/accounting/income-statement"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(response);
  });

  const statement = await fetchIncomeStatement("access", "cebu", 20);
  assert.equal(statement.income.accounts[0].balanceCents, 3740);
  assert.equal(statement.income.totalCents, 3740);
  assert.equal(statement.expenses.accounts[0].code, "5000");
  assert.equal(statement.totalExpensesCents, 1000);
  assert.equal(statement.netIncomeCents, 2740);
});

test("income statement rejects wrong-cycle and malformed data", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  fetch.mock.mockImplementation(async () => Response.json({ ...response, current_cycle_id: "21" }));
  await assert.rejects(fetchIncomeStatement("access", "cebu", 20), /active cycle/);
  for (const body of [
    { ...response, success: false },
    { ...response, income: { ...response.income, accounts: [{ ...response.income.accounts[0], balance: "invalid" }] } },
    { ...response, net_income: "invalid" },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchIncomeStatement("access", "cebu", 20), /income statement/);
  }
});

test("missing authentication or community prevents an income statement request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchIncomeStatement("", "cebu", 20), /sign in/);
  await assert.rejects(fetchIncomeStatement("access", " ", 20), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});