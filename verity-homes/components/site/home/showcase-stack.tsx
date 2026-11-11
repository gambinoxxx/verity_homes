"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PropertyImageView } from "@/lib/db/queries/properties";
import { prefetchFor } from "@/lib/nav";
import { ArrowIcon, PinIcon } from "../icons";
import styles from "./showcase.module.css";

export type ShowcaseItem = {
  id: string;
  slug: string;
  title: string;
  location: string;
  status: string | null;
  facts: string;
  cover: PropertyImageView | null;
};

// Sticky offsets: each card sticks a little lower than the one before (design: 110px + 22px·i).
const CARD_TOP = 110;
const CARD_STEP = 22;
const pad = (n: number) => String(n + 1).padStart(2, "0");

/**
 * Left: sticky panel showing the active project. Right: cards that stick and stack; the one
 * underneath scales to 0.94 and darkens as the next covers it. Scroll work is batched into one
 * requestAnimationFrame per frame. Under reduced motion the cards don't scale or darken (the
 * panel still follows the active card). On mobile the panel is hidden and captions sit in the
 * cards.
 */
export function ShowcaseStack({ items }: { items: ShowcaseItem[] }) {
  const [active, setActive] = useState(0);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    const update = () => {
      frame = 0;
      const cards = cardsRef.current;
      const vh = window.innerHeight;
      let a = 0;
      cards.forEach((card, i) => {
        if (!card) return;
        if (card.getBoundingClientRect().top < vh * 0.55) a = i;
        const next = cards[i + 1];
        if (!next || reduce) return;
        const covered = next.getBoundingClientRect().top - (CARD_TOP + CARD_STEP * (i + 1));
        const t = Math.min(1, Math.max(0, 1 - covered / (vh * 0.7)));
        card.style.transform = `scale(${1 - t * 0.06})`;
        card.style.filter = `brightness(${1 - t * 0.45})`;
      });
      setActive(a);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className={styles.grid}>
      <div className={styles.panel}>
        <div className={styles.items}>
          {items.map((p, i) => (
            // Hidden items are inert so their links can't be focused while invisible.
            <div
              key={p.id}
              className={`${styles.item} ${i === active ? styles.on : ""}`}
              inert={i !== active}
            >
              <span className={styles.num} aria-hidden="true">
                {pad(i)}
              </span>
              <div>
                <div className={styles.loc}>
                  <PinIcon />
                  {p.location}
                </div>
                <h3>{p.title}</h3>
                {p.facts ? <p>{p.facts}</p> : null}
                {p.status ? <span className={styles.status}>{p.status}</span> : null}
                <br />
                <Link
                  className="btn btn-gold"
                  href={`/properties/${p.slug}#enquire`}
                  prefetch={prefetchFor(`/properties/${p.slug}`)}
                >
                  Enquire about this
                  <ArrowIcon />
                </Link>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.dots} aria-hidden="true">
          {items.map((p, i) => (
            <span key={p.id} className={styles.dotGroup}>
              {i > 0 ? <i /> : null}
              <span className={i === active ? styles.on : ""}>{pad(i)}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={styles.cards}>
        {items.map((p, i) => (
          <div
            key={p.id}
            ref={(el) => {
              cardsRef.current[i] = el;
            }}
            className={`${styles.card} media`}
            style={{ top: `${CARD_TOP + CARD_STEP * i}px` }}
          >
            {p.cover ? (
              <Image
                src={p.cover.url}
                alt={p.cover.alt}
                fill
                sizes="(max-width: 960px) 100vw, 660px"
              />
            ) : null}
            <div className={styles.cap}>
              <small>
                <PinIcon />
                {p.location}
              </small>
              <b>{p.title}</b>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
