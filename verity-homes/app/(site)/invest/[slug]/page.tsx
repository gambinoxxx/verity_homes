import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Markdown } from "@/components/site/blog/markdown";
import { WhatsAppIcon } from "@/components/site/icons";
import { FaqSection } from "@/components/site/invest/faq-section";
import { PackageOptions } from "@/components/site/invest/packages";
import { InvestDisclaimer } from "@/components/site/invest/plans";
import { StartSection } from "@/components/site/invest/start-section";
import { PageHero } from "@/components/site/page-hero";
import { PillTicker } from "@/components/site/pill-ticker";
import styles from "@/components/site/property/property.module.css";
import { PlotAwareWhatsApp } from "@/components/site/property/whatsapp-link";
import { Reveal } from "@/components/site/reveal";
import {
  getFaqs,
  getPlanBySlug,
  getPlanRedirect,
  getPublishedPlanSlugs,
} from "@/lib/db/queries/invest";
import { getSiteSettings } from "@/lib/db/queries/settings";
import { env } from "@/lib/env";
import { formatNaira, PAYOUT_LABEL } from "@/lib/format";
import { planFromAmountKobo } from "@/lib/invest";
import { absoluteUrl } from "@/lib/property-detail";

const SITE = env.NEXT_PUBLIC_SITE_URL;
const pageUrl = (slug: string) => absoluteUrl(`/invest/${slug}`, SITE);

/** Published plan slugs are prerendered (a placeholder when there are none, for Cache Components). */
export async function generateStaticParams() {
  const slugs = await getPublishedPlanSlugs();
  return slugs.length > 0 ? slugs.map((slug) => ({ slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/invest/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);
  if (!plan) return { title: "Plan not found — Verity Homes and Properties" };
  const title = `${plan.name} — Invest with Verity Homes and Properties`;
  const description =
    plan.summary?.trim() ||
    `${plan.name}: investment packages, payout and exit terms, and how to start. Returns are per your signed agreement.`;
  const url = pageUrl(plan.slug);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Verity Homes and Properties",
    },
    twitter: { card: "summary", title, description },
  };
}

/**
 * /invest/[slug] (Unit 17c): one plan — partner and agreement, packages (invest → expected
 * amount), description, payout and exit terms, invest FAQs, disclaimer and the enquiry form.
 * No FAQPage or financial JSON-LD (owner/legal decision pending: Q54). proxy.ts answers 404 for
 * drafts/unknown slugs and 308 for old ones before this renders.
 */
export default async function PlanPage({ params }: PageProps<"/invest/[slug]">) {
  const { slug } = await params;
  const plan = await getPlanBySlug(slug);
  if (!plan) {
    const to = await getPlanRedirect(slug);
    if (to && to !== slug) permanentRedirect(`/invest/${encodeURIComponent(to)}`);
    notFound();
  }
  const [faqs, settings] = await Promise.all([getFaqs("INVEST"), getSiteSettings()]);
  const url = pageUrl(plan.slug);
  const from = planFromAmountKobo(plan.packages);

  return (
    <>
      <PageHero
        title={plan.name}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Invest", href: "/invest" },
          { label: plan.name },
        ]}
        sub={plan.summary ?? undefined}
        image={plan.coverUrl ?? "/samples/building.jpg"}
      />
      <section className="sheet" aria-labelledby="packages-h">
        <div className="container">
          <div className={styles.head}>
            <div>
              {plan.badge ? (
                <span className={`${styles.tag} ${styles.tagGold}`}>{plan.badge}</span>
              ) : null}
              {plan.partnerName ? (
                <p className={styles.dev} data-testid="plan-partner">
                  In partnership with <b>{plan.partnerName}</b>
                </p>
              ) : null}
              {plan.contractWith ? (
                <p className={styles.dev} data-testid="plan-contract">
                  Your agreement is with <b>{plan.contractWith}</b>
                </p>
              ) : null}
            </div>
            <div className={styles.price}>
              <small>Invest from</small>
              <b>{formatNaira(from ?? BigInt(plan.minimumKobo))}</b>
              <span className={styles.deposit}>Payout: {PAYOUT_LABEL[plan.payoutFrequency]}</span>
            </div>
          </div>

          <section
            className={`${styles.block} ${styles.plots}`}
            aria-labelledby="packages-h"
            id="packages"
          >
            <Reveal as="span">
              <PillTicker label="Packages" />
            </Reveal>
            <h2 id="packages-h">Choose your package</h2>
            {plan.packages.length ? (
              <PackageOptions
                planId={plan.id}
                planName={plan.name}
                url={url}
                packages={plan.packages}
              />
            ) : (
              <p className={styles.note}>
                Packages for this plan are being finalised — speak to us below.
              </p>
            )}
            <p className={styles.note}>
              Amounts you receive are expected, per your signed agreement. “Per year” is the
              equivalent yearly rate for comparison.
            </p>
            <PlotAwareWhatsApp
              className={`btn ${styles.wa}`}
              number={settings.whatsapp}
              defaultText={`Hi Verity, I'm interested in ${plan.name} (${url})`}
              ownerId={plan.id}
            >
              <WhatsAppIcon />
              Chat on WhatsApp
            </PlotAwareWhatsApp>
          </section>

          {plan.description.trim() ? (
            <section className={styles.block} aria-labelledby="about-plan-h">
              <h2 id="about-plan-h">About this plan</h2>
              <Markdown source={plan.description} siteUrl={SITE} />
            </section>
          ) : null}

          {plan.payoutTerms || plan.exitTerms ? (
            <section className={styles.block} aria-labelledby="terms-h">
              <h2 id="terms-h">Payout &amp; exit</h2>
              <div className={styles.terms} data-testid="plan-terms">
                {plan.payoutTerms ? (
                  <p>
                    <b>Payout:</b> {plan.payoutTerms}
                  </p>
                ) : null}
                {plan.exitTerms ? (
                  <p>
                    <b>Exit:</b> {plan.exitTerms}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
          <InvestDisclaimer light />
        </div>
      </section>
      <FaqSection faqs={faqs} />
      <StartSection plans={[{ id: plan.id, name: plan.name }]} planId={plan.id} />
    </>
  );
}
