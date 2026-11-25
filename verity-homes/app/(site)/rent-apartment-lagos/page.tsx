import type { Metadata } from "next";
import { LandingPageView, landingMetadata } from "@/components/site/landing/landing-page";
import { getLandingPage } from "@/lib/landing-pages";

// SEO / ad landing page (Unit 21 step 6b). Wording: lib/landing-pages.ts.
const page = getLandingPage("/rent-apartment-lagos");

export const metadata: Metadata = landingMetadata(page);

export default function Page() {
  return <LandingPageView page={page} />;
}
