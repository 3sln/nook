import { test } from "node:test";
import assert from "node:assert/strict";
const expect = (value) => ({
  toBe: (expected) => assert.equal(value, expected),
  toEqual: (expected) => assert.deepEqual(value, expected),
  toBeNull: () => assert.equal(value, null),
});
import {
  transition,
  gesture,
  nearestCorner,
  matchesKey,
  presentation,
  inheritedPresentation,
  selectionNumber,
  availableCorners,
  closestAllowedCorner,
} from "../src/bl/menu.js";
test("navigation goes back one level and corner changes preserve navigation", () => {
  let state = { corner: "bottom-right", path: [] };
  state = transition(state, { type: "open", view: "root" });
  state = transition(state, { type: "enter", view: "settings" });
  state = transition(state, { type: "corner", corner: "top-left" });
  expect(state).toEqual({
    corner: "top-left",
    path: ["root", "settings"],
  });
  expect(transition(state, { type: "back" }).path).toEqual(["root"]);
  expect(transition(state, { type: "close" }).path).toEqual([]);
  expect(transition(state, { type: "corner", corner: "invalid" })).toBe(state);
});
test("gestures work inward from each corner and reject taps", () => {
  for (const sign of [-1, 1]) {
    expect(gesture(sign * 80, 10)).toBe("quick");
    expect(gesture(10, sign * 80)).toBe("settings");
    expect(gesture(sign * 80, 80)).toBe("full");
  }
  expect(gesture(8, 9)).toBeNull();
  expect(nearestCorner(10, 20, 100, 100)).toBe("top-left");
  expect(nearestCorner(90, 90, 100, 100)).toBe("bottom-right");
});
test("shortcuts require exact modifiers and handle shifted question mark", () => {
  const e = {
    key: "?",
    code: "Slash",
    shiftKey: true,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
  };
  expect(matchesKey(e, "Shift+?")).toBe(true);
  expect(matchesKey({ ...e, altKey: true }, "Shift+?")).toBe(false);
  expect(
    matchesKey(
      { ...e, key: "S", code: "KeyS", altKey: true },
      "Alt+Shift+S",
      new Map([["KeyS", "s"]]),
    ),
  ).toBe(true);
  expect(matchesKey(e, "")).toBe(false);
});

test("presentation policy distinguishes compact controls from expanded content", () => {
  expect(presentation("root", 4)).toBe("compact");
  expect(presentation("root", 6)).toBe("expanded");
  expect(presentation("settings", 3)).toBe("compact");
  expect(presentation("settings", 4)).toBe("expanded");
  expect(presentation("panel", 0)).toBe("expanded");
  expect(presentation("panel", 0, "compact")).toBe("compact");
  expect(presentation("menu", 1, "expanded")).toBe("expanded");
});

test("closing clears navigation and expanded ancestry follows the active path", () => {
  const initial = { corner: "bottom-right", path: ["root", "menu", "panel"] };
  const closed = transition(initial, { type: "close" });
  expect(closed.path).toEqual([]);
  expect(transition(closed, { type: "open", view: "root" }).path).toEqual([
    "root",
  ]);
  const base = (id) => (id === "menu" ? "expanded" : "compact");
  expect(inheritedPresentation(initial.path, base)).toBe("expanded");
  expect(inheritedPresentation(["root"], base)).toBe("compact");
});

test("Alt/Option numbered selection uses reported keys or explicit layout data", () => {
  expect(
    selectionNumber({ key: "1", code: "Digit1", altKey: false }),
  ).toBeNull();
  expect(
    selectionNumber({ key: "¡", code: "Digit1", altKey: true }),
  ).toBeNull();
  expect(
    selectionNumber(
      { key: "¡", code: "Digit1", altKey: true },
      new Map([["Digit1", "1"]]),
    ),
  ).toBe(1);
  expect(
    selectionNumber(
      { key: "&", code: "Digit1", altKey: true },
      new Map([["Digit1", "&"]]),
    ),
  ).toBeNull();
  expect(
    matchesKey(
      {
        key: "/",
        code: "Slash",
        altKey: false,
        shiftKey: true,
        ctrlKey: false,
        metaKey: false,
      },
      "Shift+?",
    ),
  ).toBe(false);
  expect(
    selectionNumber({ key: "9", code: "Numpad9", altKey: true }),
  ).toBeNull();
  expect(
    selectionNumber(
      { key: "9", code: "Numpad9", altKey: true },
      new Map([["Numpad9", "9"]]),
    ),
  ).toBe(9);
  expect(
    selectionNumber({ key: "1", code: "Digit1", altKey: true, ctrlKey: true }),
  ).toBeNull();
  expect(
    selectionNumber({ key: "1", code: "Digit1", altKey: true, shiftKey: true }),
  ).toBeNull();
});

test("corner constraints are authoritative and snapping chooses only legal destinations", () => {
  const allowed = availableCorners("top-left, bottom-left unknown");
  expect(allowed).toEqual(["bottom-right", "top-right"]);
  expect(closestAllowedCorner(0, 0, 100, 100, allowed)).toBe("top-right");
  expect(closestAllowedCorner(0, 0, 100, 100, [])).toBeNull();
  let state = transition(
    { corner: "bottom-right", path: [] },
    { type: "configure-corners", disabled: "bottom-right top-right" },
  );
  expect(state.allowedCorners).toEqual(["bottom-left", "top-left"]);
  expect(state.corner).toBe("bottom-left");
  expect(transition(state, { type: "corner", corner: "top-right" })).toBe(
    state,
  );
  state = transition(state, {
    type: "configure-corners",
    disabled: "bottom-right bottom-left top-left top-right",
  });
  expect(state.allowedCorners).toEqual([]);
  expect(state.corner).toBe("bottom-left");
});
