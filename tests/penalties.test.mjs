import assert from "node:assert/strict";
import test from "node:test";
import { chargePenalty } from "../src/lib/penalties.ts";

const payment = { amount: "500.00", debit: "102", credit: "205" };

test("penalty charge posts amount and selected accounts with community authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/penalties/charge"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), payment);
    return Response.json({ success: true });
  });
  await chargePenalty("access", "cebu", payment);
});

test("penalty charge rejects invalid input without sending and surfaces failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(chargePenalty("", "cebu", payment), /sign in/);
  await assert.rejects(chargePenalty("access", " ", payment), /sign in/);
  for (const change of [{ debit: "" }, { credit: "" }, { amount: "0.00" }, { amount: "-1.00" }, { amount: "5" }]) {
    await assert.rejects(chargePenalty("access", "cebu", { ...payment, ...change }), /valid positive amount/);
  }
  assert.equal(fetch.mock.callCount(), 0);

  fetch.mock.mockImplementation(async () => Response.json({ success: false, error: "Invalid penalty." }, { status: 400 }));
  await assert.rejects(chargePenalty("access", "cebu", payment), /Invalid penalty/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(chargePenalty("access", "cebu", payment), /Check transaction records/);
});