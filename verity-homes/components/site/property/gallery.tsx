"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PropertyImageView } from "@/lib/db/queries/properties";
import { ArrowIcon, CloseIcon, PhotosIcon } from "../icons";
import styles from "./gallery.module.css";

type GalleryProps = { images: PropertyImageView[]; title: string };

const TILES = 5; // design: one big photo + four small
const SWIPE_PX = 40;

/**
 * Property gallery (design `.gallery`) and lightbox (design `.lightbox`).
 * 0 photos → navy panel with the house icon; 1 photo → one wide tile; otherwise 1 big + up to 4.
 * Lightbox: role="dialog", arrows, ←/→, Esc, swipe, "1 / N", focus trapped and returned to the
 * tile that opened it.
 */
export function Gallery({ images, title }: GalleryProps) {
  const [open, setOpen] = useState<number | null>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const n = images.length;

  // The tile that opened the lightbox; focus returns there on close (arrows don't change it).
  const opener = useRef(0);
  const show = (i: number) => {
    opener.current = i;
    setOpen(i);
  };
  const close = useCallback(() => {
    setOpen(null);
    requestAnimationFrame(() => tileRefs.current[opener.current]?.focus());
  }, []);

  if (n === 0) {
    return (
      <div className={`${styles.gallery} ${styles.single} ${styles.empty}`}>
        <div className="media" role="img" aria-label={`No photos of ${title} yet`} />
      </div>
    );
  }

  const tiles = images.slice(0, TILES);
  return (
    <>
      <div className={`${styles.gallery} ${n === 1 ? styles.single : ""}`}>
        {tiles.map((img, i) => {
          const last = i === tiles.length - 1;
          return (
            <button
              key={img.url + i}
              ref={(el) => {
                tileRefs.current[i] = el;
              }}
              type="button"
              className={`media ${styles.tile}`}
              aria-label={
                // The tile with the "View all" chip includes its text in its name (WCAG 2.5.3).
                n > 1 && last
                  ? `Open photo ${i + 1} of ${n}, view all ${n} photos`
                  : `Open photo ${i + 1} of ${n}`
              }
              onClick={() => show(i)}
            >
              <Image
                src={img.url}
                alt={img.alt}
                fill
                priority={i === 0}
                sizes={
                  i === 0 ? "(max-width: 760px) 100vw, 640px" : "(max-width: 760px) 50vw, 310px"
                }
              />
              {n > 1 && last ? (
                <span className={styles.more} aria-hidden="true">
                  <PhotosIcon />
                  View all {n} photos
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {open != null ? (
        <Lightbox images={images} index={open} onIndex={setOpen} onClose={close} />
      ) : null}
    </>
  );
}

type LightboxProps = {
  images: PropertyImageView[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
};

function Lightbox({ images, index, onIndex, onClose }: LightboxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const n = images.length;
  const img = images[index];
  const go = useCallback((d: number) => onIndex((index + d + n) % n), [index, n, onIndex]);

  // Focus in, lock page scroll, restore on close.
  useEffect(() => {
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowRight" && n > 1) {
      go(1);
    } else if (e.key === "ArrowLeft" && n > 1) {
      go(-1);
    } else if (e.key === "Tab") {
      // Keep focus inside the dialog.
      const items = ref.current?.querySelectorAll<HTMLElement>("button");
      if (!items || items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  if (!img) return null;
  return (
    <div
      ref={ref}
      className={styles.lightbox}
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
      onKeyDown={onKeyDown}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null || n < 2) return;
        if (end - start > SWIPE_PX) go(-1);
        else if (start - end > SWIPE_PX) go(1);
      }}
    >
      <div className={styles.frame}>
        <Image
          key={img.url}
          src={img.url}
          alt={img.alt}
          fill
          sizes="(max-width: 1240px) 100vw, 1200px"
        />
      </div>
      <button
        ref={closeRef}
        type="button"
        className={styles.close}
        aria-label="Close gallery"
        onClick={onClose}
      >
        <CloseIcon />
      </button>
      {n > 1 ? (
        <>
          <button
            type="button"
            className={styles.prev}
            aria-label="Previous photo"
            onClick={() => go(-1)}
          >
            <ArrowIcon />
          </button>
          <button
            type="button"
            className={styles.next}
            aria-label="Next photo"
            onClick={() => go(1)}
          >
            <ArrowIcon />
          </button>
        </>
      ) : null}
      <span className={styles.count} aria-live="polite">
        {index + 1} / {n}
      </span>
    </div>
  );
}
