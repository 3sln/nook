import { commandMatches, argumentValues } from "../bl/commands.js";

// Persistent result buttons and forms belong to the DOM renderer. Filtering only
// changes visibility; it never replaces an argument field or its current value.
export default function commandPalette({
  view,
  make,
  choose,
  run,
  supported,
  createEnum,
}) {
  const search = make("input", "command-search");
  search.type = "search";
  search.className = "command-search";
  search.placeholder = "Search commands…";
  search.setAttribute("aria-label", "Search commands");
  search.autocomplete = "off";
  const list = make("div", "command-list");
  list.className = "command-list";
  const empty = make("p", "command-empty", "No matching commands.");
  empty.className = "command-empty";
  empty.setAttribute("role", "status");
  const results = make("div", "command-results");
  results.className = "command-results";
  results.append(list, empty);
  view.body.append(search, results);
  const records = new Map();
  let active = null;
  let order = [];
  const status = make("span", "command-status");
  status.className = "live";
  status.id = "nook-command-status";
  status.setAttribute("role", "status");
  view.body.append(status);
  search.setAttribute("aria-describedby", status.id);
  const visible = () => order.filter((record) => !record.button.hidden);
  const highlight = (record) => {
    active = record;
    status.textContent = record
      ? `${record.name.textContent}. ${record.description.textContent}`
      : "";
    for (const candidate of records.values())
      candidate.button.dataset.active = String(candidate === record);
  };
  const filter = () => {
    for (const [source, record] of records) {
      record.button.hidden = !commandMatches(
        source.getAttribute("name"),
        source.getAttribute("description"),
        search.value,
      );
    }
    const candidates = visible();
    empty.hidden = Boolean(candidates.length);
    if (!candidates.includes(active)) highlight(candidates[0] || null);
  };
  search.addEventListener("input", filter);
  search.addEventListener("keydown", (event) => {
    const candidates = visible();
    if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "Enter") {
        active?.button.click();
        return;
      }
      const delta = event.key === "ArrowDown" ? 1 : -1;
      highlight(
        candidates[
          (candidates.indexOf(active) + delta + candidates.length) %
            candidates.length
        ] || null,
      );
      active?.button.scrollIntoView?.({ block: "nearest" });
    }
  });
  return {
    search,
    reset() {
      search.value = "";
      filter();
    },
    reconcile(commands) {
      const wanted = new Set(commands);
      for (const [source, record] of records)
        if (!wanted.has(source)) {
          record.button.remove();
          records.delete(source);
        }
      let cursor = list.firstChild;
      for (const source of commands) {
        let record = records.get(source);
        if (!record) {
          const button = make("button", "command-result");
          button.type = "button";
          button.className = "command-result";
          const name = make("span", "command-name");
          const description = make("small", "command-description");
          const binding = make("kbd", "command-keybind");
          binding.className = "keyboard-only";
          const number = make("span", "number");
          number.className = "number";
          number.setAttribute("aria-hidden", "true");
          button.append(name, description, binding, number);
          button.onclick = () => choose(source);
          record = { button, name, description, binding };
          records.set(source, record);
        }
        const name = source.getAttribute("name").trim(),
          description = source.getAttribute("description").trim();
        if (record.name.textContent !== name) record.name.textContent = name;
        if (record.description.textContent !== description)
          record.description.textContent = description;
        const binding = source.getAttribute("keybind") || "";
        if (record.binding.textContent !== binding)
          record.binding.textContent = binding;
        record.binding.hidden = !binding || !supported(binding);
        record.button.setAttribute("aria-label", name);
        if (record.button !== cursor) list.insertBefore(record.button, cursor);
        cursor = record.button.nextSibling;
      }
      order = commands.map((source) => records.get(source));
      filter();
    },
    mountForm(source, body) {
      const form = make("form", "command-form");
      form.className = "command-form";
      const description = make("p", "command-description");
      description.className = "command-description";
      const fields = make("div", "command-fields");
      fields.className = "command-fields";
      const submit = make("button", "command-run", "Run command");
      submit.type = "submit";
      submit.className = "command-run";
      form.append(description, fields, submit);
      body.append(form);
      const controls = new Map();
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (form.reportValidity()) run(source, argumentValues(form));
      });
      return {
        form,
        dispose() {
          for (const record of controls.values()) record.enum?.dispose();
        },
        reconcile() {
          description.textContent = source.getAttribute("description");
          const args = [...source.querySelectorAll("nook-arg")].filter(
            (arg) =>
              arg.closest("nook-command") === source &&
              arg.getAttribute("name")?.trim() &&
              !arg.hidden,
          );
          const wanted = new Set(args);
          for (const [arg, record] of controls)
            if (!wanted.has(arg)) {
              record.enum?.dispose();
              record.row.remove();
              controls.delete(arg);
            }
          let cursor = fields.firstChild;
          for (const arg of args) {
            const type = arg.getAttribute("type") || "text";
            let record = controls.get(arg);
            if (record && record.type !== type) {
              record.enum?.dispose();
              record.row.remove();
              controls.delete(arg);
              record = null;
            }
            if (!record) {
              const isEnum = ["enum", "select"].includes(type);
              const row = make(isEnum ? "div" : "label", "command-field");
              row.className = "command-field";
              const caption = make("span", "command-arg-label");
              let picker;
              const control = isEnum
                ? (picker = createEnum(
                    arg,
                    () => arg.getAttribute("label") || arg.getAttribute("name"),
                    () => {
                      control.dispatchEvent(
                        new Event("input", { bubbles: true }),
                      );
                      control.dispatchEvent(
                        new Event("change", { bubbles: true }),
                      );
                    },
                    arg.getAttribute("value") || "",
                  )).proxy
                : make("input", "command-arg-control");
              if (!isEnum) control.type = type === "toggle" ? "checkbox" : type;
              control.value = arg.getAttribute("value") || "";
              if (control.type === "checkbox")
                control.checked = arg.getAttribute("value") === "true";
              row.append(caption, picker ? picker.element : control);
              record = { row, caption, control, type, enum: picker };
              controls.set(arg, record);
            }
            const { row, caption, control } = record;
            const title = arg.getAttribute("label") || arg.getAttribute("name");
            if (caption.textContent !== title) caption.textContent = title;
            control.name = arg.getAttribute("name");
            control.required = arg.hasAttribute("required");
            control.disabled = arg.hasAttribute("disabled");
            for (const key of [
              "min",
              "max",
              "step",
              "placeholder",
              "pattern",
            ]) {
              const value = arg.getAttribute(key);
              if (value === null) control.removeAttribute(key);
              else control.setAttribute(key, value);
            }
            record.enum?.reconcile();
            if (row !== cursor) fields.insertBefore(row, cursor);
            cursor = row.nextSibling;
          }
        },
      };
    },
  };
}
