"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { prefetchFor } from "@/lib/nav";
import { onSiteLoaded } from "@/lib/site-loaded";
import { ArrowIcon, PinIcon, ShieldIcon } from "../icons";
import styles from "./hero.module.css";

const SLIDES = [
  {
    src: "/samples/villa.jpg",
    caption: "Homes you'll be proud to own — chosen with care, presented with honesty.",
  },
  {
    src: "/samples/aerial.jpg",
    caption: "Land and estates with documents reviewed before you commit.",
  },
  {
    src: "/samples/building.jpg",
    caption: "Investment plans that let your money work in real estate.",
  },
] as const;

const INTERVAL_MS = 6000;
const CAPTION_SWAP_MS = 350;
const pad = (n: number) => String(n).padStart(2, "0");

type HeroProps = { rcNumber: string };

/** Home hero: 3-slide slideshow with captions, counter and progress dots (design/index.html). */
export function Hero({ rcNumber }: HeroProps) {
  const [current, setCurrent] = useState(0);
  const [caption, setCaption] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const [playing, setPlaying] = useState(false);
  // Bumped on every manual pick so the autoplay timer restarts from zero.
  const [cycle, setCycle] = useState(0);
  const swapTimer = useRef<number | undefined>(undefined);
  const currentRef = useRef(0);

  const go = useCallback((i: number) => {
    const next = (i + SLIDES.length) % SLIDES.length;
    currentRef.current = next;
    setCurrent(next);
    setSwapping(true);
    window.clearTimeout(swapTimer.current);
    swapTimer.current = window.setTimeout(() => {
      setCaption(next);
      setSwapping(false);
    }, CAPTION_SWAP_MS);
  }, []);

  // Autoplay starts once the preloader has lifted; never under reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    return onSiteLoaded(() => setPlaying(true));
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => go(currentRef.current + 1), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [playing, cycle, go]);

  useEffect(() => () => window.clearTimeout(swapTimer.current), []);

  return (
    <section className={styles.hero} aria-label="Welcome">
      <div className={styles.slides} aria-hidden="true">
        {SLIDES.map((s, i) => (
          <div
            key={s.src}
            className={`${styles.slide} media ${i === current ? styles.active : ""}`}
          >
            <Image src={s.src} alt="" fill priority={i === 0} sizes="100vw" />
          </div>
        ))}
      </div>

      <div className={styles.body}>
        <div className="container">
          <div className={styles.copy}>
            <span className={styles.tag}>
              <i />
              Homes · Land · Investment plans
            </span>
            <h1 className={styles.title}>
              <span className={styles.w}>
                <span>Invest.</span>
              </span>{" "}
              <span className={styles.w}>
                <span>Own.</span>
              </span>{" "}
              <span className={styles.w}>
                <span>Live.</span>
              </span>
            </h1>
            <div className={styles.caption}>
              <p className={swapping ? styles.swap : undefined}>{SLIDES[caption]?.caption}</p>
            </div>
            <div className={styles.actions}>
              <Link
                className="btn btn-white"
                href="/properties"
                prefetch={prefetchFor("/properties")}
              >
                View properties
                <ArrowIcon />
              </Link>
              <Link className="btn btn-gold" href="/invest" prefetch={prefetchFor("/invest")}>
                Start investing
              </Link>
            </div>
            <div className={styles.meta}>
              <span>
                <ShieldIcon />
                CAC registered — RC {rcNumber}
              </span>
              <span>
                <PinIcon />
                Lagos, Nigeria
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.count}>
          <b>{pad(current + 1)}</b> / {pad(SLIDES.length)}
        </div>
        <div className={styles.dots}>
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
              className={
                i === current ? `${styles.current} ${playing ? styles.playing : ""}` : undefined
              }
              onClick={() => {
                go(i);
                setCycle((c) => c + 1);
              }}
            >
              {/* Re-keyed per slide change so the progress animation restarts. */}
              <i key={i === current ? `${current}-${cycle}` : "idle"} />
            </button>
          ))}
        </div>
      </div>
      <a href="#search" className={styles.cue}>
        <i />
        Scroll
      </a>
    </section>
  );
}
