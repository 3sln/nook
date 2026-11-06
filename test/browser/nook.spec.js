import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith("first visit"))
    await page.addInitScript(() =>
      localStorage.setItem("@3sln/nook:tutorial:v1", "seen"),
    );
  await page.goto("/");
  await page.waitForFunction(() => document.querySelector("nook-dock")?.state);
});
test("tap, nested navigation, and panel drafts preserve DOM identity", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Tell us more" })
    .fill("A persistent draft");
  await page.evaluate(() => {
    window.originalInput = document
      .querySelector("nook-dock")
      .shadowRoot.querySelector("[part~=feedback-message]");
  });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Tell us more" })).toHaveValue(
    "A persistent draft",
  );
  expect(
    await page.evaluate(
      () =>
        window.originalInput ===
        document
          .querySelector("nook-dock")
          .shadowRoot.querySelector("[part~=feedback-message]"),
    ),
  ).toBe(true);
});
test("live insertion and removal updates a visible full menu", async ({
  page,
}) => {
  await page.evaluate(() => document.querySelector("nook-dock").open("full"));
  await page.evaluate(() => {
    const item = document.createElement("nook-action");
    item.id = "new-action";
    item.setAttribute("label", "Fresh action");
    document.querySelector("nook-dock").append(item);
  });
  await expect(
    page.getByRole("button", { name: "Fresh action", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => document.querySelector("#new-action").remove());
  await expect(
    page.getByRole("button", { name: "Fresh action", exact: true }),
  ).toHaveCount(0);
});
test("separate shortcuts and Escape navigation", async ({ page, isMobile }) => {
  test.skip(isMobile, "Desktop shortcut contract");
  test.skip(
    !(await page.evaluate(() =>
      Boolean(document.querySelector("nook-dock").browserKeyboardLayout),
    )),
    "Layout-dependent shortcuts disabled without reported mapping",
  );
  await pressAltShift(page, "s");
  await expect(
    page.getByRole("dialog", { name: "Quick settings" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("dialog", { name: "Quick settings" }),
  ).toBeHidden();
  await pressAltShift(page, "q");
  await expect(page.getByRole("dialog", { name: "More" })).toBeVisible();
  await page.keyboard.press("Escape");
  await pressAltShift(page, "f");
  await expect(
    page.getByRole("dialog", { name: "Feedback", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Shift+?");
  await expect(page.getByRole("dialog", { name: "Nook" })).toBeVisible();
  const digitOne = await page.evaluate(
    () =>
      document
        .querySelector("nook-dock")
        .browserKeyboardLayout?.get("Digit1") === "1",
  );
  if (digitOne) {
    await page.keyboard.down("Alt");
    await expect(
      page
        .getByRole("button", { name: "Feedback", exact: true })
        .locator("[part~=number]"),
    ).toBeVisible();
    const number = await page
      .getByRole("button", { name: "Feedback", exact: true })
      .locator("[part~=number]")
      .textContent();
    await page.keyboard.press(`Digit${number}`);
    await page.keyboard.up("Alt");
  } else
    await page.getByRole("button", { name: "Feedback", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Feedback", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(page.getByRole("dialog", { name: "Nook" })).toBeVisible();
});
test("swipes open their surfaces and a long press moves the handle", async ({
  page,
}) => {
  const handle = page.getByRole("button", { name: "Open Nook menu" });
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y);
  await page.mouse.up();
  await expect(page.getByRole("dialog", { name: "Full menu" })).toBeVisible();
  await page.evaluate(() => document.querySelector("nook-dock").close());
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y - 90);
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Quick settings" }),
  ).toBeVisible();
  await page.evaluate(() => document.querySelector("nook-dock").close());
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y - 90);
  await page.mouse.up();
  await expect(page.getByRole("dialog", { name: "Full menu" })).toBeVisible();
  await page.evaluate(() => document.querySelector("nook-dock").close());
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(30, 30);
  await page.mouse.up();
  await expect(page.locator("nook-dock")).toHaveAttribute("corner", "top-left");
});

test("root and help show instructions appropriate to the input device", async ({
  page,
  isMobile,
}) => {
  const handle = page.getByRole("button", { name: "Open Nook menu" });
  const tooltip = page.locator("nook-dock").locator("[part~=handle-tooltip]");
  if (!isMobile) {
    await handle.hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText("Shift + ?");
    await expect(tooltip).toContainText("Hold, then drag");
  }
  await handle.click();
  await expect(tooltip).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Nook", exact: true }).locator("kbd"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "How to use Nook" }),
  ).toHaveCount(0);
  if (isMobile) {
    await expect(page.locator(".keyboard-hint")).toBeHidden();
    await expect(page.locator(".touch-hint")).toBeVisible();
  } else await expect(page.locator(".keyboard-hint")).toBeVisible();
  await page
    .locator("nook-dock")
    .evaluate((node) => node.open(node.querySelector("#keyboard-guide")));
  const help = page.getByRole("dialog", {
    name: "How Nook works",
    exact: true,
  });
  const touch = help.getByText("Tap to open. Swipe sideways", { exact: false });
  const keyboard = help.getByText("Use arrow keys to move", { exact: false });
  if (isMobile) {
    await expect(touch).toBeVisible();
    await expect(keyboard).toBeHidden();
  } else {
    await expect(touch).toBeHidden();
    await expect(keyboard).toBeVisible();
  }
});

test("compact menus float and expanded mobile views fill the viewport", async ({
  page,
  isMobile,
}) => {
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  await expect(root).toHaveAttribute("data-presentation", "compact");
  expect(
    await root.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
  await expect(root.locator("header")).toBeHidden();
  const handle = await page
    .getByRole("button", { name: "Close Nook menu" })
    .boundingBox();
  expect(handle.width).toBe(48);
  await page.evaluate(() => {
    for (let i = 0; i < 3; i++) {
      const item = document.createElement("nook-action");
      item.root = true;
      item.setAttribute("label", `Extra ${i}`);
      document.querySelector("nook-dock").append(item);
    }
  });
  await expect(root).toHaveAttribute("data-presentation", "compact");
  await expect(
    root.getByRole("button", { name: "More", exact: true }),
  ).toBeHidden();
  await page.evaluate(() =>
    document
      .querySelector("nook-dock")
      .open(document.querySelector("#keyboard-guide")),
  );
  const expanded = page.getByRole("dialog", {
    name: "How Nook works",
    exact: true,
  });
  const viewport = page.viewportSize();
  const bounds = await expanded.boundingBox();
  if (isMobile) {
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(viewport.width);
    expect(bounds.height).toBe(viewport.height);
    expect(
      await expanded.evaluate(
        (node) => getComputedStyle(node, "::before").backdropFilter,
      ),
    ).toContain("blur");
  } else {
    expect(bounds.width).toBeLessThan(viewport.width);
    expect(bounds.height).toBeLessThan(viewport.height);
  }
  await page.keyboard.press("Escape");
  await expect(root).toBeHidden();
});

test("expanded descendants remain fullscreen and nested menus become sections", async ({
  page,
  isMobile,
}) => {
  await page.evaluate(() => {
    const dock = document.querySelector("nook-dock");
    const menu = dock.querySelector('nook-menu[label="Resources"]');
    menu.setAttribute("presentation", "expanded");
    dock.open(menu);
  });
  const resources = page.getByRole("dialog", {
    name: "Resources",
    exact: true,
  });
  await expect(resources).toHaveAttribute("data-presentation", "expanded");
  if (isMobile) {
    await expect(
      resources.getByRole("heading", { name: "Guides", exact: true }),
    ).toBeVisible();
    await expect(
      resources.getByRole("heading", { name: "Writing tips", exact: true }),
    ).toBeVisible();
    await expect(
      resources.getByRole("button", { name: "Close menu", exact: true }),
    ).toBeVisible();
    await resources
      .getByRole("button", { name: "Getting started", exact: true })
      .click();
  } else {
    await expect(
      resources.getByRole("button", { name: "Close menu", exact: true }),
    ).toBeHidden();
    await resources
      .getByRole("button", { name: "Guides", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", { name: "Guides", exact: true }),
    ).toHaveAttribute("data-presentation", "expanded");
    await page
      .getByRole("button", { name: "Writing tips", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Getting started", exact: true })
      .click();
  }
  const panel = page.getByRole("dialog", {
    name: "Getting started",
    exact: true,
  });
  await expect(panel).toBeVisible();
  await page.keyboard.press("Backspace");
  await expect(panel).toBeHidden();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  await expect(
    page.getByRole("dialog", { name: "Nook", exact: true }),
  ).toBeVisible();
});

test("command search, arguments, and command binding hints", async ({
  page,
  isMobile,
}) => {
  if (isMobile) {
    await page.getByRole("button", { name: "Open Nook menu" }).click();
    await page.getByRole("button", { name: "Commands", exact: true }).click();
  } else await page.keyboard.press("Control+Shift+p");
  const palette = page.getByRole("dialog", { name: "Commands", exact: true });
  await expect(palette).toBeVisible();
  await page.getByRole("searchbox", { name: "Search commands" }).fill("note");
  const result = page.getByRole("button", {
    name: "Create a note",
    exact: true,
  });
  await expect(result).toBeVisible();
  const supported = await page.evaluate(() =>
    Boolean(document.querySelector("nook-dock").browserKeyboardLayout),
  );
  if (isMobile || !supported) await expect(result.locator("kbd")).toBeHidden();
  else await expect(result.locator("kbd")).toHaveText("Alt+N");
  await result.click();
  await page.getByLabel("Note title", { exact: true }).fill("From the palette");
  await page.getByRole("button", { name: "Run command" }).click();
  await expect(page.locator(".document h2")).toHaveText("From the palette");
  await expect(
    page.getByRole("dialog", { name: "Create a note", exact: true }),
  ).toBeHidden();
});
test("Alt/Option badges are transient and plain number keys do not activate", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop keyboard hints");
  const layout = await page.evaluate(() =>
    Boolean(document.querySelector("nook-dock").browserKeyboardLayout),
  );
  test.skip(
    !layout,
    "Number selection is intentionally disabled without reported layout data",
  );
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  await page.keyboard.press("1");
  await expect(
    page.getByRole("dialog", { name: "Nook", exact: true }),
  ).toBeVisible();
  const feedback = page.getByRole("button", { name: "Feedback", exact: true });
  const label = feedback.locator("[part~=item-label]");
  await expect(label).toBeVisible();
  const tooltip = feedback.locator("[part~=tooltip]");
  await feedback.hover();
  await expect(tooltip).toHaveCSS("opacity", "1");
  await expect(label).toBeHidden();
  await page.keyboard.down("Alt");
  await expect(tooltip).toBeHidden();
  const badge = page
    .getByRole("button", { name: "Feedback", exact: true })
    .locator("[part~=number]");
  await expect(badge).toHaveText("2");
  await expect(badge).toBeVisible();
  await expect(label).toBeVisible();
  await expect(label).toHaveText("Feedback");
  await expect(badge).toHaveCSS("position", "absolute");
  const iconBounds = await feedback.boundingBox();
  expect(iconBounds.width).toBeCloseTo(56, 0);
  await page.keyboard.up("Alt");
  await expect(badge).toBeHidden();
  await expect(label).toBeHidden();
  await page.mouse.move(0, 0);
  await feedback.focus();
  await page.keyboard.press("Tab");
  await page.keyboard.press("Shift+Tab");
  await expect(feedback).toBeFocused();
  await expect(tooltip).toHaveCSS("opacity", "1");
  await page.keyboard.down("Alt");
  await expect(tooltip).toBeHidden();
  await expect(label).toBeVisible();
  await page.keyboard.up("Alt");
  await page.evaluate(() =>
    document.querySelector("nook-dock").open("overflow"),
  );
  const overflow = page.getByRole("dialog", { name: "More", exact: true });
  for (const width of ["360px", "440px"]) {
    await page.evaluate(
      (width) =>
        document
          .querySelector("nook-dock")
          .style.setProperty("--nook-overflow-width", width),
      width,
    );
    await overflow.evaluate(async (element) => {
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const before = await overflow.boundingBox();
    await page.keyboard.down("Alt");
    await expect(
      overflow.locator("[part~=number]").filter({ visible: true }).first(),
    ).toBeVisible();
    await expect
      .poll(async () =>
        Math.abs((await overflow.boundingBox()).width - before.width),
      )
      .toBeLessThan(1);
    await page.keyboard.up("Alt");
    await expect
      .poll(async () =>
        Math.abs((await overflow.boundingBox()).width - before.width),
      )
      .toBeLessThan(1);
  }
});

async function pressAltShift(page, key) {
  await page.keyboard.down("Alt");
  await page.keyboard.down("Shift");
  await page.waitForFunction(() =>
    Boolean(document.querySelector("nook-dock").browserKeyboardLayout),
  );
  await page.keyboard.press(key);
  await page.keyboard.up("Shift");
  await page.keyboard.up("Alt");
}
test("first visit offers the device guide once and retains real sprite references", async ({
  page,
  isMobile,
}) => {
  const handle = page.locator("nook-dock").locator("[part~=handle]");
  await expect(handle).toHaveClass(/inviting/);
  await handle.click();
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  await expect(root).toBeVisible();
  const guide = root.getByRole("button", { name: "Quick tour", exact: true });
  await expect(guide.locator("[part~=tutorial-badge]")).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("@3sln/nook:tutorial:v1")),
  ).toBeNull();
  await guide.click();
  const welcome = page.getByRole("dialog", {
    name: "Quick tour",
    exact: true,
  });
  await expect(welcome).toBeVisible();
  await expect(handle).not.toHaveClass(/inviting/);
  if (isMobile)
    await expect(
      welcome.getByText("Tap to open. Swipe sideways", { exact: false }),
    ).toBeVisible();
  else
    await expect(
      welcome.getByText("Arrows move; Enter selects.", { exact: false }),
    ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("@3sln/nook:tutorial:v1")),
  ).toBe(null);
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("@3sln/nook:tutorial:v1")),
  ).toBe("seen");
  await expect(
    page.getByRole("button", { name: "Quick tour", exact: true }),
  ).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Nook", exact: true }),
  ).toBeVisible();
  const icon = page
    .getByRole("button", { name: "Resources", exact: true })
    .locator("use");
  await expect(icon).toHaveAttribute("href", "#nook-icon-folder");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Open Nook menu" }),
  ).not.toHaveClass(/inviting/);
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  await expect(
    page.getByRole("dialog", { name: "Nook", exact: true }),
  ).toBeVisible();
});

test("corner orientation, anchored drag preview, and readable floating text controls", async ({
  page,
}) => {
  const dock = page.locator("nook-dock");
  const handle = page.getByRole("button", { name: "Open Nook menu" });
  const orientations = {
    "bottom-right": "none",
    "bottom-left": "matrix(0, 1, -1, 0, 0, 0)",
    "top-left": "matrix(-1, 0, 0, -1, 0, 0)",
    "top-right": "matrix(0, -1, 1, 0, 0, 0)",
  };
  for (const [corner, matrix] of Object.entries(orientations)) {
    await dock.evaluate(
      (node, corner) => node.setAttribute("corner", corner),
      corner,
    );
    await expect
      .poll(() =>
        handle
          .locator(".mark svg")
          .evaluate((node) => getComputedStyle(node).transform),
      )
      .toBe(matrix);
  }
  await dock.evaluate((node) => node.setAttribute("corner", "bottom-right"));
  await page.waitForFunction(
    () =>
      !document
        .querySelector("nook-dock")
        .shadowRoot.querySelector("[part~=handle]")
        .getAnimations()
        .some((animation) => animation.playState === "running"),
  );
  const before = await handle.boundingBox();
  await page.mouse.move(
    before.x + before.width / 2,
    before.y + before.height / 2,
  );
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.move(20, 20);
  const preview = dock.locator("[part~=drag-preview]");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute("data-corner", "top-left");
  const during = await handle.boundingBox();
  expect(during.x).toBe(before.x);
  expect(during.y).toBe(before.y);
  await expect(dock).toHaveAttribute("corner", "bottom-right");
  const target = await preview.boundingBox();
  expect(target.x).toBe(0);
  expect(target.y).toBe(0);
  await page.mouse.up();
  await expect(dock).toHaveAttribute("corner", "top-left");
  await expect(preview).toBeHidden();
  await handle.click();
  const help = page.getByRole("button", { name: "Full menu", exact: true });
  expect(
    await help.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  expect(
    await help.evaluate((node) => getComputedStyle(node).backdropFilter),
  ).toBe("none");
  const feedback = page.getByRole("button", { name: "Feedback", exact: true });
  const centered = await feedback.evaluate((button) => {
    const svg = button.querySelector(".icon svg");
    const box = button.getBoundingClientRect(),
      rect = svg.getBoundingClientRect(),
      ink = svg.getBBox();
    return {
      dx: rect.x + rect.width / 2 - (box.x + box.width / 2),
      dy: rect.y + rect.height / 2 - (box.y + box.height / 2),
      inkY: ink.y + ink.height / 2,
    };
  });
  expect(Math.abs(centered.dx)).toBeLessThan(0.5);
  expect(Math.abs(centered.dy)).toBeLessThan(0.5);
  expect(Math.abs(centered.inkY - 12)).toBeLessThan(0.75);
});

test("adaptive defaults, rounded compact backdrop, and locked-corner affordances", async ({
  page,
  isMobile,
}) => {
  const dock = page.locator("nook-dock");
  await dock.evaluate((node) => node.style.removeProperty("color-scheme"));
  await page.emulateMedia({ colorScheme: "dark" });
  await dock.evaluate((node) => node.open("commands"));
  const palette = page.getByRole("dialog", { name: "Commands", exact: true });
  const dark = await palette.evaluate((node) => getComputedStyle(node).color);
  const fullMaterial = isMobile
    ? await palette.evaluate((node) => ({
        filter: getComputedStyle(node, "::before").backdropFilter,
        background: getComputedStyle(node, "::before").backgroundColor,
      }))
    : null;
  await page.emulateMedia({ colorScheme: "light" });
  const light = await palette.evaluate((node) => getComputedStyle(node).color);
  expect(dark).not.toBe(light);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  if (fullMaterial) {
    expect(fullMaterial.filter).toContain("blur(7.5px)");
  }
  expect(
    await root.evaluate((node) => getComputedStyle(node, "::before").maskImage),
  ).toContain("radial-gradient");
  expect(
    await root.evaluate(
      (node) => getComputedStyle(node, "::before").backdropFilter,
    ),
  ).toContain("blur(7.5px)");
  const choice = root.getByRole("button", { name: "Feedback", exact: true });
  expect(
    await choice.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toBe("rgba(0, 0, 0, 0)");
  expect(
    await choice.evaluate((node) => getComputedStyle(node).borderRadius),
  ).toBe("50%");
  expect(
    await choice.evaluate((node) => getComputedStyle(node).boxShadow),
  ).not.toBe("none");
  await dock.evaluate(
    (node) =>
      (node.disabledPositions = [
        "top-left",
        "top-right",
        "bottom-left",
        "top-center",
        "right-center",
        "bottom-center",
        "left-center",
      ]),
  );
  const tooltip = dock.locator("[part~=handle-tooltip]");
  if (!isMobile) {
    await page.getByRole("button", { name: "Close Nook menu" }).hover();
    await expect(tooltip.locator("[part~=drag-hint]")).toBeHidden();
  }
  await dock.evaluate((node) =>
    node.open(node.querySelector("#keyboard-guide")),
  );
  await expect(
    page.getByRole("button", { name: "Choose a corner" }),
  ).toBeHidden();
  const handle = page.getByRole("button", { name: "Close Nook menu" });
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await expect(dock.locator("[part~=drag-preview]")).toBeHidden();
  await page.mouse.up();
});

test("motion is restrained and reduced-motion suppresses scripted settling", async ({
  page,
}) => {
  const dock = page.locator("nook-dock");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await dock.evaluate((node) => node.open("root"));
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  expect(
    await root.evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("reveal");
  await dock.evaluate((node) => node.setAttribute("corner", "top-left"));
  expect(
    await dock.evaluate(
      (node) =>
        node.shadowRoot.querySelector("[part~=handle]").getAnimations().length,
    ),
  ).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dock.evaluate((node) => node.setAttribute("corner", "bottom-left"));
  expect(
    await dock.evaluate(
      (node) =>
        node.shadowRoot
          .querySelector("[part~=handle]")
          .getAnimations()
          .filter((animation) => animation.playState === "running").length,
    ),
  ).toBe(0);
  expect(
    await root.evaluate((node) => getComputedStyle(node).animationName),
  ).toBe("none");
});

test("rich enum picker and optional feedback form use Nook surfaces", async ({
  page,
}) => {
  await page.evaluate(() =>
    document.querySelector("nook-dock").open("settings"),
  );
  await page.getByRole("button", { name: "Accent", exact: true }).click();
  const picker = page.getByRole("listbox", { name: "Accent", exact: true });
  await expect(picker).toBeVisible();
  await expect(picker.getByText("Green", { exact: true })).toBeVisible();
  await picker.getByRole("option", { name: "Sage", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Quick settings", exact: true }),
  ).toBeVisible();
  await expect(page.locator("#accent")).toHaveAttribute("value", "#36877d");
  await page.evaluate(() =>
    document.querySelector("nook-dock").open("feedback"),
  );
  await page.getByRole("radio", { name: "Feature request" }).click();
  await page
    .getByRole("textbox", { name: "Tell us more" })
    .fill("Please add workspace templates");
  await page
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(
    page.getByText("Saved in this demo only. No data was sent."),
  ).toBeVisible();
  const report = await page.evaluate(
    () => document.querySelector("nook-dock").lastFeedback,
  );
  expect(report.type).toBe("feature");
  expect(report.message).toBe("Please add workspace templates");
});

test("command search stays pinned to the anchor edge as results change", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    const dock = document.querySelector("nook-dock");
    for (let i = 0; i < 24; i++) {
      const command = document.createElement("nook-command");
      command.setAttribute("name", `Position probe ${i}`);
      command.setAttribute("description", "Search position regression");
      dock.append(command);
    }
  });
  const search = page.getByRole("searchbox", { name: "Search commands" });
  for (const corner of [
    "bottom-right",
    "bottom-left",
    "top-right",
    "top-left",
  ]) {
    await page.evaluate((corner) => {
      const dock = document.querySelector("nook-dock");
      dock.setAttribute("corner", corner);
      dock.open("commands");
    }, corner);
    await search.fill("");
    const initial = await search.boundingBox();
    for (const query of [
      "Position probe 23",
      "no matching command anywhere",
      "",
    ]) {
      await search.fill(query);
      await expect
        .poll(async () => Math.abs((await search.boundingBox()).y - initial.y))
        .toBeLessThan(1);
    }
    const positions = await page.evaluate(() => {
      const root = document.querySelector("nook-dock").shadowRoot;
      const search = root
        .querySelector("[part~=command-search]")
        .getBoundingClientRect();
      const results = root
        .querySelector("[part~=command-results]")
        .getBoundingClientRect();
      return { search: search.y, results: results.y };
    });
    expect(
      corner.startsWith("bottom")
        ? positions.search > positions.results
        : positions.search < positions.results,
    ).toBe(true);
  }
});

test("priority overflow adapts in the root and typography stays consistent", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => {
    const dock = document.querySelector("nook-dock");
    dock.feedback = false;
    dock.innerHTML =
      '<nook-action priority="100" label="First shortcut"></nook-action><nook-action priority="90" label="Second shortcut"></nook-action><nook-action priority="80" label="Root one"></nook-action><nook-action priority="70" group="Workspace" label="Root two"></nook-action><nook-action priority="60" group="Workspace" label="Root three"></nook-action>';
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.evaluate(() => document.querySelector("nook-dock").open());
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  await expect(
    root.getByRole("button", { name: "First shortcut", exact: true }),
  ).toBeVisible();
  await expect(
    root.getByRole("button", { name: "Second shortcut", exact: true }),
  ).toBeVisible();
  await expect(
    root.getByRole("button", { name: "More", exact: true }),
  ).toBeHidden();
  await page.setViewportSize({ width: 280, height: 700 });
  await expect(
    root.getByRole("button", { name: "Full menu", exact: true }),
  ).toBeVisible();
  await expect(
    root.getByRole("button", { name: "First shortcut", exact: true }),
  ).toBeVisible();
  await expect(
    root.getByRole("button", { name: "Root three", exact: true }),
  ).toBeHidden();
  await root.getByRole("button", { name: "Full menu", exact: true }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Full menu", exact: true })
      .getByRole("button", { name: "Root three", exact: true }),
  ).toBeVisible();
  await page.evaluate(() =>
    document.querySelector("nook-dock").open("welcome"),
  );
  const heading = page
    .getByRole("dialog", { name: "Quick tour", exact: true })
    .getByRole("heading", { name: "Quick tour", exact: true });
  await expect(heading).toHaveCSS("font-size", "16px");
  await expect(heading).toHaveCSS("font-weight", "600");
  await page.evaluate(() =>
    document
      .querySelector("nook-dock")
      .style.setProperty("--nook-text-lg", "18px"),
  );
  await expect(heading).toHaveCSS("font-size", "18px");
});

test("edge-center handles, inward panels, and command search stay within the viewport", async ({
  page,
  isMobile,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewport = page.viewportSize();
  for (const position of [
    "top-center",
    "right-center",
    "bottom-center",
    "left-center",
  ]) {
    await page.evaluate((position) => {
      const dock = document.querySelector("nook-dock");
      dock.close();
      dock.position = position;
    }, position);
    const available = await page.evaluate(
      (position) =>
        document
          .querySelector("nook-dock")
          .availablePositions.includes(position),
      position,
    );
    if (!available) {
      expect(
        await page.evaluate(
          () => document.querySelector("nook-dock").preferredPosition,
        ),
      ).toBe(position);
      continue;
    }
    const handle = await page
      .getByRole("button", { name: "Open Nook menu" })
      .boundingBox();
    if (position === "top-center" || position === "bottom-center") {
      expect(
        Math.abs(handle.x + handle.width / 2 - viewport.width / 2),
      ).toBeLessThan(1);
      expect(handle.width).toBe(64);
      expect(handle.height).toBe(48);
    } else {
      expect(
        Math.abs(handle.y + handle.height / 2 - viewport.height / 2),
      ).toBeLessThan(1);
      expect(handle.width).toBe(48);
      expect(handle.height).toBe(64);
    }
    await page.evaluate(() =>
      document.querySelector("nook-dock").open("commands"),
    );
    const palette = page.getByRole("dialog", { name: "Commands", exact: true });
    const bounds = await palette.boundingBox();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height + 1);
    if (isMobile) {
      expect(bounds.x).toBe(0);
      expect(bounds.y).toBe(0);
      expect(bounds.height).toBe(viewport.height);
    }
    const search = page.getByRole("searchbox", { name: "Search commands" });
    const before = await search.boundingBox();
    await search.fill("no matching command");
    await expect
      .poll(async () => Math.abs((await search.boundingBox()).y - before.y))
      .toBeLessThan(1);
  }
});

test("initial position attributes survive native custom-element upgrade", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(new URL("/", page.url()).href, async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      /<nook-dock id="dock"([^>]*)>/,
      '<nook-dock id="dock"$1 position="left-center" disabled-positions="top-center">',
    );
    await route.fulfill({ response, body });
  });
  await page.reload();
  await page.waitForFunction(() => document.querySelector("nook-dock")?.state);
  await expect(page.locator("nook-dock")).toHaveAttribute(
    "position",
    "left-center",
  );
  expect(
    await page.evaluate(() =>
      document
        .querySelector("nook-dock")
        .state.allowedPositions.includes("top-center"),
    ),
  ).toBe(false);
  expect(errors).toEqual([]);
});

test("held dial requires release on a visible option", async ({ page }) => {
  const handle = page.getByRole("button", { name: "Open Nook menu" });
  const box = await handle.boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const dial = page.locator('[part~="swipe-dial"]');
  const all = dial
    .locator('[part~="swipe-dial-option"]')
    .filter({ hasText: "Full menu" });
  const start = async () => {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x - 80, y - 80);
    await expect(dial).toBeVisible();
  };
  await start();
  await expect(all).toBeVisible();
  const target = await all.boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(56);
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await expect(all).toHaveAttribute("data-selected", "");
  await page.mouse.move(x, y);
  await page.mouse.up();
  await expect(dial).toBeHidden();
  expect(
    await page.evaluate(
      () => document.querySelector("nook-dock").state.path.length,
    ),
  ).toBe(0);
  await start();
  const next = await all.boundingBox();
  await page.mouse.move(next.x + next.width / 2, next.y + next.height / 2);
  await page.mouse.up();
  await expect(
    page.getByRole("dialog", { name: "Full menu", exact: true }),
  ).toBeVisible();
});

test("development demo stays within narrow layouts and its controls open views", async ({
  page,
}) => {
  for (const width of [280, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    const dimensions = await page.evaluate(() => ({
      viewport: innerWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport + 1);
    for (const selector of [
      ".workspace:visible",
      ".demo-controls",
      ".editor",
      ".demo-controls button",
    ]) {
      for (const element of await page.locator(selector).all()) {
        const box = await element.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
        expect(
          await element.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
        ).toBe(true);
      }
    }
    const workspace = await page.locator(".workspace").first().boundingBox();
    const controls = await page.locator(".demo-controls").boundingBox();
    expect(
      controls.x >= workspace.x + workspace.width ||
        controls.y >= workspace.y + workspace.height,
    ).toBe(true);
  }
  await page
    .getByRole("button", { name: "Open commands", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Commands", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.locator("#dynamic").click();
  await expect(page.locator("#dynamic")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#dynamic").click();
  await expect(page.locator("#dynamic")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});

test("demo has dark surfaces before its JavaScript runs", async ({
  browser,
}) => {
  const context = await browser.newContext({
    colorScheme: "dark",
    javaScriptEnabled: false,
  });
  try {
    const page = await context.newPage();
    await page.goto("/");
    const colors = await page
      .locator(".workspace, .demo-controls, .editor")
      .evaluateAll((elements) =>
        elements.map((el) => getComputedStyle(el).backgroundColor),
      );
    for (const color of colors) {
      const channels = color.match(/[\d.]+/g).map(Number);
      expect(Math.max(...channels.slice(0, 3))).toBeLessThan(70);
    }
    await expect(page.locator("nook-dock")).toBeHidden();
  } finally {
    await context.close();
  }
});

for (const wrapped of [false, true]) {
  test(`bottom anchors follow keyboard viewport resize and pan (${wrapped ? "app wrapper" : "viewport"})`, async ({
    page,
  }) => {
    await page.evaluate((wrapped) => {
      document.querySelector("nook-dock").remove();
      const viewport = new EventTarget();
      Object.assign(viewport, {
        offsetLeft: 0,
        offsetTop: 0,
        width: innerWidth,
        height: innerHeight,
      });
      Object.defineProperty(window, "visualViewport", {
        configurable: true,
        value: viewport,
      });
      const dock = document.createElement("nook-dock");
      dock.setAttribute("position-policy", "all");
      dock.innerHTML = '<nook-action label="Sample action"></nook-action>';
      if (wrapped) {
        dock.style.cssText = "position:fixed;inset:80px 20px 64px";
        dock.prepend(document.createElement("main"));
      }
      document.body.append(dock);
    }, wrapped);
    await page.waitForFunction(
      () => document.querySelector("nook-dock")?.state,
    );
    const handle = page.getByRole("button", { name: "Open Nook menu" });
    const layout = await page.evaluate(() => ({
      width: innerWidth,
      height: innerHeight,
    }));
    const visibleHeight = Math.floor(layout.height * 0.5);
    for (const position of ["bottom-left", "bottom-center", "bottom-right"]) {
      await page.evaluate(
        ({ position, visibleHeight }) => {
          document.querySelector("nook-dock").position = position;
          Object.assign(visualViewport, {
            height: visibleHeight,
            offsetTop: 40,
          });
          visualViewport.dispatchEvent(new Event("resize"));
        },
        { position, visibleHeight },
      );
      await expect
        .poll(async () => {
          const box = await handle.boundingBox();
          return box.y + box.height;
        })
        .toBeCloseTo(visibleHeight + 40, 0);
      await expect(page.locator("nook-dock")).toHaveAttribute(
        "position",
        position,
      );
      await page.evaluate(() => {
        visualViewport.offsetTop = 70;
        visualViewport.dispatchEvent(new Event("scroll"));
      });
      await expect
        .poll(async () => {
          const box = await handle.boundingBox();
          return box.y + box.height;
        })
        .toBeCloseTo(visibleHeight + 70, 0);
    }
    await page.evaluate(() => {
      Object.assign(visualViewport, { height: innerHeight, offsetTop: 0 });
      visualViewport.dispatchEvent(new Event("resize"));
    });
    await expect
      .poll(async () => {
        const box = await handle.boundingBox();
        return box.y + box.height;
      })
      .toBeCloseTo(layout.height - (wrapped ? 64 : 0), 0);
  });
}

test("demo full settings link opens its app destination and shares the theme setting", async ({
  page,
}) => {
  await page.locator("#scratchpad").fill("Keep this note");
  await page
    .getByRole("button", { name: "Open settings", exact: true })
    .click();
  const quick = page.getByRole("dialog", {
    name: "Quick settings",
    exact: true,
  });
  await quick.getByRole("link", { name: "All settings", exact: true }).click();
  const app = page.locator("#app-settings");
  await expect(app).toBeVisible();
  await expect(page).toHaveURL(/#app-settings$/);
  await expect(quick).toBeHidden();
  await expect(page.locator("#app-settings-heading")).toBeFocused();
  const dark = page.locator("#app-dark");
  const value = !(await dark.isChecked());
  await dark.setChecked(value);
  expect(
    await page.evaluate(() => document.querySelector("#dock #theme").value),
  ).toBe(value);
  await app.getByRole("link", { name: "Back to playground" }).click();
  await expect(app).toBeHidden();
  await expect(page.locator("#scratchpad")).toHaveValue("Keep this note");
});

test("clamped hover tooltip text preserves its bottom padding", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Hover tooltip layout");
  const label =
    "A long contextual action with enough detail to wrap and truncate. ".repeat(
      20,
    );
  await page.evaluate((label) => {
    document.querySelector("nook-dock").remove();
    const dock = document.createElement("nook-dock");
    dock.style.setProperty("--nook-tooltip-lines", "2");
    const action = document.createElement("nook-action");
    action.setAttribute("label", label);
    dock.append(action);
    document.body.append(dock);
    dock.open("root");
  }, label);
  const action = page.getByRole("button", { name: label, exact: true });
  await action.hover();
  const tooltip = action.locator("[part~=tooltip]");
  await expect(tooltip).toHaveCSS("opacity", "1");
  const checkPadding = async () => {
    const metrics = await tooltip.evaluate((el) => {
      const text = el.querySelector("[part~=tooltip-text]");
      const outer = el.getBoundingClientRect(),
        inner = text.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        top: inner.top - outer.top,
        bottom: outer.bottom - inner.bottom,
        paddingTop: parseFloat(style.paddingTop),
        paddingBottom: parseFloat(style.paddingBottom),
        textHeight: inner.height,
        lineHeight: parseFloat(getComputedStyle(text).lineHeight),
        text: text.textContent,
      };
    });
    expect(metrics.top).toBeGreaterThanOrEqual(metrics.paddingTop - 0.5);
    expect(metrics.bottom).toBeGreaterThanOrEqual(metrics.paddingBottom - 0.5);
    expect(metrics.textHeight).toBeLessThanOrEqual(metrics.lineHeight * 2 + 1);
    expect(metrics.text).toBe(label);
  };
  await checkPadding();
  await page.addStyleTag({
    content: "nook-dock::part(tooltip) { padding-block: 12px; }",
  });
  await checkPadding();
});

test("settings and feedback have roomier widths while respecting available space", async ({
  page,
  isMobile,
}) => {
  for (const [view, width] of [
    ["settings", 420],
    ["feedback", 520],
  ]) {
    await page.evaluate(
      (view) => document.querySelector("nook-dock").open(view),
      view,
    );
    const surface = page.getByRole("dialog", {
      name: view === "settings" ? "Quick settings" : "Feedback",
      exact: true,
    });
    await expect(surface).toBeVisible();
    const viewport = page.viewportSize();
    const expected =
      isMobile && view === "feedback"
        ? viewport.width
        : Math.min(width, viewport.width - 32);
    await expect
      .poll(async () => (await surface.boundingBox()).width)
      .toBeCloseTo(expected, 0);
    const box = await surface.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    if (!isMobile) {
      await page.evaluate(
        (view) =>
          document
            .querySelector("nook-dock")
            .style.setProperty(`--nook-${view}-width`, "560px"),
        view,
      );
      await expect
        .poll(async () => (await surface.boundingBox()).width)
        .toBeCloseTo(Math.min(560, viewport.width - 32), 0);
    }
    await page.evaluate(() => document.querySelector("nook-dock").close());
  }
});

test("Full menu Settings uses the app link and falls back to quick settings without one", async ({
  page,
}) => {
  const dock = page.locator("nook-dock");
  await dock.evaluate((node) => {
    node.settingsHref = null;
    node.open("all");
  });
  const fullMenu = page.getByRole("dialog", { name: "Full menu", exact: true });
  await fullMenu.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Quick settings", exact: true }),
  ).toBeVisible();
  await dock.evaluate((node) => {
    node.settingsHref = "#app-settings";
  });
  await dock.evaluate((node) => node.open("root"));
  await page
    .getByRole("dialog", { name: "Nook", exact: true })
    .getByRole("button", { name: "Settings", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Quick settings", exact: true }),
  ).toBeVisible();
  await dock.evaluate((node) => node.open("all"));
  await fullMenu.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/#app-settings$/);
  await expect(page.locator("#app-settings")).toBeVisible();
  await expect(fullMenu).toBeHidden();
  await expect(
    page.getByRole("dialog", { name: "Quick settings", exact: true }),
  ).toBeHidden();
});
