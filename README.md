# Medium Mirror Opener

A Manifest V3 Chrome/Brave extension that opens the current Medium article in a mirror site with a single click or keyboard shortcut.

**Author:** Ali Raza  
**GitHub:** https://github.com/AliRaza-033

## Features

- One-click redirect from the extension icon
- Keyboard shortcut support (configurable in `chrome://extensions/shortcuts`)
- Customizable mirror base URL (default: `https://freedium-mirror.cfd/`)
- Auto-detects Medium-hosted articles (including many custom domains) by reading page metadata and JSON-LD
- Optionally restrict or add custom domains you explicitly allow in settings

## Installation (Chrome / Brave)

1. Open the extensions page:
   - Chrome: `chrome://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder:
   - `Chrome-extensions/medium-mirror-redirector`

## Usage

- Click the extension icon to open the mirrored URL in a new tab.
- Optionally set a keyboard shortcut in:
  - `chrome://extensions/shortcuts`

## Options

Open the extension options page and configure:

- **Target Base URL** (mirror site)
- **Allowed Custom Domains** (comma or line separated, optional)

Example custom domains:

```
example.com, blog.example.org
```

If a site is hosted on Medium, it should work without adding it here. Use this list only if you want to force-allow specific domains.

## Permissions

- `storage`: to save settings (base URL and custom domains)
- `tabs`: to access the active tab URL and open the mirrored URL
- `activeTab`: to read page metadata on the current tab when you trigger the extension
- `scripting`: to execute metadata detection on the page

## Files

- `manifest.json`
- `background.js`
- `options.html`
- `options.js`
- `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`

## Notes

- Redirect only works on `https://` URLs that are confirmed to be Medium-hosted (via page metadata/JSON-LD) or on your allowed custom domains.
- If you change settings, reload the extension from the extensions page.
# medium-mirror-extension
