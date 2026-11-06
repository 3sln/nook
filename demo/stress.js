import { icon } from "../src/ui/icons.js";
export const longToken = "UnbrokenIdentifier".repeat(14);
const longLabel =
  "A deliberately long label for reviewing collaboration, accessibility, and publishing preferences across the whole workspace";
const description =
  "Supporting information should remain readable, wrap naturally, and leave the control reachable. ";
export function populateStress(
  dock,
  scenario = "mixed",
  { captureScreenshot } = {},
) {
  dock.close();
  dock.priorities = { settings: 2000, commands: 1900, feedback: 1800 };
  dock.feedback =
    scenario === "mixed" || scenario === "feedback"
      ? {
          submit: async (report) => {
            dock.lastFeedback = report;
          },
          attachFiles: async (files) => files,
          captureScreenshot,
          types: [
            { value: "bug", label: "Bug report" },
            {
              value: "ui",
              label:
                "UI and accessibility improvements with an unusually long category name",
            },
          ],
          successMessage: "Saved in this browser demo. Nothing was sent.",
        }
      : false;
  const fragment = document.createDocumentFragment();
  const add = (tag, attributes, parent = fragment) => {
    const element = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes))
      element.setAttribute(name, String(value));
    parent.append(element);
    return element;
  };
  const label = (i) =>
    i % 4 === 0
      ? longLabel
      : i % 4 === 1
        ? longToken
        : i % 4 === 2
          ? "日本語の長いラベルと設定項目 · العربية وإعدادات مساحة العمل · Accessibility"
          : `Item ${i + 1} — ${description}`;
  const withIcon = (element, name = "file") => {
    const template = document.createElement("template");
    template.slot = "icon";
    template.innerHTML = icon(name);
    element.append(template);
  };
  const actionCount = scenario === "actions" || scenario === "mixed" ? 80 : 0;
  for (let i = 0; i < actionCount; i++) {
    const action = add("nook-action", {
      id: `stress-action-${i}`,
      label: label(i),
      priority: 100 - i,
      group:
        i % 3 === 0
          ? "Workspace"
          : i % 3 === 1
            ? longToken
            : "Sharing and publication",
    });
    withIcon(action);
  }
  const settingCount =
    scenario === "settings" || scenario === "mixed"
      ? 40
      : scenario === "root-setting"
        ? 1
        : 0;
  for (let i = 0; i < settingCount; i++) {
    const type =
      scenario === "root-setting"
        ? "enum"
        : ["toggle", "text", "range", "enum", "number"][i % 5];
    const setting = add("nook-setting", {
      id: `stress-setting-${i}`,
      label: label(i),
      description: description.repeat(2) + (i % 2 ? longToken : ""),
      type,
      value:
        type === "toggle"
          ? "false"
          : type === "enum"
            ? "option-0"
            : type === "text"
              ? longToken
              : "50",
    });
    if (scenario === "root-setting") setting.root = true;
    if (type === "range" || type === "number") {
      setting.setAttribute("min", "0");
      setting.setAttribute("max", "100");
    }
    if (type === "enum")
      for (let j = 0; j < 60; j++) {
        const option = add(
          "nook-option",
          {
            value: `option-${j}`,
            label: `Choice ${j + 1}: ${label(j)}`,
            description: description + (j % 2 ? longToken : ""),
          },
          setting,
        );
        withIcon(option, "info");
      }
  }
  const commandCount = scenario === "commands" || scenario === "mixed" ? 35 : 0;
  for (let i = 0; i < commandCount; i++) {
    const command = add("nook-command", {
      id: `stress-command-${i}`,
      name: `Command ${i + 1}: ${label(i)}`,
      description: description.repeat(2) + longToken,
      keybind: "Ctrl+Meta+Shift+F12",
    });
    add(
      "nook-arg",
      {
        name: "title",
        label: longLabel,
        description: longToken,
        value: "Draft",
        required: "",
      },
      command,
    );
  }
  if (scenario === "actions" || scenario === "mixed") {
    const menu = add("nook-menu", {
      id: "stress-menu",
      label: longToken,
      group: "Nested menus",
      priority: -100,
    });
    withIcon(menu, "folder");
    for (let i = 0; i < 12; i++) {
      const action = add("nook-action", { label: label(i) }, menu);
      withIcon(action);
    }
    const inner = add("nook-menu", { label: longLabel }, menu);
    withIcon(inner, "folder");
    const panel = add(
      "nook-panel",
      { id: "stress-panel", label: longToken },
      inner,
    );
    withIcon(panel, "text");
    const template = document.createElement("template");
    template.slot = "content";
    const p = document.createElement("p");
    p.textContent = description.repeat(10) + longToken;
    template.content.append(p);
    panel.append(template);
  }
  dock.replaceChildren(fragment);
  dock.dataset.scenario = scenario;
  return {
    actions: actionCount,
    settings: settingCount,
    commands: commandCount,
  };
}
