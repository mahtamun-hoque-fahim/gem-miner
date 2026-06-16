# Gem Miner

A cross-platform browser extension that exports any **Gemini AI** conversation as a clean, formatted PDF — with one click.

---

## Features

- One-click PDF export directly from Gemini
- Light and dark PDF color themes
- Preserves full markdown formatting: code blocks, headers, bold/italic, lists, tables, blockquotes
- Custom PDF title
- Optional export metadata (timestamp + source URL)
- Auto-opens the print dialog for instant Save-as-PDF
- Works on **Chrome, Edge, Brave, Arc** (MV3) and **Firefox 109+** (MV3)
- Zero external dependencies — no bundler, no npm

---

## Installation

### Chrome / Edge / Brave / Arc

1. Clone or download this repository
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `gem-miner` folder
6. Pin the Gem Miner icon to your toolbar

### Firefox

1. Open `about:debugging`
2. Click **This Firefox** in the left sidebar
3. Click **Load Temporary Add-on…**
4. Navigate into the `gem-miner` folder and select `manifest.json`

> **Note:** Temporary Firefox add-ons are removed on browser restart.  
> For a persistent install the extension must be signed via [Mozilla Add-on Hub](https://extensionworkshop.com/documentation/publish/).

---

## Usage

1. Open [gemini.google.com](https://gemini.google.com) and have a conversation
2. Click the **Gem Miner** icon in your browser toolbar
3. The popup shows a live message count and conversation title
4. Choose a PDF title and color theme (light / dark)
5. Click **Export as PDF**
6. A preview tab opens with your formatted conversation
7. The print dialog appears automatically — select **Save as PDF**

> You can also click the floating **Save as PDF** button on the preview page at any time.

---

## How It Works

```
popup.js  ──(scripting.executeScript)──►  content.js (runs on gemini.google.com)
                                                │
                               extracts DOM turns (user-query / model-response)
                                                │
popup.js  ◄─────────────────────────── structured message array
    │
    │  builds styled HTML export document
    │
    └──(storage.session)──► preview/preview.js ──► document.write(html) ──► window.print()
```

---

## File Structure

```
gem-miner/
├── manifest.json               # MV3 manifest (Chrome + Firefox)
├── popup/
│   ├── popup.html              # Extension popup UI
│   ├── popup.css               # Dark theme styles
│   └── popup.js                # Messaging, HTML generation, export flow
├── content/
│   └── content.js              # DOM scraper for Gemini chat turns
├── background/
│   └── service-worker.js       # MV3 service worker (lifecycle only)
├── preview/
│   ├── preview.html            # Loading screen shown before export renders
│   └── preview.js              # Reads session storage → writes export HTML
├── icons/
│   ├── gen.py                  # Pillow script that generated the PNGs
│   ├── icon16.png
│   ├── icon32.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## Browser Compatibility

| Browser     | Engine  | Manifest | Status  |
|-------------|---------|----------|---------|
| Chrome 88+  | Blink   | MV3      | Full    |
| Edge 88+    | Blink   | MV3      | Full    |
| Brave       | Blink   | MV3      | Full    |
| Firefox 109+| Gecko   | MV3      | Full    |
| Arc         | Blink   | MV3      | Full    |
| Opera       | Blink   | MV3      | Full    |

---

## Tech Stack

- Pure JavaScript (ES2020, no frameworks)
- Manifest V3
- Web Extensions API (`scripting`, `tabs`, `storage.session`)
- `chrome.storage.session` for popup → preview page data transfer
- Browser native print-to-PDF (no PDF library needed)

---

## License

MIT © Mahtamun Hoque Fahim
