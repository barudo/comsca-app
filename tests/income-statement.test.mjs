import assert from "node:assert/strict";
import test from "node:test";
import { fetchIncomeStatement } from "../src/lib/income-statement.ts";

const response = {
  success: true,
  current_cycle_id: "1",
  income: {
    accounts: [
      { id: "7", code: "4000", name: "Interest Income", amount: "1816.36" },
      { id: "8", code: "4100", name: "Penalty Income", amount: "0.00" },
      { id: "9", code: "4200", name: "Other Income", amount: "0.00" },
      { id: "10", code: "4300", name: "Donation Income", amount: "0.00" },
      { id: "11", code: "4400", name: "Contribution Income", amount: "300.00" },
    ],
    total: "2116.36",
  },
  expenses: {
    accounts: [{ id: "12", code: "5000", name: "Operating Expenses", amount: "0.00" }],
    total: "0.00",
  },
  total_income: "2116.36",
  total_expenses: "0.00",
  net_income: "2116.36",
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

  const statement = await fetchIncomeStatement("access", "cebu", 1);
  assert.equal(statement.income.accounts[0].balanceCents, 181636);
  assert.equal(statement.income.accounts[4].code, "4400");
  assert.equal(statement.income.accounts[4].balanceCents, 30000);
  assert.equal(statement.income.totalCents, 211636);
  assert.equal(statement.expenses.accounts[0].balanceCents, 0);
  assert.equal(statement.totalExpensesCents, 0);
  assert.equal(statement.netIncomeCents, 211636);
});

test("income statement rejects wrong-cycle and malformed data", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  fetch.mock.mockImplementation(async () => Response.json({ ...response, current_cycle_id: "2" }));
  await assert.rejects(fetchIncomeStatement("access", "cebu", 1), /active cycle/);
  for (const body of [
    { ...response, success: false },
    { ...response, income: { ...response.income, accounts: [{ ...response.income.accounts[0], amount: "invalid" }] } },
    { ...response, net_income: "invalid" },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchIncomeStatement("access", "cebu", 1), /income statement/);
  }
});

test("missing authentication or community prevents an income statement request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchIncomeStatement("", "cebu", 20), /sign in/);
  await assert.rejects(fetchIncomeStatement("access", " ", 20), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});