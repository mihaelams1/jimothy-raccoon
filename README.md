# Jimothy the Raccoon 🦝

A Chrome extension (Manifest V3) that sends Jimothy the raccoon scampering across
every page you visit — inspired by the character animations Google runs on its
search results page.

## How it works

A content script (`jimothy.js`) injects a single `<div>` into every page and
animates it with pure CSS:

- **Sprite-sheet run cycle** — `assets/jimothy_run.png` is a 2160×336 sheet of
  **5 frames** (432×336 each) at 12fps. A `steps(5)` CSS animation walks the
  `background-position` across the sheet.
- **Crossing motion** — a second keyframe animation slides Jimothy from one edge
  of the viewport to the other.
- **Random direction** — each run picks left→right or right→left; the sprite is
  flipped with `scaleX(-1)` when heading left.
- **Pauses** — after each crossing he waits 4–12s, then scampers again.

He sits at `z-index: 2147483647` with `pointer-events: none`, so he floats above
page content without ever blocking clicks.

## Toggle

Click the toolbar icon for a popup with an on/off switch. The setting is stored
in `chrome.storage.sync` (default: on) and applies live across open tabs.

## Accessibility

Honors `prefers-reduced-motion: reduce` — the run cycle is disabled for users who
ask for reduced motion.

## Load it locally

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top-right).
3. Click **Load unpacked** and select this folder.
4. Browse any normal `http(s)` page and watch for Jimothy.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | MV3 manifest, `<all_urls>` content script, popup, storage permission |
| `jimothy.js` | Injects & drives the animation; honors the toggle |
| `jimothy.css` | Sprite-sheet + crossing keyframes, flip, reduced-motion |
| `popup.html` / `popup.js` | On/off toggle UI |
| `assets/jimothy_run.png` | 5-frame run-cycle sprite sheet (2160×336) |

## Known limitations

- Content scripts can't run on `chrome://` pages, the Chrome Web Store, or other
  extensions' pages — that's a browser restriction.
- Publishing to the Chrome Web Store with `<all_urls>` host access requires
  justification during review. Fine for personal/unpacked use.

## Tweaks

- Size: change `--jimothy-scale` in `jimothy.css` (default `0.4`).
- Speed: adjust the `5 + Math.random() * 4` crossing duration in `jimothy.js`.
- Frame rate: the `0.417s steps(5)` in `jimothy.css` = 5 frames ÷ 12fps.
