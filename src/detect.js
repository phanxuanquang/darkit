// Top frame, document_idle: leave the page alone, apply dark mode, or ask.
const ATTR = 'data-darkit';
const PROBE = 'data-darkit-probe';
const OS_DARK = '(prefers-color-scheme: dark)';
const MOON =
  'M19.9001 2.30719C19.7392 1.8976 19.1616 1.8976 19.0007 2.30719L18.5703 3.40247C18.5212 3.52752 18.4226 3.62651 18.298 3.67583L17.2067 4.1078C16.7986 4.26934 16.7986 4.849 17.2067 5.01054L18.298 5.44252C18.4226 5.49184 18.5212 5.59082 18.5703 5.71587L19.0007 6.81115C19.1616 7.22074 19.7392 7.22074 19.9001 6.81116L20.3305 5.71587C20.3796 5.59082 20.4782 5.49184 20.6028 5.44252L21.6941 5.01054C22.1022 4.849 22.1022 4.26934 21.6941 4.1078L20.6028 3.67583C20.4782 3.62651 20.3796 3.52752 20.3305 3.40247L19.9001 2.30719ZM16.0328 8.12967C15.8718 7.72009 15.2943 7.72009 15.1333 8.12967L14.9764 8.52902C14.9273 8.65407 14.8287 8.75305 14.7041 8.80237L14.3062 8.95987C13.8981 9.12141 13.8981 9.70107 14.3062 9.86261L14.7041 10.0201C14.8287 10.0694 14.9273 10.1684 14.9764 10.2935L15.1333 10.6928C15.2943 11.1024 15.8718 11.1024 16.0328 10.6928L16.1897 10.2935C16.2388 10.1684 16.3374 10.0694 16.462 10.0201L16.8599 9.86261C17.268 9.70107 17.268 9.12141 16.8599 8.95987L16.462 8.80237C16.3374 8.75305 16.2388 8.65407 16.1897 8.52902L16.0328 8.12967ZM12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z'; // src/icons/icon.svg paths, for the prompt
let prompt;
let ctx;
let undoNative; // undoes the native switch we applied

// A site-native dark switch: one attribute on <html> (or <body> when body = true).
// css = selector active when on; test/e2e.test.mjs builds one test page per entry from it.
const cls = (token, body = false) => ({
  name: 'class',
  body,
  css: body ? `body.${token}` : `html.${token} body`,
  on: (v) => `${v} ${token}`.trim(),
  off: (v, old) =>
    v
      .split(/\s+/)
      .filter((t) => t !== token)
      .join(' ') || old, // no stray class=""
  is: (v) => v.split(/\s+/).includes(token),
});
const val = (name, value, body = false) => ({
  name,
  body,
  css: body ? `body[${name}="${value}"]` : `html[${name}="${value}"] body`,
  on: () => value,
  off: (_, old) => old,
  is: (v) => v === value,
});

// Tried in order before falling back to the filter. New framework = one line here (see add-framework skill).
// Popular first, <body> after <html>, generic `style` last.
const NATIVE = [
  cls('dark'), // Tailwind darkMode 'class', shadcn, next-themes, VitePress, Nuxt UI, Radix, Chakra v3
  val('data-theme', 'dark'), // Docusaurus, DaisyUI, Starlight, Pico, Bulma 1.0, Chakra v2, Hugo PaperMod, Fluent 2 site
  val('data-bs-theme', 'dark'), // Bootstrap 5.3+
  val('data-mui-color-scheme', 'dark'), // MUI with CSS variables, Joy UI
  cls('skin-theme-clientpref-night'), // MediaWiki (Wikipedia)
  val('data-coreui-theme', 'dark'), // CoreUI
  val('data-color-mode', 'dark'), // GitHub Primer
  val('data-mantine-color-scheme', 'dark'), // Mantine
  cls('dark-mode'), // @nuxtjs/color-mode default
  cls('ion-palette-dark'), // Ionic 8
  cls('dark-theme'), // common hand-rolled names
  cls('theme-dark'),
  val('data-md-color-scheme', 'slate', true), // MkDocs Material
  val('data-theme', 'dark', true), // Sphinx Furo
  cls('body--dark', true), // Quasar
  {
    name: 'style', // light-dark(), browser default colors
    on: (v) => `${v};color-scheme:dark`,
    off: (v) => v.replace(';color-scheme:dark', ''),
    is: (v) => v.includes('color-scheme:dark'),
  },
];

// WCAG relative luminance.
function luminance(r, g, b) {
  const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

// 0.18: contrast against black equals contrast against white.
function isDarkColor(c) {
  return luminance(c[0], c[1], c[2]) < 0.18;
}

// Canvas normalizes any CSS color format (oklch, color(), ...) to RGBA.
function toRGBA(color) {
  ctx ??= new OffscreenCanvas(1, 1).getContext('2d', { willReadFrequently: true });
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  return ctx.getImageData(0, 0, 1, 1).data;
}

// What the browser paints when nothing has a background.
function canvasColor() {
  const meta = document.querySelector('meta[name="color-scheme"]')?.getAttribute('content') ?? '';
  const scheme = `${getComputedStyle(document.documentElement).colorScheme} ${meta}`;
  const dark = scheme.includes('dark') && (!scheme.includes('light') || matchMedia(OS_DARK).matches);
  return dark ? [18, 18, 18, 255] : [255, 255, 255, 255];
}

function bgAt(x, y) {
  for (let el = document.elementFromPoint(x, y); el; el = el.parentElement) {
    const c = toRGBA(getComputedStyle(el).backgroundColor);
    if (c[3] > 128) return c;
  }
  return canvasColor();
}

// Majority of 5 points, so a dark header or sidebar alone doesn't decide.
function pageIsDark() {
  const points = [
    [0.5, 0.5],
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ];
  const dark = points.filter(([x, y]) => isDarkColor(bgAt(x * innerWidth, y * innerHeight))).length;
  return dark > points.length / 2;
}

const targetOf = (sw) => (sw.body ? document.body : document.documentElement);

function writeAttr(el, name, value) {
  if (value === null) el.removeAttribute(name);
  else el.setAttribute(name, value);
}

// First switch that makes the page dark; page left unchanged. Call with our changes off.
// PROBE freezes transitions (dark.css) so computed colors are final. Cost: one recalc + layout per switch.
function findNative() {
  const root = document.documentElement;
  root.setAttribute(PROBE, '');
  try {
    return NATIVE.find((sw) => {
      const el = targetOf(sw);
      if (!el) return false;
      const old = el.getAttribute(sw.name);
      writeAttr(el, sw.name, sw.on(old ?? ''));
      const dark = pageIsDark();
      writeAttr(el, sw.name, old);
      return dark;
    });
  } finally {
    root.removeAttribute(PROBE);
  }
}

function useNative(sw) {
  const el = targetOf(sw);
  const old = el.getAttribute(sw.name);
  writeAttr(el, sw.name, sw.on(old ?? ''));
  // Hydration or route changes may rewrite the attribute: put ours back.
  const observer = new MutationObserver(() => {
    const v = el.getAttribute(sw.name) ?? '';
    if (!sw.is(v)) writeAttr(el, sw.name, sw.on(v));
  });
  observer.observe(el, { attributeFilter: [sw.name] });
  undoNative = () => {
    observer.disconnect();
    writeAttr(el, sw.name, sw.off(el.getAttribute(sw.name) ?? '', old));
  };
}

function isDark() {
  return document.documentElement.hasAttribute(ATTR) || !!undoNative;
}

function clearDark() {
  undoNative?.();
  undoNative = undefined;
  document.documentElement.removeAttribute(ATTR);
}

function applyDark() {
  const sw = findNative();
  if (sw) useNative(sw);
  else document.documentElement.setAttribute(ATTR, '');
}

function setDark(on) {
  if (isDark() === on) return;
  if (on) applyDark();
  else clearDark();
}

function showPrompt() {
  prompt?.remove();
  const host = (prompt = document.createElement('darkit-prompt'));
  const root = host.attachShadow({ mode: 'closed' });
  // DOM order Turn on, No keeps keyboard order; row-reverse puts the primary button on the right.
  root.innerHTML = `<style>
:host{all:initial;position:fixed;right:20px;bottom:20px;z-index:2147483647;color-scheme:dark}
.card{box-sizing:border-box;width:320px;padding:16px;display:grid;grid-template-columns:auto 1fr;gap:2px 12px;
  font:14px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#e8eaf2;background:rgba(24,30,52,.94);
  backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.08);border-radius:16px;
  box-shadow:0 12px 32px rgba(0,0,0,.35),0 2px 6px rgba(0,0,0,.2);animation:enter .22s cubic-bezier(.2,.8,.2,1)}
.icon{grid-row:span 2;width:40px;height:40px;border-radius:12px;background:#2a3766;display:grid;place-items:center}
svg{width:22px;height:22px;fill:#fff}
h2{margin:0;font-size:15px;font-weight:600;color:#fff}
p{margin:0;font-size:13px;color:#a9b0c7}
label{grid-column:1/-1;display:flex;align-items:center;gap:8px;margin-top:12px;font-size:13px;color:#c9cede;cursor:pointer}
input{width:16px;height:16px;margin:0;accent-color:#7c9cff;cursor:pointer}
.actions{grid-column:1/-1;display:flex;flex-direction:row-reverse;gap:8px;margin-top:14px}
button{font:inherit;font-weight:600;border:0;border-radius:10px;padding:8px 16px;cursor:pointer;transition:background-color .15s,transform .1s}
button:active{transform:scale(.97)}
button:focus-visible,input:focus-visible{outline:2px solid #7c9cff;outline-offset:2px}
.primary{background:#7c9cff;color:#0b1020}.primary:hover{background:#95afff}
.secondary{background:rgba(255,255,255,.08);color:#e8eaf2}.secondary:hover{background:rgba(255,255,255,.14)}
@keyframes enter{from{opacity:0;transform:translateY(8px) scale(.98)}}
@media (prefers-reduced-motion:reduce){.card,button{animation:none;transition:none}}
</style><div class="card" role="dialog" aria-labelledby="title" aria-describedby="desc">
<div class="icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="${MOON}"/></svg></div>
<h2 id="title">Turn on dark mode?</h2><p id="desc">This page is light. Darkit can switch it to a dark theme.</p>
<label><input type="checkbox"> Remember for this site</label>
<div class="actions"><button class="primary" value="on">Turn on</button><button class="secondary" value="off">No</button></div></div>`;
  root.addEventListener('click', (e) => {
    const button = e.target.closest('button');
    if (!button) return;
    const on = button.value === 'on';
    const remember = root.querySelector('input').checked;
    host.remove();
    if (on) setDark(true);
    chrome.runtime.sendMessage({ type: 'choose', on, remember });
  });
  document.documentElement.append(host);
}

// Session choices always apply. Remembered sites and the prompt only while the OS theme is dark
// (light pages read better in bright rooms).
async function main() {
  const was = isDark();
  // Measure the site's own colors; re-apply before yielding, so no frame paints in between.
  // Re-applying also upgrades on.js's early filter to a native theme.
  clearDark();
  if (pageIsDark()) return; // already dark on its own
  if (was) applyDark();
  const { session, local } = await chrome.runtime.sendMessage({ type: 'state' });
  if (session) return setDark(session === 'on');
  if (!matchMedia(OS_DARK).matches) {
    prompt?.remove();
    setDark(false);
  } else if (local) setDark(local === 'on');
  else showPrompt();
}

// Guard: loadable in Node for tests.
if (globalThis.document?.contentType === 'text/html' && location.hostname) {
  main();
  matchMedia(OS_DARK).addEventListener('change', main);
}
