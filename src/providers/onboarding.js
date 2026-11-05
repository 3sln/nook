export const onboardingKey = "@3sln/nook:tutorial:v1";
// The provider owns a page-scoped fallback. Weak ownership lets the document and
// its in-memory preferences go away together, even when storage is denied.
const sessions = new WeakMap();
export function onboardingResource({ storage, owner }) {
  if (!sessions.has(owner)) sessions.set(owner, new Set());
  const session = sessions.get(owner);
  return {
    hasSeen() {
      if (session.has(onboardingKey)) return true;
      try {
        return storage?.getItem(onboardingKey) === "seen";
      } catch {
        return false;
      }
    },
    markSeen() {
      session.add(onboardingKey);
      try {
        storage?.setItem(onboardingKey, "seen");
      } catch {}
    },
  };
}
