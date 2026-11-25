"use client";

// Cookie banner + GA4 / Meta Pixel (Unit 21 steps 2–3). Renders nothing at all when neither
// NEXT_PUBLIC_GA_ID nor NEXT_PUBLIC_META_PIXEL_ID is set (no cookies → no banner). Otherwise:
// - Google Consent Mode v2 starts "denied"; Accept updates it to "granted".
// - No analytics or ads script loads until the visitor clicks Accept (Decline loads nothing).
// - Taps on any `data-contact` link (WhatsApp / phone / email) are tracked from one listener.
import { GoogleAnalytics } from "@next/third-parties/google";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from "react";
import { analyticsConfig, contactEvent, gtag, track } from "@/lib/analytics";
import { useHydrated } from "@/lib/use-hydrated";
import { readConsent, subscribeConsent, writeConsent, type Consent } from "@/lib/consent";
import styles from "./analytics.module.css";

const CONSENT_KEYS = ["ad_storage", "ad_user_data", "ad_personalization", "analytics_storage"];
const consentState = (value: "granted" | "denied") =>
  Object.fromEntries(CONSENT_KEYS.map((k) => [k, value]));

function useConsent(): Consent | null {
  return useSyncExternalStore(subscribeConsent, readConsent, () => null);
}

export function Analytics() {
  const { gaId, pixelId } = analyticsConfig();
  if (!gaId && !pixelId) return null;
  return <AnalyticsOn gaId={gaId} pixelId={pixelId} />;
}

function AnalyticsOn({ gaId, pixelId }: { gaId: string | null; pixelId: string | null }) {
  const consent = useConsent();
  const hydrated = useHydrated();
  const pathname = usePathname();
  const defaulted = useRef(false);

  // Layout effect: runs before the GA <Script> children inject gtag('config'), so the consent
  // default (and the update) are always first in the dataLayer.
  useLayoutEffect(() => {
    if (!gaId) return;
    if (!defaulted.current) {
      gtag(window as never, "consent", "default", {
        ...consentState("denied"),
        wait_for_update: 500,
      });
      defaulted.current = true;
    }
    if (consent) gtag(window as never, "consent", "update", consentState(consent));
  }, [gaId, consent]);

  // One listener for every WhatsApp / phone / email link on the site.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const link = (e.target as Element | null)?.closest?.("[data-contact]");
      const event = contactEvent(link?.getAttribute("data-contact"));
      if (event) track(event, { page_path: window.location.pathname });
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // Meta Pixel page views on client-side navigation (the snippet sends the first one).
  const pixelPath = useRef<string | null>(null);
  useEffect(() => {
    if (consent !== "granted" || !pixelId) {
      pixelPath.current = null;
      return;
    }
    if (pixelPath.current === null || pixelPath.current === pathname) {
      pixelPath.current = pathname;
      return;
    }
    pixelPath.current = pathname;
    (window as { fbq?: (...a: unknown[]) => void }).fbq?.("track", "PageView");
  }, [pathname, consent, pixelId]);

  const granted = consent === "granted";
  return (
    <>
      {granted && gaId ? <GoogleAnalytics gaId={gaId} /> : null}
      {granted && pixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}
      {/* Shown only after hydration, so a returning visitor never sees it flash. */}
      {hydrated && consent === null ? <CookieBanner /> : null}
    </>
  );
}

function CookieBanner() {
  return (
    <section className={styles.banner} aria-label="Cookie choice" data-testid="cookie-banner">
      <p>
        We use cookies to understand which pages and ads help people find us.{" "}
        <Link href="/privacy#cookies">Privacy policy</Link>
      </p>
      <div className={styles.actions}>
        <button type="button" className="btn btn-gold" onClick={() => writeConsent("granted")}>
          Accept
        </button>
        <button type="button" className="btn btn-outline" onClick={() => writeConsent("denied")}>
          Decline
        </button>
      </div>
    </section>
  );
}

/** Footer / privacy-page button that forgets the choice so the banner shows again. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const { gaId, pixelId } = analyticsConfig();
  if (!hydrated || (!gaId && !pixelId)) return null;
  return (
    <button type="button" className={className} onClick={() => writeConsent(null)}>
      Cookie settings
    </button>
  );
}
