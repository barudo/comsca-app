import assert from "node:assert/strict";
import test from "node:test";
import { fetchDashboard } from "../src/lib/dashboard.ts";

const summary = {
  success: true,
  current_cycle_id: "20",
  cash_on_hand: "240.28",
  outstanding_loans: "77.57",
  total_fund_value: "337.65",
  share_capital: "300.25",
  contributions_collected: "10.10",
  contributions_due: "19.80",
  active_members: 2,
};

test("dashboard summary loads from the authenticated community endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/dashboard"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(summary);
  });

  assert.deepEqual(await fetchDashboard("access", "cebu"), {
    cash_on_hand: "240.28",
    outstanding_loans: "77.57",
    total_fund_value: "337.65",
    share_capital: "300.25",
    contributions_collected: "10.10",
    contributions_due: "19.80",
    active_members: 2,
  });
});

test("unreadable dashboard summaries are rejected", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const body of [
    { ...summary, success: false },
    { ...summary, cash_on_hand: "not an amount" },
    { ...summary, active_members: -1 },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchDashboard("access", "cebu"), /Unable to load dashboard data/);
  }
});