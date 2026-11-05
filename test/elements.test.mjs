import { test, beforeEach, afterEach, after as afterAll } from "node:test";
import assert from "node:assert/strict";
const expect = (value) => ({
  toBe: (expected) => assert.equal(value, expected),
  toEqual: (expected) => assert.deepEqual(value, expected),
  toBeNull: () => assert.equal(value, null),
});
import { Window } from "happy-dom";
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
function fixture() {
  const dock = document.createElement("nook-dock");
  dock.innerHTML =
    '<nook-action id="action" label="Share"></nook-action><nook-panel id="panel" root label="Feedback" feedback><template slot="content"><input value="original"></template></nook-panel><nook-setting id="setting" label="Dark" type="toggle" value="false"></nook-setting>';
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
  const quick = dock.records.get(extra).quick;
  extra.remove();
  await settle();
  expect(dock.records.has(extra)).toBe(false);
  expect(quick.isConnected).toBe(false);
  dock.close();
  await settle();
  action.root = true;
  await settle();
  expect(button.parentNode).toBe(dock.views.get("root").grid);
  expect(dock.records.get(action).quick).toBeNull();
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
  expect(dock.views.get("full").grid.firstChild).toBe(
    dock.records.get(menu).buttons[0],
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
  expect(root.el.dataset.presentation).toBe("expanded");
  expect(dock.records.get(panel).buttons[0]).toBe(button);
  additions.forEach((item) => item.remove());
  await settle();
  expect(root.el.dataset.presentation).toBe("compact");
  dock.setAttribute("root-presentation", "expanded");
  await settle();
  expect(root.el.dataset.presentation).toBe("expanded");
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
  await settle();
  dock.open("full");
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
  expect(dock.anchor.dataset.numbering).toBe("true");
  expect(button.querySelector("[part=number]").textContent).toBe("1");
  document.dispatchEvent(
    new window.KeyboardEvent("keyup", {
      key: "Alt",
      altKey: false,
      bubbles: true,
    }),
  );
  expect(dock.anchor.dataset.numbering).toBe(undefined);
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
      code: "Digit1",
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

test("first opening pulses, introduces Nook, and remembers the introduction", async () => {
  window.localStorage.removeItem("@3sln/nook:tutorial:v1");
  const dock = fixture();
  await settle();
  expect(dock.handle.classList.contains("inviting")).toBe(true);
  dock.open();
  expect(dock.state.path).toEqual(["welcome"]);
  expect(dock.handle.classList.contains("inviting")).toBe(false);
  expect(window.localStorage.getItem("@3sln/nook:tutorial:v1")).toBe("seen");
  dock.views
    .get("welcome")
    .body.querySelector("[part=tutorial-continue]")
    .click();
  expect(dock.state.path).toEqual(["root"]);
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
  dock.disabledCorners = ["top-left", "top-right", "bottom-left"];
  expect(dock.canDrag()).toBe(false);
  expect(dock.anchor.dataset.draggable).toBe("false");
  dock.handle.setPointerCapture = () => {};
  dock.handle.hasPointerCapture = () => false;
  dock.pointerdown({ button: 0, pointerId: 61, clientX: 100, clientY: 100 });
  await new Promise((resolve) => setTimeout(resolve, 470));
  expect(dock.pointer.drag).toBe(false);
  expect(dock.preview.hidden).toBe(true);
  dock.cancelPointer();
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
  ).toBe(3);
  dock.disabledCorners = ["top-left", "top-right", "bottom-left"];
  expect(dock.pointer).toBe(null);
  expect(dock.preview.hidden).toBe(true);
  expect([...dock.landingSpots.values()].every((spot) => spot.hidden)).toBe(
    true,
  );
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
  expect(captureArgs.exclude).toEqual([dock]);
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
  const pending = body.querySelector("[part=feedback-capture]").onclick();
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
    helpTitle: "Workspace guide",
    moveLabel: "Reposition",
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
  expect(dock.views.get("help").heading.textContent).toBe("Workspace guide");
  dock.open("help");
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
  expect(
    keyboard.textContent.includes("A small corner for useful extras."),
  ).toBe(true);
  expect(welcome.heading.textContent).toBe("Welcome to Nook");
  expect(dock.views.get("help").heading.textContent).toBe("Meet Nook");
});
