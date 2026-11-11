"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { TestimonialView } from "@/lib/db/queries/trust";
import { ArrowIcon, StarIcon } from "../icons";
import styles from "./testimonials.module.css";

const GAP = 24;
const AUTOPLAY_MS = 7000;
const perViewFor = (w: number) => (w <= 640 ? 1 : w <= 1020 ? 2 : 3);

/**
 * Sliding row of testimonial cards: 3 / 2 / 1 per view. Prev/next wrap around. Autoplays every
 * 7s, except under reduced motion and while hovered or focused, so it can always be paused.
 */
export function TestimonialCarousel({
  testimonials,
  children,
}: {
  testimonials: TestimonialView[];
  /** Section heading, rendered beside the arrows. */
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(3);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = testimonials.length;
  const max = Math.max(0, count - perView);
  // Clamped at render, so a resize that shows more cards per view never leaves a gap.
  const shown = Math.min(index, max);

  const go = useCallback((i: number) => setIndex(i > max ? 0 : i < 0 ? max : i), [max]);

  // Measure the card width (and cards per view) on mount and on resize.
  useEffect(() => {
    const measure = () => {
      setPerView(perViewFor(window.innerWidth));
      const first = trackRef.current?.firstElementChild;
      setStep(first ? first.getBoundingClientRect().width + GAP : 0);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (paused || max === 0) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setIndex((i) => (i >= max ? 0 : i + 1)), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused, max]);

  return (
    <>
      <div className="sec-head">
        <div>{children}</div>
        {max > 0 ? (
          <div className={`${styles.nav} reveal d2`}>
            <button type="button" aria-label="Previous testimonials" onClick={() => go(shown - 1)}>
              <ArrowIcon className={styles.flip} />
            </button>
            <button type="button" aria-label="Next testimonials" onClick={() => go(shown + 1)}>
              <ArrowIcon />
            </button>
          </div>
        ) : null}
      </div>
      <div
        className={`${styles.wrap} reveal`}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div
          ref={trackRef}
          className={styles.track}
          style={{ transform: `translateX(${-shown * step}px)` }}
        >
          {testimonials.map((t) => (
            <figure key={t.id} className={styles.card}>
              {t.rating ? (
                <div className={styles.stars} role="img" aria-label={`${t.rating} out of 5 stars`}>
                  {Array.from({ length: Math.min(5, Math.max(0, t.rating)) }, (_, i) => (
                    <StarIcon key={i} />
                  ))}
                </div>
              ) : null}
              <blockquote>{t.quote}</blockquote>
              <figcaption>
                <span className={styles.avatar} aria-hidden="true">
                  {t.avatarUrl ? (
                    <Image src={t.avatarUrl} alt="" width={50} height={50} />
                  ) : (
                    (t.name.replace(/^\[SAMPLE\]\s*/, "").trim()[0] ?? "—").toUpperCase()
                  )}
                </span>
                <span>
                  <b>{t.name}</b>
                  <small>{t.serviceUsed}</small>
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </>
  );
}
