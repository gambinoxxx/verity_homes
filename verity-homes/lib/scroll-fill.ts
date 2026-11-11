// Statement scroll-fill maths (components/site/home/statement.tsx).
// Filling starts when the paragraph's top reaches 85% of the viewport height and is complete
// (every word filled) when the paragraph's vertical centre reaches the middle of the viewport.
// Owner condition (Open question 21): fully filled by the time it is mid-screen.

const START = 0.85; // paragraph top at 85% of the viewport height
const END = 0.5; // paragraph centre at 50% of the viewport height

/** 0 → 1 fill progress for a paragraph whose top is `top` px from the viewport top. */
export function fillProgress(top: number, height: number, viewportHeight: number): number {
  const startTop = START * viewportHeight;
  const endTop = END * viewportHeight - height / 2;
  const span = startTop - endTop; // = 0.35·vh + height/2, always > 0
  return Math.min(1, Math.max(0, (startTop - top) / span));
}

/** How many of `total` words are filled at this progress. */
export function filledWords(progress: number, total: number): number {
  return Math.round(progress * total);
}
