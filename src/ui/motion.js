// Effects own no app state. The composition root aborts their lifetime, and a
// new effect cancels the old effect on that element instead of accumulating.
export default function motion({ window, signal, host }) {
  const running = new Map();
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const cancel = () => {
    for (const animation of running.values()) animation.cancel();
    running.clear();
  };
  signal.addEventListener("abort", cancel, { once: true });
  preference.addEventListener(
    "change",
    (event) => {
      if (event.matches) cancel();
    },
    { signal },
  );
  return {
    play(
      element,
      frames,
      {
        token = "--nook-settle-duration",
        fallback = 240,
        easing = "cubic-bezier(.2,.8,.2,1)",
      } = {},
    ) {
      running.get(element)?.cancel();
      if (signal.aborted || preference.matches || !element.animate) return;
      const value = window
        .getComputedStyle(host)
        .getPropertyValue(token)
        .trim();
      const parsed = parseFloat(value);
      const duration = Number.isFinite(parsed)
        ? Math.max(0, parsed * (value.endsWith("ms") ? 1 : 1000))
        : fallback;
      if (!duration) return;
      const animation = element.animate(frames, { duration, easing });
      running.set(element, animation);
      const release = () => {
        if (running.get(element) === animation) running.delete(element);
      };
      animation.onfinish = release;
      animation.oncancel = release;
      return animation;
    },
  };
}
