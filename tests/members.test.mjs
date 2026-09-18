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
      { id: 1, first_name: " Maria ", family_name: " Santos ", email: "maria@example.com", phone: "09171234567", private_field: "omitted" },
      { id: 2, first_name: "Juan", family_name: null },
    ] });
  });
  assert.deepEqual(await fetchMembers("access", "cebu"), [
    { id: 1, name: "Maria Santos", email: "maria@example.com", phone: "09171234567" },
    { id: 2, name: "Juan", email: null, phone: null },
  ]);
});

test("members accepts the groups/users response with split names and nullable contact details", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    success: true,
    current_cycle_id: null,
    users: [{
      id: "6", group_id: "6", first_name: "Marie Ronaldine", family_name: "Villocido",
      username: null, email: null, phone: "+639499981817", address: null, role: "OWNER",
      created_at: "2026-09-12T07:42:58.033Z", updated_at: "2026-09-12T07:42:58.033Z",
      is_current_cycle_member: false,
    }],
  }));
  assert.deepEqual(await fetchMembers("access", "cebu"), [{
    id: "6", name: "Marie Ronaldine Villocido", email: null, phone: "+639499981817",
  }]);
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
