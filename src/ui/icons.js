const paths = {
  down: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  nook: '<path d="M5 17V7a2 2 0 0 1 2-2h10M11 19v-6a2 2 0 0 1 2-2h6"/><circle cx="18" cy="18" r="1" fill="currentColor" stroke="none"/>',
  menu: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
  settings:
    '<path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  commands: '<path d="m5 6 5 6-5 6m8 0h6"/>',
  heart:
    '<path d="M12 20 4.5 12.5a4.95 4.95 0 0 1 7-7L12 6l.5-.5a4.95 4.95 0 0 1 7 7Z"/>',
  feedback:
    '<path d="M8 18H5l-2 3V6a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-6"/><path d="M8 8h8m-8 5h5"/>',
  guide:
    '<path d="M12 5v15M3 4h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v15h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z"/>',
  folder: '<path d="M3 7V5h6l2 2h10v12H3z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  link: '<path d="m10 14 4-4m-6 6-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m0 12a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1" transform="translate(1 0) scale(.92)"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
  edit: '<path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14z"/>',
  plus: '<path d="M12 4v16M4 12h16"/>',
  people:
    '<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m3 9v-2a6 6 0 0 0-2-4"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
  file: '<path d="M14 3H5v18h14V8zM14 3v5h5M8 12h8m-8 4h5"/>',
  code: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/>',
  archive: '<path d="M4 8h16v13H4zM3 3h18v5H3zm6 9h6"/>',
  table:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M10 3v18"/>',
  text: '<path d="M4 5h16M12 5v15m-4 0h8"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  back: '<path d="m14 5-7 7 7 7"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};
export const sprite = `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${Object.entries(
  paths,
)
  .map(
    ([name, path]) =>
      `<symbol id="nook-icon-${name}" viewBox="0 0 24 24">${path}</symbol>`,
  )
  .join("")}</svg>`;
export function icon(name) {
  const known = Object.hasOwn(paths, name) ? name : "file";
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><use href="#nook-icon-${known}"></use></svg>`;
}
