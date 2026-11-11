"use client";

import { useEffect, useState } from "react";
import { markSiteLoaded } from "@/lib/site-loaded";
import styles from "./preloader.module.css";

type Phase = "show" | "leaving" | "done" | "gone";

// Timings from design/index.html. The curtain must be fully up within MAX_TOTAL_MS.
const MIN_SHOW_MS = 2400;
const LEAVE_MS = 550; // logo fades up, gold line sweeps
const CURTAIN_MS = 1100; // curtain slides up (1s transition) before removal
const MAX_TOTAL_MS = 5000;
const MAX_WAIT_MS = MAX_TOTAL_MS - LEAVE_MS - CURTAIN_MS;

// Module state survives client-side navigation, so the preloader only plays on a full load.
let hasPlayed = false;

/** Branded preloader: plays once per full page load, skipped for reduced motion. */
export function Preloader() {
  const [phase, setPhase] = useState<Phase>(() => (hasPlayed ? "gone" : "show"));

  useEffect(() => {
    if (hasPlayed && phase === "gone") {
      markSiteLoaded(); // client-side navigation: already loaded, keep it that way
      return;
    }
    hasPlayed = true;
    const html = document.documentElement;
    const markLoaded = markSiteLoaded;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // CSS already hides it under reduced motion; unmount on the next tick.
      markLoaded();
      const t = window.setTimeout(() => setPhase("gone"), 0);
      return () => window.clearTimeout(t);
    }

    const prevOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const timers: number[] = [];
    let cancelled = false;

    const minTime = new Promise<void>((r) => timers.push(window.setTimeout(r, MIN_SHOW_MS)));
    const loaded = new Promise<void>((r) => {
      if (document.readyState === "complete") r();
      else window.addEventListener("load", () => r(), { once: true });
    });
    const cap = new Promise<void>((r) => timers.push(window.setTimeout(r, MAX_WAIT_MS)));

    void Promise.race([Promise.all([minTime, loaded]), cap]).then(() => {
      if (cancelled) return;
      setPhase("leaving");
      timers.push(
        window.setTimeout(() => {
          setPhase("done");
          html.style.overflow = prevOverflow;
          markLoaded();
          timers.push(window.setTimeout(() => setPhase("gone"), CURTAIN_MS));
        }, LEAVE_MS),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
      html.style.overflow = prevOverflow;
    };
    // Runs once on mount; phase is only read for the already-played check.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "gone") return null;

  const cls = [
    styles.preloader,
    phase === "leaving" || phase === "done" ? styles.leaving : "",
    phase === "done" ? styles.done : "",
  ].join(" ");

  return (
    <div className={cls} role="status" aria-label="Loading Verity Homes and Properties">
      <svg width="96" height="96" viewBox="0 0 48 48" aria-hidden="true">
        <path className={styles.roof} d="M8 18 L24 6 L40 18" />
        <path className={styles.v} d="M11 18 L24 42 L37 18" />
        <path className={styles.innerV} d="M19 18 L24 27 L29 18" />
      </svg>
      <div className={styles.word} aria-hidden="true">
        <b>VERITY</b>
        <span>Homes &amp; Properties</span>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <i />
      </div>
    </div>
  );
}
