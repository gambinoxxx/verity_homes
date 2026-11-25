// Cookie consent (Unit 21 step 2, NDPA). The visitor's Accept/Decline choice is kept in
// localStorage; when storage is blocked (private mode, site data off) it lives in memory for the
// visit, so the banner still goes away after a click. No choice = nothing analytics/ads loads.
// Read with useSyncExternalStore(subscribeConsent, readConsent, () => null).

export type Consent = "granted" | "denied";

const KEY = "verity:cookie-consent";
const EVENT = "verity:consent-change";

let memory: Consent | null = null;

function isConsent(v: unknown): v is Consent {
  return v === "granted" || v === "denied";
}

/** The saved choice, or null when the visitor hasn't chosen (or on the server). */
export function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(KEY);
    if (isConsent(v)) return v;
  } catch {
    // storage blocked: fall back to this visit's choice
  }
  return memory;
}

/** Saves the choice (null forgets it, so the banner shows again) and tells subscribers. */
export function writeConsent(choice: Consent | null): void {
  if (typeof window === "undefined") return;
  memory = choice;
  try {
    if (choice) window.localStorage.setItem(KEY, choice);
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage blocked: `memory` keeps it for this visit
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Calls `cb` when the choice changes here or in another tab. Returns a cleanup. */
export function subscribeConsent(cb: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) cb();
  };
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}
