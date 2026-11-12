"use client";

import { useEffect } from "react";

const TEXT = ".reveal:not(.in)";
const IMAGES = ".reveal-img:not(.in)";

/**
 * Reveal-on-scroll (design/index.html): adds `.in` to `.reveal` and `.reveal-img` elements as
 * they scroll into view, including ones added later (client navigation).
 *
 * It also adds the `js` class to <html>, which is what lets CSS hide reveal content in the
 * first place. So content is only ever hidden once this observer is running: if JavaScript
 * fails to load, everything stays visible. (On a full load the preloader covers the page
 * while this switches on, so there is no flash.)
 *
 * `.reveal-img` starts fully clipped (`clip-path: inset(0 0 100% 0)`). Chrome measures an
 * IntersectionObserver target after its own clip-path, which leaves a zero-height line at the
 * element's top edge: the ratio is always 0, and `isIntersecting` only holds while that edge
 * is on screen, so a scroll jump past it (reload mid-page, fast fling) would leave the photo
 * clipped for good. So the clipped element is never observed: its parent (unclipped) is, and
 * when the parent enters view every `.reveal-img` inside it is revealed.
 */
export function RevealObserver() {
  useEffect(() => {
    const root = document.documentElement;
    const reveal = (el: Element) => el.classList.add("in");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce || !("IntersectionObserver" in window)) {
      // No animation: show everything at once (CSS also shows it under reduced motion).
      const showAll = () => document.querySelectorAll(`${TEXT}, ${IMAGES}`).forEach(reveal);
      showAll();
      root.classList.add("js");
      const mo = new MutationObserver(showAll);
      mo.observe(document.body, { childList: true, subtree: true });
      return () => mo.disconnect();
    }

    const onEnter: IntersectionObserverCallback = (entries, observer) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        reveal(e.target);
        observer.unobserve(e.target);
      });
    // Text: fades in once 15% of it is visible.
    const textIO = new IntersectionObserver(onEnter, {
      threshold: 0.15,
      rootMargin: "0px 0px -40px 0px",
    });
    // Images: wipe in once their (unclipped) parent is on screen, above the bottom 15%.
    const imagesByParent = new Map<Element, Set<Element>>();
    const imageIO = new IntersectionObserver(
      (entries, observer) =>
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          imagesByParent.get(e.target)?.forEach(reveal);
          imagesByParent.delete(e.target);
          observer.unobserve(e.target);
        }),
      { threshold: 0, rootMargin: "0px 0px -15% 0px" },
    );

    const watch = () => {
      document.querySelectorAll(TEXT).forEach((el) => textIO.observe(el));
      document.querySelectorAll(IMAGES).forEach((el) => {
        const parent = el.parentElement;
        if (!parent) return reveal(el);
        const group = imagesByParent.get(parent);
        if (group) group.add(el);
        else {
          imagesByParent.set(parent, new Set([el]));
          imageIO.observe(parent);
        }
      });
    };
    watch();
    root.classList.add("js");
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      textIO.disconnect();
      imageIO.disconnect();
    };
  }, []);
  return null;
}
