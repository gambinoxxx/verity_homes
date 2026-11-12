// Plan cards and the "how it works" steps (design `.plan`, `.step`), shared by the home
// invest section (Unit 4b) and /invest (Unit 9). Copy comes from lib/invest.ts.
import type { PlanView } from "@/lib/db/queries/invest";
import { formatNaira, PAYOUT_LABEL } from "@/lib/format";
import { INVEST_DISCLAIMER, INVEST_STEPS } from "@/lib/invest";
import { CheckIcon } from "../icons";
import { Reveal } from "../reveal";
import { PlanCta } from "./plan-cta";
import styles from "./plans.module.css";

const DELAYS = [0, 1, 2, 3] as const;

type PlanCardProps = {
  plan: PlanView;
  index: number;
  /** Where "I want to invest" goes: the enquiry form on that page. */
  ctaHref: string;
  /** The "Exit: capital back or convert to property" line (design/invest.html only). */
  exitLine?: boolean;
};

export function PlanCard({ plan, index, ctaHref, exitLine = false }: PlanCardProps) {
  return (
    <Reveal
      as="article"
      className={`${styles.plan} ${plan.highlighted ? styles.featured : ""}`}
      delay={DELAYS[index % 3]}
      data-highlighted={plan.highlighted ? "" : undefined}
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
        {exitLine ? (
          <li>
            <CheckIcon />
            Exit: capital back or convert to property
          </li>
        ) : null}
      </ul>
      <PlanCta
        planId={plan.id}
        href={ctaHref}
        className={`btn ${plan.highlighted ? "btn-navy" : "btn-white"}`}
      >
        I want to invest
      </PlanCta>
    </Reveal>
  );
}

/** The plan grid. Render <InvestDisclaimer /> on the same page (invariant 6). */
export function PlanGrid({
  plans,
  ctaHref,
  exitLine = false,
}: {
  plans: PlanView[];
  ctaHref: string;
  exitLine?: boolean;
}) {
  if (plans.length === 0) return null;
  return (
    <div className={styles.plans}>
      {plans.map((p, i) => (
        <PlanCard key={p.id} plan={p} index={i} ctaHref={ctaHref} exitLine={exitLine} />
      ))}
    </div>
  );
}

/** Required wherever plans appear (architecture.md invariant 6). */
export function InvestDisclaimer({ className = "" }: { className?: string }) {
  return <p className={`${styles.disclaimer} ${className}`}>{INVEST_DISCLAIMER}</p>;
}

/** The four "how it works" steps. `navy`: solid navy cards, for the white sheet on /invest. */
export function InvestSteps({
  navy = false,
  className = "",
}: {
  navy?: boolean;
  className?: string;
}) {
  return (
    <ol className={`${styles.steps} ${className}`}>
      {INVEST_STEPS.map((s, i) => (
        <Reveal
          as="li"
          key={s.title}
          className={`${styles.step} ${navy ? styles.navy : ""}`}
          delay={DELAYS[i]}
        >
          <b aria-hidden="true">{String(i + 1).padStart(2, "0")}</b>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </Reveal>
      ))}
    </ol>
  );
}
