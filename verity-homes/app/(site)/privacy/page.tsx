import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-hero";
import { PrivacyNotice } from "@/components/site/privacy/privacy-notice";
import { getSiteSettings } from "@/lib/db/queries/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { companyName } = await getSiteSettings();
  const title = "Privacy policy — Verity Homes and Properties";
  const description = `How ${companyName} collects, uses and protects the personal information you share through this website, and your rights under the Nigeria Data Protection Act 2023.`;
  return {
    title,
    description,
    alternates: { canonical: "/privacy" },
    openGraph: { type: "website", title, description, siteName: "Verity Homes and Properties" },
  };
}

// Prose page in the design/post.html layout: post hero + sheet + article column.
export default async function PrivacyPage() {
  const s = await getSiteSettings();
  return (
    <>
      <PageHero
        variant="post"
        title="Privacy policy"
        crumbs={[{ label: "Home", href: "/" }, { label: "Privacy policy" }]}
        image="/samples/dusk.jpg"
      />
      <section className="sheet" aria-label="Privacy notice">
        <article className="article container">
          <PrivacyNotice
            companyName={s.companyName}
            rcNumber={s.rcNumber}
            officeDisplay={s.officeDisplay}
            email={s.email}
          />
        </article>
      </section>
    </>
  );
}
