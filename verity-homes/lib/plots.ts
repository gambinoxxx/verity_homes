// Plot options on a listing (Unit 17b): pure helpers for cards, the property page, enquiries
// and WhatsApp text. Unit-tested in tests/unit/plots.test.ts.
import { formatNaira } from "@/lib/format";

export type PlotLike = {
  id?: string;
  label?: string | null;
  sizeSqm: number;
  priceKobo: number | bigint;
  initialDepositKobo?: number | bigint | null;
  suitableFor?: string | null;
};

const num = (n: number) => n.toLocaleString("en-NG");

/** "300 sqm" or "300–1,000 sqm" (smallest–largest); null when there are no plots. */
export function plotSizeRange(plots: readonly { sizeSqm: number }[]): string | null {
  if (!plots.length) return null;
  const sizes = plots.map((p) => p.sizeSqm);
  const lo = Math.min(...sizes);
  const hi = Math.max(...sizes);
  return lo === hi ? `${num(lo)} sqm` : `${num(lo)}–${num(hi)} sqm`;
}

/** The lowest initial deposit across plots, in kobo, or null if none has one. */
export function lowestDepositKobo(plots: readonly PlotLike[]): bigint | null {
  const deposits = plots
    .map((p) => (p.initialDepositKobo == null ? null : BigInt(p.initialDepositKobo)))
    .filter((d): d is bigint => d !== null);
  return deposits.length ? deposits.reduce((a, b) => (b < a ? b : a)) : null;
}

/** "Initial deposit from ₦1,000,000" (or "Initial deposit ₦1,000,000" for one plot). */
export function depositLabel(plots: readonly PlotLike[]): string | null {
  const low = lowestDepositKobo(plots);
  if (low === null) return null;
  const withDeposit = plots.filter((p) => p.initialDepositKobo != null).length;
  return `Initial deposit ${withDeposit > 1 ? "from " : ""}${formatNaira(low)}`;
}

/** "500 sqm plot", or "Duplex plot (500 sqm)" when the plot has a label. */
export function plotName(p: Pick<PlotLike, "label" | "sizeSqm">): string {
  const size = `${num(p.sizeSqm)} sqm`;
  return p.label?.trim() ? `${p.label.trim()} (${size})` : `${size} plot`;
}

/** Enquiry message when the visitor picks a plot. */
export function plotEnquiryMessage(title: string, p: PlotLike): string {
  return `I'm interested in the ${plotName(p)} at ${title} (${formatNaira(BigInt(p.priceKobo))}). Please contact me.`;
}

/** WhatsApp text when a plot is picked (same style as propertyWhatsappMessage). */
export function plotWhatsappMessage(title: string, p: PlotLike, url: string): string {
  return `Hi Verity, I'm interested in the ${plotName(p)} at ${title}, ${formatNaira(BigInt(p.priceKobo))} (${url})`;
}

/** The offer note shows until offerEndsAt (no end date → always). */
export function isOfferActive(offerEndsAt: Date | string | null | undefined, now: Date): boolean {
  if (!offerEndsAt) return true;
  return new Date(offerEndsAt).getTime() > now.getTime();
}
