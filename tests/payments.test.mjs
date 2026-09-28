import assert from "node:assert/strict";
import test from "node:test";
import { postPayments } from "../src/lib/payments.ts";

const entries = [
  { type: "LOAN_PAYMENT", debit: "101", credit: "102", amount: "600.00" },
  { type: "BUY_SHARE", debit: "101", credit: "106", amount: "300.00" },
  { type: "PENALTY_PAYMENT", debit: "101", credit: "107", amount: "50.00" },
];

test("checkout posts the payment contract with community authentication", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/transactions/payments"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), { user_id: "42", cycle_id: "7", entries });
    return Response.json({ success: true });
  });
  await postPayments("access", "cebu", 42, 7, entries);
  assert.equal(fetch.mock.callCount(), 1);
});

test("checkout rejects incomplete entries before sending", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(postPayments("", "cebu", 42, 7, entries), /sign in/);
  await assert.rejects(postPayments("access", "cebu", 42, 7, []), /at least one/);
  for (const entry of [
    { ...entries[0], debit: "" }, { ...entries[0], credit: "" },
    { ...entries[0], type: "UNKNOWN" }, { ...entries[0], amount: "600" },
    { ...entries[0], amount: "-1.00" },
  ]) await assert.rejects(postPayments("access", "cebu", 42, 7, [entry]), /valid type/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("checkout surfaces server errors and never automatically retries an uncertain payment", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Cycle is closed." }, { status: 409 }));
  await assert.rejects(postPayments("access", "cebu", 42, 7, entries), /Cycle is closed/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(postPayments("access", "cebu", 42, 7, entries), /Check transaction records/);
  assert.equal(fetch.mock.callCount(), 2);
  fetch.mock.mockImplementation(async () => new Response("bad response", { status: 200 }));
  await assert.rejects(postPayments("access", "cebu", 42, 7, entries), /could not be confirmed/);
});
