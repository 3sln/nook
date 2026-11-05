# Nook

A quiet, recognizable corner for contextual actions, help, settings, and feedback. Native custom elements, persistent DOM, and an ngin-owned navigation projection. The Nook mark is fixed across integrations; colors, geometry, typography, controls, and surfaces are customizable.

## Install

```sh
npm install @3sln/nook
```

Import `@3sln/nook` once in your browser entry point, then add one `<nook-dock>` to your application. The package ships native ES modules and registers its custom elements on import. It requires a browser DOM; import it on the client in server-rendered apps. `@3sln/ngin` is installed as a dependency and remains external, so your application's bundler or import map can share one copy.

```html
<nook-dock corner="bottom-right">
  <nook-action id="share" label="Share page"></nook-action>
</nook-dock>
```

```js
import "@3sln/nook";

const dock = document.querySelector("nook-dock");
dock.addEventListener("nook-action", ({ detail }) => {
  // Handle the selected action in your app; see the event reference below.
});
```

Feedback is disabled until its submit hook is wired. Commands, quick settings, and quick-menu launchers appear only when their definitions are present. Configuration belongs to each dock, through attributes, properties, and inherited CSS custom properties; there is no global configuration registry.

## Try the demo

```sh
git clone https://github.com/3sln/nook.git
cd nook
bun install --frozen-lockfile
bun run dev
# http://localhost:4178
```

Use Bun 1.3.14 and Node.js 24 for development. The demo serves the installed `@3sln/ngin` dependency; no sibling checkout or build step is needed. The demo's feedback handler stores reports only in memory and does not send them to a server.

## Embed

```js
import "@3sln/nook";
```

```html
<nook-dock corner="bottom-right">
  <nook-action id="share" label="Share page" keybind="Alt+S">
    <template slot="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <use href="#nook-icon-link"></use>
      </svg>
    </template>
  </nook-action>

  <nook-menu label="Resources">
    <nook-panel label="Page guide">
      <template slot="content"
        ><p>Your context-specific documentation.</p></template
      >
    </nook-panel>
  </nook-menu>

  <nook-setting id="dark" label="Dark mode" type="toggle" value="false">
    <template slot="description">A softer space after hours</template>
  </nook-setting>
  <nook-setting
    label="Volume"
    type="range"
    min="0"
    max="100"
    step="1"
    value="70"
  ></nook-setting>
  <nook-setting label="Color" type="select" value="iris">
    <option value="iris">Iris</option>
    <option value="sage">Sage</option>
  </nook-setting>
</nook-dock>
```

Each dock owns only its descendants; elements from nested docks are excluded. Use one dock per app for predictable document-level shortcuts. Declarative `nook-action`, `nook-menu`, `nook-panel`, and `nook-setting` elements are hidden by their own shadow styles. Optionally include `nook-action,nook-menu,nook-panel,nook-setting,nook-command,nook-arg { display:none }` in the host stylesheet to hide definitions before JavaScript loads.

- `nook-dock`: the corner handle and composition root.
- `nook-action`: emits intent for the embedding app to handle.
- `nook-menu`: a nested group of actions, panels, or menus.
- `nook-panel`: an overlay surface for arbitrary application UI.
- `nook-command`: a searchable command with optional declarative arguments.
- `nook-arg`: a command argument definition.
- `nook-setting`: an inline control. `type="toggle"`, `range`, `enum` (`select` is a compatibility alias), or native input types such as `color`, `number`, and `text`. `min`, `max`, `step`, and `value` reflect to the control. Toggle values use the strings `true` and `false`; the JS `value` property returns a boolean for toggles and a string for other controls.

Set `root` or `item.root = true` to place an item exclusively in the main menu. Other top-level actions, panels, and menus populate the full quick menu and its abbreviated strip. Other settings populate the settings surface. Settings are collected into that surface even when declared inside a submenu. Quick menu and settings launchers appear automatically only when populated. Set `hidden` or `disabled` to withdraw an item and its descendants; remove the attribute to restore it.

`label` and `description` accept attributes or slotted templates. `slot="icon"` accepts a template or an element. Labels are also accessible names; desktop tooltips include the keybinding. Labels appear as panel/submenu headings when opened. Set `--nook-label-display: block` to show text beneath all action icons.

## Live DOM and persistence

Add, remove, reorder, hide, or change labels, icons, descriptions, bindings, values, and select options on the source elements. A batched MutationObserver reconciles them in the next observer turn, whether the menu is open or closed. Existing item buttons, panel inputs, and setting controls retain identity. Removing an active panel/menu closes navigation safely. Removed items release their rendered views and quick-strip mirrors.

All surfaces are constructed before opening; navigation changes visibility, focus, and inertness. Opening and closing does not rebuild their contents. Structural changes reconcile only the affected definitions. The horizontal strip has its own small set of buttons so the full menu never has to move into it. Resizing recalculates strip capacity.

Panel `slot="content"` templates and custom control templates are instantiated once when their source item is registered. Subsequent edits to an inert template's content do not patch the mounted UI: update the mounted live UI, or remove/reinsert the definition to instantiate it again. This is intentional: silently replacing a panel on an unrelated menu mutation would discard an unfinished form. Event listeners attached to an inert template's nodes are not cloned; listen for bubbling events or use custom elements inside templates.

For already-live panel content, omit the template. Unslotted nodes move once into the mounted surface, preserving listeners and element state. Application styles for moved/cloned content must live inside its custom elements or an included `<style>` in the panel content. Store app data outside Nook; a remove/reinsert or route teardown creates a fresh panel.

## Settings and rich enums

```html
<nook-setting
  id="dark"
  type="toggle"
  label="Dark mode"
  description="A softer space after hours"
  value="false"
></nook-setting>
<nook-setting
  id="scale"
  type="range"
  label="Text size"
  min="12"
  max="20"
  step="1"
  value="14"
></nook-setting>
<nook-setting id="accent" type="enum" label="Accent" value="iris">
  <nook-option value="iris" label="Iris" description="Soft violet">
    <template slot="icon">
      <span
        style="display:block;width:20px;height:20px;border-radius:50%;background:#7560e8"
      ></span>
    </template>
  </nook-option>
  <nook-option
    value="sage"
    label="Sage"
    description="Quiet green"
  ></nook-option>
</nook-setting>
```

Enums use a custom trigger and a listbox in Nook's own view system. Arrow spacing and padding are controlled by CSS; no native select arrow is used. The picker opens as a contained desktop view or fullscreen mobile view and inherits expanded ancestors. Selecting returns to the previous view and focuses the trigger. Arrows, Home/End, single-letter typeahead, Enter, and Space work; Escape closes Nook, and Backspace goes back. Disabled choices cannot be selected.

`nook-option` supports `value`, `label`, `description`, `disabled`, and `hidden`, plus templates for `icon`, `label`, `description`, or a full `content` layout. Rich option content is presentational (icons, swatches, text, and badges), without nested interactive controls. Use unique values. Plain `<option>` definitions and `type="select"` remain compatible and use the same custom picker. A missing initial value selects the first enabled option; an explicitly requested value that no longer exists is retained as invalid and displays “Choose…” until corrected. Initial defaults do not emit a change event.

The same picker works for `nook-arg type="enum"`/`select`, including required command arguments and native form validation through a hidden value proxy. Changes to options, labels, descriptions, disabled states, and the selected `value` reconcile live. Existing option buttons and values survive unrelated changes. Changing the setting/control type explicitly recreates that control.

```js
const setting = document.querySelector("#accent");
setting.value = "sage";
dock.addEventListener("nook-change", ({ detail: { source, value } }) => {
  // Translate this input into your application's setting Action.
});
```

Native `color`, `number`, and `text` inputs and custom `<template slot="control">` remain available. Add `root` to put a setting directly in the root, or leave it off to include it in quick settings.

Picker parts: `enum-control`, `enum-trigger`, `enum-current`, `enum-chevron`, `enum-value`, `enum-options`, `enum-option`, `enum-option-content`, `enum-option-icon`, `enum-option-text`, `enum-option-label`, `enum-option-description`, `enum-selected-label`, `enum-check`, `enum-error`, and `enum-empty`. See the [ARIA listbox interaction pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

The command palette keeps its search field at the anchored edge: top for top corners and bottom for bottom corners. Results scroll independently, including in fullscreen mobile views. Style the results viewport with `::part(command-results)`.

## Optional feedback UI

The built-in feedback launcher and shortcut are disabled until `dock.feedback.submit` is a function. Wire capabilities explicitly:

```js
import { captureTabScreenshot } from "@3sln/nook/capture";

dock.feedback = {
  submit: async (report, { signal }) => {
    // Deliver report through your app. Resolve on success; throw on failure.
    // report = { type, message, attachments: [{ kind, file }], context }
    // file is a File/Blob or the descriptor returned by an attachment hook.
  },
  attachFiles: async (files, { signal }) => files,
  captureScreenshot: navigator.mediaDevices?.getDisplayMedia
    ? (options) => captureTabScreenshot(options)
    : undefined,
  // root: document.querySelector('#app'),
  // accept: 'image/*,.txt,.log',
  // maxFiles: 5,
  // maxFileBytes: 10 * 1024 * 1024,
  // types: [{ value: 'bug', label: 'Bug report' }, ...],
  // successMessage: 'Your report was received.',
};
```

Submit is required; attachment and capture controls appear only when their respective hooks are functions. Reassign `dock.feedback` to update capabilities live. `dock.feedback = false` or `feedback-disabled` disables feedback entirely, including custom feedback definitions. `dock.feedback = null` unwires the built-in UI while allowing a supplied custom panel. A custom `<nook-panel feedback root label="Feedback">` takes precedence over the built-in form. Its app-owned UI and `nook-submit` handling work as before.

The built-in form includes Bug report, UI / usability, Feature request, and Other categories, a required message, removable attachment previews, loading states, an error message that retains the draft, and a success state. Duplicate submissions are prevented. Disabling feedback or disconnecting Nook aborts outstanding operations, clears attachments, revokes preview URLs, and restores the app if capture was in progress. The demo supplies explicit local hooks and says that nothing is sent to a server.

`attachFiles(files, { signal })` may prepare/upload files and return an array of files or app-owned descriptors; returning nothing stages the original files. Submission receives these as `{ kind: 'file' | 'screenshot', file }`. The defaults allow five attachments of up to 10 MiB each. Native file `accept` is a picker hint; your hooks/backend own delivery, validation, authorization, and any upload cleanup.

`captureScreenshot({ root, exclude, signal })` is an optional app capability. Nook sets `data-nook-capturing` and hides its entire host before calling it, and supplies `exclude: [dock]`; it restores visibility in every completion, cancellation, and error path. DOM-rendering integrations should also honor `root` and `exclude`. The returned File/Blob or app descriptor is staged for preview and final submission, never automatically sent by Nook.

The optional `captureTabScreenshot` helper requests a browser sharing choice, captures one frame without audio, and stops all media tracks. It prefers the current tab but cannot guarantee which surface the user selects. Browser permission and a user gesture are required every time; the helper is not a silent DOM screenshot service. See the [Screen Capture API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia). Apps may instead supply a DOM-to-image hook for an exact application subtree, with that renderer's own font, image, shadow-DOM, and cross-origin limitations.

Feedback parts include `feedback-form`, `feedback-intro`, `feedback-types`, `feedback-type`, `feedback-label`, `feedback-message`, `feedback-tools`, `feedback-file-input`, `feedback-attach`, `feedback-capture`, `feedback-attachments`, `feedback-attachment`, `feedback-preview`, `feedback-attachment-name`, `feedback-remove`, `feedback-privacy`, `feedback-status`, `feedback-send`, `feedback-success`, `feedback-another`, and `feedback-done`.

## First use

Before its first opening, Nook's visible corner pulses softly. The first open shows a short device-specific introduction, then “Got it” continues to the requested menu or panel. Escape may dismiss it immediately. Reduced-motion preferences disable the pulse. The keyboard-specific number tip appears only when layout data is available.

Showing the introduction records `seen` under `@3sln/nook:tutorial:v1` in localStorage. This is shared across Nook instances on the same origin. Future visits open directly into the requested view. If storage is denied or throws, a provider-owned, document-scoped in-memory fallback prevents repeated introductions during the current page session. No network requests or account identification are involved.

To replay the first-use experience while developing, remove that localStorage key and reload the page. The introduction is marked as seen when shown, rather than requiring completion.

### Customizing the tutorial and help

Customize each dock's headings and button labels through its `tutorial` property:

```js
dock.tutorial = {
  title: "Meet your workspace shortcuts",
  continueLabel: "Let's go",
  helpTitle: "Workspace help",
  moveLabel: "Move shortcuts",
};
```

Reassign this property to update labels live; `null` restores the defaults. Titles also update the dialogs' accessible names. Tutorial customization leaves first-use tracking and device detection intact.

Supply direct-child templates for custom content. Desktop and touch wrappers remain mounted, and Nook switches them automatically as input capabilities change:

```html
<nook-dock>
  <template slot="tutorial-desktop">
    <p>Your workspace extras live here.</p>
    <p>Use arrows to browse and Enter to choose. Escape closes Nook.</p>
  </template>
  <template slot="tutorial-touch">
    <p>Tap the corner for workspace extras.</p>
    <p>Swipe sideways for shortcuts or vertically for settings.</p>
  </template>
  <template slot="tutorial-drag">Hold, then drag to choose a corner.</template>
</nook-dock>
```

Slots `help-desktop`, `help-touch`, and `help-drag` customize the guide opened with `dock.open('help')`. Slot `tutorial` replaces the entire welcome body, and slot `help` replaces the entire guide body; full replacements take precedence over their individual device regions. Continue, navigation, and corner controls remain Nook-owned. With a full replacement, the embedder owns any device-specific content inside it. Drag-region templates remain hidden when the dock cannot move.

Templates are cloned once on insertion/replacement. Unrelated mutations and navigation preserve mounted custom content and form state. Replace a template element to apply new content; removing it restores the built-in region. Listeners on inert template nodes are not cloned; use custom elements or bubbling events. Custom content renders in the dock's shadow root, so include a `<style>` in the template or use the exposed parts.

Style `::part(tutorial)`, `::part(tutorial-desktop)`, `::part(tutorial-touch)`, `::part(tutorial-drag)`, and `::part(tutorial-continue)`. The guide exposes `help`, `help-desktop`, `help-touch`, `help-drag`, and `move-button`; both surfaces also expose the shared `heading`, `header`, `body`, and `surface` parts. They inherit Nook's color, typography, spacing, and animation tokens.

## SVG sprite

Nook includes its own consistent line icons in a single SVG symbol sprite per dock's shadow root. Built-in launchers, navigation, and the demo use `<use>` references; the quick menu uses a four-square icon, without the Mac command glyph. The Nook mark retains its fixed geometry.

Inside an icon template, reference the built-in sprite:

```html
<template slot="icon">
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <use href="#nook-icon-folder"></use>
  </svg>
</template>
```

Symbol names: `down`, `check`, `nook`, `menu`, `settings`, `commands`, `feedback`, `heart`, `guide`, `folder`, `download`, `link`, `info`, `edit`, `plus`, `people`, `file`, `code`, `archive`, `table`, `text`, `more`, `back`, and `close`.

`@3sln/nook/icons` exports `sprite` and `icon(name)` for programmatic use. `icon(name)` returns a lightweight SVG reference; unknown names fall back to `file`. References must be in the same shadow tree as their sprite. Outside Nook, mount the exported sprite in the relevant document/tree. Colors inherit `currentColor`; sizes can be customized through parts.

## Commands

`nook-command` is a hidden declarative definition with required nonempty `name` and `description` attributes. Valid, available commands automatically add a Commands launcher to the root. They do not appear in the quick strip or ordinary submenus. Removing the last valid command withdraws the launcher and closes an open palette. Missing required metadata, `hidden`, and `disabled` withdraw a command until corrected. Definitions are discovered inside the dock, including nested contexts.

```html
<nook-command
  id="create-note"
  name="Create note"
  description="Create a note with a title and priority"
  keybind="Ctrl+Shift+N"
>
  <nook-arg
    name="title"
    label="Title"
    placeholder="A new idea"
    required
  ></nook-arg>
  <nook-arg name="priority" label="Priority" type="select" value="normal">
    <option value="normal">Normal</option>
    <option value="high">High</option>
  </nook-arg>
</nook-command>
```

Ctrl+Shift+P and Cmd+Shift+P open the search palette. Set `commands-keybind` on the dock to change that binding, or set it to an empty string to disable it. `dock.open('commands')` also opens the surface. Search matches all words across names and descriptions. Arrow Up/Down chooses a result; Enter opens/runs it. Tab can focus result buttons normally. The palette uses a desktop card and the fullscreen mobile presentation.

A command's optional `keybind` activates it directly, opening its argument form if needed. Supported bindings appear alongside results on desktop and update live when changed. They are hidden on touch devices. Modifier aliases `Ctrl`/`Control`, `Alt`/`Opt`/`Option`, and `Meta`/`Cmd`/`Command` are accepted without detecting the user's operating system.

Arguments use `nook-arg`, with a required `name` and optional `label`. `type` accepts native input types, plus `toggle` and `enum`/`select`; the default is `text`. Attributes include `required`, `value` (initial/default value), `placeholder`, `min`, `max`, `step`, `pattern`, `disabled`, and `hidden`. Supply option elements for selects. Use unique argument names. Forms use native validation. Values are strings, booleans for toggles/checkboxes, and numbers (or `null` for an empty optional field) for number/range inputs. Field values survive navigation and unrelated DOM changes; changing an argument's type recreates that field. No-argument commands run immediately.

```js
dock.addEventListener("nook-command", (event) => {
  const { source, id, name, args, context } = event.detail;
  // Dispatch your app's Action. Nook does not execute application behavior.
  // Prevent default to retain the current view, for example while handling errors.
});
```

Keyboard interpretation uses reported `KeyboardEvent.key` values and, for Alt/Option printable-key bindings and numbered selection, `navigator.keyboard.getLayoutMap()`. There are no US key-position tables, user-agent checks, inferred OS layouts, or embedder layout configuration. A layout-dependent binding is disabled and its hint hidden unless browser-provided mapping resolves its key. If layout data is absent, denied, incomplete, or later becomes unavailable, those bindings and their number badges are disabled; the UI remains clickable and logical-key shortcuts such as Ctrl/Cmd+Shift+P remain available. Available mappings are refreshed on focus, Alt/Option modifier presses, and browser layout-change events. Dependent bindings are suspended while a refresh is pending, and stale requests cannot overwrite newer results. Browser/OS-reserved combinations can still take precedence.

Search results, bindings, command availability, and argument definitions update live. Existing result buttons and form fields are retained. Adding a command does not erase the current query or draft arguments; opening the palette anew starts a fresh search. Newly added argument fields are pre-rendered before navigation.

Additional parts: `command-search`, `command-list`, `command-empty`, `command-result`, `command-name`, `command-description`, `command-keybind`, `command-status`, `command-form`, `command-fields`, `command-field`, `command-arg-label`, `command-arg-control`, `command-run`, `number`, `tutorial`, and `tutorial-continue`. Set `--nook-command-width` (default `480px`) to customize the desktop palette width.

## Compact and expanded views

Small menus float without a surrounding card on desktop and mobile. Root views stay compact through five items; submenu views through four; settings stay compact through three controls. The root shows only its items. Each floating action has its own subtle background for contrast over app content.

Larger views use a contained card on desktop. On touch/coarse-pointer or hoverless devices they fill the viewport over a blurred, tinted backdrop, with safe-area padding, a close/back header, and scrollable content. Adding/removing definitions updates presentation live without remounting their UI. Arbitrary panels and the detailed guide default to expanded presentation because their content size is not implied by an item count.

Once navigation enters an expanded view, descendants retain expanded presentation until Back returns above that ancestor. On mobile, nested submenu trees appear as labeled sections within the fullscreen view, including deeper nested groups. Leaf panels still open their own view and return through the existing navigation path. Group launch buttons are reconciled ahead of time; actual panels and controls retain one mounted instance. Group labels, source order, and additions/removals update live. Root-only items stay out of nested groups. Desktop keeps its normal submenu navigation within the retained card layout.

The close button appears only in fullscreen mobile views. Compact and desktop views close through the corner handle, clicking outside, or Escape. The fullscreen close button also resets navigation. Presentation is inherited from expanded ancestors even if a child requests compact presentation; leaving that branch restores its normal layout.

Embedders can override the default with `presentation="compact"` or `presentation="expanded"` on a `nook-menu`/`nook-panel`, or `root-presentation`, `settings-presentation`, `full-presentation`, `quick-presentation`, `help-presentation`, and `corners-presentation` on the dock. Removing the override restores automatic selection. Use explicit presentation for custom content with unusual dimensions.

Customize floating control backgrounds with `--nook-floating-background`; customize the viewport layer with `--nook-backdrop` and `--nook-backdrop-blur` (defaults to the shared 24px material blur). Group spacing uses `--nook-group-gap` (default `16px`).

## Events and application behavior

```js
const dock = document.querySelector("nook-dock");
dock.context = { route: location.pathname, documentId: "current-document" };

dock.addEventListener("nook-action", (event) => {
  const { source, id, context } = event.detail;
  // Translate intent into your application's Actions here.
  // event.preventDefault() keeps Nook open for this action.
});
dock.addEventListener("nook-change", (event) => {
  const { source, value } = event.detail;
  if (source.id === "dark")
    document.documentElement.classList.toggle("dark", value);
});
dock.addEventListener("nook-submit", (event) => {
  const { source, formData } = event.detail;
  // Dispatch your feedback action with formData and app-owned context.
});
dock.addEventListener("nook-corner-change", (event) => {
  // Optional: persist event.detail.corner in your app's preferences.
});
```

All these events bubble and cross shadow boundaries. `nook-input` reports continuous control changes; `nook-change` reports committed changes. `nook-submit` intercepts native form submission inside panels and supplies `FormData`. The generic panel/action layer makes no network requests. Optional feedback hooks and the separate native capture helper are described above; feedback delivery remains app-owned. The demo records feedback locally and says so in its UI. The app owns consent, context capture, storage, and delivery.

For a custom setting, supply `<template slot="control">…</template>`. Its native bubbling `change` event is translated to `nook-change` with the source setting and target's value. Complex controls may emit their own composed custom events for richer payloads. The native `value` property synchronization described above applies to the supplied native controls.

## Navigation

Tap/click opens the root menu, with action icons. The device-specific introduction is shown on first use; `dock.open('help')` can reopen the full guide. Touch/coarse-pointer or hoverless devices hide keyboard hints and show swipe instructions instead. These capability queries update live when browser emulation or input capabilities change. Clicking outside closes it. Hold for 450ms, then drag. The live handle stays anchored and dims while a non-interactive preview shows the destination corner; release commits that corner. Cancellation restores the original placement. The mark rotates to match each corner. The handle has a 48px touch target and a 32px visible corner with the same recognizable quarter-circle shape. The help surface also offers buttons to choose a corner without dragging.

On touch devices (and pointer-based testing), swipe horizontally for the abbreviated quick strip, vertically for settings, diagonally for the full quick menu. Swipes have a 32px distance threshold and broad directional bands. Empty quick/settings surfaces do not activate from gestures or their shortcuts. The root launcher and desktop quick-menu shortcut open the full menu. The strip reserves space for “All shortcuts” when items overflow. Gestures start only on the handle, leaving application scrolling alone.

| Desktop action | Default       | Dock attribute     |
| -------------- | ------------- | ------------------ |
| Main/root menu | `Shift+?`     | `root-keybind`     |
| Settings       | `Alt+Shift+S` | `settings-keybind` |
| Quick menu     | `Alt+Shift+Q` | `quick-keybind`    |
| Feedback       | `Alt+Shift+F` | `feedback-keybind` |

Designate the feedback action/panel with `feedback`. The first available designated item wins. Any action, panel, or submenu, including a root item, may also declare `keybind` or set `.keybind`. Bindings use `Ctrl`, `Alt`, `Meta`, `Shift` plus `KeyboardEvent.key`, for example `Meta+Shift+K`. Modifiers must match exactly. Set an empty dock binding attribute to disable that default. Dock defaults take precedence over item bindings; otherwise the first available item in DOM order wins. Browser/OS-reserved bindings may not reach the page.

Shortcuts ignore editable elements, composition, repeated presses, and already-prevented events. Inside a menu, arrows cycle focus, Home/End jump, Enter/Space activate buttons, and Alt/Option+1–9 chooses the corresponding displayed action. Hold Alt/Option to reveal assigned numbers; release it or leave the window to hide them. Plain number keys never activate items. Tab cycles within the current surface. Escape closes the entire menu and clears navigation; reopening starts at the root. Backspace (the Mac Delete key) goes back one level. Backspace/Delete retains normal editing behavior in text fields. Native editing keys retain their behavior inside controls. Focus returns to the element that opened the menu. Reduced-motion preferences disable animation.

```js
dock.open(); // root
dock.open("settings");
dock.open("quick"); // abbreviated strip
dock.open("full"); // all quick items
dock.open(document.querySelector("#feedback")); // a panel/menu element
dock.close();
dock.setAttribute("corner", "top-left");
```

## Available corners

Embedders can reserve occupied corners with `disabled-corners="top-left bottom-left"` or `dock.disabledCorners = ['top-left', 'bottom-left']`. This is a live constraint: snapping, landing outlines, the corner picker, and programmatic placement use the same allowed set. Unknown names are ignored. If the current corner becomes blocked, Nook relocates to the nearest allowed corner and reflects the actual placement in `corner`. If every corner is blocked, it stays where it is and disables movement.

During dragging, all allowed destinations are outlined and the nearest one is highlighted. The actual handle stays anchored until release. Changing constraints during a drag updates the target immediately; if no other corner remains available, the drag is canceled. When only the current corner is available, long-press drag, drag instructions, and the corner-picker launcher are disabled/hidden. Swipes, opening, and keyboard navigation remain available.

The handle's custom hover/focus tooltip contains the configured root shortcut and, only when movement is possible, the hold-to-drag hint. Clicking, pressing, opening a view, or using the keyboard dismisses it; leaving and hovering again (or a fresh keyboard focus) makes it available again. There is no inline shortcut badge. Touch devices hide the tooltip.

## Styling

Defaults adapt to light and dark schemes through native `color-scheme` and `light-dark()` colors. Set `nook-dock { color-scheme: dark; }` or `light` to choose explicitly; leave the default `light dark` to follow the system. Native controls, accent text contrast, floating controls, and backdrops follow the same palette. Explicit custom properties remain authoritative; use `light-dark(lightValue, darkValue)` when an override should also adapt.

Compact views use one acrylic-style frosted toolbar: a neutral translucent tint, 24px blur, mild saturation, a crisp rounded edge, a fine inset highlight, and a single elevation shadow. Buttons and setting rows sit directly on the shared material; there are no feathered masks or persistent button bubbles. The material becomes opaque when backdrop filtering is unsupported or reduced transparency is requested.

Fullscreen views share the same tint, blur, saturation, and edge highlight, extending the material to the viewport. `--nook-material-background` and `--nook-material-blur` control both variants together; per-variant overrides remain available. Both variants use the same opaque fallback for reduced transparency or unsupported backdrop filtering.

Customize it with `--nook-halo-background`, `--nook-halo-blur` (24px), `--nook-halo-inset` (-8px), `--nook-material-saturation` (125%), `--nook-material-edge`, `--nook-material-highlight`, `--nook-radius`, and `--nook-shadow`. Tap highlights are disabled; keyboard focus on the handle follows its quarter-circle outline.

References: [Microsoft Acrylic guidance for transient menus and flyouts](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic) and [Josh W. Comeau's frosted-glass examples](https://www.joshwcomeau.com/css/backdrop-filter/). This is a CSS interpretation of the material, not the native OS implementation.

```css
nook-dock {
  --nook-accent: #7560e8;
  --nook-surface: #fff;
  --nook-text: #232237;
  --nook-muted: #77768a;
  --nook-border: #e9e7ef;
  --nook-radius: 16px;
  --nook-shadow: 0 8px 32px #241a4918, 0 2px 8px #241a490a;
  --nook-duration: 180ms;
  --nook-font: system-ui, sans-serif;
  --nook-width: 304px;
  --nook-quick-width: 420px;
  --nook-z: 10000;
  --nook-label-display: none;
  --nook-padding: 16px;
  --nook-gap: 8px;
  --nook-item-size: 48px;
  --nook-surface-offset: 56px;
  --nook-edge-gap: 12px;
}
nook-dock::part(surface) {
  border-width: 2px;
}
nook-dock::part(item) {
  border-radius: 12px;
}
nook-dock::part(control) {
  accent-color: teal;
}
```

Exposed parts: `handle-tooltip`, `handle-shortcut`, `drag-hint`, `landing-zone`, `landing-outline`, `drag-preview`, `preview-handle`, `preview-mark`, `anchor`, `handle`, `mark`, `announcement`, `surface`, `header`, `back`, `heading`, `close`, `body`, `items`, `item`, `icon`, `item-label`, `tooltip`, `help`, `move-button`, `corners`, `corner-option`, `setting`, `setting-label`, `description`, `control`, `content`, `groups`, `group`, `group-heading`, and `group-body`. The handle's quarter-circle background is a pseudo-element; customize its color with `--nook-accent` or the handle itself with `::part(handle)`. Inner geometry can be overridden by styling parts. Nook's inline SVG mark remains constant.

The surface is fixed-position and uses a configurable z-index. Mount the dock near the document root, outside transformed/clipping ancestors. This version does not use the browser top layer; a host modal in the top layer can cover it.

## Motion

Menus open with a small spring overshoot. Fullscreen views keep the backdrop stable and give their content a gentler entrance. Closing is faster than opening. Corner changes settle in place around the destination corner rather than moving an exposed arc across the screen; preview targets ease in without following the pointer. Hover, press, selection, and toggle feedback use short transitions.

Timing tokens are `--nook-pop-duration` (260ms), `--nook-settle-duration` (240ms), `--nook-exit-duration` (120ms), and `--nook-duration` (180ms for general feedback). `prefers-reduced-motion` suppresses CSS and scripted effects; active settling effects are canceled if the preference changes. Disconnecting Nook cancels outstanding effects, and a new effect replaces the previous effect on the same element. No navigation or application event waits for an animation to finish.

## Stack boundaries

`src/bl/menu.js` contains the pure navigation/gesture/keybinding rules and `MenuState`, an ngin Query with declared `intents` and `onboarding` dependencies. `nook-dock` is the composition root: it provides an injected EventTarget, subscribes to the Query, and owns browser lifecycle cleanup. Disconnect unsubscribes, aborts input listeners, disconnects the DOM observer, cancels hold timers, and disposes the QueryStore/container. There is no second observable state store or app action registry.

The UI uses native DOM primitives because its contract is persistent custom-element instances, rather than an application VDOM tree. App behavior is represented only by native bubbling events; consumers can wire those into ngin Actions or any other app composition. No engine handle is passed to panel content.

## Verification

`bun run test` runs Node/Happy DOM and pure-rule tests covering persistent drafts/control identity, live addition/removal, stable relabeling, root reassignment, active-panel removal, setting synchronization, separate shortcuts, editable-field guards, navigation, directional classification, exact key modifiers, source ordering, nested groups, and zero child-node churn during navigation. Node runs the DOM harness because this Happy DOM version's MutationObserver scheduling differs under Bun.

`bun run test:browser` adds desktop/mobile Playwright coverage for rendering, keyboard navigation, live mutations, persistent forms, swipe routing, and long-press corner movement. Browser tests require an installed Chromium and permission to bind a local port. CI runs both browser projects on Ubuntu and retains failure artifacts for seven days. Browser automation does not replace real-device checks for touch gestures or browser permission dialogs.

## CI and releases

GitHub Actions runs unit/DOM tests, npm package-content checks, and desktop/mobile Chromium tests on pull requests and pushes to `main`. `CI / test` is the check to require in branch protection. The browser suite uses the installed dependency from the lockfile. `npm run check:package` verifies every exported entry point is packaged and excludes demo, test, and workflow files.

A push to `main` that changes the `package.json` version runs the same checks, publishes `@3sln/nook`, then creates a GitHub release and `v<version>` tag at the tested commit. Other package metadata changes do not publish. Stable versions use npm's `latest` tag; prereleases use `next` and create a GitHub prerelease. The initial main push also qualifies. Release jobs run serially. Release notes are generated by GitHub, and the published tarball is attached to the release.

To release:

```sh
npm version patch --no-git-tag-version
# Or use minor, major, or a specific prerelease version.
# Commit package.json with your changes and merge/push to main.
```

No build output or manual tag push is required. If publishing succeeds but GitHub release creation fails, rerun the failed workflow. An already-published version is accepted only when its tarball checksum matches the current package. The workflow rejects conflicting tags or different bytes under an existing npm version. The Release workflow also supports a manual run from `main` to retry the current version; it never replaces a published version. A changed package with an existing version requires a new version bump.

### One-time trusted publisher setup

These files target the public GitHub repository **`3sln/nook`**. If the repository name differs, update `repository`, `homepage`, and `bugs` in `package.json` and the clone URL above before publishing. This checkout's automation files must live at the root of that repository.

In the npm settings for `@3sln/nook`, configure a GitHub Actions trusted publisher:

| Field             | Value                       |
| ----------------- | --------------------------- |
| Organization/user | `3sln`                      |
| Repository        | `nook`                      |
| Workflow filename | `release.yml`               |
| Environment       | Leave empty                 |
| Allowed actions   | Enable direct `npm publish` |

The workflow uses a GitHub-hosted runner, Node.js 24 with an OIDC-capable npm CLI, and `id-token: write`. Publishing uses short-lived OIDC credentials and provenance; no `NPM_TOKEN` secret is needed. The job's GitHub token creates tags and releases. Keep the repository public for provenance. Details: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/).

If npm requires the package to exist before its settings are available, bootstrap the initial package with an authenticated local publish, then configure its trusted publisher and rerun Release. An unchanged bootstrap tarball is recognized rather than republished. Ensure the workflow file is already present on GitHub when configuring the publisher.

## License

MIT. See [LICENSE](./LICENSE).
