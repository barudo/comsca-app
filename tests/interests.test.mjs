import assert from "node:assert/strict";
import test from "node:test";
import { chargeInterest } from "../src/lib/interests.ts";

const charge = { credit: "205", debit: "102" };

test("interest charge posts the selected credit and debit accounts with community authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/interests/charge"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), charge);
    return Response.json({ success: true });
  });
  await chargeInterest("access", "cebu", charge);
});

test("interest charge validates account IDs and surfaces API failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(chargeInterest("", "cebu", charge), /sign in/);
  await assert.rejects(chargeInterest("access", " ", charge), /sign in/);
  await assert.rejects(chargeInterest("access", "cebu", { ...charge, debit: " " }), /Select credit and debit accounts/);
  await assert.rejects(chargeInterest("access", "cebu", { ...charge, credit: "" }), /Select credit and debit accounts/);
  assert.equal(fetch.mock.callCount(), 0);

  fetch.mock.mockImplementation(async () => Response.json({ success: false, error: "No eligible loans." }, { status: 400 }));
  await assert.rejects(chargeInterest("access", "cebu", charge), /No eligible loans/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(chargeInterest("access", "cebu", charge), /Check transaction records/);
});