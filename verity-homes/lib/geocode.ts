// Nominatim (OpenStreetMap) geocoding for the admin map picker's "Centre on area" (Unit 15).
// Usage policy: https://operations.osmfoundation.org/policies/nominatim/ — a descriptive
// User-Agent + Referer, at most 1 request per second, no bulk use. Requests are queued here so
// only one is in flight per server instance, spaced at least 1.1 s apart.
import "server-only";

const ENDPOINT = "https://nominatim.openstreetmap.org/search";
const MIN_GAP_MS = 1100;
const TIMEOUT_MS = 8000;

let queue: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export type GeocodeResult =
  { ok: true; data: { lat: number; lng: number; label: string } } | { ok: false; error: string };

const FAILED =
  "We couldn't find that area on the map right now. Drag the pin or type the coordinates instead.";

async function request(query: string): Promise<GeocodeResult> {
  const wait = lastRequestAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();
  const url = `${ENDPOINT}?${new URLSearchParams({ format: "json", limit: "1", countrycodes: "ng", q: query })}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": `VerityHomesAdmin/1.0 (property map picker; ${siteUrl()})`,
        Referer: siteUrl(),
        "Accept-Language": "en",
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (res.status === 429 || res.status === 403) {
      return {
        ok: false,
        error:
          "The map search is busy or blocked right now. Drag the pin or type the coordinates instead.",
      };
    }
    if (!res.ok) return { ok: false, error: FAILED };
    const rows = (await res.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = rows[0];
    const lat = Number(first?.lat);
    const lng = Number(first?.lon);
    if (!first || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: `No match for “${query}”. Check the area name, or drag the pin.` };
    }
    return { ok: true, data: { lat, lng, label: first.display_name ?? query } };
  } catch {
    return { ok: false, error: FAILED };
  }
}

/** One request at a time (queued), ≥ 1.1 s apart. */
export function geocode(query: string): Promise<GeocodeResult> {
  const run = queue.then(() => request(query));
  queue = run.catch(() => undefined);
  return run;
}
