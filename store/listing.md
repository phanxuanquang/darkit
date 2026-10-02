# Edge Add-ons listing

Copy-paste source for Microsoft Partner Center, in the order its pages appear. Package: `darkit-<version>.zip` from the GitHub Release (or `npm run zip`). Images: `store/logo-300.png` and `store/screenshots/` (regenerate with `npm run icons` / `npm run screenshots`).

Read-only on Partner Center, taken from `src/manifest.json`: **Extension name** (`name`) and **Short description** (`description`). To change them, edit the manifest and upload a new package.

## Availability

- Visibility: Public
- Markets: all markets

## Properties

- Category: Accessibility
- Website: https://github.com/phanxuanquang/darkit
- Support contact detail: https://github.com/phanxuanquang/darkit/issues
- Mature content: no

## Privacy

### Single purpose description

Apply a dark color scheme to web pages: the site's own dark theme when it has one, otherwise a dark filter tuned for reading.

### Permission justification

| Permission                   | Justification                                                                                                                                                                                                                          |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Host permission `<all_urls>` | Darkit reads each page's background colors to decide whether it is already dark, and applies dark mode on any site the user opens. Dark mode is wanted on whatever site the user visits, so it cannot be limited to a list of domains. |
| `scripting`                  | Toggles dark mode on the current tab when the toolbar icon is clicked, and registers the early dark-mode script for sites the user chose to remember, so they load dark without a white flash.                                         |
| `storage`                    | Stores the user's per-site choice (on or off) locally on the device.                                                                                                                                                                   |
| `contextMenus`               | Adds the "Forget choice for this site" item to the toolbar icon's right-click menu.                                                                                                                                                    |

### Are you using remote code?

No, I am not using remote code.

### Data usage

- What user data do you plan to collect: select nothing. Darkit collects no user data and sends nothing off the device. It only stores, locally, the hostnames of sites the user chose to remember.
- Certify all disclosure statements.

### Privacy policy URL

https://github.com/phanxuanquang/darkit#privacy

## Store listing (English)

### Description (250 to 10,000 characters)

Darkit gives every website a dark mode, and prefers the one the site already has.

USES THE REAL DARK THEME FIRST
Many sites built with Tailwind, shadcn/ui, Bootstrap, MUI, Docusaurus, Mantine, MkDocs Material, MediaWiki (Wikipedia) and others ship a dark theme that only their own toggle can turn on. Darkit finds that switch and flips it, so you get the designer's colors instead of an inverted page.

A FILTER WHEN THERE IS NO DARK THEME
For everything else, Darkit applies a dark filter tuned for reading: about 14:1 contrast (#1a1a1a background, #e6e6e6 text) instead of harsh pure black and white. Images and videos keep their real colors.

ASKS ONCE, REMEMBERS
On a light page, a small prompt offers dark mode. Tick "Remember for this site" and it is applied on every visit, before the page is drawn: no white flash.

FOLLOWS YOUR SYSTEM
Automatic dark mode only runs while your Windows or Edge theme is dark, and switches live, for example at sunset. Pages that are already dark are left alone.

ALWAYS ONE CLICK AWAY
Click the toolbar icon to toggle dark mode on the current tab at any time. Right-click the icon and choose "Forget choice for this site" to be asked again.

LIGHT AND PRIVATE
No tracking, no accounts, no network requests. Nothing runs in the background when idle. Open source: https://github.com/phanxuanquang/darkit

### Extension logo

`store/logo-300.png` (300 x 300).

### Screenshots (1280 x 800, max 6)

1. `1-prompt.png`: asks once on light pages, with an option to remember the site.
2. `2-wikipedia-native.png`: Wikipedia switched to its own dark theme.
3. `3-mui-native.png`: Material UI docs switched to their own dark theme.
4. `4-filter.png`: sites without a dark theme get a reading-friendly dark filter.

### Search terms (max 7 terms, 30 characters each, 21 words total)

dark mode, dark theme, night mode, dark mode for websites, eye strain, accessibility, reading

## Notes for certification

No account or setup needed. To test:

1. Set Edge appearance to Dark (Settings > Appearance), or Windows to dark mode.
2. Open a light page without its own dark theme, for example https://news.ycombinator.com. A prompt appears at the bottom right; click "Turn on" to apply the dark filter.
3. Open https://en.wikipedia.org/wiki/Dark_mode and click the toolbar icon: Wikipedia switches to its own dark theme instead of the filter.
4. Click the icon again to turn dark mode off. Right-click the icon > "Forget choice for this site" to reset the remembered choice.

With a light system theme the prompt does not appear by design; the toolbar icon still toggles dark mode on any page.
