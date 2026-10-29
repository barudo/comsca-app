import assert from "node:assert/strict";
import test from "node:test";
import { fetchPayouts } from "../src/lib/payouts.ts";

const payout = {
  id: "1", group_id: "2", cycle_id: "cycle/1", user_id: "5", transaction_id: "101",
  debit: "20", credit: "12", amount: "250.00", idempotency_key: "member-5-payment-1",
  created_at: "2026-10-28T08:00:00.000Z",
};
const body = { success: true, cycle: { id: "cycle/1", status: "distributing" }, payouts: [payout] };

test("payouts GET encodes cycle IDs and includes authentication and community scope", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/cycles/cycle%2F1/payouts"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json(body);
  });
  assert.deepEqual(await fetchPayouts("access", "cebu", "cycle/1"), [{
    id: "1", groupId: "2", cycleId: "cycle/1", userId: "5", transactionId: "101", debit: "20", credit: "12",
    amountCents: 25000, idempotencyKey: "member-5-payment-1", createdAt: payout.created_at,
  }]);
});

test("payouts allow empty lists and reject malformed data or mismatched cycles", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ ...body, payouts: [] }));
  assert.deepEqual(await fetchPayouts("access", "cebu", "cycle/1"), []);
  for (const invalid of [
    { ...body, payouts: null },
    { ...body, cycle: { id: "2", status: "distributing" } },
    { ...body, cycle: { id: "cycle/1", status: "active" } },
    ...[{ cycle_id: "2" }, { amount: "invalid" }, { amount: null }, { created_at: "invalid" }, { user_id: null }]
      .map((fields) => ({ ...body, payouts: [{ ...payout, ...fields }] })),
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(invalid));
    await assert.rejects(fetchPayouts("access", "cebu", "cycle/1"));
  }
});

test("payouts surface backend failures and do not fetch without credentials", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchPayouts("", "cebu", "1"), /sign in/);
  await assert.rejects(fetchPayouts("access", " ", "1"), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(fetchPayouts("access", "cebu", "1"), /Access denied/);
});

test("payout requests respect cancellation", async (t) => {
  const controller = new AbortController();
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    controller.abort();
    assert.equal(options.signal.aborted, true);
    options.signal.throwIfAborted();
  });
  await assert.rejects(fetchPayouts("access", "cebu", "1", controller.signal), { name: "AbortError" });
});

test("payout submission uses the singular cycle endpoint and preserves the retry key", async (t) => {
  const { postPayout } = await import("../src/lib/payouts.ts");
  const payment = { user_id: "5", credit: "12", amount: "250.00", idempotency_key: "cycle-1-member-5-payment-1" };
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/cycle/cycle%2F1/payouts"));
    assert.equal(options.method, "POST");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.headers["Content-Type"], "application/json");
    requests.push(JSON.parse(options.body));
    if (requests.length === 1) throw new Error("Network failure");
    return Response.json({ success: true });
  });
  await assert.rejects(postPayout("access", "cebu", "cycle/1", payment));
  await postPayout("access", "cebu", "cycle/1", payment);
  assert.deepEqual(requests, [payment, payment]);
});

test("payout submission rejects invalid input before fetching and surfaces server errors", async (t) => {
  const { postPayout } = await import("../src/lib/payouts.ts");
  const payment = { user_id: "5", credit: "12", amount: "250.00", idempotency_key: "payment-1" };
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Insufficient cash" }, { status: 409 }));
  for (const fields of [{ amount: "0.00" }, { amount: "-1.00" }, { amount: "1.001" }, { credit: "" }, { idempotency_key: "" }]) {
    await assert.rejects(postPayout("access", "cebu", "1", { ...payment, ...fields }));
  }
  await assert.rejects(postPayout("", "cebu", "1", payment));
  assert.equal(fetch.mock.callCount(), 0);
  await assert.rejects(postPayout("access", "cebu", "1", payment), /Insufficient cash/);
});
