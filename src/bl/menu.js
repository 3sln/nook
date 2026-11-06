import { Query } from "@3sln/ngin/queries";

export const corners = ["bottom-right", "bottom-left", "top-left", "top-right"];
export const positions = [
  ...corners,
  "top-center",
  "right-center",
  "bottom-center",
  "left-center",
];
export function responsivePositions({ width, height, touch = false }) {
  return touch && width < 480 && height > width
    ? positions.filter(
        (position) => position !== "top-center" && position !== "bottom-center",
      )
    : [...positions];
}
export function positionPoint(position, width, height) {
  if (position === "top-center") return [width / 2, 0];
  if (position === "right-center") return [width, height / 2];
  if (position === "bottom-center") return [width / 2, height];
  if (position === "left-center") return [0, height / 2];
  return [
    position.endsWith("right") ? width : 0,
    position.startsWith("bottom") ? height : 0,
  ];
}
export function availablePositions(disabled) {
  const blocked = new Set(
    Array.isArray(disabled) ? disabled : String(disabled || "").split(/[\s,]+/),
  );
  return positions.filter((position) => !blocked.has(position));
}
export function closestAllowedPosition(
  x,
  y,
  width,
  height,
  allowed = positions,
) {
  let nearest = null,
    best = Infinity;
  for (const position of allowed) {
    const [px, py] = positionPoint(position, width, height);
    const distance = (x - px) ** 2 + (y - py) ** 2;
    if (distance < best) {
      best = distance;
      nearest = position;
    }
  }
  return nearest;
}
export function gesture(dx, dy, threshold = 32) {
  if (Math.hypot(dx, dy) < threshold) return null;
  const ratio = Math.abs(dx) / Math.max(Math.abs(dy), 1);
  return ratio < 0.55 ? "settings" : "all";
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
    case "overflow-availability": {
      if (intent.available || !state.path.includes("full")) return state;
      const path = state.path.filter((view) => view !== "full");
      if (!path.length || state.path[0] === "full") path.unshift("root");
      return { ...state, path };
    }
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
        needsIntro: false,
        introTarget: null,
      };
    case "configure-positions": {
      const configured = availablePositions(intent.disabled);
      const allowed = configured.filter((position) =>
        (intent.options || positions).includes(position),
      );
      const preferredPosition = state.preferredPosition || state.corner;
      const [x, y] = positionPoint(preferredPosition, 1, 1);
      const corner = allowed.includes(preferredPosition)
        ? preferredPosition
        : allowed.includes(state.corner)
          ? state.corner
          : closestAllowedPosition(x, y, 1, 1, allowed) || state.corner;
      return {
        ...state,
        corner,
        preferredPosition,
        configuredPositions: configured,
        allowedPositions: allowed,
        allowedCorners: allowed.filter((position) =>
          corners.includes(position),
        ),
      };
    }
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
    case "corner": {
      if (
        !(
          state.configuredPositions ||
          state.allowedPositions ||
          state.allowedCorners ||
          positions
        ).includes(intent.corner)
      )
        return state;
      const allowed =
        state.allowedPositions || state.allowedCorners || positions;
      const [x, y] = positionPoint(intent.corner, 1, 1);
      const corner = allowed.includes(intent.corner)
        ? intent.corner
        : closestAllowedPosition(x, y, 1, 1, allowed) || state.corner;
      return { ...state, corner, preferredPosition: intent.corner };
    }
    default:
      return state;
  }
}
// A Query owns the only menu projection and its listener lifetime. The DOM edge
// supplies intent; it never maintains a parallel menu/navigation store.
export class MenuState extends Query {
  static deps = ["intents", "onboarding"];
  constructor(corner, disabled, options = positions) {
    super();
    this.corner = corner;
    this.disabled = disabled;
    this.options = options;
  }
  boot({ intents, onboarding }, { notify }) {
    let state = {
      corner: positions.includes(this.corner) ? this.corner : corners[0],
      path: [],
      needsIntro: !onboarding.hasSeen(),
      attentionActive: false,
      introTarget: null,
    };
    state = transition(state, {
      type: "configure-positions",
      disabled: this.disabled,
      options: this.options,
    });
    const receive = (event) => {
      let intent = event.detail;
      if (state.needsIntro && onboarding.hasSeen())
        state = { ...state, needsIntro: false };
      if (state.needsIntro && ["open", "enter"].includes(intent.type))
        onboarding.acknowledgeAttention?.();
      if (["finish-intro", "dismiss-intro"].includes(intent.type)) {
        state = { ...state, needsIntro: false };
        onboarding.markSeen();
        if (intent.type === "dismiss-intro")
          intent = { type: "finish-intro", view: "root" };
      }
      state = transition(state, intent);
      notify(state);
    };
    intents.addEventListener("intent", receive);
    notify(state);
    const releaseAttention = onboarding.subscribeAttention((active) => {
      state = { ...state, attentionActive: active };
      notify(state);
    });
    this.kill = () => {
      releaseAttention();
      intents.removeEventListener("intent", receive);
    };
  }
}

// Item count is the default policy; embedders can explicitly choose presentation
// for custom content whose size cannot be known from its declarative shape.
export function presentation(kind, count, override = "auto") {
  if (override === "compact" || override === "expanded") return override;
  if (
    kind === "panel" ||
    kind === "welcome" ||
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

// Sorting is stable: equal priorities keep their authored order. One root slot
// is reserved for More only when it is needed.
export function distributeItems(entries, capacity) {
  const ranked = entries
    .map((entry, index) => ({ ...entry, index }))
    .sort(
      (a, b) =>
        (Number(b.priority) || 0) - (Number(a.priority) || 0) ||
        a.index - b.index,
    );
  const slots = Math.max(1, Math.floor(capacity));
  const split = ranked.length <= slots ? ranked.length : Math.max(0, slots - 1);
  return { root: ranked.slice(0, split), overflow: ranked.slice(split) };
}
