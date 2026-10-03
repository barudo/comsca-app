import assert from "node:assert/strict";
import test from "node:test";
import { postDonation } from "../src/lib/donations.ts";

const donation = { amount: "25.00", description: "Community gift", debit: "101", credit: "205" };

test("donation posts the requested contract with community authentication", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/transactions/donations"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), donation);
    return Response.json({ success: true });
  });
  await postDonation("access", "cebu", donation);
  assert.equal(fetch.mock.callCount(), 1);
});

test("donation rejects invalid input before sending", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(postDonation("", "cebu", donation), /sign in/);
  for (const invalid of [
    { ...donation, amount: "0.00" },
    { ...donation, amount: "25" },
    { ...donation, description: " " },
    { ...donation, debit: "" },
    { ...donation, credit: "" },
  ]) await assert.rejects(postDonation("access", "cebu", invalid), /valid amount and description/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("donation surfaces server errors and does not retry uncertain submissions", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Cycle is closed." }, { status: 409 }));
  await assert.rejects(postDonation("access", "cebu", donation), /Cycle is closed/);
  fetch.mock.mockImplementation(async () => { throw new Error("Network error"); });
  await assert.rejects(postDonation("access", "cebu", donation), /Check transaction records/);
  assert.equal(fetch.mock.callCount(), 2);
});