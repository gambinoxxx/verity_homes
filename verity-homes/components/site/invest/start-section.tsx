import { EnquiryForm } from "../enquiry-form";
import boxStyles from "../home/contact-block.module.css";
import { PillTicker } from "../pill-ticker";
import { Reveal } from "../reveal";
import styles from "./invest-page.module.css";

type StartProps = {
  plans: { id: string; name: string }[];
  /** A plan page (Unit 17c): that plan is preselected and a chosen package fills the form. */
  planId?: string;
};

/** "Speak to us about a plan": the investment enquiry form (design `.contact-box`). */
export function StartSection({ plans, planId }: StartProps) {
  return (
    <section className={`sec ${styles.start}`} id="start" aria-labelledby="start-h">
      <div className="container">
        <Reveal className={`${boxStyles.box} on-navy`}>
          <div className={boxStyles.text}>
            <PillTicker label="Start investing" />
            <h2 className="h2" id="start-h">
              Speak to us about <em>a plan.</em>
            </h2>
            <p className={`lead ${styles.startLead}`}>
              Tell us how much you&apos;d like to invest and we&apos;ll walk you through the options
              — no pressure, no obligation.
            </p>
          </div>
          <EnquiryForm
            source="INVEST_PAGE"
            id="invest-enquiry"
            variant="invest"
            heading="Investment enquiry"
            label="Investment enquiry"
            interest="INVESTING"
            plans={plans.map((p) => ({ id: p.id, name: p.name }))}
            planId={planId}
          />
        </Reveal>
      </div>
    </section>
  );
}
