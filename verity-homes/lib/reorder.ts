// Shared reorder helper (photos, plans, FAQs). Pure; unit-tested.

/** Moves one item; out-of-range moves return the list unchanged (a new array either way). */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item as T);
  return next;
}
