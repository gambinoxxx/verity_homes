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
