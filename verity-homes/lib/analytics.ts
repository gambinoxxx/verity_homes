// One analytics helper for the whole site (Unit 21 step 3). GA4 (NEXT_PUBLIC_GA_ID) and the
// optional Meta Pixel (NEXT_PUBLIC_META_PIXEL_ID) are loaded by components/site/analytics.tsx,
// and only after the visitor accepts cookies. Without an ID or without consent, track() does
// nothing. Unit-tested in tests/unit/analytics.test.ts.
import { readConsent, type Consent } from "./consent";

export type AnalyticsEvent =
  | "generate_lead"
  | "whatsapp_click"
  | "phone_click"
  | "email_click"
  | "plan_package_select"
  | "newsletter_signup"
  | "view_item"
  | "view_plan";

export type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

export type AnalyticsConfig = { gaId: string | null; pixelId: string | null };

const GA_ID = /^G-[A-Z0-9]{4,20}$/;
const PIXEL_ID = /^\d{6,20}$/;

/** IDs from the build env. A malformed value is ignored (treated as unset), never sent. */
export function parseAnalyticsConfig(gaId?: string, pixelId?: string): AnalyticsConfig {
  const ga = gaId?.trim().toUpperCase() ?? "";
  const px = pixelId?.trim() ?? "";
  return { gaId: GA_ID.test(ga) ? ga : null, pixelId: PIXEL_ID.test(px) ? px : null };
}

/** Written out in full so Next inlines the values into the browser bundle. */
export function analyticsConfig(): AnalyticsConfig {
  return parseAnalyticsConfig(process.env.NEXT_PUBLIC_GA_ID, process.env.NEXT_PUBLIC_META_PIXEL_ID);
}

export function analyticsEnabled(config: AnalyticsConfig = analyticsConfig()): boolean {
  return Boolean(config.gaId || config.pixelId);
}

/** Meta standard events; anything else goes as a custom event. */
const PIXEL_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  generate_lead: "Lead",
  whatsapp_click: "Contact",
  phone_click: "Contact",
  email_click: "Contact",
  newsletter_signup: "CompleteRegistration",
  view_item: "ViewContent",
  view_plan: "ViewContent",
};

/** Drops empty values and caps strings, so a long message or URL never goes out whole. */
export function cleanParams(params: AnalyticsParams): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = typeof v === "string" ? v.slice(0, 100) : v;
  }
  return out;
}

type GtagWindow = {
  dataLayer?: unknown[];
  fbq?: (...args: unknown[]) => void;
};

export type TrackDeps = {
  consent: () => Consent | null;
  config: () => AnalyticsConfig;
  win: () => GtagWindow | undefined;
};

const browserDeps: TrackDeps = {
  consent: readConsent,
  config: analyticsConfig,
  win: () => (typeof window === "undefined" ? undefined : (window as unknown as GtagWindow)),
};

/**
 * gtag() as Google's snippet defines it: it must push the `arguments` object, not an array.
 * Creates the dataLayer if needed.
 */
export function gtag(w: GtagWindow, ...args: unknown[]): void {
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push(toArguments(...args));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- only `arguments` is used
function toArguments(..._values: unknown[]): IArguments {
  // eslint-disable-next-line prefer-rest-params
  return arguments;
}

/**
 * Sends one event to GA4 and/or the Meta Pixel. Returns true if it went anywhere.
 * No-op on the server, without consent, or when no ID is set.
 */
export function track(
  event: AnalyticsEvent,
  params: AnalyticsParams = {},
  deps: TrackDeps = browserDeps,
): boolean {
  const w = deps.win();
  if (!w || deps.consent() !== "granted") return false;
  const { gaId, pixelId } = deps.config();
  const clean = cleanParams(params);
  let sent = false;
  if (gaId) {
    gtag(w, "event", event, clean);
    sent = true;
  }
  if (pixelId && typeof w.fbq === "function") {
    const standard = PIXEL_EVENTS[event];
    if (standard) w.fbq("track", standard, clean);
    else w.fbq("trackCustom", event, clean);
    sent = true;
  }
  return sent;
}

/**
 * generate_lead params: the form type (EnquirySource) and, on a property or plan page, the
 * slug from the address bar ("/properties/<slug>", "/invest/<slug>").
 */
export function leadParams(formType: string, pathname: string): AnalyticsParams {
  return { form_type: formType, ...pageSlugs(pathname), page_path: pathname };
}

/** The property or plan slug of a detail page path; empty elsewhere. */
export function pageSlugs(pathname: string): { property_slug?: string; plan_slug?: string } {
  const m = /^\/(properties|invest)\/([^/?#]+)\/?$/.exec(pathname);
  const raw = m?.[2];
  if (!m || !raw || (m[1] === "properties" && raw === "in")) return {};
  let slug = raw;
  try {
    slug = decodeURIComponent(raw);
  } catch {
    // malformed escape: keep it as typed
  }
  return m[1] === "properties" ? { property_slug: slug } : { plan_slug: slug };
}

/** The event for a tap on a `data-contact` link (header, float, footer, contact cards…). */
export function contactEvent(kind: string | null | undefined): AnalyticsEvent | null {
  if (kind === "whatsapp") return "whatsapp_click";
  if (kind === "phone") return "phone_click";
  if (kind === "email") return "email_click";
  return null;
}
