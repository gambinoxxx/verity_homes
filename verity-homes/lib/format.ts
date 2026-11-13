// Money and label formatting. Money is always kobo (BigInt) in the database.
export type PricePeriod = "ONE_OFF" | "PER_YEAR" | "PER_MONTH";

const naira = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });
const nairaKobo = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 25_000_000_000n kobo → "₦250,000,000" (adds .50 only when there are kobo). */
export function formatNaira(kobo: bigint | number): string {
  const k = BigInt(kobo);
  const whole = k / 100n;
  const rest = k % 100n;
  if (rest === 0n) return `₦${naira.format(whole)}`;
  return `₦${nairaKobo.format(Number(k) / 100)}`;
}

/** Admin input "₦250,000,000" or "3500000" → kobo. Throws on junk or negatives. */
export function koboFromNaira(input: string): bigint {
  const clean = input.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) throw new Error("Enter a valid amount in naira");
  const [whole = "0", frac = ""] = clean.split(".");
  return BigInt(whole) * 100n + BigInt((frac + "00").slice(0, 2));
}

const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** Kobo → what the admin price input shows: "250,000,000" (".50" only when there are kobo). */
export function nairaInputFromKobo(kobo: bigint | null): string {
  if (kobo === null) return "";
  const whole = groupThousands((kobo / 100n).toString());
  const rest = kobo % 100n;
  return rest === 0n ? whole : `${whole}.${rest.toString().padStart(2, "0")}`;
}

/**
 * Admin price input as she types: keeps digits and one decimal point (2 places), adds thousands
 * separators. "2500000" → "2,500,000"; "₦1,2a3" → "123"; "10.555" → "10.55".
 */
export function formatNairaInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const dot = cleaned.indexOf(".");
  const intPart = (dot === -1 ? cleaned : cleaned.slice(0, dot)).replace(/^0+(?=\d)/, "");
  const grouped = groupThousands(intPart);
  if (dot === -1) return grouped;
  const frac = cleaned
    .slice(dot + 1)
    .replace(/\./g, "")
    .slice(0, 2);
  return `${grouped || "0"}.${frac}`;
}

const PERIOD: Record<PricePeriod, string> = {
  ONE_OFF: "",
  PER_YEAR: " / year",
  PER_MONTH: " / month",
};

export function formatPrice(p: {
  priceKobo: bigint | null;
  pricePeriod: PricePeriod;
  priceOnRequest: boolean;
}): string {
  if (p.priceOnRequest || p.priceKobo === null) return "Price on request";
  return formatNaira(p.priceKobo) + PERIOD[p.pricePeriod];
}

export const LISTING_LABEL = {
  SALE: "For sale",
  RENT: "For rent",
  LAND: "Land",
  OFF_PLAN: "Off-plan",
} as const;
export const TITLE_LABEL = {
  C_OF_O: "C of O",
  GOVERNORS_CONSENT: "Governor's Consent",
  REGISTERED_DEED: "Registered Deed",
  EXCISION: "Excision",
  OTHER: "Other",
} as const;
export const PAYOUT_LABEL = {
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
  AT_MATURITY: "At maturity",
} as const;

const dateFmt = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

/** 2026-11-11 → "11 Nov 2026" (Lagos time, so server and browser agree). */
export function formatDate(d: Date): string {
  return dateFmt.format(d);
}

export const PROJECT_STATUS_LABEL = {
  SELLING_NOW: "Selling now",
  OFF_PLAN: "Off-plan",
  UNDER_CONSTRUCTION: "Under construction",
  COMPLETED: "Completed",
} as const;

const monthYearFmt = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
  timeZone: "Africa/Lagos",
});

/** 2028-06-01 → "Jun 2028" (Lagos time). Used for off-plan completion dates. */
export function formatMonthYear(d: Date): string {
  return monthYearFmt.format(d);
}

export const INTEREST_LABEL = {
  BUYING: "Buying",
  RENTING: "Renting",
  LAND: "Land",
  INVESTING: "Investing",
  MANAGEMENT: "Property management",
  DEVELOPMENT: "Development",
  LISTING: "Listing a property",
  OTHER: "General enquiry",
} as const;

export const SOURCE_LABEL = {
  HOME_PAGE: "Home page",
  PROPERTY_PAGE: "Property page",
  INVEST_PAGE: "Invest page",
  CONTACT_PAGE: "Contact page",
} as const;

/**
 * Short relative time for admin lists: "Just now", "5 min ago", "3 h ago", "Yesterday",
 * "4 days ago"; a week or older → the date ("12 Nov 2026").
 */
export function timeAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(date);
}
