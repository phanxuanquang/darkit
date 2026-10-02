# Store listing

Copy-paste source for the Chrome Web Store Developer Dashboard and Microsoft Partner Center (Edge Add-ons). Upload the zip from the GitHub Release (`darkit-<version>.zip`). Screenshots: `store/screenshots/` (1280x800, regenerate with `npm run screenshots`).

## Name

Darkit

## Short description (max 132 characters)

Dark mode for every website. Uses the site's own dark theme when it has one, a reading-friendly filter when it doesn't.

## Category

Accessibility

## Detailed description

Darkit gives every website a dark mode, and prefers the one the site already has.

USES THE REAL DARK THEME FIRST
Many sites built with Tailwind, shadcn/ui, Bootstrap, MUI, Docusaurus, Mantine, MkDocs Material, MediaWiki (Wikipedia) and others ship a dark theme that only their own toggle can turn on. Darkit finds that switch and flips it, so you get the designer's colors instead of an inverted page.

A FILTER WHEN THERE IS NO DARK THEME
For everything else, Darkit applies a dark filter tuned for reading: about 14:1 contrast (#1a1a1a background, #e6e6e6 text) instead of harsh pure black and white. Images and videos keep their real colors.

ASKS ONCE, REMEMBERS
On a light page, a small prompt offers dark mode. Tick "Remember for this site" and it is applied on every visit, before the page is drawn: no white flash.

FOLLOWS YOUR SYSTEM
Automatic dark mode only runs while your system or browser theme is dark, and switches live, for example at sunset. Pages that are already dark are left alone.

ALWAYS ONE CLICK AWAY
Click the toolbar icon to toggle dark mode on the current tab at any time. Right-click the icon and choose "Forget choice for this site" to be asked again.

LIGHT AND PRIVATE
No tracking, no accounts, no network requests. Nothing runs in the background when idle. Open source: https://github.com/phanxuanquang/darkit

## Screenshot captions

1. `1-prompt.png`: Asks once on light pages, with an option to remember the site.
2. `2-wikipedia-native.png`: Wikipedia switched to its own dark theme.
3. `3-mui-native.png`: Material UI docs switched to their own dark theme.
4. `4-filter.png`: Sites without a dark theme get a reading-friendly dark filter.

## Privacy

### Single purpose

Apply a dark color scheme to web pages: the site's own dark theme when available, otherwise a dark filter.

### Permission justifications

| Permission                   | Justification                                                                                                                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Host permission `<all_urls>` | Darkit must read each page's colors to decide whether it is already dark, and apply dark mode on any site the user visits. It works on whatever site the user opens, so it cannot be limited to a list of domains. |
| `scripting`                  | Toggle dark mode on the current tab when the toolbar icon is clicked, and register the early dark-mode script for sites the user chose to remember (prevents a white flash on load).                               |
| `storage`                    | Store the user's per-site choice (on/off) locally on the device.                                                                                                                                                   |
| `contextMenus`               | Provide the "Forget choice for this site" item in the toolbar icon's right-click menu.                                                                                                                             |
| Remote code                  | No. All code is packaged in the extension.                                                                                                                                                                         |

### Data usage

- Collects no user data. Nothing is sent off the device.
- Stored locally only: hostnames of sites the user chose to remember, with on/off.
- Not sold, not transferred to third parties, not used for creditworthiness or lending.
- Chrome Web Store certifications: check all three ("I do not sell or transfer user data...", "...not use or transfer for purposes unrelated to the single purpose", "...not use or transfer to determine creditworthiness").

### Privacy policy URL

https://github.com/phanxuanquang/darkit#privacy

## Edge Add-ons notes

- Same zip, same text. Partner Center asks for: short description, description, category, screenshots, privacy policy URL, and "Does this extension access personal information?": No.
- Search terms: dark mode, dark theme, night mode, dark reader, accessibility.
