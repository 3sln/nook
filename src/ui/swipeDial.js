import { positionPoint } from "../bl/menu.js";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// One layout model serves pinned menus and held gestures. Built-ins always own
// their directional slots; extras never change fast-swipe routing.
export function layoutDial(bounds, origin, position, entries) {
  const sx = position.includes("right") ? -1 : 1,
    sy = position.startsWith("top") ? 1 : -1;
  const horizontal = sx > 0 ? bounds.right - origin.x : origin.x - bounds.left;
  const vertical = sy > 0 ? bounds.bottom - origin.y : origin.y - bounds.top;
  const radius = Math.max(40, Math.min(232, horizontal - 32, vertical - 32));
  const capacity = Math.max(
    2,
    Math.min(
      6,
      bounds.width < 360 ? 4 : 6,
      1 + Math.floor((Math.PI * radius) / 128),
    ),
  );
  const reserved = entries.filter(
    (entry) => entry.id === "all" || entry.id === "settings",
  );
  const extras = entries
    .filter((entry) => entry.id !== "all" && entry.id !== "settings")
    .slice(0, Math.max(0, capacity - reserved.length));
  const chosen = new Set([...reserved, ...extras]);
  const items = entries
    .filter((entry) => chosen.has(entry))
    .map((entry) => {
      const angle =
        entry.id === "all"
          ? 0
          : entry.id === "settings"
            ? Math.PI / 2
            : ((extras.indexOf(entry) + 1) * Math.PI) / 2 / (extras.length + 1);
      return {
        ...entry,
        angle,
        x: clamp(
          origin.x + sx * radius * Math.cos(angle),
          bounds.left + 32,
          bounds.right - 32,
        ),
        y: clamp(
          origin.y + sy * radius * Math.sin(angle),
          bounds.top + 32,
          bounds.bottom - 32,
        ),
      };
    });
  const overlaps = (a, b, gap = 4) =>
    a.left < b.right + gap &&
    a.right > b.left - gap &&
    a.top < b.bottom + gap &&
    a.bottom > b.top - gap;
  const icons = items.map((item) => ({
    left: item.x - 28,
    right: item.x + 28,
    top: item.y - 28,
    bottom: item.y + 28,
  }));
  const captions = [];
  const candidates = items
    .map((item) => {
      const dx = sx * Math.cos(item.angle),
        dy = sy * Math.sin(item.angle);
      const offsets = [
        [dx * 92, dy * 72],
        [-dx * 92, -dy * 72],
        [0, -64],
        [0, 64],
        [-88, 0],
        [88, 0],
        [-88, -64],
        [88, -64],
        [-88, 64],
        [88, 64],
        [0, -112],
        [0, 112],
      ];
      const choices = offsets
        .map(([x, y]) => {
          const cx = clamp(item.x + x, bounds.left + 52, bounds.right - 52);
          const cy = clamp(item.y + y, bounds.top + 26, bounds.bottom - 26);
          return {
            x: cx,
            y: cy,
            left: cx - 48,
            right: cx + 48,
            top: cy - 22,
            bottom: cy + 22,
          };
        })
        .filter((candidate) => icons.every((box) => !overlaps(candidate, box)));
      return { item, choices };
    })
    .sort((a, b) => a.choices.length - b.choices.length);
  for (const { item, choices } of candidates) {
    const fitted = choices.find((candidate) =>
      captions.every((box) => !overlaps(candidate, box)),
    );
    const location = fitted || { x: item.x, y: item.y };
    item.captionFits = Boolean(fitted);
    item.captionX = location.x - item.x;
    item.captionY = location.y - item.y;
    if (fitted) captions.push(location);
  }
  return { grid: false, radius, items };
}

// Arrow keys follow screen direction rather than the source declaration order.
export function directionalChoice(nodes, current, key) {
  const direction = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
  }[key];
  if (!direction || !current) return nodes[0];
  const center = (node) => {
    const box = node.getBoundingClientRect();
    return [box.left + box.width / 2, box.top + box.height / 2];
  };
  const [x, y] = center(current);
  return (
    nodes
      .filter((node) => node !== current)
      .map((node) => {
        const [nx, ny] = center(node);
        const dx = nx - x,
          dy = ny - y;
        return {
          node,
          forward: dx * direction[0] + dy * direction[1],
          distance: Math.hypot(dx, dy),
        };
      })
      .filter(({ forward }) => forward > 1)
      .sort((a, b) => a.distance - b.distance)[0]?.node || current
  );
}

export default function swipeDial({ dock, i18n, signal }) {
  const view = dock.views.get("root"),
    root = view.el;
  root.classList.add("swipe-dial");
  root.setAttribute("part", "surface swipe-dial");
  let timer,
    pending,
    selected,
    preview = false;
  let options = [];
  const alias = (node, name, add) => {
    if (!node) return;
    const parts = new Set(
      (node.getAttribute("part") || "").split(/\s+/).filter(Boolean),
    );
    if (add) parts.add(name);
    else parts.delete(name);
    const value = [...parts].join(" ");
    if (node.getAttribute("part") !== value) node.setAttribute("part", value);
  };
  const rect = () =>
    dock.anchorRect || {
      left: 0,
      top: 0,
      right: dock.ownerDocument.defaultView.innerWidth,
      bottom: dock.ownerDocument.defaultView.innerHeight,
      width: dock.ownerDocument.defaultView.innerWidth,
      height: dock.ownerDocument.defaultView.innerHeight,
    };
  const origin = () => {
    const box = dock.handle.getBoundingClientRect();
    if (box.width && box.height)
      return {
        x: clamp(box.left + box.width / 2, rect().left + 32, rect().right - 32),
        y: clamp(box.top + box.height / 2, rect().top + 32, rect().bottom - 32),
      };
    const b = rect(),
      [x, y] = positionPoint(dock.position, b.width, b.height);
    return {
      x: b.left + clamp(x, 32, b.width - 32),
      y: b.top + clamp(y, 32, b.height - 32),
    };
  };
  const pinned = () => dock.state?.path.at(-1) === "root";
  const collect = () => {
    const next = (dock.rootEntries || [])
      .map((entry) => ({
        id: entry.id,
        el:
          typeof entry.id === "string"
            ? dock.builtins.get(entry.id)
            : dock.records.get(entry.id)?.buttons[0],
      }))
      .filter((option) => option.el && !option.el.hidden);
    const wanted = new Set(next.map((option) => option.el));
    for (const old of options)
      if (!wanted.has(old.el)) {
        alias(old.el, "swipe-dial-option", false);
        alias(old.el.querySelector(".icon"), "swipe-dial-icon", false);
        alias(old.el.querySelector(".item-label"), "swipe-dial-label", false);
        const caption = old.el.querySelector(".dial-caption");
        if (caption) caption.replaceWith(...caption.childNodes);
        old.el.removeAttribute("data-dial-hidden");
        old.el.removeAttribute("data-selected");
      }
    for (const option of next) {
      const text = option.el.querySelector(".item-label");
      if (text && text.parentNode === option.el) {
        const caption = dock.ownerDocument.createElement("span");
        caption.className = "dial-caption";
        caption.setAttribute("part", "dial-caption");
        text.before(caption);
        caption.append(text);
      }
      alias(option.el, "swipe-dial-option", true);
      alias(option.el.querySelector(".icon"), "swipe-dial-icon", true);
      alias(option.el.querySelector(".item-label"), "swipe-dial-label", true);
    }
    options = next;
  };
  const render = () => {
    collect();
    const b = rect(),
      o = origin();
    const layout = layoutDial(b, o, dock.position, options);
    root.dataset.dialLayout = layout.grid ? "grid" : "radial";
    root.dataset.labelSide = dock.position.startsWith("bottom")
      ? "above"
      : "below";
    root.style.setProperty("--nook-dial-origin-x", `${o.x - b.left}px`);
    root.style.setProperty("--nook-dial-origin-y", `${o.y - b.top}px`);
    const fitted = new Map(layout.items.map((item) => [item.id, item]));
    let next = null;
    for (const option of options) {
      const location = fitted.get(option.id);
      option.el.toggleAttribute("data-dial-hidden", !location);
      option.el.removeAttribute("data-caption-visible");
      if (!location) continue;
      option.el.dataset.dialOrder = String(location.angle);
      option.el.style.setProperty("--nook-dial-x", `${location.x - b.left}px`);
      option.el.style.setProperty("--nook-dial-y", `${location.y - b.top}px`);
      option.el.style.setProperty("--nook-caption-x", `${location.captionX}px`);
      option.el.style.setProperty("--nook-caption-y", `${location.captionY}px`);
      const caption = option.el.querySelector(".dial-caption");
      if (caption) caption.hidden = !location.captionFits;
    }
    // Measure after all positions are written. Actual font/part overrides can
    // make a caption taller than the conservative model; omit those captions.
    const visible = options
      .filter((option) => fitted.has(option.id))
      .map((option) => ({ option, box: option.el.getBoundingClientRect() }));
    const captions = [];
    const overlaps = (a, b) =>
      a.left < b.right + 3 &&
      a.right > b.left - 3 &&
      a.top < b.bottom + 3 &&
      a.bottom > b.top - 3;
    for (const { option, box } of visible) {
      if (
        preview &&
        pending &&
        box.width &&
        box.height &&
        pending.lastX >= box.left &&
        pending.lastX <= box.right &&
        pending.lastY >= box.top &&
        pending.lastY <= box.bottom
      )
        next = option;
      const caption = option.el.querySelector(".dial-caption");
      if (!caption || caption.hidden) continue;
      const labelBox = caption.getBoundingClientRect();
      if (!labelBox.width || !labelBox.height) continue;
      if (
        labelBox.left < b.left ||
        labelBox.right > b.right ||
        labelBox.top < b.top ||
        labelBox.bottom > b.bottom ||
        visible.some(({ box: icon }) => overlaps(labelBox, icon)) ||
        captions.some((other) => overlaps(labelBox, other))
      )
        caption.hidden = true;
      else {
        captions.push(labelBox);
        option.el.setAttribute("data-caption-visible", "");
        if (
          preview &&
          pending &&
          pending.lastX >= labelBox.left &&
          pending.lastX <= labelBox.right &&
          pending.lastY >= labelBox.top &&
          pending.lastY <= labelBox.bottom
        )
          next = option;
      }
    }
    if (preview && pending) {
      const distance = Math.hypot(
        pending.lastX - pending.x,
        pending.lastY - pending.y,
      );
      root.style.setProperty(
        "--nook-dial-progress",
        String(clamp((distance - 28) / 72, 0, 1)),
      );
      if (distance < 56) next = null;
    } else root.style.setProperty("--nook-dial-progress", "1");
    for (const option of options)
      option.el.toggleAttribute("data-selected", option === next);
    if (selected?.id !== next?.id) {
      selected = next;
      i18n.text(
        dock.live,
        next ? "Release to choose {label}." : "",
        next
          ? () => ({ label: next.el.getAttribute("aria-label") })
          : undefined,
      );
    } else selected = next;
  };
  const sync = () => {
    collect();
    const active = pinned();
    root.toggleAttribute("data-preview", preview);
    root.setAttribute("aria-hidden", String(!active));
    if (active || preview) {
      root.hidden = false;
      root.inert = !active;
      render();
    } else if (!view.exit) root.hidden = true;
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = null;
    selected = null;
    preview = false;
    root.removeAttribute("data-preview");
    sync();
  };
  const move = (pointer) => {
    if (pointer.drag) return;
    pending = pointer;
    if (preview) {
      render();
      return;
    }
    if (Math.hypot(pointer.lastX - pointer.x, pointer.lastY - pointer.y) < 28)
      return;
    pointer.swipeStarted = true;
    if (timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      if (signal.aborted || dock.pointer !== pending || pending.drag) return;
      preview = true;
      sync();
    }, 180);
  };
  signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timer);
      preview = false;
      pending = null;
    },
    { once: true },
  );
  return {
    move,
    cancel,
    sync,
    root,
    release(x, y) {
      if (!preview || !pending) return null;
      pending.lastX = x;
      pending.lastY = y;
      render();
      return selected?.id || null;
    },
    get shown() {
      return preview;
    },
    get selection() {
      return selected?.id || null;
    },
  };
}
