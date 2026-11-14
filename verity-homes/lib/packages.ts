// Investment packages (Unit 17c): texts for the plan page's Select, the enquiry and WhatsApp.
import { formatNaira } from "@/lib/format";
import type { PackageAmounts } from "@/lib/invest";

type Pkg = PackageAmounts & { label?: string | null };

const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

/** "₦20,000,000 package", or "Starter (₦20,000,000)" when it has a label. */
export function packageName(p: Pkg): string {
  const amount = formatNaira(BigInt(p.amountKobo));
  return p.label?.trim() ? `${p.label.trim()} (${amount})` : `${amount} package`;
}

/** "I'm interested in the ₦20,000,000 package (receive ₦21,000,000 after 12 months) — <plan>." */
export function packageEnquiryMessage(p: Pkg, planName: string): string {
  return `I'm interested in the ${packageName(p)} (receive ${formatNaira(BigInt(p.returnAmountKobo))} after ${months(p.tenureMonths)}) — ${planName}.`;
}

/** WhatsApp text naming the package (same style as the property messages). */
export function packageWhatsappMessage(p: Pkg, planName: string, url: string): string {
  return `Hi Verity, I'm interested in the ${packageName(p)} of ${planName}: receive ${formatNaira(BigInt(p.returnAmountKobo))} after ${months(p.tenureMonths)} (${url})`;
}

/** Inbox line: "₦20,000,000 package — receive ₦21,000,000 after 12 months". */
export function packageSummary(p: Pkg): string {
  return `${packageName(p)} — receive ${formatNaira(BigInt(p.returnAmountKobo))} after ${months(p.tenureMonths)}`;
}
