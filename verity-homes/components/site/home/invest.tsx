import Image from "next/image";
import { getPublishedPlans } from "@/lib/db/queries/invest";
import { getPublishedPartners, type PartnerView } from "@/lib/db/queries/trust";
import { INVEST_LEAD } from "@/lib/invest";
import { InvestDisclaimer, InvestSteps, PlanGrid } from "../invest/plans";
import { Reveal } from "../reveal";
import styles from "./invest.module.css";

function PartnerTile({ partner }: { partner: PartnerView }) {
  return partner.logoUrl ? (
    <span className={styles.logo}>
      <Image src={partner.logoUrl} alt={partner.name} width={140} height={40} />
    </span>
  ) : (
    <span>{partner.name}</span>
  );
}

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
        <PlanGrid plans={plans} ctaHref="#contact" />

        {/* design/index.html puts the disclaimer after the partner marquee. */}
        <Reveal className={`${styles.partners} ${partners.length === 0 ? styles.noPartners : ""}`}>
          {partners.length > 0 ? (
            <>
              <div className={styles.partnersLabel} id="partners-label">
                Our development partners
              </div>
              <div className={styles.marquee}>
                <ul className={styles.track} aria-labelledby="partners-label">
                  {partners.map((p) => (
                    <li key={p.id}>
                      <PartnerTile partner={p} />
                    </li>
                  ))}
                  {/* Second copy for a seamless loop; hidden from screen readers. */}
                  {partners.map((p) => (
                    <li key={`dup-${p.id}`} aria-hidden="true">
                      <PartnerTile partner={p} />
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
          <InvestDisclaimer />
        </Reveal>
      </div>
    </section>
  );
}
