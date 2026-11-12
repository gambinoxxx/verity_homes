// "I want to invest" on a plan card → the investment enquiry form preselects that plan.
// A window event, so the card (a plain anchor to #start) and the form stay independent.
const EVENT = "verity:select-plan";

export function selectPlan(planId: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: planId }));
}

/** Calls `cb` with the plan id each time a plan is picked. Returns a cleanup. */
export function onPlanSelected(cb: (planId: string) => void): () => void {
  const handler = (e: Event) => cb(String((e as CustomEvent<string>).detail));
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
