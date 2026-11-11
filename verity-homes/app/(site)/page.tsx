import type { Metadata } from "next";
import { Ceo } from "@/components/site/home/ceo";
import { ContactBlock } from "@/components/site/home/contact-block";
import { Featured } from "@/components/site/home/featured";
import { Hero } from "@/components/site/home/hero";
import { Intro } from "@/components/site/home/intro";
import { Invest } from "@/components/site/home/invest";
import { LatestPosts } from "@/components/site/home/latest-posts";
import { SearchBar } from "@/components/site/home/search-bar";
import { Services } from "@/components/site/home/services";
import { Showcase } from "@/components/site/home/showcase";
import { Statement } from "@/components/site/home/statement";
import { Testimonials } from "@/components/site/home/testimonials";
import { MarqueeBand } from "@/components/site/marquee-band";
import { getSiteSettings } from "@/lib/db/queries/settings";

export const metadata: Metadata = {
  title: "Verity Homes and Properties — Invest. Own. Live.",
  description:
    "Verity Homes and Properties Ltd — homes for sale and rent, land, property management, development and real estate investment plans in Lagos.",
};

const SERVICES_BAND = ["Sales", "Rentals", "Land", "Investment", "Management", "Development"];
// Repeated so one copy of the track is wider than the screen (the design repeats it 4×).
const MOTTO_BAND = ["Invest.", "Own.", "Live.", "Invest.", "Own.", "Live."];

// design/index.html, top to bottom.
export default async function HomePage() {
  const settings = await getSiteSettings();
  return (
    <>
      <Hero rcNumber={settings.rcNumber} />
      <SearchBar />
      <Intro />
      <MarqueeBand words={SERVICES_BAND} />
      <Featured />
      <Showcase />
      <Invest />
      <Statement />
      <MarqueeBand words={MOTTO_BAND} light reverse />
      <Services />
      <Ceo />
      <Testimonials />
      <LatestPosts />
      <ContactBlock />
    </>
  );
}
