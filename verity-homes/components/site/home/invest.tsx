import Image from "next/image";
import { getPublishedPlans, type PlanView } from "@/lib/db/queries/invest";
import { getPublishedPartners, type PartnerView } from "@/lib/db/queries/trust";
import { formatNaira, PAYOUT_LABEL } from "@/lib/format";
import { INVEST_DISCLAIMER, INVEST_LEAD, INVEST_STEPS } from "@/lib/invest";
import { CheckIcon } from "../icons";
import styles from "./invest.module.css";
import { Reveal } from "../reveal";

const DELAYS = [0, 1, 2, 3] as const;

function PlanCard({ plan, index }: { plan: PlanView; index: number }) {
  return (
    <Reveal
      as="article"
      className={`${styles.plan} ${plan.highlighted ? styles.featured : ""}`}
      delay={DELAYS[index % 3]}
    >
      <div className={styles.planTop}>
        <h3>{plan.name}</h3>
        {plan.badge ? <span className={styles.badge}>{plan.badge}</span> : null}
      </div>
      <div className={styles.rate}>
        <small>Expected return</small>
        <div>
          {/* 0 means the rate is not approved yet: keep the design's placeholder. */}
          {plan.returnRatePercent > 0 ? (
            plan.returnRatePercent
          ) : (
            <>
              <span className="ph" aria-hidden="true">
                —
              </span>
              <span className="sr-only">Rate to be confirmed</span>
            </>
          )}
          %<span> per annum</span>
        </div>
      </div>
      <ul>
        <li>
          <CheckIcon />
          Minimum: <strong>{formatNaira(plan.minimumKobo)}</strong>
        </li>
        <li>
          <CheckIcon />
          Tenure: <strong>{plan.tenureMonths} months</strong>
        </li>
        <li>
          <CheckIcon />
          Payout: <strong>{PAYOUT_LABEL[plan.payoutFrequency]}</strong>
        </li>
      </ul>
      <a className={`btn ${plan.highlighted ? "btn-navy" : "btn-white"}`} href="#contact">
        I want to invest
      </a>
    </Reveal>
  );
}

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

        <ol className={styles.steps}>
          {INVEST_STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} className={styles.step} delay={DELAYS[i]}>
              <b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </Reveal>
          ))}
        </ol>

        {plans.length > 0 ? (
          <div className={styles.plans}>
            {plans.map((p, i) => (
              <PlanCard key={p.id} plan={p} index={i} />
            ))}
          </div>
        ) : null}

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
          <p className={styles.disclaimer}>{INVEST_DISCLAIMER}</p>
        </Reveal>
      </div>
    </section>
  );
}
