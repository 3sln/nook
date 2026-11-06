import { test } from "node:test";
import assert from "node:assert/strict";
const expect = (value) => ({
  toBe: (expected) => assert.equal(value, expected),
  toEqual: (expected) => assert.deepEqual(value, expected),
  toBeNull: () => assert.equal(value, null),
});
import {
  distributeItems,
  positions,
  responsivePositions,
  availablePositions,
  closestAllowedPosition,
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
    preferredPosition: "top-left",
    path: ["root", "settings"],
  });
  expect(transition(state, { type: "back" }).path).toEqual(["root"]);
  expect(transition(state, { type: "close" }).path).toEqual([]);
  expect(transition(state, { type: "corner", corner: "invalid" })).toBe(state);
});
test("gestures work inward from each corner and reject taps", () => {
  for (const sign of [-1, 1]) {
    expect(gesture(sign * 80, 10)).toBe("all");
    expect(gesture(10, sign * 80)).toBe("settings");
    expect(gesture(sign * 80, 80)).toBe("all");
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

test("root allocation ranks priorities stably and reserves a reachable overflow slot", () => {
  const entries = [
    { id: "a", priority: 0, group: "Work" },
    { id: "b", priority: 5, group: "Support" },
    { id: "c", priority: 5 },
    { id: "d", priority: -1 },
  ];
  const plan = distributeItems(entries, 3);
  expect(plan.root.map((item) => item.id)).toEqual(["b", "c"]);
  expect(plan.overflow.map((item) => item.id)).toEqual(["a", "d"]);
  expect(plan.overflow[0].group).toBe("Work");
  expect(entries.map((item) => item.id)).toEqual(["a", "b", "c", "d"]);
  expect(distributeItems(entries, 4).overflow.length).toBe(0);
  expect(distributeItems(entries, 1).root.length).toBe(0);
  expect(distributeItems(entries, 1).overflow.length).toBe(4);
});

test("edge-center snapping and constraints cover all eight positions", () => {
  expect(positions.length).toBe(8);
  for (const [x, y, position] of [
    [0, 0, "top-left"],
    [100, 0, "top-right"],
    [0, 100, "bottom-left"],
    [100, 100, "bottom-right"],
    [50, 0, "top-center"],
    [100, 50, "right-center"],
    [50, 100, "bottom-center"],
    [0, 50, "left-center"],
  ])
    expect(closestAllowedPosition(x, y, 100, 100)).toBe(position);
  expect(availablePositions("top-left left-center").length).toBe(6);
  const state = transition(
    { corner: "bottom-center", path: [] },
    {
      type: "configure-positions",
      disabled: positions.filter((position) => position !== "top-center"),
    },
  );
  expect(state.corner).toBe("top-center");
  expect(state.allowedPositions).toEqual(["top-center"]);
  expect(transition(state, { type: "corner", corner: "left-center" })).toBe(
    state,
  );
});

test("narrow touch portrait anchors defer edge centers and restore the preferred position", () => {
  const portrait = responsivePositions({
    width: 390,
    height: 844,
    touch: true,
  });
  expect(portrait.includes("top-center")).toBe(false);
  expect(portrait.includes("bottom-center")).toBe(false);
  expect(portrait.includes("right-center")).toBe(true);
  expect(
    responsivePositions({ width: 390, height: 844, touch: false }).length,
  ).toBe(8);
  const landscape = responsivePositions({
    width: 844,
    height: 390,
    touch: true,
  });
  expect(landscape.length).toBe(8);
  let state = transition(
    { corner: "top-center", path: [] },
    { type: "configure-positions", options: portrait },
  );
  expect(state.corner).toBe("top-left");
  expect(state.preferredPosition).toBe("top-center");
  state = transition(state, {
    type: "configure-positions",
    options: landscape,
  });
  expect(state.corner).toBe("top-center");
  state = transition(state, { type: "configure-positions", options: portrait });
  state = transition(state, { type: "corner", corner: "top-left" });
  state = transition(state, {
    type: "configure-positions",
    options: landscape,
  });
  expect(state.corner).toBe("top-left");
  expect(state.preferredPosition).toBe("top-left");
});

test("responsive options never override explicitly blocked positions", () => {
  let state = transition(
    { corner: "bottom-center", path: [] },
    {
      type: "configure-positions",
      options: positions,
      disabled: "bottom-center",
    },
  );
  expect(state.corner === "bottom-center").toBe(false);
  const previous = state;
  state = transition(state, { type: "corner", corner: "bottom-center" });
  expect(state).toBe(previous);
  state = transition(state, {
    type: "configure-positions",
    options: positions,
    disabled: "bottom-center",
  });
  expect(state.allowedPositions.includes("bottom-center")).toBe(false);
});
