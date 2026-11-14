"use client";

// WhatsApp button on the property page that names the chosen plot (Unit 17b). Starts with the
// listing's own message; after "Select" on a plot it switches to that plot's text.
import { useEffect, useState } from "react";
import { onPlotSelected } from "@/lib/plot-select";
import { whatsappLink } from "@/lib/whatsapp";

type Props = {
  number: string | null;
  defaultText: string;
  propertyId: string;
  className?: string;
  children: React.ReactNode;
};

export function PlotAwareWhatsApp({ number, defaultText, propertyId, className, children }: Props) {
  const [text, setText] = useState(defaultText);
  useEffect(
    () => onPlotSelected((sel) => sel.propertyId === propertyId && setText(sel.whatsappText)),
    [propertyId],
  );
  const href = whatsappLink(number, text);
  // No number configured: fall back to the on-page form (as before).
  if (!href)
    return (
      <a className={className} href="#enquire">
        {children}
      </a>
    );
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
