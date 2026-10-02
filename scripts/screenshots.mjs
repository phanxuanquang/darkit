// Store screenshots (1280x800) into store/screenshots/: real extension on live sites. `npm run screenshots`.
// Split shots show the page before (left/top) and after (right/bottom) one icon click, OS theme light.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const EXT = fileURLToPath(new URL('../src', import.meta.url));
const OUT = fileURLToPath(new URL('../store/screenshots/', import.meta.url));
const SIZE = { width: 1280, height: 800 };
mkdirSync(OUT, { recursive: true });

const ctx = await chromium.launchPersistentContext('', {
  executablePath: process.env.CHROME || undefined,
  colorScheme: 'dark', // the prompt only appears while the OS theme is dark
  viewport: SIZE,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
const sw = ctx.serviceWorkers()[0] ?? (await ctx.waitForEvent('serviceworker'));
const page = await ctx.newPage();
const open = async (url) => {
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(2000);
};
const clickIcon = () =>
  sw.evaluate(async (url) => {
    const [tab] = await chrome.tabs.query({ url });
    await toggleTab(tab);
  }, page.url());

async function split(name, url, vertical = true) {
  await open(url);
  await page
    .getByRole('button', { name: /essential only|reject|decline/i })
    .first()
    .click({ timeout: 2000 })
    .catch(() => {});
  const before = (await page.screenshot()).toString('base64');
  await clickIcon();
  await page.waitForTimeout(1000);
  const after = (await page.screenshot()).toString('base64');
  const canvas = await ctx.newPage();
  await canvas.setViewportSize(SIZE);
  await canvas.setContent(`<style>*{margin:0}img{position:absolute;inset:0}
    #a{clip-path:${vertical ? 'inset(0 0 0 50%)' : 'inset(50% 0 0 0)'}}
    i{position:absolute;background:#6aa9ff;${vertical ? 'left:50%;top:0;bottom:0;width:3px;margin-left:-1px' : 'top:50%;left:0;right:0;height:3px;margin-top:-1px'}}</style>
    <img src="data:image/png;base64,${before}"><img id="a" src="data:image/png;base64,${after}"><i></i>`);
  await canvas.screenshot({ path: `${OUT}${name}.png` });
  await canvas.close();
}

await open('https://news.ycombinator.com/');
await page.locator('darkit-prompt').waitFor({ state: 'attached' });
await page.screenshot({ path: `${OUT}1-prompt.png` });
await page.emulateMedia({ colorScheme: 'light' }); // "before" must be the site's light look
await split('2-wikipedia-native', 'https://en.wikipedia.org/wiki/Dark_mode');
await split('3-mui-native', 'https://mui.com/material-ui/getting-started/');
await split('4-filter', 'https://news.ycombinator.com/', false); // content is left-aligned: split top/bottom
await ctx.close();
