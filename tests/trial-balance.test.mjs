import assert from "node:assert/strict";
import test from "node:test";
import { fetchTrialBalance } from "../src/lib/trial-balance.ts";

const response = {
  success: true,
  current_cycle_id: "20",
  accounts: [
    { id: "101", code: "1000", name: "Cash", type: "ASSET", total_debits: "1500.00", total_credits: "250.00", debit_balance: "1250.00", credit_balance: "0.00" },
    { id: "102", code: "1100", name: "Loans receivable", type: "ASSET", total_debits: "500.00", total_credits: "100.00", debit_balance: "400.00", credit_balance: "0.00" },
  ],
  summary: { total_debits: "1750.00", total_credits: "1750.00", difference: "0.00" },
};

test("trial balance uses the authenticated community-scoped uncached request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/accounting/trial-balance"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(response);
  });

  const result = await fetchTrialBalance("access", "cebu", 20);
  assert.equal(result.accounts[0].totalDebitsCents, 150000);
  assert.equal(result.accounts[0].debitBalanceCents, 125000);
  assert.equal(result.accounts[1].type, "ASSET");
  assert.deepEqual(result.summary, { totalDebitsCents: 175000, totalCreditsCents: 175000, differenceCents: 0 });
});

test("trial balance rejects wrong-cycle and malformed responses", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  fetch.mock.mockImplementation(async () => Response.json({ ...response, current_cycle_id: "21" }));
  await assert.rejects(fetchTrialBalance("access", "cebu", 20), /active cycle/);
  for (const body of [
    { ...response, success: false },
    { ...response, accounts: [{ ...response.accounts[0], debit_balance: "invalid" }] },
    { ...response, summary: { ...response.summary, difference: "invalid" } },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchTrialBalance("access", "cebu", 20), /trial balance/);
  }
});

test("missing authentication or community prevents a trial balance request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchTrialBalance("", "cebu", 20), /sign in/);
  await assert.rejects(fetchTrialBalance("access", " ", 20), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});