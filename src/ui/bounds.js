const definitions = new Set([
  "nook-item",
  "nook-action",
  "nook-setting",
  "nook-menu",
  "nook-panel",
  "nook-command",
  "nook-arg",
  "nook-option",
  "template",
  "script",
  "style",
]);
export function hasAppContent(host) {
  return [...host.childNodes].some((node) =>
    node.nodeType === 3
      ? Boolean(node.textContent.trim())
      : node.nodeType === 1 && !definitions.has(node.localName),
  );
}
export default function bounds(host, { signal, onChange }) {
  const view = host.ownerDocument.defaultView;
  const visualViewport = view.visualViewport;
  const probe = host.ownerDocument.createElement("span");
  probe.hidden = true;
  probe.className = "boundary-measure";
  host.shadowRoot.append(probe);
  let frame, previous;
  const update = () => {
    frame = undefined;
    // Fixed UI uses layout-viewport coordinates. The keyboard can shrink and
    // pan only the visual viewport without changing innerHeight.
    const viewport = {
      left: visualViewport?.offsetLeft ?? 0,
      top: visualViewport?.offsetTop ?? 0,
      width: visualViewport?.width ?? view.innerWidth,
      height: visualViewport?.height ?? view.innerHeight,
    };
    viewport.right = viewport.left + viewport.width;
    viewport.bottom = viewport.top + viewport.height;
    const wrapped =
      host.getAttribute("boundary") === "self" ||
      (host.getAttribute("boundary") !== "viewport" && hasAppContent(host));
    const raw = wrapped ? host.getBoundingClientRect() : viewport;
    const style = view.getComputedStyle(probe);
    const length = (name) => parseFloat(style[name]) || 0;
    const left = Math.max(
      viewport.left,
      raw.left + length("marginLeft"),
      viewport.left + length("paddingLeft"),
    );
    const top = Math.max(
      viewport.top,
      raw.top + length("marginTop"),
      viewport.top + length("paddingTop"),
    );
    const right = Math.min(
      viewport.right,
      raw.right - length("marginRight"),
      viewport.right - length("paddingRight"),
    );
    const bottom = Math.min(
      viewport.bottom,
      raw.bottom - length("marginBottom"),
      viewport.bottom - length("paddingBottom"),
    );
    const rect = {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      wrapped,
      visible: right > left && bottom > top,
    };
    host.toggleAttribute("data-contained", wrapped);
    host.toggleAttribute("data-bound-hidden", !rect.visible);
    const values = {
      top,
      left,
      right: view.innerWidth - right,
      bottom: view.innerHeight - bottom,
      width: rect.width,
      height: rect.height,
    };
    for (const [name, value] of Object.entries(values)) {
      const key = `--nook-bound-${name}`,
        text = `${Math.max(0, value)}px`;
      if (host.style.getPropertyValue(key) !== text)
        host.style.setProperty(key, text);
    }
    const scheme = view.getComputedStyle(host).colorScheme;
    const inherited = scheme && scheme !== "normal" ? scheme : "light dark";
    if (
      host.style.getPropertyValue("--nook-inherited-color-scheme") !== inherited
    )
      host.style.setProperty("--nook-inherited-color-scheme", inherited);
    if (
      !previous ||
      Object.keys(rect).some((key) => rect[key] !== previous[key])
    ) {
      previous = rect;
      onChange(rect);
    }
  };
  const schedule = () => {
    if (frame === undefined && !signal.aborted)
      frame = view.requestAnimationFrame(update);
  };
  const observer = new view.MutationObserver((records) => {
    if (
      records.some(
        (record) =>
          record.target === host.ownerDocument.documentElement &&
          record.attributeName === "lang",
      )
    )
      host.i18n.refresh();
    if (
      hasAppContent(host) ||
      records.some(
        (record) =>
          record.target === host ||
          record.target === host.ownerDocument.documentElement,
      )
    )
      schedule();
  });
  observer.observe(host.ownerDocument.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden", "lang", "boundary"],
  });
  const resize = view.ResizeObserver ? new view.ResizeObserver(schedule) : null;
  resize?.observe(host);
  visualViewport?.addEventListener("resize", schedule, { signal });
  visualViewport?.addEventListener("scroll", schedule, { signal });
  view.addEventListener("resize", schedule, { signal });
  view.addEventListener("scroll", schedule, { signal, capture: true });
  host.appSlot.addEventListener("slotchange", schedule, { signal });
  signal.addEventListener(
    "abort",
    () => {
      observer.disconnect();
      resize?.disconnect();
      if (frame !== undefined) view.cancelAnimationFrame(frame);
      probe.remove();
    },
    { once: true },
  );
  update();
  return {
    refresh: schedule,
    get rect() {
      return previous;
    },
  };
}
