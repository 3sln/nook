import swipeDial from "./ui/swipeDial.js";
import bounds, { hasAppContent } from "./ui/bounds.js";
import localization from "./ui/localization.js";
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
  closestAllowedPosition,
  availablePositions,
  positions,
  responsivePositions,
  corners,
  distributeItems,
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
  get priority() {
    if (!this.hasAttribute("priority")) return this.root ? 100 : 0;
    const value = Number(this.getAttribute("priority"));
    return Number.isFinite(value) ? value : 0;
  }
  set priority(value) {
    this.setAttribute("priority", String(value));
  }
  get group() {
    return this.getAttribute("group") || "";
  }
  set group(value) {
    this.setAttribute("group", value || "");
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
    "position",
    "position-policy",
    "lang",
    "boundary",
    "disabled-corners",
    "disabled-positions",
    "root-keybind",
    "settings-keybind",
    "settings-href",
    "quick-keybind",
    "all-keybind",
    "overflow-keybind",
    "feedback-keybind",
    "commands-keybind",
    "feedback-disabled",
  ];
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.i18n = localization(this, make);
    this.make = this.i18n.make;
    const style = this.make("style");
    style.textContent = styles;
    this.shadowRoot.append(style);
    this.appSlot = this.make("slot", "app");
    this.shadowRoot.append(this.appSlot);
    const symbols = this.make("template");
    symbols.innerHTML = sprite;
    this.shadowRoot.append(symbols.content);
    this.anchor = this.make("div", "anchor");
    this.anchor.className = "anchor";
    this.handle = this.make("button", "handle");
    this.handle.className = "handle";
    this.handle.type = "button";
    this.i18n.attr(this.handle, "aria-label", "Open Nook menu");
    this.handle.setAttribute("aria-haspopup", "dialog");
    const icon = this.make("span", "mark");
    icon.className = "mark";
    icon.innerHTML = mark;
    this.handleTip = this.make("span", "handle-tooltip");
    this.handleTip.className = "handle-tooltip";
    this.handleTip.setAttribute("role", "tooltip");
    this.handleTipShortcut = this.make("span", "handle-shortcut");
    const dragHint = this.make("span", "drag-hint", "Hold, then drag to move.");
    this.handleTip.append(this.handleTipShortcut, dragHint);
    this.updateHandleTip();
    this.handle.append(icon, this.handleTip);
    this.live = this.make("div", "announcement");
    this.live.className = "live";
    this.live.setAttribute("aria-live", "polite");
    this.rootMeasure = this.make("span");
    this.rootMeasure.className = "root-measure";
    this.rootMeasure.hidden = true;
    this.anchor.append(this.handle, this.live, this.rootMeasure);
    this.overlayAnchor = this.make("div", "overlay-anchor");
    this.overlayAnchor.className = "anchor overlay-anchor";
    this.shadowRoot.append(this.anchor, this.overlayAnchor);
    const mirrored = [
      "data-corner",
      "data-position",
      "data-numbering",
      "data-alt-held",
      "data-layout-ready",
      "data-draggable",
      "lang",
    ];
    this.syncLayers = () => {
      for (const name of mirrored) {
        const value = this.anchor.getAttribute(name);
        if (value === null) this.overlayAnchor.removeAttribute(name);
        else this.overlayAnchor.setAttribute(name, value);
      }
    };
    this.layerObserver = new MutationObserver(this.syncLayers);
    this.mirroredAttributes = mirrored;
    this.anchor.lang = this.locale;
    this.preview = this.make("div", "drag-preview");
    this.preview.className = "anchor preview";
    this.preview.hidden = true;
    this.preview.setAttribute("aria-hidden", "true");
    const previewHandle = this.make("div", "preview-handle");
    previewHandle.className = "handle";
    const previewMark = this.make("span", "preview-mark");
    previewMark.className = "mark";
    previewMark.innerHTML = mark;
    previewHandle.append(previewMark);
    this.preview.append(previewHandle);
    this.shadowRoot.append(this.preview);
    this.landingSpots = new Map();
    for (const corner of positions) {
      const spot = this.make("div", "landing-zone");
      spot.className = "anchor landing-zone";
      spot.dataset.corner = corner;
      spot.hidden = true;
      spot.setAttribute("aria-hidden", "true");
      const shape = this.make("div", "landing-outline");
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
    this.syncLayers();
    this.layerObserver.observe(this.anchor, {
      attributes: true,
      attributeFilter: this.mirroredAttributes,
    });
    this.abort = new AbortController();
    const signal = this.abort.signal;
    this.positionMedia = this.ownerDocument.defaultView.matchMedia(
      "(pointer: coarse), (hover: none)",
    );
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
    this.boundsController = bounds(this, {
      signal,
      onChange: (rect) => {
        this.anchorRect = rect;
        if (this.state) this.refreshPositions();
      },
    });
    this.buildViews();
    this.swipeDial = swipeDial({
      dock: this,
      make: this.make,
      i18n: this.i18n,
      signal,
    });
    this.feedbackUI?.dispose();
    this.feedbackUI = feedbackUI({
      view: this.views.get("feedback"),
      make: this.make,
      i18n: this.i18n,
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
          this.getAttribute("position") || this.getAttribute("corner"),
          this.blockedPositions(),
          this.viewportPositions(true),
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
      this.anchor.removeAttribute("data-alt-held");
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
      () => this.refreshPositions(),
      { signal },
    );
    this.positionMedia.addEventListener(
      "change",
      () => this.refreshPositions(true),
      { signal },
    );
    this.ownerDocument.defaultView.addEventListener(
      "orientationchange",
      () => this.refreshPositions(true),
      { signal },
    );
    this.ownerDocument.defaultView.screen?.orientation?.addEventListener(
      "change",
      () => this.refreshPositions(true),
      { signal },
    );
  }
  disconnectedCallback() {
    this.layerObserver.disconnect();
    this.altHeld = false;
    this.anchor.removeAttribute("data-alt-held");
    delete this.anchor.dataset.numbering;
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
  get captureRoot() {
    if (!this.anchorRect?.wrapped) return this.ownerDocument.documentElement;
    const app = [...this.children].filter(
      (node) =>
        !node.localName.startsWith("nook-") &&
        !["template", "style", "script"].includes(node.localName),
    );
    return app.length === 1 ? app[0] : this;
  }
  get captureExclusions() {
    return [
      this.anchor,
      this.overlayAnchor,
      this.preview,
      ...this.landingSpots.values(),
    ];
  }
  get localization() {
    return this._localization;
  }
  set localization(value) {
    this._localization = value;
    this.i18n.configure(value);
    if (this.isConnected) this.reconcile();
  }
  get locale() {
    return this.i18n.locale;
  }
  get settingsHref() {
    return this.getAttribute("settings-href")?.trim() || "";
  }
  set settingsHref(value) {
    if (value == null || String(value).trim() === "")
      this.removeAttribute("settings-href");
    else this.setAttribute("settings-href", String(value));
  }
  get priorities() {
    return this._priorities;
  }
  set priorities(value) {
    this._priorities = value;
    if (this.isConnected) this.reconcile();
  }
  surfaceAvailable(id) {
    if (id === "all") return Boolean(this.allEntries?.length);
    return id === "quick" || id === "full" || id === "overflow"
      ? Boolean(this.overflowEntries?.length)
      : this.availableBuiltins?.has(id);
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
  viewportPositions(force = false) {
    const view = this.ownerDocument.defaultView;
    const width = this.anchorRect?.wrapped
        ? this.anchorRect.width
        : view.innerWidth,
      height = this.anchorRect?.wrapped
        ? this.anchorRect.height
        : view.innerHeight;
    let active = this.ownerDocument.activeElement;
    while (active?.shadowRoot?.activeElement)
      active = active.shadowRoot.activeElement;
    const editing =
      active?.isContentEditable ||
      active?.matches(
        "input,textarea,select,[contenteditable]:not([contenteditable=false])",
      );
    if (
      force ||
      !this.policyViewport ||
      !editing ||
      width !== this.policyViewport.width
    )
      this.policyViewport = { width, height };
    return this.getAttribute("position-policy") === "all"
      ? [...positions]
      : responsivePositions({
          ...this.policyViewport,
          touch:
            this.positionMedia?.matches ??
            view.matchMedia("(pointer: coarse), (hover: none)").matches,
        });
  }
  refreshPositions(force = false) {
    this.send({
      type: "configure-positions",
      disabled: this.blockedPositions(),
      options: this.viewportPositions(force),
    });
    if (this.isConnected) this.reconcile();
  }
  get availablePositions() {
    if (this.state) return [...this.state.allowedPositions];
    const options = this.viewportPositions();
    return availablePositions(this.blockedPositions()).filter((position) =>
      options.includes(position),
    );
  }
  get preferredPosition() {
    return this.state?.preferredPosition || this.position;
  }
  get position() {
    return (
      this.state?.corner ||
      this.getAttribute("position") ||
      this.getAttribute("corner") ||
      "bottom-right"
    );
  }
  set position(value) {
    this.setAttribute("position", value);
  }
  blockedPositions() {
    return `${this.getAttribute("disabled-corners") || ""} ${this.getAttribute("disabled-positions") || ""}`;
  }
  get disabledPositions() {
    const allowed = availablePositions(this.blockedPositions());
    return positions.filter((position) => !allowed.includes(position));
  }
  set disabledPositions(value) {
    this.setAttribute(
      "disabled-positions",
      Array.isArray(value) ? value.join(" ") : String(value || ""),
    );
  }
  get disabledCorners() {
    return this.disabledPositions.filter((position) =>
      corners.includes(position),
    );
  }
  set disabledCorners(value) {
    this.setAttribute(
      "disabled-corners",
      Array.isArray(value) ? value.join(" ") : String(value || ""),
    );
  }
  canDrag() {
    if (this.anchorRect && !this.anchorRect.visible) return false;
    return (
      this.state?.allowedPositions ||
      availablePositions(this.blockedPositions())
    ).some((position) => position !== this.position);
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
    this.i18n.text(
      this.handleTipShortcut,
      supported ? "Menu · {keybind}" : "Menu",
      {
        keybind: binding
          .split("+")
          .map((key) => key.trim())
          .join(" + "),
      },
    );
  }
  attributeChangedCallback(name, oldValue, value) {
    if (
      oldValue === value &&
      !(
        ["corner", "position"].includes(name) &&
        !this.reflectingCorner &&
        this.state &&
        this.state.preferredPosition !== value
      )
    )
      return;
    if (name === "boundary") this.boundsController?.refresh();
    if (name === "lang") {
      this.i18n.refresh();
      if (this.isConnected) this.reconcile();
    }
    if (name === "root-keybind") this.updateHandleTip();
    if (
      ["feedback-disabled", "settings-href"].includes(name) &&
      this.isConnected
    )
      this.reconcile();
    if (
      ["disabled-corners", "disabled-positions", "position-policy"].includes(
        name,
      )
    )
      this.refreshPositions();
    if (["corner", "position"].includes(name) && !this.reflectingCorner) {
      this.send({ type: "corner", corner: value });
      if (this.isConnected) this.reconcile();
    }
  }
  send(detail) {
    this.intents.dispatchEvent(new CustomEvent("intent", { detail }));
  }
  open(view = "root") {
    if (view === "overflow" || view === "quick") view = "full";
    if (!this.views.has(view)) return;
    if (["commands", "feedback"].includes(view) && !this.surfaceAvailable(view))
      return;
    this.send({ type: "open", view });
  }
  close() {
    this.send({ type: "close" });
  }
  view(id, title) {
    if (this.views.has(id)) return this.views.get(id);
    const el = this.make("section", "surface");
    el.className = "surface";
    el.dataset.view =
      typeof id === "string" ? id : id.localName.replace("nook-", "");
    el.hidden = true;
    el.setAttribute("role", "dialog");
    this.i18n.attr(el, "aria-label", title);
    const header = this.make("header", "header");
    const back = this.make("button", "back");
    back.innerHTML = icon("back");
    back.className = "quiet";
    this.i18n.attr(back, "aria-label", "Go back");
    back.onclick = () => this.send({ type: "back" });
    const heading = this.make("h2", "heading", title);
    const close = this.make("button", "close");
    close.innerHTML = icon("close");
    close.className = "quiet";
    this.i18n.attr(close, "aria-label", "Close menu");
    close.onclick = () => this.close();
    header.append(back, heading, close);
    const body = this.make("div", "body");
    el.append(header, body);
    this.overlayAnchor.append(el);
    const result = { el, body, heading, back };
    this.views.set(id, result);
    return result;
  }
  buildViews() {
    if (this.views.has("root")) return;
    for (const [id, title] of [
      ["root", "Nook"],
      ["full", "More"],
      ["all", "All actions"],
      ["settings", "Quick settings"],
      ["commands", "Commands"],
      ["welcome", "Welcome to Nook"],
      ["feedback", "Feedback"],
    ])
      this.view(id, title);
    for (const id of ["root", "full", "all"]) {
      const grid = this.make("div", "items");
      grid.className = "items";
      this.views.get(id).body.append(grid);
      this.views.get(id).grid = grid;
    }
    const settings = this.views.get("settings");
    settings.footer = this.make("div", "settings-footer");
    settings.footer.hidden = true;
    settings.link = this.make("a", "settings-link", "All settings");
    settings.footer.append(settings.link);
    settings.body.append(settings.footer);
    const welcome = this.views.get("welcome");
    const copy = this.make("div", "tutorial");
    copy.className = "tutorial";
    const keyboard = this.make("div", "tutorial-desktop");
    keyboard.className = "keyboard-only";
    const lead = this.make("p");
    lead.append(
      this.make("strong", null, "A small corner for useful extras."),
      document.createTextNode(" "),
      this.make(
        "span",
        null,
        "Click Nook to find actions, settings, and help for this page.",
      ),
    );
    const numberTip = this.make(
      "p",
      null,
      "Hold Alt / Option to reveal numbered shortcuts.",
    );
    numberTip.className = "layout-hint";
    keyboard.append(
      lead,
      this.make(
        "p",
        null,
        "Use arrows to move and Enter to choose. Backspace goes back; Escape closes the menu.",
      ),
      numberTip,
    );
    const touch = this.make("div", "tutorial-touch");
    touch.className = "touch-only";
    const touchLead = this.make("p");
    touchLead.append(
      this.make("strong", null, "Your extras, within reach."),
      document.createTextNode(" "),
      this.make("span", null, "Tap Nook for actions, settings, and help."),
    );
    touch.append(
      touchLead,
      this.make(
        "p",
        null,
        "When available, swipe sideways or diagonally for all actions, or up or down for settings.",
      ),
    );
    const welcomeMove = this.make(
      "p",
      "drag-hint",
      "Hold Nook, then drag to move it.",
    );
    welcomeMove.setAttribute("part", "drag-hint tutorial-drag");
    copy.append(keyboard, touch, welcomeMove);
    const done = this.make("button", "tutorial-continue", "Got it");
    done.className = "command-run";
    done.onclick = () => {
      let target = this.state?.introTarget;
      if (typeof target !== "string" && !this.records.has(target))
        target = "root";
      if (
        ["commands", "settings", "feedback", "full", "all"].includes(target) &&
        !this.surfaceAvailable(target)
      )
        target = "root";
      this.send({ type: "finish-intro", view: target || "root" });
    };
    welcome.body.append(copy, done);

    const root = this.views.get("root");
    this.tutorialUI = {
      welcome,
      done,
      regions: [
        ["tutorial", copy],
        ["tutorial-desktop", keyboard],
        ["tutorial-touch", touch],
        ["tutorial-drag", welcomeMove],
      ].map(([name, element]) => ({
        name,
        element,
        defaults: [...element.childNodes],
        template: null,
      })),
    };
    this.builtins = new Map();
    for (const [id, title, iconText] of [
      ["feedback", "Feedback", icon("feedback")],
      ["quick", "More", icon("more")],
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
      make: this.make,
      i18n: this.i18n,
      choose: (source) => this.chooseCommand(source),
      run: (source, args) => this.runCommand(source, args),
      createEnum: (source, title, commit, initialValue) =>
        this.createEnum(source, title, commit, initialValue),
      supported: (binding) =>
        bindingSupported(binding, this.browserKeyboardLayout),
    });
  }
  itemButton(item, title, iconText = icon("file")) {
    const button = this.make("button", "item");
    button.className = "item";
    button.type = "button";
    const icon = this.make("span", "icon");
    icon.className = "icon";
    const template = item && childSlot(item, "icon");
    if (template)
      icon.append(
        template instanceof HTMLTemplateElement
          ? template.content.cloneNode(true)
          : template.cloneNode(true),
      );
    else icon.innerHTML = iconText;
    const text = this.make("span", "item-label", title);
    text.className = "item-label";
    const tooltip = this.make("span", "tooltip");
    const tooltipText = this.make("span", "tooltip-text");
    const binding =
      item?.keybind &&
      bindingSupported(item.keybind, this.browserKeyboardLayout)
        ? item.keybind
        : "";
    this.i18n.text(
      tooltipText,
      binding ? "{label} · {keybind}" : "{label}",
      () => ({ label: this.i18n.t(title), keybind: binding }),
    );
    tooltip.append(tooltipText);
    tooltipText.className = "tooltip-text";
    tooltip.className = "tooltip";
    tooltip.setAttribute("aria-hidden", "true");
    const number = this.make("span", "number");
    number.className = "number";
    number.setAttribute("aria-hidden", "true");
    button.append(icon, text, tooltip, number);
    this.i18n.attr(button, "aria-label", title);
    return button;
  }
  reconcileTutorial() {
    const ui = this.tutorialUI;
    if (!ui) return;
    const options = this.tutorial || {};
    for (const [view, title] of [
      [ui.welcome, options.title ?? "Welcome to Nook"],
    ]) {
      this.i18n.text(view.heading, title);
      this.i18n.attr(view.el, "aria-label", title);
    }
    for (const [element, text] of [
      [ui.done, options.continueLabel ?? "Got it"],
    ])
      this.i18n.text(element, text);
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
    if (!this.isConnected || !this.builtins) return;
    const focused = this.shadowRoot.activeElement;
    const focusedView = focused?.closest(".surface")?.dataset.view;
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
    this.planItems(items);
    for (const [item, record] of this.records)
      if (!set.has(item)) {
        record.enum?.dispose();
        record.args?.dispose?.();
        record.buttons.forEach((b) => b.remove());
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
        this.i18n.text(record.view.heading, item.getAttribute("name"));
        this.i18n.attr(record.view.el, "aria-label", item.getAttribute("name"));
        record.args.reconcile();
        continue;
      }
      const parent = item.parentElement.closest(tags);
      const root = item.root;
      const topLevel = this.topLevelItems.includes(item);
      const destinations =
        item.localName === "nook-setting"
          ? [root ? "root" : "settings"]
          : topLevel
            ? [this.rootItems.includes(item) ? "root" : "full"]
            : parent && this.records.has(parent)
              ? [parent]
              : ["full"];
      const isPanel = item.localName === "nook-panel",
        isMenu = item.localName === "nook-menu",
        isSetting = item.localName === "nook-setting";
      if ((isPanel || isMenu) && !record.view) {
        record.view = this.view(item, label(item));
        if (isMenu) {
          const grid = this.make("div", "items");
          grid.className = "items";
          record.view.body.append(grid);
          record.view.grid = grid;
        } else this.mountContent(item, record.view.body);
      }
      if (record.view) {
        this.i18n.text(record.view.heading, label(item));
        this.i18n.attr(record.view.el, "aria-label", label(item));
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
        for (const button of [...record.buttons].filter(Boolean)) {
          if (isSetting) continue;
          const updated = this.itemButton(item, label(item));
          button.replaceChildren(...updated.childNodes);
          this.i18n.attr(button, "aria-label", label(item));
        }
        record.signature = signature;
      }
      if (isSetting) {
        const text = record.control.querySelector("[part=setting-label]");
        this.i18n.text(text.firstChild, label(item));
        const description =
          item.getAttribute("description") || slotText(item, "description");
        let small = text.querySelector("small");
        if (description) {
          if (!small) {
            small = this.make("small", "description");
            text.append(small);
          }
          this.i18n.text(small, description);
        } else small?.remove();
        const control = item._control;
        if (control) {
          this.i18n.attr(control, "aria-label", label(item));
          if (control.type === "checkbox")
            control.checked = item.getAttribute("value") === "true";
          else if (
            item.hasAttribute("value") &&
            control.value !== item.getAttribute("value")
          )
            control.value = item.getAttribute("value");
          if (item.hasAttribute("placeholder"))
            this.i18n.attr(
              control,
              "placeholder",
              item.getAttribute("placeholder"),
            );
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
      this.rootEntries.some((entry) => entry.id === "feedback")
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
    const customFeedback = items.some((item) => item.hasAttribute("feedback"));
    const feedbackEnabled =
      !this.feedbackDisabled() &&
      !customFeedback &&
      typeof this.feedback?.submit === "function";
    this.feedbackUI?.setEnabled(feedbackEnabled);
    this.feedbackUI?.reconcile();
    if (!feedbackEnabled && this.state?.path.includes("feedback")) this.close();
    this.builtins.get("quick").hidden = !this.overflowEntries.length;
    const commands = items.filter((item) => item.localName === "nook-command");
    for (const id of ["feedback", "settings", "commands"])
      this.builtins.get(id).hidden = !this.rootEntries.some(
        (entry) => entry.id === id,
      );
    this.placeRootEntries();
    const settings = this.views.get("settings");
    settings.footer.hidden = !this.settingsHref;
    if (this.settingsHref) {
      if (settings.link.getAttribute("href") !== this.settingsHref)
        settings.link.setAttribute("href", this.settingsHref);
    } else settings.link.removeAttribute("href");
    if (settings.body.lastChild !== settings.footer)
      settings.body.append(settings.footer);
    if (
      !this.availableBuiltins.has("settings") &&
      this.state?.path.includes("settings")
    )
      this.close();
    this.palette.reconcile(commands);
    if (!commands.length && this.state?.path.includes("commands")) this.close();
    for (const [id, view] of this.views) {
      const kind =
        view.kind ||
        (typeof id === "string" ? id : id.localName.replace("nook-", ""));
      const count =
        id === "all"
          ? this.allEntries.length
          : id === "full"
            ? this.overflowEntries.length
            : view.grid
              ? [...view.grid.children].filter((node) => !node.hidden).length
              : view.body.querySelectorAll(".setting").length;
      const override =
        typeof id === "string"
          ? this.getAttribute(
              id === "full" && this.hasAttribute("overflow-presentation")
                ? "overflow-presentation"
                : `${id}-presentation`,
            )
          : id.getAttribute("presentation");
      view.presentation = presentation(kind, count, override);
      if (id === "root" && !["compact", "expanded"].includes(override))
        view.presentation = count > this.rootCapacity ? "expanded" : "compact";
      if (view.grid && id !== "full" && id !== "all") {
        const labelsVisible = id !== "root" || view.presentation === "expanded";
        view.el.dataset.layout =
          labelsVisible &&
          [...view.grid.children].some(
            (button) => (button.getAttribute("aria-label") || "").length > 48,
          )
            ? "list"
            : "icons";
      }
      view.el.dataset.presentation = view.presentation;
    }
    this.reconcileGroups();

    if (this.state) {
      if (!this.allEntries.length && this.state.path.includes("all")) {
        this.close();
        return;
      }
      if (!this.overflowEntries.length && this.state.path.includes("full")) {
        this.send({ type: "overflow-availability", available: false });
        return;
      }
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
      if (
        ["root", "full"].includes(focusedView) &&
        this.state.path.at(-1) === focusedView &&
        !this.focusables().includes(focused)
      ) {
        queueMicrotask(() => {
          if (
            this.state.path.at(-1) === focusedView &&
            this.shadowRoot.activeElement === focused
          )
            (focusedView === "root" && !this.builtins.get("quick").hidden
              ? this.builtins.get("quick")
              : this.focusables()[0]
            )?.focus();
        });
      }
    }
  }
  planItems(items) {
    const style = this.ownerDocument.defaultView.getComputedStyle(
      this.rootMeasure,
    );
    const size = parseFloat(style.width) || 48;
    const measuredGap = parseFloat(style.marginInlineEnd);
    const gap = Number.isFinite(measuredGap) ? measuredGap : 8;
    this.rootCapacity = Math.max(
      1,
      Math.min(
        Math.max(
          1,
          parseInt(style.getPropertyValue("--nook-root-max-items"), 10) || 5,
        ),
        Math.floor(
          ((this.anchorRect?.width ??
            this.ownerDocument.defaultView.innerWidth) -
            (this.position === "left-center" || this.position === "right-center"
              ? (parseFloat(style.marginBlockStart) || 56) +
                (parseFloat(style.marginBlockEnd) || 12) +
                16
              : 32) +
            gap) /
            (size + gap),
        ),
      ),
    );
    this.topLevelItems = items.filter(
      (item) =>
        !["nook-setting", "nook-command"].includes(item.localName) &&
        (item.root || !item.parentElement.closest(tags)),
    );
    this.availableBuiltins = new Set();
    if (
      !this.feedbackDisabled() &&
      typeof this.feedback?.submit === "function" &&
      !items.some((item) => item.hasAttribute("feedback"))
    )
      this.availableBuiltins.add("feedback");
    if (
      this.settingsHref ||
      items.some((item) => item.localName === "nook-setting" && !item.root)
    )
      this.availableBuiltins.add("settings");
    if (items.some((item) => item.localName === "nook-command"))
      this.availableBuiltins.add("commands");
    const builtin = (id, priority) => ({
      id,
      priority: this.priorities?.[id] ?? priority,
      group: "",
    });
    const entries = [
      ...(this.availableBuiltins.has("feedback")
        ? [builtin("feedback", 30)]
        : []),
      ...this.topLevelItems.map((item) => ({
        id: item,
        priority: item.hasAttribute("priority")
          ? item.priority
          : item.root
            ? 100
            : 0,
        group: item.group.trim(),
      })),
      ...["settings", "commands"]
        .filter((id) => this.availableBuiltins.has(id))
        .map((id) => builtin(id, id === "settings" ? 20 : 10)),
    ];
    const pinnedSettings = items.filter(
      (item) => item.localName === "nook-setting" && item.root,
    ).length;
    const plan = distributeItems(
      entries,
      Math.max(1, this.rootCapacity - pinnedSettings),
    );
    this.allEntries = distributeItems(
      [
        ...entries,
        ...items
          .filter((item) => item.localName === "nook-setting" && item.root)
          .map((item) => ({
            id: item,
            priority: item.priority,
            group: item.group.trim(),
          })),
      ],
      Number.MAX_SAFE_INTEGER,
    ).root;
    this.rootEntries = plan.root;
    this.overflowEntries = plan.overflow;
    this.rootItems = plan.root
      .map((entry) => entry.id)
      .filter((id) => typeof id !== "string");
    this.overflowItems = plan.overflow
      .map((entry) => entry.id)
      .filter((id) => typeof id !== "string");
  }
  placeRootEntries() {
    const root = this.views.get("root").grid;
    const launcher = this.builtins.get("quick");
    if (launcher.parentNode !== root) root.append(launcher);
    let cursor = launcher;
    for (const entry of [...this.rootEntries].reverse()) {
      const button =
        typeof entry.id === "string"
          ? this.builtins.get(entry.id)
          : this.records.get(entry.id).buttons[0];
      if (button.nextSibling !== cursor) root.insertBefore(button, cursor);
      cursor = button;
    }
  }
  reconcileGroups() {
    // Only launch buttons are mirrored. Panels and setting controls have one
    // mounted instance, even when a menu is projected as nested sections.
    for (const [id, view] of this.views) {
      if (!view.grid || id === "full" || id === "all") continue;
      if (!view.grouped) {
        view.grouped = this.make("div", "groups");
        view.grouped.className = "groups";
        view.body.append(view.grouped);
        view.groupNodes = new Map();
      }
      const wanted = new Set();
      const children = (parent) =>
        [...this.records.keys()].filter((item) => {
          if (["nook-setting", "nook-command"].includes(item.localName))
            return false;
          if (parent === "root") return this.rootItems.includes(item);
          if (this.topLevelItems.includes(item)) return false;
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
              const el = this.make("section", "group");
              el.className = "group";
              const heading = this.make("h3", "group-heading");
              const body = this.make("div", "group-body");
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
            this.i18n.text(node.heading, label(item));
            this.i18n.attr(node.el, "aria-label", label(item));
            place(item, node.body);
          } else {
            const signature = this.records.get(item).signature;
            if (node.signature !== signature) {
              const updated = this.itemButton(item, label(item));
              node.el.replaceChildren(...updated.childNodes);
              this.i18n.attr(node.el, "aria-label", label(item));
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
                  ? "More"
                  : key === "commands"
                    ? "Commands"
                    : "Settings",
              icon(
                key === "feedback"
                  ? "feedback"
                  : key === "quick"
                    ? "more"
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
      if (id === "root") {
        const ordered = this.rootEntries
          .map((entry) =>
            typeof entry.id === "string"
              ? view.groupLaunchers.get(entry.id)
              : view.groupNodes.get(entry.id)?.el,
          )
          .filter(Boolean);
        if (this.overflowEntries.length)
          ordered.push(view.groupLaunchers.get("quick"));
        let cursor = view.grouped.firstChild;
        for (const node of ordered) {
          if (node !== cursor) view.grouped.insertBefore(node, cursor);
          cursor = node.nextSibling;
        }
      }

      for (const [item, node] of view.groupNodes)
        if (!wanted.has(item)) {
          node.el.remove();
          view.groupNodes.delete(item);
        }
    }
    this.reconcileOverflow();
  }
  reconcileOverflow() {
    this.reconcileActionList(this.views.get("full"), this.overflowEntries);
    this.reconcileActionList(this.views.get("all"), this.allEntries);
  }
  reconcileActionList(view, entries) {
    if (!view.grouped) {
      view.grouped = this.make("div", "overflow-groups");
      view.grouped.className = "overflow-groups";
      view.body.append(view.grouped);
      view.overflowButtons = new Map();
      view.overflowGroups = new Map();
    }
    const wanted = new Set(this.allEntries.map((entry) => entry.id));
    for (const [id, record] of view.overflowButtons) {
      if (!wanted.has(id)) {
        record.button.remove();
        view.overflowButtons.delete(id);
      } else record.button.hidden = true;
    }
    for (const section of view.overflowGroups.values())
      section.el.hidden = true;
    const buckets = new Map();
    for (const entry of entries) {
      if (!buckets.has(entry.group)) buckets.set(entry.group, []);
      buckets.get(entry.group).push(entry);
    }
    const named = [...buckets.keys()].some(Boolean);
    let groupCursor = view.grouped.firstChild;
    for (const [group, entries] of buckets) {
      let section = view.overflowGroups.get(group);
      if (!section) {
        const el = this.make("section", "overflow-group");
        const heading = this.make("h3", "overflow-group-heading");
        const body = this.make("div", "overflow-group-body");
        el.append(heading, body);
        section = { el, heading, body };
        view.overflowGroups.set(group, section);
      }
      section.el.hidden = false;
      section.heading.hidden = !group && !named;
      this.i18n.text(section.heading, group || "Other");
      if (section.el !== groupCursor)
        view.grouped.insertBefore(section.el, groupCursor);
      groupCursor = section.el.nextSibling;
      let cursor = section.body.firstChild;
      for (const entry of entries) {
        const source = typeof entry.id === "string" ? null : entry.id;
        const title = source
          ? label(source)
          : entry.id === "feedback"
            ? "Feedback"
            : entry.id === "commands"
              ? "Commands"
              : "Settings";
        const signature = source ? this.records.get(source).signature : title;
        let record = view.overflowButtons.get(entry.id);
        if (!record) {
          const button = this.itemButton(
            source,
            title,
            icon(
              entry.id === "feedback"
                ? "feedback"
                : entry.id === "commands"
                  ? "commands"
                  : "settings",
            ),
          );
          button.onclick = () => {
            if (source?.localName === "nook-setting") {
              this.open("root");
              queueMicrotask(() => source._control?.focus());
            } else if (source) this.activate(source);
            else this.builtins.get(entry.id).click();
          };
          record = { button, signature };
          view.overflowButtons.set(entry.id, record);
        }
        if (record.signature !== signature) {
          const updated = this.itemButton(source, title);
          record.button.replaceChildren(...updated.childNodes);
          this.i18n.attr(record.button, "aria-label", title);
          record.signature = signature;
        }
        record.button.hidden = false;
        if (record.button !== cursor)
          section.body.insertBefore(record.button, cursor);
        cursor = record.button.nextSibling;
      }
    }
  }
  mountContent(item, body) {
    const template = [...item.children].find(
      (node) =>
        node instanceof HTMLTemplateElement &&
        (!node.hasAttribute("slot") || node.getAttribute("slot") === "content"),
    );
    const content = this.make("div", "content");
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
      make: this.make,
      i18n: this.i18n,
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
    const row = this.make(isEnum ? "div" : "label", "setting");
    row.className = "setting";
    const text = this.make("span", "setting-label");
    text.append(this.make("span", "setting-name", label(item)));
    const description =
      item.getAttribute("description") || slotText(item, "description");
    if (description)
      text.append(this.make("small", "description", description));
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
    const control = this.make("input", "control");
    control.type = type === "toggle" ? "checkbox" : type;
    for (const attr of ["min", "max", "step"])
      if (item.hasAttribute(attr))
        control.setAttribute(attr, item.getAttribute(attr));
    if (control.type === "checkbox")
      control.checked = item.getAttribute("value") === "true";
    else if (item.hasAttribute("value"))
      control.value = item.getAttribute("value");
    this.i18n.attr(control, "aria-label", label(item));
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
    const previousPreferred = this.state?.preferredPosition;
    const previous = this.state?.path.at(-1);
    this.state = state;
    const movable = this.canDrag();
    this.anchor.dataset.draggable = String(movable);
    if (
      this.getAttribute("corner") !== state.corner ||
      this.getAttribute("position") !== state.corner
    ) {
      this.reflectingCorner = true;
      try {
        this.setAttribute("corner", state.corner);
        this.setAttribute("position", state.corner);
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
    this.handle.classList.toggle(
      "inviting",
      Boolean(state.needsIntro && state.attentionActive),
    );
    this.anchor.dataset.corner = state.corner;
    this.anchor.dataset.position = state.corner;

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
    this.i18n.attr(
      this.handle,
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
    if (
      previousCorner &&
      (previousCorner !== state.corner ||
        previousPreferred !== state.preferredPosition)
    )
      emit(this, "nook-position-change", {
        position: state.corner,
        preferredPosition: state.preferredPosition,
        reason:
          previousPreferred !== state.preferredPosition
            ? "preference"
            : "availability",
      });
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
    if (this.feedbackUI?.capturing) return;
    this.lastKey = e.key;
    this.dismissHandleTip();
    this.altHeld = e.altKey || e.key === "Alt";
    this.anchor.toggleAttribute("data-alt-held", this.altHeld);
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
        this.surfaceAvailable("commands") &&
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
        ["all", "all-keybind", "Alt+Shift+M"],
        [
          "quick",
          this.hasAttribute("overflow-keybind")
            ? "overflow-keybind"
            : "quick-keybind",
          "Alt+Shift+Q",
        ],
      ])
        if (
          bindingMatches(
            this.hasAttribute(attr) ? this.getAttribute(attr) : fallback,
          )
        ) {
          if (
            view === "quick"
              ? !this.surfaceAvailable("full")
              : view !== "root" && !this.surfaceAvailable(view)
          )
            return;
          e.preventDefault();
          this.open(view === "quick" ? "full" : view);
          return;
        }
      const feedback = [...this.records.keys()].find((i) =>
        i.hasAttribute("feedback"),
      );
      if (
        (feedback || this.surfaceAvailable("feedback")) &&
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
        this.swipeDial?.cancel();
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
    } else this.swipeDial?.move(p);
  }
  updateDragPreview(x, y) {
    if (!this.canDrag()) {
      this.cancelPointer();
      return null;
    }
    const allowed =
      this.state?.allowedPositions ||
      availablePositions(this.blockedPositions());
    const rect = this.anchorRect || {
      left: 0,
      top: 0,
      width: this.ownerDocument.defaultView.innerWidth,
      height: this.ownerDocument.defaultView.innerHeight,
    };
    const corner = closestAllowedPosition(
      x - rect.left,
      y - rect.top,
      rect.width,
      rect.height,
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
      this.i18n.text(this.live, "Release to move to {position}.", () => ({
        position: this.i18n.t(corner.replace("-", " ")),
      }));
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
      this.position = corner;

      this.i18n.text(this.live, "Moved to {position}.", () => ({
        position: this.i18n.t(corner.replace("-", " ")),
      }));
      this.suppressClick = true;
    } else {
      const dialShown = this.swipeDial?.shown;
      const view = gesture(dx, dy);
      const destination = dialShown
        ? this.swipeDial.release(e.clientX, e.clientY)
        : view;
      if (view || p.swipeStarted || dialShown) this.suppressClick = true;
      if (destination && this.surfaceAvailable(destination))
        this.open(destination);
    }
    this.cancelPointer();
  }
  cancelPointer() {
    this.swipeDial?.cancel();
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
