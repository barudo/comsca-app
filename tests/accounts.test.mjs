import assert from "node:assert/strict";
import test from "node:test";
import { fetchCycleAccounts } from "../src/lib/accounts.ts";

test("cycle accounts use an authenticated community-scoped uncached request", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/cycles/accounts"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, current_cycle_id: "7", accounts: [
      { id: 1, name: "Cash", type: "asset" },
      { id: "2", name: "Share Capital", type: " EQUITY " },
      { id: 3, name: "Income", type: "REVENUE" },
    ] });
  });
  assert.deepEqual(await fetchCycleAccounts("access", "cebu", 7), [
    { id: 1, name: "Cash", type: "ASSET" },
    { id: "2", name: "Share Capital", type: "EQUITY" },
    { id: 3, name: "Income", type: "REVENUE" },
  ]);
});

test("cycle accounts reject missing credentials and invalid response data", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchCycleAccounts("", "cebu", 7), /sign in/);
  await assert.rejects(fetchCycleAccounts("access", " ", 7), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
  for (const body of [
    { success: false }, { success: true, current_cycle_id: "7", accounts: {} },
    { success: true, current_cycle_id: "7", accounts: [null] },
    { success: true, current_cycle_id: "7", accounts: [{ id: 1, name: "Cash" }] },
    { success: true, current_cycle_id: "7", accounts: [{ id: "", name: "Cash", type: "ASSET" }] },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchCycleAccounts("access", "cebu", 7), /cycle accounts/);
  }
  fetch.mock.mockImplementation(async () => Response.json({ success: true, current_cycle_id: "7", accounts: [] }));
  assert.deepEqual(await fetchCycleAccounts("access", "cebu", 7), []);
});


test("accounts must belong to the active cycle", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const body of [
    { success: true, accounts: [] },
    { success: true, current_cycle_id: "8", accounts: [] },
    { success: true, current_cycle_id: "7", accounts: [{ id: "101", cycle_id: "8", name: "Cash", type: "ASSET" }] },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchCycleAccounts("access", "cebu", 7), /cycle/i);
  }
  fetch.mock.mockImplementation(async () => Response.json({ success: true, current_cycle_id: "7", accounts: [
    { id: "101", group_id: "1", cycle_id: "7", code: "1000", name: "Cash", type: "ASSET" },
    { id: "102", group_id: "1", cycle_id: "7", code: "1100", name: "Loans Receivable", type: "ASSET" },
  ] }));
  assert.deepEqual(await fetchCycleAccounts("access", "cebu", 7), [
    { id: "101", code: "1000", name: "Cash", type: "ASSET" },
    { id: "102", code: "1100", name: "Loans Receivable", type: "ASSET" },
  ]);
});
