const toggle = document.getElementById("toggle");

chrome.storage.sync.get({ jimothyEnabled: true }, (cfg) => {
  toggle.checked = cfg.jimothyEnabled;
});

toggle.addEventListener("change", () => {
  chrome.storage.sync.set({ jimothyEnabled: toggle.checked });
});
