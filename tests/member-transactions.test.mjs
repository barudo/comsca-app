import assert from "node:assert/strict";
import test from "node:test";
import { buildMemberLedger, describeMemberTransaction, fetchMemberTransactions } from "../src/lib/member-transactions.ts";

const sample = [
  {
    id: "102", group_id: "1", transaction_id: "52", user_id: "11", cycle_id: "20",
    type: "LOAN_DISBURSED", amount: "500.00", description: "Loan disbursement",
    created_at: "2026-10-02T10:30:00.000Z", transaction_occurred_at: "2026-10-02T10:30:00.000Z",
  },
  {
    id: "101", group_id: "1", transaction_id: "51", user_id: "11", cycle_id: "20",
    type: "BUY_SHARE", amount: "100.00", description: "Share purchase",
    created_at: "2026-10-01T12:00:00.000Z", transaction_occurred_at: "2026-10-01T12:00:00.000Z",
  },
];

test("member transactions load from the authenticated account endpoint", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/me/transactions"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, data: sample });
  });

  assert.deepEqual(await fetchMemberTransactions("access", "cebu"), [
    { id: "102", type: "LOAN_DISBURSED", amount: "500.00", description: "Loan disbursement", transactionOccurredAt: "2026-10-02T10:30:00.000Z" },
    { id: "101", type: "BUY_SHARE", amount: "100.00", description: "Share purchase", transactionOccurredAt: "2026-10-01T12:00:00.000Z" },
  ]);
});

test("ledger maps transaction effects into signed category balances", () => {
  const transactions = [
    ...sample.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      transactionOccurredAt: transaction.transaction_occurred_at,
    })),
    { id: "103", type: "LOAN_PAYMENT", amount: "75.00", description: "Loan payment", transactionOccurredAt: null },
    { id: "104", type: "CONTRIBUTION_CHARGED", amount: "20.00", description: "Contribution assessed", transactionOccurredAt: null },
    { id: "105", type: "PAY_CONTRIBUTION", amount: "5.00", description: "Contribution payment", transactionOccurredAt: null },
    { id: "106", type: "PENALTY_CHARGED", amount: "10.00", description: "Penalty charged", transactionOccurredAt: null },
    { id: "107", type: "PENALTY_PAYMENT", amount: "2.00", description: "Penalty payment", transactionOccurredAt: null },
  ];
  const { rows, totals } = buildMemberLedger(transactions);
  assert.equal(rows[0].loan, 50000);
  assert.equal(rows[2].loan, -7500);
  assert.deepEqual(totals, { ownership: 10000, loan: 42500, contribution: 1500, penalty: 800 });
  assert.equal(describeMemberTransaction("LOAN_DISBURSED"), "Loan disbursed");
});

test("malformed transaction responses are rejected", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  fetch.mock.mockImplementation(async () => Response.json({ success: true, data: [{ ...sample[0], amount: "invalid" }] }));
  await assert.rejects(fetchMemberTransactions("access", "cebu"), /Unable to load member transactions/);
  fetch.mock.mockImplementation(async () => Response.json({ success: false, data: [] }, { status: 500 }));
  await assert.rejects(fetchMemberTransactions("access", "cebu"), /Unable to load member transactions/);
});