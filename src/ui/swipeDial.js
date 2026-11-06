import { icon } from "./icons.js";
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export default function swipeDial({ dock, make, i18n, signal }) {
  const root = make("div", "swipe-dial");
  root.className = "swipe-dial";
  root.hidden = true;
  root.setAttribute("aria-hidden", "true");
  const options = [
    { id: "all", label: "All actions", icon: "menu" },
    { id: "settings", label: "Settings", icon: "settings" },
  ].map((option) => {
    const el = make("div", "swipe-dial-option");
    el.className = "swipe-dial-option";
    const mark = make("span", "swipe-dial-icon");
    mark.innerHTML = icon(option.icon);
    const text = make("span", "swipe-dial-label", option.label);
    el.append(mark, text);
    root.append(el);
    return { ...option, el };
  });
  dock.overlayAnchor.append(root);
  let timer, pending, selected;
  const rect = () =>
    dock.anchorRect || {
      left: 0,
      top: 0,
      right: dock.ownerDocument.defaultView.innerWidth,
      bottom: dock.ownerDocument.defaultView.innerHeight,
      width: dock.ownerDocument.defaultView.innerWidth,
      height: dock.ownerDocument.defaultView.innerHeight,
    };
  const render = (pointer) => {
    const bounds = rect();
    const distance = Math.hypot(
      pointer.lastX - pointer.x,
      pointer.lastY - pointer.y,
    );
    root.style.setProperty(
      "--nook-dial-progress",
      String(clamp((distance - 28) / 72, 0, 1)),
    );
    root.style.setProperty(
      "--nook-dial-origin-x",
      `${pointer.x - bounds.left}px`,
    );
    root.style.setProperty(
      "--nook-dial-origin-y",
      `${pointer.y - bounds.top}px`,
    );
    const position = dock.position;
    const sx = position.includes("right") ? -1 : 1,
      sy = position.startsWith("bottom")
        ? -1
        : position.startsWith("top")
          ? 1
          : -1;
    const points = {
      all: [pointer.x + sx * 152, pointer.y],
      settings: [pointer.x, pointer.y + sy * 152],
    };
    const placed = [];
    let next = null;
    for (const option of options) {
      option.el.hidden = !dock.surfaceAvailable(option.id);
      if (option.el.hidden) continue;
      const point = points[option.id];
      option.x = clamp(point[0], bounds.left + 52, bounds.right - 52);
      option.y = clamp(point[1], bounds.top + 44, bounds.bottom - 44);
      // Preserve a clear inner ring even when viewport clamping moves a target.
      // Omit targets that cannot fit rather than overlapping the handle or peers.
      if (
        Math.hypot(option.x - pointer.x, option.y - pointer.y) < 104 ||
        placed.some(
          (other) =>
            Math.abs(option.x - other.x) < 96 &&
            Math.abs(option.y - other.y) < 80,
        )
      ) {
        option.el.hidden = true;
        continue;
      }
      placed.push(option);
      option.el.style.left = `${option.x - bounds.left}px`;
      option.el.style.top = `${option.y - bounds.top}px`;
      const target = option.el.getBoundingClientRect();
      if (
        target.width > 0 &&
        target.height > 0 &&
        pointer.lastX >= target.left &&
        pointer.lastX <= target.right &&
        pointer.lastY >= target.top &&
        pointer.lastY <= target.bottom
      )
        next = option;
    }
    if (
      distance < 56 ||
      pointer.lastX < bounds.left - 16 ||
      pointer.lastX > bounds.right + 16 ||
      pointer.lastY < bounds.top - 16 ||
      pointer.lastY > bounds.bottom + 16
    )
      next = null;
    for (const option of options)
      option.el.toggleAttribute("data-selected", option === next);
    if (next !== selected) {
      selected = next;
      i18n.text(
        dock.live,
        next ? "Release to open {menu}." : "",
        next ? () => ({ menu: i18n.t(next.label) }) : undefined,
      );
    }
  };
  const cancel = () => {
    clearTimeout(timer);
    timer = undefined;
    pending = null;
    selected = null;
    root.hidden = true;
    root.style.setProperty("--nook-dial-progress", "0");
  };
  const move = (pointer) => {
    if (pointer.drag) return;
    if (!root.hidden) {
      render(pointer);
      return;
    }
    if (Math.hypot(pointer.lastX - pointer.x, pointer.lastY - pointer.y) < 28)
      return;
    pointer.swipeStarted = true;
    if (timer !== undefined) return;
    pending = pointer;
    timer = setTimeout(() => {
      timer = undefined;
      if (signal.aborted || dock.pointer !== pending || pending.drag) return;
      const bounds = rect();
      if (bounds.width < 144 || bounds.height < 144) return;
      root.hidden = false;
      render(pending);
    }, 180);
  };
  signal.addEventListener(
    "abort",
    () => {
      cancel();
      root.remove();
    },
    { once: true },
  );
  return {
    move,
    cancel,
    release(x, y) {
      if (root.hidden || !pending) return null;
      pending.lastX = x;
      pending.lastY = y;
      render(pending);
      return selected?.id || null;
    },
    get shown() {
      return !root.hidden;
    },
    get selection() {
      return selected?.id || null;
    },
    root,
  };
}
