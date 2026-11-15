"use client";

// "Choose your package" on /invest/[slug] (Unit 17c): You invest / You receive / Gain / Per
// year / Select. One markup: a fixed-column table in a white card from 768px, one card per
// package on phones (plan-page.module.css). Select → the enquiry form below gets the package
// (plan, amount, message, packageId), the WhatsApp button names it, and the page scrolls to
// the form.
import { useState } from "react";
import type { PackageView } from "@/lib/db/queries/invest";
import { formatNaira, nairaInputFromKobo } from "@/lib/format";
import { annualisedPercent, formatPercent, packageGainKobo } from "@/lib/invest";
import { selectPackage } from "@/lib/package-select";
import { packageEnquiryMessage, packageName, packageWhatsappMessage } from "@/lib/packages";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./plan-page.module.css";

type Props = { planId: string; planName: string; url: string; packages: PackageView[] };

const months = (n: number) => `${n} month${n === 1 ? "" : "s"}`;

export function PackageOptions({ planId, planName, url, packages }: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const hydrated = useHydrated();

  const choose = (p: PackageView) => {
    setChosen(p.id);
    selectPackage({
      planId,
      packageId: p.id,
      amount: nairaInputFromKobo(BigInt(p.amountKobo)),
      message: packageEnquiryMessage(p, planName),
      whatsappText: packageWhatsappMessage(p, planName, url),
    });
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById("start")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div className={styles.card}>
      <div className={styles.table} role="table" aria-label="Investment packages">
        <div className={styles.head} role="row">
          <span role="columnheader">You invest</span>
          <span role="columnheader">You receive (expected)</span>
          <span role="columnheader">Gain</span>
          <span role="columnheader">Per year</span>
          <span role="columnheader" className={styles.action}>
            <span className="sr-only">Choose</span>
          </span>
        </div>
        {packages.map((p) => {
          const selected = chosen === p.id;
          const pct = annualisedPercent(p);
          return (
            <div
              key={p.id}
              role="row"
              className={`${styles.row} ${selected ? styles.chosen : ""}`}
              data-package-amount={p.amountKobo / 100}
            >
              <span role="cell">
                <span className={styles.cellLabel}>You invest</span>
                <span className={styles.amount}>{formatNaira(p.amountKobo)}</span>
                {p.label ? <span className={styles.label}>{p.label}</span> : null}
              </span>
              <span role="cell" className={styles.receive}>
                <span className={styles.cellLabel}>You receive (expected)</span>
                <span>
                  <b>{formatNaira(p.returnAmountKobo)}</b>
                  <small>after {months(p.tenureMonths)}</small>
                </span>
              </span>
              <span role="cell" data-cell="gain">
                <span className={styles.cellLabel}>Gain</span>
                <span className={styles.gain}>+{formatNaira(packageGainKobo(p))}</span>
              </span>
              <span role="cell" data-cell="per-year">
                <span className={styles.cellLabel}>Per year</span>
                {pct === null ? "—" : <span className={styles.pct}>{formatPercent(pct)} / yr</span>}
              </span>
              <span role="cell" className={styles.action}>
                <button
                  type="button"
                  className={styles.select}
                  aria-pressed={selected}
                  disabled={!hydrated}
                  onClick={() => choose(p)}
                >
                  {selected ? "Selected" : "Select"}
                  <span aria-hidden="true">{selected ? "✓" : "→"}</span>
                  <span className="sr-only"> {packageName(p)}</span>
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
