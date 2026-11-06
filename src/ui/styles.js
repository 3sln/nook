import { tutorialGraphicsStyles } from "./tutorialGraphics.js";
export default `
:host {
  display: block;
  position: relative;
  min-width: 0;
  -webkit-tap-highlight-color: transparent;
  --nook-accent: light-dark(#7560e8, #ad9bff);
  --nook-on-accent: light-dark(#fff, #211b35);
  --nook-surface: light-dark(#fff, #25232d);
  --nook-text: light-dark(#232237, #f2eef8);
  --nook-muted: light-dark(#77768a, #b7b0c5);
  --nook-border: light-dark(#e9e7ef, #484151);
  --nook-material-background: color-mix(
    in srgb,
    var(--nook-surface) 41%,
    transparent
  );
  --nook-material-blur: 7.5px;
  --nook-radius: 16px;
  --nook-shadow:
    0 8px 32px light-dark(#241a4918, #00000048),
    0 2px 8px light-dark(#241a490a, #00000024);
  --nook-duration: 180ms;
  --nook-pop-duration: 260ms;
  --nook-settle-duration: 240ms;
  --nook-exit-duration: 120ms;
  --nook-font: system-ui, sans-serif;
  --nook-text-xs: 12px;
  --nook-text-sm: 13px;
  --nook-text-md: 14px;
  --nook-text-lg: 16px;
  --nook-line-height: 1.55;
  --nook-heading-weight: 600;
  --nook-label-weight: 550;
  --nook-z: 10000;
  --nook-padding: 16px;
  --nook-gap: 8px;
  --nook-item-size: 48px;
  --nook-root-max-items: 6;
  --nook-surface-offset: 56px;
  --nook-edge-gap: 12px;
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
.root-measure {
  width: var(--nook-item-size);
  margin-inline-end: var(--nook-gap);
  margin-block-start: var(--nook-surface-offset);
  margin-block-end: var(--nook-edge-gap);
}
.anchor {
  font: var(--nook-text-md)/var(--nook-line-height) var(--nook-font);
  color: var(--nook-text);
  color-scheme: var(--nook-color-scheme, var(--nook-inherited-color-scheme, light dark));
  text-align: start;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
  position: fixed;
  z-index: var(--nook-z);
  pointer-events: none;
}
.anchor > * {
  pointer-events: auto;
}
.anchor[data-corner^="bottom"] {
  bottom: var(--nook-bound-bottom, env(safe-area-inset-bottom, 0px));
}
.anchor[data-corner^="top"] {
  top: var(--nook-bound-top, env(safe-area-inset-top, 0px));
}
.anchor[data-corner$="right"] {
  right: var(--nook-bound-right, env(safe-area-inset-right, 0px));
}
.anchor[data-corner$="left"] {
  left: var(--nook-bound-left, env(safe-area-inset-left, 0px));
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
  width: min(var(--nook-width, 304px), calc(var(--nook-bound-width, 100vw) - 24px));
  max-height: min(640px, calc(var(--nook-bound-height, 100dvh) - 96px));
  overflow: auto;
  background: var(--nook-material-background);
  -webkit-backdrop-filter: blur(var(--nook-material-blur));
  backdrop-filter: blur(var(--nook-material-blur));
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
  font-size: var(--nook-text-lg);
  line-height: 1.25;
  text-wrap: balance;
  font-weight: var(--nook-heading-weight);
  margin: 0;
  flex: 1;
  letter-spacing: -0.015em;
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
.item:focus-within { z-index: 2; }
.item:hover { z-index: 3; }
.item[data-selected] { z-index: 3; }
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
  line-height: 1.35;
  font-weight: var(--nook-label-weight);
  display: var(--nook-label-display, none);
  font-size: var(--nook-text-xs);
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  white-space: nowrap;
}
.tooltip {
  left: 50%;
  transform: translateX(-50%);
  max-width: min(220px, calc(var(--nook-bound-width, 100vw) - 64px));
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
  font-size: var(--nook-text-xs);
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
[part~="back"] {
  margin-inline-start: -8px;
}
[part~="close"] {
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
.setting:last-child,
.setting:has(+ [part~="settings-footer"]) {
  padding-bottom: 0;
  border-bottom: 0;
}
.setting > [part~="setting-label"] {
  font-size: var(--nook-text-sm);
  font-weight: var(--nook-label-weight);
  line-height: 1.4;
  min-width: 0;
  flex: 1;
}
.setting small {
  font-weight: 400;
  display: block;
  color: var(--nook-muted);
  font-size: var(--nook-text-xs);
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
  font-size: var(--nook-text-sm);
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
      var(--nook-bound-height, 100dvh) - 96px - env(safe-area-inset-top, 0px) -
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
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  padding: 0;
  overflow: visible;
  width: max-content;
  max-width: calc(var(--nook-bound-width, 100vw) - 32px);
}
.surface[data-presentation="compact"]:has(.setting),
.surface[data-presentation="compact"][data-view="settings"] {
  width: min(var(--nook-width, 304px), calc(var(--nook-bound-width, 100vw) - 32px));
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
  .surface[data-presentation="expanded"] [part~="close"] {
    display: inline-block;
  }
  .anchor .surface[data-presentation="expanded"] {
    position: fixed;
    inset: 0;
    width: var(--nook-bound-width, 100vw);
    height: var(--nook-bound-height, 100dvh);
    max-height: none;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    background: transparent;
    -webkit-backdrop-filter: none;
    backdrop-filter: none;
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
      saturate(var(--nook-material-saturation, 100%));
    backdrop-filter: blur(var(--nook-backdrop-blur, var(--nook-material-blur)))
      saturate(var(--nook-material-saturation, 100%));
    box-shadow: inset 0 1px 0
      var(
        --nook-material-highlight,
        light-dark(rgb(255 255 255 / 85%), rgb(255 255 255 / 7%))
      );
    pointer-events: none;
  }
  .surface[data-presentation="expanded"] > header,
  .surface[data-presentation="expanded"] > [part~="body"] {
    width: 100%;
    max-width: 560px;
    margin-inline: auto;
  }
  .surface[data-presentation="expanded"] > [part~="body"] {
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
  .surface[data-presentation="expanded"] > [part~="body"] > .items {
    display: none;
  }
  .surface[data-presentation="expanded"] .groups,
  .surface[data-presentation="expanded"] .group-body {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(64px, 100%), 1fr));
    gap: var(--nook-group-gap, 16px);
  }
  .surface[data-view="root"][data-presentation="expanded"]
    > [part~="body"]
    > .items:has(> .setting) {
    display: grid;
    margin-bottom: 16px;
  }
  .surface[data-view="root"][data-presentation="expanded"]
    > [part~="body"]
    > .items
    > .item {
    display: none;
  }
  .surface[data-view="root"][data-presentation="expanded"]
    > [part~="body"]
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
  [part~="group-heading"] {
    margin: 0 0 12px;
    font-size: var(--nook-text-sm);
    font-weight: var(--nook-heading-weight);
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
  width: min(var(--nook-command-width, 480px), calc(var(--nook-bound-width, 100vw) - 24px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.surface[data-view="commands"] > header {
  flex: none;
}
.surface[data-view="commands"] > [part~="body"] {
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
  .surface[data-view="commands"][data-presentation="expanded"] > [part~="body"] {
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
[part~="command-name"] {
  font-size: var(--nook-text-md);
  line-height: 1.4;
  font-weight: var(--nook-label-weight);
}
[part~="command-description"] {
  color: var(--nook-muted);
  font-size: var(--nook-text-xs);
  line-height: 1.5;
}
.command-result [part~="command-description"] {
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
  font-size: var(--nook-text-sm);
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
  font-size: var(--nook-text-sm);
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
  font-size: var(--nook-text-sm);
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
  animation: nook-invite var(--nook-invite-cycle, 2s) ease-out infinite;
  animation-delay: var(--nook-invite-delay, 200ms);
}
@keyframes nook-invite {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--nook-accent) 30%, transparent);
    filter: brightness(1);
  }
  45% {
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--nook-accent) 20%, transparent);
    filter: brightness(1.12);
  }
  100% {
    box-shadow: 0 0 0 10px color-mix(in srgb, var(--nook-accent) 0%, transparent);
    filter: brightness(1);
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
  max-width: min(240px, calc(var(--nook-bound-width, 100vw) - 32px));
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
.handle-tooltip [part~="drag-hint"] {
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
.surface > [part~="body"] {
  animation: reveal var(--nook-duration) ease-out;
}
/* Shared dial material for transient controls: light tint, subtle blur,
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
    saturate(var(--nook-material-saturation, 100%));
  backdrop-filter: blur(var(--nook-halo-blur, var(--nook-material-blur)))
    saturate(var(--nook-material-saturation, 100%));
}
@supports not (
  (backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))
) {
  .surface[data-presentation="compact"]::before,
  .surface[data-presentation="expanded"],
  .surface[data-presentation="expanded"]::before {
    background: var(--nook-surface);
  }
}
@media (prefers-reduced-transparency: reduce) {
  .surface[data-presentation="compact"]::before,
  .surface[data-presentation="expanded"],
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
.anchor[data-draggable="false"] [part~="drag-hint"] {
  display: none;
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
.content button {
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
.content button:active {
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
:host([data-nook-capturing]) .anchor,
:host([data-bound-hidden]) .anchor { visibility: hidden !important; pointer-events: none !important; }
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
[part~="enum-selected-label"] {
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
  max-height: min(440px, calc(var(--nook-bound-height, 100dvh) - 168px));
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
[part~="enum-option-label"] {
  display: block;
  font-size: var(--nook-text-sm);
  font-weight: var(--nook-label-weight);
}
[part~="enum-option-description"] {
  display: block;
  font-size: var(--nook-text-xs);
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
  font-size: var(--nook-text-sm);
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
  font-size: var(--nook-text-sm);
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
  font-size: var(--nook-text-xs);
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
  font-size: var(--nook-text-xs);
  font-weight: var(--nook-label-weight);
}
.feedback-label textarea {
  width: 100%;
  min-height: 132px;
  resize: vertical;
  font: var(--nook-text-md)/1.6 var(--nook-font);
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
  font-size: var(--nook-text-xs);
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
[part~="feedback-preview"] {
  width: 44px;
  height: 36px;
  object-fit: cover;
  border-radius: 5px;
}
[part~="feedback-attachment-name"] {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-size: var(--nook-text-xs);
  color: var(--nook-muted);
}
[part~="feedback-remove"] {
  display: grid;
  place-items: center;
  flex: none;
  min-width: 32px;
  min-height: 32px;
  background: transparent;
  border-radius: 7px;
}
[part~="feedback-remove"] svg {
  width: 16px;
  height: 16px;
}
.feedback-privacy {
  margin: 0;
  font-size: var(--nook-text-xs);
  line-height: 1.6;
  color: var(--nook-muted);
}
.feedback-status {
  margin: 12px 0 0;
  font-size: var(--nook-text-xs);
  color: var(--nook-muted);
}
.feedback-status:empty {
  display: none;
}
.feedback-status[data-error="true"] {
  color: light-dark(#a82843, #ff9cb1);
}
.feedback-success h3 {
  font-size: var(--nook-text-lg);
  font-weight: var(--nook-heading-weight);
  line-height: 1.3;
  margin: 0 0 8px;
}
.feedback-success p {
  font-size: var(--nook-text-sm);
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
.enum-error { font-size: var(--nook-text-xs); line-height: 1.5; color: light-dark(#a82843,#ff9cb1); }
.surface:is([data-view="full"], [data-view="all"]) {
  width: min(var(--nook-overflow-width, 360px), calc(var(--nook-bound-width, 100vw) - 32px));
}
.surface:is([data-view="full"], [data-view="all"]) > [part~="body"] > .items {
  display: none;
}
.overflow-groups {
  display: grid;
  gap: 20px;
}
[part~="overflow-group-heading"] {
  margin: 0 0 6px;
  padding-inline: 12px;
  font-size: var(--nook-text-xs);
  font-weight: var(--nook-heading-weight);
  line-height: 1.4;
  color: var(--nook-muted);
}
[part~="overflow-group-body"] {
  display: grid;
  gap: 4px;
}
.overflow-groups .item {
  flex-direction: row;
  justify-content: flex-start;
  gap: 12px;
  min-width: 0;
  min-height: 44px;
  padding: 10px 12px;
  text-align: start;
}
.overflow-groups .item-label {
  display: block;
  flex: 1;
  text-align: start;
  font-size: var(--nook-text-sm);
  white-space: normal;
  overflow-wrap: anywhere;
}
.overflow-groups .tooltip { display: none; }
@media (pointer: coarse), (hover: none) {
  .anchor .surface:is([data-view="full"], [data-view="all"])[data-presentation="expanded"] { width: var(--nook-bound-width, 100vw); }
  .overflow-groups .item { min-height: 48px; }
}

@media (hover: hover) and (pointer: fine) {
  .anchor[data-numbering] .surface:not([data-view="root"]):not([data-view="commands"]):not([data-view="full"]):not([data-view="all"]):has(.item:not([hidden])) {
    width: min(var(--nook-keyboard-width, 320px), calc(var(--nook-bound-width, 100vw) - 32px));
  }
  .anchor[data-numbering] .surface:not([data-view="full"]):not([data-view="all"]) > [part~="body"] > .items {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 4px;
  }
  .anchor[data-numbering] .item {
    flex: 0 0 auto;
    flex-direction: row;
    justify-content: flex-start;
    gap: 10px;
    min-height: 44px;
    padding: 10px 12px;
    text-align: start;
  }
  .anchor[data-numbering] .item-label {
    display: block;
    flex: 1;
    min-width: 0;
    max-width: none;
    white-space: normal;
    overflow-wrap: anywhere;
    font-size: var(--nook-text-sm);
  }
  .anchor[data-numbering] .item .number { order: -2; }
  .anchor[data-numbering] .item .icon { order: -1; }
  .anchor[data-numbering] .number {
    position: static;
    flex: none;
    min-width: 24px;
    height: 24px;
    border: 1px solid var(--nook-border);
    border-radius: 6px;
    background: color-mix(in srgb, var(--nook-accent) 8%, var(--nook-surface));
    color: var(--nook-text);
    font: var(--nook-text-xs)/22px var(--nook-font);
  }
  .anchor[data-numbering] .item .tooltip { display: none; }
  .anchor[data-numbering] .command-result {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }
  .anchor[data-numbering] .command-result .number {
    grid-column: 1;
    grid-row: 1 / span 2;
    align-self: center;
  }
  .anchor[data-numbering] [part~="command-name"],
  .anchor[data-numbering] .command-result [part~="command-description"] { grid-column: 2; }
  .anchor[data-numbering] .command-result kbd { grid-column: 3; }
}

/* Alt suppresses duplicate hover/focus labels even while layout data refreshes. */
.anchor:is([data-alt-held], [data-numbering]) :is(.tooltip, [role="tooltip"]) {
  display: none;
  visibility: hidden;
  opacity: 0;
  transition: none;
}
/* Edge centers keep the anchor untransformed so fullscreen panels remain fixed
   to the viewport. The visible handle becomes a shallow semicircle. */
.anchor[data-corner="top-center"], .anchor[data-corner="bottom-center"] { left: calc(var(--nook-bound-left, 0px) + var(--nook-bound-width, 100vw) / 2 - 32px); }
.anchor[data-corner="left-center"] { left: var(--nook-bound-left, env(safe-area-inset-left, 0px)); top: calc(var(--nook-bound-top, 0px) + var(--nook-bound-height, 100dvh) / 2 - 32px); }
.anchor[data-corner="right-center"] { right: var(--nook-bound-right, env(safe-area-inset-right, 0px)); top: calc(var(--nook-bound-top, 0px) + var(--nook-bound-height, 100dvh) / 2 - 32px); }
[data-corner="top-center"] .handle, [data-corner="bottom-center"] .handle { width: 64px; height: 48px; }
[data-corner="left-center"] .handle, [data-corner="right-center"] .handle { width: 48px; height: 64px; }
[data-corner="top-center"] .handle::before { inset: 0 0 16px; border-radius: 0 0 32px 32px; transform: none; }
[data-corner="bottom-center"] .handle::before { inset: 16px 0 0; border-radius: 32px 32px 0 0; transform: none; }
[data-corner="left-center"] .handle::before { inset: 0 16px 0 0; border-radius: 0 32px 32px 0; transform: none; }
[data-corner="right-center"] .handle::before { inset: 0 0 0 16px; border-radius: 32px 0 0 32px; transform: none; }
[data-corner="top-center"] .mark { transform: translate(0, -8px); }
[data-corner="bottom-center"] .mark { transform: translate(0, 8px); }
[data-corner="left-center"] .mark { transform: translate(-8px, 0); }
[data-corner="right-center"] .mark { transform: translate(8px, 0); }
[data-corner="top-center"] .mark svg { transform: rotate(225deg); }
[data-corner="bottom-center"] .mark svg { transform: rotate(45deg); }
[data-corner="left-center"] .mark svg { transform: rotate(135deg); }
[data-corner="right-center"] .mark svg { transform: rotate(315deg); }
[data-corner="top-center"] .surface, [data-corner="bottom-center"] .surface { left: 32px; right: auto; translate: -50% 0; }
[data-corner="left-center"] .surface { left: var(--nook-surface-offset); right: auto; }
[data-corner="right-center"] .surface { right: var(--nook-surface-offset); left: auto; }
[data-corner="left-center"] .surface, [data-corner="right-center"] .surface {
  top: 32px; bottom: auto; translate: 0 -50%;
  max-height: min(640px, calc(var(--nook-bound-height, 100dvh) - 32px));
  max-width: calc(var(--nook-bound-width, 100vw) - var(--nook-surface-offset) - var(--nook-edge-gap));
}
[data-corner="top-center"] .handle, [data-corner="top-center"] .surface { transform-origin: 50% 0; }
[data-corner="bottom-center"] .handle, [data-corner="bottom-center"] .surface { transform-origin: 50% 100%; }
[data-corner="left-center"] .handle, [data-corner="left-center"] .surface { transform-origin: 0 50%; }
[data-corner="right-center"] .handle, [data-corner="right-center"] .surface { transform-origin: 100% 50%; }
[data-corner="top-center"] .handle-tooltip { top: calc(100% + 8px); bottom: auto; left: 50%; right: auto; translate: -50% 0; }
[data-corner="bottom-center"] .handle-tooltip { bottom: calc(100% + 8px); top: auto; left: 50%; right: auto; translate: -50% 0; }
[data-corner="left-center"] .handle-tooltip { left: calc(100% + 8px); right: auto; top: 50%; bottom: auto; translate: 0 -50%; }
[data-corner="right-center"] .handle-tooltip { right: calc(100% + 8px); left: auto; top: 50%; bottom: auto; translate: 0 -50%; }
[data-corner="left-center"] .surface[data-view="commands"],
[data-corner="right-center"] .surface[data-view="commands"] {
  height: min(var(--nook-command-height, 480px), calc(var(--nook-bound-height, 100dvh) - 32px));
}
[data-corner="left-center"] .surface[data-view="commands"] > [part~="body"],
[data-corner="right-center"] .surface[data-view="commands"] > [part~="body"] { flex: 1; }
@media (pointer: coarse), (hover: none) {
  .anchor[data-corner$="center"] .surface[data-presentation="expanded"] {
    inset: 0; translate: none; max-width: none; max-height: none; width: var(--nook-bound-width, 100vw); height: var(--nook-bound-height, 100dvh);
  }
}
/* Text must be allowed to shrink inside flex/grid tracks before it wraps. */
header { align-items: flex-start; }
header h2 {
  min-width: 0;
  overflow-wrap: anywhere;
  max-height: min(6em, calc(var(--nook-bound-height, 100dvh) * .3));
  overflow: auto;
}
header > button { flex: none; }
.setting > [part~="setting-label"], .setting small, .content,
[part~="command-name"], [part~="command-description"],
[part~="command-arg-label"], [part~="group-heading"],
[part~="overflow-group-heading"], [part~="enum-option-text"],
[part~="enum-option-label"], [part~="enum-option-description"] {
  min-width: 0;
  overflow-wrap: anywhere;
}
.setting input { min-width: 0; }
[part~="enum-option-text"] { flex: 1; }
[part~="enum-selected-label"] { min-width: 0; }
.surface[data-presentation="expanded"] .item-label {
  white-space: normal;
  overflow-wrap: anywhere;
}
.surface[data-view="root"][data-presentation="compact"]:has(.setting) .items { flex-wrap: wrap; }
.surface[data-view="root"][data-presentation="compact"] .setting { flex: 1 0 100%; }
.surface[data-presentation="expanded"]:not([data-view="commands"]),
.surface:is([data-view="full"], [data-view="all"])[data-presentation="compact"] {
  display: flex;
  flex-direction: column;
}
.surface[data-presentation="expanded"]:not([data-view="commands"]) { overflow: hidden; }
.surface[data-presentation="expanded"]:not([data-view="commands"]) > header,
.surface:is([data-view="full"], [data-view="all"])[data-presentation="compact"] > header { flex: none; }
.surface[data-presentation="expanded"]:not([data-view="commands"]) > [part~="body"],
.surface:is([data-view="full"], [data-view="all"])[data-presentation="compact"] > [part~="body"] {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scroll-padding: 8px;
  padding: 4px;
}
.surface[data-presentation="expanded"]:not([data-view="commands"]) > header { padding-inline: 4px; }
.command-result { grid-template-columns: minmax(0, 1fr) fit-content(40%); }
.command-result kbd { min-width: 0; max-width: 100%; white-space: normal; overflow-wrap: anywhere; }
.feedback-types button, .feedback-tools button { max-width: 100%; overflow-wrap: anywhere; }
[part~="feedback-preview"] { flex: none; }
@media (max-width: 420px) {
  .setting:has(.enum-control), .setting:has(input:not([type="checkbox"])) {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }
  .setting .enum-control, .setting input:not([type="checkbox"]) { width: 100%; max-width: none; }
  .setting:has(input[type="checkbox"]) { align-items: flex-start; }
  .setting input[type="checkbox"] { margin-block-start: 2px; }
}
@media (pointer: coarse), (hover: none) {
  .surface[data-presentation="expanded"]:not([data-view="commands"]) > [part~="body"] { flex: 1; }
}
@media (hover: hover) and (pointer: fine) {
  .anchor[data-numbering] .surface:not([data-view="commands"]):not([data-view="root"]) { display: flex; flex-direction: column; }
  .anchor[data-numbering] .surface:not([data-view="commands"]) > header { flex: none; }
  .anchor[data-numbering] .surface:not([data-view="commands"]) > [part~="body"] { min-height: 0; overflow: auto; }
  .anchor[data-numbering] .command-result { grid-template-columns: auto minmax(0,1fr) fit-content(34%); }
}

.surface[data-layout="list"] {
  width: min(var(--nook-width, 304px), calc(var(--nook-bound-width, 100vw) - 32px));
  display: flex;
  flex-direction: column;
}
.surface[data-layout="list"] > header { flex: none; }
.surface[data-layout="list"] > [part~="body"],
.surface[data-view="root"][data-presentation="compact"]:has(.setting) > [part~="body"] {
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
}
.surface[data-view="root"][data-presentation="compact"]:has(.setting) { display: flex; flex-direction: column; }
.surface[data-layout="list"] .items,
.surface[data-layout="list"] .groups,
.surface[data-layout="list"] .group-body { grid-template-columns: minmax(0, 1fr); }
.surface[data-layout="list"][data-presentation="compact"] > [part~="body"] > .items { display: grid; }
.surface[data-layout="list"] .item { flex-direction: row; justify-content: flex-start; gap: 12px; padding: 10px 12px; text-align: start; }
.surface[data-layout="list"] .item-label { display: block; flex: 1; min-width: 0; max-width: none; white-space: normal; overflow-wrap: anywhere; font-size: var(--nook-text-sm); }
@media (pointer: coarse), (hover: none) {
  .anchor .surface[data-layout="list"][data-presentation="expanded"] { width: var(--nook-bound-width, 100vw); }
}
/* Wrap after choosing a readable layout, then cap extreme text visually. Full
   strings remain in the DOM and in accessible names/descriptions. */
header h2 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nook-heading-lines, 4);
  max-height: min(calc(var(--nook-heading-lines, 4) * 1.25em), calc(var(--nook-bound-height, 100dvh) * .3));
  overflow: hidden;
}
[part~="setting-name"], .setting small,
[part~="command-name"], [part~="command-description"],
[part~="enum-option-label"], [part~="enum-option-description"],
[part~="group-heading"], [part~="overflow-group-heading"],
[part~="feedback-attachment-name"] {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}
[part~="setting-name"], [part~="enum-option-label"] {
  -webkit-line-clamp: var(--nook-label-lines, 3);
  line-height: 1.4;
  max-height: calc(var(--nook-label-lines, 3) * 1.4em);
}
.setting small, [part~="enum-option-description"], [part~="command-description"] {
  -webkit-line-clamp: var(--nook-description-lines, 3);
  line-height: 1.5;
  max-height: calc(var(--nook-description-lines, 3) * 1.5em);
}
[part~="command-name"] {
  -webkit-line-clamp: var(--nook-command-name-lines, 2);
  max-height: calc(var(--nook-command-name-lines, 2) * 1.4em);
}
[part~="group-heading"], [part~="overflow-group-heading"] {
  -webkit-line-clamp: var(--nook-group-lines, 2);
  line-height: 1.4;
  max-height: calc(var(--nook-group-lines, 2) * 1.4em);
}
[part~="feedback-attachment-name"] {
  -webkit-line-clamp: var(--nook-filename-lines, 2);
  line-height: 1.5;
  max-height: calc(var(--nook-filename-lines, 2) * 1.5em);
}
.surface:is([data-view="full"], [data-view="all"], [data-layout="list"], [data-presentation="expanded"]) .item-label,
.anchor[data-numbering] .item-label,
.surface[data-view="root"]:has(.setting) .item-label {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nook-label-lines, 3);
  line-height: 1.4;
  max-height: calc(var(--nook-label-lines, 3) * 1.4em);
  overflow: hidden;
  overflow-wrap: anywhere;
}
.enum-option-content { max-height: var(--nook-option-content-max-height, 12rem); overflow: hidden; }
.command-result kbd {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  line-height: 1.4;
  max-height: 5.6em;
  overflow: hidden;
}
.feedback-status, .feedback-privacy, .feedback-intro, .feedback-success { min-width: 0; overflow-wrap: anywhere; }
.feedback-status {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  line-height: 1.5;
  max-height: 9em;
  overflow: hidden;
}
.setting input:not([type="checkbox"]):not([type="range"]):not([type="color"]) {
  min-height: 40px;
  border: 1px solid var(--nook-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--nook-surface);
  color: var(--nook-text);
}
.tooltip {
  display: grid;
  grid-template-rows: minmax(0, 1fr);
  line-height: 1.4;
  max-height: calc(var(--nook-bound-height, 100dvh) - 32px);
  overflow: hidden;
}
.tooltip-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nook-tooltip-lines, 8);
  min-height: 0;
  max-height: calc(var(--nook-tooltip-lines, 8) * 1.4em);
  overflow: hidden;
  overflow-wrap: anywhere;
}
[data-corner^="top"] .item .tooltip { top: calc(100% + 6px); bottom: auto; }
.items > .item:is(:nth-child(-n + 2 of .item:not([hidden])), :nth-last-child(-n + 2 of .item:not([hidden]))) .tooltip {
  max-width: min(220px, calc(var(--nook-item-size) * 2 + var(--nook-gap)), calc(var(--nook-bound-width, 100vw) - 32px));
}
.items > .item:nth-child(1 of .item:not([hidden])) .tooltip { left: 0; right: auto; transform: none; }
.items > .item:nth-last-child(1 of .item:not([hidden])) .tooltip { right: 0; left: auto; transform: none; }
.surface:is([data-layout="list"], [data-presentation="expanded"]) .tooltip { display: none; }
.surface[data-view="root"][data-presentation="compact"]:has(.setting) .item {
  flex-basis: 100%; flex-direction: row; justify-content: flex-start; gap: 12px; padding: 10px 12px;
}
.surface[data-view="root"]:has(.setting) .item-label { flex: 1; min-width: 0; max-width: none; white-space: normal; text-align: start; }
.surface[data-view="root"]:has(.setting) .tooltip { display: none; }
@media (max-height: 360px) {
  header h2 { -webkit-line-clamp: 2; max-height: 2.5em; }
}
/* Keep duplicate tooltip suppression last, including while layout data refreshes. */
.anchor:is([data-alt-held], [data-numbering]) :is(.tooltip, [role="tooltip"]) { display: none; visibility: hidden; opacity: 0; transition: none; }
@media (pointer: coarse), (hover: none) { .tooltip { display: none; } }

header h2 { margin-block-start: max(0px, calc((44px - 1.25em) / 2)); }
[part~="command-arg-label"] {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nook-label-lines, 3);
  line-height: 1.4;
  max-height: calc(var(--nook-label-lines, 3) * 1.4em);
  overflow: hidden;
}
[part~="feedback-type"] {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--nook-label-lines, 3);
  line-height: 1.4;
  max-height: calc(var(--nook-label-lines, 3) * 1.4em + 16px);
  overflow: hidden;
}
[part~="feedback-success-message"] {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 6;
  line-height: 1.5;
  max-height: 9em;
  overflow: hidden;
}

slot[part~="app"] { display: contents; }
.boundary-measure {
  margin-top: var(--nook-inset-top, 0px); margin-right: var(--nook-inset-right, 0px);
  margin-bottom: var(--nook-inset-bottom, 0px); margin-left: var(--nook-inset-left, 0px);
  padding-top: env(safe-area-inset-top, 0px); padding-right: env(safe-area-inset-right, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px); padding-left: env(safe-area-inset-left, 0px);
}
.anchor { z-index: var(--nook-handle-z, var(--nook-z)); }
.overlay-anchor { z-index: var(--nook-overlay-z, var(--nook-z)); width: 48px; height: 48px; }
.overlay-anchor:is([data-corner="top-center"],[data-corner="bottom-center"]) { width: 64px; height: 48px; }
.overlay-anchor:is([data-corner="left-center"],[data-corner="right-center"]) { width: 48px; height: 64px; }
.preview, .landing-zone { z-index: var(--nook-drag-z, var(--nook-overlay-z, var(--nook-z))); }
:host([data-capture-mode]) [part~="handle"] { visibility: hidden; pointer-events: none; }
@media (pointer: coarse), (hover: none) {
  .anchor .surface[data-presentation="expanded"],
  .anchor[data-corner$="center"] .surface[data-presentation="expanded"] {
    inset: var(--nook-bound-top,0px) var(--nook-bound-right,0px) var(--nook-bound-bottom,0px) var(--nook-bound-left,0px);
  }
  .surface[data-presentation="expanded"]::before {
    inset: var(--nook-bound-top,0px) var(--nook-bound-right,0px) var(--nook-bound-bottom,0px) var(--nook-bound-left,0px);
  }
}
.capture-session {
  position: absolute;
  width: max-content;
  max-width: calc(var(--nook-bound-width, 100vw) - 24px);
  padding: 4px;
  border: 1px solid var(--nook-border);
  border-radius: var(--nook-radius);
  background: var(--nook-material-background);
  -webkit-backdrop-filter: blur(var(--nook-material-blur));
  backdrop-filter: blur(var(--nook-material-blur));
  box-shadow: var(--nook-shadow);
  max-height: calc(var(--nook-bound-height, 100dvh) - 24px);
  overflow: auto;
}
[data-corner^="bottom"] .capture-session { bottom: 12px; }
[data-corner^="top"] .capture-session { top: 12px; }
[data-corner$="right"] .capture-session { right: 12px; }
[data-corner$="left"] .capture-session { left: 12px; }
[data-corner="top-center"] .capture-session,[data-corner="bottom-center"] .capture-session { left: 32px; translate: -50% 0; }
[data-corner="left-center"] .capture-session { left: 12px; top: 32px; translate: 0 -50%; }
[data-corner="right-center"] .capture-session { right: 12px; top: 32px; translate: 0 -50%; }
.capture-session:has(.capture-gallery:not([hidden])),
.capture-session:has(.capture-status[data-error="true"]:not(:empty)) {
  width: min(var(--nook-capture-width, 360px), calc(var(--nook-bound-width, 100vw) - 24px));
  padding: 8px;
}
.capture-controls { display: flex; gap: 4px; align-items: center; }
.capture-controls > button { min-width: 0; min-height: 44px; padding: 8px 12px; font-size: var(--nook-text-sm); overflow-wrap: anywhere; }
.capture-controls > [part~="capture-done"] { margin-inline-start: auto; }
[part~="capture-snapshot"] { flex: 1; }
[part~="capture-review"] { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-variant-numeric: tabular-nums; }
[part~="capture-review-icon"] svg { display: block; width: 18px; height: 18px; }
.capture-status:not([data-error="true"]) { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
.capture-status { margin: 4px 0 0; color: var(--nook-muted); font-size: var(--nook-text-xs); line-height: 1.5; overflow-wrap: anywhere; }
.capture-status:empty { display: none; }
.capture-status[data-error="true"] { color: var(--nook-error-color, light-dark(#a82843,#ff9cb1)); }
[part~="capture-hide-previews"] { justify-self: end; min-height: 44px; padding: 8px 12px; font-size: var(--nook-text-sm); }
.capture-gallery { margin-top: 12px; display: grid; gap: 12px; }
.capture-preview-image { width: 100%; max-height: min(320px, 40dvh); object-fit: contain; background: var(--nook-surface); border-radius: 8px; }
.capture-thumbnails { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; }
.capture-thumbnail { min-width: 0; display: grid; gap: 4px; }
[part~="capture-preview"] { min-width: 0; border: 1px solid var(--nook-border); border-radius: 8px; padding: 4px; background: var(--nook-surface); color: var(--nook-text); }
[part~="capture-preview"][aria-pressed="true"] { border-color: var(--nook-accent); }
[part~="capture-thumbnail-image"] { display: block; width: 100%; height: 48px; object-fit: cover; border-radius: 4px; }
[part~="capture-thumbnail-label"] { display: block; margin-top: 4px; font-size: var(--nook-text-xs); overflow-wrap: anywhere; }
[part~="capture-remove"] { min-height: 36px; padding: 4px; border-radius: 6px; background: transparent; color: var(--nook-muted); font-size: var(--nook-text-xs); }
.swipe-dial {
  position: fixed;
  inset: var(--nook-bound-top,0px) var(--nook-bound-right,0px) var(--nook-bound-bottom,0px) var(--nook-bound-left,0px);
  pointer-events: none;
  opacity: var(--nook-dial-progress,0);
  transition: opacity 80ms linear;
}
.swipe-dial::before {
  content: ""; position: absolute; inset: 0;
  background: var(--nook-material-background);
  -webkit-backdrop-filter: blur(calc(var(--nook-dial-progress,0) * var(--nook-material-blur)));
  backdrop-filter: blur(calc(var(--nook-dial-progress,0) * var(--nook-material-blur)));
  mask-image: radial-gradient(circle at var(--nook-dial-origin-x) var(--nook-dial-origin-y), transparent 0 56px, black 76px);
}
.swipe-dial-option {
  position: absolute; translate: -50% -50%; box-sizing: border-box; width: 88px; height: 72px; padding: 8px;
  display: grid; place-content: center; justify-items: center; gap: 4px;
  border: 1px solid var(--nook-border); border-radius: 20px; background: var(--nook-surface); color: var(--nook-text);
  box-shadow: var(--nook-shadow); opacity: .72; transition: transform 100ms ease,opacity 100ms ease,background 100ms ease;
}
.swipe-dial-option[data-selected] { transform: scale(1.08); opacity: 1; background: var(--nook-accent); color: var(--nook-on-accent); }
[part~="swipe-dial-icon"] svg { display: block; width: 20px; height: 20px; }
[part~="swipe-dial-label"] { font-size: var(--nook-text-xs); line-height: 1.2; text-align: center; overflow-wrap: anywhere; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; max-height: 2.4em; overflow: hidden; }
[part~="settings-footer"] {
  padding-top: var(--nook-settings-footer-gap, 12px);
  margin-top: 4px;
  border-top: 1px solid var(--nook-border);
}
[part~="settings-footer"]:first-child { border-top: 0; margin-top: 0; padding-top: 0; }
[part~="settings-link"] {
  display: flex; align-items: center; min-height: 44px;
  padding: 8px 4px; border-radius: 8px;
  color: var(--nook-settings-link-color, var(--nook-accent));
  font-size: var(--nook-text-sm); font-weight: var(--nook-label-weight);
  line-height: var(--nook-line-height); text-decoration: none; overflow-wrap: anywhere;
}
[part~="settings-link"]:hover { text-decoration: underline; text-underline-offset: .2em; }
[part~="settings-link"]:focus-visible { outline: 2px solid var(--nook-accent); outline-offset: 2px; }
/* Form surfaces get their own readable widths instead of the icon-menu width. */
.surface[data-view="settings"][data-presentation="compact"] {
  width: min(var(--nook-settings-width, var(--nook-width, 420px)), calc(var(--nook-bound-width, 100vw) - 32px));
}
.surface[data-view="feedback"][data-presentation="compact"] {
  width: min(var(--nook-feedback-width, var(--nook-width, 520px)), calc(var(--nook-bound-width, 100vw) - 32px));
}
@media (hover: hover) and (pointer: fine) {
  .surface[data-view="settings"][data-presentation="expanded"] {
    width: min(var(--nook-settings-width, var(--nook-width, 420px)), calc(var(--nook-bound-width, 100vw) - 32px));
  }
  .surface[data-view="feedback"][data-presentation="expanded"] {
    width: min(var(--nook-feedback-width, var(--nook-width, 520px)), calc(var(--nook-bound-width, 100vw) - 32px));
  }
}
/* The root is the same persistent dial used by a held swipe. */
.anchor .surface[data-view="root"] {
  position: fixed; inset: var(--nook-bound-top,0px) var(--nook-bound-right,0px) var(--nook-bound-bottom,0px) var(--nook-bound-left,0px);
  width: auto; height: auto; max-width: none; max-height: none;
  margin: 0; padding: 0; border: 0; border-radius: 0; background: transparent;
  box-shadow: none; overflow: visible; translate: none; transform: none;
  pointer-events: none; display: block; isolation: isolate;
  -webkit-backdrop-filter: none; backdrop-filter: none;
  opacity: var(--nook-dial-progress,1);
}
.anchor .surface[data-view="root"] > header { display: none; }
.anchor .surface[data-view="root"] > [part~="body"],
.anchor .surface[data-view="root"] .items {
  display: contents; pointer-events: none; padding: 0; margin: 0; max-width: none;
}
.anchor .surface[data-view="root"]::before {
  position: absolute; inset: 0; border: 0; border-radius: 0; box-shadow: none;
  background: var(--nook-material-background);
  -webkit-backdrop-filter: blur(var(--nook-material-blur)); backdrop-filter: blur(var(--nook-material-blur));
  mask-image: radial-gradient(circle at var(--nook-dial-origin-x) var(--nook-dial-origin-y),transparent 0 56px,black 76px);
}
.anchor .surface[data-view="root"] .item {
  position: absolute; left: var(--nook-dial-x); top: var(--nook-dial-y);
  translate: -50% -50%; transform: none; width: 56px; height: 56px; min-height: 56px;
  flex: none; display: flex; align-items: center; justify-content: center; padding: 0; gap: 0;
  pointer-events: auto; touch-action: manipulation; user-select: none; -webkit-touch-callout: none; border: 1px solid var(--nook-border); border-radius: 50%;
  background: var(--nook-surface); box-shadow: var(--nook-shadow);
}
.anchor .surface[data-view="root"] .item[data-dial-hidden] { display: none !important; }
.anchor .surface[data-view="root"] .dial-caption {
  position: absolute; left: calc(50% + var(--nook-caption-x, 0px)); top: calc(50% + var(--nook-caption-y, -64px));
  translate: -50% -50%; width: max-content; max-width: 96px;
  display: var(--nook-label-display,block); padding: 4px 8px; pointer-events: auto;
  border: 1px solid var(--nook-border); border-radius: 8px;
  color: var(--nook-text); background: var(--nook-surface); box-shadow: var(--nook-shadow);
}
.anchor .surface[data-view="root"] .item .item-label {
  position: static; display: -webkit-box; flex: none; width: auto; max-width: 100%; max-height: 2.8em;
  padding: 0; margin: 0; white-space: normal; text-align: center;
  font-size: var(--nook-text-xs); line-height: 1.4;
  -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; overflow-wrap: anywhere;
}
.anchor[data-numbering] .surface[data-view="root"] .dial-caption,
.anchor .surface[data-view="root"][data-labels] .dial-caption,
.anchor .surface[data-view="root"][data-preview] .dial-caption,
.anchor .surface[data-view="root"] .item:active .dial-caption { display: block; }
.anchor .surface[data-view="root"] .item .number {
  position: absolute; inset: -5px -5px auto auto; min-width: 22px; height: 22px;
  padding: 0 4px; font: var(--nook-text-xs)/20px var(--nook-font); border-radius: 6px;
}
.anchor .surface[data-view="root"] .item[data-selected] { transform: scale(1.08); background: var(--nook-accent); color: var(--nook-on-accent); }
.anchor .surface[data-view="root"][data-preview] .tooltip,
.anchor .surface[data-view="root"][data-labels] .tooltip { display: none; }

.anchor .surface[data-view="root"] .item:focus-visible { outline-offset: 1px; }

.anchor .surface[data-view="root"] { animation: reveal var(--nook-duration) ease-out; }
.anchor .surface[data-view="root"][data-preview] { animation: none; }
.tutorial-badge {
  position: absolute; top: 1px; right: 1px; width: 10px; height: 10px;
  border: 2px solid var(--nook-surface); border-radius: 50%; background: var(--nook-accent);
  box-shadow: 0 0 0 1px var(--nook-border); pointer-events: none;
  animation: tutorial-bead 900ms ease-out 2;
}
@keyframes tutorial-bead { 50% { box-shadow: 0 0 0 5px color-mix(in srgb,var(--nook-accent) 18%,transparent); } }
.tutorial-shortcuts { margin: 0 0 16px; display: grid; gap: 8px; }
.tutorial-shortcuts > div { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; }
.tutorial-shortcuts dt { min-width: 0; font-size: var(--nook-text-sm); font-weight: var(--nook-label-weight); overflow-wrap: anywhere; }
.tutorial-shortcuts dd { margin: 0; min-width: 0; text-align: end; }
.tutorial-shortcuts kbd { font-size: var(--nook-text-xs); overflow-wrap: anywhere; white-space: normal; }
${tutorialGraphicsStyles}

.anchor .surface[data-view="root"] .item[data-caption-visible] .tooltip { display: none; }
`;
