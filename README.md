# Nook

A quiet, recognizable corner for contextual actions, help, settings, and feedback. Native custom elements, persistent DOM, and an ngin-owned navigation projection. The Nook mark is fixed across integrations; colors, geometry, typography, controls, and surfaces are customizable.

## Install

```sh
npm install @3sln/nook
```

Import `@3sln/nook` once in your browser entry point, then add one `<nook-dock>` to your application. The package ships native ES modules and registers its custom elements on import. It requires a browser DOM; import it on the client in server-rendered apps. `@3sln/ngin` is installed as a dependency and remains external, so your application's bundler or import map can share one copy.

```html
<nook-dock corner="bottom-right">
  <nook-item id="share" label="Share page"></nook-item>
</nook-dock>
```

```js
import "@3sln/nook";

const dock = document.querySelector("nook-dock");
dock.addEventListener("nook-action", ({ detail }) => {
  // Handle the selected action in your app; see the event reference below.
});
```

Feedback is disabled until its submit hook is wired. Commands and Settings appear only when their capabilities are present. Tap and held-swipe picking share one root dial. Configuration belongs to each dock, through attributes, properties, and inherited CSS custom properties; there is no global configuration registry.

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
  <nook-command
    id="share-page"
    name="Share page"
    description="Share the current page"
    keybind="Alt+S"
  ></nook-command>
  <nook-item id="share" command="share-page">
    <template slot="icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <use href="#nook-icon-link"></use>
      </svg>
    </template>
  </nook-item>

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

Each dock owns only its descendants; elements from nested docks are excluded. Use one dock per app for predictable document-level shortcuts. Declarative `nook-item` (`nook-action` is a legacy alias), `nook-menu`, `nook-panel`, and `nook-setting` elements are hidden by their own shadow styles. Optionally include `nook-item,nook-action,nook-menu,nook-panel,nook-setting,nook-command,nook-arg { display:none }` in the host stylesheet to hide definitions before JavaScript loads.

- `nook-dock`: the corner handle and composition root.
- `nook-item`: a leaf choice that invokes a referenced command or emits a custom selection event.
- `nook-action`: the compatibility alias; existing `nook-action` events and standalone keybindings continue to work.
- `nook-menu`: a nested group of actions, panels, or menus.
- `nook-panel`: an overlay surface for arbitrary application UI.
- `nook-command`: a searchable command with optional declarative arguments.
- `nook-arg`: a command argument definition.
- `nook-setting`: an inline control. `type="toggle"`, `range`, `enum` (`select` is a compatibility alias), or native input types such as `color`, `number`, and `text`. `min`, `max`, `step`, and `value` reflect to the control. Toggle values use the strings `true` and `false`; the JS `value` property returns a boolean for toggles and a string for other controls.

Tap/click opens the root dial; a held swipe previews the same persistent buttons and chooses one on release. Up to six icon choices follow a curved arc. **Full menu** owns the horizontal endpoint and **Settings** owns the vertical endpoint when settings are available. The four inner positions are filled by prioritized contextual actions, panels, menus, Feedback, and Commands. Full menu always contains the complete grouped list, including choices shown in the dial. Smaller visible areas show fewer extras without moving or replacing the directional choices.

The first-use Quick tour temporarily occupies an extra slot and has a small attention badge. It is also reachable from Full menu if the dial cannot fit it. It never intercepts normal menu use. Completing it removes the choice and releases its slot for another contextual item. `--nook-root-max-items` can reduce the dial limit, up to a hard maximum of six.

```html
<nook-item label="Save" priority="100" group="Workspace"></nook-item>
<nook-item label="Share" priority="50" group="Sharing"></nook-item>
<nook-menu label="Export" priority="10" group="Workspace">
  <nook-item label="PDF"></nook-item>
  <nook-item label="Markdown"></nook-item>
</nook-menu>
```

Higher numeric `priority` values win the available extra dial slots. Equal priorities keep DOM order. `item.priority` and `item.group` reflect their attributes and update live. Groups organize the Full menu list into labeled sections; they do not create extra navigation levels. Groups appear in order of their highest-priority member, and entries retain priority order within each group. Ungrouped entries appear under Other when named groups are present. There is one projected choice per source in each view; opening or closing views does not recreate controls.

For compatibility, `root`/`.root = true` makes a nested definition eligible for the root and supplies priority 100 when no explicit priority is set. It is a preference, not a guarantee against overflow. Top-level definitions need no `root` attribute. All `nook-setting` controls live in Settings, including legacy settings carrying `root`. Individual commands remain in the Commands palette.

Feedback and Commands compete for extra slots with default priorities 30 and 10. Settings is reserved and cannot be displaced by item priority. Override them per dock:

```js
dock.priorities = { feedback: 100, settings: 50, commands: 25 };
```

Reassign the object to apply changes. Their shortcuts remain available even when their launcher is outside the root dial. Priority reflects app-provided configuration; Nook does not yet provide an end-user reorder interface or persist personal ordering. Embedders can store preferences and apply them through these properties.

`label` and `description` accept attributes or slotted templates. `slot="icon"` accepts a template or an element. Labels are accessible names; desktop tooltips include supported keybindings. Overflow entries show their labels inline. Set `--nook-label-display: block` to show text beneath root action icons. Set `hidden` or `disabled` to withdraw a definition and its descendants.

## Live DOM and persistence

Add, remove, reorder, hide, or change labels, icons, descriptions, bindings, values, and select options on the source elements. A batched MutationObserver reconciles them in the next observer turn, whether the menu is open or closed. Existing item buttons, panel inputs, and setting controls retain identity. Removing an active panel/menu closes navigation safely. Removed items release their rendered views and overflow button projections.

All surfaces are constructed before opening; navigation changes visibility, focus, and inertness. Opening and closing does not rebuild their contents. Structural changes reconcile only the affected definitions. Resizing and changes to priority/group rebalance root and overflow. Panels and setting controls retain their mounted state. An emptied open overflow returns to the root while an open child panel keeps its state.

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

Native `color`, `number`, and `text` inputs and custom `<template slot="control">` remain available. Settings always render inside Quick settings; `root` does not move controls into the dial.

Set `settings-href` on the dock to show an **All settings** link below the quick settings controls:

```html
<nook-dock settings-href="/settings">
  <nook-setting label="Dark mode" type="toggle" value="false"></nook-setting>
</nook-dock>
```

The equivalent property is `dock.settingsHref = "/settings"`. Set it to `null` or an empty string to remove the link. Changes project live without replacing controls or their drafts. A link alone makes Settings available, even without inline settings. It is a normal same-tab anchor with standard browser navigation and modified-click behavior. Its label uses Bab's `All settings` message. Style it with `::part(settings-footer)` and `::part(settings-link)`, `--nook-settings-footer-gap`, and `--nook-settings-link-color`.

Picker parts: `enum-control`, `enum-trigger`, `enum-current`, `enum-chevron`, `enum-value`, `enum-options`, `enum-option`, `enum-option-content`, `enum-option-icon`, `enum-option-text`, `enum-option-label`, `enum-option-description`, `enum-selected-label`, `enum-check`, `enum-error`, and `enum-empty`. See the [ARIA listbox interaction pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

The command palette keeps its search field at the anchored edge: top for top corners and bottom for bottom corners. Results scroll independently, including in fullscreen mobile views. Style the results viewport with `::part(command-results)`.

## Optional feedback UI

The built-in feedback launcher and shortcut are disabled until `dock.feedback.submit` is a function. Wire capabilities explicitly:

```js
import { createTabCaptureSession } from "@3sln/nook/capture";
const captureSession = createTabCaptureSession();

dock.feedback = {
  submit: async (report, { signal }) => {
    // Deliver report through your app. Resolve on success; throw on failure.
    // report = { type, message, attachments: [{ kind, file }], context }
    // file is a File/Blob or the descriptor returned by an attachment hook.
  },
  attachFiles: async (files, { signal }) => files,
  captureScreenshot: navigator.mediaDevices?.getDisplayMedia
    ? (options) => captureSession.capture(options)
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

`captureScreenshot({ root, exclude, signal })` is an optional app capability. “Capture app view” enters a session with a compact Capture / snapshot-count / Done toolbar, leaving the app navigable. Snapshot previews expand only when the count is selected; “Hide previews” or Escape collapses them back to the toolbar. Routine capture status is announced without occupying screen space. Users can take multiple snapshots, see their count, preview them, and remove individual snapshots before returning to their feedback draft. Done aborts the session signal. Nook hides only its own UI during each capture; wrapped app content stays visible. The hook receives the app root and Nook UI nodes to exclude. DOM renderers should honor both. Returned File/Blob values or app descriptors are staged for final submission, never automatically sent.

`createTabCaptureSession()` reuses one browser sharing stream across snapshots and stops its tracks when Done aborts the signal; call `stop()` for explicit cleanup. The compatibility `captureTabScreenshot(options)` helper takes one shot and immediately stops sharing. Browser permission and a user gesture are required to begin sharing. The browser owns the surface chooser, so the selected surface cannot be guaranteed. These helpers are not silent DOM screenshot services. Apps may supply a DOM-to-image hook instead, subject to that renderer's font, image, shadow-DOM, and cross-origin limitations.

Capture-session styling parts include `capture-session`, `capture-snapshot`, `capture-done`, `capture-review`, `capture-review-icon`, `capture-count`, `capture-status`, `capture-gallery`, `capture-hide-previews`, `capture-preview-image`, `capture-thumbnails`, `capture-thumbnail`, `capture-preview`, and `capture-remove`.

Feedback parts include `feedback-form`, `feedback-intro`, `feedback-types`, `feedback-type`, `feedback-label`, `feedback-message-label`, `feedback-message`, `feedback-tools`, `feedback-file-input`, `feedback-attach`, `feedback-capture`, `feedback-attachments`, `feedback-attachment`, `feedback-preview`, `feedback-attachment-name`, `feedback-remove`, `feedback-privacy`, `feedback-status`, `feedback-send`, `feedback-success`, `feedback-another`, and `feedback-done`.

## First use

Before its first opening, Nook gives a brief attention burst: about three soft pulses over six seconds, followed by a random 45–75 minute cooldown if unopened. The deadline is stored under `@3sln/nook:attention:v1`. Opening Nook stops the widget reminder and opens the usable dial immediately. A badged **Quick tour** choice provides optional, device-specific help. Escape or Back leaves it available; “Got it” acknowledges and removes it. Reduced-motion preferences disable the pulse and turn the gesture illustrations into static diagrams.

The tutorial includes small SVG loops for touch picking, keyboard navigation, and holding then dragging. They use the current theme and run only while the tutorial is visible. Its optional number-key tip appears only when browser-reported layout data is available. The dial shows concise labels where they fit without overlapping. Long labels truncate; captions that cannot fit cleanly are omitted. Alt/Option reveals numbered choices on desktop. Icons never shift when the helper appears. Set `--nook-label-display: none` for an icon-only default.

Acknowledging the tutorial records `seen` under `@3sln/nook:tutorial:v1` in localStorage. Merely opening Nook or navigating other views does not mark it seen. The preference is shared across docks on the same origin. If storage is unavailable, a document-scoped memory fallback remembers acknowledgement during the current page session.

To replay the first-use experience and its initial attention burst while developing, remove both `@3sln/nook:tutorial:v1` and `@3sln/nook:attention:v1` from localStorage and reload. `dock.open("welcome")` can replay just the tutorial without resetting stored first-use state. Only acknowledgement records the tutorial as seen; opening it and leaving with Escape keeps the badged choice available.

### Customizing the tutorial

Customize each dock's headings and button labels through its `tutorial` property:

```js
dock.tutorial = {
  title: "Meet your workspace shortcuts",
  label: "Quick tour",
  continueLabel: "Let's go",
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
    <p>Swipe sideways for full menu or vertically for settings.</p>
  </template>
  <template slot="tutorial-drag">Hold, then drag to choose a corner.</template>
</nook-dock>
```

Slot `tutorial` replaces the entire welcome body and takes precedence over individual device regions. The Continue button remains Nook-owned. With a full replacement, the embedder owns any device-specific content inside it. The drag-region template remains hidden when Nook cannot move.

After acknowledgement the built-in tour entry is removed; there is no persistent help or corner-picker menu. The demo's guide is an ordinary app-authored `nook-panel`; embedders can supply their own help in the same way. Position can be changed through dragging or the dock's `position` property.

Templates are cloned once on insertion/replacement. Unrelated mutations and navigation preserve mounted custom content and form state. Replace a template element to apply new content; removing it restores the built-in region. Listeners on inert template nodes are not cloned; use custom elements or bubbling events. Custom content renders in the dock's shadow root, so include a `<style>` in the template or use the exposed parts.

Supply `tutorial-keyboard-graphic`, `tutorial-touch-graphic`, or `tutorial-drag-graphic` templates to replace individual illustrations without replacing the copy. `--nook-tutorial-graphic-width` sets their maximum width (360px by default). The SVGs expose `tutorial-graphic` and their respective graphic parts.

Style `::part(tutorial)`, `::part(tutorial-desktop)`, `::part(tutorial-touch)`, `::part(tutorial-drag)`, and `::part(tutorial-continue)`. The welcome surface also exposes the shared `heading`, `header`, `body`, and `surface` parts. They inherit Nook's color, typography, spacing, and animation tokens.

## SVG sprite

Nook includes its own consistent line icons in a single SVG symbol sprite per dock's shadow root. Built-in launchers, navigation, and the demo use `<use>` references; More uses a three-dot icon, without the Mac command glyph. The Nook mark retains its fixed geometry.

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

`nook-command` is a hidden declarative definition with required nonempty `name` and `description` attributes. Valid, available commands automatically add a Commands launcher to root/overflow allocation. Individual commands do not appear as ordinary menu items. Removing the last valid command withdraws the launcher and closes an open palette. Missing required metadata, `hidden`, and `disabled` withdraw a command until corrected. Definitions are discovered inside the dock, including nested contexts.

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

## Items and commands

Commands declare reusable operations. Items declare where a choice appears. Submenus remain `nook-menu` containers, and controls remain `nook-setting` elements.

```html
<nook-command
  id="save"
  name="Save changes"
  description="Save the current draft"
  keybind="Alt+S"
></nook-command>
<nook-menu label="File">
  <nook-item command="save"></nook-item>
  <nook-item id="custom-flow" label="Custom workflow"></nook-item>
</nook-menu>
```

`command` is a command ID within the same dock; `item.command` reflects that attribute. A linked item inherits the command's name, icon, and shortcut unless it supplies its own label or icon. The command owns the keybinding: an item's own `keybind` is ignored when it references a command, and new standalone items do not register shortcuts. Legacy standalone `nook-action` definitions retain their old bindings.

Selecting a new item first emits cancelable `nook-select` with `{ source, id, command, context }`. `command` is the resolved element or `null` for a custom item. Call `preventDefault()` to handle selection yourself. Otherwise a linked item enters the same command argument form used by the palette, or executes a command without arguments. Multiple items share one form and one execution path. Shortcuts invoke the command directly without selecting a particular item.

```js
dock.addEventListener("nook-select", (event) => {
  if (event.detail.id === "custom-flow") {
    event.preventDefault();
    // Open an app-owned flow. The app decides when to close Nook.
  }
});
dock.addEventListener("nook-command", (event) => {
  if (event.detail.id === "save") saveDraft();
});
```

Missing, invalid, hidden, or disabled referenced commands withdraw their items from the menu. Labels, icons, shortcuts, references, and command availability update live. Existing `nook-action` declarations can reference commands too; they keep their cancelable `nook-action` hook before invocation. No network requests or operation implementations are supplied by Nook.

## Compact and expanded views

The root is a compact icon arc on desktop and mobile, with individually surfaced choices. Other small menus float without a surrounding card; submenu views through four; settings stay compact through three controls. The root shows only its items. Floating nested menus share one restrained frosted surface for contrast over app content.

Larger views use a contained card on desktop. On touch/coarse-pointer or hoverless devices they fill the viewport over a blurred, tinted backdrop, with safe-area padding, a close/back header, and scrollable content. Adding/removing definitions updates presentation live without remounting their UI. Arbitrary panels and the first-use tutorial default to expanded presentation because their content size is not implied by an item count.

Once navigation enters an expanded view, descendants retain expanded presentation until Back returns above that ancestor. On mobile, nested submenu trees appear as labeled sections within the fullscreen view, including deeper nested groups. Leaf panels still open their own view and return through the existing navigation path. Group launch buttons are reconciled ahead of time; actual panels and controls retain one mounted instance. Group labels, source order, and additions/removals update live. Definitions marked `root` are excluded from their original submenu. Desktop keeps its normal submenu navigation within the retained card layout.

The close button appears only in fullscreen mobile views. Compact and desktop views close through the corner handle, clicking outside, or Escape. The fullscreen close button also resets navigation. Presentation is inherited from expanded ancestors even if a child requests compact presentation; leaving that branch restores its normal layout.

Embedders can override the default with `presentation="compact"` or `presentation="expanded"` on a `nook-menu`/`nook-panel`, or `root-presentation`, `settings-presentation`, `overflow-presentation` (or legacy `full-presentation`), `welcome-presentation` on the dock. Removing the override restores automatic selection. Use explicit presentation for custom content with unusual dimensions.

Customize floating control backgrounds with `--nook-floating-background`; customize the viewport layer with `--nook-backdrop` and `--nook-backdrop-blur` (defaults to the shared 24px material blur). Group spacing uses `--nook-group-gap` (default `16px`).

## Events and application behavior

```js
const dock = document.querySelector("nook-dock");
dock.context = { route: location.pathname, documentId: "current-document" };

dock.addEventListener("nook-select", (event) => {
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

Tap/click opens the root menu, with action icons. The device-specific introduction is shown on first use. Touch/coarse-pointer or hoverless devices hide keyboard hints and show swipe instructions instead. These capability queries update live when browser emulation or input capabilities change. Clicking outside closes it. Hold for 450ms, then drag. The live handle stays anchored and dims while a non-interactive preview shows the destination corner; release commits that corner. Cancellation restores the original placement. The mark rotates to match each corner. The handle has a 48px touch target and a 32px visible corner with the same recognizable quarter-circle shape.

Fast swipes open Full menu horizontally or diagonally and Settings vertically. A slower held swipe reveals the same root dial used by tapping. Swipes have a 32px distance threshold and broad directional bands. Empty surfaces do not activate from gestures or shortcuts. Gestures start only on the handle, leaving application scrolling alone. Release directly on a dial choice to choose it; releasing elsewhere cancels. Extra choices never receive directional swipe bindings.

| Desktop action  | Default       | Dock attribute     |
| --------------- | ------------- | ------------------ |
| Main/root menu  | `Shift+?`     | `root-keybind`     |
| Settings        | `Alt+Shift+S` | `settings-keybind` |
| More / overflow | `Alt+Shift+Q` | `overflow-keybind` |
| Feedback        | `Alt+Shift+F` | `feedback-keybind` |

`quick-keybind` remains a compatibility alias when `overflow-keybind` is absent. Set an empty `overflow-keybind` to disable the default.

Designate the feedback action/panel with `feedback`. The first available designated item wins. Any action, panel, or submenu, including a root item, may also declare `keybind` or set `.keybind`. Bindings use `Ctrl`, `Alt`, `Meta`, `Shift` plus `KeyboardEvent.key`, for example `Meta+Shift+K`. Modifiers must match exactly. Set an empty dock binding attribute to disable that default. Dock defaults take precedence over item bindings; otherwise the first available item in DOM order wins. Browser/OS-reserved bindings may not reach the page.

Shortcuts ignore editable elements, composition, repeated presses, and already-prevented events. Inside a menu, arrows cycle focus, Home/End jump, Enter/Space activate buttons, and Alt/Option+1–9 chooses the corresponding displayed action. Hold Alt/Option to reveal assigned numbers alongside item labels without moving the root arc; other icon menus use readable inline rows; release it or leave the window to hide them. Plain number keys never activate items. Tab cycles within the current surface. Escape closes the entire menu and clears navigation; reopening starts at the root. Backspace (the Mac Delete key) goes back one level. Backspace/Delete retains normal editing behavior in text fields. Native editing keys retain their behavior inside controls. Focus returns to the element that opened the menu. Reduced-motion preferences disable animation.

```js
dock.open(); // root
dock.open("settings");
dock.open("overflow"); // grouped overflow (More)
// Legacy "quick" and "full" view names open the same surface.
dock.open(document.querySelector("#feedback")); // a panel/menu element
dock.close();
dock.setAttribute("corner", "top-left");
```

## Anchor positions

Nook supports eight positions: `top-left`, `top-center`, `top-right`, `right-center`, `bottom-right`, `bottom-center`, `bottom-left`, and `left-center`.

```html
<nook-dock position="right-center" disabled-positions="top-left top-center">
  <!-- app definitions -->
</nook-dock>
```

```js
dock.position = "bottom-center";
dock.disabledPositions = ["top-center", "left-center"];
dock.addEventListener("nook-position-change", ({ detail }) => {
  // Persist detail.preferredPosition in your application's preferences, if desired.
});
```

The default position policy hides `top-center` and `bottom-center` on touch/coarse-pointer or hoverless screens narrower than 480px in portrait orientation. They become available in landscape. Explicit `disabled-positions` constraints always take precedence. Set `position-policy="all"` to keep all otherwise-allowed positions eligible at every viewport size.

`dock.availablePositions` returns the current eligible positions. Nook remembers `dock.preferredPosition` when a viewport change temporarily requires a different actual `dock.position`, then restores the preference when it becomes eligible. A deliberate position change, including reselecting the current fallback, replaces that preference. `nook-position-change` reports `position`, `preferredPosition`, and `reason` (`preference` or `availability`); persist the preferred value when saving user placement. Height-only resizes while a text field is focused preserve the existing anchor policy, so keyboard-related resizing does not turn portrait into landscape.

Corners retain the small quarter-circle handle. Edge centers use a shallow semicircle with the same mark oriented toward the app. Menus open inward from the chosen edge, and fullscreen mobile views stay fixed to the viewport. For side-center command palettes, a bounded height keeps the search field stable as results change; `--nook-command-height` customizes that desktop height.

`corner` and `disabled-corners` / `.disabledCorners` remain compatible aliases. Both disabled attributes are combined, so reserved corners stay unavailable when edge centers are enabled. `position` wins over `corner` for initial placement; both attributes reflect subsequent changes. Legacy `nook-corner-change` still fires alongside `nook-position-change`.

During dragging, every allowed corner/center is outlined and the closest one is highlighted. The actual handle stays anchored until release. Changing constraints updates the preview immediately. If no other position is available, dragging and its hints are disabled. Blocking the current position moves Nook to the nearest allowed anchor; blocking every position retains the current anchor and disables dragging. Unknown constraint names are ignored. Swipes, opening, and keyboard navigation remain available.

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
  --nook-overflow-width: 360px;
  --nook-root-max-items: 6;
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

Exposed parts: `handle-tooltip`, `handle-shortcut`, `drag-hint`, `landing-zone`, `landing-outline`, `drag-preview`, `preview-handle`, `preview-mark`, `anchor`, `handle`, `mark`, `announcement`, `surface`, `header`, `back`, `heading`, `close`, `body`, `items`, `item`, `icon`, `item-label`, `tooltip`, `tooltip-text`, `dial-caption`, `tutorial-badge`, `setting`, `setting-label`, `description`, `control`, `content`, `groups`, `group`, `group-heading`, and `group-body`. The handle's quarter-circle background is a pseudo-element; customize its color with `--nook-accent` or the handle itself with `::part(handle)`. Inner geometry can be overridden by styling parts. Nook's inline SVG mark remains constant.

The surface is fixed-position and uses a configurable z-index. Mount the dock near the document root, outside transformed/clipping ancestors. This version does not use the browser top layer; a host modal in the top layer can cover it.

Overflow exposes `overflow-groups`, `overflow-group`, `overflow-group-heading`, and `overflow-group-body` parts alongside the standard item parts. `--nook-overflow-width` controls its desktop width; `--nook-keyboard-width` controls temporary labeled layouts in nested icon menus. The root arc keeps its position and size while Alt/Option labels appear.

Typography uses a shared hierarchy: 16px semibold headings, 14px primary text and command names, 13px control labels, and 12px descriptions/captions. Headings have a tighter line height; supporting text uses more breathing room and starts at the same inline edge. Fine print stays at 12px, and touch text inputs keep their 16px minimum. Customize `--nook-font`, `--nook-text-xs`, `--nook-text-sm`, `--nook-text-md`, `--nook-text-lg`, `--nook-line-height`, `--nook-heading-weight`, and `--nook-label-weight` to change the hierarchy consistently. `--nook-invite-cycle` (2s) and `--nook-invite-delay` (200ms) style the attention burst; the six-second budget and randomized cooldown are owned by the onboarding provider.

After wrapping and switching long-label menus to rows, extreme metadata is visually clamped: headings to four lines (two in short viewports), item/setting labels and descriptions to three, command names and filenames to two, and group headings to two. Full text stays in the DOM and existing accessible names/descriptions. Input values and app-owned panel content are never shortened; their controls or body scroll instead.

Settings and feedback use wider form layouts by default: 420px and 520px respectively, constrained to the visible app bounds. Override them with `--nook-settings-width` and `--nook-feedback-width`; an explicit shared `--nook-width` still supplies their fallback. Expanded touch views continue to fill the available viewport. Tooltip padding belongs to `::part(tooltip)`; its separately clamped text is exposed as `::part(tooltip-text)`, so long labels retain space below the last visible line.

Customize these limits with `--nook-heading-lines`, `--nook-label-lines`, `--nook-description-lines`, `--nook-command-name-lines`, `--nook-group-lines`, `--nook-filename-lines`, and `--nook-tooltip-lines`. Rich option content has a `--nook-option-content-max-height` budget (12rem by default). `setting-name`, `feedback-success-heading`, and `feedback-success-message` are separately styleable parts.

## Motion

Menus open with a small spring overshoot. Fullscreen views keep the backdrop stable and give their content a gentler entrance. Closing is faster than opening. Corner changes settle in place around the destination corner rather than moving an exposed arc across the screen; preview targets ease in without following the pointer. Hover, press, selection, and toggle feedback use short transitions.

Timing tokens are `--nook-pop-duration` (260ms), `--nook-settle-duration` (240ms), `--nook-exit-duration` (120ms), and `--nook-duration` (180ms for general feedback). `prefers-reduced-motion` suppresses CSS and scripted effects; active settling effects are canceled if the preference changes. Disconnecting Nook cancels outstanding effects, and a new effect replaces the previous effect on the same element. No navigation or application event waits for an animation to finish.

## Stack boundaries

`src/bl/menu.js` contains the pure navigation/gesture/keybinding rules and `MenuState`, an ngin Query with declared `intents` and `onboarding` dependencies. `nook-dock` is the composition root: it provides an injected EventTarget, subscribes to the Query, and owns browser lifecycle cleanup. Disconnect unsubscribes, aborts input listeners, disconnects the DOM observer, cancels hold timers, and disposes the QueryStore/container. There is no second observable state store or app action registry.

The UI uses native DOM primitives because its contract is persistent custom-element instances, rather than an application VDOM tree. App behavior is represented only by native bubbling events; consumers can wire those into ngin Actions or any other app composition. No engine handle is passed to panel content.

## Verification

`bun run test` runs Node/Happy DOM and pure-rule tests covering persistent drafts/control identity, live addition/removal, stable relabeling, root reassignment, active-panel removal, setting synchronization, separate shortcuts, editable-field guards, navigation, directional classification, exact key modifiers, source ordering, nested groups, and zero child-node churn during navigation. Node runs the DOM harness because this Happy DOM version's MutationObserver scheduling differs under Bun.

`bun run test:browser` adds desktop/mobile Playwright coverage for rendering, keyboard navigation, live mutations, persistent forms, swipe routing, and long-press corner movement. Browser tests require an installed Chromium and permission to bind a local port. CI runs both browser projects on Ubuntu and retains the HTML report, stress screenshots, and failure traces for seven days. Browser automation does not replace real-device checks for touch gestures or browser permission dialogs.

### Browser stress lab

With the dev server running, open [the stress lab](http://localhost:4178/nook/demo/stress.html). It provides 80 actions with long group names, 40 settings, 60 rich choices per enum, 35 commands, long unbroken identifiers, multilingual text, large-type controls, nested menus, and feedback with long filenames. Switch scenarios, resize the viewport, and drag between available anchors.

```sh
npm run test:browser -- stress.spec.js
```

The browser stress suite checks horizontal overflow, panel bounds, last-control reachability, header/close visibility while scrolling, enum selection, live control identity, command-search stability, large text at 280px width, and portrait/landscape preference restoration. It attaches screenshots of the scenarios to the Playwright HTML report. Height-only viewport resizing with a focused text field exercises the keyboard-resize guard; it does not simulate every native on-screen keyboard behavior. Real-device validation remains necessary.

Long-label submenus use rows instead of narrow icon tiles. Large views scroll their body while retaining the header, and very long headings have their own bounded area. Descriptions, identifiers, and group headings wrap rather than widening the panel. Small-screen text/range/enum settings place the control below its label; toggles stay alongside their labels.

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

### App boundaries and elevation

A dock containing only Nook definitions anchors to the viewport. To anchor within the app area below a header or above a bottom bar, wrap the live app in the dock:

```html
<header>App bar</header>
<nook-dock style="--nook-handle-z: 20; --nook-overlay-z: 1000">
  <main><!-- Existing application, rendered through a slot --></main>
  <nook-item label="Share"></nook-item>
</nook-dock>
<footer>Bottom bar</footer>
```

The dock's visible rectangle becomes the anchor boundary and updates on resize and scrolling. Nook follows the Visual Viewport when the on-screen keyboard opens, resizes, or pans the page, keeping bottom anchors above it and constraining menus to the remaining visible app area. Browsers without Visual Viewport support use window resize events. Give the wrapper its intended size using your app layout. App nodes are not cloned. `boundary="viewport"` opts out; `boundary="self"` explicitly uses the dock rectangle. `--nook-inset-top`, `--nook-inset-right`, `--nook-inset-bottom`, and `--nook-inset-left` provide additional clearance. `--nook-z` sets the default elevation; `--nook-handle-z`, `--nook-overlay-z`, and `--nook-drag-z` independently override the handle, menus, and drag previews. Normal CSS stacking-context constraints still apply.

### Localization with Bab

Each dock uses `@3sln/bab` with the `nook` scope. Supply a catalogue and locale, or pass your existing Bab translator as `dock.localization`:

```js
dock.localization = {
  locale: "es",
  catalogue: {
    nook: {
      Settings: "Ajustes",
      More: "Más",
      "Full menu": "Todas las acciones",
      "Search commands": "Buscar comandos",
      "{#} snapshots": "{#} capturas",
      "{#} snapshot": "{#} captura",
    },
  },
};
```

Without an explicit locale, Nook follows its `lang` attribute, then the document language. Untranslated messages fall back to their English source text. Reassign `localization` to change language or catalogue live; existing controls and drafts are preserved. Built-in text, accessible names, authored labels/descriptions, command search text, and snapshot counts use the translator. App-owned template content remains app-owned. Set `dir` on the dock or an ancestor for right-to-left presentation.

### Held swipe dial

Fast horizontal and diagonal swipes open **Full menu**, including items already visible in the root menu; vertical swipes open settings. Hold a swipe outside Nook briefly to reveal the same root dial, with Settings, Full menu, and up to four prioritized extras, then release directly on a choice. Releasing anywhere else cancels. Its opacity follows distance from Nook. A clear inner gap separates options from the handle; moving back inside that area cancels selection. Long-pressing before moving continues to drag the handle. Dial parts are `swipe-dial`, `swipe-dial-option`, `swipe-dial-icon`, and `swipe-dial-label`. `dock.open("all")` opens the complete list programmatically.
