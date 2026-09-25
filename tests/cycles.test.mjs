import assert from "node:assert/strict";
import test from "node:test";
import { activateCycle, canAddCycle, createCycle, createDraftCycle, fetchCycles, saveDraftCycle } from "../src/lib/cycles.ts";
import { getCurrentCycle } from "../src/lib/cycle-state.ts";

const payload = { interest_rate: "2.500000", interest_period: "MONTHLY", interest_method: "COMPOUND", cost_per_share: "100.00", status: "draft" };

test("no matching current cycle produces the empty page state", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: true, cycles: [], current_cycle_id: null,
  }));
  const cycles = await fetchCycles("access", "cebu");
  assert.deepEqual(cycles, []);
  assert.equal(getCurrentCycle(cycles), null);
});

test("the API-selected latest cycle drives each current cycle state", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const status of ["draft", "distributing", "active"]) {
    const cycle = { id: 42, status };
    fetch.mock.mockImplementation(async () => Response.json({
      success: true, cycles: [cycle], current_cycle_id: 42,
    }));
    assert.deepEqual(getCurrentCycle(await fetchCycles("access", "cebu")), { cycle, status });
  }
});

test("cycles load with authentication and community scope", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/cycles"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, cycles: [{ id: "1", status: "ACTIVE" }] });
  });
  assert.deepEqual(await fetchCycles("access", "cebu"), [{ id: "1", status: "ACTIVE" }]);
});

test("cycle details retain API amounts and text for display and draft editing", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: true, current_cycle_id: 9, cycles: [{
      id: 9, status: "draft", name: "2026 to 2027", description: "Community savings",
      interest_rate: "3.000000", interest_method: "SIMPLE", starting_subscription: "500.00",
      maximum_monthly_shares: 10, cost_per_share: "100.00", absence_penalty: 0,
      required_monthly_contribution: "25.50",
    }],
  }));
  assert.deepEqual(await fetchCycles("access", "cebu"), [{
    id: 9, status: "draft", details: {
      name: "2026 to 2027", description: "Community savings", interestRate: "3.000000",
      interestType: "simple", startingSubscription: "500.00", maximumMonthlyShares: 10,
      costPerShare: "100.00", absencePenalty: "0", requiredMonthlyContribution: "25.50",
    },
  }]);
});

test("missing cycle amounts are not displayed as invented zero values", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: true, cycles: [{ id: 9, status: "draft", name: "Draft", cost_per_share: null, absence_penalty: "", interest_method: "UNKNOWN" }],
  }));
  assert.deepEqual(await fetchCycles("access", "cebu"), [{ id: 9, status: "draft", details: { name: "Draft" } }]);
});

test("creation is blocked when any cycle is active", async (t) => {
  assert.equal(canAddCycle([]), true);
  assert.equal(canAddCycle([{ id: 1, status: "INACTIVE" }]), true);
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({
    success: true, cycles: [{ id: 1, status: "INACTIVE" }, { id: 2, status: "ACTIVE" }],
  }));
  await assert.rejects(createCycle("access", "cebu", payload), /active cycle already exists/);
  assert.equal(fetch.mock.callCount(), 1);
});

test("creation checks the latest cycles before posting the supplied fields", async (t) => {
  const methods = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    methods.push(options.method);
    if (options.method === "GET") return Response.json({ success: true, cycles: [] });
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.deepEqual(JSON.parse(options.body), payload);
    return Response.json({ success: true });
  });
  await createCycle("access", "cebu", payload);
  assert.deepEqual(methods, ["GET", "POST"]);
});

test("unreadable cycle lists prevent creation", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const body of [{ success: false }, { success: true }, { success: true, cycles: [{ id: 1 }] }]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(createCycle("access", "cebu", payload));
  }
  assert.equal(fetch.mock.callCount(), 3);
});

test("invalid creation values are rejected before making a request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const fields of [
    { interest_rate: "-1" }, { interest_rate: "" }, { interest_rate: "2.1234567" },
    { cost_per_share: "0" }, { cost_per_share: "100.001" }, { status: "ACTIVE" },
  ]) {
    await assert.rejects(createCycle("access", "cebu", { ...payload, ...fields }), /valid interest rate/);
  }
  assert.equal(fetch.mock.callCount(), 0);
  assert.equal(canAddCycle([{ id: 1, status: "active" }]), false);
});

const draftDetails = {
  name: "2026 to 2027", description: "Shared funds", interestRate: "3",
  interestType: "simple", startingSubscription: "500.00", maximumMonthlyShares: 10,
  costPerShare: "100.00", absencePenalty: "0", requiredMonthlyContribution: "25.50",
};
const draftPayload = {
  name: "2026 to 2027", description: "Shared funds", interest_rate: "3",
  interest_period: "MONTHLY", interest_method: "SIMPLE", starting_subscription: "500.00",
  maximum_monthly_shares: 10, cost_per_share: "100.00", absence_penalty: "0",
  required_monthly_contribution: "25.50",
};

test("draft edits PUT all form fields to the scoped cycle endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/cycles/42"));
    assert.equal(options.method, "PUT");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    assert.deepEqual(JSON.parse(options.body), draftPayload);
    return Response.json({ success: true });
  });
  await saveDraftCycle("access", "cebu", 42, draftDetails);
});

test("activation PUT sends only the active status and encodes the cycle ID", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/cycles/cycle%2F42"));
    assert.equal(options.method, "PUT");
    assert.deepEqual(JSON.parse(options.body), { status: "active" });
    return Response.json({ success: true });
  });
  await activateCycle("access", "cebu", "cycle/42");
});

test("draft creation posts form details instead of creating a temporary ID", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/cycles"));
    assert.equal(options.method, "POST");
    assert.deepEqual(JSON.parse(options.body), { ...draftPayload, status: "draft" });
    return Response.json({ success: true });
  });
  await createDraftCycle("access", "cebu", draftDetails);
});

test("failed draft updates and activation surface backend errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Cycle is no longer a draft." }, { status: 409 }));
  await assert.rejects(saveDraftCycle("access", "cebu", 42, draftDetails), /no longer a draft/);
  await assert.rejects(activateCycle("access", "cebu", 42), /no longer a draft/);
});
