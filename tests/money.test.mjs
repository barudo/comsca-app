import assert from "node:assert/strict";
import test from "node:test";
import { amountToCents } from "../src/lib/money.ts";

test("decimal payment amounts are normalized to integer cents", () => {
  assert.equal(amountToCents("2185.45"), 218545);
  assert.equal(amountToCents("0.01"), 1);
  assert.equal(amountToCents("1200.50"), 120050);
});