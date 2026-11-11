// "Saved" (heart) properties, kept in localStorage only: no accounts (project-overview.md).
// Storage can be unavailable (private mode, quota, disabled), so every access is guarded.
const KEY = "verity:saved-properties";
const EVENT = "verity:saved-change";

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Snapshot for useSyncExternalStore: the raw stored string, so it is stable between calls. */
export function getSavedSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

export const getSavedServerSnapshot = (): string => "[]";

export function isSaved(snapshot: string, slug: string): boolean {
  try {
    const parsed: unknown = JSON.parse(snapshot);
    return Array.isArray(parsed) && parsed.includes(slug);
  } catch {
    return false;
  }
}

/** Adds or removes a slug. Returns the new state, or null if it could not be stored. */
export function toggleSaved(slug: string): boolean | null {
  const list = read();
  const saved = !list.includes(slug);
  const next = saved ? [...list, slug] : list.filter((s) => s !== slug);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    return null;
  }
  window.dispatchEvent(new Event(EVENT));
  return saved;
}

/** Subscribe to changes from this tab (custom event) and other tabs (storage event). */
export function subscribeSaved(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === null || e.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
