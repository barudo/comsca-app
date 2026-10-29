import assert from "node:assert/strict";
import test from "node:test";
import { fetchMyPayout } from "../src/lib/distributions.ts";
const distribution = {
  cycle_id: "1", user_id: "5", capital_amount: "1000.00", earnings_amount: "100.00", gross_amount: "1100.00",
  loan_deduction: "200.00", contribution_deduction: "0.00", penalty_deduction: "0.00", other_deduction: "0.00",
  total_deductions: "200.00", net_amount: "900.00", paid_amount: "250.00", remaining_amount: "650.00", status: "partial",
  user: { first_name: "Juan", family_name: "Dela Cruz" },
};
const body = { success: true, cycle: { id: "1", status: "distributing" }, distribution };
test("personal payout uses authenticated me endpoint and reads name and remaining amount", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/me/payouts"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(body);
  });
  const result = await fetchMyPayout("access", "cebu", 1);
  assert.equal(result.fullName, "Juan Dela Cruz");
  assert.equal(result.remainingCents, 65000);
  assert.equal(result.amounts.paid_amount, 25000);
  assert.equal(result.status, "partial");
});
test("personal payout handles no distribution and rejects mismatched or malformed results", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ ...body, distribution: null }));
  assert.equal(await fetchMyPayout("access", "cebu", 1), null);
  for (const invalid of [
    { ...body, cycle: { id: "2", status: "distributing" } },
    { ...body, cycle: { id: "1", status: "active" } },
    ...[{ cycle_id: "2" }, { remaining_amount: "bad" }, { paid_amount: null }].map((fields) => ({ ...body, distribution: { ...distribution, ...fields } })),
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(invalid));
    await assert.rejects(fetchMyPayout("access", "cebu", 1));
  }
});
test("personal payout checks credentials and surfaces backend errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchMyPayout("", "cebu", 1), /sign in/);
  await assert.rejects(fetchMyPayout("access", " ", 1), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(fetchMyPayout("access", "cebu", 1), /Access denied/);
});
