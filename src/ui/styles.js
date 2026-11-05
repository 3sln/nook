export default `
:host {
  -webkit-tap-highlight-color: transparent;
  color-scheme: light dark;
  --nook-accent: light-dark(#7560e8, #ad9bff);
  --nook-on-accent: light-dark(#fff, #211b35);
  --nook-surface: light-dark(#fff, #25232d);
  --nook-text: light-dark(#232237, #f2eef8);
  --nook-muted: light-dark(#77768a, #b7b0c5);
  --nook-border: light-dark(#e9e7ef, #484151);
  --nook-material-background: color-mix(
    in srgb,
    var(--nook-surface) 84%,
    transparent
  );
  --nook-material-blur: 24px;
  --nook-radius: 16px;
  --nook-shadow:
    0 8px 32px light-dark(#241a4918, #00000048),
    0 2px 8px light-dark(#241a490a, #00000024);
  --nook-duration: 180ms;
  --nook-pop-duration: 260ms;
  --nook-settle-duration: 240ms;
  --nook-exit-duration: 120ms;
  --nook-font: system-ui, sans-serif;
  --nook-z: 10000;
  --nook-padding: 16px;
  --nook-gap: 8px;
  --nook-item-size: 48px;
  --nook-surface-offset: 56px;
  --nook-edge-gap: 12px;
  font: 14px/1.5 var(--nook-font);
  color: var(--nook-text);
}
* {
  -webkit-tap-highlight-color: transparent;
  box-sizing: border-box;
}
button,
input,
select {
  font: inherit;
}
button {
  color: inherit;
  cursor: pointer;
}
button:focus-visible,
input:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 3px solid var(--nook-accent);
  outline-offset: 3px;
}
button {
  border: 0;
}
[hidden] {
  display: none !important;
}
.anchor {
  position: fixed;
  z-index: var(--nook-z);
  pointer-events: none;
}
.anchor > * {
  pointer-events: auto;
}
.anchor[data-corner^="bottom"] {
  bottom: env(safe-area-inset-bottom, 0px);
}
.anchor[data-corner^="top"] {
  top: env(safe-area-inset-top, 0px);
}
.anchor[data-corner$="right"] {
  right: env(safe-area-inset-right, 0px);
}
.anchor[data-corner$="left"] {
  left: env(safe-area-inset-left, 0px);
}
.handle {
  display: grid;
  place-items: center;
  position: relative;
  width: 48px;
  height: 48px;
  background: transparent;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}
.handle:before {
  content: "";
  position: absolute;
  inset: 16px 0 0 16px;
  background: var(--nook-accent);
  border-radius: 100% 0 0 0;
  transition: filter var(--nook-duration);
}
.handle:hover:before {
  filter: brightness(1.12);
}
.mark svg {
  display: block;
  width: 100%;
  height: 100%;
}
.mark {
  position: relative;
  color: var(--nook-on-accent);
  width: 16px;
  height: 16px;
  transform: translate(12px, 12px);
}
[data-corner$="left"] .handle:before {
  inset: 16px 16px 0 0;
  transform: scaleX(-1);
}
[data-corner$="left"] .mark {
  transform: translate(-12px, 12px);
}
[data-corner^="top"] .handle:before {
  inset: 0 0 16px 16px;
  transform: scaleY(-1);
}
[data-corner^="top"][data-corner$="left"] .handle:before {
  inset: 0 16px 16px 0;
  transform: scale(-1);
}
[data-corner^="top"] .mark {
  transform: translate(12px, -12px);
}
[data-corner^="top"][data-corner$="left"] .mark {
  transform: translate(-12px, -12px);
}
.surface {
  position: absolute;
  width: min(var(--nook-width, 304px), calc(100vw - 24px));
  max-height: min(640px, calc(100dvh - 96px));
  overflow: auto;
  background: var(--nook-surface);
  border: 1px solid var(--nook-border);
  border-radius: var(--nook-radius);
  box-shadow: var(--nook-shadow);
  padding: var(--nook-padding);
  animation: arrive var(--nook-pop-duration) cubic-bezier(0.2, 0.8, 0.2, 1);
  overscroll-behavior: contain;
}
[data-corner^="bottom"] .surface {
  bottom: var(--nook-surface-offset);
}
[data-corner^="top"] .surface {
  top: var(--nook-surface-offset);
}
[data-corner$="right"] .surface {
  right: var(--nook-edge-gap);
}
[data-corner$="left"] .surface {
  left: var(--nook-edge-gap);
}
header {
  display: flex;
  align-items: center;
  gap: var(--nook-gap);
  min-height: 36px;
  margin-bottom: 12px;
}
h2 {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  flex: 1;
  letter-spacing: -0.3px;
}
.quiet {
  background: transparent;
  color: var(--nook-muted);
  border-radius: 8px;
  min-height: 44px;
  min-width: 44px;
  padding: 8px;
}
.quiet:hover {
  background: color-mix(in srgb, var(--nook-accent) 9%, transparent);
}
.items {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--nook-gap);
}
.item {
  position: relative;
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 6px;
  min-height: var(--nook-item-size);
  padding: 10px 6px;
  background: transparent;
  border-radius: 10px;
  transition:
    background var(--nook-duration),
    transform var(--nook-duration);
}
.item:hover {
  background: color-mix(in srgb, var(--nook-accent) 8%, var(--nook-surface));
}
.icon {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  font-size: 19px;
  line-height: 1;
  flex: none;
}
.icon > * {
  grid-area: 1 / 1;
  display: grid;
  place-items: center;
  line-height: 1;
}
.icon svg {
  display: block;
  width: 20px;
  height: 20px;
  margin: 0;
  vertical-align: middle;
}
.item-label {
  display: var(--nook-label-display, none);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  white-space: nowrap;
}
.tooltip {
  left: 50%;
  transform: translateX(-50%);
  max-width: min(220px, calc(100vw - 64px));
  text-align: center;
  pointer-events: none;
  position: absolute;
  bottom: calc(100% + 6px);
  padding: 5px 9px;
  white-space: normal;
  width: max-content;
  border-radius: 7px;
  background: var(--nook-text);
  color: var(--nook-surface);
  font-size: 11px;
  opacity: 0;
  transition: opacity var(--nook-duration);
  z-index: 2;
}
.item:nth-child(4n + 1) .tooltip {
  left: 0;
  transform: none;
}
.item:nth-child(4n) .tooltip,
.item:last-child .tooltip {
  left: auto;
  right: 0;
  transform: none;
}
.item:hover .tooltip,
.item:focus-visible .tooltip {
  opacity: 1;
}
.help {
  padding: 0;
  color: var(--nook-muted);
  font-size: 13px;
}
.help strong {
  color: var(--nook-text);
}
.help p {
  margin: 0 0 12px;
}
.help p:last-child {
  margin-bottom: 0;
}
.help > p {
  margin-top: 12px;
}
[part="move-button"] {
  margin-top: 12px;
}
[part="back"] {
  margin-inline-start: -8px;
}
[part="close"] {
  display: none;
  margin-inline-end: -8px;
}
kbd {
  font: 10px var(--nook-font);
  border: 1px solid var(--nook-border);
  border-radius: 4px;
  padding: 2px 5px;
}
.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid var(--nook-border);
}
.setting:first-child {
  padding-top: 0;
}
.setting:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
.setting > [part="setting-label"] {
  min-width: 0;
  flex: 1;
}
.setting small {
  display: block;
  color: var(--nook-muted);
  font-size: 11px;
  line-height: 1.5;
  margin-top: 3px;
}
.setting input {
  accent-color: var(--nook-accent);
  width: 112px;
  max-width: 42%;
  margin: 0;
}
.setting select {
  max-width: 46%;
  min-height: 36px;
  border: 1px solid var(--nook-border);
  background: var(--nook-surface);
  color: inherit;
  border-radius: 9px;
  padding: 8px;
}
.setting input[type="checkbox"] {
  appearance: none;
  flex: none;
  max-width: none;
  width: 38px;
  height: 22px;
  border-radius: 20px;
  background: var(--nook-border);
  position: relative;
  cursor: pointer;
}
.setting input[type="checkbox"]:before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 100%;
  background: var(--nook-on-accent);
  top: 3px;
  left: 3px;
  transition: transform var(--nook-duration);
}
.setting input[type="checkbox"]:checked {
  background: var(--nook-accent);
}
.setting input[type="checkbox"]:checked:before {
  transform: translateX(16px);
}
.content {
  font-size: 13px;
}
.content > :first-child {
  margin-top: 0;
}
.content > :last-child {
  margin-bottom: 0;
}
.content form {
  display: grid;
  gap: 12px;
}
.content form > * {
  margin: 0;
}
.content label {
  display: grid;
  gap: 8px;
}
.content textarea {
  display: block;
  resize: vertical;
  min-height: 112px;
}
.content button {
  justify-self: start;
  min-height: 40px;
}
.content input,
.content textarea {
  width: 100%;
  border: 1px solid var(--nook-border);
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
  color: inherit;
  background: var(--nook-surface);
}
.content button {
  padding: 10px 16px;
  background: var(--nook-accent);
  color: var(--nook-on-accent);
  border-radius: 10px;
}
.content p {
  line-height: 1.65;
  color: var(--nook-muted);
}
.quick {
  width: min(var(--nook-quick-width, 420px), calc(100vw - 24px));
}
.quick .items {
  display: flex;
}
.quick .item {
  flex: 1;
}
.corners {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.corners button {
  background: var(--nook-border);
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 8px;
}
.dragging {
  opacity: 0.28;
  cursor: grabbing;
}
.handle.dragging::before {
  animation: none;
}
.preview,
.preview > * {
  pointer-events: none;
}
.preview .handle {
  opacity: var(--nook-preview-opacity, 0.8);
}
.preview .handle::before {
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--nook-accent) 18%, transparent);
}
[data-corner="bottom-left"] .mark svg {
  transform: rotate(90deg);
}
[data-corner="top-left"] .mark svg {
  transform: rotate(180deg);
}
[data-corner="top-right"] .mark svg {
  transform: rotate(270deg);
}

.touch-only {
  display: none;
}
.live {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
}
@keyframes arrive {
  0% {
    transform: scale(0.95);
  }
  70% {
    transform: scale(1.015);
  }
  100% {
    transform: scale(1);
  }
}
@keyframes content-arrive {
  0% {
    opacity: 0;
    transform: translateY(6px) scale(0.99);
  }
  72% {
    opacity: 1;
    transform: translateY(-1px) scale(1.004);
  }
  100% {
    opacity: 1;
    transform: none;
  }
}
@media (prefers-reduced-motion: reduce) {
  *,
  *:before,
  *:after {
    animation: none !important;
    transition: none !important;
  }
}
@media (pointer: coarse), (hover: none) {
  .tooltip,
  .keyboard-only {
    display: none !important;
  }
  .touch-only {
    display: block;
  }
  .surface {
    max-height: calc(
      100dvh - 96px - env(safe-area-inset-top, 0px) -
        env(safe-area-inset-bottom, 0px)
    );
  }
  .content input,
  .content textarea,
  .setting select,
  .setting input:not([type="checkbox"]):not([type="range"]) {
    font-size: 16px;
  }
}

/* Compact controls share one material, rather than individual button bubbles. */
.surface[data-presentation="compact"] {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  overflow: visible;
  width: max-content;
  max-width: calc(100vw - 32px);
}
.surface[data-presentation="compact"]:has(.setting) {
  width: min(var(--nook-width, 304px), calc(100vw - 32px));
}
.surface[data-presentation="compact"] .items {
  display: flex;
  gap: var(--nook-gap);
}
[data-corner$="right"] .surface[data-presentation="compact"] .items {
  justify-content: flex-end;
}
[data-corner$="left"] .surface[data-presentation="compact"] .items {
  justify-content: flex-start;
}
.surface[data-presentation="compact"] .item {
  flex: 0 0 var(--nook-item-size);
  background: var(--nook-floating-background, transparent);
  border-radius: 10px;
  box-shadow: none;
}
.surface[data-presentation="compact"] .item:hover {
  background: color-mix(in srgb, var(--nook-accent) 10%, transparent);
}
.surface[data-presentation="compact"][data-view="root"] > header {
  display: none;
}
.surface[data-presentation="compact"] kbd {
  background: var(--nook-surface);
}
.surface[data-presentation="compact"] .setting {
  background: transparent;
  border-radius: 0;
  padding: 12px 4px;
  margin: 0;
}
.surface[data-presentation="compact"] > header h2 {
  min-width: 0;
  overflow-wrap: anywhere;
}

@media (pointer: coarse), (hover: none) {
  .surface[data-presentation="expanded"] [part="close"] {
    display: inline-block;
  }
  .anchor .surface[data-presentation="expanded"] {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100dvh;
    max-height: none;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    isolation: isolate;
    padding: calc(24px + env(safe-area-inset-top, 0px))
      calc(24px + env(safe-area-inset-right, 0px))
      calc(24px + env(safe-area-inset-bottom, 0px))
      calc(24px + env(safe-area-inset-left, 0px));
    animation-name: none;
  }
  .surface[data-presentation="expanded"]::before {
    content: "";
    position: fixed;
    inset: 0;
    z-index: -1;
    background: var(--nook-backdrop, var(--nook-material-background));
    -webkit-backdrop-filter: blur(
        var(--nook-backdrop-blur, var(--nook-material-blur))
      )
      saturate(var(--nook-material-saturation, 125%));
    backdrop-filter: blur(var(--nook-backdrop-blur, var(--nook-material-blur)))
      saturate(var(--nook-material-saturation, 125%));
    box-shadow: inset 0 1px 0
      var(
        --nook-material-highlight,
        light-dark(rgb(255 255 255 / 85%), rgb(255 255 255 / 7%))
      );
    pointer-events: none;
  }
  .surface[data-presentation="expanded"] > header,
  .surface[data-presentation="expanded"] > [part="body"] {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
  }
  .surface[data-presentation="expanded"] > [part="body"] {
    animation: content-arrive var(--nook-pop-duration)
      cubic-bezier(0.2, 0.8, 0.2, 1);
    transform-origin: 50% 0;
  }
  .surface[data-presentation="expanded"] > header {
    margin-bottom: 24px;
  }
  .surface[data-presentation="expanded"] .items {
    gap: 16px;
  }
  .surface[data-presentation="expanded"] .item {
    min-height: 64px;
  }
  .surface[data-presentation="expanded"] .item-label {
    display: block;
  }
}
.groups {
  display: none;
}
@media (pointer: coarse), (hover: none) {
  .surface[data-presentation="expanded"] > [part="body"] > .items {
    display: none;
  }
  .surface[data-presentation="expanded"] .groups,
  .surface[data-presentation="expanded"] .group-body {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: var(--nook-group-gap, 16px);
  }
  .surface[data-view="root"][data-presentation="expanded"]
    > [part="body"]
    > .items:has(> .setting) {
    display: grid;
    margin-bottom: 16px;
  }
  .surface[data-view="root"][data-presentation="expanded"]
    > [part="body"]
    > .items
    > .item {
    display: none;
  }
  .surface[data-view="root"][data-presentation="expanded"]
    > [part="body"]
    > .items
    > .setting {
    grid-column: 1 / -1;
  }
  .group {
    grid-column: 1 / -1;
    min-width: 0;
  }
  .group + .group {
    margin-top: 8px;
  }
  [part="group-heading"] {
    margin: 0 0 12px;
    font-size: 13px;
    font-weight: 600;
    color: var(--nook-text);
  }
  .group .group {
    padding-inline-start: 12px;
    border-inline-start: 1px solid var(--nook-border);
  }
}

@keyframes reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.surface[data-view="commands"] {
  width: min(var(--nook-command-width, 480px), calc(100vw - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.surface[data-view="commands"] > header {
  flex: none;
}
.surface[data-view="commands"] > [part="body"] {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.command-results {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.command-search {
  flex: none;
}
[data-corner^="bottom"] .command-search {
  order: 1;
}
@media (pointer: coarse), (hover: none) {
  .surface[data-view="commands"][data-presentation="expanded"] > [part="body"] {
    flex: 1;
  }
  .surface[data-view="commands"][data-presentation="expanded"] .command-results {
    flex: 1;
  }
}
.command-search {
  width: 100%;
  min-height: 44px;
  padding: 10px 12px;
  border: 1px solid var(--nook-border);
  border-radius: 10px;
  background: transparent;
  color: var(--nook-text);
  font: inherit;
}
.command-list {
  display: grid;
  gap: 4px;
  margin-top: 0;
}
.command-result {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 3px 12px;
  padding: 12px;
  text-align: start;
  border-radius: 10px;
  background: transparent;
  color: var(--nook-text);
}
.command-result:hover,
.command-result[data-active="true"] {
  background: color-mix(in srgb, var(--nook-accent) 8%, transparent);
}
[part="command-name"] {
  font-size: 13px;
  font-weight: 550;
}
[part="command-description"] {
  color: var(--nook-muted);
  font-size: 12px;
  line-height: 1.5;
}
.command-result [part="command-description"] {
  grid-column: 1;
}
.command-result kbd {
  grid-column: 2;
  grid-row: 1 / span 2;
  align-self: center;
}
.command-empty {
  color: var(--nook-muted);
  padding: 16px 12px;
  font-size: 13px;
  margin: 0;
}
.command-form,
.command-fields {
  display: grid;
  gap: 16px;
}
.command-description {
  margin: 0;
}
.command-field {
  display: grid;
  gap: 6px;
  font-size: 13px;
}
.command-field input,
.command-field select {
  min-width: 0;
  width: 100%;
  min-height: 40px;
  border: 1px solid var(--nook-border);
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
  color: var(--nook-text);
  background: var(--nook-surface);
}
.command-field input[type="checkbox"] {
  width: 20px;
  height: 20px;
  min-height: 0;
  accent-color: var(--nook-accent);
}
.command-run {
  min-height: 44px;
  padding: 10px 16px;
  border-radius: 8px;
  background: var(--nook-accent);
  color: var(--nook-on-accent);
  justify-self: start;
}
.number {
  display: none;
  position: absolute;
  inset-block-start: -4px;
  inset-inline-end: -4px;
  min-width: 19px;
  height: 19px;
  padding: 0 4px;
  border-radius: 6px;
  background: var(--nook-text);
  color: var(--nook-surface);
  font: 10px/19px var(--nook-font);
  text-align: center;
  pointer-events: none;
  z-index: 3;
}
.anchor[data-numbering] .number:not([hidden]) {
  display: block;
}
@media (pointer: coarse), (hover: none) {
  .command-search,
  .command-field input,
  .command-field select {
    font-size: 16px;
  }
  .anchor[data-numbering] .number {
    display: none;
  }
}
.quiet svg {
  display: block;
  width: 18px;
  height: 18px;
  margin: auto;
}
.tutorial {
  font-size: 13px;
  line-height: 1.65;
  margin-bottom: 20px;
  color: var(--nook-muted);
}
.tutorial p {
  margin: 0 0 12px;
}
.tutorial strong {
  color: var(--nook-text);
}
.anchor:not([data-layout-ready]) .layout-hint {
  display: none;
}
.handle.inviting::before {
  animation: nook-invite 2.8s ease-in-out infinite;
  animation-delay: 0.8s;
}
@keyframes nook-invite {
  0%,
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--nook-accent) 22%, transparent);
    filter: brightness(1);
  }
  55% {
    box-shadow: 0 0 0 7px color-mix(in srgb, var(--nook-accent) 0%, transparent);
    filter: brightness(1.12);
  }
}
@media (prefers-reduced-motion: reduce) {
  .handle.inviting::before {
    animation: none;
  }
}
.handle-tooltip {
  position: absolute;
  width: max-content;
  max-width: min(240px, calc(100vw - 32px));
  display: grid;
  gap: 3px;
  padding: 9px 12px;
  border-radius: 10px;
  background: var(--nook-text);
  color: var(--nook-surface);
  box-shadow: var(--nook-shadow);
  text-align: start;
  font: 12px/1.5 var(--nook-font);
  opacity: 0;
  visibility: hidden;
  transition:
    opacity var(--nook-duration),
    visibility var(--nook-duration);
  pointer-events: none;
  z-index: 2;
}
.handle-tooltip [part="drag-hint"] {
  opacity: 0.8;
}
[data-corner^="bottom"] .handle-tooltip {
  bottom: calc(100% + 8px);
}
[data-corner^="top"] .handle-tooltip {
  top: calc(100% + 8px);
}
[data-corner$="right"] .handle-tooltip {
  right: 8px;
}
[data-corner$="left"] .handle-tooltip {
  left: 8px;
}
.handle:not(.dragging):not([data-tooltip-dismissed]):hover .handle-tooltip,
.handle:not(.dragging):not([data-tooltip-dismissed]):focus-visible
  .handle-tooltip {
  opacity: 1;
  visibility: visible;
}
@media (pointer: coarse), (hover: none) {
  .handle-tooltip {
    display: none;
  }
}
.surface::before,
.surface > header,
.surface > [part="body"] {
  animation: reveal var(--nook-duration) ease-out;
}
/* Acrylic-style surface for transient controls: neutral tint, strong blur,
   a defined edge, and one elevation shadow. Feathering made the material muddy. */
.surface[data-presentation="compact"] {
  isolation: isolate;
}
.surface[data-presentation="compact"]::before {
  content: "";
  position: absolute;
  inset: var(--nook-halo-inset, -8px);
  z-index: -1;
  pointer-events: none;
  border-radius: var(--nook-radius);
  border: 1px solid
    var(
      --nook-material-edge,
      light-dark(rgb(40 35 60 / 10%), rgb(255 255 255 / 14%))
    );
  background: var(--nook-halo-background, var(--nook-material-background));
  box-shadow:
    inset 0 1px 0
      var(
        --nook-material-highlight,
        light-dark(rgb(255 255 255 / 85%), rgb(255 255 255 / 7%))
      ),
    var(--nook-shadow);
  -webkit-backdrop-filter: blur(
      var(--nook-halo-blur, var(--nook-material-blur))
    )
    saturate(var(--nook-material-saturation, 125%));
  backdrop-filter: blur(var(--nook-halo-blur, var(--nook-material-blur)))
    saturate(var(--nook-material-saturation, 125%));
}
@supports not (
  (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
) {
  .surface[data-presentation="compact"]::before,
  .surface[data-presentation="expanded"]::before {
    background: var(--nook-surface);
  }
}
@media (prefers-reduced-transparency: reduce) {
  .surface[data-presentation="compact"]::before,
  .surface[data-presentation="expanded"]::before {
    background: var(--nook-surface);
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
  }
}

.landing-zone,
.landing-zone > * {
  pointer-events: none;
}
.landing-zone .handle::before {
  background: transparent;
  border: 1px dashed var(--nook-accent);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--nook-surface) 82%, transparent);
}
.landing-zone[data-selected] .handle::before {
  border: 2px solid var(--nook-accent);
  background: color-mix(in srgb, var(--nook-accent) 10%, transparent);
}
.anchor[data-draggable="false"] [part~="drag-hint"],
.anchor[data-draggable="false"] [part="move-button"] {
  display: none;
}
.corners button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.corners button[aria-pressed="true"] {
  box-shadow: inset 0 0 0 2px var(--nook-accent);
}
.handle:focus-visible {
  outline: none;
}
.handle:focus-visible::before {
  animation: none;
  box-shadow:
    0 0 0 2px var(--nook-surface),
    0 0 0 4px var(--nook-accent);
}
[data-corner="bottom-right"] .handle,
[data-corner="bottom-right"] .surface {
  transform-origin: 100% 100%;
}
[data-corner="bottom-left"] .handle,
[data-corner="bottom-left"] .surface {
  transform-origin: 0 100%;
}
[data-corner="top-left"] .handle,
[data-corner="top-left"] .surface {
  transform-origin: 0 0;
}
[data-corner="top-right"] .handle,
[data-corner="top-right"] .surface {
  transform-origin: 100% 0;
}
.quiet,
.command-result,
.command-run,
.content button,
.corners button {
  transition:
    background var(--nook-duration),
    color var(--nook-duration),
    box-shadow var(--nook-duration),
    transform 120ms ease;
}
.item:hover {
  transform: translateY(-1px);
}
.item:active,
.quiet:active,
.command-run:active,
.content button:active,
.corners button:active {
  transform: scale(0.97);
}
.landing-zone {
  animation: reveal 120ms ease-out;
}
.landing-zone .handle::before {
  transition:
    background 120ms ease,
    border-color 120ms ease,
    box-shadow 120ms ease;
}
:host([data-nook-capturing]) {
  visibility: hidden !important;
}
.enum-control {
  display: inline-grid;
  gap: 4px;
  min-width: 0;
  max-width: 48%;
}
.enum-trigger {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
  align-items: center;
  gap: 10px;
  min-height: 40px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--nook-border);
  border-radius: 10px;
  color: var(--nook-text);
  background: color-mix(in srgb, var(--nook-surface) 72%, transparent);
  text-align: start;
  transition:
    background var(--nook-duration),
    border-color var(--nook-duration);
}
.enum-trigger:hover {
  background: var(--nook-surface);
  border-color: var(--nook-accent);
}
.enum-trigger:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.enum-current {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}
[part="enum-selected-label"] {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.enum-chevron,
.enum-check {
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
}
.enum-chevron svg,
.enum-check svg {
  display: block;
  width: 16px;
  height: 16px;
}
.enum-chevron {
  color: var(--nook-muted);
}
.enum-value {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  min-height: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  clip-path: inset(50%);
  overflow: hidden;
  pointer-events: none;
}
.enum-options {
  max-height: min(440px, calc(100dvh - 168px));
  overflow: auto;
  overscroll-behavior: contain;
  padding: 4px;
  display: grid;
  gap: 6px;
}
.enum-option {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 16px;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 52px;
  padding: 12px;
  border-radius: 12px;
  text-align: start;
  background: transparent;
  transition: background var(--nook-duration);
}
.enum-option:hover,
.enum-option:focus-visible {
  background: color-mix(in srgb, var(--nook-accent) 7%, transparent);
}
.enum-option[aria-selected="true"] {
  background: color-mix(in srgb, var(--nook-accent) 10%, transparent);
}
.enum-option:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.enum-option-content {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.enum-option-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
}
.enum-option-icon svg {
  display: block;
  width: 22px;
  height: 22px;
}
[part="enum-option-label"] {
  display: block;
  font-size: 13px;
  font-weight: 550;
}
[part="enum-option-description"] {
  display: block;
  font-size: 12px;
  color: var(--nook-muted);
  line-height: 1.5;
  margin-top: 3px;
}
.enum-check {
  color: var(--nook-accent);
  visibility: hidden;
}
.enum-option[aria-selected="true"] .enum-check {
  visibility: visible;
}
.enum-empty {
  font-size: 13px;
  color: var(--nook-muted);
  margin: 0;
}
.command-field .enum-control {
  max-width: none;
  width: 100%;
}
.feedback-form {
  display: grid;
  gap: 16px;
}
.feedback-intro {
  margin: 0;
  color: var(--nook-muted);
  font-size: 13px;
}
.feedback-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.feedback-types button {
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--nook-border);
  background: transparent;
  font-size: 11px;
  min-height: 36px;
  transition:
    background var(--nook-duration),
    border-color var(--nook-duration);
}
.feedback-types button[aria-checked="true"] {
  border-color: color-mix(in srgb, var(--nook-accent) 45%, var(--nook-border));
  background: color-mix(in srgb, var(--nook-accent) 10%, transparent);
}
.feedback-label {
  display: grid;
  gap: 8px;
  font-size: 12px;
  font-weight: 550;
}
.feedback-label textarea {
  width: 100%;
  min-height: 132px;
  resize: vertical;
  font: 13px/1.6 var(--nook-font);
  border: 1px solid var(--nook-border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--nook-surface) 65%, transparent);
  color: var(--nook-text);
  padding: 12px;
}
textarea:focus-visible {
  outline: 3px solid var(--nook-accent);
  outline-offset: 3px;
}
.feedback-tools {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.feedback-tools button {
  padding: 8px 10px;
  min-height: 36px;
  background: transparent;
  border: 1px solid var(--nook-border);
  border-radius: 8px;
  font-size: 11px;
}
.feedback-tools button:hover {
  background: color-mix(in srgb, var(--nook-accent) 6%, transparent);
}
.feedback-attachments {
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
  list-style: none;
}
.feedback-attachments:empty {
  display: none;
}
.feedback-attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--nook-border);
  border-radius: 10px;
}
[part="feedback-preview"] {
  width: 44px;
  height: 36px;
  object-fit: cover;
  border-radius: 5px;
}
[part="feedback-attachment-name"] {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: 11px;
  color: var(--nook-muted);
}
[part="feedback-remove"] {
  display: grid;
  place-items: center;
  flex: none;
  min-width: 32px;
  min-height: 32px;
  background: transparent;
  border-radius: 7px;
}
[part="feedback-remove"] svg {
  width: 16px;
  height: 16px;
}
.feedback-privacy {
  margin: 0;
  font-size: 10px;
  line-height: 1.6;
  color: var(--nook-muted);
}
.feedback-status {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--nook-muted);
}
.feedback-status:empty {
  display: none;
}
.feedback-status[data-error="true"] {
  color: light-dark(#a82843, #ff9cb1);
}
.feedback-success h3 {
  font-size: 16px;
  margin: 0 0 8px;
}
.feedback-success p {
  font-size: 13px;
  color: var(--nook-muted);
  margin: 0 0 16px;
}
.feedback-success button + button {
  margin-inline-start: 8px;
}
.feedback-form [disabled] {
  opacity: 0.55;
  cursor: wait;
}
@media (pointer: coarse), (hover: none) {
  .feedback-label textarea {
    font-size: 16px;
  }
  .enum-option {
    min-height: 60px;
  }
}
.enum-error { font-size: 11px; line-height: 1.5; color: light-dark(#a82843,#ff9cb1); }
`;
