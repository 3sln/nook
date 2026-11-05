import feedbackUI from "./ui/feedback.js";
import enumPicker from "./ui/enumPicker.js";
import motion from "./ui/motion.js";
import { sprite, icon } from "./ui/icons.js";
import { onboardingResource } from "./providers/onboarding.js";
import commandPalette from "./ui/commandPalette.js";
import { validCommand } from "./bl/commands.js";
import { QueryStore } from "@3sln/ngin/queries";
import { Container, Provider } from "@3sln/ngin/providers";
import {
  MenuState,
  gesture,
  closestAllowedCorner,
  availableCorners,
  corners,
  matchesKey,
  presentation,
  inheritedPresentation,
  selectionNumber,
  bindingSupported,
} from "./bl/menu.js";
import styles from "./ui/styles.js";

const mark = icon("nook");
const tags = "nook-action,nook-menu,nook-panel,nook-setting,nook-command";
const make = (tag, part, text) => {
  const node = document.createElement(tag);
  if (part) node.setAttribute("part", part);
  if (text != null) node.textContent = text;
  return node;
};
const emit = (node, name, detail) =>
  node.dispatchEvent(
    new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
      cancelable: true,
    }),
  );
const childSlot = (item, slot) =>
  [...item.children].find((node) => node.getAttribute("slot") === slot);
const slotText = (item, slot) => {
  const node = childSlot(item, slot);
  return (
    node instanceof HTMLTemplateElement
      ? node.content.textContent
      : node?.textContent
  )?.trim();
};
const label = (item) =>
  item.getAttribute("label") || slotText(item, "label") || "Untitled";
const available = (item) => !item.closest("[hidden],[disabled],template");

export class NookItem extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:none!important}</style>";
  }
  get root() {
    return this.hasAttribute("root");
  }
  set root(value) {
    this.toggleAttribute("root", Boolean(value));
  }
  get keybind() {
    return this.getAttribute("keybind") || "";
  }
  set keybind(value) {
    this.setAttribute("keybind", value);
  }
  get value() {
    return this._control
      ? this._control.type === "checkbox"
        ? this._control.checked
        : this._control.value
      : this.getAttribute("value");
  }
  set value(value) {
    if (this._control) {
      if (this._control.type === "checkbox")
        this._control.checked = Boolean(value);
      else this._control.value = value;
    }
    this.setAttribute("value", String(value));
  }
}

export class NookDock extends HTMLElement {
  static observedAttributes = [
    "corner",
    "disabled-corners",
    "root-keybind",
    "settings-keybind",
    "quick-keybind",
    "feedback-keybind",
    "commands-keybind",
    "feedback-disabled",
  ];
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    const style = make("style");
    style.textContent = styles;
    this.shadowRoot.append(style);
    const symbols = make("template");
    symbols.innerHTML = sprite;
    this.shadowRoot.append(symbols.content);
    this.anchor = make("div", "anchor");
    this.anchor.className = "anchor";
    this.handle = make("button", "handle");
    this.handle.className = "handle";
    this.handle.type = "button";
    this.handle.setAttribute("aria-label", "Open Nook menu");
    this.handle.setAttribute("aria-haspopup", "dialog");
    const icon = make("span", "mark");
    icon.className = "mark";
    icon.innerHTML = mark;
    this.handleTip = make("span", "handle-tooltip");
    this.handleTip.className = "handle-tooltip";
    this.handleTip.setAttribute("role", "tooltip");
    this.handleTipShortcut = make("span", "handle-shortcut");
    const dragHint = make("span", "drag-hint", "Hold, then drag to move.");
    this.handleTip.append(this.handleTipShortcut, dragHint);
    this.updateHandleTip();
    this.handle.append(icon, this.handleTip);
    this.live = make("div", "announcement");
    this.live.className = "live";
    this.live.setAttribute("aria-live", "polite");
    this.anchor.append(this.handle, this.live);
    this.shadowRoot.append(this.anchor);
    this.preview = make("div", "drag-preview");
    this.preview.className = "anchor preview";
    this.preview.hidden = true;
    this.preview.setAttribute("aria-hidden", "true");
    const previewHandle = make("div", "preview-handle");
    previewHandle.className = "handle";
    const previewMark = make("span", "preview-mark");
    previewMark.className = "mark";
    previewMark.innerHTML = mark;
    previewHandle.append(previewMark);
    this.preview.append(previewHandle);
    this.shadowRoot.append(this.preview);
    this.landingSpots = new Map();
    for (const corner of corners) {
      const spot = make("div", "landing-zone");
      spot.className = "anchor landing-zone";
      spot.dataset.corner = corner;
      spot.hidden = true;
      spot.setAttribute("aria-hidden", "true");
      const shape = make("div", "landing-outline");
      shape.className = "handle";
      spot.append(shape);
      this.landingSpots.set(corner, spot);
      this.shadowRoot.append(spot);
    }

    this.records = new Map();
    this.views = new Map();
    this.intents = new EventTarget();
    this.handle.addEventListener("click", () => {
      this.dismissHandleTip();
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      this.send({
        type: this.state?.path.length ? "close" : "open",
        view: "root",
      });
    });
    this.handle.addEventListener("contextmenu", (e) => e.preventDefault());
    this.handle.addEventListener("pointerleave", () =>
      this.handle.removeAttribute("data-tooltip-dismissed"),
    );
    this.handle.addEventListener("focus", () => {
      if (this.lastKey === "Tab")
        this.handle.removeAttribute("data-tooltip-dismissed");
    });
  }
  connectedCallback() {
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.motion = motion({
      window: this.ownerDocument.defaultView,
      signal,
      host: this,
    });
    const keyboard = this.ownerDocument.defaultView.navigator.keyboard;
    let layoutRequest = 0;
    const readLayout = async () => {
      const request = ++layoutRequest;
      this.browserKeyboardLayout = undefined;
      this.anchor.removeAttribute("data-layout-ready");
      delete this.anchor.dataset.numbering;
      if (this.palette) this.reconcile();
      let layout;
      try {
        const reported = await keyboard?.getLayoutMap?.();
        if (
          reported &&
          typeof reported.get === "function" &&
          typeof reported.values === "function"
        )
          layout = reported;
      } catch {}
      if (signal.aborted || request !== layoutRequest) return;
      this.browserKeyboardLayout = layout;
      this.anchor.toggleAttribute("data-layout-ready", Boolean(layout));
      this.reconcile();
      if (this.altHeld) this.showNumbers();
    };
    this.refreshKeyboardLayout = readLayout;
    void readLayout();
    keyboard?.addEventListener?.("layoutchange", readLayout, { signal });
    this.ownerDocument.defaultView.addEventListener("focus", readLayout, {
      signal,
    });
    this.buildViews();
    this.feedbackUI?.dispose();
    this.feedbackUI = feedbackUI({
      view: this.views.get("feedback"),
      make,
      dock: this,
      getHooks: () => this.feedback,
      signal,
    });
    let storage;
    try {
      storage = this.ownerDocument.defaultView.localStorage;
    } catch {}
    this.container = new Container({
      providers: {
        intents: Provider.fromSingleton(this.intents),
        onboarding: Provider.fromSingleton(
          onboardingResource({ storage, owner: this.ownerDocument }),
        ),
      },
    });
    this.queries = new QueryStore({ container: this.container });
    this.subscription = this.queries
      .query(
        new MenuState(
          this.getAttribute("corner"),
          this.getAttribute("disabled-corners"),
        ),
      )
      .subscribe((state) => this.project(state));
    this.observer = new MutationObserver((records) => {
      if (
        records.some(
          (record) => record.target.getRootNode() !== this.shadowRoot,
        )
      )
        this.reconcile();
    });
    this.observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    this.reconcile();
    this.ownerDocument.addEventListener("keydown", (e) => this.keydown(e), {
      signal,
    });
    const clearNumbers = () => {
      this.altHeld = false;
      delete this.anchor.dataset.numbering;
    };
    this.ownerDocument.addEventListener(
      "keyup",
      (event) => {
        if (event.key === "Alt" || !event.altKey) clearNumbers();
      },
      { signal },
    );
    this.ownerDocument.defaultView.addEventListener("blur", clearNumbers, {
      signal,
    });
    this.ownerDocument.addEventListener("visibilitychange", clearNumbers, {
      signal,
    });
    this.ownerDocument.addEventListener(
      "pointerdown",
      (e) => {
        if (this.state?.path.length && !e.composedPath().includes(this))
          this.close();
      },
      { signal },
    );
    this.handle.addEventListener("pointerdown", (e) => this.pointerdown(e), {
      signal,
    });
    this.handle.addEventListener("pointermove", (e) => this.pointermove(e), {
      signal,
    });
    this.handle.addEventListener("pointerup", (e) => this.pointerup(e), {
      signal,
    });
    this.handle.addEventListener("pointercancel", () => this.cancelPointer(), {
      signal,
    });
    this.handle.addEventListener(
      "lostpointercapture",
      () => this.cancelPointer(),
      { signal },
    );
    this.ownerDocument.defaultView.addEventListener(
      "blur",
      () => this.cancelPointer(),
      { signal },
    );

    this.ownerDocument.defaultView.addEventListener(
      "resize",
      () => this.reconcile(),
      { signal },
    );
  }
  disconnectedCallback() {
    this.abort?.abort();
    this.observer?.disconnect();
    this.cancelPointer();
    for (const view of this.views.values()) {
      view.exit?.cancel();
      view.exit = null;
    }
    this.subscription?.unsubscribe();
    const queries = this.queries,
      container = this.container;
    void queries?.dispose().then(() => container.dispose());
  }
  get tutorial() {
    return this._tutorial;
  }
  set tutorial(options) {
    this._tutorial = options;
    if (this.isConnected) this.reconcile();
  }
  get feedback() {
    return this._feedback;
  }
  set feedback(hooks) {
    this._feedback = hooks;
    if (this.isConnected) this.reconcile();
  }
  feedbackDisabled() {
    return this._feedback === false || this.hasAttribute("feedback-disabled");
  }
  get disabledCorners() {
    return corners.filter(
      (corner) =>
        !availableCorners(this.getAttribute("disabled-corners")).includes(
          corner,
        ),
    );
  }
  set disabledCorners(value) {
    this.setAttribute(
      "disabled-corners",
      Array.isArray(value) ? value.join(" ") : String(value || ""),
    );
  }
  canDrag() {
    return (
      this.state?.allowedCorners ||
      availableCorners(this.getAttribute("disabled-corners"))
    ).some(
      (corner) =>
        corner !==
        (this.state?.corner || this.getAttribute("corner") || "bottom-right"),
    );
  }
  dismissHandleTip() {
    this.handle.setAttribute("data-tooltip-dismissed", "");
  }
  updateHandleTip() {
    if (!this.handleTipShortcut) return;
    const binding = this.hasAttribute("root-keybind")
      ? this.getAttribute("root-keybind")
      : "Shift+?";
    const supported = bindingSupported(binding, this.browserKeyboardLayout);
    const text = supported
      ? `Menu · ${binding
          .split("+")
          .map((key) => key.trim())
          .join(" + ")}`
      : "Menu";
    if (this.handleTipShortcut.textContent !== text)
      this.handleTipShortcut.textContent = text;
  }
  attributeChangedCallback(name, oldValue, value) {
    if (oldValue === value) return;
    if (name === "root-keybind") this.updateHandleTip();
    if (name === "feedback-disabled" && this.isConnected) this.reconcile();
    if (name === "disabled-corners")
      this.send({ type: "configure-corners", disabled: value });
    if (name === "corner" && !this.reflectingCorner)
      this.send({ type: "corner", corner: value });
  }
  send(detail) {
    this.intents.dispatchEvent(new CustomEvent("intent", { detail }));
  }
  open(view = "root") {
    if (
      ["commands", "feedback"].includes(view) &&
      this.builtins.get(view).hidden
    )
      return;
    this.send({ type: "open", view });
  }
  close() {
    this.send({ type: "close" });
  }
  view(id, title) {
    if (this.views.has(id)) return this.views.get(id);
    const el = make("section", "surface");
    el.className = "surface";
    el.dataset.view =
      typeof id === "string" ? id : id.localName.replace("nook-", "");
    el.hidden = true;
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", title);
    const header = make("header", "header");
    const back = make("button", "back");
    back.innerHTML = icon("back");
    back.className = "quiet";
    back.setAttribute("aria-label", "Go back");
    back.onclick = () => this.send({ type: "back" });
    const heading = make("h2", "heading", title);
    const close = make("button", "close");
    close.innerHTML = icon("close");
    close.className = "quiet";
    close.setAttribute("aria-label", "Close menu");
    close.onclick = () => this.close();
    header.append(back, heading, close);
    const body = make("div", "body");
    el.append(header, body);
    this.anchor.append(el);
    const result = { el, body, heading, back };
    this.views.set(id, result);
    return result;
  }
  buildViews() {
    if (this.views.has("root")) return;
    for (const [id, title] of [
      ["root", "Nook"],
      ["quick", "Quick menu"],
      ["full", "All shortcuts"],
      ["settings", "Quick settings"],
      ["help", "Meet Nook"],
      ["corners", "Make yourself at home"],
      ["commands", "Commands"],
      ["welcome", "Welcome to Nook"],
      ["feedback", "Feedback"],
    ])
      this.view(id, title);
    for (const id of ["root", "quick", "full"]) {
      const grid = make("div", "items");
      grid.className = "items";
      this.views.get(id).body.append(grid);
      this.views.get(id).grid = grid;
    }
    this.views.get("quick").el.classList.add("quick");
    const welcome = this.views.get("welcome");
    const copy = make("div", "tutorial");
    copy.className = "tutorial";
    const keyboard = make("div", "tutorial-desktop");
    keyboard.className = "keyboard-only";
    keyboard.innerHTML =
      '<p><strong>A small corner for useful extras.</strong> Click the corner to find actions, settings, and help for this page.</p><p>Use arrows to move and Enter to choose. Backspace goes back; Escape closes the menu.</p><p class="layout-hint">Hold Alt / Option to reveal numbered shortcuts.</p>';
    const touch = make("div", "tutorial-touch");
    touch.className = "touch-only";
    touch.innerHTML =
      "<p><strong>Your extras, within reach.</strong> Tap the corner for actions, settings, and help.</p><p>When available, swipe sideways for shortcuts, up or down for settings, or diagonally for the full menu.</p>";
    const welcomeMove = make(
      "p",
      "drag-hint",
      "Hold the corner, then drag to move it.",
    );
    welcomeMove.setAttribute("part", "drag-hint tutorial-drag");
    copy.append(keyboard, touch, welcomeMove);
    const done = make("button", "tutorial-continue", "Got it");
    done.className = "command-run";
    done.onclick = () => {
      let target = this.state?.introTarget;
      if (typeof target !== "string" && !this.records.has(target))
        target = "root";
      if (
        ["commands", "quick", "settings", "feedback"].includes(target) &&
        this.builtins.get(target)?.hidden
      )
        target = "root";
      this.send({ type: "finish-intro", view: target || "root" });
    };
    welcome.body.append(copy, done);

    const root = this.views.get("root");
    const helpBody = this.views.get("help").body;
    const intro = make("div", "help");
    intro.className = "help";
    // Both instruction sets stay mounted. Capability media queries update live
    // when touch emulation or the primary pointing device changes.
    const keyboardHelp = make("div", "help-desktop");
    keyboardHelp.className = "keyboard-only";
    keyboardHelp.innerHTML =
      "<p>Use arrow keys to move, Enter or Space to choose, and hold Alt/Option for numbered shortcuts.</p><p>Escape closes. Backspace goes back.</p>";
    const touchHelp = make("div", "help-touch");
    touchHelp.className = "touch-only";
    touchHelp.innerHTML =
      "<p>Tap to open. Swipe sideways for shortcuts, up or down for settings, or diagonally for all shortcuts.</p>";
    intro.append(keyboardHelp, touchHelp);
    const hold = make(
      "p",
      "drag-hint",
      "Hold, then drag to move Nook to another corner.",
    );
    hold.setAttribute("part", "drag-hint help-drag");
    intro.append(hold);
    helpBody.append(intro);
    const move = make("button", "move-button", "Choose a corner");
    move.className = "quiet";
    move.onclick = () => this.send({ type: "enter", view: "corners" });
    helpBody.append(move);
    this.tutorialUI = {
      welcome,
      help: this.views.get("help"),
      done,
      move,
      regions: [
        ["tutorial", copy],
        ["tutorial-desktop", keyboard],
        ["tutorial-touch", touch],
        ["tutorial-drag", welcomeMove],
        ["help", intro],
        ["help-desktop", keyboardHelp],
        ["help-touch", touchHelp],
        ["help-drag", hold],
      ].map(([name, element]) => ({
        name,
        element,
        defaults: [...element.childNodes],
        template: null,
      })),
    };
    const choices = make("div", "corners");
    choices.className = "corners";
    for (const corner of [
      "top-left",
      "top-right",
      "bottom-left",
      "bottom-right",
    ]) {
      const button = make("button", "corner-option", corner.replace("-", " "));
      button.onclick = () => {
        this.setAttribute("corner", corner);
      };
      button.dataset.corner = corner;
      choices.append(button);
    }
    this.views.get("corners").body.append(choices);
    this.builtins = new Map();
    for (const [id, title, iconText] of [
      ["feedback", "Feedback", icon("feedback")],
      ["quick", "Quick menu", icon("menu")],
      ["settings", "Settings", icon("settings")],
      ["commands", "Commands", icon("commands")],
    ]) {
      const b = this.itemButton(null, title, iconText);
      b.onclick = () =>
        this.send({ type: "enter", view: id === "quick" ? "full" : id });
      this.builtins.set(id, b);
      root.grid.append(b);
    }
    this.palette = commandPalette({
      view: this.views.get("commands"),
      make,
      choose: (source) => this.chooseCommand(source),
      run: (source, args) => this.runCommand(source, args),
      createEnum: (source, title, commit, initialValue) =>
        this.createEnum(source, title, commit, initialValue),
      supported: (binding) =>
        bindingSupported(binding, this.browserKeyboardLayout),
    });
    const more = this.itemButton(null, "All shortcuts", icon("more"));
    more.onclick = () => this.send({ type: "enter", view: "full" });
    this.more = more;
    this.views.get("quick").grid.append(more);
  }
  itemButton(item, title, iconText = icon("file")) {
    const button = make("button", "item");
    button.className = "item";
    button.type = "button";
    const icon = make("span", "icon");
    icon.className = "icon";
    const template = item && childSlot(item, "icon");
    if (template)
      icon.append(
        template instanceof HTMLTemplateElement
          ? template.content.cloneNode(true)
          : template.cloneNode(true),
      );
    else icon.innerHTML = iconText;
    const text = make("span", "item-label", title);
    text.className = "item-label";
    const tooltip = make(
      "span",
      "tooltip",
      title +
        (item?.keybind &&
        bindingSupported(item.keybind, this.browserKeyboardLayout)
          ? ` · ${item.keybind}`
          : ""),
    );
    tooltip.className = "tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    const number = make("span", "number");
    number.className = "number";
    number.setAttribute("aria-hidden", "true");
    button.append(icon, text, tooltip, number);
    button.setAttribute("aria-label", title);
    return button;
  }
  reconcileTutorial() {
    const ui = this.tutorialUI;
    if (!ui) return;
    const options = this.tutorial || {};
    for (const [view, title] of [
      [ui.welcome, options.title ?? "Welcome to Nook"],
      [ui.help, options.helpTitle ?? "Meet Nook"],
    ]) {
      if (view.heading.textContent !== title) view.heading.textContent = title;
      view.el.setAttribute("aria-label", title);
    }
    for (const [element, text] of [
      [ui.done, options.continueLabel ?? "Got it"],
      [ui.move, options.moveLabel ?? "Choose a corner"],
    ])
      if (element.textContent !== text) element.textContent = text;
    for (const region of ui.regions) {
      const template =
        [...this.children].find(
          (child) =>
            child.localName === "template" &&
            child.getAttribute("slot") === region.name,
        ) || null;
      if (template !== region.template) {
        region.element.replaceChildren(
          ...(template ? [template.content.cloneNode(true)] : region.defaults),
        );
        region.template = template;
      }
    }
  }
  reconcile() {
    if (!this.isConnected) return;
    this.reconcileTutorial();
    this.updateHandleTip();
    const items = [...this.querySelectorAll(tags)].filter(
      (item) =>
        item.closest("nook-dock") === this &&
        available(item) &&
        !(this.feedbackDisabled() && item.closest("[feedback]")) &&
        (item.localName !== "nook-command" || validCommand(item)),
    );
    const set = new Set(items);
    const placements = new Map();
    for (const [item, record] of this.records)
      if (!set.has(item)) {
        record.enum?.dispose();
        record.args?.dispose?.();
        record.buttons.forEach((b) => b.remove());
        record.quick?.remove();
        if (record.view) {
          record.view.el.remove();
          this.views.delete(item);
        }
        this.records.delete(item);
      }
    for (const item of items) {
      let record = this.records.get(item);
      if (!record) {
        record = { buttons: [], signature: "" };
        this.records.set(item, record);
      }
      if (item.localName === "nook-command") {
        if (!record.view) {
          record.view = this.view(item, item.getAttribute("name"));
          record.args = this.palette.mountForm(item, record.view.body);
        }
        record.view.heading.textContent = item.getAttribute("name");
        record.view.el.setAttribute("aria-label", item.getAttribute("name"));
        record.args.reconcile();
        continue;
      }
      const parent = item.parentElement.closest(tags);
      const root = item.root;
      const destinations =
        item.localName === "nook-setting"
          ? root
            ? ["root"]
            : ["settings"]
          : root
            ? ["root"]
            : parent && this.records.has(parent)
              ? [parent]
              : ["full"];
      const isPanel = item.localName === "nook-panel",
        isMenu = item.localName === "nook-menu",
        isSetting = item.localName === "nook-setting";
      if ((isPanel || isMenu) && !record.view) {
        record.view = this.view(item, label(item));
        if (isMenu) {
          const grid = make("div", "items");
          grid.className = "items";
          record.view.body.append(grid);
          record.view.grid = grid;
        } else this.mountContent(item, record.view.body);
      }
      if (record.view) {
        if (record.view.heading.textContent !== label(item))
          record.view.heading.textContent = label(item);
        record.view.el.setAttribute("aria-label", label(item));
      }
      if (isSetting) {
        const schema =
          (item.getAttribute("type") || "toggle") +
          "|" +
          (childSlot(item, "control")?.outerHTML || "");
        if (record.control && record.schema !== schema) {
          record.enum?.dispose();
          record.enum = null;
          record.buttons.forEach((button) => button.remove());
          record.buttons = [];
          record.control = null;
          item._control = null;
          item._enumPicker = null;
        }
        record.schema = schema;
      }
      if (isSetting && !record.control) {
        record.control = this.setting(item);
        record.enum = item._enumPicker;
      }
      record.enum?.reconcile();
      const signature =
        label(item) +
        "|" +
        item.keybind +
        "|" +
        childSlot(item, "icon")?.outerHTML +
        "|" +
        bindingSupported(item.keybind, this.browserKeyboardLayout);
      if (record.signature !== signature) {
        for (const button of [...record.buttons, record.quick].filter(
          Boolean,
        )) {
          if (isSetting) continue;
          const updated = this.itemButton(item, label(item));
          button.replaceChildren(...updated.childNodes);
          button.setAttribute("aria-label", label(item));
        }
        record.signature = signature;
      }
      if (isSetting) {
        const text = record.control.querySelector("[part=setting-label]");
        if (text.firstChild.textContent !== label(item))
          text.firstChild.textContent = label(item);
        const description =
          item.getAttribute("description") || slotText(item, "description");
        let small = text.querySelector("small");
        if (description) {
          if (!small) {
            small = make("small", "description");
            text.append(small);
          }
          if (small.textContent !== description)
            small.textContent = description;
        } else small?.remove();
        const control = item._control;
        if (control) {
          control.setAttribute("aria-label", label(item));
          if (control.type === "checkbox")
            control.checked = item.getAttribute("value") === "true";
          else if (
            item.hasAttribute("value") &&
            control.value !== item.getAttribute("value")
          )
            control.value = item.getAttribute("value");
          for (const attr of ["min", "max", "step"]) {
            const value = item.getAttribute(attr);
            if (value !== null && control.getAttribute(attr) !== value)
              control.setAttribute(attr, value);
            else if (value === null) control.removeAttribute(attr);
          }
        }
      }
      for (let i = 0; i < destinations.length; i++) {
        const dest = this.views.get(destinations[i]);
        if (!dest) continue;
        let button = record.buttons[i];
        if (!button) {
          button = isSetting
            ? record.control
            : this.itemButton(item, label(item));
          if (!isSetting) button.onclick = () => this.activate(item);
          record.buttons[i] = button;
        }
        const container = dest.grid || dest.body;
        if (!placements.has(container)) placements.set(container, []);
        placements.get(container).push(button);
        if (button.parentNode !== container) container.append(button);
      }
      record.buttons.slice(destinations.length).forEach((b) => b.remove());
      record.buttons.length = destinations.length;
    }
    const feedbackButton = this.builtins.get("feedback");
    if (
      feedbackButton &&
      !this.feedbackDisabled() &&
      typeof this.feedback?.submit === "function" &&
      !items.some((item) => item.hasAttribute("feedback"))
    ) {
      const root = this.views.get("root").grid;
      const buttons = placements.get(root) || [];
      buttons.unshift(feedbackButton);
      placements.set(root, buttons);
    }
    for (const [container, buttons] of placements) {
      let cursor = container.firstChild;
      for (const button of buttons) {
        if (button !== cursor) container.insertBefore(button, cursor);
        cursor = button.nextSibling;
      }
    }
    // Quick-strip mirrors are separate buttons; the persistent full menu is never
    // moved into/out of the strip, preserving focus and panel/control identity.
    const quickItems = items.filter(
      (i) =>
        !i.root &&
        i.localName !== "nook-setting" &&
        i.localName !== "nook-command" &&
        !i.parentElement.closest(tags),
    );
    const capacity = Math.max(
      1,
      Math.floor(Math.min(innerWidth - 60, 380) / 72) - 1,
    );
    for (const [item, record] of this.records) {
      const show = quickItems.slice(0, capacity).includes(item);
      if (show && !record.quick) {
        record.quick = this.itemButton(item, label(item));
        record.quick.onclick = () => this.activate(item);
        this.views.get("quick").grid.insertBefore(record.quick, this.more);
      }
      if (!show && record.quick) {
        record.quick.remove();
        record.quick = null;
      }
      if (record.quick) {
        record.quick.setAttribute("aria-label", label(item));
        const text = record.quick.querySelector(".item-label");
        if (text.textContent !== label(item)) text.textContent = label(item);
      }
    }
    let quickCursor = this.views.get("quick").grid.firstChild;
    for (const item of quickItems.slice(0, capacity)) {
      const button = this.records.get(item).quick;
      if (button !== quickCursor)
        this.views.get("quick").grid.insertBefore(button, quickCursor);
      quickCursor = button.nextSibling;
    }
    const customFeedback = items.some((item) => item.hasAttribute("feedback"));
    const feedbackEnabled =
      !this.feedbackDisabled() &&
      !customFeedback &&
      typeof this.feedback?.submit === "function";
    this.builtins.get("feedback").hidden = !feedbackEnabled;
    this.feedbackUI?.setEnabled(feedbackEnabled);
    this.feedbackUI?.reconcile();
    if (!feedbackEnabled && this.state?.path.includes("feedback")) this.close();
    this.builtins.get("quick").hidden = !quickItems.length;
    this.builtins.get("settings").hidden = !items.some(
      (i) => i.localName === "nook-setting" && !i.root,
    );
    const commands = items.filter((item) => item.localName === "nook-command");
    this.builtins.get("commands").hidden = !commands.length;
    this.palette.reconcile(commands);
    if (!commands.length && this.state?.path.includes("commands")) this.close();
    this.more.hidden = quickItems.length <= capacity;
    for (const [id, view] of this.views) {
      const kind =
        view.kind ||
        (typeof id === "string" ? id : id.localName.replace("nook-", ""));
      const count = view.grid
        ? [...view.grid.children].filter((node) => !node.hidden).length
        : view.body.querySelectorAll(".setting").length;
      const override =
        typeof id === "string"
          ? this.getAttribute(`${id}-presentation`)
          : id.getAttribute("presentation");
      view.presentation = presentation(kind, count, override);
      view.el.dataset.presentation = view.presentation;
    }
    this.reconcileGroups();

    if (this.state) {
      const valid = this.state.path.filter(
        (id) =>
          typeof id === "string" ||
          (this.views.has(id) && id.isConnected && available(id)),
      );
      if (valid.length !== this.state.path.length) {
        this.send({ type: "close" });
        return;
      }
      this.project(this.state, false);
    }
  }
  reconcileGroups() {
    // Only launch buttons are mirrored. Panels and setting controls have one
    // mounted instance, even when a menu is projected as nested sections.
    for (const [id, view] of this.views) {
      if (!view.grid || id === "quick") continue;
      if (!view.grouped) {
        view.grouped = make("div", "groups");
        view.grouped.className = "groups";
        view.body.append(view.grouped);
        view.groupNodes = new Map();
      }
      const wanted = new Set();
      const children = (parent) =>
        [...this.records.keys()].filter((item) => {
          if (["nook-setting", "nook-command"].includes(item.localName))
            return false;
          if (parent === "root") return item.root;
          if (item.root) return false;
          const owner = item.parentElement.closest(tags);
          return parent === "full" ? !owner : owner === parent;
        });
      const place = (parent, container) => {
        let cursor = container.firstChild;
        for (const item of children(parent)) {
          wanted.add(item);
          const menu = item.localName === "nook-menu";
          let node = view.groupNodes.get(item);
          if (!node) {
            if (menu) {
              const el = make("section", "group");
              el.className = "group";
              const heading = make("h3", "group-heading");
              const body = make("div", "group-body");
              body.className = "group-body";
              el.append(heading, body);
              node = { el, heading, body };
            } else {
              const el = this.itemButton(item, label(item));
              el.onclick = () => this.activate(item);
              node = { el };
            }
            view.groupNodes.set(item, node);
          }
          if (menu) {
            if (node.heading.textContent !== label(item))
              node.heading.textContent = label(item);
            node.el.setAttribute("aria-label", label(item));
            place(item, node.body);
          } else {
            const signature = this.records.get(item).signature;
            if (node.signature !== signature) {
              const updated = this.itemButton(item, label(item));
              node.el.replaceChildren(...updated.childNodes);
              node.el.setAttribute("aria-label", label(item));
              node.signature = signature;
            }
          }
          if (node.el !== cursor) container.insertBefore(node.el, cursor);
          cursor = node.el.nextSibling;
        }
      };
      place(id, view.grouped);
      if (id === "root") {
        view.groupLaunchers ??= new Map();
        for (const [key, source] of this.builtins) {
          let button = view.groupLaunchers.get(key);
          if (!button) {
            button = this.itemButton(
              null,
              key === "feedback"
                ? "Feedback"
                : key === "quick"
                  ? "Quick menu"
                  : key === "commands"
                    ? "Commands"
                    : "Settings",
              icon(
                key === "feedback"
                  ? "feedback"
                  : key === "quick"
                    ? "menu"
                    : key === "commands"
                      ? "commands"
                      : "settings",
              ),
            );
            button.onclick = () => source.click();
            view.groupLaunchers.set(key, button);
          }
          button.hidden = source.hidden;
          if (button.parentNode !== view.grouped) view.grouped.append(button);
        }
      }
      for (const [item, node] of view.groupNodes)
        if (!wanted.has(item)) {
          node.el.remove();
          view.groupNodes.delete(item);
        }
    }
  }
  mountContent(item, body) {
    const template = [...item.children].find(
      (node) =>
        node instanceof HTMLTemplateElement &&
        (!node.hasAttribute("slot") || node.getAttribute("slot") === "content"),
    );
    const content = make("div", "content");
    content.className = "content";
    // Cloning is deliberate for inert templates. Live nodes are moved once so
    // addEventListener handlers and custom-element state survive navigation.
    if (template) content.append(template.content.cloneNode(true));
    else
      for (const child of [...item.childNodes])
        if (!(child instanceof Element && child.hasAttribute("slot")))
          content.append(child);
    body.append(content);
    content.addEventListener("submit", (e) => {
      e.preventDefault();
      emit(item, "nook-submit", {
        source: item,
        formData: new FormData(e.target),
      });
    });
  }
  createEnum(source, title, commit, initialValue) {
    const view = this.view(source, title());
    view.kind = "enum";
    view.el.dataset.view = "enum";
    const picker = enumPicker({
      source,
      view,
      make,
      title,
      initialValue,
      open: () => this.send({ type: "enter", view: source }),
      close: (trigger) => {
        if (this.state?.path.at(-1) !== source) return;
        this.send({ type: "back" });
        queueMicrotask(() => {
          if (this.state?.path.length) trigger.focus();
        });
      },
      commit,
    });
    view.picker = picker;
    const dispose = picker.dispose;
    picker.dispose = () => {
      dispose();
      this.views.delete(source);
    };
    return picker;
  }
  setting(item) {
    const type = item.getAttribute("type") || "toggle";
    const isEnum = ["enum", "select"].includes(type);
    const row = make(isEnum ? "div" : "label", "setting");
    row.className = "setting";
    const text = make("span", "setting-label", label(item));
    const description =
      item.getAttribute("description") || slotText(item, "description");
    if (description) text.append(make("small", "description", description));
    row.append(text);
    const custom = childSlot(item, "control");
    if (custom) {
      row.append(custom.content.cloneNode(true));
      row.addEventListener("change", (e) =>
        emit(item, "nook-change", { source: item, value: e.target.value }),
      );
      return row;
    }
    if (isEnum) {
      const picker = this.createEnum(
        item,
        () => label(item),
        () => {
          emit(item, "nook-input", { source: item, value: item.value });
          emit(item, "nook-change", { source: item, value: item.value });
        },
      );
      item._control = picker.proxy;
      item._enumPicker = picker;
      row.append(picker.element);
      picker.reconcile();
      return row;
    }
    const control = make("input", "control");
    control.type = type === "toggle" ? "checkbox" : type;
    for (const attr of ["min", "max", "step"])
      if (item.hasAttribute(attr))
        control.setAttribute(attr, item.getAttribute(attr));
    if (control.type === "checkbox")
      control.checked = item.getAttribute("value") === "true";
    else if (item.hasAttribute("value"))
      control.value = item.getAttribute("value");
    control.setAttribute("aria-label", label(item));
    item._control = control;
    control.addEventListener("input", () => {
      item.setAttribute("value", String(item.value));
      emit(item, "nook-input", { source: item, value: item.value });
    });
    control.addEventListener("change", () => {
      item.setAttribute("value", String(item.value));
      emit(item, "nook-change", { source: item, value: item.value });
    });
    row.append(control);
    return row;
  }
  chooseCommand(source) {
    if (
      !this.records.has(source) ||
      !available(source) ||
      !validCommand(source) ||
      !source.isConnected
    )
      return;
    const hasArgs = [...source.querySelectorAll("nook-arg")].some(
      (arg) =>
        arg.closest("nook-command") === source &&
        arg.getAttribute("name") &&
        !arg.hidden,
    );
    if (hasArgs) this.send({ type: "enter", view: source });
    else this.runCommand(source, {});
  }
  runCommand(source, args) {
    if (
      !this.records.has(source) ||
      !available(source) ||
      !validCommand(source) ||
      !source.isConnected
    )
      return;
    if (
      emit(source, "nook-command", {
        source,
        id: source.id,
        name: source.getAttribute("name"),
        args,
        context: this.context,
      })
    )
      this.close();
  }
  activate(item) {
    if (!available(item) || !item.isConnected) return;
    if (item.localName === "nook-command") {
      this.chooseCommand(item);
      return;
    }
    if (item.localName === "nook-menu" || item.localName === "nook-panel")
      this.send({ type: "enter", view: item });
    else if (
      emit(item, "nook-action", {
        source: item,
        id: item.id,
        context: this.context,
      })
    )
      this.close();
  }
  project(state, focus = true) {
    const previousCorner = this.state?.corner;
    const previous = this.state?.path.at(-1);
    this.state = state;
    const movable = this.canDrag();
    this.anchor.dataset.draggable = String(movable);
    if (this.getAttribute("corner") !== state.corner) {
      this.reflectingCorner = true;
      try {
        this.setAttribute("corner", state.corner);
      } finally {
        this.reflectingCorner = false;
      }
    }
    if (this.pointer && !movable) {
      clearTimeout(this.hold);
      if (this.pointer.drag) this.cancelPointer();
    }
    if (this.pointer?.drag)
      this.updateDragPreview(this.pointer.lastX, this.pointer.lastY);
    for (const button of this.views
      .get("corners")
      ?.body.querySelectorAll("[data-corner]") || []) {
      button.disabled = !state.allowedCorners.includes(button.dataset.corner);
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.corner === state.corner),
      );
    }
    this.handle.classList.toggle(
      "inviting",
      Boolean(state.needsIntro && !state.path.length),
    );
    this.anchor.dataset.corner = state.corner;

    const active = state.path.at(-1);
    if (active) this.dismissHandleTip();
    const effective = inheritedPresentation(
      state.path,
      (id) => this.views.get(id)?.presentation || "compact",
    );
    for (const [id, view] of this.views) {
      const visible = id === active;
      view.el.dataset.presentation = visible
        ? effective
        : view.presentation || "compact";
      if (visible) {
        view.exit?.cancel();
        view.exit = null;
        if (view.el.hidden) view.el.hidden = false;
        view.el.inert = false;
      } else if (!view.el.hidden && !view.exit) {
        view.el.inert = true;
        if (
          !active &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches &&
          view.el.animate
        ) {
          const configured = this.ownerDocument.defaultView
            .getComputedStyle(this)
            .getPropertyValue("--nook-exit-duration")
            .trim();
          const parsed = parseFloat(configured);
          const duration = Number.isFinite(parsed)
            ? Math.max(0, parsed * (configured.endsWith("ms") ? 1 : 1000))
            : 120;
          const fullscreen =
            view.el.dataset.presentation === "expanded" &&
            this.ownerDocument.defaultView.matchMedia(
              "(pointer: coarse), (hover: none)",
            ).matches;
          const animation = view.el.animate(
            fullscreen
              ? [{ opacity: 1 }, { opacity: 0 }]
              : [
                  { opacity: 1, transform: "scale(1)" },
                  { opacity: 0, transform: "scale(.985)" },
                ],
            { duration, easing: "ease-out" },
          );
          view.exit = animation;
          animation.onfinish = () => {
            if (view.exit === animation) {
              view.el.hidden = true;
              view.exit = null;
            }
          };
        } else view.el.hidden = true;
      }
      view.picker?.syncOpen(visible);
      view.back.hidden = state.path.length <= 1;
    }
    if (!active) delete this.anchor.dataset.numbering;
    if (active && this.anchor.dataset.numbering) this.showNumbers();
    this.handle.setAttribute("aria-expanded", String(Boolean(active)));
    this.handle.setAttribute(
      "aria-label",
      active ? "Close Nook menu" : "Open Nook menu",
    );
    if (focus && active !== previous) {
      if (active) {
        this.returnFocus ??=
          this.shadowRoot.activeElement || this.ownerDocument.activeElement;
        if (active === "commands" && previous !== active) this.palette.reset();
        queueMicrotask(() =>
          active === "commands"
            ? this.palette.search.focus()
            : this.views.get(active)?.picker?.focus() ||
              this.focusables()[0]?.focus(),
        );
      } else {
        const target = this.returnFocus;
        this.returnFocus = null;
        (target?.isConnected && target !== document.body
          ? target
          : this.handle
        ).focus();
      }
    }
    if (previousCorner && previousCorner !== state.corner) {
      this.settleCorner();
      emit(this, "nook-corner-change", { corner: state.corner });
    }
  }
  focusables() {
    const view = this.views.get(this.state?.path.at(-1));
    return view
      ? [
          ...view.el.querySelectorAll(
            "button,input,select,textarea,a[href],[tabindex]",
          ),
        ].filter(
          (n) => !n.disabled && n.tabIndex >= 0 && n.getClientRects().length,
        )
      : [];
  }
  numberedItems() {
    const view = this.views.get(this.state?.path.at(-1));
    return view
      ? [...view.body.querySelectorAll(".item,.command-result")]
          .filter(
            (node) =>
              !node.hidden && !node.disabled && node.getClientRects().length,
          )
          .slice(0, 9)
      : [];
  }
  showNumbers() {
    if (!this.state?.path.length) return;
    if (!this.browserKeyboardLayout) {
      delete this.anchor.dataset.numbering;
      return;
    }
    for (const badge of this.shadowRoot.querySelectorAll("[part=number]"))
      badge.hidden = true;
    this.numberedItems().forEach((button, index) => {
      if (
        !this.browserKeyboardLayout ||
        ![...this.browserKeyboardLayout.values()].includes(String(index + 1))
      )
        return;
      const badge = button.querySelector("[part=number]");
      if (badge) {
        badge.hidden = false;
        if (badge.textContent !== String(index + 1))
          badge.textContent = String(index + 1);
      }
    });
    this.anchor.dataset.numbering = "true";
  }
  keydown(e) {
    if (e.defaultPrevented || e.isComposing) return;
    this.lastKey = e.key;
    this.dismissHandleTip();
    this.altHeld = e.altKey || e.key === "Alt";
    if (!e.repeat && (e.key === "Alt" || (e.key === "Shift" && e.altKey)))
      void this.refreshKeyboardLayout();
    if (e.altKey || e.key === "Alt") this.showNumbers();
    else delete this.anchor.dataset.numbering;
    const target = e.composedPath()[0];
    const editing =
      target?.matches?.(
        "input,textarea,select,[contenteditable]:not([contenteditable=false])",
      ) || target?.isContentEditable;
    const layout = this.browserKeyboardLayout;
    const bindingMatches = (binding) => matchesKey(e, binding, layout);
    const number = selectionNumber(e, layout);
    if (
      number &&
      this.state?.path.length &&
      (!editing || target === this.palette.search)
    ) {
      const button = this.numberedItems()[number - 1];
      if (button) {
        e.preventDefault();
        button.click();
        return;
      }
    }
    if (e.key === "Escape" && this.state?.path.length) {
      e.preventDefault();
      this.close();
      return;
    }
    if (
      !editing &&
      !e.altKey &&
      !e.ctrlKey &&
      !e.metaKey &&
      ["Backspace", "Delete"].includes(e.key) &&
      this.state?.path.length
    ) {
      e.preventDefault();
      this.send({ type: "back" });
      return;
    }
    if (!editing && !e.repeat) {
      const paletteBinding = this.hasAttribute("commands-keybind")
        ? this.getAttribute("commands-keybind")
        : null;
      if (
        !this.builtins.get("commands").hidden &&
        (paletteBinding !== null
          ? bindingMatches(paletteBinding)
          : bindingMatches("Ctrl+Shift+P") || bindingMatches("Meta+Shift+P"))
      ) {
        e.preventDefault();
        this.open("commands");
        return;
      }

      for (const [view, attr, fallback] of [
        ["root", "root-keybind", "Shift+?"],
        ["settings", "settings-keybind", "Alt+Shift+S"],
        ["quick", "quick-keybind", "Alt+Shift+Q"],
      ])
        if (
          bindingMatches(
            this.hasAttribute(attr) ? this.getAttribute(attr) : fallback,
          )
        ) {
          if (view !== "root" && this.builtins.get(view).hidden) return;
          e.preventDefault();
          this.open(view === "quick" ? "full" : view);
          return;
        }
      const feedback = [...this.records.keys()].find((i) =>
        i.hasAttribute("feedback"),
      );
      if (
        (feedback || !this.builtins.get("feedback").hidden) &&
        bindingMatches(
          this.hasAttribute("feedback-keybind")
            ? this.getAttribute("feedback-keybind")
            : "Alt+Shift+F",
        )
      ) {
        e.preventDefault();
        if (feedback) this.activate(feedback);
        else this.open("feedback");
        return;
      }
      for (const item of this.records.keys())
        if (bindingMatches(item.keybind)) {
          e.preventDefault();
          this.activate(item);
          return;
        }
    }
    if (!this.state?.path.length) return;
    const nodes = this.focusables(),
      current = this.shadowRoot.activeElement,
      index = nodes.indexOf(current);
    if (e.key === "Tab") {
      e.preventDefault();
      nodes[
        (index + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length
      ]?.focus();
      return;
    }
    if (editing) return;
    if (
      [
        "ArrowRight",
        "ArrowDown",
        "ArrowLeft",
        "ArrowUp",
        "Home",
        "End",
      ].includes(e.key)
    ) {
      e.preventDefault();
      const next =
        e.key === "Home"
          ? 0
          : e.key === "End"
            ? nodes.length - 1
            : (index +
                (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1) +
                nodes.length) %
              nodes.length;
      nodes[next]?.focus();
    }
  }

  settleCorner() {
    this.motion?.play(this.handle, [
      { transform: "scale(.9)" },
      { transform: "scale(1.035)", offset: 0.65 },
      { transform: "scale(1)" },
    ]);
    const active = this.views.get(this.state?.path.at(-1));
    if (active && !active.el.hidden)
      this.motion?.play(active.body, [
        { transform: "scale(.985)" },
        { transform: "scale(1.006)", offset: 0.7 },
        { transform: "scale(1)" },
      ]);
  }
  pointerdown(e) {
    this.lastKey = null;
    this.dismissHandleTip();
    if (e.button !== 0 || this.pointer) return;
    this.suppressClick = false;
    this.pointer = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      drag: false,
    };
    this.handle.setPointerCapture(e.pointerId);
    if (!this.canDrag()) return;
    this.hold = setTimeout(() => {
      if (this.pointer && this.canDrag()) {
        this.pointer.drag = true;
        this.handle.classList.add("dragging");
        this.updateDragPreview(this.pointer.lastX, this.pointer.lastY);
      }
    }, 450);
  }
  pointermove(e) {
    const p = this.pointer;
    if (!p || e.pointerId !== p.id) return;
    p.lastX = e.clientX;
    p.lastY = e.clientY;
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    if (!p.drag && Math.hypot(dx, dy) > 10) clearTimeout(this.hold);
    if (p.drag) {
      this.updateDragPreview(e.clientX, e.clientY);
    }
  }
  updateDragPreview(x, y) {
    if (!this.canDrag()) {
      this.cancelPointer();
      return null;
    }
    const allowed =
      this.state?.allowedCorners ||
      availableCorners(this.getAttribute("disabled-corners"));
    const corner = closestAllowedCorner(
      x,
      y,
      this.ownerDocument.defaultView.innerWidth,
      this.ownerDocument.defaultView.innerHeight,
      allowed,
    );
    for (const [position, spot] of this.landingSpots) {
      spot.hidden = !allowed.includes(position);
      spot.toggleAttribute("data-selected", position === corner);
    }
    this.preview.hidden = false;
    if (this.preview.dataset.corner !== corner) {
      this.preview.dataset.corner = corner;
      this.motion?.play(
        this.preview.firstElementChild,
        [{ transform: "scale(.96)" }, { transform: "scale(1)" }],
        { token: "--nook-duration", fallback: 180 },
      );
      this.live.textContent = `Release to move to ${corner.replace("-", " ")}.`;
    }
    return corner;
  }
  pointerup(e) {
    const p = this.pointer;
    if (!p || e.pointerId !== p.id) return;
    clearTimeout(this.hold);
    const dx = e.clientX - p.x,
      dy = e.clientY - p.y;
    if (p.drag) {
      const corner = this.updateDragPreview(e.clientX, e.clientY);
      if (corner === this.state.corner) this.settleCorner();
      this.setAttribute("corner", corner);

      this.live.textContent = `Moved to ${corner.replace("-", " ")}.`;
      this.suppressClick = true;
    } else {
      const view = gesture(dx, dy);
      if (view) {
        this.suppressClick = true;
        if (
          view === "full"
            ? !this.builtins.get("quick").hidden
            : !this.builtins.get(view)?.hidden
        )
          this.open(view);
      }
    }
    this.cancelPointer();
  }
  cancelPointer() {
    clearTimeout(this.hold);
    const pointer = this.pointer;
    this.pointer = null;
    if (pointer?.drag) this.suppressClick = true;
    this.preview.hidden = true;
    for (const spot of this.landingSpots.values()) spot.hidden = true;
    delete this.preview.dataset.corner;
    this.handle.classList.remove("dragging");
    if (pointer && this.handle.hasPointerCapture?.(pointer.id))
      this.handle.releasePointerCapture(pointer.id);
  }
}

export function defineNook(registry = customElements) {
  for (const tag of [
    "nook-action",
    "nook-menu",
    "nook-setting",
    "nook-panel",
    "nook-command",
    "nook-arg",
    "nook-option",
  ])
    if (!registry.get(tag)) registry.define(tag, class extends NookItem {});
  if (!registry.get("nook-dock")) registry.define("nook-dock", NookDock);
}
defineNook();
