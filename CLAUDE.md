# Darkit

MV3 dark-mode extension for Chrome + Edge. User-facing behavior lives in [README.md](README.md); update it when behavior changes.

## Commands

- `npm test` - unit + e2e (Playwright Chromium loads `src/` as unpacked extension). Run after every code change.
- `CHROME=<chromium exe> npm test` - when Playwright's bundled browser isn't installed (`npx playwright install chromium`).
- `npm run icons` - regenerate `src/icons/*.png` and `store/logo-300.png` from `src/icons/icon.svg` (commit the PNGs).
- `npm run screenshots` - Edge Add-ons screenshots from live sites into `store/screenshots/`; listing text in `store/listing.md`. Published to Edge Add-ons only.
- `npm run zip` - `dist/darkit-<manifest version>.zip` for store upload.
- `npx prettier --write .` - format all; a PostToolUse hook already formats each file Claude edits. CI fails on `prettier --check`.

## Rules

- English only: code, comments, docs, UI strings. No i18n.
- Plain JS, no build, no runtime deps. `src/` is the shipped extension; devDeps (playwright, prettier) are test/tooling only.
- Minimal changes: no speculative abstractions, options, or files. Comments only for non-obvious "why", one line.
- One switch: dark mode = `data-darkit` attribute on `<html>` (filter) or one site-native switch from `NATIVE`. Never add another on/off path.
- Content scripts never touch `chrome.storage`; go through background messages (`state`, `choose`). Background derives hostname from `sender.url`.
- New framework support = one line in `NATIVE` (`src/detect.js`); tests auto-generate. Use the `add-framework` skill.

- Release: bump `src/manifest.json` version, commit `chore(release): vX.Y.Z`, tag `vX.Y.Z` (must equal manifest; release workflow enforces). Never push unless asked.
- Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`, `ci:`, `build:`, `style:`), one logical change per commit.

## Gotchas

- Measuring page colors: remove our changes, measure, re-apply synchronously before any `await`, or the page flashes.
- Probing native switches needs `html[data-darkit-probe]` (freezes CSS transitions), else computed colors are stale.
- `on.js` runs at `document_start`: only set our own attribute there. Writing site attributes that early gets clobbered by the parser's `<html>` attribute merge.
- `executeScript` (default world) shares the isolated world with `detect.js`: icon click calls `setDark`/`isDark` directly. Pre-install tabs lack them.
- e2e state is per hostname: give each new test a fresh loopback host (`127.0.0.x`, `127.0.1.x`, `[::1]`).
- e2e can call background functions via `sw.evaluate(() => toggleTab(...))`; toolbar buttons can't be clicked.
- Editing via Python/shell heredocs mangles `\b`, `\s` in regexes. Use the Edit tool for regex-bearing code, then grep for control chars.
- Windows host: shell is Git Bash; use forward slashes and `cygpath -w` when a Windows path is needed.
