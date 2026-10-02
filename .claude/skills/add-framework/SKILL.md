---
name: add-framework
description: Add support for a new frontend framework / UI library / docs theme whose site-native dark theme Darkit should switch on instead of the invert filter. Use when user says "support <framework>", "add framework", "site X has own dark mode but extension uses filter", or names a library (Mantine, Vuetify, PrimeVue, ...) to support.
---

# Add framework

Goal: Darkit turns on site's own dark theme for framework X. Mechanism: `NATIVE` list in `src/detect.js`. Probe each switch, measure, keep first that makes page dark, else filter.

## 1. Find switch

Ask user for live site using X if none given. Get switch from X docs (`darkModeSelector`, `colorSchemeSelector`, `data-theme`, "dark class") or live site: DevTools console, paste, press site's own theme toggle:

```js
for (const el of [document.documentElement, document.body])
  new MutationObserver((ms) =>
    ms.forEach((m) => console.log(el.tagName, m.attributeName, '=', el.getAttribute(m.attributeName))),
  ).observe(el, { attributes: true });
```

Log line `HTML data-foo-theme = dark` or `BODY class = app dark-ui` = switch. Already in `NATIVE`? Stop, tell user covered.

## 2. Add ONE line to `NATIVE` (`src/detect.js`)

```js
val('data-foo-theme', 'dark'), // FooUI        attribute = value on <html>
cls('dark-ui'), // FooUI                        class token on <html>
cls('dark-ui', true), // FooUI                  third arg true = on <body>
```

Order: popular first. `<body>` entries after `<html>` entries. `style` (color-scheme) entry stays LAST. Comment = framework name(s), English.

Nothing else to edit. `test/e2e.test.mjs` reads `NATIVE` from `detect.js`, builds one page per entry from helper `css` selector.

## 3. Verify

```sh
npm test
```

All pass, new entry shows as `native: <selector> switch used instead of filter, removed on toggle off`. No Chrome installed: `CHROME=<path to Playwright chromium chrome.exe> npm test`. Then tell user: reload extension, open X site, click icon, expect X's own dark colors (not inverted look).

## Not fit for one line

- Switch on other element (`#app`, `#root`): extend `targetOf()` with selector field, ~2 lines + update helper `css`. Confirm with user first.
- Theme in localStorage/cookie, needs reload: probe-then-undo impossible. New feature (per-site adapter). Stop, explain, ask.
- Theme only in JS state (MUI v5 `ThemeProvider`, Ant Design, Vuetify, Fluent UI): no DOM switch. Unsupported, filter stays. Tell user.

## Rules

- English only in code, comments, docs.
- Each probe = one style recalc + layout (5-30ms heavy page). Don't add speculative or duplicate entries.
- Don't touch filter, storage, prompt code for this task.
