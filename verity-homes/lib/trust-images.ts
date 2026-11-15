// Testimonial avatars and partner logos in Vercel Blob (Unit 19b): pure path helpers shared by
// the editors, the upload route and the actions. `<prefix>testimonials/<id>/…` and
// `<prefix>partners/<id>/…`; `prefix` is "" in production and "e2e/" in Playwright runs.
import { photoBaseName, photoExt } from "@/lib/property-photos";

export type TrustKind = "testimonials" | "partners";

const ID_RE = /^[a-z0-9]{8,40}$/;
const FILE_RE = /^[A-Za-z0-9_-]+\.(jpg|webp|png)$/;

/** Logos must be one of these (PNG keeps transparency); checked before upload and in the route. */
export const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
/** Logos are shown ≤ 160×56 in the marquee: 800 px on the long side is plenty, never upscaled. */
export const LOGO_MAX_SIDE = 800;
/** Avatars are shown at 56 px: 400 px is plenty (2× and more), never upscaled. */
export const AVATAR_MAX_SIDE = 400;

export function isLogoContentType(type: string): boolean {
  return (LOGO_CONTENT_TYPES as readonly string[]).includes(type);
}

export function trustFolder(prefix: string, kind: TrustKind, id: string): string | null {
  return ID_RE.test(id) ? `${prefix}${kind}/${id}/` : null;
}

export function trustImagePathname(
  prefix: string,
  kind: TrustKind,
  id: string,
  fileName: string,
  contentType: string,
): string {
  return `${prefix}${kind}/${id}/${photoBaseName(fileName)}.${photoExt(contentType)}`;
}

export function isTrustImagePathname(
  prefix: string,
  kind: TrustKind,
  id: string,
  pathname: string,
): boolean {
  const folder = trustFolder(prefix, kind, id);
  return (
    folder !== null && pathname.startsWith(folder) && FILE_RE.test(pathname.slice(folder.length))
  );
}

/** `{ kind, id }` from `[e2e/]testimonials|partners/<id>/<file>`, or null. */
export function trustTargetFromPathname(
  prefix: string,
  pathname: string,
): { kind: TrustKind; id: string } | null {
  for (const kind of ["testimonials", "partners"] as const) {
    if (!pathname.startsWith(`${prefix}${kind}/`)) continue;
    const id = pathname.slice(`${prefix}${kind}/`.length).split("/")[0] ?? "";
    return isTrustImagePathname(prefix, kind, id, pathname) ? { kind, id } : null;
  }
  return null;
}

/** True if the Blob URL is a file in this record's folder (checked before saving it). */
export function isTrustImageUrl(prefix: string, kind: TrustKind, id: string, url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || !u.hostname.endsWith(".public.blob.vercel-storage.com"))
      return false;
    return isTrustImagePathname(prefix, kind, id, decodeURIComponent(u.pathname.slice(1)));
  } catch {
    return false;
  }
}
