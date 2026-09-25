import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentCycle } from "../src/lib/cycle-state.ts";

test("empty and completed history have no current cycle", () => {
  assert.equal(getCurrentCycle([]), null);
  assert.equal(getCurrentCycle([{ id: 1, status: "INACTIVE" }, { id: 2, status: "CLOSED" }]), null);
});

test("recognizes draft, active, and distributing cycles regardless of case or whitespace", () => {
  for (const status of ["draft", "active", "distributing"]) {
    const cycle = { id: 1, status: ` ${status.toUpperCase()} ` };
    assert.deepEqual(getCurrentCycle([cycle]), { cycle, status });
  }
});

test("distribution and active savings take precedence over a draft regardless of list order", () => {
  const draft = { id: 1, status: "DRAFT" };
  const active = { id: 2, status: "ACTIVE" };
  const distributing = { id: 3, status: "DISTRIBUTING" };
  assert.equal(getCurrentCycle([draft, active]).cycle.id, 2);
  assert.equal(getCurrentCycle([draft, active, distributing]).cycle.id, 3);
  assert.equal(getCurrentCycle([distributing, active, draft]).cycle.id, 3);
});
