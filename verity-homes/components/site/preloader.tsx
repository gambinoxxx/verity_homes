"use client";

import { useEffect, useState } from "react";
import { PRELOADER_ID, PRELOADER_SEEN_KEY } from "@/lib/preloader";
import { markSiteLoaded } from "@/lib/site-loaded";
import styles from "./preloader.module.css";

type Phase = "show" | "leaving" | "done" | "gone";

// Unit 21 step 8 (owner decision, option A): the design's 2.4s intro is shortened to ~1s and
// plays only on the first page of a visit (PRELOADER_SEEN_KEY in sessionStorage). The
// animation keyframes in preloader.module.css are compressed to match.
const MIN_SHOW_MS = 1000;
const LEAVE_MS = 550; // logo fades up, gold line sweeps
const CURTAIN_MS = 1100; // curtain slides up (1s transition) before removal
const MAX_TOTAL_MS = 3500;
const MAX_WAIT_MS = MAX_TOTAL_MS - LEAVE_MS - CURTAIN_MS;

function seenThisVisit(): boolean {
  try {
    return window.sessionStorage.getItem(PRELOADER_SEEN_KEY) !== null;
  } catch {
    return false;
  }
}

function rememberSeen(): void {
  try {
    window.sessionStorage.setItem(PRELOADER_SEEN_KEY, "1");
  } catch {
    // Private mode / storage blocked: the intro simply plays again next full load.
  }
}

// Module state survives client-side navigation, so the preloader only plays on a full load.
let hasPlayed = false;

/** Branded preloader: plays on the first page of a visit only, skipped for reduced motion. */
export function Preloader() {
  const [phase, setPhase] = useState<Phase>(() => (hasPlayed ? "gone" : "show"));

  useEffect(() => {
    if (hasPlayed && phase === "gone") {
      markSiteLoaded(); // client-side navigation: already loaded, keep it that way
      return;
    }
    hasPlayed = true;
    if (seenThisVisit()) {
      // Already hidden before paint by PRELOADER_SKIP_SCRIPT; unmount on the next tick.
      markSiteLoaded();
      const t = window.setTimeout(() => setPhase("gone"), 0);
      return () => window.clearTimeout(t);
    }
    rememberSeen();
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
    <div id={PRELOADER_ID} className={cls} role="status" aria-label="Loading Verity Homes and Properties">
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
