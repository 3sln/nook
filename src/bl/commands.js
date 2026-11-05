export function commandMatches(name, description, query) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const haystack = `${name} ${description}`.toLocaleLowerCase();
  return words.every((word) => haystack.includes(word));
}
export function validCommand(item) {
  return Boolean(
    item.getAttribute("name")?.trim() &&
      item.getAttribute("description")?.trim(),
  );
}
export function argumentValues(form) {
  const values = [];
  for (const field of form.elements) {
    if (!field.name || field.disabled) continue;
    const value =
      field.type === "checkbox"
        ? field.checked
        : field.type === "number" || field.type === "range"
          ? field.value === ""
            ? null
            : Number(field.value)
          : field.value;
    values.push([field.name, value]);
  }
  return Object.fromEntries(values);
}
