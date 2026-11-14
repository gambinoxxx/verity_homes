// "Select" on an investment package (Unit 17c) → the plan page's enquiry form gets the plan,
// amount, message and hidden packageId, and the WhatsApp button names the package. A window
// event, like lib/plot-select.ts and lib/invest-plan-select.ts.
const EVENT = "verity:select-package";

export type PackageSelection = {
  planId: string;
  packageId: string;
  /** "20,000,000" for the amount field. */
  amount: string;
  message: string;
  whatsappText: string;
};

export function selectPackage(selection: PackageSelection): void {
  window.dispatchEvent(new CustomEvent<PackageSelection>(EVENT, { detail: selection }));
}

/** Calls `cb` each time a package is picked. Returns a cleanup. */
export function onPackageSelected(cb: (selection: PackageSelection) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<PackageSelection>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
