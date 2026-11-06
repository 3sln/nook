import { icon } from "./icons.js";
let sequence = 0;
const slot = (node, name) =>
  [...node.children].find((child) => child.getAttribute("slot") === name);
const clone = (node) =>
  node instanceof HTMLTemplateElement
    ? node.content.cloneNode(true)
    : node.cloneNode(true);
const slotText = (node, name) => {
  const value = slot(node, name);
  return (
    (value instanceof HTMLTemplateElement
      ? value.content.textContent
      : value?.textContent
    )?.trim() || ""
  );
};
const optionLabel = (node) =>
  node.getAttribute("label") ||
  slotText(node, "label") ||
  node.textContent.trim();
const valueOf = (node) => node.getAttribute("value") ?? node.textContent.trim();
export default function enumPicker({
  source,
  view,
  make,
  i18n,
  title,
  open,
  close,
  commit,
  initialValue,
}) {
  const trigger = make("button", "control enum-trigger");
  trigger.type = "button";
  trigger.className = "enum-trigger";
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  const current = make("span", "enum-current");
  current.className = "enum-current";
  const arrow = make("span", "enum-chevron");
  arrow.className = "enum-chevron";
  arrow.innerHTML = icon("down");
  trigger.append(current, arrow);
  const proxy = make("input", "enum-value");
  proxy.type = "text";
  proxy.className = "enum-value";
  proxy.tabIndex = -1;
  proxy.autocomplete = "off";
  proxy.setAttribute("aria-hidden", "true");
  const wrap = make("span", "enum-control");
  wrap.className = "enum-control";
  const error = make("small", "enum-error");
  error.className = "enum-error";
  error.hidden = true;
  error.setAttribute("role", "alert");
  wrap.append(trigger, proxy, error);
  const list = make("div", "enum-options");
  list.className = "enum-options";
  list.id = `nook-enum-${++sequence}`;
  list.setAttribute("role", "listbox");
  trigger.setAttribute("aria-controls", list.id);
  current.id = list.id + "-value";
  trigger.setAttribute("aria-describedby", current.id);
  const empty = make("p", "enum-empty", "No options available.");
  empty.className = "enum-empty";
  view.body.append(list, empty);
  const records = new Map();
  let ordered = [],
    active = null,
    selectedSignature = "",
    lastSourceValue = Symbol();
  proxy.value = initialValue ?? source.getAttribute("value") ?? "";
  const enabled = () => ordered.filter((record) => !record.button.disabled);
  const focus = () => {
    const target =
      ordered.find(
        (record) =>
          record.button.getAttribute("aria-selected") === "true" &&
          !record.button.disabled,
      ) || enabled()[0];
    if (!target) return false;
    active = target;
    for (const record of ordered)
      record.button.tabIndex = record === target ? 0 : -1;
    target.button.focus();
    return true;
  };
  trigger.onclick = () => {
    open();
  };
  proxy.addEventListener("invalid", (event) => {
    event.preventDefault();
    trigger.setAttribute("aria-invalid", "true");
    i18n.text(
      error,
      proxy.value ? "This option is no longer available." : "Choose an option.",
    );
    error.hidden = false;
    trigger.focus();
  });
  const select = (node) => {
    const record = records.get(node);
    if (
      !record ||
      record.button.disabled ||
      node.hasAttribute("disabled") ||
      node.hidden ||
      !node.isConnected
    )
      return;
    proxy.value = valueOf(node);
    proxy.setCustomValidity("");
    source.setAttribute("value", proxy.value);
    reconcile();
    commit(proxy.value);
    close(trigger);
  };
  list.addEventListener("keydown", (event) => {
    const candidates = enabled();
    if (!candidates.length) return;
    let target;
    if (["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      const index = candidates.findIndex(
        (record) => record.button === list.getRootNode().activeElement,
      );
      target =
        event.key === "Home"
          ? candidates[0]
          : event.key === "End"
            ? candidates.at(-1)
            : candidates[
                (index +
                  (event.key === "ArrowUp" ? -1 : 1) +
                  candidates.length) %
                  candidates.length
              ];
    } else if (
      event.key.length === 1 &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      event.key !== " "
    ) {
      const start = candidates.findIndex((record) => record === active);
      target = [
        ...candidates.slice(start + 1),
        ...candidates.slice(0, start + 1),
      ].find((record) =>
        i18n
          .t(optionLabel(record.source))
          .toLocaleLowerCase()
          .startsWith(event.key.toLocaleLowerCase()),
      );
      if (target) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    if (target) {
      active = target;
      for (const record of ordered)
        record.button.tabIndex = record === target ? 0 : -1;
      target.button.focus();
      target.button.scrollIntoView?.({ block: "nearest" });
    }
  });
  function reconcile() {
    const heading = title();
    i18n.text(view.heading, heading);
    i18n.attr(view.el, "aria-label", heading);
    i18n.attr(trigger, "aria-label", heading);
    i18n.attr(list, "aria-label", heading);
    const nodes = [...source.querySelectorAll("nook-option,option")].filter(
      (node) =>
        !node.hidden && node.closest("nook-setting,nook-arg") === source,
    );
    const wanted = new Set(nodes);
    for (const [node, record] of records)
      if (!wanted.has(node)) {
        record.button.remove();
        records.delete(node);
      }
    let cursor = list.firstChild;
    ordered = [];
    for (const node of nodes) {
      let record = records.get(node);
      if (!record) {
        const button = make("button", "enum-option");
        button.type = "button";
        button.className = "enum-option";
        button.setAttribute("role", "option");
        button.onclick = () => select(node);
        record = { source: node, button };
        records.set(node, record);
      }
      const label = optionLabel(node) || valueOf(node),
        description =
          node.getAttribute("description") || slotText(node, "description");
      if (record.signature !== node.outerHTML) {
        const contents = make("span", "enum-option-content");
        contents.className = "enum-option-content";
        const custom = slot(node, "content");
        if (custom) contents.append(clone(custom));
        else {
          const image = slot(node, "icon");
          if (image) {
            const imageWrap = make("span", "enum-option-icon");
            imageWrap.className = "enum-option-icon";
            imageWrap.append(clone(image));
            contents.append(imageWrap);
          }
          const text = make("span", "enum-option-text");
          text.append(make("span", "enum-option-label", label));
          if (description)
            text.append(make("small", "enum-option-description", description));
          contents.append(text);
        }
        const check = make("span", "enum-check");
        check.className = "enum-check";
        check.innerHTML = icon("check");
        record.button.replaceChildren(contents, check);
        record.signature = node.outerHTML;
      }
      i18n.attr(record.button, "aria-label", label);
      i18n.attr(record.button, "aria-description", description);
      record.button.disabled = node.hasAttribute("disabled");
      if (record.button !== cursor) list.insertBefore(record.button, cursor);
      cursor = record.button.nextSibling;
      ordered.push(record);
    }
    const attr = source.getAttribute("value");
    if (attr !== lastSourceValue) {
      if (attr !== null) proxy.value = attr;
      lastSourceValue = attr;
    }
    if (attr === null && !proxy.value) {
      const first = enabled()[0];
      if (first) proxy.value = valueOf(first.source);
    }
    const selected = ordered.find(
      (record) => valueOf(record.source) === proxy.value,
    );
    proxy.required = source.hasAttribute("required");
    proxy.setCustomValidity(
      proxy.value && !selected ? i18n.t("Choose an available option.") : "",
    );
    trigger.setAttribute(
      "aria-invalid",
      String(Boolean(proxy.value && !selected)),
    );
    if (selected && (!proxy.required || proxy.value)) error.hidden = true;
    trigger.disabled = source.hasAttribute("disabled") || !enabled().length;
    const signature = selected
      ? `${selected.signature}|${proxy.value}`
      : "empty";
    if (signature !== selectedSignature) {
      current.replaceChildren();
      if (selected) {
        const image = slot(selected.source, "icon");
        if (image) {
          const imageWrap = make("span", "enum-option-icon");
          imageWrap.className = "enum-option-icon";
          imageWrap.append(clone(image));
          current.append(imageWrap);
        }
        current.append(
          make(
            "span",
            "enum-selected-label",
            optionLabel(selected.source) || proxy.value,
          ),
        );
      } else
        current.append(
          make(
            "span",
            "enum-placeholder",
            source.getAttribute("placeholder") || "Choose…",
          ),
        );
      selectedSignature = signature;
    }
    if (!ordered.includes(active) || active?.button.disabled)
      active = selected && !selected.button.disabled ? selected : enabled()[0];
    for (const record of ordered) {
      record.button.setAttribute("aria-selected", String(record === selected));
      record.button.tabIndex = record === active ? 0 : -1;
    }
    empty.hidden = Boolean(nodes.length);
  }
  return {
    element: wrap,
    trigger,
    proxy,
    reconcile,
    focus,
    syncOpen(value) {
      trigger.setAttribute("aria-expanded", String(value));
    },
    dispose() {
      view.el.remove();
    },
  };
}
