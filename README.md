# Darkit

Dark mode for every website, in Chrome and Edge. It uses the site's own dark theme when there is one, and a light-weight filter when there isn't.

- **Asks once.** On a light page, a small toast offers dark mode. Tick _Remember for this site_ and it is applied automatically from then on, with no white flash.
- **Uses the real dark theme first.** Many sites built with Tailwind, Bootstrap, Docusaurus, Mantine, MkDocs Material and others ship a dark theme behind a switch only their own toggle sets. Darkit finds and flips that switch, so you get the designer's colors instead of an inverted page.
- **Follows your OS.** Automatic dark mode only kicks in while your OS or browser theme is dark (light pages read better in bright rooms) and follows the switch live, for example at sunset.
- **Leaves dark sites alone.** Pages that are already dark are never touched.
- **Tuned for reading.** The fallback filter lands on about 14:1 contrast (`#1a1a1a` background, `#e6e6e6` text) instead of harsh pure black and white.
- **Light.** No dependencies, no background polling, no DOM rewriting. The service worker sleeps when idle.

## Install

Not yet on the Chrome Web Store or Edge Add-ons. To install from source:

1. Clone or download this repository.
2. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge).
3. Turn on **Developer mode**.
4. Click **Load unpacked** and select the `src/` folder.

Requires Chrome or Edge 116+. For automatic dark mode, set the browser appearance to _System_ (or _Dark_).

## Usage

| Action                                                 | Result                                                                     |
| ------------------------------------------------------ | -------------------------------------------------------------------------- |
| Toast: **Turn on**                                     | Dark mode for this site for the rest of the browser session.               |
| Toast: **Turn on** + Remember                          | Dark mode applied automatically on every visit while the OS theme is dark. |
| Toast: **No**                                          | Not asked again this session (or never, with Remember).                    |
| Click the toolbar icon                                 | Toggle dark mode on the current tab instantly, at any time of day.         |
| Right-click the icon > **Forget choice for this site** | Clear the remembered choice; the site will be asked again.                 |

Browser pages (`chrome://`, `edge://`, the extension stores) and local `file://` pages are not supported.

## How it works

1. When a page finishes loading, Darkit samples the background color at five points and computes WCAG luminance. If most points are dark, the page is left alone.
2. To turn dark mode on, it tries common site-native switches on `<html>` / `<body>` (`class="dark"`, `data-theme="dark"`, `data-bs-theme="dark"`, ...) and keeps the first one that actually makes the page dark.
3. If none works, it applies `filter: invert(1) hue-rotate(180deg) contrast(0.8)` to the page and inverts images and video back.

Everything is toggled through a single attribute or switch, so turning dark mode off restores the page exactly.

## Privacy

Darkit collects nothing and sends nothing anywhere. The only data stored is the hostnames you chose to remember, in the browser's local extension storage. The broad "read and change data on all websites" permission is needed to check each page's colors and apply dark mode.

## Known limitations

- Filter mode makes very saturated image colors slightly duller, and turns dark parts of a light page (such as a dark header) light.
- CSS background images and dark icons are not re-inverted in filter mode.
- Sites that keep their theme only in JavaScript state (for example MUI v5 `ThemeProvider`, Ant Design, Vuetify) cannot be switched to their own dark theme; they get the filter.
- Sites whose dark theme depends only on `prefers-color-scheme` can't be forced dark while the OS is light; they switch on their own when it is dark.

## Development

```sh
npm install
npx playwright install chromium
npm test
```

`npm test` runs a unit test plus end-to-end tests that load `src/` as a real unpacked extension in Playwright Chromium. Set `CHROME` to use a different Chromium binary.

```text
src/
  manifest.json   MV3 manifest, shared by Chrome and Edge
  background.js   storage, icon click, context menu, remembered-site registration
  detect.js       color detection, native dark switches, prompt toast
  on.js           applies dark mode at document_start on remembered sites
  dark.css        filter theme
test/             unit + end-to-end tests
```

Plain JavaScript, no build step. All code, comments and UI text are in English.

### Supporting another framework

Add one line to `NATIVE` in [src/detect.js](src/detect.js):

```js
val('data-foo-theme', 'dark'), // FooUI: attribute value on <html>
cls('dark-ui'), // FooUI: class token on <html>
cls('dark-ui', true), // FooUI: class token on <body>
```

The end-to-end tests pick up the new entry automatically. To find a site's switch, open its DevTools console, run the snippet in [.claude/skills/add-framework/SKILL.md](.claude/skills/add-framework/SKILL.md), and press the site's own theme toggle.

### Claude Code

The repository ships a Claude Code setup in `.claude/`:

- `add-framework` skill: walks through supporting a new framework (`/add-framework`, or ask "support Mantine").
- Prettier hook: every file Claude edits is formatted with the repository's Prettier config.
