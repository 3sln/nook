import { createTranslator } from "@3sln/bab";

// Each dock owns its translator. Bindings update existing text/attributes rather
// than replacing controls, so changing language preserves input and focus state.
export default function localization(host, make) {
  const bindings = new Set();
  const nodes = new WeakMap();
  const finalized = new FinalizationRegistry((binding) =>
    bindings.delete(binding),
  );
  let config;
  let translator;
  let locale;
  const format = (id, params, singular) => {
    if (id === "" || id == null) return "";
    const values = typeof params === "function" ? params() : params;
    let value = translator(String(id), values);
    if (singular) value = value.singular(singular);
    return String(value);
  };
  const apply = (binding) => {
    const node = binding.node.deref();
    if (!node) {
      bindings.delete(binding);
      return;
    }
    const value = format(binding.id, binding.params, binding.singular);
    if (binding.attribute) {
      if (node.getAttribute(binding.attribute) !== value)
        node.setAttribute(binding.attribute, value);
    } else if (node.textContent !== value) node.textContent = value;
  };
  const bind = (node, attribute, id, params, singular) => {
    let map = nodes.get(node);
    if (!map) {
      map = new Map();
      nodes.set(node, map);
    }
    const key = attribute || "text";
    let binding = map.get(key);
    if (!binding) {
      binding = { node: new WeakRef(node), attribute };
      map.set(key, binding);
      bindings.add(binding);
      finalized.register(node, binding, binding);
    }
    Object.assign(binding, { id, params, singular });
    apply(binding);
    return node;
  };
  const configure = (value) => {
    config = value;
    const options = typeof value === "function" ? {} : value || {};
    locale =
      options.locale ||
      host.lang ||
      host.ownerDocument.documentElement.lang ||
      "en";
    translator =
      typeof value === "function"
        ? value
        : createTranslator({ ...options, locale }).scope("nook");
    locale = translator.locale || locale;
    host.anchor?.setAttribute("lang", locale);
    host.overlayAnchor?.setAttribute("lang", locale);
    for (const binding of bindings) apply(binding);
  };
  configure();
  return {
    get locale() {
      return locale;
    },
    configure,
    refresh() {
      configure(config);
    },
    t: format,
    text: (node, id, params, singular) =>
      bind(node, null, id, params, singular),
    attr: (node, name, id, params, singular) =>
      bind(node, name, id, params, singular),
    make(tag, part, id) {
      const node = make(tag, part);
      if (id !== undefined && id !== null) bind(node, null, id);
      return node;
    },
    error(id, params, singular) {
      return Object.assign(new Error(format(id, params, singular)), {
        messageId: id,
        messageParams: params,
        messageSingular: singular,
      });
    },
  };
}
