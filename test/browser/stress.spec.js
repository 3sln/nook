import { test, expect } from "@playwright/test";
const dockSelector = "nook-dock";
async function scenario(page, name, view) {
  await page.getByRole("button", { name, exact: true }).click();
  await page.evaluate(
    (view) => document.querySelector("nook-dock").open(view),
    view,
  );
}
async function insideViewport(page, locator) {
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}
async function noHorizontalScroll(locator) {
  expect(
    await locator.evaluate((node) => node.scrollWidth - node.clientWidth),
  ).toBeLessThanOrEqual(2);
}
async function cappedText(locator, lines) {
  const metrics = await locator.evaluate((node) => ({
    height: node.getBoundingClientRect().height,
    lineHeight: parseFloat(getComputedStyle(node).lineHeight),
    text: node.textContent,
  }));
  expect(metrics.height).toBeLessThanOrEqual(metrics.lineHeight * lines + 2);
  expect(metrics.text.length).toBeGreaterThan(0);
}
async function shot(page, testInfo, name) {
  await testInfo.attach(name, {
    body: await page.screenshot(),
    contentType: "image/png",
  });
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("@3sln/nook:tutorial:v1", "seen"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/nook/demo/stress.html");
  await page.waitForFunction(
    () => document.querySelector("nook-dock")?.records.size > 50,
  );
});

test("stress: eighty actions, long groups, and every permitted anchor", async ({
  page,
  isMobile,
}, testInfo) => {
  await scenario(page, "80 actions", "overflow");
  const more = page.getByRole("dialog", { name: "More", exact: true });
  const available = await page.evaluate(
    () => document.querySelector("nook-dock").availablePositions,
  );
  for (const position of available) {
    await page.evaluate(
      (position) => (document.querySelector("nook-dock").position = position),
      position,
    );
    await insideViewport(page, more);
    await noHorizontalScroll(more.locator("[part=body]"));
  }
  const longToken = await page.evaluate(() =>
    document.querySelector("#stress-action-1").getAttribute("label"),
  );
  const longItem = more
    .getByRole("button", { name: longToken, exact: true })
    .first();
  await cappedText(longItem.locator("[part=item-label]"), 3);
  await expect(longItem).toHaveAccessibleName(longToken);
  const last = await page.evaluate(() =>
    document.querySelector("#stress-action-79").getAttribute("label"),
  );
  await more
    .getByRole("button", { name: last, exact: true })
    .scrollIntoViewIfNeeded();
  await insideViewport(page, more.locator("[part=header]"));
  if (isMobile)
    await expect(
      more.getByRole("button", { name: "Close menu", exact: true }),
    ).toBeInViewport();
  await shot(page, testInfo, "dense-overflow.png");
  await more.getByRole("button", { name: last, exact: true }).click();
  await expect(page.locator("#status")).toContainText("stress-action-79");
});

test("stress: forty settings keep the final control and close affordance reachable", async ({
  page,
  isMobile,
}, testInfo) => {
  await scenario(page, "40 settings", "settings");
  const settings = page.getByRole("dialog", {
    name: "Quick settings",
    exact: true,
  });
  const rows = settings.locator("[part=setting]");
  await expect(rows).toHaveCount(40);
  await insideViewport(page, settings);
  await noHorizontalScroll(settings.locator("[part=body]"));
  const last = rows.last().locator("input");
  await last.fill("73");
  await expect(page.locator("#stress-setting-39")).toHaveAttribute(
    "value",
    "73",
  );
  await expect(last).toBeInViewport();
  await insideViewport(page, settings.locator("[part=header]"));
  if (isMobile)
    await expect(
      settings.getByRole("button", { name: "Close menu", exact: true }),
    ).toBeInViewport();
  await shot(page, testInfo, "dense-settings-last-control.png");
  // Drive focus wrapping rather than relying on an element merely existing.
  await last.focus();
  await page.keyboard.press("Tab");
  expect(
    await page.evaluate(
      () =>
        document
          .querySelector("nook-dock")
          .shadowRoot.activeElement?.closest("[role=dialog]")?.hidden,
    ),
  ).toBe(false);
  await page.evaluate(() => {
    const dock = document.querySelector("nook-dock");
    window.stressLastControl =
      dock.querySelector("#stress-setting-39")._control;
    const setting = document.createElement("nook-setting");
    setting.setAttribute("label", "New setting while open");
    dock.append(setting);
  });
  await expect(rows).toHaveCount(41);
  expect(
    await page.evaluate(
      () =>
        document.querySelector("#stress-setting-39")._control ===
        window.stressLastControl,
    ),
  ).toBe(true);
});

test("stress: sixty rich enum options wrap and the last choice can be selected", async ({
  page,
}, testInfo) => {
  await scenario(page, "40 settings", "settings");
  const settings = page.getByRole("dialog", {
    name: "Quick settings",
    exact: true,
  });
  await settings
    .locator("[part=setting]")
    .nth(3)
    .locator('[part~="enum-trigger"]')
    .click();
  const list = page.getByRole("listbox");
  await expect(list.getByRole("option")).toHaveCount(60);
  await noHorizontalScroll(list);
  await cappedText(list.locator("[part=enum-option-label]").first(), 3);
  await cappedText(list.locator("[part=enum-option-description]").first(), 3);
  const last = list.getByRole("option").last();
  await last.scrollIntoViewIfNeeded();
  await shot(page, testInfo, "rich-enum-long-options.png");
  await last.click();
  await expect(page.locator("#stress-setting-3")).toHaveAttribute(
    "value",
    "option-59",
  );
  await expect(settings).toBeVisible();
});

test("stress: command search stays fixed with long names, descriptions, and keybindings", async ({
  page,
}, testInfo) => {
  await scenario(page, "35 commands", "commands");
  const palette = page.getByRole("dialog", { name: "Commands", exact: true });
  await insideViewport(page, palette);
  await noHorizontalScroll(palette.locator("[part=body]"));
  await noHorizontalScroll(palette.locator("[part=command-results]"));
  await cappedText(palette.locator("[part=command-name]:visible").first(), 2);
  await cappedText(
    palette.locator("[part=command-description]:visible").first(),
    3,
  );
  const search = page.getByRole("searchbox", { name: "Search commands" });
  const before = await search.boundingBox();
  await search.fill("Command 35:");
  await expect(palette.locator("[part=command-result]:visible")).toHaveCount(1);
  await expect
    .poll(async () => Math.abs((await search.boundingBox()).y - before.y))
    .toBeLessThan(1);
  await shot(page, testInfo, "command-search-long-content.png");
  await page.keyboard.press("Enter");
  const args = page
    .locator("nook-dock")
    .locator('.surface[data-view="command"]:visible');
  await insideViewport(page, args);
  await noHorizontalScroll(args.locator("[part=body]"));
  await args.getByRole("button", { name: "Run command", exact: true }).click();
  await expect(args).toBeHidden();
});

test("stress: long submenu labels use readable rows and long panel headings stay bounded", async ({
  page,
}, testInfo) => {
  await scenario(page, "80 actions", "overflow");
  const title = await page.evaluate(() =>
    document.querySelector("#stress-menu").getAttribute("label"),
  );
  await page
    .getByRole("dialog", { name: "More", exact: true })
    .getByRole("button", { name: title, exact: true })
    .last()
    .click();
  const menu = page.getByRole("dialog", { name: title, exact: true });
  await expect(menu).toHaveAttribute("data-layout", "list");
  await insideViewport(page, menu);
  await noHorizontalScroll(menu.locator("[part=body]"));
  await shot(page, testInfo, "long-submenu-labels.png");
  await page.evaluate(() =>
    document
      .querySelector("nook-dock")
      .open(document.querySelector("#stress-panel")),
  );
  const panel = page
    .locator("nook-dock")
    .locator('.surface[data-view="panel"]:visible');
  await insideViewport(page, panel);
  await noHorizontalScroll(panel.locator("[part=body]"));
  await cappedText(panel.locator("[part=heading]"), 4);
  const bounds = await panel.locator("[part=header]").boundingBox();
  expect(bounds.height).toBeLessThan(page.viewportSize().height / 2);
  await shot(page, testInfo, "bounded-panel-heading.png");
});

test("stress: root setting, large text, and a narrow viewport avoid horizontal clipping", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 280, height: 568 });
  await page
    .getByRole("button", { name: "Long root setting", exact: true })
    .click();
  await page.getByRole("button", { name: "Large text", exact: true }).click();
  await page.evaluate(() => document.querySelector("nook-dock").open());
  const root = page.getByRole("dialog", { name: "Nook", exact: true });
  await insideViewport(page, root);
  await noHorizontalScroll(root.locator("[part=body]"));
  await cappedText(root.locator("[part=setting-name]"), 3);
  await cappedText(root.locator("[part=description]"), 3);
  const trigger = root.locator('[part~="enum-trigger"]');
  await trigger.scrollIntoViewIfNeeded();
  await expect(trigger).toBeInViewport();
  await shot(page, testInfo, "narrow-large-type-root-setting.png");
  await trigger.click();
  await noHorizontalScroll(page.getByRole("listbox"));
});

test("stress: feedback supports long categories, filenames, and large type", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await scenario(page, "Feedback", "feedback");
  const feedback = page.getByRole("dialog", { name: "Feedback", exact: true });
  await feedback.locator("[part=feedback-file-input]").setInputFiles({
    name: "Screenshot_" + "long_name_".repeat(15) + ".png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aN8sAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await expect(feedback.locator("[part=feedback-attachment]")).toHaveCount(1);
  await cappedText(feedback.locator("[part=feedback-attachment-name]"), 2);
  await feedback
    .getByRole("textbox", { name: "Tell us more" })
    .fill("A detailed report with a screenshot");
  await insideViewport(page, feedback);
  await noHorizontalScroll(feedback.locator("[part=body]"));
  await shot(page, testInfo, "feedback-long-attachment.png");
  await feedback
    .getByRole("button", { name: "Send feedback", exact: true })
    .click();
  await expect(
    feedback.getByText("Saved in this browser demo. Nothing was sent."),
  ).toBeVisible();
});

test("stress: portrait/landscape changes restore preference without treating keyboard resize as rotation", async ({
  page,
  isMobile,
}, testInfo) => {
  test.skip(!isMobile, "Touch viewport policy");
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(
    () => (document.querySelector("nook-dock").position = "top-center"),
  );
  await expect(page.locator(dockSelector)).toHaveAttribute(
    "position",
    "top-center",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(dockSelector)).toHaveAttribute(
    "position",
    "top-left",
  );
  expect(
    await page.evaluate(
      () => document.querySelector("nook-dock").preferredPosition,
    ),
  ).toBe("top-center");
  await scenario(page, "40 settings", "settings");
  const text = page
    .getByRole("dialog", { name: "Quick settings", exact: true })
    .locator("[part=setting]")
    .nth(1)
    .locator("input");
  await text.fill("Keep this draft during rotation");
  await page.setViewportSize({ width: 390, height: 300 });
  expect(
    await page.evaluate(() =>
      document
        .querySelector("nook-dock")
        .availablePositions.includes("top-center"),
    ),
  ).toBe(false);
  await expect(page.locator(dockSelector)).toHaveAttribute(
    "position",
    "top-left",
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(dockSelector)).toHaveAttribute(
    "position",
    "top-center",
  );
  await expect(text).toHaveValue("Keep this draft during rotation");
  await shot(page, testInfo, "landscape-restored-preference.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(
    () => (document.querySelector("nook-dock").position = "top-left"),
  );
  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator(dockSelector)).toHaveAttribute(
    "position",
    "top-left",
  );
});

test("stress: full settings link stays reachable after a dense list", async ({
  page,
}) => {
  await scenario(page, "40 settings", "settings");
  await page.evaluate(
    () =>
      (document.querySelector("nook-dock").settingsHref = "/account/settings"),
  );
  const settings = page.getByRole("dialog", {
    name: "Quick settings",
    exact: true,
  });
  const link = settings.getByRole("link", {
    name: "All settings",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", "/account/settings");
  await link.scrollIntoViewIfNeeded();
  await insideViewport(page, link);
  await noHorizontalScroll(settings.locator("[part=body]"));
  await link.focus();
  await expect(link).toBeFocused();
  await page.evaluate(
    () => (document.querySelector("nook-dock").settingsHref = ""),
  );
  await expect(link).toBeHidden();
  await expect(settings).toBeVisible();
});

test("stress: capture is wired in both feedback scenarios and stays compact until previews open", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getDisplayMedia() {
          throw new Error("This test must not open a native sharing prompt");
        },
      },
    });
  });
  await page.goto("/nook/demo/stress.html");
  await page.waitForFunction(() => document.querySelector("nook-dock")?.state);
  for (const name of ["Everything", "Feedback"]) {
    await page.getByRole("button", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () =>
          typeof document.querySelector("nook-dock").feedback.captureScreenshot,
      ),
    ).toBe("function");
    await page.evaluate(() => {
      const dock = document.querySelector("nook-dock");
      dock.feedback = {
        ...dock.feedback,
        captureScreenshot: async () =>
          new File(
            [
              '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="purple"/></svg>',
            ],
            "snapshot.svg",
            { type: "image/svg+xml" },
          ),
      };
      dock.open("feedback");
    });
    await page
      .getByRole("button", { name: "Capture app view", exact: true })
      .click();
    const session = page.locator("[part=capture-session]");
    const count = session.locator("[part=capture-count]");
    await expect(session).toBeVisible();
    const compact = async () => {
      const box = await session.boundingBox();
      expect(box.height).toBeLessThanOrEqual(64);
      expect(box.width).toBeLessThanOrEqual(300);
      await insideViewport(page, session);
    };
    await compact();
    await expect(count).toHaveText("0");
    for (const shots of [1, 2]) {
      await session
        .getByRole("button", { name: "Capture", exact: true })
        .click();
      await expect(count).toHaveText(String(shots));
      await expect(session.locator("[part=capture-gallery]")).toBeHidden();
      await compact();
    }
    const review = session.getByRole("button", {
      name: "2 snapshots",
      exact: true,
    });
    await review.click();
    await expect(session.locator("[part=capture-gallery]")).toBeVisible();
    await review.click();
    await compact();
    await session.getByRole("button", { name: "Done", exact: true }).click();
    await expect(session).toBeHidden();
    await expect(
      page.getByRole("dialog", { name: "Feedback", exact: true }),
    ).toBeVisible();
    await page.evaluate(() => document.querySelector("nook-dock").close());
  }
});
