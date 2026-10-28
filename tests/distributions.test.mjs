import assert from "node:assert/strict";
import test from "node:test";
import { fetchDistributions } from "../src/lib/distributions.ts";
const row = { id: "1", cycle_id: "cycle/1", user_id: "5", capital_amount: "1000.00", earnings_amount: "100.00", gross_amount: "1100.00", loan_deduction: "200.00", contribution_deduction: "0.00", penalty_deduction: "0.00", other_deduction: "0.00", total_deductions: "200.00", net_amount: "900.00", paid_amount: "250.00", status: "partial" };
const body = { success: true, cycle: { id: "cycle/1", status: "distributing" }, summary: { cycle_id: "cycle/1", status: "distributing", total_capital: "1000.00", net_earnings: "100.00", gross_distribution: "1100.00", total_deductions: "200.00", net_distribution: "900.00", total_paid: "250.00", cash_available: "900.00", cash_shortfall: "0.00", member_count: 1, warnings: [], members: [] }, distributions: [row] };

test("distributions use their own scoped endpoint and preserve partial payment amounts", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/cycles/cycle%2F1/distributions"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(body);
  });
  const data = await fetchDistributions("access", "cebu", "cycle/1");
  assert.equal(data.totals.net_distribution, 90000);
  assert.equal(data.totals.total_paid, 25000);
  assert.equal(data.distributions[0].amounts.paid_amount, 25000);
  assert.equal(data.distributions[0].amounts.other_deduction, 0);
  assert.equal(data.distributions[0].status, "partial");
});

test("distributions support empty lists and warnings", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ ...body, distributions: [], summary: { ...body.summary, warnings: ["Cash shortfall"], member_count: 0 } }));
  const data = await fetchDistributions("access", "cebu", "cycle/1");
  assert.deepEqual(data.distributions, []);
  assert.deepEqual(data.warnings, ["Cash shortfall"]);
});

test("distributions reject wrong cycles and invalid monetary data", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const invalid of [
    { ...body, cycle: { id: "2", status: "distributing" } },
    { ...body, summary: { ...body.summary, cycle_id: "2" } },
    { ...body, summary: { ...body.summary, total_paid: null } },
    ...[{ cycle_id: "2" }, { net_amount: "invalid" }, { paid_amount: null }].map((fields) => ({ ...body, distributions: [{ ...row, ...fields }] })),
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(invalid));
    await assert.rejects(fetchDistributions("access", "cebu", "cycle/1"));
  }
});

test("distributions guard authentication and surface API errors", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchDistributions("", "cebu", "1"), /sign in/);
  await assert.rejects(fetchDistributions("access", " ", "1"), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(fetchDistributions("access", "cebu", "1"), /Access denied/);
});
