"use client";

// "Site loaded" signal: the preloader has lifted (or was skipped). The hero headline and
// slideshow wait for it. Kept in module state (it survives client-side navigation) and read
// through React (`useSiteLoaded`), never as a class written onto <body>.
import { useSyncExternalStore } from "react";

const EVENT = "verity:loaded";
let loaded = false;

export function markSiteLoaded(): void {
  if (loaded) return;
  loaded = true;
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange);
  return () => window.removeEventListener(EVENT, onChange);
}

/** true once the preloader has lifted. false in the server HTML. */
export function useSiteLoaded(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => loaded,
    () => false,
  );
}

/** Runs `cb` once the site has loaded (immediately if it already has). Returns a cleanup. */
export function onSiteLoaded(cb: () => void): () => void {
  if (loaded) {
    cb();
    return () => {};
  }
  window.addEventListener(EVENT, cb, { once: true });
  return () => window.removeEventListener(EVENT, cb);
}
