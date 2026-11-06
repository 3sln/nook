export const attentionKey = "@3sln/nook:attention:v1";
const burstMs = 6000;
const minimumRetryMs = 45 * 60 * 1000;
const retryRangeMs = 30 * 60 * 1000;

// A document-shared lease owns the timer and browser listeners. Its persisted
// deadline prevents reloading/reconnecting from restarting attention bursts.
export function attentionResource({
  owner,
  storage,
  hasSeen,
  now = Date.now,
  random = Math.random,
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = (timer) => clearTimeout(timer),
}) {
  const listeners = new Set();
  let timer;
  let record;
  let active = false;
  const emit = (value) => {
    if (active === value) return;
    active = value;
    for (const listener of listeners) listener(value);
  };
  const clear = () => {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
  };
  const read = () => {
    try {
      const saved = JSON.parse(storage?.getItem(attentionKey) || "null");
      if (
        saved &&
        Number.isFinite(saved.until) &&
        Number.isFinite(saved.next) &&
        saved.next >= saved.until &&
        saved.next <= now() + 75 * 60 * 1000 &&
        saved.until <= now() + burstMs
      )
        record = saved;
    } catch {}
    return record;
  };
  const write = () => {
    try {
      storage?.setItem(attentionKey, JSON.stringify(record));
    } catch {}
  };
  const advance = () => {
    clear();
    if (!listeners.size || hasSeen() || owner?.visibilityState === "hidden") {
      emit(false);
      return;
    }
    const time = now();
    read();
    if (!record || time >= record.next) {
      record = {
        until: time + burstMs,
        next:
          time +
          minimumRetryMs +
          Math.floor(Math.max(0, Math.min(1, random())) * retryRangeMs),
      };
      write();
    }
    const inviting = time < record.until;
    emit(inviting);
    timer = setTimer(
      advance,
      Math.max(1, (inviting ? record.until : record.next) - time),
    );
  };
  return {
    subscribe(listener) {
      listeners.add(listener);
      listener(active);
      if (listeners.size === 1) {
        owner?.addEventListener?.("visibilitychange", advance);
        owner?.defaultView?.addEventListener?.("storage", advance);
      }
      advance();
      return () => {
        listeners.delete(listener);
        if (!listeners.size) {
          clear();
          active = false;
          owner?.removeEventListener?.("visibilitychange", advance);
          owner?.defaultView?.removeEventListener?.("storage", advance);
        }
      };
    },
    acknowledge() {
      clear();
      emit(false);
    },
  };
}
