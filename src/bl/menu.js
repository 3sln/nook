import { Query } from "@3sln/ngin/queries";

export const corners = ["bottom-right", "bottom-left", "top-left", "top-right"];
export function gesture(dx, dy, threshold = 32) {
  if (Math.hypot(dx, dy) < threshold) return null;
  const ratio = Math.abs(dx) / Math.max(Math.abs(dy), 1);
  return ratio > 1.8 ? "quick" : ratio < 0.55 ? "settings" : "full";
}
export function nearestCorner(x, y, width, height) {
  return `${y < height / 2 ? "top" : "bottom"}-${x < width / 2 ? "left" : "right"}`;
}
export function availableCorners(disabled) {
  const blocked = new Set(
    Array.isArray(disabled) ? disabled : String(disabled || "").split(/[\s,]+/),
  );
  return corners.filter((corner) => !blocked.has(corner));
}
export function closestAllowedCorner(x, y, width, height, allowed = corners) {
  let nearest = null,
    best = Infinity;
  for (const corner of allowed) {
    const cx = corner.endsWith("right") ? width : 0,
      cy = corner.startsWith("bottom") ? height : 0;
    const distance = (x - cx) ** 2 + (y - cy) ** 2;
    if (distance < best) {
      best = distance;
      nearest = corner;
    }
  }
  return nearest;
}
function keyPattern(binding) {
  const bits = (binding || "")
    .toLowerCase()
    .split("+")
    .map((value) => value.trim());
  const key = bits.pop();
  const aliases = {
    opt: "alt",
    option: "alt",
    cmd: "meta",
    command: "meta",
    control: "ctrl",
  };
  return { key, bits: bits.map((value) => aliases[value] || value) };
}
export function bindingSupported(binding, layout) {
  const { key, bits } = keyPattern(binding);
  if (!key) return false;
  // Alt/Option can produce unrelated characters or dead keys. Only the browser's
  // unmodified layout map establishes which base key the binding refers to.
  if (bits.includes("alt") && [...key].length === 1)
    return Boolean(
      layout &&
        [...layout.values()].some((value) => value.toLowerCase() === key),
    );
  return true;
}
export function matchesKey(event, binding, layout) {
  if (
    !bindingSupported(binding, layout) ||
    event.getModifierState?.("AltGraph")
  )
    return false;
  const { key, bits } = keyPattern(binding);
  return (
    (event.key.toLowerCase() === key ||
      (event.altKey && layout?.get(event.code)?.toLowerCase() === key)) &&
    event.altKey === bits.includes("alt") &&
    event.ctrlKey === bits.includes("ctrl") &&
    event.metaKey === bits.includes("meta") &&
    event.shiftKey === bits.includes("shift")
  );
}
export function transition(state, intent) {
  switch (intent.type) {
    case "open":
      return { ...state, path: [intent.view] };
    case "enter":
      return { ...state, path: [...state.path, intent.view] };
    case "back":
      return { ...state, path: state.path.slice(0, -1) };
    case "close":
      return { ...state, path: [], introTarget: null };
    case "introduce":
      return {
        ...state,
        needsIntro: false,
        path: ["welcome"],
        introTarget: intent.view,
      };
    case "finish-intro":
      return {
        ...state,
        path: [intent.view || state.introTarget || "root"],
        introTarget: null,
      };
    case "configure-corners": {
      const allowed = availableCorners(intent.disabled);
      const corner = allowed.includes(state.corner)
        ? state.corner
        : closestAllowedCorner(
            state.corner.endsWith("right") ? 1 : 0,
            state.corner.startsWith("bottom") ? 1 : 0,
            1,
            1,
            allowed,
          ) || state.corner;
      return { ...state, allowedCorners: allowed, corner };
    }
    case "corner":
      return (state.allowedCorners || corners).includes(intent.corner)
        ? { ...state, corner: intent.corner }
        : state;
    default:
      return state;
  }
}
// A Query owns the only menu projection and its listener lifetime. The DOM edge
// supplies intent; it never maintains a parallel menu/navigation store.
export class MenuState extends Query {
  static deps = ["intents", "onboarding"];
  constructor(corner, disabled) {
    super();
    this.corner = corner;
    this.disabled = disabled;
  }
  boot({ intents, onboarding }, { notify }) {
    let state = {
      corner: corners.includes(this.corner) ? this.corner : corners[0],
      path: [],
      needsIntro: !onboarding.hasSeen(),
      introTarget: null,
    };
    state = transition(state, {
      type: "configure-corners",
      disabled: this.disabled,
    });
    const receive = (event) => {
      let intent = event.detail;
      if (state.needsIntro && ["open", "enter"].includes(intent.type)) {
        // Another tab or Nook instance may have shown the guide since boot.
        if (onboarding.hasSeen()) state = { ...state, needsIntro: false };
        else {
          onboarding.markSeen();
          intent = { type: "introduce", view: intent.view };
        }
      }
      state = transition(state, intent);
      notify(state);
    };
    intents.addEventListener("intent", receive);
    notify(state);
    this.kill = () => intents.removeEventListener("intent", receive);
  }
}

// Item count is the default policy; embedders can explicitly choose presentation
// for custom content whose size cannot be known from its declarative shape.
export function presentation(kind, count, override = "auto") {
  if (override === "compact" || override === "expanded") return override;
  if (
    kind === "panel" ||
    kind === "help" ||
    kind === "welcome" ||
    kind === "corners" ||
    kind === "commands" ||
    kind === "feedback" ||
    kind === "enum" ||
    kind === "command"
  )
    return "expanded";
  return count <= (kind === "settings" ? 3 : kind === "root" ? 5 : 4)
    ? "compact"
    : "expanded";
}

export function inheritedPresentation(path, base) {
  return path.some((id) => base(id) === "expanded")
    ? "expanded"
    : base(path.at(-1));
}

export function selectionNumber(event, layout) {
  if (
    !event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    !layout ||
    event.getModifierState?.("AltGraph")
  )
    return null;
  const value = layout.get(event.code);
  return /^[1-9]$/.test(value || "") ? Number(value) : null;
}
