"use client";

// WhatsApp button that names what the visitor picked: a plot on a property page (Unit 17b) or a
// package on a plan page (Unit 17c). Starts with the page's own message; after "Select" it
// switches to that choice's text.
import { useEffect, useState } from "react";
import { onPackageSelected } from "@/lib/package-select";
import { onPlotSelected } from "@/lib/plot-select";
import { whatsappLink } from "@/lib/whatsapp";

type Props = {
  number: string | null;
  defaultText: string;
  /** The property (plots) or plan (packages) this button belongs to. */
  ownerId: string;
  className?: string;
  children: React.ReactNode;
};

export function PlotAwareWhatsApp({ number, defaultText, ownerId, className, children }: Props) {
  const [text, setText] = useState(defaultText);
  useEffect(() => {
    const offPlot = onPlotSelected(
      (sel) => sel.propertyId === ownerId && setText(sel.whatsappText),
    );
    const offPackage = onPackageSelected(
      (sel) => sel.planId === ownerId && setText(sel.whatsappText),
    );
    return () => {
      offPlot();
      offPackage();
    };
  }, [ownerId]);
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
