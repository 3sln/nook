import { test } from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import swipeDial, {
  layoutDial,
  directionalChoice,
} from "../src/ui/swipeDial.js";
import { positions, positionPoint } from "../src/bl/menu.js";

function fixture() {
  const window = new Window(),
    document = window.document,
    controller = new AbortController();
  const root = document.createElement("section"),
    body = document.createElement("div");
  root.append(body);
  const builtins = new Map();
  for (const [id, label] of [
    ["all", "Full menu"],
    ["settings", "Settings"],
  ]) {
    const button = document.createElement("button");
    button.setAttribute("part", "item");
    button.className = "item";
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span class="icon" part="icon"></span><span class="item-label" part="item-label">${label}</span>`;
    button.getBoundingClientRect = () => {
      const x = parseFloat(button.style.getPropertyValue("--nook-dial-x")),
        y = parseFloat(button.style.getPropertyValue("--nook-dial-y"));
      return {
        left: x - 28,
        right: x + 28,
        top: y - 28,
        bottom: y + 28,
        width: 56,
        height: 56,
      };
    };
    body.append(button);
    builtins.set(id, button);
  }
  const dock = {
    ownerDocument: document,
    views: new Map([["root", { el: root, body }]]),
    builtins,
    records: new Map(),
    rootEntries: [{ id: "all" }, { id: "settings" }],
    live: document.createElement("div"),
    position: "bottom-right",
    state: { path: [] },
    handle: document.createElement("button"),
    anchorRect: {
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    },
    positionMedia: { matches: false },
  };
  const dial = swipeDial({
    dock,
    signal: controller.signal,
    i18n: {
      text: (node, text) => (node.textContent = text),
      t: (text) => text,
    },
  });
  dial.sync();
  const center = (id) => {
    const el = builtins.get(id);
    return [
      parseFloat(el.style.getPropertyValue("--nook-dial-x")),
      parseFloat(el.style.getPropertyValue("--nook-dial-y")),
    ];
  };
  return {
    window,
    dock,
    dial,
    controller,
    root,
    center,
    async dispose() {
      controller.abort();
      await window.happyDOM.abort();
    },
  };
}
test("held dial picks require a release on an option and use the same nodes as tap-open", async () => {
  const h = fixture();
  try {
    h.dock.state.path = ["root"];
    h.dial.sync();
    const buttons = [...h.root.querySelectorAll("button")],
      children = [...h.root.querySelectorAll("*")];
    h.dock.state.path = [];
    h.dial.sync();
    const pointer = { x: 366, y: 820, lastX: 326, lastY: 780 };
    h.dock.pointer = pointer;
    h.dial.move(pointer);
    assert.equal(h.dial.shown, false);
    await new Promise((resolve) => setTimeout(resolve, 210));
    assert.equal(h.dial.shown, true);
    assert.deepEqual([...h.root.querySelectorAll("button")], buttons);
    assert.deepEqual([...h.root.querySelectorAll("*")], children);
    assert.equal(h.root.hasAttribute("data-preview"), true);
    assert.ok(
      Number(h.root.style.getPropertyValue("--nook-dial-progress")) < 1,
    );
    const [x, y] = h.center("all");
    pointer.lastX = x;
    pointer.lastY = y;
    h.dial.move(pointer);
    assert.equal(h.dial.selection, "all");
    assert.equal(h.dial.release(80, 400), null);
    assert.equal(h.dial.release(x, y), "all");
    assert.equal(h.dial.release(...h.center("settings")), "settings");
    assert.equal(h.dial.release(366, 820), null);
    h.dial.cancel();
    assert.equal(h.dial.shown, false);
    assert.equal(h.root.hidden, true);
  } finally {
    await h.dispose();
  }
});
test("all anchors keep the primary choices at the arc endpoints and extras on its curve", () => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
    [280, 600],
  ])
    for (const position of positions) {
      const [x, y] = positionPoint(position, width, height),
        origin = {
          x: Math.max(32, Math.min(width - 32, x)),
          y: Math.max(32, Math.min(height - 32, y)),
        };
      const entries = ["all", "settings", "one", "two", "three", "four"].map(
        (id) => ({ id }),
      );
      const layout = layoutDial(
        { left: 0, top: 0, right: width, bottom: height, width, height },
        origin,
        position,
        entries,
      );
      assert.ok(layout.items.length <= 6);
      assert.ok(layout.items.length >= 2);
      assert.equal(layout.items.find((item) => item.id === "all").angle, 0);
      assert.equal(
        layout.items.find((item) => item.id === "settings").angle,
        Math.PI / 2,
      );
      const extras = layout.items.filter(
        (item) => !["all", "settings"].includes(item.id),
      );
      for (const item of layout.items) {
        assert.ok(
          Math.abs(
            Math.hypot(item.x - origin.x, item.y - origin.y) - layout.radius,
          ) < 1,
        );
        assert.ok(item.x >= 28 && item.x <= width - 28);
        assert.ok(item.y >= 28 && item.y <= height - 28);
      }
      for (let i = 1; i < extras.length; i++)
        assert.ok(extras[i].angle > extras[i - 1].angle);
    }
});

test("arrows follow the arc geometry at every anchor without wrapping", () => {
  for (const position of positions) {
    const bounds = {
      left: 0,
      top: 0,
      right: 900,
      bottom: 900,
      width: 900,
      height: 900,
    };
    const [x, y] = positionPoint(position, 900, 900);
    const layout = layoutDial(bounds, { x, y }, position, [
      { id: "all" },
      { id: "settings" },
      { id: "one" },
      { id: "two" },
      { id: "three" },
      { id: "four" },
    ]);
    const nodes = layout.items
      .sort((a, b) => a.angle - b.angle)
      .map((item) => ({
        getBoundingClientRect: () => ({
          left: item.x - 28,
          top: item.y - 28,
          width: 56,
          height: 56,
        }),
      }));
    const horizontal = position.includes("right") ? "ArrowLeft" : "ArrowRight";
    const vertical = position.startsWith("top") ? "ArrowDown" : "ArrowUp";
    for (let i = 0; i < nodes.length - 1; i++) {
      assert.equal(directionalChoice(nodes, nodes[i], vertical), nodes[i + 1]);
      assert.equal(
        directionalChoice(nodes, nodes[i + 1], horizontal),
        nodes[i],
      );
    }
    assert.equal(
      directionalChoice(nodes, nodes.at(-1), vertical),
      nodes.at(-1),
    );
    assert.equal(directionalChoice(nodes, nodes[0], horizontal), nodes[0]);
  }
});
