export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/&/g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Returns slugify(title), or -2, -3… if `isTaken` says it exists. */
export async function uniqueSlug(
  title: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(title) || "item";
  if (!(await isTaken(base))) return base;
  for (let n = 2; ; n++) {
    const s = `${base}-${n}`;
    if (!(await isTaken(s))) return s;
  }
}
