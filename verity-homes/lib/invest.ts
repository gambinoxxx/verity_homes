// Investment copy shared by the home invest section (Unit 4) and /invest (Unit 9).
// Never promise fixed returns in this copy: architecture.md invariant 6 bans the "g-word".
// tests/unit/invest-copy.test.ts scans public source for it.

/** Required wherever plans appear. Wording from design/invest.html, pending legal review (Q5). */
export const INVEST_DISCLAIMER =
  "Investment returns are subject to the terms of your signed agreement. Please read all documents carefully before investing. [Final disclosure wording to be reviewed for regulatory compliance before launch.]";

export const INVEST_STEPS = [
  { title: "Choose a plan", text: "Pick the amount and tenure that suits your goals." },
  { title: "Sign your agreement", text: "Receive a written investment agreement and receipt." },
  { title: "Earn returns", text: "Returns are paid on the agreed schedule." },
  { title: "Exit or own", text: "At maturity, collect your capital or convert to property." },
] as const;

export const INVEST_LEAD =
  "Put your funds into carefully selected property projects run with our development partners. Earn agreed returns over a fixed term — then take your capital back or convert it into property.";
