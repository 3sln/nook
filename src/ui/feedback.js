import { icon } from "./icons.js";
export default function feedback({ view, make, dock, getHooks, signal }) {
  const form = make("form", "feedback-form");
  form.className = "feedback-form";
  const intro = make("p", "feedback-intro", "What could be better?");
  intro.className = "feedback-intro";
  const kinds = make("div", "feedback-types");
  kinds.className = "feedback-types";
  kinds.setAttribute("role", "radiogroup");
  kinds.setAttribute("aria-label", "Feedback type");
  const kind = make("input");
  kind.type = "hidden";
  kind.name = "type";
  kind.value = "bug";
  const label = make("label", "feedback-label", "Tell us more");
  label.className = "feedback-label";
  const text = make("textarea", "feedback-message");
  text.name = "message";
  text.required = true;
  text.rows = 5;
  text.placeholder = "What happened, or what would you like to see?";
  label.append(text);
  const tools = make("div", "feedback-tools");
  tools.className = "feedback-tools";
  const files = make("input", "feedback-file-input");
  files.type = "file";
  files.multiple = true;
  files.hidden = true;
  const attach = make("button", "feedback-attach", "Attach files");
  attach.type = "button";
  const capture = make("button", "feedback-capture", "Capture app view");
  capture.type = "button";
  tools.append(attach, capture, files);
  const list = make("ul", "feedback-attachments");
  list.className = "feedback-attachments";
  const privacy = make("p", "feedback-privacy");
  privacy.className = "feedback-privacy";
  privacy.textContent =
    "App context is included. Attachments are sent only when you submit; capturing the app excludes Nook.";
  const status = make("p", "feedback-status");
  status.className = "feedback-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const submit = make("button", "feedback-send", "Send feedback");
  submit.type = "submit";
  submit.className = "command-run";
  const success = make("div", "feedback-success");
  success.className = "feedback-success";
  success.hidden = true;
  success.append(
    make("h3", null, "Thank you for the feedback."),
    make("p", null, "Your feedback has been sent."),
  );
  const another = make("button", "feedback-another", "Send another");
  another.type = "button";
  another.className = "quiet";
  const done = make("button", "feedback-done", "Done");
  done.type = "button";
  done.className = "command-run";
  success.append(another, done);
  form.append(intro, kinds, kind, label, tools, list, privacy, submit);
  view.body.append(form, status, success);
  const entries = [];
  const typeButtons = new Map();
  const operations = new Set();
  let busy = false;
  let enabled = false;
  let captureOwner = null;
  let signature = "";
  const setStatus = (message, error = false) => {
    status.textContent = message;
    status.dataset.error = String(error);
    status.setAttribute("role", error ? "alert" : "status");
  };
  const setBusy = (value) => {
    busy = value;
    form.setAttribute("aria-busy", String(value));
    text.disabled = value;
    submit.disabled = value;
    submit.textContent = value ? "Sending…" : "Send feedback";
    attach.disabled = value;
    capture.disabled = value;
    for (const button of typeButtons.values()) button.disabled = value;
    for (const button of list.querySelectorAll("button"))
      button.disabled = value;
  };
  const operation = async (task) => {
    if (busy || signal.aborted) return;
    const controller = new AbortController();
    operations.add(controller);
    const abort = () => controller.abort();
    signal.addEventListener("abort", abort, { once: true });
    try {
      return await task(controller.signal);
    } finally {
      operations.delete(controller);
      signal.removeEventListener("abort", abort);
    }
  };
  const clear = () => {
    for (const entry of entries) if (entry.url) URL.revokeObjectURL(entry.url);
    entries.length = 0;
    list.replaceChildren();
  };
  const add = (values, category) => {
    for (const value of Array.isArray(values) ? values : [values]) {
      if (!value) continue;
      const cfg = getHooks();
      if (entries.length >= (cfg.maxFiles ?? 5))
        throw new Error(`You can attach up to ${cfg.maxFiles ?? 5} files.`);
      if (value.size > (cfg.maxFileBytes ?? 10 * 1024 * 1024))
        throw new Error("That attachment is too large.");
      const row = make("li", "feedback-attachment");
      row.className = "feedback-attachment";
      const name =
        value.name ||
        (category === "screenshot" ? "App screenshot" : "Attachment");
      let url;
      if (
        value instanceof Blob &&
        value.type.startsWith("image/") &&
        URL.createObjectURL
      ) {
        url = URL.createObjectURL(value);
        const image = make("img", "feedback-preview");
        image.src = url;
        image.alt = "";
        row.append(image);
      }
      const caption = make("span", "feedback-attachment-name", name);
      const remove = make("button", "feedback-remove");
      remove.type = "button";
      remove.innerHTML = icon("close");
      remove.setAttribute("aria-label", `Remove ${name}`);
      const entry = { value, category, row, url };
      remove.onclick = () => {
        if (busy) return;
        const index = entries.indexOf(entry);
        if (index >= 0) entries.splice(index, 1);
        if (url) URL.revokeObjectURL(url);
        row.remove();
      };
      row.append(caption, remove);
      entries.push(entry);
      list.append(row);
    }
  };
  attach.onclick = () => files.click();
  files.onchange = () =>
    operation(async (opSignal) => {
      const chosen = [...files.files];
      files.value = "";
      if (!chosen.length) return;
      const cfg = getHooks();
      if (typeof cfg.attachFiles !== "function") return;
      setBusy(true);
      submit.textContent = "Preparing attachments…";
      setStatus("");
      try {
        const prepared = await cfg.attachFiles(chosen, { signal: opSignal });
        if (!opSignal.aborted) add(prepared ?? chosen, "file");
      } catch (error) {
        if (!opSignal.aborted)
          setStatus(error.message || "Could not attach those files.", true);
      } finally {
        if (!opSignal.aborted) setBusy(false);
      }
    });
  capture.onclick = () =>
    operation(async (opSignal) => {
      const cfg = getHooks();
      if (typeof cfg.captureScreenshot !== "function") return;
      setBusy(true);
      submit.textContent = "Capturing…";
      setStatus("");
      captureOwner = opSignal;
      dock.setAttribute("data-nook-capturing", "");
      try {
        // Invoke synchronously from the click to retain browser user activation.
        const value = await cfg.captureScreenshot({
          root: cfg.root || dock.ownerDocument.documentElement,
          exclude: [dock],
          signal: opSignal,
        });
        if (!opSignal.aborted && value) add(value, "screenshot");
      } catch (error) {
        if (!opSignal.aborted)
          setStatus(error.message || "Could not capture the app view.", true);
      } finally {
        if (captureOwner === opSignal) {
          captureOwner = null;
          dock.removeAttribute("data-nook-capturing");
        }
        if (!opSignal.aborted) setBusy(false);
      }
    });
  form.onsubmit = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy || !form.reportValidity()) return;
    if (!text.value.trim()) {
      setStatus("Please describe your feedback.", true);
      text.focus();
      return;
    }
    void operation(async (opSignal) => {
      const cfg = getHooks();
      if (typeof cfg.submit !== "function") return;
      setBusy(true);
      setStatus("");
      try {
        await cfg.submit(
          {
            type: kind.value,
            message: text.value.trim(),
            attachments: entries.map((entry) => ({
              kind: entry.category,
              file: entry.value,
            })),
            context: dock.context,
          },
          { signal: opSignal },
        );
        if (opSignal.aborted) return;
        form.hidden = true;
        success.hidden = false;
        done.focus();
        clear();
      } catch (error) {
        if (!opSignal.aborted)
          setStatus(
            error.message ||
              "Could not send feedback. Your draft is still here.",
            true,
          );
      } finally {
        if (!opSignal.aborted) setBusy(false);
      }
    });
  };
  another.onclick = () => {
    form.reset();
    kind.value = "bug";
    form.hidden = false;
    success.hidden = true;
    setStatus("");
    reconcile();
    text.focus();
  };
  done.onclick = () => dock.close();
  kinds.onkeydown = (event) => {
    if (
      ![
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ].includes(event.key)
    )
      return;
    event.preventDefault();
    event.stopPropagation();
    const buttons = [...typeButtons.values()];
    const current = buttons.findIndex(
      (button) => button.getAttribute("aria-checked") === "true",
    );
    const index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current +
              (["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 1) +
              buttons.length) %
            buttons.length;
    buttons[index]?.click();
    buttons[index]?.focus();
  };
  function reconcile() {
    const cfg = getHooks() || {};
    const types = cfg.types || [
      { value: "bug", label: "Bug report" },
      { value: "ui", label: "UI / usability" },
      { value: "feature", label: "Feature request" },
      { value: "other", label: "Other" },
    ];
    const next = JSON.stringify(types);
    if (next !== signature) {
      kinds.replaceChildren();
      typeButtons.clear();
      for (const type of types) {
        const button = make("button", "feedback-type", type.label);
        button.type = "button";
        button.setAttribute("role", "radio");
        button.onclick = () => {
          kind.value = type.value;
          updateTypes();
        };
        typeButtons.set(type.value, button);
        kinds.append(button);
      }
      signature = next;
    }
    if (!typeButtons.has(kind.value)) kind.value = types[0]?.value || "other";
    updateTypes();
    success.querySelector("p").textContent =
      cfg.successMessage || "Your feedback has been sent.";
    attach.hidden = typeof cfg.attachFiles !== "function";
    capture.hidden = typeof cfg.captureScreenshot !== "function";
    files.accept = cfg.accept || "";
    tools.hidden = attach.hidden && capture.hidden;
    privacy.hidden = tools.hidden && entries.length === 0;
  }
  function updateTypes() {
    for (const [value, button] of typeButtons) {
      const selected = value === kind.value;
      button.setAttribute("aria-checked", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
  }
  function disable() {
    for (const controller of operations) controller.abort();
    operations.clear();
    clear();
    captureOwner = null;
    dock.removeAttribute("data-nook-capturing");
    setBusy(false);
    text.value = "";
    form.hidden = false;
    success.hidden = true;
    setStatus("");
  }
  function dispose() {
    disable();
    form.remove();
    status.remove();
    success.remove();
  }
  signal.addEventListener("abort", dispose, { once: true });
  return {
    reconcile,
    dispose,
    form,
    status,
    setEnabled(value) {
      if (enabled && !value) disable();
      enabled = value;
    },
  };
}
