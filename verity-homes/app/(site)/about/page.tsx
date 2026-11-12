import type { Metadata } from "next";
import { AboutCeo, AboutCta, Story, Trust, Values } from "@/components/site/about/sections";
import { MarqueeBand } from "@/components/site/marquee-band";
import { PageHero } from "@/components/site/page-hero";
import { getSiteSettings } from "@/lib/db/queries/settings";
import { getPublishedPartners } from "@/lib/db/queries/trust";

export async function generateMetadata(): Promise<Metadata> {
  const { companyName, rcNumber } = await getSiteSettings();
  const title = "About us — Verity Homes and Properties";
  const description = `${companyName} (RC ${rcNumber}) is a Lagos real estate company for homes, land, rentals, property management, development and investment — built on truth.`;
  return {
    title,
    description,
    alternates: { canonical: "/about" },
    openGraph: { type: "website", title, description, siteName: "Verity Homes and Properties" },
  };
}

// Repeated so one copy of the track is wider than the screen (the design repeats it 4×).
const VALUES_BAND = ["Honesty", "Clarity", "Care", "Honesty", "Clarity", "Care"];

// design/about.html, top to bottom. Organization JSON-LD is Unit 20 (root layout), not here.
export default async function AboutPage() {
  const [s, partners] = await Promise.all([getSiteSettings(), getPublishedPartners()]);
  return (
    <>
      <PageHero
        title={
          <>
            About <em>Verity</em>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "About" }]}
        sub="Verity means truth. It is the standard behind every home we list and every plan we offer."
        image="/samples/tower.jpg"
      />
      <Story />
      <MarqueeBand words={VALUES_BAND} />
      <Values />
      <AboutCeo />
      <Trust
        companyName={s.companyName}
        rcNumber={s.rcNumber}
        officeArea={s.officeArea}
        partners={partners}
      />
      <AboutCta />
    </>
  );
}
