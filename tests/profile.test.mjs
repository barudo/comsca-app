import assert from "node:assert/strict";
import test from "node:test";
import { updateProfile, updatePassword } from "../src/lib/profile.ts";

test("profile update sends editable fields with authentication and preserves address line breaks", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/users/me"));
    assert.equal(options.method, "PUT");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.deepEqual(JSON.parse(options.body), { first_name: "Maria", family_name: "Santos", address: "House 1\nCebu" });
    return Response.json({ success: true });
  });
  await updateProfile("access", "cebu", { first_name: " Maria ", family_name: "Santos", address: "House 1\nCebu", phone: "ignored" });
});

test("password update sends exactly the two password fields without trimming", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/api/v1/users/me/password"));
    assert.equal(options.method, "PUT");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.headers["x-group-slug"], "cebu");
    assert.deepEqual(JSON.parse(options.body), { new_password: " secret password ", repeat_new_password: " secret password " });
    return new Response(null, { status: 204 });
  });
  await updatePassword("access", "cebu", { new_password: " secret password ", repeat_new_password: " secret password " });
});

test("invalid passwords and missing authentication do not send requests", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Unexpected request"); });
  assert.throws(() => updatePassword("access", "cebu", { new_password: "one", repeat_new_password: "two" }), /do not match/);
  assert.throws(() => updatePassword("access", "cebu", { new_password: "", repeat_new_password: "" }), /Enter a new password/);
  await assert.rejects(updateProfile("", "cebu", { first_name: "M", family_name: "S", address: "" }), /sign in/);
  assert.equal(fetch.mock.callCount(), 0);
});

test("account updates surface API and connection failures", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Password rejected" }, { status: 400 }));
  const password = { new_password: "example", repeat_new_password: "example" };
  await assert.rejects(updatePassword("access", "cebu", password), /Password rejected/);
  fetch.mock.mockImplementation(async () => { throw new TypeError("Network failed"); });
  await assert.rejects(updatePassword("access", "cebu", password), /Unable to connect/);
});
