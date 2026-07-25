(function () {
  "use strict";

  const ID = "jimothy-raccoon";
  if (document.getElementById(ID)) return; // avoid duplicates on re-injection

  console.log("[Jimothy] content script injected on", location.href);

  const FRAME_URL = chrome.runtime.getURL("assets/jimothy_run.png");
  let spriteUrl = FRAME_URL; // replaced with a data: URL once fetched (see below)
  let raccoon = null;
  let hopTimer = null;
  let guard = null;
  let wantEnabled = false;

  function createRaccoon() {
    const el = document.createElement("div");
    el.id = ID;
    el.style.backgroundImage = `url("${spriteUrl}")`;
    document.documentElement.appendChild(el);
    return el;
  }

  function scamper() {
    if (!raccoon) return;

    // Random direction each run.
    const goingRight = Math.random() < 0.5;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const offscreen = 500; // frame width, so he fully clears the edge

    // Random vertical start: anywhere from the bottom up to ~near the top.
    const visibleHeight = 336 * 0.4;
    const maxBottom = Math.max(0, vh - visibleHeight - 20);
    raccoon.style.setProperty("--jimothy-bottom", `${Math.random() * maxBottom}px`);

    if (goingRight) {
      raccoon.style.setProperty("--jimothy-from", `${-offscreen}px`);
      raccoon.style.setProperty("--jimothy-to", `${vw}px`);
      raccoon.classList.add("jimothy-flip"); // art faces left, so flip to face right
    } else {
      raccoon.style.setProperty("--jimothy-from", `${vw}px`);
      raccoon.style.setProperty("--jimothy-to", `${-offscreen}px`);
      raccoon.classList.remove("jimothy-flip"); // art already faces left
    }

    // Randomize crossing speed a little for character.
    const duration = 11 + Math.random() * 6; // 11-17s to amble across
    raccoon.style.setProperty("--jimothy-cross-duration", `${duration}s`);

    // Restart animations.
    raccoon.classList.remove("jimothy-animate");
    void raccoon.offsetWidth; // force reflow so the animation replays
    raccoon.classList.add("jimothy-animate");
  }

  function onCrossEnd(e) {
    if (e.animationName !== "jimothy-cross") return;
    raccoon.classList.remove("jimothy-animate");
    raccoon.style.left = "-9999px"; // hide offscreen during the pause
    hopTimer = setTimeout(scamper, 4000 + Math.random() * 8000); // pause 4-12s
  }

  function enable() {
    wantEnabled = true;
    if (raccoon && raccoon.isConnected) return;
    raccoon = createRaccoon();
    raccoon.addEventListener("animationend", onCrossEnd);
    scamper();
    startGuard();
  }

  function disable() {
    wantEnabled = false;
    stopGuard();
    if (hopTimer) clearTimeout(hopTimer);
    hopTimer = null;
    if (raccoon) {
      raccoon.remove();
      raccoon = null;
    }
  }

  // SPA navigations often replace large chunks of the DOM (or the whole <body>),
  // taking Jimothy with them. Watch for his removal and bring him back.
  function startGuard() {
    if (guard) return;
    guard = new MutationObserver(() => {
      if (wantEnabled && (!raccoon || !raccoon.isConnected)) {
        if (hopTimer) clearTimeout(hopTimer);
        raccoon = createRaccoon();
        raccoon.addEventListener("animationend", onCrossEnd);
        scamper();
      }
    });
    guard.observe(document.documentElement, { childList: true, subtree: true });
  }

  function stopGuard() {
    if (guard) {
      guard.disconnect();
      guard = null;
    }
  }

  // Some sites (e.g. Wikipedia) ship a strict Content-Security-Policy whose
  // default-src / img-src does NOT allow the chrome-extension: scheme, so a
  // background-image pointing at chrome-extension://.../jimothy_run.png is
  // blocked and Jimothy never paints. We fetch the sprite from the extension
  // (a same-extension fetch, not governed by the page CSP) and inline it as a
  // data: URL. A data: URL is self-contained (unlike a blob: URL, which lives
  // in the content script's isolated-world registry that the page's resource
  // loader can't resolve) and is permitted by virtually every strict CSP
  // (Wikipedia's default-src explicitly allows `data:`).
  function boot() {
    // Respect the per-user toggle (default: on).
    chrome.storage.sync.get({ jimothyEnabled: true }, (cfg) => {
      if (cfg.jimothyEnabled) enable();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && "jimothyEnabled" in changes) {
        changes.jimothyEnabled.newValue ? enable() : disable();
      }
    });
  }

  fetch(FRAME_URL)
    .then((r) => r.blob())
    .then(
      (blob) =>
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(FRAME_URL);
          reader.readAsDataURL(blob);
        })
    )
    .then((url) => {
      spriteUrl = url;
    })
    .catch(() => {
      // Fall back to the extension URL (works on sites without a strict CSP).
    })
    .finally(boot);
})();
