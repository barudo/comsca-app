import assert from "node:assert/strict";
import test from "node:test";
import { canAddCycle, createCycle, fetchCycles } from "../src/lib/cycles.ts";

const payload = { interest_rate: "2.500000", interest_period: "MONTHLY", interest_method: "COMPOUND", cost_per_share: "100.00", status: "draft" };

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
