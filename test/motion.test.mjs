import { test } from "node:test";
import assert from "node:assert/strict";
import motion from "../src/ui/motion.js";
function harness() {
  const preference = new EventTarget();
  preference.matches = false;
  const abort = new AbortController();
  let configured = "240ms";
  const calls = [];
  const window = {
    matchMedia: () => preference,
    getComputedStyle: () => ({ getPropertyValue: () => configured }),
  };
  const element = {
    animate(frames, options) {
      const animation = {
        canceled: false,
        cancel() {
          this.canceled = true;
          this.oncancel?.();
        },
      };
      calls.push({ frames, options, animation });
      return animation;
    },
  };
  return {
    preference,
    abort,
    calls,
    element,
    setDuration: (value) => (configured = value),
    controller: motion({ window, signal: abort.signal, host: {} }),
  };
}
test("effects replace previous motion, respect timing overrides, and clean up on disconnect", () => {
  const h = harness();
  h.controller.play(h.element, [
    { transform: "scale(.9)" },
    { transform: "scale(1)" },
  ]);
  assert.equal(h.calls[0].options.duration, 240);
  h.setDuration(".18s");
  h.controller.play(h.element, [{ opacity: 0.5 }, { opacity: 1 }]);
  assert.equal(h.calls[0].animation.canceled, true);
  assert.equal(h.calls[1].options.duration, 180);
  h.abort.abort();
  assert.equal(h.calls[1].animation.canceled, true);
  h.controller.play(h.element, []);
  assert.equal(h.calls.length, 2);
});
test("reduced motion cancels active effects and zero duration suppresses new effects", () => {
  const h = harness();
  h.controller.play(h.element, []);
  h.preference.matches = true;
  const event = new Event("change");
  event.matches = true;
  h.preference.dispatchEvent(event);
  assert.equal(h.calls[0].animation.canceled, true);
  h.controller.play(h.element, []);
  assert.equal(h.calls.length, 1);
  h.preference.matches = false;
  h.setDuration("0ms");
  h.controller.play(h.element, []);
  assert.equal(h.calls.length, 1);
  h.abort.abort();
});
