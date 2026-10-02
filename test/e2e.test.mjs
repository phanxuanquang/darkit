// Loads src/ unpacked in Playwright Chromium. Setup: `npm install && npx playwright install chromium`.
// CHROME env = other Chromium binary.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { chromium } from 'playwright';

const EXT = fileURLToPath(new URL('../src', import.meta.url));
const html = (
  bg,
  fg,
) => `<!doctype html><html><head><style>body{margin:0;background:${bg};color:${fg};min-height:100vh}</style></head>
<body><main><h1>Title</h1><p>Text <a href="#">link</a></p></main></body></html>`;

let siteDark = false; // /site turns dark on its own
// One generated page per NATIVE entry, read straight from detect.js.
const NATIVE = vm.runInContext(
  `${readFileSync(new URL('../src/detect.js', import.meta.url), 'utf8')};NATIVE`,
  vm.createContext({}),
);
const FRAMEWORKS = NATIVE.filter((sw) => sw.css);

const server = http.createServer((req, res) => {
  res.setHeader('content-type', 'text/html');
  if (req.url === '/dark') return res.end(html('#121212', '#eee'));
  if (req.url === '/oklch') return res.end(html('oklch(0.2 0.02 260)', '#eee'));
  // Dark only under FRAMEWORKS[i].css. Theme transition checks probing sees final colors. /fw/0 = Tailwind.
  if (req.url.startsWith('/fw/')) {
    const { css } = FRAMEWORKS[Number(req.url.slice(4))];
    return res.end(
      html('#fff', '#111').replace(
        '</style>',
        `body{transition:background-color .5s,color .5s}${css}{background:#111;color:#eee}</style>`,
      ),
    );
  }
  if (req.url === '/scheme')
    return res.end(
      html('light-dark(#fff, #111)', 'light-dark(#111, #eee)').replace('<style>', '<style>:root{color-scheme:light}'),
    );
  res.end(siteDark ? html('#111', '#eee') : html('#fff', '#111'));
});

test('extension flows', async (t) => {
  server.listen(0);
  const base = (host) => `http://${host}:${server.address().port}`;
  const ctx = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    executablePath: process.env.CHROME || undefined,
    colorScheme: 'dark', // automatic paths need OS dark
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  });
  t.after(async () => {
    await ctx.close();
    server.close();
  });
  const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
  const p = await ctx.newPage();
  const attr = () => p.evaluate(() => document.documentElement.hasAttribute('data-darkit'));
  const prompts = () => p.locator('darkit-prompt').count();
  const settle = () => p.waitForTimeout(400);
  // Closed shadow root: drive by keyboard. Tab order after the link: checkbox, "Turn on", "No".
  const answer = async ({ on, remember }) => {
    await p.locator('darkit-prompt').waitFor({ state: 'attached', timeout: 3000 });
    await p.focus('a');
    await p.keyboard.press('Tab');
    if (remember) await p.keyboard.press('Space');
    await p.keyboard.press('Tab');
    if (!on) await p.keyboard.press('Tab');
    await p.keyboard.press('Enter');
    await settle();
  };

  await t.test('already-dark pages are left alone (rgb and oklch)', async () => {
    for (const path of ['/dark', '/oklch']) {
      await p.goto(base('127.0.0.1') + path);
      await settle();
      assert.equal(await prompts(), 0, path);
      assert.equal(await attr(), false, path);
    }
  });

  await t.test('light page: "Turn on" + remember applies, stores and registers on.js', async () => {
    await p.goto(base('127.0.0.1') + '/site');
    await answer({ on: true, remember: true });
    assert.equal(await prompts(), 0);
    assert.equal(await attr(), true);
    const local = await sw.evaluate(() => chrome.storage.local.get('site:127.0.0.1'));
    assert.equal(local['site:127.0.0.1'], 'on');
    const [script] = await sw.evaluate(() => chrome.scripting.getRegisteredContentScripts());
    assert.deepEqual(script.matches, ['*://127.0.0.1/*']);
  });

  await t.test('remembered site is dark by DOMContentLoaded (no flash)', async () => {
    await p.addInitScript(() =>
      document.addEventListener('DOMContentLoaded', () => {
        window.early = document.documentElement.hasAttribute('data-darkit');
      }),
    );
    await p.reload();
    await settle();
    assert.equal(await p.evaluate(() => window.early), true);
  });

  await t.test('remembered site that turned dark itself: filter removed', async () => {
    siteDark = true;
    await p.reload();
    await settle();
    siteDark = false;
    assert.equal(await attr(), false);
  });

  await t.test('OS light: remembered site not auto-applied, follows live switch to dark', async () => {
    await p.emulateMedia({ colorScheme: 'light' });
    await p.reload();
    await settle();
    assert.equal(await attr(), false, 'light OS: off');
    await p.emulateMedia({ colorScheme: 'dark' });
    await settle();
    assert.equal(await attr(), true, 'switched to dark OS: on');
    await p.emulateMedia({ colorScheme: 'light' });
    await settle();
    assert.equal(await attr(), false, 'switched back to light OS: off');
  });

  await t.test('OS light: unknown light site is not prompted', async () => {
    await p.goto(base('[::1]') + '/');
    await settle();
    assert.equal(await prompts(), 0);
    await p.emulateMedia({ colorScheme: 'dark' });
  });

  // Playwright can't press toolbar buttons: call the handler in the service worker.
  const clickIcon = (url) =>
    sw.evaluate(async (u) => {
      const [tab] = await chrome.tabs.query({ url: u });
      await toggleTab(tab);
    }, url);
  await t.test('icon click toggles, saved to session', async () => {
    await p.goto(base('127.0.0.1') + '/site'); // remembered "on", OS dark
    await settle();
    assert.equal(await attr(), true);
    await clickIcon(p.url());
    assert.equal(await attr(), false);
    const session = await sw.evaluate(() => chrome.storage.session.get('site:127.0.0.1'));
    assert.equal(session['site:127.0.0.1'], 'off');
    await clickIcon(p.url());
    assert.equal(await attr(), true);
  });

  const htmlAttr = (name) => p.evaluate((n) => document.documentElement.getAttribute(n), name);
  const bodyBg = () => p.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await t.test('native: Tailwind class "dark" used instead of filter, despite transitions', async () => {
    await p.goto(base('127.0.0.2') + '/fw/0');
    await answer({ on: true, remember: false });
    assert.equal(await attr(), false, 'no filter');
    assert.match(await htmlAttr('class'), /\bdark\b/);
  });

  await t.test('native: framework rewrites <html class>, "dark" is put back', async () => {
    await p.evaluate(() => {
      document.documentElement.className = 'hydrated';
    });
    await settle();
    assert.equal(await htmlAttr('class'), 'hydrated dark');
  });

  await t.test('native: icon click off removes only our class token', async () => {
    await clickIcon(p.url());
    await p.waitForTimeout(700); // the site's own 0.5s theme transition plays
    assert.equal(await htmlAttr('class'), 'hydrated');
    assert.equal(await bodyBg(), 'rgb(255, 255, 255)');
  });

  // <html> + <body> start tags, to check switches leave them as found.
  const tags = () =>
    p.evaluate(() => [document.documentElement, document.body].map((el) => el.cloneNode(false).outerHTML).join(''));

  for (const [i, { css }] of FRAMEWORKS.entries()) {
    await t.test(`native: ${css} switch used instead of filter, removed on toggle off`, async () => {
      await p.goto(base(`127.0.1.${i + 1}`) + `/fw/${i}`);
      await settle();
      const before = await tags();
      await clickIcon(p.url());
      assert.equal(await attr(), false, 'no filter');
      assert.notEqual(await tags(), before, 'switch applied');
      await clickIcon(p.url());
      assert.equal(await tags(), before, 'restored');
    });
  }

  await t.test('native: light-dark() site switched via color-scheme', async () => {
    await p.goto(base('127.0.0.3') + '/scheme');
    await answer({ on: true, remember: true });
    assert.equal(await attr(), false, 'no filter');
    assert.match(await htmlAttr('style'), /color-scheme:dark/);
    assert.equal(await bodyBg(), 'rgb(17, 17, 17)');
  });

  await t.test('native: remembered site upgrades on.js filter to native theme after load', async () => {
    await p.reload();
    await settle();
    assert.equal(await attr(), false, 'filter replaced');
    assert.equal(await bodyBg(), 'rgb(17, 17, 17)');
  });

  await t.test('"No" without remember: session only, not asked again', async () => {
    await p.goto(base('localhost') + '/');
    await answer({ on: false, remember: false });
    assert.equal(await attr(), false);
    await p.reload();
    await settle();
    assert.equal(await prompts(), 0);
    const session = await sw.evaluate(() => chrome.storage.session.get('site:localhost'));
    assert.equal(session['site:localhost'], 'off');
    const local = await sw.evaluate(() => chrome.storage.local.get('site:localhost'));
    assert.equal(local['site:localhost'], undefined);
  });
});
