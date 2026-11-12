// Invariant 6 (architecture.md): investment copy never says "guaranteed", and the disclaimer
// appears wherever plans appear.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { INVEST_DISCLAIMER, INVEST_LEAD, INVEST_STEPS } from "@/lib/invest";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.(tsx?|mdx?)$/.test(name) ? [p] : [];
  });
}

describe("investment copy", () => {
  it('never uses the word "guaranteed" in shared invest copy', () => {
    const copy = [
      INVEST_DISCLAIMER,
      INVEST_LEAD,
      ...INVEST_STEPS.flatMap((s) => [s.title, s.text]),
    ];
    for (const text of copy) expect(text).not.toMatch(/guarantee/i);
  });

  it('never uses "guarantee…" in public page or component source', () => {
    const files = [
      ...sourceFiles("app/(site)"),
      ...sourceFiles("components/site"),
      "lib/invest.ts",
    ];
    const offenders = files.filter((f) => /guarantee/i.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("renders the disclaimer wherever plans are listed (home section and /invest)", () => {
    const files = [...sourceFiles("app/(site)"), ...sourceFiles("components/site")];
    const listers = files.filter((f) =>
      /getPublishedPlans\(|<PlanGrid|<PlanCard/.test(readFileSync(f, "utf8")),
    );
    expect(listers.length).toBeGreaterThanOrEqual(3); // home invest section, /invest page, its plans section
    for (const f of listers) {
      const src = readFileSync(f, "utf8");
      // Either the file shows the disclaimer itself, or it delegates to the section that does.
      expect(src, f).toMatch(/INVEST_DISCLAIMER|<InvestDisclaimer|<PlansSection/);
    }
    expect(readFileSync("components/site/invest/plans-section.tsx", "utf8")).toContain(
      "<InvestDisclaimer",
    );
    expect(readFileSync("components/site/invest/plans.tsx", "utf8")).toContain("INVEST_DISCLAIMER");
  });
});
