"use client";

import { useEffect } from "react";

const SELECTOR = ".reveal:not(.in), .reveal-img:not(.in)";

/**
 * Adds `.in` to `.reveal` / `.reveal-img` elements as they scroll into view (design's
 * reveal-on-scroll). Also picks up elements added later, e.g. after client navigation.
 */
export function RevealObserver() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveal = (el: Element) => el.classList.add("in");

    if (reduce || !("IntersectionObserver" in window)) {
      const showAll = () => document.querySelectorAll(SELECTOR).forEach(reveal);
      showAll();
      const mo = new MutationObserver(showAll);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            reveal(e.target);
            io.unobserve(e.target);
          }
        }),
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    const watch = () => document.querySelectorAll(SELECTOR).forEach((el) => io.observe(el));
    watch();
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
