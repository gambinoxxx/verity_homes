// Pure helpers for scripts/clear-samples.ts (Unit 21 step 10), unit-tested in
// tests/unit/clear-samples.test.ts. No Prisma, no env, no Blob calls here.

export type ClearMode = "dry-run" | "confirm";

/** `--dry-run` is the default; only an explicit `--confirm` deletes. Both together is an error. */
export function parseClearArgs(argv: readonly string[]): ClearMode {
  const confirm = argv.includes("--confirm");
  if (confirm && argv.includes("--dry-run")) {
    throw new Error("Pass either --dry-run or --confirm, not both.");
  }
  const unknown = argv.filter((a) => a.startsWith("--") && a !== "--confirm" && a !== "--dry-run");
  if (unknown.length) throw new Error(`Unknown option(s): ${unknown.join(", ")}`);
  return confirm ? "confirm" : "dry-run";
}

const BLOB_HOST = /\.public\.blob\.vercel-storage\.com$/;

/** Every absolute http(s) URL in a piece of text (Markdown bodies, JSON of rows…). */
export function urlsIn(text: string | null | undefined): string[] {
  if (!text) return [];
  return [...text.matchAll(/https?:\/\/[^\s)"'<>\]]+/g)].map((m) => m[0]);
}

/** Blob pathname ("samples/x.jpg", "e2e/samples/x.jpg"), or null when not a Vercel Blob URL. */
export function blobPathname(url: string): string | null {
  try {
    const u = new URL(url);
    return BLOB_HOST.test(u.hostname) ? decodeURIComponent(u.pathname.replace(/^\//, "")) : null;
  } catch {
    return null;
  }
}

/**
 * Blob files the sample rows use that may be deleted: Vercel Blob URLs whose path is under
 * `samples/` (optionally after the e2e/ prefix) and that NO real row mentions. Sample images in
 * /public/samples are part of the site code, not Blob, and are never touched.
 */
export function sampleBlobsToDelete(sampleUrls: readonly string[], realRowsText: string): string[] {
  const out = new Set<string>();
  for (const url of sampleUrls) {
    const path = blobPathname(url);
    if (!path || !/^(?:e2e\/)?samples\//.test(path)) continue;
    if (realRowsText.includes(url)) continue;
    out.add(url);
  }
  return [...out].sort();
}

/** SiteSettings text fields that still contain the sample marker (edited in admin, not deleted). */
export function settingsFieldsWithSample(
  settings: Record<string, unknown> | null,
  marker = "[SAMPLE]",
): string[] {
  if (!settings) return [];
  return Object.entries(settings)
    .filter(([, v]) => typeof v === "string" && v.includes(marker))
    .map(([k]) => k)
    .sort();
}
