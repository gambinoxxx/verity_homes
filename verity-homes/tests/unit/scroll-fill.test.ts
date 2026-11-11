import { describe, expect, it } from "vitest";
import { fillProgress, filledWords } from "@/lib/scroll-fill";

const WORDS = 20;

describe("statement fill progress", () => {
  // Paragraph heights seen in the build: ~220px at 1440×900, ~330px at 390×844.
  for (const [vh, h] of [
    [900, 220],
    [844, 330],
    [700, 500],
  ] as const) {
    it(`is complete when the paragraph centre reaches mid-viewport (vh ${vh}, h ${h})`, () => {
      const centredTop = vh / 2 - h / 2;
      expect(fillProgress(centredTop, h, vh)).toBe(1);
      expect(filledWords(fillProgress(centredTop, h, vh), WORDS)).toBe(WORDS);
      // …and stays complete as it keeps scrolling up.
      expect(fillProgress(centredTop - 200, h, vh)).toBe(1);
    });

    it(`is empty until the top reaches 85% of the viewport (vh ${vh}, h ${h})`, () => {
      expect(fillProgress(vh * 0.85, h, vh)).toBe(0);
      expect(fillProgress(vh, h, vh)).toBe(0);
    });

    it(`fills part-way in between (vh ${vh}, h ${h})`, () => {
      const p = fillProgress(vh * 0.85 - 50, h, vh);
      expect(p).toBeGreaterThan(0);
      expect(p).toBeLessThan(1);
    });
  }
});
