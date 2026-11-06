import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import swipeDial from "../src/ui/swipeDial.js";

test("held swipe leaves a clear inner ring, fades with distance, and cancels on return", async () => {
  const window = new Window();
  const document = window.document;
  const controller = new AbortController();
  const dock = {
    ownerDocument: document,
    overlayAnchor: document.createElement("div"),
    live: document.createElement("div"),
    position: "bottom-right",
    anchorRect: {
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    },
    surfaceAvailable: () => true,
  };
  const dial = swipeDial({
    dock,
    signal: controller.signal,
    make: (tag, part, text) => {
      const el = document.createElement(tag);
      el.setAttribute("part", part);
      if (text) el.textContent = text;
      if (part === "swipe-dial-option")
        el.getBoundingClientRect = () => {
          const x = parseFloat(el.style.left),
            y = parseFloat(el.style.top);
          return {
            left: x - 44,
            right: x + 44,
            top: y - 36,
            bottom: y + 36,
            width: 88,
            height: 72,
          };
        };
      return el;
    },
    i18n: { text: (el, text) => (el.textContent = text), t: (text) => text },
  });
  const pointer = { x: 378, y: 832, lastX: 338, lastY: 792 };
  dock.pointer = pointer;
  dial.move(pointer);
  assert.equal(dial.shown, false);
  await new Promise((resolve) => setTimeout(resolve, 210));
  assert.equal(dial.shown, true);
  assert.equal(
    [...dial.root.querySelectorAll("[part=swipe-dial-option]")].filter(
      (el) => !el.hidden,
    ).length,
    2,
  );
  assert.equal(dial.root.textContent.includes("More"), false);
  for (const el of dial.root.querySelectorAll("[part=swipe-dial-option]")) {
    if (el.hidden) continue;
    assert.ok(
      Math.hypot(
        parseFloat(el.style.left) - pointer.x,
        parseFloat(el.style.top) - pointer.y,
      ) >= 104,
    );
  }
  assert.ok(
    Number(dial.root.style.getPropertyValue("--nook-dial-progress")) < 1,
  );
  pointer.lastX = 226;
  pointer.lastY = 800;
  dial.move(pointer);
  assert.equal(dial.selection, "all");
  assert.equal(dial.root.style.getPropertyValue("--nook-dial-progress"), "1");
  // A previous highlight must not commit if release lands elsewhere, even
  // without a final pointermove. Slow mode never falls back to a directional swipe.
  assert.equal(dial.release(100, 400), null);
  assert.equal(dial.root.querySelectorAll("[data-selected]").length, 0);
  assert.equal(dial.release(226, 800), "all");
  assert.equal(dial.release(338, 680), "settings");
  assert.equal(dial.release(300, 775), null); // gap between the cards
  assert.equal(dial.release(350, 100), null); // far away in the settings direction
  pointer.lastX = 368;
  pointer.lastY = 822;
  dial.move(pointer);
  assert.equal(dial.selection, null);
  controller.abort();
  assert.equal(dial.root.isConnected, false);
  assert.equal(dial.shown, false);
  await window.happyDOM.abort();
});
