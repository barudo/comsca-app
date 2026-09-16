import assert from "node:assert/strict";
import test from "node:test";
import { authRequest, fetchCurrentUser, readSession } from "../src/lib/auth.ts";

test("current user uses an authenticated uncached GET and reads the user's name", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.ok(url.endsWith("/users/me"));
    assert.equal(options.method, "GET");
    assert.equal(options.headers.Authorization, "Bearer access");
    assert.equal(options.cache, "no-store");
    return Response.json({ success: true, user: { name: " Maria Santos " }, group: { name: "Community" } });
  });
  assert.deepEqual(await fetchCurrentUser("access"), { name: "Maria Santos" });
});

test("current user rejects failed and malformed profile responses", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch");
  for (const body of [
    { success: false, user: { name: "Maria" } },
    { success: true },
    { success: true, user: { name: " " } },
    { success: true, user: { name: 123 } },
  ]) {
    fetch.mock.mockImplementation(async () => Response.json(body));
    await assert.rejects(fetchCurrentUser("access"), /Unable to load your profile/);
  }
  fetch.mock.mockImplementation(async () => Response.json({ success: true, user: { name: "Maria" } }, { status: 401 }));
  await assert.rejects(fetchCurrentUser("access"), /Unable to load your profile/);
});

test("login endpoints send JSON and preserve leading zeros in OTPs", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, ...options });
    return Response.json({ success: true });
  });
  for (const [endpoint, payload] of [
    ["password", { phone: "09171234567", password: "example" }],
    ["otp/request", { phone: "09171234567" }],
    ["otp/verify", { phone: "09171234567", otp: "012345" }],
  ]) {
    await authRequest(endpoint, payload);
    const call = calls.at(-1);
    assert.ok(call.url.endsWith(`/auth/login/${endpoint}`));
    assert.equal(call.method, "POST");
    assert.deepEqual(JSON.parse(call.body), payload);
  }
});

test("backend failures are surfaced and invalid responses rejected", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ success: false, error: "Invalid or expired verification code" }, { status: 400 }));
  await assert.rejects(authRequest("otp/verify", {}), /Invalid or expired verification code/);
});

test("sessions require both tokens and reject expired sessions", () => {
  assert.throws(() => readSession({}), /Invalid sign-in response/);
  assert.throws(() => readSession({ session: { access_token: "access" } }), /Invalid sign-in response/);
  assert.throws(() => readSession({ session: { access_token: "access", refresh_token: "refresh", expires_at: 1 } }), /expired/);
  const session = readSession({ session: { access_token: "access", refresh_token: "refresh", expires_in: 3600 } });
  assert.equal(session.access_token, "access");
  assert.equal(session.refresh_token, "refresh");
  assert.ok(session.expires_at > Date.now() / 1000);
});
