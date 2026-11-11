// "Site loaded" signal: the preloader has lifted (or was skipped). The hero headline and
// slideshow wait for it. Sets `body.loaded` (the design's hook) and fires an event once.
const EVENT = "verity:loaded";

export function markSiteLoaded(): void {
  if (document.body.classList.contains("loaded")) return;
  document.body.classList.add("loaded");
  window.dispatchEvent(new Event(EVENT));
}

/** Runs `cb` once the site has loaded (immediately if it already has). Returns a cleanup. */
export function onSiteLoaded(cb: () => void): () => void {
  if (document.body.classList.contains("loaded")) {
    cb();
    return () => {};
  }
  window.addEventListener(EVENT, cb, { once: true });
  return () => window.removeEventListener(EVENT, cb);
}
