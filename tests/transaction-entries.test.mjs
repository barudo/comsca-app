import assert from "node:assert/strict";
import test from "node:test";
import { fetchTransactionEntries } from "../src/lib/transaction-entries.ts";

test("entries request the selected transaction with community authentication and cancellation", async (t) => {
  const controller = new AbortController();
  const entries = [{ id: 1, type: "BUY_SHARE", amount: "100.00", debit: "Cash" }];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/transactions/tx%2F42/entries"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    controller.abort();
    assert.equal(options.signal.aborted, true);
    return Response.json({ success: true, data: entries });
  });
  assert.deepEqual(await fetchTransactionEntries("access", "cebu", "tx/42", controller.signal), entries);
});

test("entries handle empty responses, API errors, and malformed data", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, data: [] }));
  assert.deepEqual(await fetchTransactionEntries("access", "cebu", "42"), []);
  mock.mock.mockImplementation(async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchTransactionEntries("access", "cebu", "42"), /Access denied/);
  for (const data of [null, {}, [null], [[]]]) {
    mock.mock.mockImplementation(async () => Response.json({ success: true, data }));
    await assert.rejects(fetchTransactionEntries("access", "cebu", "42"), /Unable to/);
  }
});

test("entries require authentication, community, and transaction ID before requesting", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchTransactionEntries("", "cebu", "42"), /sign in/);
  await assert.rejects(fetchTransactionEntries("access", "", "42"), /sign in/);
  await assert.rejects(fetchTransactionEntries("access", "cebu", ""), /transaction ID/);
  assert.equal(mock.mock.callCount(), 0);
});
