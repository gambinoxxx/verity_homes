// Admin editors after a successful save (Unit 20b, open question 57). The editor is NOT remounted
// (no updatedAt/status in its React key): an edit made right after saving — common on a slow
// phone — would land on the outgoing instance and be lost. Instead the form is reset in place to
// the values the server saved (so server-made ids, e.g. new plots or packages, and cleared
// photo removals are picked up), and anything the admin changed while the save was in flight is
// put back on top and stays "unsaved".

/** What an update action returns so the editor can reset in place. */
export type SavedEditor<V> = { values: V; updatedAt: string };

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Top-level fields whose current value differs from what was sent with the save. */
export function changedSince<V extends Record<string, unknown>>(
  submitted: V,
  current: V,
): (keyof V & string)[] {
  return Object.keys(current).filter((k) => !same(current[k], submitted[k]));
}

/**
 * The newer of two `updatedAt` ISO strings (the save result vs the page's props after a
 * refresh, e.g. after Publish/Unpublish). ISO-8601 UTC strings sort as text.
 */
export function latestVersion(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

type ResettableForm<V> = {
  getValues: () => V;
  reset: (values: V) => void;
  setValue: (name: never, value: never, opts: { shouldDirty: boolean }) => void;
};

/** Reset the form to the saved values, keeping edits made while the save was in flight. */
export function resetToSaved<V extends Record<string, unknown>>(
  form: ResettableForm<V>,
  submitted: V,
  saved: V,
): void {
  const current = form.getValues();
  const inFlight = changedSince(submitted, current);
  form.reset(saved);
  for (const k of inFlight) form.setValue(k as never, current[k] as never, { shouldDirty: true });
}
