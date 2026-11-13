// Property photos (Unit 15): pure helpers shared by the editor, the upload route and the
// actions. Unit-tested in tests/unit/property-photos.test.ts.

export const MAX_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB
export const PHOTO_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_PHOTO_SIDE = 2400; // px, long side after the in-browser resize
export const PHOTO_QUALITY = 0.82;
export const ALT_MAX = 200;

/** Moves one item; out-of-range moves return the list unchanged (a new array either way). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}

/** Width/height that fit inside `max` on the long side, keeping the ratio (never upscales). */
export function fitWithin(width: number, height: number, max = MAX_PHOTO_SIDE) {
  const long = Math.max(width, height);
  if (long <= max) return { width, height };
  const scale = max / long;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

/** "My Photo (1).HEIC" → "my-photo-1"; empty → "photo". */
export function photoBaseName(fileName: string): string {
  const base = fileName.replace(/\.[^.]*$/, "");
  const slug = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "photo";
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/png": "png",
};

/**
 * Upload pathname: `<prefix>properties/<propertyId>/<name>.<ext>`. Blob adds a random suffix
 * before the extension. `prefix` is "" in production and "e2e/" in Playwright runs.
 */
export function photoPathname(
  prefix: string,
  propertyId: string,
  fileName: string,
  contentType: string,
): string {
  return `${prefix}properties/${propertyId}/${photoBaseName(fileName)}.${EXT[contentType] ?? "jpg"}`;
}

const ID_RE = /^[a-z0-9]{8,40}$/;

/** The folder a property's photos must live in (checked by the route and the save action). */
export function photoFolder(prefix: string, propertyId: string): string | null {
  if (!ID_RE.test(propertyId)) return null;
  return `${prefix}properties/${propertyId}/`;
}

/** True if `pathname` is a photo file directly inside the property's folder. */
export function isPropertyPhotoPathname(
  prefix: string,
  propertyId: string,
  pathname: string,
): boolean {
  const folder = photoFolder(prefix, propertyId);
  if (!folder || !pathname.startsWith(folder)) return false;
  // Our name is lowercase; Blob's random suffix is mixed-case letters and digits.
  return /^[A-Za-z0-9_-]+\.(jpg|webp|png)$/.test(pathname.slice(folder.length));
}

/** The property id from a pathname like `[e2e/]properties/<id>/<file>`, or null. */
export function propertyIdFromPathname(prefix: string, pathname: string): string | null {
  if (!pathname.startsWith(`${prefix}properties/`)) return null;
  const id = pathname.slice(`${prefix}properties/`.length).split("/")[0] ?? "";
  return isPropertyPhotoPathname(prefix, id, pathname) ? id : null;
}

/** Which photos have no description yet (1-based numbers, for the warning). */
export function photosMissingAlt(photos: readonly { alt: string }[]): number[] {
  return photos.flatMap((p, i) => (p.alt.trim() ? [] : [i + 1]));
}

/** A coordinate with 6 decimals (about 11 cm), as the map picker writes it: "6.447400". */
export function roundCoord(n: number): string {
  return n.toFixed(6);
}
