"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import { prefetchFor } from "@/lib/nav";
import { NavLinkList, NavLinks } from "./nav-links";
import styles from "./header.module.css";

type HeaderProps = {
  /** wa.me link when a WhatsApp number is set, otherwise the contact page. */
  whatsappHref: string;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Fixed header: transparent over the hero, navy + blur after 40px. Owns the mobile drawer. */
export function Header({ whatsappHref }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  // Drawer open: lock body scroll, move focus in, trap Tab, close on Esc.
  // Drawer closed again: give focus back to the menu button.
  useEffect(() => {
    if (!open) {
      if (wasOpen.current) menuBtnRef.current?.focus();
      wasOpen.current = false;
      return;
    }
    wasOpen.current = true;
    const drawer = drawerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus can only land once the drawer is visible. Under reduced motion the global
    // `transition-duration: .01ms` rule briefly animates visibility, so retry for a few frames.
    let raf = 0;
    let tries = 0;
    const focusIn = () => {
      const target = closeBtnRef.current;
      target?.focus();
      if (target && document.activeElement !== target && ++tries < 10)
        raf = window.requestAnimationFrame(focusIn);
    };
    raf = window.requestAnimationFrame(focusIn);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !drawer) return;
      const items = Array.from(drawer.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = items[0];
      const last = items[items.length - 1];
      if (!first || !last) return;
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !drawer.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !drawer.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <header className={`${styles.header} ${scrolled ? styles.scrolled : ""}`}>
        <div className={`container ${styles.inner}`}>
          <Brand />
          <nav className={styles.nav} aria-label="Main">
            <Suspense fallback={<NavLinkList />}>
              <NavLinks />
            </Suspense>
          </nav>
          <div className={styles.cta}>
            <a className={`btn btn-outline ${styles.waBtn}`} href={whatsappHref}>
              <WhatsAppIcon />
              WhatsApp us
            </a>
            <Link
              className={`btn btn-gold ${styles.investBtn}`}
              href="/invest"
              prefetch={prefetchFor("/invest")}
            >
              Start investing
            </Link>
            <button
              ref={menuBtnRef}
              type="button"
              className={styles.menuBtn}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="drawer"
              onClick={() => setOpen(true)}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M4 7h16M4 12h16M10 17h10" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div
        ref={drawerRef}
        id="drawer"
        className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.drawerTop}>
          <Brand onClick={close} />
          <button
            ref={closeBtnRef}
            type="button"
            className={styles.menuBtn}
            aria-label="Close menu"
            onClick={close}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
        <nav className={styles.drawerNav} aria-label="Mobile">
          <Suspense fallback={<NavLinkList onNavigate={close} />}>
            <NavLinks onNavigate={close} />
          </Suspense>
        </nav>
        <Link
          className="btn btn-gold"
          href="/invest"
          prefetch={prefetchFor("/invest")}
          onClick={close}
        >
          Start investing
        </Link>
      </div>
    </>
  );
}

/** Outline WhatsApp glyph (#i-wa in design/index.html). */
function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
        <path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" />
        <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.3-1.3-2-1-1 .8a4 4 0 0 1-2.3-2.3l.8-1-1-2z" />
      </g>
    </svg>
  );
}
