// Budget ranges for property search, in naira. Shared by the home search bar (Unit 4) and the
// /properties sidebar filters (Unit 5), so both offer the same options.
// PROVISIONAL (Open question 19): the owner still has to confirm these figures.

/** The listing-type URL param (`?type=`) the ranges belong to. */
export type BudgetListingType = "sale" | "rent" | "land";

export type BudgetRange = {
  /** Stable option value, e.g. "50000000-150000000" or "500000000-". */
  id: string;
  label: string;
  /** Naira, inclusive. */
  min: number;
  /** Naira, inclusive. Absent for the open-ended "Above …" range. */
  max?: number;
};

const M = 1_000_000;

function range(label: string, min: number, max?: number): BudgetRange {
  return { id: `${min}-${max ?? ""}`, label, min, ...(max !== undefined ? { max } : {}) };
}

export const BUDGET_RANGES: Record<BudgetListingType, readonly BudgetRange[]> = {
  sale: [
    range("Under ₦50M", 0, 50 * M),
    range("₦50M – ₦150M", 50 * M, 150 * M),
    range("₦150M – ₦300M", 150 * M, 300 * M),
    range("₦300M – ₦500M", 300 * M, 500 * M),
    range("Above ₦500M", 500 * M),
  ],
  // Rent is per year.
  rent: [
    range("Under ₦3M", 0, 3 * M),
    range("₦3M – ₦6M", 3 * M, 6 * M),
    range("₦6M – ₦10M", 6 * M, 10 * M),
    range("₦10M – ₦20M", 10 * M, 20 * M),
    range("Above ₦20M", 20 * M),
  ],
  land: [
    range("Under ₦10M", 0, 10 * M),
    range("₦10M – ₦30M", 10 * M, 30 * M),
    range("₦30M – ₦80M", 30 * M, 80 * M),
    range("Above ₦80M", 80 * M),
  ],
};

/** The range with this option id, if it belongs to that listing type. */
export function findBudgetRange(type: BudgetListingType, id: string): BudgetRange | undefined {
  return BUDGET_RANGES[type].find((r) => r.id === id);
}

/** The range matching URL `min`/`max` exactly (for preselecting a filter), if any. */
export function budgetRangeFor(
  type: BudgetListingType,
  min: number | undefined,
  max: number | undefined,
): BudgetRange | undefined {
  return BUDGET_RANGES[type].find((r) => r.min === min && r.max === max);
}
