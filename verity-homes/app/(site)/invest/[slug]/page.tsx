import { Suspense } from "react";
import { SlugPageFallback } from "@/components/site/slug-page-fallback";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { Markdown } from "@/components/site/blog/markdown";
import { HelpCta, HelpCtaActions } from "@/components/site/help-cta";
import { CalendarIcon, InfoIcon, PayoutIcon } from "@/components/site/icons";
import { FaqSection } from "@/components/site/invest/faq-section";
import { PackageOptions } from "@/components/site/invest/packages";
import planStyles from "@/components/site/invest/plan-page.module.css";
import { InvestDisclaimer } from "@/components/site/invest/plans";
import { StartSection } from "@/components/site/invest/start-section";
import { PageHero } from "@/components/site/page-hero";
import { MarqueeEyebrow } from "@/components/site/marquee-eyebrow";
import styles from "@/components/site/property/property.module.css";
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
import { planFromAmountKobo, tenureLabel } from "@/lib/invest";
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
async function PlanContent({ params }: { params: PageProps<"/invest/[slug]">["params"] }) {
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

  const duration =
    tenureLabel(plan.packages.map((p) => p.tenureMonths)) ?? `${plan.tenureMonths} months`;

  const actions = {
    whatsapp: settings.whatsapp,
    whatsappText: `Hi Verity, I'm interested in ${plan.name} (${url})`,
    ownerId: plan.id,
    callBackHref: "#start",
  };

  return (
    <>
      <PageHero
        variant="split"
        title={plan.name}
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Invest", href: "/invest" },
          { label: plan.name },
        ]}
        kicker={plan.badge ? <span className={planStyles.badge}>{plan.badge}</span> : undefined}
        details={
          plan.partnerName || plan.contractWith ? (
            <div className={planStyles.lines}>
              {plan.partnerName ? (
                <p data-testid="plan-partner">
                  In partnership with <b>{plan.partnerName}</b>
                </p>
              ) : null}
              {plan.contractWith ? (
                <p data-testid="plan-contract">
                  Your agreement is with <b>{plan.contractWith}</b>
                </p>
              ) : null}
            </div>
          ) : undefined
        }
        sub={plan.summary ?? undefined}
        image={plan.coverUrl ?? "/samples/building.jpg"}
        aside={
          <div className={planStyles.priceCard} data-testid="plan-price-card">
            <small>Invest from</small>
            <strong>{formatNaira(from ?? BigInt(plan.minimumKobo))}</strong>
            <ul className={planStyles.priceRows}>
              <li>
                <CalendarIcon />
                {duration}
              </li>
              <li>
                <PayoutIcon />
                Payout: {PAYOUT_LABEL[plan.payoutFrequency].toLowerCase()}
              </li>
            </ul>
          </div>
        }
      />
      <section className="sheet" aria-labelledby="packages-h">
        <div className="container">
          <section className={planStyles.section} aria-labelledby="packages-h" id="packages">
            <Reveal as="span">
              <MarqueeEyebrow label="Packages" />
            </Reveal>
            <h2 id="packages-h">Choose your package</h2>
            {plan.packages.length ? (
              <>
                <PackageOptions
                  planId={plan.id}
                  planName={plan.name}
                  url={url}
                  packages={plan.packages}
                />
                <p className={planStyles.note}>
                  <InfoIcon />
                  <span>
                    Amounts you receive are expected, per your signed agreement. “Per year” is the
                    equivalent yearly rate for comparison.
                  </span>
                </p>
                <HelpCta
                  title="Not sure which package suits you?"
                  text="Chat with us on WhatsApp, or ask for a call back below."
                  {...actions}
                />
              </>
            ) : (
              <div className={planStyles.empty} data-testid="plan-no-packages">
                <span className={planStyles.emptyIcon} aria-hidden="true">
                  <CalendarIcon />
                </span>
                <h3>Packages for this plan are being finalised</h3>
                <p>Speak to us for details.</p>
                <HelpCtaActions {...actions} />
              </div>
            )}
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
          <InvestDisclaimer boxed />
        </div>
      </section>
      <FaqSection faqs={faqs} />
      <StartSection plans={[{ id: plan.id, name: plan.name }]} planId={plan.id} />
    </>
  );
}

/**
 * `params` is read inside <Suspense> (Next 16 + Partial Prefetching): the route's generic App
 * Shell is tagged by the site layout's settings read, so a settings save regenerates it — and
 * awaiting params outside a boundary made that regeneration fail (500) until Unit 19a.
 * Slugs from generateStaticParams are still fully prerendered; proxy.ts still answers 308/404.
 */
export default function PlanPage({ params }: PageProps<"/invest/[slug]">) {
  return (
    <Suspense fallback={<SlugPageFallback />}>
      <PlanContent params={params} />
    </Suspense>
  );
}
