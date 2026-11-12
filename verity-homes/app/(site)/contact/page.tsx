import type { Metadata } from "next";
import { ContactCards } from "@/components/site/contact/contact-cards";
import { OfficeMap } from "@/components/site/contact/office-map";
import styles from "@/components/site/contact/contact.module.css";
import { EnquiryForm } from "@/components/site/enquiry-form";
import { PageHero } from "@/components/site/page-hero";
import { Reveal } from "@/components/site/reveal";
import { getSiteSettings } from "@/lib/db/queries/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { officeDisplay } = await getSiteSettings();
  const title = "Contact us — Verity Homes and Properties";
  const description = `Email, call or WhatsApp Verity Homes and Properties, or visit our office in ${officeDisplay}. Leave a message and we'll call you back.`;
  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    openGraph: { type: "website", title, description, siteName: "Verity Homes and Properties" },
  };
}

// design/contact.html: page hero, then the sheet with three cards, the form and the map.
export default async function ContactPage() {
  const s = await getSiteSettings();
  return (
    <>
      <PageHero
        title={
          <>
            Get in <em>touch</em>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "Contact" }]}
        sub="Whether you're buying, renting, investing or listing a property — we're here to help."
        image="/samples/building.jpg"
      />
      <section className="sheet" aria-label="Contact details">
        <div className="container">
          <ContactCards
            details={{
              email: s.email,
              phone: s.phone,
              whatsapp: s.whatsapp,
              officeDisplay: s.officeDisplay,
              mapQuery: s.mapQuery,
            }}
          />
          <div className={styles.grid} id="message">
            <Reveal>
              <EnquiryForm
                source="CONTACT_PAGE"
                id="contact-form"
                variant="contact"
                heading="Leave a message"
                label="Contact form"
              />
            </Reveal>
            <OfficeMap
              companyName={s.companyName}
              officeDisplay={s.officeDisplay}
              mapQuery={s.mapQuery}
            />
          </div>
        </div>
      </section>
    </>
  );
}
