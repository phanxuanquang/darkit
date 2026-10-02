// Renders src/icons/icon.svg into src/icons/icon-<size>.png and the 300px Edge Add-ons logo. `npm run icons`.
// White glyph on a #1C274C rounded square stays visible on light and dark toolbars;
// The 128px manifest icon keeps 16px padding (store guideline); the others fill their slot.
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const OUT = [
  ...[16, 32, 48, 128].map((size) => [size, `../src/icons/icon-${size}.png`]),
  [300, '../store/logo-300.png'],
];
const glyph = readFileSync(new URL('../src/icons/icon.svg', import.meta.url), 'utf8')
  .match(/<path[\s\S]*\/>/)[0]
  .replaceAll(/fill="[^"]*"/g, 'fill="#fff"');
const svg = (viewBox) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">
<rect x="16" y="16" width="96" height="96" rx="22" fill="#1C274C"/>
<g transform="translate(28 28) scale(3)">${glyph}</g></svg>`;

mkdirSync(new URL('../store', import.meta.url), { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || undefined });
const page = await browser.newPage();
for (const [size, file] of OUT) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${svg(size === 128 ? '0 0 128 128' : '16 16 96 96')}`,
  );
  const path = fileURLToPath(new URL(file, import.meta.url));
  await page.screenshot({ path, omitBackground: true });
}
await browser.close();
