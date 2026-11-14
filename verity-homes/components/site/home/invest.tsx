import Image from "next/image";
import { getPublishedPlans } from "@/lib/db/queries/invest";
import { getPublishedPartners } from "@/lib/db/queries/trust";
import { INVEST_LEAD } from "@/lib/invest";
import { PartnerMarquee } from "../partner-marquee";
import { InvestDisclaimer, InvestSteps, PlanGrid } from "../invest/plans";
import { Reveal } from "../reveal";
import styles from "./invest.module.css";

/** "Invest with Verity": steps, published plans, partner marquee (if any), disclaimer. */
export async function Invest() {
  const [plans, partners] = await Promise.all([getPublishedPlans(), getPublishedPartners()]);
  return (
    <section className={`sec ${styles.invest} on-navy`} id="invest" aria-labelledby="inv-h">
      <div className={`${styles.bg} media`} aria-hidden="true">
        <Image src="/samples/building.jpg" alt="" fill sizes="100vw" />
      </div>
      <div className={`container ${styles.inner}`}>
        <div className="sec-head">
          <div className={styles.headText}>
            <Reveal as="span" className="eyebrow">
              Invest with Verity
            </Reveal>
            <Reveal as="h2" className="h2" delay={1} id="inv-h">
              Let your money work in <em>real estate.</em>
            </Reveal>
          </div>
          <Reveal as="p" className="lead" delay={2}>
            {INVEST_LEAD}
          </Reveal>
        </div>

        <InvestSteps />
        <PlanGrid plans={plans} />

        {/* design/index.html puts the disclaimer after the partner marquee. */}
        <Reveal className={`${styles.partners} ${partners.length === 0 ? styles.noPartners : ""}`}>
          <PartnerMarquee partners={partners} labelId="partners-label" />
          <InvestDisclaimer />
        </Reveal>
      </div>
    </section>
  );
}
