const node = (x, y, name, extra = "") =>
  `<g class="tutorial-node ${extra}" transform="translate(${x} ${y})"><circle r="18"/><svg x="-9" y="-9" width="18" height="18" viewBox="0 0 24 24"><use href="#nook-icon-${name}"/></svg></g>`;
const nook = `<path class="tutorial-nook" d="M244 142a24 24 0 0 1 24-24v24Z"/><svg x="251" y="125" width="13" height="13" viewBox="0 0 24 24"><use href="#nook-icon-nook"/></svg>`;
const frame = `<rect class="tutorial-screen" x="12" y="6" width="256" height="136" rx="12"/><path class="tutorial-lines" d="M30 26h72m-72 10h48m-48 10h60"/>`;
const arc = `<path class="tutorial-path" d="M156 124a92 92 0 0 1 92-92"/>${node(156, 124, "menu", "tutorial-pick-actions")}${node(183, 59, "feedback")}${node(248, 32, "settings", "tutorial-pick-settings")}`;
const diagrams = {
  touch: `${frame}${arc}${nook}<path class="tutorial-direction" d="M240 124h-58m7-5-7 5 7 5m59-13V60m-5 7 5-7 5 7"/><g class="tutorial-swipe-cursor"><circle class="tutorial-contact" cx="248" cy="124" r="8"/><circle class="tutorial-contact-ring" cx="248" cy="124" r="13"/></g>`,
  keyboard: `${frame}${arc}${nook}<g class="tutorial-keys"><rect x="28" y="94" width="36" height="30" rx="6"/><rect class="tutorial-enter" x="70" y="94" width="56" height="30" rx="6"/><text x="46" y="114">→</text><text x="98" y="114" class="tutorial-enter-label">Enter</text></g><circle class="tutorial-key-focus tutorial-focus-one" cx="156" cy="124" r="23"/><circle class="tutorial-key-focus tutorial-focus-two" cx="183" cy="59" r="23"/>`,
  drag: `${frame}<path class="tutorial-direction" d="m235 115-184-82m4 7-4-7 9-1"/><g class="tutorial-targets"><rect x="16" y="10" width="28" height="28" rx="7"/><rect x="236" y="10" width="28" height="28" rx="7"/><rect x="16" y="110" width="28" height="28" rx="7"/></g><g class="tutorial-drag-home">${nook}</g><g class="tutorial-drag-preview">${node(30, 24, "nook")}</g><circle class="tutorial-hold" cx="248" cy="124" r="15"/><g class="tutorial-drag-cursor"><circle class="tutorial-contact" cx="248" cy="124" r="8"/></g>`,
};
export function tutorialGraphic(make, kind) {
  const figure = make("figure", `tutorial-graphic tutorial-${kind}-graphic`);
  figure.className = `tutorial-graphic tutorial-graphic-${kind}`;
  figure.setAttribute("aria-hidden", "true");
  figure.innerHTML = `<svg viewBox="0 0 280 150" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" focusable="false">${diagrams[kind]}</svg>`;
  return figure;
}
export const tutorialGraphicsStyles = `
.tutorial-graphic { margin: 12px auto 20px; max-width: var(--nook-tutorial-graphic-width,360px); border: 1px solid var(--nook-border); border-radius: 12px; overflow: hidden; background: color-mix(in srgb,var(--nook-surface) 85%,var(--nook-accent) 3%); }
.tutorial-graphic > svg { display: block; width: 100%; height: auto; color: var(--nook-text); }
.tutorial-screen { stroke: var(--nook-border); fill: var(--nook-surface); }
.tutorial-lines { stroke: var(--nook-border); }
.tutorial-path, .tutorial-direction { stroke: var(--nook-muted); stroke-dasharray: 3 5; opacity: .5; }
.tutorial-node circle { fill: var(--nook-surface); stroke: var(--nook-border); }
.tutorial-node svg { color: var(--nook-text); }
.tutorial-nook { fill: var(--nook-accent); stroke: var(--nook-accent); }
.tutorial-nook + svg { color: var(--nook-on-accent); }
.tutorial-contact { fill: var(--nook-surface); stroke: var(--nook-accent); stroke-width: 3; }
.tutorial-contact-ring { stroke: var(--nook-accent); opacity: .3; }
.tutorial-swipe-cursor { animation: tutorial-swipe 6s ease-in-out infinite; }
.tutorial-graphic-touch .tutorial-pick-actions circle { animation: tutorial-actions 6s ease-in-out infinite; }
.tutorial-graphic-touch .tutorial-pick-settings circle { animation: tutorial-settings 6s ease-in-out infinite; }
@keyframes tutorial-swipe { 0%,8%,46%,54%,96%,100% { transform: translate(0,0); opacity: 0; } 12%,42%,58%,92% { opacity: 1; } 30%,40% { transform: translate(-92px,0); } 78%,90% { transform: translate(0,-92px); } }
@keyframes tutorial-actions { 0%,20%,46%,100% { fill: var(--nook-surface); stroke: var(--nook-border); } 30%,40% { fill: color-mix(in srgb,var(--nook-accent) 16%,var(--nook-surface)); stroke: var(--nook-accent); } }
@keyframes tutorial-settings { 0%,65%,96%,100% { fill: var(--nook-surface); stroke: var(--nook-border); } 78%,90% { fill: color-mix(in srgb,var(--nook-accent) 16%,var(--nook-surface)); stroke: var(--nook-accent); } }
.tutorial-keys rect { fill: var(--nook-surface); stroke: var(--nook-border); }
.tutorial-keys text { fill: var(--nook-text); stroke: none; text-anchor: middle; font: 12px var(--nook-font); }
.tutorial-key-focus { stroke: var(--nook-accent); }
.tutorial-focus-one { animation: tutorial-focus-one 5s ease-in-out infinite; }
.tutorial-focus-two { animation: tutorial-focus-two 5s ease-in-out infinite; opacity: 0; }
.tutorial-enter { animation: tutorial-key-press 5s ease-in-out infinite; }
@keyframes tutorial-focus-one { 0%,25%,95%,100% { opacity: 1; } 35%,85% { opacity: 0; } }
@keyframes tutorial-focus-two { 0%,25%,95%,100% { opacity: 0; } 35%,85% { opacity: 1; } }
@keyframes tutorial-key-press { 0%,55%,90%,100% { stroke: var(--nook-border); } 65%,80% { stroke: var(--nook-accent); } }
.tutorial-targets rect { stroke: var(--nook-accent); stroke-dasharray: 3 4; opacity: .4; }
.tutorial-hold { stroke: var(--nook-accent); stroke-dasharray: 94; stroke-dashoffset: 94; animation: tutorial-hold 6s linear infinite; }
.tutorial-drag-cursor { animation: tutorial-drag 6s ease-in-out infinite; }
.tutorial-drag-preview { opacity: .3; animation: tutorial-preview 6s ease-in-out infinite; }
.tutorial-drag-home { animation: tutorial-home 6s ease-in-out infinite; }
@keyframes tutorial-hold { 0%,5%,90%,100% { stroke-dashoffset: 94; opacity: 0; } 10% { stroke-dashoffset: 94; opacity: 1; } 30% { stroke-dashoffset: 0; opacity: 1; } 40%,80% { stroke-dashoffset: 0; opacity: 0; } }
@keyframes tutorial-drag { 0%,30%,95%,100% { transform: translate(0,0); opacity: 0; } 5%,65% { opacity: 1; } 65%,85% { transform: translate(-218px,-100px); } 85% { opacity: 0; } }
@keyframes tutorial-preview { 0%,25%,95%,100% { opacity: .15; } 40%,85% { opacity: 1; } }
@keyframes tutorial-home { 0%,65%,95%,100% { opacity: 1; } 72%,85% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .tutorial-graphic * { animation: none !important; } }
@media (max-width:480px) { .tutorial-graphic { max-width: var(--nook-tutorial-graphic-width,280px); margin-block: 8px 12px; } }
`;
