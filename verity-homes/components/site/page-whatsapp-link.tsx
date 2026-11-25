"use client";

// Site-wide WhatsApp button (header, floating button, contact blocks): the pre-filled message
// names the page the visitor is on (lib/whatsapp.ts pageWhatsappMessage). The server renders a
// plain enquiry; after hydration and again at the moment of the tap, the text is rebuilt from
// document.title and the current URL, so it is right after client-side navigation too.
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { pageWhatsappMessage, whatsappLink } from "@/lib/whatsapp";

type Props = {
  /** Digits from site settings; null → `fallbackHref` (the contact form). */
  number: string | null;
  className?: string;
  children: React.ReactNode;
  fallbackHref?: string;
  /** Open in a new tab (the header button historically opens in the same tab). */
  newTab?: boolean;
  "aria-label"?: string;
};

const current = (number: string | null) =>
  whatsappLink(number, pageWhatsappMessage(document.title, window.location.href));

export function PageWhatsAppLink({
  number,
  className,
  children,
  fallbackHref = "/contact#message",
  newTab = true,
  "aria-label": ariaLabel,
}: Props) {
  const pathname = usePathname();
  const ref = useRef<HTMLAnchorElement>(null);
  // Server render: a plain enquiry. React never changes this prop afterwards, so the effect can
  // rewrite the DOM href to name the page without a re-render.
  const href = whatsappLink(number, "Hello Verity, I'd like to make an enquiry");
  useEffect(() => {
    const fresh = current(number);
    if (fresh && ref.current) ref.current.href = fresh;
  }, [number, pathname]);

  if (!href) {
    return (
      <a className={className} href={fallbackHref} aria-label={ariaLabel}>
        {children}
      </a>
    );
  }
  return (
    <a
      className={className}
      ref={ref}
      href={href}
      data-contact="whatsapp"
      aria-label={ariaLabel}
      {...(newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      // The title can change after the effect ran (metadata streams in): rebuild on tap.
      onClick={(e) => {
        const fresh = current(number);
        if (fresh) e.currentTarget.href = fresh;
      }}
    >
      {children}
    </a>
  );
}
