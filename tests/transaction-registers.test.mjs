import assert from "node:assert/strict";
import test from "node:test";
import { fetchTransactionRegisters } from "../src/lib/transaction-registers.ts";

for (const document of ["PR", "DV", "JV"]) {
  test(`registers request ${document} with community authentication`, async (t) => {
    const rows = [{ id: 10, document_number: `${document}-001`, amount: "100.00" }];
    t.mock.method(globalThis, "fetch", async (url, options) => {
      assert.ok(url.endsWith(`/api/v1/transactions/registers?document=${document}&page=1`));
      assert.equal(options.method, "GET");
      assert.equal(options.headers.Authorization, "Bearer access");
      assert.equal(options.headers["x-group-slug"], "cebu");
      assert.equal(options.cache, "no-store");
      return Response.json({ success: true, data: rows });
    });
    assert.deepEqual((await fetchTransactionRegisters("access", "cebu", document)).documents, rows);
  });
}

test("registers handle empty data, API errors, and malformed documents", async (t) => {
  const mock = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, data: [] }));
  assert.deepEqual((await fetchTransactionRegisters("access", "cebu", "PR")).documents, []);
  mock.mock.mockImplementation(async () => Response.json({ success: false, error: "Access denied" }, { status: 403 }));
  await assert.rejects(fetchTransactionRegisters("access", "cebu", "PR"), /Access denied/);
  mock.mock.mockImplementation(async () => Response.json({ success: true, data: [null] }));
  await assert.rejects(fetchTransactionRegisters("access", "cebu", "PR"), /Unable to read/);
});

test("registers do not request without authentication and community", async (t) => {
  const mock = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchTransactionRegisters("", "cebu", "PR"), /sign in/);
  await assert.rejects(fetchTransactionRegisters("access", "", "PR"), /sign in/);
  assert.equal(mock.mock.callCount(), 0);
});

 test("registers preserve pagination and request the selected page", async (t) => {
  const pagination = { page: 2, per_page: 2, total: 12, total_pages: 6 };
  t.mock.method(globalThis, "fetch", async (url) => {
    assert.ok(url.endsWith("document=JV&page=2"));
    return Response.json({ success: true, data: [{ id: "152", document_number: "12", amount: "2000.00", occurred_at: "2026-10-15T08:30:00.000Z", expense_payment_status: "UNPAID" }], pagination });
  });
  const result = await fetchTransactionRegisters("access", "cebu", "JV", undefined, 2);
  assert.deepEqual(result.pagination, pagination);
  assert.equal(result.documents[0].document_number, "12");
});
