# Jimothy the Raccoon 🦝

A Chrome extension (Manifest V3) that sends Jimothy the raccoon scampering across
every page you visit — a nod to the character animations Google runs on its
search results page, but with an original raccoon of our own.

## How it works

A content script (`jimothy.js`) injects a single `<div>` into every page and
animates it with pure CSS:

- **Sprite-sheet run cycle** — `assets/jimothy_run.png` is a 2160×336 sheet of
  **5 frames** (432×336 each) at 12fps. A `steps(5)` CSS animation walks the
  `background-position` across the sheet.
- **Crossing motion** — a second keyframe animation slides Jimothy from one edge
  of the viewport to the other.
- **Random direction** — each run picks left→right or right→left; the source art
  faces left, so the sprite is flipped with `scaleX(-1)` when heading right.
- **Random height** — each crossing starts at a random vertical position, from the
  bottom of the viewport up toward the top.
- **Pauses** — after each crossing he waits 4–12s, then scampers again.

He sits at `z-index: 2147483647` with `pointer-events: none`, so he floats above
page content without ever blocking clicks.

### Strict Content-Security-Policy sites

Some sites (Wikipedia, GitHub, etc.) send a strict CSP whose `img-src` /
`default-src` doesn't allow the `chrome-extension:` scheme, which blocks the
sprite from loading. To stay compatible, the content script fetches the sprite
from the extension and inlines it as a **`data:` URL** (allowed by virtually all
such policies — e.g. Wikipedia's `default-src ... data:` and GitHub's
`img-src ... data:`). A `data:` URL is self-contained, so — unlike a `blob:` URL —
it doesn't depend on the content script's isolated-world blob registry, which the
page's resource loader can't always resolve.

### Site reduced-motion resets

Many sites (GitHub, Bootstrap, Tailwind, normalize.css) ship a global
`@media (prefers-reduced-motion: reduce)` rule that forces
`animation: none` (or `animation-duration: 0.01ms; animation-iteration-count: 1`)
on **every** element via `!important`. On a machine with OS "reduce motion"
enabled, that rule would freeze Jimothy (GitHub) or instantly teleport him to his
offscreen end-state (Wikipedia). Since Jimothy is pure whimsy, his animation is
declared `!important` on a high-specificity `#id.class` selector so it outranks
those universal (`*`) resets and he always runs.

### Navigation resilience

- **Full page loads** re-inject the content script, so Jimothy reappears on the
  new page automatically.
- **SPA navigations** (`history.pushState` / client-side routing) often swap out
  the DOM and remove Jimothy without a fresh document load. A `MutationObserver`
  watches for his removal and re-attaches him so he survives in-app navigation.

## Toggle

Click the toolbar icon for a popup with an on/off switch. The setting is stored
in `chrome.storage.sync` (default: on) and applies live across open tabs.

## Accessibility

Jimothy is pure whimsy, so he ignores `prefers-reduced-motion` — the running
animation always plays. Use the toolbar toggle to turn him off entirely.

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
| `jimothy.css` | Sprite-sheet + crossing keyframes, flip |
| `popup.html` / `popup.js` | On/off toggle UI |
| `assets/jimothy_run.png` | 5-frame run-cycle sprite sheet (2160×336) |
| `assets/icon_*.png` | Toolbar / install icons (raccoon emoji) |
| `tools/gen_jimothy.js` | Regenerates the sprite sheet from scratch |
| `tools/import_sheet.js` | Imports/normalizes an external run-cycle image into the sheet |

## The artwork

Jimothy is modelled on the real **Jimothy**, a Seattle raccoon with
short-spine syndrome — hence the hunched, humpbacked silhouette, the low head,
the dark grizzled fur, and the stubby tail.

The committed sprite sheet (`assets/jimothy_run.png`) is a 5-frame run cycle
imported from a hand-provided run-cycle image (AI-generated, then hand-picked)
and normalised by [`tools/import_sheet.js`](tools/import_sheet.js), which:

- keys out the baked-in checkerboard background into a real alpha channel
  (flood fill from the edges, gated on saturation + brightness so it stops at
  the fur/outline),
- drops the generator's watermark and any stray specks,
- shaves the drawn light "glow" outline with a small erosion,
- slices the five raccoons, flips them to face **left**, and re-composites them
  at a uniform scale on a common baseline (sized to frame #4) so the animation
  reads evenly with no jitter.

```
npm install                              # one-time, pulls in `sharp`
node tools/import_sheet.js path/to/sheet.png   # re-import a new source image
```

A fully procedural, from-scratch alternative also lives in
[`tools/gen_jimothy.js`](tools/gen_jimothy.js) (`node tools/gen_jimothy.js`).

## Known limitations

- Content scripts can't run on `chrome://` pages, the Chrome Web Store, or other
  extensions' pages — that's a browser restriction.
- Publishing to the Chrome Web Store with `<all_urls>` host access requires
  justification during review. Fine for personal/unpacked use.

## Tweaks

- Size: change `--jimothy-scale` in `jimothy.css` (default `0.4`).
- Speed: adjust the `8 + Math.random() * 5` crossing duration in `jimothy.js`.
- Frame rate: the `0.5s steps(5)` in `jimothy.css` = 5 frames ÷ 10fps.

## Credits

- **Jimothy sprite** — modelled on the real Jimothy, a Seattle raccoon;
  the committed run cycle was imported and normalized by `tools/import_sheet.js`,
  and a from-scratch procedural version is available via `tools/gen_jimothy.js`.
- **Toolbar icon** — the raccoon emoji from
  [Twemoji](https://github.com/jdecked/twemoji), © Twitter, Inc. and other
  contributors, licensed under
  [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
