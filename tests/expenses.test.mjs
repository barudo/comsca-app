import assert from "node:assert/strict";
import test from "node:test";
import { postExpense } from "../src/lib/expenses.ts";

const expense = { amount: "25.00", description: "Office supplies", debit: "101", credit: "205" };

test("expense posts the requested contract with community authentication", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/transactions/add-expense"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), expense);
    return Response.json({ success: true });
  });
  await postExpense("access", "cebu", expense);
  assert.equal(fetch.mock.callCount(), 1);
});

test("expense rejects invalid input before sending", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(postExpense("", "cebu", expense), /sign in/);
  for (const invalid of [
    { ...expense, amount: "0.00" },
    { ...expense, amount: "25" },
    { ...expense, description: " " },
    { ...expense, debit: "" },
    { ...expense, credit: "" },
  ]) await assert.rejects(postExpense("access", "cebu", invalid), /valid amount and description/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("expense surfaces server errors and does not retry uncertain submissions", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Cycle is closed." }, { status: 409 }));
  await assert.rejects(postExpense("access", "cebu", expense), /Cycle is closed/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(postExpense("access", "cebu", expense), /Check transaction records/);
  assert.equal(fetch.mock.callCount(), 2);
});

test("expenses GET uses community authentication and normalizes records", async (t) => {
  const { fetchExpenses } = await import("../src/lib/expenses.ts");
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/transactions/expenses"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, data: [{ id: 1, description: "Supplies", amount: "25.50" }] });
  });
  assert.deepEqual(await fetchExpenses("access", "cebu"), [{ id: "1", description: "Supplies", amount: "25.50" }]);
});

test("expenses GET rejects malformed amounts and surfaces API errors", async (t) => {
  const { fetchExpenses } = await import("../src/lib/expenses.ts");
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, data: [{ id: 1, amount: "invalid" }] }));
  await assert.rejects(fetchExpenses("access", "cebu"), /Unable to load expenses/);
  mock.mock.mockImplementation(async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchExpenses("access", "cebu"), /Access denied/);
});
