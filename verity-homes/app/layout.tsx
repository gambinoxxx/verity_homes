import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import "./globals.css";

// Weights match the design's Google Fonts link (design/index.html).
const playfair = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Verity Homes and Properties",
  description: "Verity Homes and Properties Ltd, Lagos real estate.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // Nothing is written onto <html>/<body> by hand: reveal-on-scroll and the hero headline keep
    // their state in React (components/site/reveal.tsx, lib/site-loaded.ts).
    <html lang="en" className={`${playfair.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
