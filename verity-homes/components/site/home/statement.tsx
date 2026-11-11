"use client";

import { useEffect, useRef, useState } from "react";
import { fillProgress, filledWords } from "@/lib/scroll-fill";
import styles from "./statement.module.css";

const TEXT =
  "Every home we list, every plan we offer and every promise we make is held to one standard:";
const GOLD = "the truth.";
const WORDS = [
  ...TEXT.split(" ").map((w) => ({ w, gold: false })),
  ...GOLD.split(" ").map((w) => ({ w, gold: true })),
];

/**
 * "Our promise": a large sentence whose words darken one by one as it scrolls up the viewport,
 * all filled by the time its centre is mid-screen (lib/scroll-fill.ts). Progress is computed at most once per animation frame. Under reduced motion every
 * word is shown filled. Screen readers get the sentence once; the animated words are hidden.
 */
export function Statement() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      if (reduce) return setFilled(WORDS.length);
      const r = el.getBoundingClientRect();
      setFilled(filledWords(fillProgress(r.top, r.height, window.innerHeight), WORDS.length));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    if (reduce) return;
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section className={styles.statement} aria-label="Our promise">
      <div className="container">
        <p ref={ref}>
          <span className="sr-only">
            {TEXT} {GOLD}
          </span>
          <span aria-hidden="true">
            {WORDS.map(({ w, gold }, i) => (
              <span key={i}>
                <span
                  className={[styles.wd, gold ? styles.gold : "", i < filled ? styles.on : ""].join(
                    " ",
                  )}
                >
                  {w}
                </span>{" "}
              </span>
            ))}
          </span>
        </p>
        <div className={styles.sig}>
          <i aria-hidden="true" />
          <span>
            <b>Esther Ezenagu</b> · Founder &amp; CEO
          </span>
          <i aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
