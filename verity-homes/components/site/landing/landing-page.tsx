// One SEO / ad landing page (Unit 21 step 6b). Every word comes from lib/landing-pages.ts.
// Above the fold: H1, intro, WhatsApp + call buttons and the enquiry form (beside the title on
// desktop, right under it on phones). Then "Why Verity", the guide copy, the live listings (or
// "New listings coming soon"), related guides, FAQ (plain HTML) and a closing call to action.
// Leads are sent with source LANDING_PAGE and the visit's first-touch source (step 4).
import Link from "next/link";
import { getPublishedPostLinks } from "@/lib/db/queries/posts";
import { getListingsByType } from "@/lib/db/queries/properties";
import { getSiteSettings } from "@/lib/db/queries/settings";
import { telHref } from "@/lib/contact-links";
import { env } from "@/lib/env";
import type { LandingPage } from "@/lib/landing-pages";
import { WHY_VERITY } from "@/lib/landing-pages";
import { prefetchFor } from "@/lib/nav";
import { pageMetadata } from "@/lib/seo";
import { whatsappLink } from "@/lib/whatsapp";
import { ComingSoon } from "../coming-soon";
import { EnquiryForm } from "../enquiry-form";
import { ArrowIcon, PhoneIcon, WhatsAppIcon } from "../icons";
import { FaqSection } from "../invest/faq-section";
import { MarqueeEyebrow } from "../marquee-eyebrow";
import { PageHero } from "../page-hero";
import { PropertyCard } from "../property-card";
import styles from "./landing.module.css";

export function landingMetadata(page: LandingPage) {
  return pageMetadata({ title: page.title, description: page.description, path: page.path });
}

function Ctas({
  whatsapp,
  phone,
  onNavy,
  formLink,
}: {
  whatsapp: string | null;
  phone: string | null;
  onNavy: boolean;
  formLink?: boolean;
}) {
  return (
    <div className={styles.ctas}>
      {whatsapp ? (
        <a
          className={`btn ${styles.wa}`}
          href={whatsapp}
          target="_blank"
          rel="noopener noreferrer"
          data-contact="whatsapp"
        >
          <WhatsAppIcon />
          WhatsApp us
        </a>
      ) : null}
      {phone ? (
        <a
          className={`btn ${onNavy ? "btn-outline" : "btn-outline-dark"}`}
          href={telHref(phone)}
          data-contact="phone"
        >
          <PhoneIcon />
          Call {phone}
        </a>
      ) : null}
      {formLink ? (
        <a className="btn btn-gold" href="#enquiry">
          Send an enquiry
          <ArrowIcon />
        </a>
      ) : null}
    </div>
  );
}

export async function LandingPageView({ page }: { page: LandingPage }) {
  const [settings, listings, guides] = await Promise.all([
    getSiteSettings(),
    getListingsByType([...page.listings.types], 6),
    getPublishedPostLinks([...page.relatedPosts]),
  ]);
  const url = new URL(page.path, env.NEXT_PUBLIC_SITE_URL).toString();
  const wa = whatsappLink(settings.whatsapp, `Hello Verity, ${page.whatsappText} (${url})`);
  const why = page.why ?? WHY_VERITY;

  return (
    <>
      <PageHero
        variant="split"
        image={page.image}
        crumbs={[{ label: "Home", href: "/" }, { label: page.eyebrow }]}
        title={page.h1}
        sub={page.intro}
        aside={
          <div className={styles.formCard}>
            <EnquiryForm
              source="LANDING_PAGE"
              id="enquiry"
              variant="card"
              heading={page.formHeading}
              label={page.formHeading}
              interest={page.interest}
              defaultMessage={page.formMessage}
              inspection={page.interest !== "INVESTING" && page.interest !== "MANAGEMENT"}
            />
          </div>
        }
        after={<Ctas whatsapp={wa} phone={settings.phone} onNavy />}
      />

      <section className="sheet" aria-labelledby="why-h">
        <div className="container">
          <div className={styles.why}>
            <h2 className="h2" id="why-h">
              Why <em>Verity.</em>
            </h2>
            <ul>
              {why.map((w) => (
                <li key={w.title}>
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <article className={`prose ${styles.copy}`}>
            {page.body.map((b, i) =>
              "h2" in b ? (
                <h2 key={i}>{b.h2}</h2>
              ) : "p" in b ? (
                <p key={i}>{b.p}</p>
              ) : (
                <ul key={i}>
                  {b.ul.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              ),
            )}
            {guides.length ? (
              <aside className={styles.guides} aria-label="Read our guides">
                <b>Read our guides</b>
                {guides.map((g) => (
                  <Link key={g.slug} href={`/blog/${g.slug}`} prefetch={false}>
                    {g.title}
                    <ArrowIcon />
                  </Link>
                ))}
              </aside>
            ) : null}
          </article>
        </div>
      </section>

      <section className={`sec ${styles.listings}`} aria-labelledby="list-h">
        <div className="container">
          <div className="sec-head">
            <div>
              <MarqueeEyebrow label={page.eyebrow} />
              <h2 className="h2" id="list-h">
                {page.listings.heading}
              </h2>
            </div>
            {listings.total > 0 ? (
              <Link
                className="link-arrow"
                href={page.listings.allHref}
                prefetch={prefetchFor("/properties")}
              >
                {page.listings.allLabel}
                <ArrowIcon />
              </Link>
            ) : null}
          </div>
          {listings.items.length ? (
            <div className={styles.grid}>
              {listings.items.map((p) => (
                <PropertyCard key={p.id} property={p} reveal={0} />
              ))}
            </div>
          ) : (
            <ComingSoon path={page.path} headingLevel={3} />
          )}
        </div>
      </section>

      <FaqSection
        faqs={page.faqs.map((f, i) => ({ id: String(i), question: f.q, answer: f.a }))}
        title={
          <>
            Common <em>questions.</em>
          </>
        }
        lead="Straight answers to what people ask us most."
      />

      <section className={`sec ${styles.cta}`} aria-labelledby="cta-h">
        <div className={`container ${styles.ctaBox} on-navy`}>
          <div>
            <h2 className="h2" id="cta-h">
              {page.ctaHeading}
            </h2>
            <p className="lead">{page.ctaText}</p>
          </div>
          <Ctas whatsapp={wa} phone={settings.phone} onNavy formLink />
        </div>
      </section>
    </>
  );
}
