import type { Metadata } from "next";
import { FaqSection } from "@/components/site/invest/faq-section";
import styles from "@/components/site/invest/invest-page.module.css";
import { InvestSteps } from "@/components/site/invest/plans";
import { PlansSection } from "@/components/site/invest/plans-section";
import { StartSection } from "@/components/site/invest/start-section";
import { PageHero } from "@/components/site/page-hero";
import { PillTicker } from "@/components/site/pill-ticker";
import { Reveal } from "@/components/site/reveal";
import { getFaqs, getPublishedPlans } from "@/lib/db/queries/invest";
import { INVEST_LEAD } from "@/lib/invest";

export const metadata: Metadata = {
  title: "Invest in real estate — Verity Homes and Properties",
  description:
    "Structured real estate investment plans in Lagos with a written agreement at every step. See the plans, read the questions investors ask, and request a call back.",
  alternates: { canonical: "/invest" },
  openGraph: {
    type: "website",
    title: "Invest in real estate — Verity Homes and Properties",
    description: INVEST_LEAD,
    siteName: "Verity Homes and Properties",
  },
};

// design/invest.html: hero, how-it-works sheet, plans (navy), FAQ, investment enquiry.
// No FAQPage JSON-LD yet: the answers are still sample text (Unit 20).
export default async function InvestPage() {
  const [plans, faqs] = await Promise.all([getPublishedPlans(), getFaqs("INVEST")]);
  return (
    <>
      <PageHero
        title={
          <>
            Invest with <em>Verity</em>
          </>
        }
        crumbs={[{ label: "Home", href: "/" }, { label: "Invest" }]}
        sub="Grow your money through structured real estate projects — with a written agreement at every step."
        image="/samples/building.jpg"
      />
      <section className="sheet" aria-labelledby="how-h">
        <div className="container">
          <div className={styles.split}>
            <div>
              <Reveal as="span">
                <PillTicker label="How it works" />
              </Reveal>
              <Reveal as="h2" className={`h2 ${styles.h2}`} id="how-h">
                Real estate returns, <em>without building it yourself.</em>
              </Reveal>
            </div>
            <Reveal as="p" className="lead">
              {INVEST_LEAD}
            </Reveal>
          </div>
          <InvestSteps navy className={styles.steps} />
        </div>
      </section>
      <PlansSection plans={plans} />
      <FaqSection faqs={faqs} />
      <StartSection plans={plans} />
    </>
  );
}
