(function () {
  "use strict";

  const ID = "jimothy-raccoon";
  if (document.getElementById(ID)) return; // avoid duplicates on re-injection

  const FRAME_URL = chrome.runtime.getURL("assets/jimothy_run.png");
  let raccoon = null;
  let hopTimer = null;

  function createRaccoon() {
    const el = document.createElement("div");
    el.id = ID;
    el.style.backgroundImage = `url("${FRAME_URL}")`;
    document.documentElement.appendChild(el);
    return el;
  }

  function scamper() {
    if (!raccoon) return;

    // Random direction each run.
    const goingRight = Math.random() < 0.5;
    const vw = window.innerWidth;
    const offscreen = 480; // frame width, so he fully clears the edge

    if (goingRight) {
      raccoon.style.setProperty("--jimothy-from", `${-offscreen}px`);
      raccoon.style.setProperty("--jimothy-to", `${vw}px`);
      raccoon.classList.remove("jimothy-flip");
    } else {
      raccoon.style.setProperty("--jimothy-from", `${vw}px`);
      raccoon.style.setProperty("--jimothy-to", `${-offscreen}px`);
      raccoon.classList.add("jimothy-flip");
    }

    // Randomize crossing speed a little for character.
    const duration = 5 + Math.random() * 4; // 5-9s
    raccoon.style.setProperty("--jimothy-cross-duration", `${duration}s`);

    // Restart animations.
    raccoon.classList.remove("jimothy-animate");
    void raccoon.offsetWidth; // force reflow so the animation replays
    raccoon.classList.add("jimothy-animate");
  }

  function onCrossEnd(e) {
    if (e.animationName !== "jimothy-cross") return;
    raccoon.classList.remove("jimothy-animate");
    hopTimer = setTimeout(scamper, 4000 + Math.random() * 8000); // pause 4-12s
  }

  function enable() {
    if (raccoon) return;
    raccoon = createRaccoon();
    raccoon.addEventListener("animationend", onCrossEnd);
    scamper();
  }

  function disable() {
    if (hopTimer) clearTimeout(hopTimer);
    hopTimer = null;
    if (raccoon) {
      raccoon.remove();
      raccoon = null;
    }
  }

  // Respect the per-user toggle (default: on).
  chrome.storage.sync.get({ jimothyEnabled: true }, (cfg) => {
    if (cfg.jimothyEnabled) enable();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && "jimothyEnabled" in changes) {
      changes.jimothyEnabled.newValue ? enable() : disable();
    }
  });
})();
