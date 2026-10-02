// Top frame, document_idle: leave the page alone, apply dark mode, or ask.
const ATTR = 'data-darkit';
const PROBE = 'data-darkit-probe';
const OS_DARK = '(prefers-color-scheme: dark)';
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
  root.innerHTML = `<style>
:host{all:initial;position:fixed;right:16px;bottom:16px;z-index:2147483647}
div{font:14px/1.4 system-ui,sans-serif;color:#111;background:#fff;border:1px solid #ccc;border-radius:8px;padding:12px 14px;box-shadow:0 4px 16px #0003;max-width:280px}
p{margin:0 0 8px}label{display:block;margin-bottom:10px;cursor:pointer}
button{font:inherit;padding:4px 12px;margin-right:6px;cursor:pointer}
</style><div role="dialog" aria-label="Darkit"><p>This page is light. Turn on dark mode?</p><label><input type="checkbox"> Remember for this site</label><button value="on">Turn on</button><button value="off">No</button></div>`;
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
