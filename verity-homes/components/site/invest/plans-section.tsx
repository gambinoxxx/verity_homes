import type { PlanView } from "@/lib/db/queries/invest";
import { PillTicker } from "../pill-ticker";
import { Reveal } from "../reveal";
import styles from "./invest-page.module.css";
import { InvestDisclaimer, PlanGrid } from "./plans";

/** "Choose your plan": published plans, highlighted one gold, disclaimer directly under them. */
export function PlansSection({ plans }: { plans: PlanView[] }) {
  return (
    <section className={`sec ${styles.plansSection} on-navy`} aria-labelledby="plans-h">
      <div className="container">
        <div className="sec-head">
          <div>
            <Reveal as="span">
              <PillTicker label="Our plans" />
            </Reveal>
            <Reveal as="h2" className={`h2 ${styles.h2}`} id="plans-h" delay={1}>
              Choose your <em>plan.</em>
            </Reveal>
          </div>
          <Reveal as="p" className="lead" delay={2}>
            Figures shown here come from the plans the admin publishes.
          </Reveal>
        </div>
        <PlanGrid plans={plans} ctaHref="#start" exitLine />
        <Reveal>
          <InvestDisclaimer />
        </Reveal>
      </div>
    </section>
  );
}
