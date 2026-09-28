import assert from "node:assert/strict";
import test from "node:test";
import { chargeContribution } from "../src/lib/contributions.ts";

const payment = { debit: "102", credit: "101", amount: "5000.00", description: "Member contribution charge" };

test("contribution charge sends the specified payload with community authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/contributions/charge"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), payment);
    return Response.json({ success: true });
  });
  await chargeContribution("access", "cebu", payment);
});

test("contribution charge rejects invalid inputs without sending", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(chargeContribution("", "cebu", payment), /sign in/);
  await assert.rejects(chargeContribution("access", " ", payment), /sign in/);
  for (const change of [{ debit: "" }, { credit: "" }, { amount: "0.00" }, { amount: "-5.00" }, { amount: "5" }, { amount: "NaN" }]) {
    await assert.rejects(chargeContribution("access", "cebu", { ...payment, ...change }), /valid positive amount/);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test("contribution charge surfaces failures without automatically retrying", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Insufficient funds." }, { status: 422 }));
  await assert.rejects(chargeContribution("access", "cebu", payment), /Insufficient funds/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(chargeContribution("access", "cebu", payment), /Check transaction records/);
  assert.equal(fetch.mock.callCount(), 2);
  fetch.mock.mockImplementation(async () => new Response("invalid response"));
  await assert.rejects(chargeContribution("access", "cebu", payment), /could not be confirmed/);
});
