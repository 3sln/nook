import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("@3sln/nook:tutorial:v1", "seen"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => {
    document.querySelector("nook-dock").remove();
    const dock = document.createElement("nook-dock");
    dock.innerHTML =
      '<nook-item id="save-item" command="save" keybind="Alt+X" priority="100"></nook-item><nook-item id="custom" label="Custom flow" priority="90"></nook-item><nook-command id="save" name="Save changes" description="Save the current draft" keybind="Alt+S"></nook-command>';
    window.invocations = [];
    dock.addEventListener("nook-select", (event) => {
      window.invocations.push(`select:${event.detail.id}`);
      if (event.detail.id === "custom") event.preventDefault();
    });
    dock.addEventListener("nook-command", (event) =>
      window.invocations.push(`command:${event.detail.id}`),
    );
    document.body.append(dock);
    dock.open();
  });
  await expect(
    page.getByRole("dialog", { name: "Nook", exact: true }),
  ).toBeVisible();
});
test("command references share execution and custom items can override selection", async ({
  page,
}) => {
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  await root.getByRole("button", { name: "Save changes", exact: true }).click();
  expect(await page.evaluate(() => window.invocations)).toEqual([
    "select:save-item",
    "command:save",
  ]);
  expect(
    await page.evaluate(() => document.querySelector("#save-item").keybind),
  ).toBe("Alt+S");
  const key = await page.evaluate(
    () =>
      [
        ...(document.querySelector("nook-dock").browserKeyboardLayout || []),
      ].find(([, value]) => value.toLowerCase() === "s")?.[0],
  );
  if (key) {
    await page.keyboard.down("Alt");
    await page.keyboard.press(key);
    await page.keyboard.up("Alt");
    expect(await page.evaluate(() => window.invocations)).toEqual([
      "select:save-item",
      "command:save",
      "command:save",
    ]);
  }
  await page.evaluate(() => document.querySelector("nook-dock").open());
  await root.getByRole("button", { name: "Custom flow", exact: true }).click();
  await expect(root).toBeVisible();
  expect(await page.evaluate(() => window.invocations.at(-1))).toBe(
    "select:custom",
  );
});
test("command reference availability and labels update in the open dial", async ({
  page,
}) => {
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  await page.evaluate(() =>
    document.querySelector("#save").setAttribute("name", "Store draft"),
  );
  await expect(
    root.getByRole("button", { name: "Store draft", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    document.querySelector("#save").setAttribute("disabled", ""),
  );
  await expect(
    root.getByRole("button", { name: "Store draft", exact: true }),
  ).toBeHidden();
  await page.evaluate(() =>
    document.querySelector("#save").removeAttribute("disabled"),
  );
  await expect(
    root.getByRole("button", { name: "Store draft", exact: true }),
  ).toBeVisible();
});
