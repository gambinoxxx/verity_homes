// Investment copy shared by the home invest section (Unit 4) and /invest (Unit 9).
// Never promise fixed returns in this copy: architecture.md invariant 6 bans the "g-word".
// tests/unit/invest-copy.test.ts scans public source for it.

/** Required wherever plans appear. Wording from design/invest.html, pending legal review (Q5). */
export const INVEST_DISCLAIMER =
  "Investment returns are subject to the terms of your signed agreement. Please read all documents carefully before investing. [Final disclosure wording to be reviewed for regulatory compliance before launch.]";

export const INVEST_STEPS = [
  { title: "Choose a plan", text: "Pick the amount and tenure that suits your goals." },
  { title: "Sign your agreement", text: "Receive a written investment agreement and receipt." },
  { title: "Earn returns", text: "Returns are paid on the agreed schedule." },
  { title: "Exit or own", text: "At maturity, collect your capital or convert to property." },
] as const;

export const INVEST_LEAD =
  "Put your funds into carefully selected property projects run with our development partners. Earn agreed returns over a fixed term — then take your capital back or convert it into property.";

// ---- Unit 17c: package maths. Money stays in kobo (BigInt) and is only formatted, never
// rounded; the per-year figure is a percentage for display (1 decimal). ----

export type PackageAmounts = {
  amountKobo: bigint | number;
  returnAmountKobo: bigint | number;
  tenureMonths: number;
};

/** Expected gain at maturity: return − amount (kobo). */
export function packageGainKobo(p: PackageAmounts): bigint {
  return BigInt(p.returnAmountKobo) - BigInt(p.amountKobo);
}

/**
 * Expected return per year, compounded: ((return / amount) ^ (12 / tenure) − 1) × 100, to
 * 1 decimal. ₦30M → ₦32.5M over 12 months = 8.3. Null when the inputs can't give a figure.
 */
export function annualisedPercent(p: PackageAmounts): number | null {
  const amount = Number(p.amountKobo);
  const ret = Number(p.returnAmountKobo);
  if (!(amount > 0) || !(ret > 0) || !(p.tenureMonths > 0)) return null;
  const pct = ((ret / amount) ** (12 / p.tenureMonths) - 1) * 100;
  return Math.round(pct * 10) / 10;
}

/** "8.3%" (always 1 decimal: "5.0%"). */
export function formatPercent(pct: number): string {
  return `${pct.toFixed(1)}%`;
}

/** The smallest package amount (kobo) — the plan's "from" figure — or null with no packages. */
export function planFromAmountKobo(packages: readonly Pick<PackageAmounts, "amountKobo">[]): bigint | null {
  if (!packages.length) return null;
  return packages.map((p) => BigInt(p.amountKobo)).reduce((a, b) => (b < a ? b : a));
}

/** Tenure label from packages: "12 months", or "6–24 months" when they differ. */
export function tenureLabel(months: readonly number[]): string | null {
  if (!months.length) return null;
  const lo = Math.min(...months);
  const hi = Math.max(...months);
  const m = (n: number) => `${n} month${n === 1 ? "" : "s"}`;
  return lo === hi ? m(lo) : `${lo}–${m(hi)}`;
}
