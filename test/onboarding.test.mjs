import { test } from "node:test";
import assert from "node:assert/strict";
import {
  onboardingResource,
  onboardingKey,
} from "../src/providers/onboarding.js";
import { sprite, icon } from "../src/ui/icons.js";
test("blocked storage falls back to page-scoped memory without persisting guesses", () => {
  const storage = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
  };
  const owner = {};
  const resource = onboardingResource({ storage, owner });
  assert.equal(resource.hasSeen(), false);
  resource.markSeen();
  assert.equal(resource.hasSeen(), true);
  assert.equal(onboardingResource({ storage, owner }).hasSeen(), true);
  assert.equal(onboardingResource({ storage, owner: {} }).hasSeen(), false);
});
test("onboarding uses a versioned key and the icon sprite contains every built-in reference", () => {
  assert.equal(onboardingKey, "@3sln/nook:tutorial:v1");
  for (const name of [
    "nook",
    "menu",
    "settings",
    "commands",
    "back",
    "close",
    "more",
  ]) {
    assert.ok(sprite.includes(`id="nook-icon-${name}"`));
    assert.ok(icon(name).includes(`href="#nook-icon-${name}"`));
  }
  assert.ok(icon("unknown").includes("#nook-icon-file"));
});
