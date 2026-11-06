// Explicit browser fixture: these keys describe Playwright's injected events,
// not the user's keyboard. Host layouts (notably headless Linux) may be empty.
export async function useKeyboardLayout(page, { empty = false } = {}) {
  await page.addInitScript(
    ({ empty }) => {
      const layout = new Map(
        empty
          ? []
          : [
              ...Array.from({ length: 26 }, (_, i) => [
                `Key${String.fromCharCode(65 + i)}`,
                String.fromCharCode(97 + i),
              ]),
              ...Array.from({ length: 9 }, (_, i) => [
                `Digit${i + 1}`,
                String(i + 1),
              ]),
            ],
      );
      const keyboard = new EventTarget();
      keyboard.getLayoutMap = async () => layout;
      Object.defineProperty(navigator, "keyboard", {
        configurable: true,
        value: keyboard,
      });
    },
    { empty },
  );
  await page.reload();
  await page.waitForFunction(
    () => document.querySelector("nook-dock")?.browserKeyboardLayout,
  );
}
