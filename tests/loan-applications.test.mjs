import assert from "node:assert/strict";
import test from "node:test";
import { fetchLoanApplication, submitLoanApplication } from "../src/lib/loan-applications.ts";

const application = {
  id: "101", group_id: "1", user_id: "10", cycle_id: "20",
  amount_desired: "2000.00", amount_disbursed: "0.00", status: "active",
  created_at: "2026-10-10T08:00:00.000Z", updated_at: "2026-10-10T08:00:00.000Z",
};

test("submits the desired amount as a decimal string with authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/me/loans/apply"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), { amount_desired: "2000.00" });
    return Response.json({ success: true });
  });
  await submitLoanApplication("access", "cebu", "2000");
});

test("invalid amounts and missing credentials never submit", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected request"); });
  for (const amount of ["", "0", "-1", "1.001", "NaN", "Infinity", "1e3", "9007199254740992"]) {
    await assert.rejects(submitLoanApplication("access", "cebu", amount), /Enter an amount/);
  }
  await assert.rejects(submitLoanApplication("", "cebu", "10"), /sign in/);
  await assert.rejects(submitLoanApplication("access", "", "10"), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("submission handles empty success, API rejection, and uncertain outcomes", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  await submitLoanApplication("access", "cebu", "10.50");
  fetch.mock.mockImplementation(async () => Response.json({ success: false, error: "An application already exists" }, { status: 409 }));
  await assert.rejects(submitLoanApplication("access", "cebu", "10.50"), /already exists/);
  fetch.mock.mockImplementation(async () => new Response("invalid"));
  await assert.rejects(submitLoanApplication("access", "cebu", "10.50"), /could not be confirmed/);
  fetch.mock.mockImplementation(async () => { throw new TypeError("Network failure"); });
  await assert.rejects(submitLoanApplication("access", "cebu", "10.50"), /Refresh your loan application/);
});

test("loads the current application with community authentication and no caching", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/me/loans/apply"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, loan_application: application });
  });
  assert.deepEqual(await fetchLoanApplication("access", "cebu"), application);
});

test("null means no application, while malformed responses are errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, loan_application: null }));
  assert.equal(await fetchLoanApplication("access", "cebu"), null);
  for (const loan_application of [undefined, {}, { ...application, amount_desired: "invalid" }]) {
    fetch.mock.mockImplementation(async () => Response.json({ success: true, loan_application }));
    await assert.rejects(fetchLoanApplication("access", "cebu"), /invalid/);
  }
});

test("surfaces API and network errors instead of reporting an empty application", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchLoanApplication("access", "cebu"), /Access denied/);
  fetch.mock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(fetchLoanApplication("access", "cebu"), /Unable to load/);
});

test("missing credentials do not send a request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected request"); });
  await assert.rejects(fetchLoanApplication("", "cebu"), /sign in/);
  await assert.rejects(fetchLoanApplication("access", " "), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});
