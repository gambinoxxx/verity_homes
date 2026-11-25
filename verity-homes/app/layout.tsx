import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import { getSiteSettings } from "@/lib/db/queries/settings";
import { env } from "@/lib/env";
import { jsonLdScript } from "@/lib/property-detail";
import { DEFAULT_OG_IMAGE, SITE_NAME, organizationJsonLd, verificationMetadata } from "@/lib/seo";
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

// Unit 20: relative canonical / og:url / image URLs resolve against the site URL. Pages set
// their own title, description and Open Graph through pageMetadata() (lib/seo.ts).
export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: SITE_NAME,
  description: "Verity Homes and Properties Ltd, Lagos real estate.",
  openGraph: { siteName: SITE_NAME, locale: "en_NG", type: "website", images: [DEFAULT_OG_IMAGE] },
  twitter: { card: "summary_large_image", images: [DEFAULT_OG_IMAGE.url] },
  // Unit 21 step 5: <meta name="google-site-verification"> / "msvalidate.01", only when set.
  verification: verificationMetadata(
    process.env.NEXT_PUBLIC_GSC_VERIFICATION,
    process.env.NEXT_PUBLIC_BING_VERIFICATION,
  ),
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Cached ("settings" tag), so a settings save updates the JSON-LD with everything else.
  const settings = await getSiteSettings();
  const orgLd = organizationJsonLd(settings, env.NEXT_PUBLIC_SITE_URL);
  return (
    // Nothing is written onto <html>/<body> by hand: reveal-on-scroll and the hero headline keep
    // their state in React (components/site/reveal.tsx, lib/site-loaded.ts).
    <html lang="en" className={`${playfair.variable} ${manrope.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(orgLd) }}
        />
        {children}
      </body>
    </html>
  );
}
