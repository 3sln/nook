import { test, beforeEach, afterEach, after as afterAll } from "node:test";
import assert from "node:assert/strict";
const expect = (value) => ({
  toBe: (expected) => assert.equal(value, expected),
  toEqual: (expected) => assert.deepEqual(value, expected),
  toBeNull: () => assert.equal(value, null),
});
import { Window } from "happy-dom";
import { positions } from "../src/bl/menu.js";
// Happy DOM 18 retains mutation-delivery closures only through WeakRef. GC can
// silently drop them while an observer is live. Native observers own callbacks
// strongly, so pin these harness references until this test process tears down.
const NativeWeakRef = globalThis.WeakRef;
const pinned = new Set();
globalThis.WeakRef = class extends NativeWeakRef {
  constructor(value) {
    super(value);
    pinned.add(value);
  }
};
const window = new Window({ url: "http://localhost/" });
for (const key of [
  "document",
  "HTMLElement",
  "HTMLTemplateElement",
  "Element",
  "customElements",
  "MutationObserver",
  "CustomEvent",
  "EventTarget",
  "Event",
  "FormData",
])
  globalThis[key] = window[key];
// Happy DOM 18 aliases AltGraph to Alt; native browsers distinguish them.
const modifierState = window.KeyboardEvent.prototype.getModifierState;
window.KeyboardEvent.prototype.getModifierState = function (key) {
  return key === "AltGraph" ? false : modifierState.call(this, key);
};
globalThis.matchMedia = window.matchMedia.bind(window);
globalThis.innerWidth = 1024;
globalThis.innerHeight = 768;
// A reported synthetic layout supplies a deterministic browser capability.
const layout = new Map([
  ...Array.from({ length: 26 }, (_, i) => [
    `Key${String.fromCharCode(65 + i)}`,
    String.fromCharCode(97 + i),
  ]),
  ...Array.from({ length: 9 }, (_, i) => [`Digit${i + 1}`, String(i + 1)]),
]);
const keyboard = new window.EventTarget();
keyboard.getLayoutMap = async () => layout;
Object.defineProperty(window.navigator, "keyboard", {
  value: keyboard,
  configurable: true,
});
window.localStorage.setItem("@3sln/nook:tutorial:v1", "seen");
await import("../src/index.js");
const settle = async () => {
  await new Promise((resolve) => setTimeout(resolve, 100));
  await window.happyDOM.waitUntilComplete();
};
// The DOM harness retains detached focus targets; browsers restore body focus.
beforeEach(() => {
  document.body.tabIndex = -1;
  document.body.focus();
});
afterEach(async () => {
  document.body.focus();
  for (const dock of document.querySelectorAll("nook-dock")) dock.remove();
  keyboard.getLayoutMap = async () => layout;
  await settle();
});
afterAll(async () => {
  await window.happyDOM.abort();
  globalThis.WeakRef = NativeWeakRef;
  pinned.clear();
});
async function observed(predicate) {
  const deadline = Date.now() + 2000;
  while (!predicate() && Date.now() < deadline) await settle();
}
function fixture(attributes = {}) {
  const dock = document.createElement("nook-dock");
  dock.innerHTML =
    '<nook-action id="action" label="Share"></nook-action><nook-panel id="panel" root label="Feedback" feedback><template slot="content"><input value="original"></template></nook-panel><nook-setting id="setting" label="Dark" type="toggle" value="false"></nook-setting>';
  for (const [name, value] of Object.entries(attributes))
    dock.setAttribute(name, value);
  document.body.append(dock);
  return dock;
}
test("live reconciliation preserves panels and controls across visibility changes", async () => {
  const dock = fixture();
  await settle();
  expect(dock.state.path).toEqual([]);
  const panel = dock.querySelector("#panel"),
    setting = dock.querySelector("#setting");
  const view = dock.views.get(panel),
    input = view.body.querySelector("input"),
    control = setting._control;
  input.value = "draft";
  dock.open("root");
  await settle();
  dock.activate(panel);
  await settle();
  expect(view.el.hidden).toBe(false);
  dock.close();
  await settle();
  dock.activate(panel);
  await settle();
  expect(view.body.querySelector("input")).toBe(input);
  expect(input.value).toBe("draft");
  expect(setting._control).toBe(control);
  dock.remove();
  await settle();
});
test("items appear and disappear in open and closed menus with stable buttons", async () => {
  const dock = fixture();
  await settle();
  dock.open("full");
  await settle();
  const action = dock.querySelector("#action"),
    button = dock.records.get(action).buttons[0];
  action.setAttribute("label", "Share page");
  await settle();
  expect(dock.records.get(action).buttons[0]).toBe(button);
  expect(button.getAttribute("aria-label")).toBe("Share page");
  const extra = document.createElement("nook-action");
  extra.setAttribute("label", "Save");
  dock.append(extra);
  await settle();
  expect(dock.records.has(extra)).toBe(true);
  const quick = dock.records.get(extra).buttons[0];
  extra.remove();
  await settle();
  expect(dock.records.has(extra)).toBe(false);
  expect(quick.isConnected).toBe(false);
  dock.close();
  await settle();
  action.root = true;
  await settle();
  expect(button.parentNode).toBe(dock.views.get("root").grid);
  expect(button.parentNode === dock.views.get("root").grid).toBe(true);
  dock.remove();
  await settle();
});
test("removing active panels closes safely and settings update live", async () => {
  const dock = fixture();
  await settle();
  const panel = dock.querySelector("#panel");
  dock.activate(panel);
  await settle();
  panel.remove();
  await settle();
  expect(dock.state.path).toEqual([]);
  const setting = dock.querySelector("#setting");
  setting.value = true;
  await settle();
  expect(setting._control.checked).toBe(true);
  setting._control.checked = false;
  setting._control.dispatchEvent(new Event("input", { bubbles: true }));
  await settle();
  expect(setting.value).toBe(false);
  dock.remove();
  await settle();
});
test("separate surface shortcuts ignore editing and root items have bindings", async () => {
  const dock = fixture();
  await settle();
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "S",
      altKey: true,
      shiftKey: true,
      bubbles: true,
    }),
  );
  expect(dock.state.path).toEqual(["settings"]);
  dock.close();
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "F",
      altKey: true,
      shiftKey: true,
      bubbles: true,
    }),
  );
  expect(dock.state.path.at(-1)).toBe(dock.querySelector("#panel"));
  dock.close();
  const input = document.createElement("input");
  document.body.append(input);
  input.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "S",
      altKey: true,
      shiftKey: true,
      bubbles: true,
      composed: true,
    }),
  );
  expect(dock.state.path).toEqual([]);
  input.remove();
  dock.remove();
  await settle();
});

test("opening and navigating do not create or remove rendered child nodes", async () => {
  const dock = fixture();
  await settle();
  const mutations = [];
  const observer = new MutationObserver((records) =>
    mutations.push(...records),
  );
  observer.observe(dock.shadowRoot, { childList: true, subtree: true });
  for (let i = 0; i < 3; i++) {
    dock.open("root");
    dock.activate(dock.querySelector("#panel"));
    dock.send({ type: "back" });
    dock.close();
  }
  await settle();
  expect(mutations.length).toBe(0);
  observer.disconnect();
  dock.remove();
  await settle();
});
test("source ordering, nested groups, and empty builtins reconcile live", async () => {
  const dock = fixture();
  await settle();
  const menu = document.createElement("nook-menu");
  menu.setAttribute("label", "Tools");
  const child = document.createElement("nook-action");
  child.setAttribute("label", "Child");
  menu.append(child);
  dock.append(menu);
  await settle();
  expect(dock.records.get(child).buttons[0].parentNode).toBe(
    dock.views.get(menu).grid,
  );
  child.root = true;
  await settle();
  expect(dock.records.get(child).buttons[0].parentNode).toBe(
    dock.views.get("root").grid,
  );
  expect(dock.views.get(menu).grid.children.length).toBe(0);
  const action = dock.querySelector("#action");
  dock.insertBefore(menu, action);
  await settle();
  expect(dock.rootItems.indexOf(menu) < dock.rootItems.indexOf(action)).toBe(
    true,
  );
  dock.querySelector("#setting").remove();
  await settle();
  expect(dock.builtins.get("settings").hidden).toBe(true);
  dock.remove();
  await settle();
});

test("live content switches presentation without remounting existing items", async () => {
  const dock = fixture();
  await settle();
  dock.open("root");
  const root = dock.views.get("root");
  const panel = dock.querySelector("#panel");
  const button = dock.records.get(panel).buttons[0];
  expect(root.el.dataset.presentation).toBe("compact");
  const additions = [];
  for (let i = 0; i < 3; i++) {
    const action = document.createElement("nook-action");
    action.root = true;
    action.setAttribute("label", `Extra ${i}`);
    dock.append(action);
    additions.push(action);
  }
  await settle();
  expect(root.el.dataset.presentation).toBe("compact");
  expect(dock.overflowEntries.length > 0).toBe(true);
  expect(dock.records.get(panel).buttons[0]).toBe(button);
  additions.forEach((item) => item.remove());
  await settle();
  expect(root.el.dataset.presentation).toBe("compact");
  dock.setAttribute("root-presentation", "expanded");
  await settle();
  expect(root.el.dataset.presentation).toBe("compact");
  dock.remove();
  await settle();
});

test("expanded ancestry and grouped sections retain navigation boundaries", async () => {
  const dock = fixture();
  const parent = document.createElement("nook-menu");
  parent.setAttribute("label", "Parent");
  parent.setAttribute("presentation", "expanded");
  parent.innerHTML =
    '<nook-menu label="Child"><nook-menu label="Inner"><nook-panel label="Draft"><template slot="content"><input value="draft"></template></nook-panel></nook-menu></nook-menu>';
  dock.append(parent);
  await settle();
  const child = parent.querySelector("nook-menu"),
    inner = child.querySelector("nook-menu"),
    panel = inner.querySelector("nook-panel");
  const group = dock.views.get(parent).groupNodes.get(child);
  expect(group.heading.textContent).toBe("Child");
  expect(dock.views.get(parent).groupNodes.get(inner).el.parentNode).toBe(
    group.body,
  );
  dock.open(parent);
  dock.activate(child);
  expect(dock.views.get(child).el.dataset.presentation).toBe("expanded");
  dock.activate(panel);
  const input = dock.views.get(panel).body.querySelector("input");
  input.value = "kept";
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path).toEqual([]);
  dock.handle.click();
  expect(dock.state.path).toEqual(["root"]);
  dock.open(parent);
  dock.activate(child);
  dock.activate(panel);
  expect(input.value).toBe("kept");
  input.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Backspace",
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path.at(-1)).toBe(panel);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Backspace",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path.at(-1)).toBe(child);
  expect(dock.views.get(child).el.dataset.presentation).toBe("expanded");
  const fresh = document.createElement("nook-action");
  fresh.setAttribute("label", "New leaf");
  inner.append(fresh);
  await settle();
  expect(dock.views.get(parent).groupNodes.has(fresh)).toBe(true);
  fresh.remove();
  await observed(() => !dock.views.get(parent).groupNodes.has(fresh));
  expect(dock.views.get(parent).groupNodes.has(fresh)).toBe(false);
  dock.remove();
  await settle();
});

test("command palette is optional, searchable, live, and exposes supported bindings", async () => {
  const dock = fixture();
  await settle();
  expect(dock.builtins.get("commands").hidden).toBe(true);
  const invalid = document.createElement("nook-command");
  invalid.setAttribute("name", "Incomplete");
  dock.append(invalid);
  await settle();
  expect(dock.builtins.get("commands").hidden).toBe(true);
  const command = document.createElement("nook-command");
  command.setAttribute("name", "Export report");
  command.setAttribute("description", "Download the current document");
  command.keybind = "Alt+E";
  dock.append(command);
  await settle();
  expect(dock.builtins.get("commands").hidden).toBe(false);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "P",
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path).toEqual(["commands"]);
  const view = dock.views.get("commands"),
    button = view.body.querySelector(".command-result");
  expect(button.querySelector("kbd").textContent).toBe("Alt+E");
  expect(button.querySelector("kbd").hidden).toBe(false);
  dock.palette.search.value = "current document";
  dock.palette.search.dispatchEvent(new Event("input"));
  expect(button.hidden).toBe(false);
  dock.palette.search.value = "missing";
  dock.palette.search.dispatchEvent(new Event("input"));
  expect(button.hidden).toBe(true);
  command.setAttribute("name", "Save report");
  await settle();
  expect(view.body.querySelector(".command-result")).toBe(button);
  dock.palette.search.value = "Save";
  dock.palette.search.dispatchEvent(new Event("input"));
  expect(button.hidden).toBe(false);
  let intent;
  dock.addEventListener("nook-command", (event) => {
    intent = event.detail;
  });
  button.click();
  expect(intent.name).toBe("Save report");
  expect(intent.args).toEqual({});
  expect(dock.state.path).toEqual([]);
  dock.open("commands");
  command.remove();
  await settle();
  expect(dock.builtins.get("commands").hidden).toBe(true);
  expect(dock.state.path).toEqual([]);
  dock.remove();
  await settle();
});
test("command arguments validate and persist while execution emits typed values", async () => {
  const dock = fixture();
  const command = document.createElement("nook-command");
  command.setAttribute("name", "Create note");
  command.setAttribute("description", "Create a note with a title");
  command.keybind = "Alt+N";
  command.innerHTML =
    '<nook-arg name="title" label="Title" required></nook-arg><nook-arg name="count" type="number" min="1" value="2"></nook-arg><nook-arg name="pin" type="toggle" value="true"></nook-arg>';
  dock.append(command);
  await settle();
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "n",
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path.at(-1)).toBe(command);
  const form = dock.records.get(command).args.form,
    title = form.querySelector("[name=title]");
  let intent;
  dock.addEventListener("nook-command", (event) => {
    intent = event.detail;
    event.preventDefault();
  });
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(intent).toBe(undefined);
  title.value = "A draft";
  dock.close();
  dock.chooseCommand(command);
  expect(form.querySelector("[name=title]")).toBe(title);
  expect(title.value).toBe("A draft");
  command.setAttribute("description", "Updated description");
  await settle();
  expect(title.value).toBe("A draft");
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(intent.args).toEqual({ title: "A draft", count: 2, pin: true });
  expect(dock.state.path.at(-1)).toBe(command);
  dock.remove();
  await settle();
});
test("unknown layout disables dependent bindings and Alt-number selection without guessing", async () => {
  const original = keyboard.getLayoutMap;
  keyboard.getLayoutMap = async () => {
    throw new Error("unavailable");
  };
  const dock = fixture();
  const command = document.createElement("nook-command");
  command.setAttribute("name", "Uncertain");
  command.setAttribute("description", "A command with an uncertain binding");
  command.keybind = "Alt+N";
  dock.append(command);
  await settle();
  expect(dock.browserKeyboardLayout).toBe(undefined);
  expect(dock.views.get("commands").body.querySelector("kbd").hidden).toBe(
    true,
  );
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "n",
      code: "KeyN",
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path).toEqual([]);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "P",
      metaKey: true,
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.state.path).toEqual(["commands"]);
  dock.showNumbers();
  expect(dock.anchor.dataset.numbering).toBe(undefined);
  keyboard.getLayoutMap = original;
  keyboard.dispatchEvent(new Event("layoutchange"));
  await settle();
  expect(dock.views.get("commands").body.querySelector("kbd").hidden).toBe(
    false,
  );
  dock.remove();
  await settle();
});

test("holding Alt reveals assigned numbers and plain numbers do not select items", async () => {
  const dock = fixture();
  dock.querySelector("#action").priority = 1000;
  await settle();
  dock.open("root");
  const button = dock.records.get(dock.querySelector("#action")).buttons[0];
  button.getClientRects = () => [{}];
  let selected = 0;
  dock.addEventListener("nook-action", () => selected++);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Alt",
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle();
  expect(dock.anchor.hasAttribute("data-alt-held")).toBe(true);
  expect(dock.anchor.dataset.numbering).toBe("true");
  const assignedNumber = String(dock.numberedItems().indexOf(button) + 1);
  expect(button.querySelector("[part=number]").textContent).toBe(
    assignedNumber,
  );
  document.dispatchEvent(
    new window.KeyboardEvent("keyup", {
      key: "Alt",
      altKey: false,
      bubbles: true,
    }),
  );
  expect(dock.anchor.dataset.numbering).toBe(undefined);
  expect(dock.anchor.hasAttribute("data-alt-held")).toBe(false);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "1",
      code: "Digit1",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(selected).toBe(0);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "¡",
      code: `Digit${assignedNumber}`,
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(selected).toBe(1);
  expect(dock.state.path).toEqual([]);
  dock.remove();
  await settle();
});

test("first opening offers an optional badged tutorial without blocking actions", async () => {
  window.localStorage.removeItem("@3sln/nook:tutorial:v1");
  const dock = fixture({ position: "bottom-right", corner: "bottom-right" });
  await settle();
  expect(dock.handle.classList.contains("inviting")).toBe(true);
  dock.open();
  expect(dock.state.path).toEqual(["root"]);
  assert.ok(dock.rootEntries.some((entry) => entry.id === "welcome"));
  assert.equal(window.localStorage.getItem("@3sln/nook:tutorial:v1"), null);
  assert.equal(dock.state.needsIntro, true);
  dock.builtins.get("settings").click();
  assert.equal(dock.state.path.at(-1), "settings");
  dock.close();
  dock.open();
  dock.style.setProperty("--nook-root-max-items", "2");
  await settle();
  dock.builtins.get("all").click();
  const guide = dock.views.get("all").overflowButtons.get("welcome").button;
  assert.equal(guide.getAttribute("aria-label"), "Quick tour");
  guide.click();
  assert.equal(dock.state.path.at(-1), "welcome");
  expect(dock.handle.classList.contains("inviting")).toBe(false);
  expect(window.localStorage.getItem("@3sln/nook:tutorial:v1")).toBe(null);
  dock.views
    .get("welcome")
    .body.querySelector("[part=tutorial-continue]")
    .click();
  expect(dock.state.path).toEqual(["root"]);
  assert.equal(dock.state.needsIntro, false);
  assert.equal(
    dock.rootEntries.some((entry) => entry.id === "welcome"),
    false,
  );
  expect(window.localStorage.getItem("@3sln/nook:tutorial:v1")).toBe("seen");
  expect(dock.handle.classList.contains("inviting")).toBe(false);
  dock.remove();
  await settle();
  const again = fixture();
  await settle();
  expect(again.handle.classList.contains("inviting")).toBe(false);
  again.open();
  expect(again.state.path).toEqual(["root"]);
  again.remove();
  await settle();
});

test("dragging previews its destination without moving the live arc and commits only on release", async () => {
  const dock = fixture();
  await settle();
  dock.setAttribute("corner", "bottom-right");
  dock.handle.setPointerCapture = () => {};
  dock.handle.hasPointerCapture = () => false;
  const width = window.innerWidth,
    height = window.innerHeight;
  dock.pointerdown({
    button: 0,
    pointerId: 41,
    clientX: width - 20,
    clientY: height - 20,
  });
  await new Promise((resolve) => setTimeout(resolve, 470));
  expect(dock.preview.hidden).toBe(false);
  expect(dock.preview.dataset.corner).toBe("bottom-right");
  dock.pointermove({ pointerId: 99, clientX: 20, clientY: 20 });
  expect(dock.preview.dataset.corner).toBe("bottom-right");
  dock.pointermove({ pointerId: 41, clientX: 20, clientY: 20 });
  expect(dock.preview.dataset.corner).toBe("top-left");
  expect(dock.anchor.dataset.corner).toBe("bottom-right");
  expect(dock.handle.style.transform).toBe("");
  dock.pointermove({ pointerId: 41, clientX: width - 20, clientY: 20 });
  expect(dock.preview.dataset.corner).toBe("top-right");
  dock.pointerup({ pointerId: 41, clientX: width - 20, clientY: 20 });
  expect(dock.getAttribute("corner")).toBe("top-right");
  expect(dock.preview.hidden).toBe(true);
  expect(dock.pointer).toBe(null);
  dock.handle.click();
  expect(dock.state.path).toEqual([]);
  dock.pointerdown({
    button: 0,
    pointerId: 42,
    clientX: width - 20,
    clientY: 20,
  });
  await new Promise((resolve) => setTimeout(resolve, 470));
  dock.pointermove({ pointerId: 42, clientX: 20, clientY: height - 20 });
  expect(dock.preview.dataset.corner).toBe("bottom-left");
  dock.cancelPointer();
  expect(dock.getAttribute("corner")).toBe("top-right");
  expect(dock.preview.hidden).toBe(true);
  dock.remove();
  await settle();
});

test("disabled corners hide drag affordances, constrain preview, and cancel a now-locked drag", async () => {
  const dock = fixture();
  await settle();
  dock.disabledPositions = positions.filter(
    (position) => position !== "bottom-right",
  );
  expect(dock.canDrag()).toBe(false);
  expect(dock.anchor.dataset.draggable).toBe("false");
  dock.handle.setPointerCapture = () => {};
  dock.handle.hasPointerCapture = () => false;
  dock.pointerdown({ button: 0, pointerId: 61, clientX: 100, clientY: 100 });
  await new Promise((resolve) => setTimeout(resolve, 470));
  expect(dock.pointer.drag).toBe(false);
  expect(dock.preview.hidden).toBe(true);
  dock.cancelPointer();
  dock.disabledPositions = [];
  dock.disabledCorners = ["top-left"];
  dock.pointerdown({
    button: 0,
    pointerId: 62,
    clientX: window.innerWidth - 20,
    clientY: window.innerHeight - 20,
  });
  await new Promise((resolve) => setTimeout(resolve, 470));
  dock.pointermove({ pointerId: 62, clientX: 20, clientY: 20 });
  expect(dock.preview.dataset.corner === "top-left").toBe(false);
  expect(dock.landingSpots.get("top-left").hidden).toBe(true);
  expect(
    [...dock.landingSpots.values()].filter((spot) => !spot.hidden).length,
  ).toBe(7);
  dock.disabledPositions = positions.filter(
    (position) => position !== "bottom-right",
  );
  expect(dock.pointer).toBe(null);
  expect(dock.preview.hidden).toBe(true);
  expect([...dock.landingSpots.values()].every((spot) => spot.hidden)).toBe(
    true,
  );
  dock.disabledPositions = [];
  dock.disabledCorners = ["bottom-right"];
  expect(dock.state.corner === "bottom-right").toBe(false);
  expect(dock.getAttribute("corner")).toBe(dock.state.corner);
  dock.remove();
  await settle();
});
test("handle tooltip replaces the inline shortcut and tracks binding changes", async () => {
  const dock = fixture();
  await settle();
  expect(dock.views.get("root").el.querySelector("kbd")).toBe(null);
  expect(dock.handleTipShortcut.textContent).toBe("Menu · Shift + ?");
  expect(dock.handleTip.querySelector("[part=drag-hint]").textContent).toBe(
    "Hold, then drag to move.",
  );
  expect(dock.views.get("root").body.querySelector("[part=help-button]")).toBe(
    null,
  );
  dock.handle.click();
  expect(dock.handle.hasAttribute("data-tooltip-dismissed")).toBe(true);
  dock.handle.dispatchEvent(new Event("blur"));
  expect(dock.handle.hasAttribute("data-tooltip-dismissed")).toBe(true);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    }),
  );
  expect(dock.handle.hasAttribute("data-tooltip-dismissed")).toBe(true);
  dock.handle.dispatchEvent(new Event("pointerleave"));
  expect(dock.handle.hasAttribute("data-tooltip-dismissed")).toBe(false);
  dock.setAttribute("root-keybind", "Ctrl+K");
  expect(dock.handleTipShortcut.textContent).toBe("Menu · Ctrl + K");
  dock.setAttribute("root-keybind", "");
  expect(dock.handleTipShortcut.textContent).toBe("Menu");
  dock.remove();
  await settle();
});

test("rich enums replace native selects, synchronize values, and reconcile options live", async () => {
  const dock = fixture();
  const setting = document.createElement("nook-setting");
  setting.setAttribute("type", "enum");
  setting.setAttribute("label", "Palette");
  setting.setAttribute("value", "iris");
  setting.innerHTML =
    '<nook-option value="iris" label="Iris" description="Soft violet"><template slot="icon"><span>◉</span></template></nook-option><nook-option value="sage" label="Sage" description="Quiet green"></nook-option>';
  dock.append(setting);
  await settle();
  const picker = setting._enumPicker;
  expect(dock.shadowRoot.querySelector("select")).toBe(null);
  expect(picker.trigger.textContent.includes("Iris")).toBe(true);
  dock.open("settings");
  picker.trigger.click();
  expect(dock.state.path.at(-1)).toBe(setting);
  expect(picker.trigger.getAttribute("aria-expanded")).toBe("true");
  const view = dock.views.get(setting),
    sage = view.body.querySelector("[aria-label=Sage]");
  let changed;
  dock.addEventListener("nook-change", (event) => (changed = event.detail));
  sage.click();
  expect(setting.value).toBe("sage");
  expect(changed.value).toBe("sage");
  expect(dock.state.path.at(-1)).toBe("settings");
  setting.value = "iris";
  await settle();
  expect(picker.trigger.textContent.includes("Iris")).toBe(true);
  const option = setting.querySelector("[value=sage]");
  option.setAttribute("label", "Sage green");
  await settle();
  expect(view.body.querySelector('[aria-label="Sage green"]')).toBe(sage);
  option.remove();
  await observed(() => !sage.isConnected);
  expect(sage.isConnected).toBe(false);
  setting.remove();
  await settle();
  expect(dock.views.has(setting)).toBe(false);
  dock.remove();
  await settle();
});
test("command enum fields retain values and participate in required form validation", async () => {
  const dock = fixture();
  const command = document.createElement("nook-command");
  command.setAttribute("name", "Pick");
  command.setAttribute("description", "Pick a format");
  command.innerHTML =
    '<nook-arg name="format" label="Format" type="enum" required value="pdf"><nook-option value="pdf" label="PDF"></nook-option><nook-option value="html" label="HTML"></nook-option></nook-arg>';
  dock.append(command);
  await settle();
  dock.chooseCommand(command);
  const arg = command.querySelector("nook-arg");
  const form = dock.records.get(command).args.form;
  form.querySelector(".enum-trigger").click();
  expect(dock.state.path.at(-1)).toBe(arg);
  dock.views.get(arg).body.querySelector("[aria-label=HTML]").click();
  expect(dock.state.path.at(-1)).toBe(command);
  let detail;
  dock.addEventListener("nook-command", (event) => {
    event.preventDefault();
    detail = event.detail;
  });
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(detail.args).toEqual({ format: "html" });
  arg.value = "missing";
  await settle();
  detail = null;
  form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  expect(detail).toBe(null);
  expect(
    dock.views
      .get(arg)
      .body.querySelector("[aria-label=HTML]")
      .getAttribute("aria-selected"),
  ).toBe("false");
  expect(form.querySelector("[part=enum-error]").hidden).toBe(false);
  arg.remove();
  await settle();
  expect(dock.views.has(arg)).toBe(false);
  dock.remove();
  await settle();
});
test("feedback is opt-in, adapts to hooks, and respects custom UI and global disable", async () => {
  const dock = fixture();
  await settle();
  expect(dock.builtins.get("feedback").hidden).toBe(true);
  dock.feedback = { submit: async () => {} };
  expect(dock.builtins.get("feedback").hidden).toBe(true);
  dock.querySelector("#panel").remove();
  await settle();
  expect(dock.builtins.get("feedback").hidden).toBe(false);
  dock.open("feedback");
  const body = dock.views.get("feedback").body;
  expect(body.querySelector("[part=feedback-attach]").hidden).toBe(true);
  expect(body.querySelector("[part=feedback-capture]").hidden).toBe(true);
  dock.feedback = {
    submit: async () => {},
    attachFiles: async (files) => files,
  };
  expect(body.querySelector("[part=feedback-attach]").hidden).toBe(false);
  expect(body.querySelector("[part=feedback-capture]").hidden).toBe(true);
  dock.feedback = false;
  expect(dock.builtins.get("feedback").hidden).toBe(true);
  expect(dock.state.path).toEqual([]);
  dock.open("feedback");
  expect(dock.state.path).toEqual([]);
  dock.remove();
  await settle();
});
test("feedback preserves failed drafts, excludes Nook during capture, and prevents duplicate sends", async () => {
  const dock = fixture();
  dock.querySelector("#panel").remove();
  let report, captureArgs, release;
  let calls = 0;
  let fail = true;
  dock.feedback = {
    submit: async (value, { signal }) => {
      calls++;
      report = value;
      if (fail) throw new Error("Try again");
      await new Promise((resolve) => (release = resolve));
      if (signal.aborted) throw new Error("aborted");
    },
    captureScreenshot: async (args) => {
      captureArgs = args;
      expect(dock.hasAttribute("data-nook-capturing")).toBe(true);
      return new File(["image"], "screen.png", { type: "image/png" });
    },
  };
  await settle();
  dock.open("feedback");
  const ui = dock.feedbackUI,
    body = dock.views.get("feedback").body,
    message = body.querySelector("textarea");
  message.value = "The toolbar overlaps my editor";
  body.querySelector("[role=radio]").click();
  await body.querySelector("[part=feedback-capture]").onclick();
  await dock.shadowRoot.querySelector("[part=capture-snapshot]").onclick();
  dock.shadowRoot.querySelector("[part=capture-done]").click();
  expect(captureArgs.exclude).toEqual(dock.captureExclusions);
  expect(dock.hasAttribute("data-nook-capturing")).toBe(false);
  expect(body.querySelectorAll("[part=feedback-attachment]").length).toBe(1);
  ui.form.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
  await settle();
  expect(ui.status.textContent).toBe("Try again");
  expect(message.value).toBe("The toolbar overlaps my editor");
  expect(report.attachments[0].file.name).toBe("screen.png");
  fail = false;
  ui.form.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
  ui.form.dispatchEvent(
    new Event("submit", { bubbles: true, cancelable: true }),
  );
  expect(calls).toBe(2);
  release();
  await settle();
  expect(body.querySelector("[part=feedback-success]").hidden).toBe(false);
  expect(body.querySelectorAll("[part=feedback-attachment]").length).toBe(0);
  dock.remove();
  await settle();
});

test("feedback file hooks stage removable attachments and disable aborts capture safely", async () => {
  const dock = fixture();
  dock.querySelector("#panel").remove();
  let attached, captureSignal, release;
  dock.feedback = {
    submit: async () => {},
    attachFiles: async (files) => {
      attached = files;
      return files;
    },
    captureScreenshot: ({ signal }) => {
      captureSignal = signal;
      return new Promise((resolve) => (release = resolve));
    },
  };
  await settle();
  dock.open("feedback");
  const body = dock.views.get("feedback").body,
    input = body.querySelector("[part=feedback-file-input]"),
    file = new File(["details"], "notes.txt", { type: "text/plain" });
  Object.defineProperty(input, "files", {
    configurable: true,
    get: () => [file],
  });
  await input.onchange();
  expect(attached[0]).toBe(file);
  expect(body.querySelectorAll("[part=feedback-attachment]").length).toBe(1);
  body.querySelector("[part=feedback-remove]").click();
  expect(body.querySelectorAll("[part=feedback-attachment]").length).toBe(0);
  body.querySelector("[part=feedback-capture]").click();
  const pending = dock.shadowRoot
    .querySelector("[part=capture-snapshot]")
    .onclick();
  expect(dock.hasAttribute("data-nook-capturing")).toBe(true);
  dock.feedback = false;
  expect(captureSignal.aborted).toBe(true);
  expect(dock.hasAttribute("data-nook-capturing")).toBe(false);
  release(new File(["shot"], "late.png", { type: "image/png" }));
  await pending;
  expect(body.querySelectorAll("[part=feedback-attachment]").length).toBe(0);
  dock.remove();
  await settle();
});

test("tutorial labels and templates customize live while preserving device regions and mounted state", async () => {
  const dock = fixture();
  dock.tutorial = {
    title: "Workspace extras",
    continueLabel: "Continue",
  };
  const desktop = document.createElement("template");
  desktop.slot = "tutorial-desktop";
  desktop.innerHTML =
    '<p>Keyboard instructions</p><input aria-label="Tutorial draft">';
  const touch = document.createElement("template");
  touch.slot = "tutorial-touch";
  touch.innerHTML = "<p>Touch instructions</p>";
  dock.append(desktop, touch);
  await settle();
  const welcome = dock.views.get("welcome");
  const keyboard = welcome.body.querySelector('[part="tutorial-desktop"]');
  const draft = keyboard.querySelector("input");
  draft.value = "retained";
  expect(welcome.heading.textContent).toBe("Workspace extras");
  expect(welcome.el.getAttribute("aria-label")).toBe("Workspace extras");
  expect(
    welcome.body.querySelector('[part="tutorial-continue"]').textContent,
  ).toBe("Continue");
  expect(keyboard.classList.contains("keyboard-only")).toBe(true);
  expect(
    welcome.body
      .querySelector('[part="tutorial-touch"]')
      .classList.contains("touch-only"),
  ).toBe(true);
  dock.open("welcome");
  dock.close();
  dock.tutorial = { ...dock.tutorial, title: "Updated title" };
  await settle();
  expect(keyboard.querySelector("input")).toBe(draft);
  expect(draft.value).toBe("retained");
  const replacement = document.createElement("template");
  replacement.slot = "tutorial";
  replacement.innerHTML = "<p>Complete custom introduction</p>";
  dock.append(replacement);
  await settle();
  expect(welcome.body.querySelector('[part="tutorial"]').textContent).toBe(
    "Complete custom introduction",
  );
  expect(
    welcome.body.querySelector('[part="tutorial-continue"]') !== null,
  ).toBe(true);
  replacement.remove();
  await settle();
  expect(keyboard.querySelector("input")).toBe(draft);
  desktop.remove();
  touch.remove();
  dock.tutorial = null;
  await settle();
  expect(keyboard.textContent.includes("Arrows move; Enter selects.")).toBe(
    true,
  );
  expect(welcome.heading.textContent).toBe("Quick tour");
});

test("priority allocation fills root and groups overflow without losing item identity", async () => {
  const dock = fixture();
  dock.style.setProperty("--nook-root-max-items", "5");
  const extra = (label, priority, group) => {
    const action = document.createElement("nook-action");
    action.setAttribute("label", label);
    action.priority = priority;
    action.group = group;
    dock.append(action);
    return action;
  };
  const work = extra("Work", 90, "Workspace");
  const tools = extra("Tools", 80, "Workspace");
  const support = extra("Support", -10, "Support");
  await settle();
  const first = dock.querySelector("#action");
  const original = dock.records.get(first).buttons[0];
  expect(dock.rootItems.includes(work)).toBe(true);
  expect(dock.rootItems.includes(tools)).toBe(true);
  expect(dock.overflowItems.includes(first)).toBe(true);
  expect(dock.overflowItems.includes(support)).toBe(true);
  expect(dock.builtins.get("quick").hidden).toBe(true);
  const overflow = dock.views.get("full");
  const button = overflow.overflowButtons.get(support).button;
  expect(overflow.overflowGroups.get("Support").el.hidden).toBe(false);
  support.group = "Workspace";
  await settle();
  expect(overflow.overflowButtons.get(support).button === button).toBe(true);
  expect(
    button.parentNode === overflow.overflowGroups.get("Workspace").body,
  ).toBe(true);
  first.priority = 300;
  await settle();
  expect(dock.records.get(first).buttons[0] === original).toBe(true);
  expect(original.parentNode === dock.views.get("root").grid).toBe(true);
  let chosen;
  dock.addEventListener(
    "nook-action",
    (event) => (chosen = event.detail.source),
  );
  dock.open("overflow");
  button.click();
  expect(chosen === support).toBe(true);
  support.remove();
  tools.remove();
  work.remove();
  await settle();
  expect(dock.overflowEntries.length).toBe(0);
  expect(dock.builtins.get("quick").hidden).toBe(true);
  expect(dock.rootItems.includes(first)).toBe(true);
  expect(button.isConnected).toBe(false);
});

test("reserved root slots survive resize and builtin priorities", async () => {
  const width = window.innerWidth;
  try {
    window.innerWidth = 280;
    const dock = fixture();
    for (let i = 0; i < 6; i++) {
      const item = document.createElement("nook-action");
      item.setAttribute("label", `Extra ${i}`);
      item.priority = 50 - i;
      dock.append(item);
    }
    await settle();
    assert.equal(dock.rootEntries.length, 6);
    assert.deepEqual(
      dock.rootEntries.slice(0, 2).map((entry) => entry.id),
      ["all", "settings"],
    );
    assert.equal(
      dock.overflowEntries.some((entry) => entry.id === "settings"),
      false,
    );
    dock.priorities = { settings: -1000 };
    await settle();
    assert.deepEqual(
      dock.rootEntries.slice(0, 2).map((entry) => entry.id),
      ["all", "settings"],
    );
    window.innerWidth = 1024;
    window.dispatchEvent(new Event("resize"));
    await settle();
    assert.equal(dock.rootEntries.length, 6);
    assert.equal(dock.views.get("root").presentation, "compact");
  } finally {
    window.innerWidth = width;
  }
});

test("an emptied overflow returns to root without discarding an open child panel", async () => {
  const dock = fixture();
  const panel = document.createElement("nook-panel");
  panel.setAttribute("label", "Draft");
  panel.priority = -100;
  panel.innerHTML = '<template slot="content"><input value="start"></template>';
  dock.append(panel);
  const additions = [];
  for (let i = 0; i < 3; i++) {
    const action = document.createElement("nook-action");
    action.priority = 40;
    action.setAttribute("label", `Extra ${i}`);
    dock.append(action);
    additions.push(action);
  }
  await settle();
  dock.open("overflow");
  dock.views.get("full").overflowButtons.get(panel).button.click();
  const input = dock.views.get(panel).body.querySelector("input");
  input.value = "retained";
  additions.forEach((item) => item.remove());
  await settle();
  expect(dock.state.path.at(-1) === panel).toBe(true);
  expect(dock.state.path.includes("full")).toBe(false);
  expect(input.value).toBe("retained");
  dock.send({ type: "back" });
  expect(dock.state.path.at(-1)).toBe("root");
});

test("Alt tooltip suppression survives a pending layout refresh and clears on blur", async () => {
  const dock = fixture();
  await settle();
  dock.open();
  let resolveLayout;
  keyboard.getLayoutMap = () =>
    new Promise((resolve) => {
      resolveLayout = resolve;
    });
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "Alt",
      altKey: true,
      bubbles: true,
    }),
  );
  expect(dock.anchor.hasAttribute("data-alt-held")).toBe(true);
  expect(dock.browserKeyboardLayout).toBe(undefined);
  expect(dock.anchor.dataset.numbering).toBe(undefined);
  window.dispatchEvent(new Event("blur"));
  expect(dock.anchor.hasAttribute("data-alt-held")).toBe(false);
  resolveLayout(layout);
  await settle();
  expect(dock.anchor.dataset.numbering).toBe(undefined);
});

test("edge-center anchors reflect position, preview eight targets, and respect blocked positions", async () => {
  const dock = fixture();
  await settle();
  expect(dock.landingSpots.size).toBe(8);
  let changed;
  dock.addEventListener(
    "nook-position-change",
    (event) => (changed = event.detail.position),
  );
  dock.position = "left-center";
  expect(dock.state.corner).toBe("left-center");
  expect(dock.anchor.dataset.position).toBe("left-center");
  expect(dock.getAttribute("corner")).toBe("left-center");
  expect(changed).toBe("left-center");
  dock.disabledPositions = positions.filter(
    (position) => position !== "top-center",
  );
  expect(dock.position).toBe("top-center");
  expect(dock.canDrag()).toBe(false);
  dock.disabledPositions = [];
  expect(dock.position).toBe("left-center");
  dock.position = "top-center";
  dock.handle.setPointerCapture = () => {};
  dock.handle.hasPointerCapture = () => false;
  dock.pointerdown({
    button: 0,
    pointerId: 91,
    clientX: window.innerWidth / 2,
    clientY: 10,
  });
  await new Promise((resolve) => setTimeout(resolve, 470));
  dock.pointermove({
    pointerId: 91,
    clientX: window.innerWidth - 5,
    clientY: window.innerHeight / 2,
  });
  expect(dock.preview.dataset.corner).toBe("right-center");
  expect(dock.position).toBe("top-center");
  dock.pointerup({
    pointerId: 91,
    clientX: window.innerWidth - 5,
    clientY: window.innerHeight / 2,
  });
  expect(dock.position).toBe("right-center");
});

test("library supplies the first-use tutorial without a guide or corner-picker menu", async () => {
  const dock = fixture();
  await settle();
  dock.open();
  expect(dock.views.has("help")).toBe(false);
  expect(dock.views.has("corners")).toBe(false);
  expect(
    dock.shadowRoot.querySelector(
      '[part="move-button"],[part="corner-option"]',
    ),
  ).toBe(null);
  dock.open("help");
  expect(dock.state.path).toEqual(["root"]);
  dock.open("corners");
  expect(dock.state.path).toEqual(["root"]);
});

test("viewport changes preserve preferred anchors and ignore height-only resizing while editing", async () => {
  const width = window.innerWidth,
    height = window.innerHeight;
  try {
    const dock = fixture();
    await settle();
    dock.positionMedia = { matches: true };
    window.innerWidth = 844;
    window.innerHeight = 390;
    window.dispatchEvent(new Event("resize"));
    dock.position = "top-center";
    window.innerWidth = 390;
    window.innerHeight = 844;
    window.dispatchEvent(new Event("resize"));
    expect(dock.position).toBe("top-left");
    expect(dock.preferredPosition).toBe("top-center");
    const setting = document.createElement("nook-setting");
    setting.setAttribute("type", "text");
    setting.setAttribute("label", "Draft");
    dock.append(setting);
    await settle();
    dock.open("settings");
    setting._control.focus();
    setting._control.value = "Keep this draft";
    window.innerHeight = 300;
    window.dispatchEvent(new Event("resize"));
    expect(dock.availablePositions.includes("top-center")).toBe(false);
    window.innerWidth = 844;
    window.innerHeight = 390;
    window.dispatchEvent(new Event("resize"));
    expect(dock.position).toBe("top-center");
    expect(setting._control.value).toBe("Keep this draft");
    window.innerWidth = 390;
    window.innerHeight = 844;
    window.dispatchEvent(new Event("resize"));
    expect(dock.position).toBe("top-left");
    let detail;
    dock.addEventListener(
      "nook-position-change",
      (event) => (detail = event.detail),
    );
    dock.position = "top-left";
    expect(dock.preferredPosition).toBe("top-left");
    expect(detail.reason).toBe("preference");
    window.innerWidth = 844;
    window.innerHeight = 390;
    window.dispatchEvent(new Event("resize"));
    expect(dock.position).toBe("top-left");
    window.innerWidth = 390;
    window.innerHeight = 844;
    window.dispatchEvent(new Event("resize"));
    dock.position = "top-center";
    dock.setAttribute("position-policy", "all");
    expect(dock.position).toBe("top-center");
    dock.disabledPositions = ["top-center"];
    expect(dock.availablePositions.includes("top-center")).toBe(false);
  } finally {
    window.innerWidth = width;
    window.innerHeight = height;
  }
});

test("the dense action fixture reconciles priorities and retains mounted panel state", async () => {
  const { populateStress } = await import("../demo/stress.js");
  const dock = fixture();
  populateStress(dock, "actions");
  await settle();
  expect(
    dock.querySelectorAll('nook-action[id^="stress-action-"]').length,
  ).toBe(80);
  expect(dock.overflowEntries.length > 75).toBe(true);
  const item = dock.querySelector("#stress-action-79");
  const button = dock.records.get(item).buttons[0];
  const panel = dock.querySelector("#stress-panel");
  const body = dock.views.get(panel).body;
  const field = document.createElement("input");
  field.value = "retained dense draft";
  body.append(field);
  dock.open(panel);
  item.priority = 9999;
  await settle();
  expect(dock.rootItems[0] === item).toBe(true);
  expect(dock.records.get(item).buttons[0] === button).toBe(true);
  expect(dock.views.get(panel).body.contains(field)).toBe(true);
  expect(field.value).toBe("retained dense draft");
  expect(
    dock.views.get(dock.querySelector("#stress-menu")).el.dataset.layout,
  ).toBe("list");
});

test("localization updates existing controls and labels without losing drafts", async () => {
  const dock = fixture();
  await settle();
  dock.activate(dock.querySelector("#panel"));
  const input = dock.views
    .get(dock.querySelector("#panel"))
    .body.querySelector("input");
  input.value = "unfinished";
  const action = dock.records.get(dock.querySelector("#action"));
  dock.localization = {
    locale: "es",
    catalogue: {
      nook: {
        Share: "Compartir",
        Feedback: "Comentarios",
        Settings: "Ajustes",
      },
    },
  };
  await settle();
  assert.equal(dock.locale, "es");
  assert.equal(dock.records.get(dock.querySelector("#action")), action);
  assert.equal(input.value, "unfinished");
  assert.ok(dock.shadowRoot.textContent.includes("Compartir"));
  dock.localization = { locale: "en" };
  await settle();
  assert.equal(input.value, "unfinished");
  assert.ok(dock.shadowRoot.textContent.includes("Share"));
});

test("capture sessions accumulate, review and remove snapshots, then restore the draft", async () => {
  const dock = fixture();
  dock.querySelector("[feedback]").remove();
  dock.feedback = {
    submit: async () => {},
    captureScreenshot: async () =>
      new File(["shot"], "screen.png", { type: "image/png" }),
  };
  await settle();
  dock.open("feedback");
  const body = dock.views.get("feedback").body;
  body.querySelector("textarea").value = "keep this";
  body.querySelector("[part=feedback-capture]").click();
  const shadow = dock.shadowRoot;
  assert.equal(dock.feedbackUI.capturing, true);
  await shadow.querySelector("[part=capture-snapshot]").onclick();
  await shadow.querySelector("[part=capture-snapshot]").onclick();
  assert.equal(
    shadow.querySelector("[part=capture-review]").getAttribute("aria-label"),
    "2 snapshots",
  );
  assert.equal(shadow.querySelector("[part=capture-count]").textContent, "2");
  assert.equal(shadow.querySelector("[part=capture-gallery]").hidden, true);
  shadow.querySelector("[part=capture-review]").click();
  assert.equal(shadow.querySelector("[part=capture-gallery]").hidden, false);
  shadow.querySelector("[part=capture-hide-previews]").click();
  assert.equal(shadow.querySelector("[part=capture-gallery]").hidden, true);
  assert.equal(
    shadow.querySelector("[part=capture-review]").getAttribute("aria-expanded"),
    "false",
  );
  shadow.querySelector("[part=capture-review]").click();
  assert.equal(shadow.querySelectorAll("[part=capture-thumbnail]").length, 2);
  shadow.querySelector("[part=capture-remove]").click();
  assert.equal(
    shadow.querySelector("[part=capture-review]").getAttribute("aria-label"),
    "1 snapshot",
  );
  shadow.querySelector("[part=capture-done]").click();
  assert.equal(dock.feedbackUI.capturing, false);
  assert.equal(body.querySelector("textarea").value, "keep this");
  assert.equal(body.querySelectorAll("[part=feedback-attachment]").length, 1);
});

test("wrapped apps remain live while bounds follow the dock and viewport opt-out", async () => {
  const dock = document.createElement("nook-dock");
  const app = document.createElement("main");
  app.innerHTML = '<input value="draft">';
  dock.append(app);
  dock.getBoundingClientRect = () => ({
    left: 20,
    top: 80,
    right: 360,
    bottom: 650,
    width: 340,
    height: 570,
  });
  document.body.append(dock);
  await settle();
  assert.equal(dock.anchorRect.wrapped, true);
  assert.equal(dock.anchorRect.top, 80);
  assert.equal(dock.anchorRect.width, 340);
  assert.equal(dock.captureRoot, app);
  assert.equal(dock.shadowRoot.querySelector("[part=app]").localName, "slot");
  assert.equal(dock.captureExclusions.includes(dock), false);
  assert.equal(app.querySelector("input").value, "draft");
  dock.setAttribute("boundary", "viewport");
  await settle();
  assert.equal(dock.anchorRect.wrapped, false);
  assert.equal(dock.anchorRect.top, 0);
  assert.equal(app.querySelector("input").value, "draft");
});

test("full menu includes root and overflow items and reconciles removals live", async () => {
  const dock = fixture();
  await settle();
  dock.open("all");
  await settle();
  const all = dock.views.get("all");
  assert.equal(all.el.hidden, false);
  assert.ok(all.body.textContent.includes("Share"));
  assert.ok(all.body.textContent.includes("Feedback"));
  dock.querySelector("#action").remove();
  await settle();
  assert.equal(all.body.textContent.includes("Share"), false);
});

test("releasing a held dial outside its options cancels without a fast-swipe fallback", async () => {
  const dock = fixture();
  await settle();
  dock.handle.setPointerCapture = () => {};
  dock.handle.hasPointerCapture = () => false;
  dock.pointerdown({ button: 0, pointerId: 91, clientX: 900, clientY: 700 });
  dock.pointermove({ pointerId: 91, clientX: 820, clientY: 620 });
  await new Promise((resolve) => setTimeout(resolve, 210));
  assert.equal(dock.swipeDial.shown, true);
  dock.pointerup({ pointerId: 91, clientX: 700, clientY: 400 });
  assert.deepEqual(dock.state.path, []);
  assert.equal(dock.suppressClick, true);
  assert.equal(dock.swipeDial.shown, false);
});

test("horizontal and diagonal swipes open full menu even without root overflow", async () => {
  const dock = document.createElement("nook-dock");
  dock.innerHTML = '<nook-action label="Only action"></nook-action>';
  document.body.append(dock);
  await settle();
  assert.equal(dock.surfaceAvailable("full"), false);
  dock.handle.setPointerCapture = () => {};
  dock.handle.hasPointerCapture = () => false;
  for (const [dx, dy] of [
    [-90, 0],
    [-90, -90],
  ]) {
    dock.pointerdown({ button: 0, pointerId: 92, clientX: 900, clientY: 700 });
    dock.pointermove({ pointerId: 92, clientX: 900 + dx, clientY: 700 + dy });
    dock.pointerup({ pointerId: 92, clientX: 900 + dx, clientY: 700 + dy });
    await settle();
    assert.deepEqual(dock.state.path, ["all"]);
    assert.equal(dock.views.get("all").el.hidden, false);
    dock.close();
    await settle();
  }
});

test("keyboard resizing a wrapped app preserves anchor policy while a light DOM editor is focused", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(window, "visualViewport");
  const viewport = new window.EventTarget();
  Object.assign(viewport, {
    offsetLeft: 0,
    offsetTop: 0,
    width: 390,
    height: 844,
  });
  Object.defineProperty(window, "visualViewport", {
    configurable: true,
    value: viewport,
  });
  const dock = document.createElement("nook-dock");
  try {
    dock.innerHTML =
      '<main><input value="Keep this draft"></main><nook-action label="Share"></nook-action>';
    dock.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 390,
      bottom: 844,
      width: 390,
      height: 844,
    });
    document.body.append(dock);
    await settle();
    dock.positionMedia = { matches: true };
    dock.refreshPositions();
    dock.position = "top-center";
    assert.equal(dock.position, "top-left");
    const input = dock.querySelector("input");
    input.focus();
    viewport.height = 300;
    viewport.dispatchEvent(new window.Event("resize"));
    await settle();
    assert.equal(dock.anchorRect.bottom, 300);
    assert.equal(dock.position, "top-left");
    assert.equal(dock.preferredPosition, "top-center");
    assert.equal(input.value, "Keep this draft");
    viewport.height = 844;
    viewport.dispatchEvent(new window.Event("resize"));
    await settle();
    assert.equal(dock.anchorRect.bottom, 844);
  } finally {
    dock.remove();
    if (descriptor) Object.defineProperty(window, "visualViewport", descriptor);
    else delete window.visualViewport;
  }
});

test("settings link updates live below controls without replacing drafts and localizes its label", async () => {
  const dock = fixture();
  const setting = document.createElement("nook-setting");
  setting.setAttribute("label", "Draft");
  setting.setAttribute("type", "text");
  dock.append(setting);
  await settle();
  dock.open("settings");
  const view = dock.views.get("settings"),
    link = view.link,
    control = setting._control;
  control.value = "Keep this draft";
  assert.equal(view.footer.hidden, true);
  dock.settingsHref = "/app/settings";
  await settle();
  assert.equal(dock.getAttribute("settings-href"), "/app/settings");
  assert.equal(link.getAttribute("href"), "/app/settings");
  assert.equal(view.footer.hidden, false);
  assert.equal(view.body.lastElementChild, view.footer);
  assert.equal(link.textContent, "All settings");
  dock.setAttribute("settings-href", "/account/settings");
  await settle();
  assert.equal(dock.settingsHref, "/account/settings");
  assert.equal(view.link, link);
  assert.equal(link.getAttribute("href"), "/account/settings");
  const another = document.createElement("nook-setting");
  another.setAttribute("label", "Another");
  dock.append(another);
  await settle();
  assert.equal(view.body.lastElementChild, view.footer);
  dock.localization = {
    locale: "es",
    catalogue: { nook: { "All settings": "Todos los ajustes" } },
  };
  await settle();
  assert.equal(link.textContent, "Todos los ajustes");
  assert.equal(setting._control, control);
  assert.equal(control.value, "Keep this draft");
  dock.settingsHref = null;
  await settle();
  assert.equal(view.footer.hidden, true);
  assert.equal(link.hasAttribute("href"), false);
  assert.deepEqual(dock.state.path, ["settings"]);
  assert.equal(control.value, "Keep this draft");
});

test("a full settings link alone enables Settings and removing it withdraws the empty view", async () => {
  const dock = document.createElement("nook-dock");
  dock.setAttribute("settings-href", "/settings");
  document.body.append(dock);
  await settle();
  assert.equal(dock.surfaceAvailable("settings"), true);
  assert.ok(dock.rootEntries.some((entry) => entry.id === "settings"));
  dock.open("settings");
  await settle();
  const view = dock.views.get("settings");
  assert.equal(view.el.hidden, false);
  assert.equal(view.footer.hidden, false);
  assert.equal(view.link.getAttribute("href"), "/settings");
  dock.settingsHref = "";
  await settle();
  assert.equal(dock.hasAttribute("settings-href"), false);
  assert.equal(dock.surfaceAvailable("settings"), false);
  assert.deepEqual(dock.state.path, []);
  assert.equal(view.footer.hidden, true);
});

test("stress feedback fixtures project an injected screenshot hook in both feedback scenarios", async () => {
  const { populateStress } = await import("../demo/stress.js");
  const dock = fixture();
  let calls = 0;
  const captureScreenshot = async () => {
    calls++;
    return new File(["shot"], "stress.png", { type: "image/png" });
  };
  for (const scenario of ["mixed", "feedback"]) {
    dock.feedback = false;
    populateStress(dock, scenario, { captureScreenshot });
    await settle();
    dock.open("feedback");
    await settle();
    const button = dock.views
      .get("feedback")
      .body.querySelector("[part=feedback-capture]");
    assert.equal(button.hidden, false);
    button.click();
    assert.equal(dock.feedbackUI.capturing, true);
    await dock.shadowRoot.querySelector("[part=capture-snapshot]").onclick();
    dock.shadowRoot.querySelector("[part=capture-done]").click();
    assert.equal(
      dock.views
        .get("feedback")
        .body.querySelectorAll("[part=feedback-attachment]").length,
      1,
    );
  }
  assert.equal(calls, 2);
  dock.feedback = false;
  populateStress(dock, "feedback");
  await settle();
  assert.equal(
    dock.views.get("feedback").body.querySelector("[part=feedback-capture]")
      .hidden,
    true,
  );
});

test("nook-item references inherit command names and bindings with one execution path", async () => {
  const dock = document.createElement("nook-dock");
  dock.innerHTML =
    '<nook-item id="save-item" command="save" keybind="Alt+X"></nook-item><nook-command id="save" name="Save changes" description="Save the current draft" keybind="Alt+C"></nook-command>';
  document.body.append(dock);
  await settle();
  const item = dock.querySelector("nook-item"),
    command = dock.querySelector("nook-command");
  assert.equal(item.command, "save");
  assert.equal(item.keybind, "Alt+C");
  assert.equal(dock.anchorRect.wrapped, false);
  const button = dock.records.get(item).buttons[0];
  assert.equal(button.getAttribute("aria-label"), "Save changes");
  assert.ok(button.querySelector(".tooltip").textContent.includes("Alt+C"));
  let picks = 0,
    runs = 0;
  dock.addEventListener("nook-select", (event) => {
    picks++;
    assert.equal(event.detail.source, item);
    assert.equal(event.detail.command, command);
  });
  dock.addEventListener("nook-command", (event) => {
    runs++;
    assert.equal(event.detail.source, command);
  });
  dock.activate(item);
  assert.equal(picks, 1);
  assert.equal(runs, 1);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "c",
      code: "KeyC",
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(picks, 1);
  assert.equal(runs, 2);
  document.dispatchEvent(
    new window.KeyboardEvent("keydown", {
      key: "x",
      code: "KeyX",
      altKey: true,
      bubbles: true,
      cancelable: true,
    }),
  );
  assert.equal(runs, 2);
  command.keybind = "Alt+S";
  command.setAttribute("name", "Store draft");
  await settle();
  assert.equal(item.keybind, "Alt+S");
  assert.equal(dock.records.get(item).buttons[0], button);
  assert.equal(button.getAttribute("aria-label"), "Store draft");
});

test("referencing items share command arguments and can override invocation", async () => {
  const dock = document.createElement("nook-dock");
  dock.innerHTML =
    '<nook-item id="first" command="create"></nook-item><nook-item id="second" command="create" label="Create another"></nook-item><nook-command id="create" name="Create note" description="Create a named note"><nook-arg name="title" label="Title" required></nook-arg></nook-command>';
  document.body.append(dock);
  await settle();
  const first = dock.querySelector("#first"),
    second = dock.querySelector("#second"),
    command = dock.querySelector("#create");
  dock.open();
  dock.addEventListener("nook-select", (event) => event.preventDefault(), {
    once: true,
  });
  dock.activate(first);
  assert.deepEqual(dock.state.path, ["root"]);
  dock.activate(first);
  assert.equal(dock.state.path.at(-1), command);
  const input = dock.views.get(command).body.querySelector("input[name=title]");
  input.value = "An unfinished draft";
  dock.close();
  dock.activate(second);
  assert.equal(
    dock.views.get(command).body.querySelector("input[name=title]"),
    input,
  );
  assert.equal(input.value, "An unfinished draft");
  let result;
  dock.addEventListener("nook-command", (event) => (result = event.detail));
  dock.views
    .get(command)
    .body.querySelector("form")
    .dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  assert.equal(result.source, command);
  assert.equal(result.args.title, "An unfinished draft");
});

test("item references reconcile availability and standalone items remain custom hooks", async () => {
  const dock = document.createElement("nook-dock");
  dock.context = { page: "draft" };
  dock.innerHTML =
    '<nook-item id="linked" command="later"></nook-item><nook-item id="custom" label="Custom flow"></nook-item>';
  document.body.append(dock);
  await settle();
  const linked = dock.querySelector("#linked"),
    custom = dock.querySelector("#custom");
  assert.equal(dock.records.has(linked), false);
  const command = document.createElement("nook-command");
  command.id = "later";
  command.setAttribute("name", "Later");
  command.setAttribute("description", "A command added live");
  dock.append(command);
  await settle();
  assert.equal(dock.records.has(linked), true);
  command.setAttribute("disabled", "");
  await settle();
  assert.equal(dock.records.has(linked), false);
  command.removeAttribute("disabled");
  await settle();
  assert.equal(dock.records.has(linked), true);
  command.remove();
  await settle();
  assert.equal(dock.records.has(linked), false);
  let detail;
  dock.addEventListener("nook-select", (event) => {
    detail = event.detail;
    event.preventDefault();
  });
  dock.open();
  dock.activate(custom);
  assert.equal(detail.source, custom);
  assert.equal(detail.command, null);
  assert.deepEqual(detail.context, { page: "draft" });
  assert.deepEqual(dock.state.path, ["root"]);
});

test("an open requested immediately after connection waits for the menu query to boot", async () => {
  const dock = document.createElement("nook-dock");
  dock.innerHTML = '<nook-item label="Immediate"></nook-item>';
  document.body.append(dock);
  dock.open();
  await settle();
  assert.deepEqual(dock.state.path, ["root"]);
  assert.equal(dock.views.get("root").el.hidden, false);
});

test("translating feedback labels preserves the live message input and draft", async () => {
  const dock = fixture();
  dock.querySelector("[feedback]").remove();
  dock.feedback = { submit: async () => {} };
  await settle();
  dock.open("feedback");
  const body = dock.views.get("feedback").body,
    input = body.querySelector("textarea");
  input.value = "Keep my feedback draft";
  dock.localization = {
    locale: "es",
    catalogue: { nook: { "Tell us more": "Cuéntanos más" } },
  };
  await settle();
  assert.equal(body.querySelector("textarea"), input);
  assert.equal(input.value, "Keep my feedback draft");
  assert.equal(
    body.querySelector("[part=feedback-message-label]").textContent,
    "Cuéntanos más",
  );
});
