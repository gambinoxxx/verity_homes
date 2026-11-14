// Plan cards and the "how it works" steps (design `.plan`, `.step`), shared by the home
// invest section (Unit 4b) and /invest (Unit 9). Copy comes from lib/invest.ts.
import Link from "next/link";
import type { PlanView } from "@/lib/db/queries/invest";
import { formatNaira, PAYOUT_LABEL } from "@/lib/format";
import { INVEST_DISCLAIMER, INVEST_STEPS } from "@/lib/invest";
import { CheckIcon } from "../icons";
import { Reveal } from "../reveal";
import styles from "./plans.module.css";

const DELAYS = [0, 1, 2, 3] as const;

type PlanCardProps = { plan: PlanView; index: number };

/**
 * Summary card (Unit 17c): name, badge, "invest from", tenure, payout, one line, and "View plan"
 * → /invest/<slug>. Packages and returns live on the plan page only.
 */
export function PlanCard({ plan, index }: PlanCardProps) {
  const href = plan.slug ? `/invest/${plan.slug}` : "/invest";
  return (
    <Reveal
      as="article"
      className={`${styles.plan} ${plan.highlighted ? styles.featured : ""}`}
      delay={DELAYS[index % 3]}
      data-highlighted={plan.highlighted ? "" : undefined}
      data-plan-slug={plan.slug ?? undefined}
    >
      <div className={styles.planTop}>
        <h3>{plan.name}</h3>
        {plan.badge ? <span className={styles.badge}>{plan.badge}</span> : null}
      </div>
      <div className={`${styles.rate} ${styles.from}`}>
        <small>Invest from</small>
        <div>{formatNaira(plan.fromKobo)}</div>
      </div>
      <ul>
        <li>
          <CheckIcon />
          Tenure: <strong>{plan.tenure}</strong>
        </li>
        <li>
          <CheckIcon />
          Payout: <strong>{PAYOUT_LABEL[plan.payoutFrequency]}</strong>
        </li>
      </ul>
      {plan.summary ? <p className={styles.summary}>{plan.summary}</p> : null}
      <Link
        href={href}
        className={`btn ${plan.highlighted ? "btn-navy" : "btn-white"}`}
        prefetch={false}
      >
        View plan<span className="sr-only">: {plan.name}</span>
      </Link>
    </Reveal>
  );
}

/** The plan grid (summary cards). Render <InvestDisclaimer /> on the same page (invariant 6). */
export function PlanGrid({ plans }: { plans: PlanView[] }) {
  if (plans.length === 0) return null;
  return (
    <div className={styles.plans}>
      {plans.map((p, i) => (
        <PlanCard key={p.id} plan={p} index={i} />
      ))}
    </div>
  );
}

/** Required wherever plans appear (architecture.md invariant 6). */
export function InvestDisclaimer({
  className = "",
  light = false,
}: {
  className?: string;
  /** On a white background (plan pages). */
  light?: boolean;
}) {
  return (
    <p className={`${styles.disclaimer} ${light ? styles.onLight : ""} ${className}`}>
      {INVEST_DISCLAIMER}
    </p>
  );
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
