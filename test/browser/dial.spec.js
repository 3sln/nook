import { test, expect } from "@playwright/test";
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("@3sln/nook:tutorial:v1", "seen"),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.waitForFunction(() => document.querySelector("nook-dock")?.state);
});
const dial = (page) => page.locator("[part~=swipe-dial]");

test("tap-open root choices follow an arc at corners and edge centers", async ({
  page,
}, info) => {
  for (const position of [
    "bottom-right",
    "bottom-left",
    "top-left",
    "top-right",
    "left-center",
    "right-center",
    "top-center",
    "bottom-center",
  ]) {
    await page.evaluate((position) => {
      const dock = document.querySelector("nook-dock");
      dock.setAttribute("position-policy", "all");
      dock.position = position;
      dock.open();
    }, position);
    const root = dial(page);
    await expect(root).toBeVisible();
    const geometry = await root.evaluate((el) => {
      const dock = document.querySelector("nook-dock"),
        bounds = dock.anchorRect;
      const x =
        bounds.left +
        parseFloat(el.style.getPropertyValue("--nook-dial-origin-x"));
      const y =
        bounds.top +
        parseFloat(el.style.getPropertyValue("--nook-dial-origin-y"));
      return [...el.querySelectorAll(".item")]
        .filter((button) => button.getClientRects().length)
        .map((button) => {
          const box = button.getBoundingClientRect();
          return {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            radius: Math.hypot(
              box.x + box.width / 2 - x,
              box.y + box.height / 2 - y,
            ),
          };
        });
    });
    expect(geometry.length).toBeLessThanOrEqual(6);
    expect(geometry.length).toBeGreaterThanOrEqual(2);
    const radii = geometry.map((box) => box.radius);
    expect(Math.max(...radii) - Math.min(...radii)).toBeLessThan(1);
    for (const box of geometry) {
      expect(box.width).toBeCloseTo(56, 0);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(
        page.viewportSize().width + 1,
      );
      expect(box.y + box.height).toBeLessThanOrEqual(
        page.viewportSize().height + 1,
      );
    }
    if (position === "bottom-right" || position === "right-center")
      await info.attach(`arc-${position}.png`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
  }
});

test("held picking uses the pinned choices; fast swipes never invoke extras", async ({
  page,
}) => {
  await page.evaluate(() => {
    const dock = document.querySelector("nook-dock"),
      action = document.createElement("nook-action");
    action.id = "quick-custom";
    action.setAttribute("label", "Quick custom");
    action.priority = 1000;
    dock.append(action);
    window.customPicks = 0;
    dock.addEventListener("nook-action", (e) => {
      if (e.detail.source === action) window.customPicks++;
    });
    dock.open();
  });
  const choice = dial(page).getByRole("button", {
    name: "Quick custom",
    exact: true,
  });
  await expect(choice).toBeVisible();
  const target = await choice.boundingBox();
  await choice.evaluate((el) => (window.originalDialChoice = el));
  await page.evaluate(() => document.querySelector("nook-dock").close());
  const handle = page.getByRole("button", { name: "Open Nook menu" }),
    box = await handle.boundingBox();
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  for (const [dx, dy, view] of [
    [-100, 0, "Full menu"],
    [0, -100, "Quick settings"],
    [-100, -100, "Full menu"],
  ]) {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy);
    await page.mouse.up();
    await expect(
      page.getByRole("dialog", { name: view, exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => window.customPicks)).toBe(0);
    await page.evaluate(() => document.querySelector("nook-dock").close());
  }
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(
    target.x + target.width / 2,
    target.y + target.height / 2,
  );
  await expect(dial(page)).toHaveAttribute("data-preview", "");
  expect(
    await dial(page)
      .locator('[aria-label="Quick custom"]')
      .evaluate((el) => el === window.originalDialChoice),
  ).toBe(true);
  await page.mouse.up();
  expect(await page.evaluate(() => window.customPicks)).toBe(1);
  await expect(dial(page)).toBeHidden();
});

test("Alt helper reveals labels and numbers without moving the arc", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Desktop Alt helper");
  test.skip(
    !(await page.evaluate(() =>
      Boolean(document.querySelector("nook-dock").browserKeyboardLayout),
    )),
    "Browser has not supplied layout mapping",
  );
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  const root = dial(page),
    first = root.getByRole("button", { name: "Full menu", exact: true });
  const before = await root.locator(".item:visible").evaluateAll((items) =>
    items.map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width };
    }),
  );
  await first.hover();
  await expect(first.locator("[part~=tooltip]")).toHaveCSS("opacity", "1");
  await page.keyboard.down("Alt");
  await expect(first.locator("[part~=number]")).toHaveText("1");
  await expect(first.locator(".dial-caption")).toBeVisible();
  await expect(first.locator("[part~=tooltip]")).toBeHidden();
  const after = await root.locator(".item:visible").evaluateAll((items) =>
    items.map((el) => {
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, width: b.width };
    }),
  );
  expect(after).toEqual(before);
  await page.keyboard.up("Alt");
  await expect(first.locator(".dial-caption")).toHaveCSS(
    "visibility",
    "hidden",
  );
});

test("touch labels remain readable only where captions fit", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Touch labels");
  await page.getByRole("button", { name: "Open Nook menu" }).tap();
  const root = dial(page),
    captions = root.locator(".dial-caption:visible");
  expect(await captions.count()).toBeGreaterThan(0);
  const boxes = await captions.evaluateAll((nodes) =>
    nodes.map((el) => {
      const b = el.getBoundingClientRect();
      return { left: b.left, top: b.top, right: b.right, bottom: b.bottom };
    }),
  );
  for (let i = 0; i < boxes.length; i++) {
    expect(boxes[i].left).toBeGreaterThanOrEqual(0);
    expect(boxes[i].right).toBeLessThanOrEqual(page.viewportSize().width);
    for (let j = i + 1; j < boxes.length; j++)
      expect(
        boxes[i].left >= boxes[j].right ||
          boxes[i].right <= boxes[j].left ||
          boxes[i].top >= boxes[j].bottom ||
          boxes[i].bottom <= boxes[j].top,
      ).toBe(true);
  }
});

test("tutorial is optional, has gesture graphics, and disappears only after acknowledgement", async ({
  page,
  isMobile,
}, info) => {
  await page.addInitScript(() => {
    localStorage.removeItem("@3sln/nook:tutorial:v1");
    localStorage.removeItem("@3sln/nook:attention:v1");
  });
  await page.reload();
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  const root = dial(page);
  await expect(root).toBeVisible();
  const guide = root.getByRole("button", { name: "Quick tour", exact: true });
  await expect(guide.locator("[part~=tutorial-badge]")).toBeVisible();
  await root.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Quick settings", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("@3sln/nook:tutorial:v1")),
  ).toBeNull();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  await guide.click();
  const welcome = page.getByRole("dialog", {
    name: "Quick tour",
    exact: true,
  });
  await expect(welcome).toBeVisible();
  const graphic = welcome.locator(
    `.tutorial-graphic-${isMobile ? "touch" : "keyboard"}`,
  );
  await expect(graphic).toBeVisible();
  await expect(welcome.locator(".tutorial-graphic-drag")).toBeVisible();
  const staticAnimations = await graphic.evaluate(
    (el) => el.getAnimations({ subtree: true }).length,
  );
  expect(staticAnimations).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect
    .poll(() =>
      graphic.evaluate((el) => el.getAnimations({ subtree: true }).length),
    )
    .toBeGreaterThan(0);
  await info.attach("tutorial-gestures.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  await expect(guide).toBeHidden();
  expect(
    await page.evaluate(() => localStorage.getItem("@3sln/nook:tutorial:v1")),
  ).toBe("seen");
});

test("large text keeps fitting captions clear of icons and other labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => {
    const dock = document.querySelector("nook-dock");
    dock.style.setProperty("--nook-text-xs", "20px");
    for (const item of dock.querySelectorAll("nook-item"))
      item.setAttribute(
        "label",
        "A deliberately long contextual choice that must truncate",
      );
    dock.open();
  });
  const root = dial(page);
  await expect(root).toBeVisible();
  const metrics = await root.evaluate((el) => ({
    icons: [...el.querySelectorAll(".item")]
      .filter((node) => node.getClientRects().length)
      .map((node) => {
        const b = node.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      }),
    labels: [...el.querySelectorAll(".dial-caption")]
      .filter(
        (node) =>
          node.getClientRects().length &&
          getComputedStyle(node).visibility !== "hidden",
      )
      .map((node) => {
        const b = node.getBoundingClientRect();
        return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
      }),
  }));
  const separate = (a, b) =>
    a.left >= b.right ||
    a.right <= b.left ||
    a.top >= b.bottom ||
    a.bottom <= b.top;
  for (let i = 0; i < metrics.labels.length; i++) {
    const label = metrics.labels[i];
    expect(label.left).toBeGreaterThanOrEqual(0);
    expect(label.right).toBeLessThanOrEqual(320);
    for (const icon of metrics.icons) expect(separate(label, icon)).toBe(true);
    for (let j = i + 1; j < metrics.labels.length; j++)
      expect(separate(label, metrics.labels[j])).toBe(true);
  }
});

test("fitting captions activate their own choice when tapped", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Open Nook menu" }).click();
  const settings = dial(page).getByRole("button", {
    name: "Settings",
    exact: true,
  });
  const caption = settings.locator(".dial-caption");
  await expect(caption).toBeVisible();
  await caption.click();
  await expect(
    page.getByRole("dialog", { name: "Quick settings", exact: true }),
  ).toBeVisible();
});

test("arrow navigation follows neighboring arc positions at every anchor", async ({
  page,
}) => {
  for (const position of [
    "bottom-right",
    "bottom-left",
    "top-left",
    "top-right",
    "left-center",
    "right-center",
    "top-center",
    "bottom-center",
  ]) {
    await page.evaluate((position) => {
      const dock = document.querySelector("nook-dock");
      dock.setAttribute("position-policy", "all");
      dock.position = position;
      dock.open();
    }, position);
    await expect(dial(page)).toBeVisible();
    const choices = await dial(page)
      .locator(".item")
      .evaluateAll((nodes) =>
        nodes
          .filter((node) => node.getClientRects().length)
          .sort(
            (a, b) => Number(a.dataset.dialOrder) - Number(b.dataset.dialOrder),
          )
          .map((node) => node.getAttribute("aria-label")),
      );
    const first = dial(page).getByRole("button", {
      name: choices[0],
      exact: true,
    });
    await first.focus();
    const vertical = position.startsWith("top") ? "ArrowDown" : "ArrowUp";
    const horizontal = position.includes("right") ? "ArrowLeft" : "ArrowRight";
    for (let i = 1; i < choices.length; i++) {
      await page.keyboard.press(vertical);
      await expect(
        dial(page).getByRole("button", { name: choices[i], exact: true }),
      ).toBeFocused();
    }
    await page.keyboard.press(vertical);
    await expect(
      dial(page).getByRole("button", { name: choices.at(-1), exact: true }),
    ).toBeFocused();
    for (let i = choices.length - 2; i >= 0; i--) {
      await page.keyboard.press(horizontal);
      await expect(
        dial(page).getByRole("button", { name: choices[i], exact: true }),
      ).toBeFocused();
    }
    await page.keyboard.press("Tab");
    await expect(
      dial(page).getByRole("button", { name: choices[1], exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
  }
});

test("panel backdrops match the dial in light and dark schemes", async ({
  page,
  isMobile,
}) => {
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme });
    await page.locator("nook-dock").evaluate((dock) => {
      dock.style.colorScheme = "normal";
      dock.style.setProperty("--nook-color-scheme", "light dark");
      dock.open();
    });
    const material = async (locator) =>
      locator.evaluate((node, isMobile) => {
        const pseudo =
          node.dataset.view === "root" ||
          node.dataset.presentation === "compact" ||
          isMobile;
        const style = getComputedStyle(node, pseudo ? "::before" : null);
        return {
          background: style.backgroundColor,
          blur: style.backdropFilter.replace(/ saturate\(1\)/g, ""),
        };
      }, isMobile);
    const expected = await material(dial(page));
    expect(expected.blur).toBe("blur(3px)");
    for (const view of ["all", "settings", "commands", "feedback"]) {
      await page
        .locator("nook-dock")
        .evaluate((dock, view) => dock.open(view), view);
      const panel = page.locator(`.surface[data-view="${view}"]`);
      await expect(panel).toBeVisible();
      expect(await material(panel)).toEqual(expected);
    }
  }
});
