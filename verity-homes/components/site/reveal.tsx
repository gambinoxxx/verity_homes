"use client";

import Link from "next/link";
import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { useHydrated } from "@/lib/use-hydrated";

type RevealTag = "div" | "span" | "p" | "h2" | "li" | "blockquote" | "article" | "form" | "details";

type RevealProps = HTMLAttributes<HTMLElement> &
  RevealOptions & {
    as?: RevealTag;
    children?: ReactNode;
  };

type RevealOptions = {
  /** "fade": rise and fade in (`.reveal`). "image": wipe down (`.reveal-img`). */
  variant?: "fade" | "image";
  /** Stagger: 0.1s × delay (`.d1`–`.d3`). */
  delay?: 0 | 1 | 2 | 3;
};

/**
 * Reveal-on-scroll state for one element (design/index.html `.reveal` / `.reveal-img`).
 * Returns a ref and the className to render. The revealed state is React state, so a
 * re-render (e.g. an accordion item turning active) can never drop it, and no class is ever
 * written onto the DOM by hand. Nothing is hidden in the server HTML or before hydration, so
 * if the app's JavaScript fails everything stays visible.
 */
export function useReveal<T extends HTMLElement>(
  className: string | undefined,
  { variant = "fade", delay = 0 }: RevealOptions = {},
) {
  const ref = useRef<T>(null);
  const hydrated = useHydrated();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    return watchReveal(el, variant, () => setShown(true));
  }, [variant, shown]);

  const cls = [
    className,
    hydrated ? (variant === "image" ? "reveal-img" : "reveal") : "",
    hydrated && delay ? `d${delay}` : "",
    shown ? "in" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return { ref, className: cls || undefined };
}

/** An element that reveals on scroll. `as` picks the tag (default div). */
export function Reveal({ as = "div", variant, delay, className, children, ...rest }: RevealProps) {
  const reveal = useReveal<HTMLElement>(className, { variant, delay });
  return createElement(as, { ...rest, ...reveal }, children);
}

/** A Next.js <Link> that reveals on scroll (for cards that are links themselves). */
export function RevealLink({
  variant,
  delay,
  className,
  ...rest
}: ComponentProps<typeof Link> & RevealOptions) {
  const reveal = useReveal<HTMLAnchorElement>(className, { variant, delay });
  return <Link {...rest} {...reveal} />;
}

// ---- one shared IntersectionObserver per kind, for every <Reveal> on the page ----

type Callback = () => void;
let textIO: IntersectionObserver | null = null;
let imageIO: IntersectionObserver | null = null;
const textCallbacks = new Map<Element, Callback>();
const imageCallbacks = new Map<Element, Set<Callback>>();

function getTextIO() {
  return (textIO ??= new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        textCallbacks.get(e.target)?.();
        textCallbacks.delete(e.target);
        textIO?.unobserve(e.target);
      }),
    // Fades in once 15% of it is visible, a little above the bottom edge.
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
  ));
}

function getImageIO() {
  return (imageIO ??= new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        imageCallbacks.get(e.target)?.forEach((cb) => cb());
        imageCallbacks.delete(e.target);
        imageIO?.unobserve(e.target);
      }),
    { threshold: 0, rootMargin: "0px 0px -15% 0px" },
  ));
}

/**
 * Calls `onShow` once `el` scrolls into view. Returns a cleanup.
 *
 * Images are clipped (`clip-path: inset(0 0 100% 0)`) until revealed, and Chrome measures an
 * observed element after its own clip-path: the ratio stays 0 and `isIntersecting` only holds
 * while the clipped top edge is on screen, so a scroll jump could skip it. So an image is
 * revealed when its unclipped parent enters view instead.
 */
function watchReveal(el: HTMLElement, variant: "fade" | "image", onShow: Callback): () => void {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    // No animation (CSS shows it under reduced motion anyway): mark it shown right away.
    let cancelled = false;
    queueMicrotask(() => !cancelled && onShow());
    return () => {
      cancelled = true;
    };
  }

  if (variant === "image") {
    const target = el.parentElement ?? el;
    const set = imageCallbacks.get(target) ?? new Set<Callback>();
    const first = set.size === 0;
    set.add(onShow);
    imageCallbacks.set(target, set);
    if (first) getImageIO().observe(target);
    return () => {
      const current = imageCallbacks.get(target);
      if (!current) return;
      current.delete(onShow);
      if (current.size === 0) {
        imageCallbacks.delete(target);
        imageIO?.unobserve(target);
      }
    };
  }

  textCallbacks.set(el, onShow);
  getTextIO().observe(el);
  return () => {
    textCallbacks.delete(el);
    textIO?.unobserve(el);
  };
}
