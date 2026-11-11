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

  it("renders the disclaimer in every component that lists plans", () => {
    const planFiles = sourceFiles("components/site").filter((f) =>
      readFileSync(f, "utf8").includes("getPublishedPlans("),
    );
    expect(planFiles.length).toBeGreaterThan(0);
    for (const f of planFiles) expect(readFileSync(f, "utf8")).toContain("INVEST_DISCLAIMER");
  });
});
