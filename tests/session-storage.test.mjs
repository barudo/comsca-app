import assert from "node:assert/strict";
import test from "node:test";
import { readSession, restoreSession, sessionStorageKey } from "../src/lib/auth.ts";

function storage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("a persisted login restores both tokens without extending its expiry", () => {
  const store = storage();
  const session = readSession({ session: { access_token: "access", refresh_token: "refresh", expires_in: 3600 } });
  store.setItem(sessionStorageKey("cebu"), JSON.stringify(session));
  assert.deepEqual(restoreSession(store, "cebu"), session);
  assert.equal(restoreSession(store, "other-community"), null);
  assert.equal(restoreSession(store, ""), null);
});

test("expired, malformed, and relative-only stored sessions are removed", () => {
  const store = storage();
  const key = sessionStorageKey("cebu");
  for (const value of [
    "invalid json", "null", "{}",
    JSON.stringify({ access_token: "access", refresh_token: "refresh", expires_at: 1 }),
    JSON.stringify({ access_token: "access", refresh_token: "refresh", expires_in: 3600 }),
    JSON.stringify({ access_token: "access", refresh_token: "refresh", expires_at: "invalid" }),
  ]) {
    store.setItem(key, value);
    assert.equal(restoreSession(store, "cebu"), null);
    assert.equal(store.getItem(key), null);
  }
});

test("clearing a session prevents it being restored on future navigation", () => {
  const store = storage();
  const key = sessionStorageKey("cebu");
  store.setItem(key, JSON.stringify({ access_token: "access", refresh_token: "refresh" }));
  assert.ok(restoreSession(store, "cebu"));
  store.removeItem(key);
  assert.equal(restoreSession(store, "cebu"), null);
});

test("blocked browser storage does not crash restoration", () => {
  const blocked = { getItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  assert.equal(restoreSession(blocked, "cebu"), null);
});
