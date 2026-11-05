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
      .shadowRoot.querySelector("[part=feedback-message]");
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
          .shadowRoot.querySelector("[part=feedback-message]"),
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
  await expect(
    page.getByRole("dialog", { name: "All shortcuts" }),
  ).toBeVisible();
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
        .locator("[part=number]"),
    ).toBeVisible();
    await page.keyboard.press("1");
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
  await expect(page.getByRole("dialog", { name: "Quick menu" })).toBeVisible();
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
  await expect(
    page.getByRole("dialog", { name: "All shortcuts" }),
  ).toBeVisible();
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
  const tooltip = page.locator("nook-dock").locator("[part=handle-tooltip]");
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
  await page.locator("nook-dock").evaluate((node) => node.open("help"));
  const touch = page.getByText("Tap to open. Swipe sideways", { exact: false });
  const keyboard = page.getByText("Use arrow keys to move", { exact: false });
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
  await expect(root).toHaveAttribute("data-presentation", "expanded");
  const viewport = page.viewportSize();
  const bounds = await root.boundingBox();
  if (isMobile) {
    expect(bounds.x).toBe(0);
    expect(bounds.y).toBe(0);
    expect(bounds.width).toBe(viewport.width);
    expect(bounds.height).toBe(viewport.height);
    expect(
      await root.evaluate(
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
    const menu = dock.querySelector("nook-menu[root]");
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
  await page.keyboard.down("Alt");
  const badge = page
    .getByRole("button", { name: "Feedback", exact: true })
    .locator("[part=number]");
  await expect(badge).toHaveText("1");
  await expect(badge).toBeVisible();
  await page.keyboard.up("Alt");
  await expect(badge).toBeHidden();
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
  const handle = page.getByRole("button", { name: "Open Nook menu" });
  await expect(handle).toHaveClass(/inviting/);
  await handle.click();
  const welcome = page.getByRole("dialog", {
    name: "Welcome to Nook",
    exact: true,
  });
  await expect(welcome).toBeVisible();
  if (isMobile)
    await expect(
      welcome.getByText("When available, swipe sideways", { exact: false }),
    ).toBeVisible();
  else
    await expect(
      welcome.getByText("Use arrows to move", { exact: false }),
    ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("@3sln/nook:tutorial:v1")),
  ).toBe("seen");
  await page.getByRole("button", { name: "Got it", exact: true }).click();
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
        .shadowRoot.querySelector("[part=handle]")
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
  const preview = dock.locator("[part=drag-preview]");
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
  const help = page.getByRole("button", { name: "How to use Nook" });
  expect(
    await help.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
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
    const compactFilter = await root.evaluate(
      (node) => getComputedStyle(node, "::before").backdropFilter,
    );
    expect(compactFilter).toBe(fullMaterial.filter);
  }
  expect(
    await root.evaluate((node) => getComputedStyle(node, "::before").maskImage),
  ).toBe("none");
  expect(
    await root.evaluate(
      (node) => getComputedStyle(node, "::before").backdropFilter,
    ),
  ).toContain("blur(24px)");
  expect(
    await root
      .getByRole("button", { name: "Feedback", exact: true })
      .evaluate((node) => getComputedStyle(node).backgroundColor),
  ).toBe("rgba(0, 0, 0, 0)");
  expect(
    await root.evaluate(
      (node) => getComputedStyle(node, "::before").borderRadius,
    ),
  ).toBe("16px");
  expect(
    await root.evaluate((node) => getComputedStyle(node, "::before").boxShadow),
  ).not.toBe("none");
  await dock.evaluate(
    (node) => (node.disabledCorners = ["top-left", "top-right", "bottom-left"]),
  );
  const tooltip = dock.locator("[part=handle-tooltip]");
  if (!isMobile) {
    await page.getByRole("button", { name: "Close Nook menu" }).hover();
    await expect(tooltip.locator("[part=drag-hint]")).toBeHidden();
  }
  await dock.evaluate((node) => node.open("help"));
  await expect(
    page.getByRole("button", { name: "Choose a corner" }),
  ).toBeHidden();
  const handle = page.getByRole("button", { name: "Close Nook menu" });
  const box = await handle.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await expect(dock.locator("[part=drag-preview]")).toBeHidden();
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
  ).toBe("arrive");
  await dock.evaluate((node) => node.setAttribute("corner", "top-left"));
  expect(
    await dock.evaluate(
      (node) =>
        node.shadowRoot.querySelector("[part=handle]").getAnimations().length,
    ),
  ).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await dock.evaluate((node) => node.setAttribute("corner", "bottom-left"));
  expect(
    await dock.evaluate(
      (node) =>
        node.shadowRoot
          .querySelector("[part=handle]")
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
  await expect(
    picker.getByText("Quiet green for a calmer workspace"),
  ).toBeVisible();
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
        .querySelector("[part=command-search]")
        .getBoundingClientRect();
      const results = root
        .querySelector("[part=command-results]")
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
