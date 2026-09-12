import assert from "node:assert/strict";
import test from "node:test";
import { validateGroupSlug } from "../src/lib/group-validation.ts";

test("validates slug availability using the backend's inverted success flag", async (t) => {
  t.mock.method(globalThis, "fetch", async (url, options) => {
    assert.equal(new URL(url).searchParams.get("slug"), "cebu");
    assert.ok(new URL(url).pathname.endsWith("/groups/validate-slug"));
    assert.equal(options.cache, "no-store");
    return Response.json({ success: false, group: { id: 1, name: "COMSCA" } });
  });
  assert.deepEqual(await validateGroupSlug("cebu"), { status: "registered", group: { id: 1, name: "COMSCA" } });
  globalThis.fetch = async () => Response.json({ success: true });
  assert.deepEqual(await validateGroupSlug("cebu"), { status: "unregistered", group: null });
});

test("failed and malformed responses never mark a group as available or registered", async (t) => {
  t.mock.method(globalThis, "fetch");
  for (const response of [
    () => Response.json({ success: false }, { status: 500 }),
    () => Response.json({ success: "false" }),
    () => Response.json({}),
    () => Response.json(null),
    () => new Response("not json"),
    () => { throw new Error("network failure"); },
  ]) {
    globalThis.fetch = async () => response();
    assert.deepEqual(await validateGroupSlug("cebu"), { status: "error", group: null });
  }
});
