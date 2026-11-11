import type { Metadata } from "next";
import { Featured } from "@/components/site/home/featured";
import { Hero } from "@/components/site/home/hero";
import { Intro } from "@/components/site/home/intro";
import { SearchBar } from "@/components/site/home/search-bar";
import { MarqueeBand } from "@/components/site/marquee-band";
import { getSiteSettings } from "@/lib/db/queries/settings";

export const metadata: Metadata = {
  title: "Verity Homes and Properties — Invest. Own. Live.",
  description:
    "Verity Homes and Properties Ltd — homes for sale and rent, land, property management, development and real estate investment plans in Lagos.",
};

const SERVICES_BAND = ["Sales", "Rentals", "Land", "Investment", "Management", "Development"];

// design/index.html. Unit 4a: hero → featured properties. Unit 4b adds the rest.
export default async function HomePage() {
  const settings = await getSiteSettings();
  return (
    <>
      <Hero rcNumber={settings.rcNumber} />
      <SearchBar />
      <Intro />
      <MarqueeBand words={SERVICES_BAND} />
      <Featured />
    </>
  );
}
