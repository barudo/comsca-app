import assert from "node:assert/strict";
import test from "node:test";
import { getCommunity } from "../src/lib/community.ts";

test("recognizes community subdomains and local development hosts", () => {
  assert.equal(getCommunity("savings-group.comsca.com"), "savings-group");
  assert.equal(getCommunity("CEBU.comsca.com:3000"), "cebu");
  assert.equal(getCommunity("cebu.localhost:3000"), "cebu");
  assert.equal(getCommunity("cebu.comsca.com."), "cebu");
});

test("does not treat root, foreign, or malformed hosts as communities", () => {
  for (const host of [
    null,
    "comsca.com",
    "www.comsca.com",
    "localhost:3000",
    "127.0.0.1:3000",
    "evilcomsca.com",
    "cebu.comsca.com.evil.test",
    "a.b.comsca.com",
    "-cebu.comsca.com",
    "cebu-.comsca.com",
  ]) {
    assert.equal(getCommunity(host), null, String(host));
  }
});
