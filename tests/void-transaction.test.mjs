import assert from "node:assert/strict";
import test from "node:test";
import { voidTransaction } from "../src/lib/void-transaction.ts";

test("void deletes the selected transaction with community authentication", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/transactions/tx%2F42"));
    assert.equal(options.method, "DELETE");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ success: true });
  });
  await voidTransaction("access", "cebu", "tx/42");
});

test("void supports no-content success and reports API and network failures", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => new Response(null, { status: 204 }));
  await voidTransaction("access", "cebu", "42");
  for (const status of [200, 403]) {
    mock.mock.mockImplementation(async () => Response.json({ success: false, error: "Cannot void this transaction" }, { status }));
    await assert.rejects(voidTransaction("access", "cebu", "42"), /Cannot void/);
  }
  mock.mock.mockImplementation(async () => new Response("Unavailable", { status: 502 }));
  await assert.rejects(voidTransaction("access", "cebu", "42"), /could not be confirmed/);
  mock.mock.mockImplementation(async () => { throw new TypeError("Failed to fetch"); });
  await assert.rejects(voidTransaction("access", "cebu", "42"), /could not be confirmed/);
});

test("void rejects missing authentication, community, or ID before sending a request", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  await assert.rejects(voidTransaction("", "cebu", "42"), /sign in/);
  await assert.rejects(voidTransaction("access", " ", "42"), /sign in/);
  await assert.rejects(voidTransaction("access", "cebu", " "), /transaction ID/);
  assert.equal(mock.mock.callCount(), 0);
});
