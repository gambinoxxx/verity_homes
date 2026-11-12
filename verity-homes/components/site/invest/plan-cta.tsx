"use client";

import { selectPlan } from "@/lib/invest-plan-select";

type PlanCtaProps = { planId: string; href: string; className: string; children: React.ReactNode };

/**
 * "I want to invest": a plain anchor to the enquiry form (works without JS), which also tells
 * the investment form to preselect this plan.
 */
export function PlanCta({ planId, href, className, children }: PlanCtaProps) {
  return (
    <a className={className} href={href} onClick={() => selectPlan(planId)}>
      {children}
    </a>
  );
}
