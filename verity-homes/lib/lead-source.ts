// Lead source tracking (Unit 21 step 4). On the first page of a visit we note where the visitor
// came from (UTM tags, Google/Meta click IDs, the landing page, the referring site) in
// sessionStorage; every enquiry sent during that visit carries it, and the admin inbox and CSV
// show it as one readable "Source" ("Google Ads · land-lekki", "Instagram", "Google search",
// "Direct"). Pure helpers except captureFirstTouch/readFirstTouch (browser, try/catch).
// Unit-tested in tests/unit/lead-source.test.ts.

export type LeadSource = {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  fbclid?: string | null;
  /** First page of the visit: path + query, e.g. "/land-for-sale-lagos?utm_source=google". */
  landingPage?: string | null;
  /** The referring page without its query string, e.g. "https://www.google.com/". Empty = none. */
  referrer?: string | null;
};

/** Longest value kept per field (also enforced by the enquiry schema). */
export const LEAD_SOURCE_LIMITS = {
  utmSource: 150,
  utmMedium: 150,
  utmCampaign: 150,
  utmTerm: 150,
  utmContent: 150,
  gclid: 255,
  fbclid: 255,
  landingPage: 300,
  referrer: 300,
} as const satisfies Record<keyof LeadSource, number>;

export const LEAD_SOURCE_FIELDS = Object.keys(LEAD_SOURCE_LIMITS) as (keyof LeadSource)[];

const PARAMS: [keyof LeadSource, string][] = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "utm_campaign"],
  ["utmTerm", "utm_term"],
  ["utmContent", "utm_content"],
  ["gclid", "gclid"],
  ["fbclid", "fbclid"],
];

/** Trims, drops control characters and caps the length; empty → undefined. */
export function clipValue(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return s ? s.slice(0, max) : undefined;
}

/** What to remember about the first page of a visit. */
export function firstTouchFrom(href: string, referrer: string): LeadSource {
  const url = new URL(href);
  const out: LeadSource = {};
  for (const [key, param] of PARAMS) {
    const v = clipValue(url.searchParams.get(param), LEAD_SOURCE_LIMITS[key]);
    if (v) out[key] = v;
  }
  out.landingPage = clipValue(url.pathname + url.search, LEAD_SOURCE_LIMITS.landingPage);
  let ref: URL | null = null;
  try {
    ref = referrer ? new URL(referrer) : null;
  } catch {
    ref = null;
  }
  // Our own pages are not a source (a new tab opened from the site).
  if (ref && ref.host !== url.host && /^https?:$/.test(ref.protocol)) {
    out.referrer = clipValue(`${ref.origin}${ref.pathname}`, LEAD_SOURCE_LIMITS.referrer);
  }
  return out;
}

const STORE_KEY = "verity:first-touch";

/** Saves the first touch once per visit (tab). Storage blocked → nothing is kept. */
export function captureFirstTouch(): void {
  try {
    if (window.sessionStorage.getItem(STORE_KEY)) return;
    const touch = firstTouchFrom(window.location.href, document.referrer);
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(touch));
  } catch {
    // storage blocked or bad URL: the enquiry is still sent, just without a source
  }
}

/** This visit's first touch, cleaned; {} when none. */
export function readFirstTouch(): LeadSource {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    return raw ? cleanLeadSource(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

/** Keeps only known fields, as clipped strings. Used on stored JSON and on the server. */
export function cleanLeadSource(input: unknown): LeadSource {
  const out: LeadSource = {};
  if (!input || typeof input !== "object") return out;
  for (const key of LEAD_SOURCE_FIELDS) {
    const v = clipValue((input as Record<string, unknown>)[key], LEAD_SOURCE_LIMITS[key]);
    if (v) out[key] = v;
  }
  return out;
}

// ---- "Source" label ----

const NETWORKS: [RegExp, string][] = [
  [/^(google|adwords|gads)$/, "Google"],
  [/^(facebook|fb|meta)$/, "Facebook"],
  [/^(instagram|ig)$/, "Instagram"],
  [/^(whatsapp|wa)$/, "WhatsApp"],
  [/^(bing|microsoft)$/, "Bing"],
  [/^(tiktok)$/, "TikTok"],
  [/^(linkedin)$/, "LinkedIn"],
  [/^(twitter|x)$/, "X (Twitter)"],
  [/^(youtube|yt)$/, "YouTube"],
  [/^(nairaland)$/, "Nairaland"],
  [/^(propertypro|propertypro\.ng)$/, "PropertyPro"],
];

const REFERRERS: [RegExp, string][] = [
  [/(^|\.)google\.[a-z.]+$/, "Google search"],
  [/(^|\.)bing\.com$/, "Bing search"],
  [/(^|\.)(duckduckgo\.com|search\.yahoo\.com|yandex\.[a-z]+)$/, "Web search"],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me)$/, "Facebook"],
  [/(^|\.)instagram\.com$/, "Instagram"],
  [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "X (Twitter)"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"],
  [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)tiktok\.com$/, "TikTok"],
];

const PAID = /^(cpc|ppc|paid|paid[_-]?social|paid[_-]?search|ads?|display|sponsored|boost(ed)?)$/;

function networkName(utmSource: string): string {
  const s = utmSource.toLowerCase().trim();
  const hit = NETWORKS.find(([re]) => re.test(s));
  return hit ? hit[1] : utmSource.trim();
}

function referrerName(referrer: string): string | null {
  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase();
  } catch {
    return null;
  }
  const hit = REFERRERS.find(([re]) => re.test(host));
  return hit ? hit[1] : host.replace(/^www\./, "");
}

/**
 * One readable source for the admin inbox and CSV. null when nothing was recorded (enquiries
 * from before tracking, or storage was blocked).
 */
export function describeSource(s: LeadSource): string | null {
  const campaign = s.utmCampaign?.trim();
  const withCampaign = (label: string) => (campaign ? `${label} · ${campaign}` : label);
  const medium = s.utmMedium?.toLowerCase().trim() ?? "";

  if (s.utmSource?.trim()) {
    const name = networkName(s.utmSource);
    const paid = PAID.test(medium) || (name === "Google" && Boolean(s.gclid));
    return withCampaign(paid ? `${name} Ads` : name);
  }
  if (s.gclid) return withCampaign("Google Ads");
  if (s.fbclid) {
    const fromRef = s.referrer ? referrerName(s.referrer) : null;
    return withCampaign(fromRef === "Instagram" ? "Instagram" : "Facebook");
  }
  if (s.referrer) {
    const name = referrerName(s.referrer);
    if (name) return withCampaign(name);
  }
  if (s.landingPage) return withCampaign("Direct");
  return null;
}

const DETAIL_LABELS: [keyof LeadSource, string][] = [
  ["utmSource", "utm_source"],
  ["utmMedium", "utm_medium"],
  ["utmCampaign", "Campaign"],
  ["utmTerm", "Keyword"],
  ["utmContent", "Ad"],
  ["landingPage", "Landing page"],
  ["referrer", "Came from"],
  ["gclid", "Google click ID"],
  ["fbclid", "Meta click ID"],
];

/** The recorded values as [label, value] pairs for the admin detail (click IDs shortened). */
export function leadSourceDetails(s: LeadSource): [string, string][] {
  const out: [string, string][] = [];
  for (const [key, label] of DETAIL_LABELS) {
    const v = s[key];
    if (!v) continue;
    out.push([label, key === "gclid" || key === "fbclid" ? `${v.slice(0, 12)}…` : v]);
  }
  return out;
}
