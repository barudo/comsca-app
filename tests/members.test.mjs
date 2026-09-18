import assert from "node:assert/strict";
import test from "node:test";
import { fetchMembers } from "../src/lib/members.ts";

test("members requests are authenticated, community scoped, and uncached", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/groups/users"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, users: [
      { id: 1, name: "Maria", email: "maria@example.com", phone: "09171234567", private_field: "omitted" },
      { id: 2, name: "Juan" },
    ] });
  });
  assert.deepEqual(await fetchMembers("access", "cebu"), [
    { id: 1, name: "Maria", email: "maria@example.com", phone: "09171234567" },
    { id: 2, name: "Juan", email: null, phone: null },
  ]);
});

test("empty results succeed while failed or malformed responses reject", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: true, users: [] }));
  assert.deepEqual(await fetchMembers("access", "cebu"), []);
  for (const body of [null, { success: false }, { success: true }, { success: true, users: [null] }]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchMembers("access", "cebu"), /Unable to load members/);
  }
  fetch.mock.mockImplementation(async () => Response.json({ success: true, users: [] }, { status: 403 }));
  await assert.rejects(fetchMembers("access", "cebu"), /Unable to load members/);
});

test("missing authentication or community prevents a members request", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  await assert.rejects(fetchMembers("", "cebu"), /sign in/);
  await assert.rejects(fetchMembers("access", " "), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});
