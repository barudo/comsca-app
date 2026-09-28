import assert from "node:assert/strict";
import test from "node:test";
import { disburseLoan } from "../src/lib/disbursements.ts";

const payment = { user_id: "12", cycle_id: "7", debit: "102", credit: "101", amount: "5000.00", description: "Member loan disbursement" };

test("loan disbursement sends the specified payload with community authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/transactions/disburse-loans"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), payment);
    return Response.json({ success: true });
  });
  await disburseLoan("access", "cebu", payment);
});

test("loan disbursement rejects invalid inputs without sending", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(disburseLoan("", "cebu", payment), /sign in/);
  await assert.rejects(disburseLoan("access", " ", payment), /sign in/);
  for (const change of [{ user_id: "" }, { cycle_id: "" }, { debit: "" }, { credit: "" }, { description: "" }, { amount: "0.00" }, { amount: "-5.00" }, { amount: "5" }, { amount: "NaN" }]) {
    await assert.rejects(disburseLoan("access", "cebu", { ...payment, ...change }), /valid positive amount/);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("loan disbursement surfaces failures without automatically retrying", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Insufficient funds." }, { status: 422 }));
  await assert.rejects(disburseLoan("access", "cebu", payment), /Insufficient funds/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(disburseLoan("access", "cebu", payment), /Check transaction records/);
  assert.equal(fetch.mock.callCount(), 2);
  fetch.mock.mockImplementation(async () => new Response("invalid response"));
  await assert.rejects(disburseLoan("access", "cebu", payment), /could not be confirmed/);
});
