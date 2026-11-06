import { icon } from "./icons.js";
export default function feedback({ view, make, i18n, dock, getHooks, signal }) {
  const form = make("form", "feedback-form");
  form.className = "feedback-form";
  const intro = make("p", "feedback-intro", "What could be better?");
  intro.className = "feedback-intro";
  const kinds = make("div", "feedback-types");
  kinds.className = "feedback-types";
  kinds.setAttribute("role", "radiogroup");
  i18n.attr(kinds, "aria-label", "Feedback type");
  const kind = make("input");
  kind.type = "hidden";
  kind.name = "type";
  kind.value = "bug";
  const label = make("label", "feedback-label");
  label.append(make("span", "feedback-message-label", "Tell us more"));
  label.className = "feedback-label";
  const text = make("textarea", "feedback-message");
  text.name = "message";
  text.required = true;
  text.rows = 5;
  i18n.attr(
    text,
    "placeholder",
    "What happened, or what would you like to see?",
  );
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
  i18n.text(
    privacy,
    "App context is included. Attachments are sent only when you submit; capturing the app excludes Nook.",
  );
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
    make("h3", "feedback-success-heading", "Thank you for the feedback."),
    make("p", "feedback-success-message", "Your feedback has been sent."),
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
  const sessionUI = make("section", "capture-session");
  sessionUI.className = "capture-session";
  sessionUI.hidden = true;
  i18n.attr(sessionUI, "aria-label", "Screenshot session");
  const controls = make("div", "capture-controls");
  controls.className = "capture-controls";
  const shutter = make("button", "capture-snapshot", "Capture");
  shutter.type = "button";
  shutter.className = "command-run";
  const captureDone = make("button", "capture-done", "Done");
  captureDone.type = "button";
  captureDone.className = "quiet";
  const review = make("button", "capture-review");
  review.type = "button";
  review.className = "quiet";
  review.setAttribute("aria-expanded", "false");
  const reviewIcon = make("span", "capture-review-icon");
  reviewIcon.innerHTML = icon("image");
  const count = make("span", "capture-count");
  review.append(reviewIcon, count);
  const captureStatus = make("p", "capture-status");
  captureStatus.setAttribute("role", "status");
  captureStatus.className = "capture-status";
  const gallery = make("div", "capture-gallery");
  gallery.className = "capture-gallery";
  gallery.hidden = true;
  const largePreview = make("img", "capture-preview-image");
  largePreview.className = "capture-preview-image";
  largePreview.hidden = true;
  largePreview.alt = "";
  const previewEmpty = make(
    "p",
    "capture-preview-empty",
    "Preview unavailable for this attachment.",
  );
  previewEmpty.hidden = true;
  const thumbnails = make("div", "capture-thumbnails");
  thumbnails.className = "capture-thumbnails";
  const hidePreviews = make("button", "capture-hide-previews", "Hide previews");
  hidePreviews.type = "button";
  hidePreviews.className = "quiet";
  const collapsePreviews = () => {
    gallery.hidden = true;
    review.setAttribute("aria-expanded", "false");
    review.focus();
  };
  hidePreviews.onclick = collapsePreviews;
  gallery.append(hidePreviews, largePreview, previewEmpty, thumbnails);
  controls.append(shutter, review, captureDone);
  sessionUI.append(controls, captureStatus, gallery);
  (dock.overlayAnchor || dock.anchor).append(sessionUI);
  const previews = new Map();
  let mode = null,
    selected = null;
  const screenshots = () =>
    entries.filter((entry) => entry.category === "screenshot");
  function removeEntry(entry) {
    const index = entries.indexOf(entry);
    if (index < 0) return;
    entries.splice(index, 1);
    entry.row.remove();
    if (entry.url) URL.revokeObjectURL(entry.url);
    if (selected === entry) selected = null;
    updateCapture();
  }
  function updateCapture() {
    const shots = screenshots();
    if (!shots.length) {
      gallery.hidden = true;
      review.setAttribute("aria-expanded", "false");
    }
    i18n.text(count, "{#}", { count: shots.length });
    i18n.attr(
      review,
      "aria-label",
      "{#} snapshots",
      { count: shots.length },
      "{#} snapshot",
    );
    review.disabled = !shots.length;
    shutter.disabled = busy || entries.length >= (getHooks()?.maxFiles ?? 5);
    if (!mode) return;
    const wanted = new Set(shots);
    for (const [entry, tile] of previews)
      if (!wanted.has(entry)) {
        tile.el.remove();
        previews.delete(entry);
      }
    if (!selected || !wanted.has(selected)) selected = shots[0] || null;
    let cursor = thumbnails.firstChild;
    shots.forEach((entry, index) => {
      let tile = previews.get(entry);
      if (!tile) {
        const el = make("div", "capture-thumbnail");
        el.className = "capture-thumbnail";
        const open = make("button", "capture-preview");
        open.type = "button";
        if (entry.url) {
          const image = make("img", "capture-thumbnail-image");
          image.src = entry.url;
          image.alt = "";
          open.append(image);
        }
        const label = make("span", "capture-thumbnail-label");
        open.append(label);
        const remove = make("button", "capture-remove", "Remove");
        remove.type = "button";
        remove.onclick = () => {
          if (!busy) removeEntry(entry);
        };
        open.onclick = () => {
          selected = entry;
          updateCapture();
        };
        el.append(open, remove);
        tile = { el, open, remove, label };
        previews.set(entry, tile);
      }
      i18n.text(tile.label, "Snapshot {#}", { count: index + 1 });
      i18n.attr(tile.open, "aria-label", "View snapshot {#}", {
        count: index + 1,
      });
      i18n.attr(tile.remove, "aria-label", "Remove snapshot {#}", {
        count: index + 1,
      });
      tile.remove.disabled = busy;
      tile.open.setAttribute("aria-pressed", String(selected === entry));
      if (tile.el !== cursor) thumbnails.insertBefore(tile.el, cursor);
      cursor = tile.el.nextSibling;
    });
    if (!selected || !wanted.has(selected)) selected = shots[0] || null;
    largePreview.hidden = !selected?.url;
    previewEmpty.hidden = !selected || Boolean(selected.url);
    if (selected?.url) largePreview.src = selected.url;
    else largePreview.removeAttribute("src");
  }
  function finishCapture(restore = true) {
    if (!mode) return;
    const old = mode;
    mode = null;
    old.abort();
    captureOwner = null;
    dock.removeAttribute("data-nook-capturing");
    dock.removeAttribute("data-capture-mode");
    sessionUI.hidden = true;
    gallery.hidden = true;
    review.setAttribute("aria-expanded", "false");
    setBusy(false);
    if (restore && enabled && dock.isConnected) {
      dock.open("feedback");
      queueMicrotask(() => capture.focus());
    }
  }
  function startCapture() {
    if (busy || mode || typeof getHooks()?.captureScreenshot !== "function")
      return;
    mode = new AbortController();
    dock.close();
    dock.setAttribute("data-capture-mode", "");
    sessionUI.hidden = false;
    captureStatus.dataset.error = "false";
    i18n.text(captureStatus, "");
    updateCapture();
    shutter.focus();
  }
  shutter.onclick = async () => {
    if (!mode || busy) return;
    const cfg = getHooks();
    if (typeof cfg?.captureScreenshot !== "function") return;
    const current = mode;
    setBusy(true);
    captureOwner = current;
    captureStatus.dataset.error = "false";
    i18n.text(captureStatus, "Capturing…");
    dock.setAttribute("data-nook-capturing", "");
    try {
      // The hook is called directly from the gesture. It may retain a stream for
      // current.signal's lifetime; Done aborts that lifetime and releases it.
      const value = await cfg.captureScreenshot({
        root:
          cfg.root || dock.captureRoot || dock.ownerDocument.documentElement,
        exclude: dock.captureExclusions || [dock],
        signal: current.signal,
      });
      if (!current.signal.aborted && mode === current && value) {
        add(value, "screenshot");
        i18n.text(captureStatus, "Snapshot added.");
      }
    } catch (error) {
      if (!current.signal.aborted) {
        i18n.text(
          captureStatus,
          error.messageId || error.message || "Could not capture the app view.",
          error.messageParams,
          error.messageSingular,
        );
        captureStatus.dataset.error = "true";
      }
    } finally {
      if (captureOwner === current) {
        captureOwner = null;
        dock.removeAttribute("data-nook-capturing");
      }
      if (mode === current) setBusy(false);
    }
  };
  captureDone.onclick = () => finishCapture();
  review.onclick = () => {
    gallery.hidden = !gallery.hidden;
    review.setAttribute("aria-expanded", String(!gallery.hidden));
    updateCapture();
  };
  sessionUI.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (!gallery.hidden) collapsePreviews();
      else finishCapture();
    }
  });
  signal.addEventListener("abort", () => finishCapture(false), { once: true });
  const entries = [];
  const typeButtons = new Map();
  const operations = new Set();
  let busy = false;
  let enabled = false;
  let captureOwner = null;
  let signature = "";
  const setStatus = (message, error = false, params, singular) => {
    i18n.text(status, message, params, singular);
    status.dataset.error = String(error);
    status.setAttribute("role", error ? "alert" : "status");
  };
  const setBusy = (value) => {
    busy = value;
    form.setAttribute("aria-busy", String(value));
    text.disabled = value;
    submit.disabled = value;
    i18n.text(submit, value ? "Sending…" : "Send feedback");
    updateCapture();
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
    for (const tile of previews.values()) tile.el.remove();
    previews.clear();
    selected = null;
    largePreview.removeAttribute("src");
    updateCapture();
  };
  const add = (values, category) => {
    for (const value of Array.isArray(values) ? values : [values]) {
      if (!value) continue;
      const cfg = getHooks();
      if (entries.length >= (cfg.maxFiles ?? 5))
        throw i18n.error(
          "You can attach up to {#} files.",
          { count: cfg.maxFiles ?? 5 },
          "You can attach up to {#} file.",
        );
      if (value.size > (cfg.maxFileBytes ?? 10 * 1024 * 1024))
        throw i18n.error("That attachment is too large.");
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
      const caption = make("span", "feedback-attachment-name");
      caption.textContent = name;
      const remove = make("button", "feedback-remove");
      remove.type = "button";
      remove.innerHTML = icon("close");
      i18n.attr(remove, "aria-label", "Remove {name}", { name });
      const entry = { value, category, row, url };
      remove.onclick = () => {
        if (!busy) removeEntry(entry);
      };
      row.append(caption, remove);
      entries.push(entry);
      list.append(row);
      updateCapture();
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
      i18n.text(submit, "Preparing attachments…");
      setStatus("");
      try {
        const prepared = await cfg.attachFiles(chosen, { signal: opSignal });
        if (!opSignal.aborted) add(prepared ?? chosen, "file");
      } catch (error) {
        if (!opSignal.aborted)
          setStatus(
            error.messageId || error.message || "Could not attach those files.",
            true,
            error.messageParams,
            error.messageSingular,
          );
      } finally {
        if (!opSignal.aborted) setBusy(false);
      }
    });
  capture.onclick = () => startCapture();
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
    if (mode && typeof cfg.captureScreenshot !== "function") finishCapture();
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
    i18n.text(
      success.querySelector("p"),
      cfg.successMessage || "Your feedback has been sent.",
    );
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
    finishCapture(false);
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
    finishCapture(false);
    sessionUI.remove();
    disable();
    form.remove();
    status.remove();
    success.remove();
  }
  signal.addEventListener("abort", dispose, { once: true });
  return {
    get capturing() {
      return Boolean(mode);
    },
    reconcile,
    dispose,
    form,
    status,
    setEnabled(value) {
      if (!value) finishCapture(false);
      if (enabled && !value) disable();
      enabled = value;
    },
  };
}
